import { useEffect, useMemo, useState } from "react";

/**
 * One uninterrupted SVG illustration: all contours are interpolated from the
 * original top-view proportions to a properly proportioned head-on profile.
 *
 * Unlike the previous two-plane WebGL implementation, there is ONE body,
 * ONE windshield, ONE hood and TWO headlights throughout the camera descent.
 * Nothing fades out to reveal a different car, and there is no 3D chassis
 * behind the art. Every scroll position creates a coherent intermediate view.
 */
type Point = readonly [number, number];
type Points = readonly Point[];

const smoothstep = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
const phase = (p: number, a: number, b: number) => smoothstep((p - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const fmt = (n: number) => n.toFixed(1);
const mix = (a: Point, b: Point, t: number): Point => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const pts = (a: Points, b: Points, t: number): Point[] => a.map((p, i) => mix(p, b[i], t));
const mirror = (left: Points): Point[] => [...left, ...[...left].reverse().map(([x, y]): Point => [1000 - x, y])];

function path(points: Points, closed = true) {
  if (!points.length) return "";
  let d = "M" + fmt(points[0][0]) + " " + fmt(points[0][1]);
  const n = points.length;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const prev = points[Math.max(0, i - 1)];
    const a = points[i];
    const b = points[(i + 1) % n];
    const next = points[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];
    d += " C" + fmt(a[0] + (b[0] - prev[0]) / 6) + " " + fmt(a[1] + (b[1] - prev[1]) / 6);
    d += " " + fmt(b[0] - (next[0] - a[0]) / 6) + " " + fmt(b[1] - (next[1] - a[1]) / 6);
    d += " " + fmt(b[0]) + " " + fmt(b[1]);
  }
  return d + (closed ? " Z" : "");
}

const BODY_TOP: Points = [[448,112],[423,121],[401,186],[392,295],[392,470],[407,624],[435,682],[462,694]];
const BODY_FRONT: Points = [[417,205],[366,214],[302,256],[232,346],[192,472],[198,610],[248,673],[320,689]];
const GLASS_TOP: Points = [[447,229],[465,219],[535,219],[553,229],[571,461],[542,477],[458,477],[429,461]];
const GLASS_FRONT: Points = [[369,292],[398,256],[602,256],[631,292],[690,441],[609,433],[391,433],[310,441]];
const HOOD_TOP: Points = [[427,527],[462,521],[538,521],[573,527],[592,634],[564,658],[436,658],[408,634]];
const HOOD_FRONT: Points = [[313,440],[409,453],[591,453],[687,440],[758,520],[693,549],[307,549],[242,520]];
const GRILLE_TOP: Points = [[463,663],[478,661],[522,661],[537,663],[536,678],[516,682],[484,682],[464,678]];
const GRILLE_FRONT: Points = [[375,576],[416,564],[584,564],[625,576],[614,635],[555,650],[445,650],[386,635]];
const BUMPER_TOP: Points = [[435,677],[470,685],[530,685],[565,677],[558,691],[528,700],[472,700],[442,691]];
const BUMPER_FRONT: Points = [[262,653],[356,666],[644,666],[738,653],[720,692],[634,707],[366,707],[280,692]];

const LEFT_LIGHT_TOP: Points = [[413,610],[459,634],[470,648],[458,662],[412,645],[409,632]];
const LEFT_LIGHT_FRONT: Points = [[236,510],[270,490],[366,496],[431,519],[402,541],[279,533]];
const RIGHT_LIGHT_TOP: Points = LEFT_LIGHT_TOP.map(([x,y]): Point => [1000-x,y]).reverse();
const RIGHT_LIGHT_FRONT: Points = LEFT_LIGHT_FRONT.map(([x,y]): Point => [1000-x,y]).reverse();

const LEFT_MIRROR_TOP: Points = [[395,294],[343,301],[340,324],[395,335]];
const LEFT_MIRROR_FRONT: Points = [[297,344],[245,355],[230,385],[285,399]];
const RIGHT_MIRROR_TOP: Points = LEFT_MIRROR_TOP.map(([x,y]): Point => [1000-x,y]).reverse();
const RIGHT_MIRROR_FRONT: Points = LEFT_MIRROR_FRONT.map(([x,y]): Point => [1000-x,y]).reverse();

const ACCENT_LEFT_TOP: Points = [[425,168],[450,152],[466,157],[463,175],[434,190]];
const ACCENT_LEFT_FRONT: Points = [[274,651],[314,647],[351,662],[335,676],[289,671]];
const ACCENT_RIGHT_TOP: Points = ACCENT_LEFT_TOP.map(([x,y]): Point => [1000-x,y]).reverse();
const ACCENT_RIGHT_FRONT: Points = ACCENT_LEFT_FRONT.map(([x,y]): Point => [1000-x,y]).reverse();

function shape(a: Points, b: Points, t: number) {
  return path(pts(a, b, t));
}

function Wheel({ x, y, width, height, t }: { x: number; y: number; width: number; height: number; t: number }) {
  return (
    <g transform={"translate(" + fmt(x) + " " + fmt(y) + ")"} aria-hidden="true">
      <rect x={fmt(-width/2)} y={fmt(-height/2)} width={fmt(width)} height={fmt(height)} rx={fmt(Math.min(width*.34,height*.27))} fill="#030507" stroke="#252d36" strokeWidth="3"/>
      {[-.22,0,.22].map(i =>
        <path key={i} d={"M"+fmt(-width*.35)+" "+fmt(i*height)+" h"+fmt(width*.7)} stroke="#343c46" strokeWidth="2" opacity={lerp(.8,.4,t)}/>
      )}
    </g>
  );
}

export function CarScroll3D({ progress }: { progress: number }) {
  // Morphing is a continuous frame generator (no crossfade, no replacement image).
  // The roof-to-front journey stops at 72% of the scroll range.
  const angle = phase(progress, 0.14, 0.725);
  const lights = phase(progress, 0.785, 0.855);
  const bloom = phase(progress, 0.865, 0.935);
  const roadTravel = phase(progress, 0.12, 0.67);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const s = useMemo(() => {
    const left = pts(BODY_TOP, BODY_FRONT, angle);
    const headLeft = pts(LEFT_LIGHT_TOP, LEFT_LIGHT_FRONT, angle);
    const headRight = pts(RIGHT_LIGHT_TOP, RIGHT_LIGHT_FRONT, angle);
    const center = (p: Points): Point => [
      p.reduce((total, v) => total + v[0], 0) / p.length,
      p.reduce((total, v) => total + v[1], 0) / p.length,
    ];
    return {
      body: path(mirror(left)),
      glass: shape(GLASS_TOP, GLASS_FRONT, angle),
      hood: shape(HOOD_TOP, HOOD_FRONT, angle),
      grille: shape(GRILLE_TOP, GRILLE_FRONT, angle),
      bumper: shape(BUMPER_TOP, BUMPER_FRONT, angle),
      leftLight: path(headLeft),
      rightLight: path(headRight),
      leftMirror: shape(LEFT_MIRROR_TOP, LEFT_MIRROR_FRONT, angle),
      rightMirror: shape(RIGHT_MIRROR_TOP, RIGHT_MIRROR_FRONT, angle),
      leftAccent: shape(ACCENT_LEFT_TOP, ACCENT_LEFT_FRONT, angle),
      rightAccent: shape(ACCENT_RIGHT_TOP, ACCENT_RIGHT_FRONT, angle),
      leftLampPoint: center(headLeft),
      rightLampPoint: center(headRight),
      // Side trim and roof crease are also parts of this one car.
      leftTrim: path(pts(
        [[436,144],[416,299],[419,523],[438,655]],
        [[401,228],[281,363],[253,526],[289,658]],
        angle),false),
      rightTrim: path(pts(
        [[564,144],[584,299],[581,523],[562,655]],
        [[599,228],[719,363],[747,526],[711,658]],
        angle),false),
      roofCreaseLeft: path(pts(
        [[456,246],[445,335],[450,448]],
        [[390,290],[383,351],[341,421]],
        angle),false),
      roofCreaseRight: path(pts(
        [[544,246],[555,335],[550,448]],
        [[610,290],[617,351],[659,421]],
        angle),false),
    };
  }, [angle]);

  const wheelStage = angle;
  const leftFrontWheel: Point = mix([367,572],[208,608],wheelStage);
  const rightFrontWheel: Point = mix([633,572],[792,608],wheelStage);
  const leftRearWheel: Point = mix([369,252],[240,546],wheelStage);
  const rightRearWheel: Point = mix([631,252],[760,546],wheelStage);
  const fw = lerp(53,56,wheelStage);
  const fh = lerp(126,120,wheelStage);
  const rw = lerp(54,34,wheelStage);
  const rh = lerp(110,70,wheelStage);
  const headAlpha = Math.min(1, lights * (0.65 + 0.35 * bloom));

  return (
    <div className="hero-morph-scene" aria-hidden="true" data-angle={angle.toFixed(3)}>
      <svg className="hero-morph-svg" viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid meet" focusable="false" role="presentation">
        <defs>
          <radialGradient id="morph-road" cx="50%" cy="46%" r="65%">
            <stop offset="0" stopColor="#21232c"/>
            <stop offset=".47" stopColor="#11131a"/>
            <stop offset="1" stopColor="#030408"/>
          </radialGradient>
          <linearGradient id="morph-body" x1="0" x2=".93" y1="0" y2=".85">
            <stop offset="0" stopColor="#68717b"/><stop offset=".12" stopColor="#1b222c"/>
            <stop offset=".45" stopColor="#070a10"/><stop offset=".8" stopColor="#292f3a"/><stop offset="1" stopColor="#080a0e"/>
          </linearGradient>
          <linearGradient id="morph-hood" x1="0" x2="1" y1=".15" y2=".9">
            <stop offset="0" stopColor="#272f39"/><stop offset=".47" stopColor="#090c12"/>
            <stop offset="1" stopColor="#323b47"/>
          </linearGradient>
          <linearGradient id="morph-glass" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#324350"/><stop offset=".22" stopColor="#0d1722"/>
            <stop offset=".71" stopColor="#060c13"/><stop offset="1" stopColor="#344958"/>
          </linearGradient>
          <linearGradient id="morph-lamp" x1="0" x2="1">
            <stop offset="0" stopColor="#dceaf3"/><stop offset=".4" stopColor="#849eb2"/><stop offset="1" stopColor="#e6f0f7"/>
          </linearGradient>
          <radialGradient id="morph-led-glow">
            <stop offset="0" stopColor="#fff" stopOpacity="1"/>
            <stop offset=".15" stopColor="#f2faff" stopOpacity=".98"/>
            <stop offset=".46" stopColor="#c6e6ff" stopOpacity=".55"/>
            <stop offset="1" stopColor="#a1c8ff" stopOpacity="0"/>
          </radialGradient>
          <filter id="morph-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="18"/>
          </filter>
          <filter id="morph-headlight-blur" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="14"/>
          </filter>
        </defs>

        <rect width="1000" height="800" fill="url(#morph-road)"/>
        {/* The changing lane geometry reinforces the lowering camera position. */}
        <g fill="none" stroke="#818994" strokeWidth="2.5" opacity=".48">
          <path d={"M"+fmt(lerp(310,450,angle))+" -40 L"+fmt(lerp(310,53,angle))+" 840"}/>
          <path d={"M"+fmt(lerp(690,550,angle))+" -40 L"+fmt(lerp(690,947,angle))+" 840"}/>
        </g>
        <path d={"M500 "+fmt(lerp(-80,-15,roadTravel))+" V820"} stroke="#828995" strokeWidth="5" strokeDasharray="38 72" strokeDashoffset={fmt(-roadTravel*950)} opacity={lerp(.38,.25,angle)}/>
        <ellipse cx="500" cy={fmt(lerp(673,722,angle))} rx={fmt(lerp(150,348,angle))} ry="26" fill="#000" opacity=".52" filter="url(#morph-shadow)"/>

        {/* One continuous, vector-drawn vehicle; no photographic swap or crossfade. */}
        <g className="hero-morph-car" transform={mobile ? "translate(500 403) scale(1.52) translate(-500 -403)" : undefined}>
          <Wheel x={leftRearWheel[0]} y={leftRearWheel[1]} width={rw} height={rh} t={wheelStage}/>
          <Wheel x={rightRearWheel[0]} y={rightRearWheel[1]} width={rw} height={rh} t={wheelStage}/>
          <Wheel x={leftFrontWheel[0]} y={leftFrontWheel[1]} width={fw} height={fh} t={wheelStage}/>
          <Wheel x={rightFrontWheel[0]} y={rightFrontWheel[1]} width={fw} height={fh} t={wheelStage}/>

          <path d={s.leftMirror} fill="#141a24" stroke="#6c7b89" strokeWidth="3.2"/>
          <path d={s.rightMirror} fill="#141a24" stroke="#6c7b89" strokeWidth="3.2"/>
          <path d={s.body} fill="url(#morph-body)" stroke="#7d8a98" strokeWidth="4.1" strokeLinejoin="round"/>
          <path d={s.leftTrim} fill="none" stroke="#b0beca" strokeWidth="3.1" opacity=".60"/>
          <path d={s.rightTrim} fill="none" stroke="#b0beca" strokeWidth="3.1" opacity=".60"/>

          <path d={s.glass} fill="url(#morph-glass)" stroke="#688194" strokeWidth="3.6" strokeLinejoin="round"/>
          <path d={s.roofCreaseLeft} fill="none" stroke="#bed1df" strokeOpacity=".27" strokeWidth="8" strokeLinecap="round"/>
          <path d={s.roofCreaseRight} fill="none" stroke="#bed1df" strokeOpacity=".17" strokeWidth="7" strokeLinecap="round"/>

          <path d={s.hood} fill="url(#morph-hood)" stroke="#556575" strokeWidth="3.4" strokeLinejoin="round"/>
          <path d={s.grille} fill="#070a0e" stroke="#697889" strokeWidth="3.5"/>
          {/* Grill lines are part of the same path, not a second frontal car. */}
          {[0,1,2,3].map(i => {
            const y = lerp(672+i*2.5,585+i*13,angle);
            const half = lerp(33,116,angle);
            return <path key={i} d={"M"+fmt(500-half)+" "+fmt(y)+" Q500 "+fmt(y+lerp(0,9,angle))+" "+fmt(500+half)+" "+fmt(y)} stroke="#27323e" strokeWidth="3" fill="none"/>;
          })}
          <path d={s.bumper} fill="#141a21" stroke="#6a7683" strokeWidth="3.6"/>
          <path d={s.leftAccent} fill="#d6223b" opacity=".88"/>
          <path d={s.rightAccent} fill="#d6223b" opacity=".88"/>

          <path d={s.leftLight} fill="#0c1521" stroke="#a0b0bf" strokeWidth="4" strokeLinejoin="round"/>
          <path d={s.rightLight} fill="#0c1521" stroke="#a0b0bf" strokeWidth="4" strokeLinejoin="round"/>
          <path d={s.leftLight} fill="url(#morph-lamp)" opacity=".30"/>
          <path d={s.rightLight} fill="url(#morph-lamp)" opacity=".30"/>

          {/* Dual headlight ignition, after the perspective has fully stopped. */}
          <g opacity={headAlpha}>
            <path d={s.leftLight} fill="#eefaff" opacity=".86"/>
            <path d={s.rightLight} fill="#eefaff" opacity=".86"/>
            {[s.leftLampPoint,s.rightLampPoint].map(([x,y],i) =>
              <g key={i}>
                <ellipse cx={fmt(x)} cy={fmt(y)} rx={fmt(lerp(45,112,angle)+bloom*95)} ry={fmt(lerp(30,77,angle)+bloom*60)} fill="url(#morph-led-glow)" filter="url(#morph-headlight-blur)"/>
                <ellipse cx={fmt(x)} cy={fmt(y)} rx={fmt(lerp(19,42,angle)+bloom*27)} ry={fmt(lerp(13,24,angle)+bloom*16)} fill="url(#morph-led-glow)" />
              </g>
            )}
          </g>
          <text x="500" y={fmt(lerp(692,679,angle))} textAnchor="middle" fill="#d3d9e0" opacity={.27+.45*angle} fontFamily="Arial, sans-serif" fontSize={fmt(lerp(5,11,angle))} fontWeight="800" letterSpacing="3">SKINÃO</text>
        </g>
      </svg>
    </div>
  );
}
