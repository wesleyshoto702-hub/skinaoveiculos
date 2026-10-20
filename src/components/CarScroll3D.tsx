import { useEffect, useMemo, useState } from "react";

/**
 * A new, unified concept car drawn as one continuously evolving vector.
 *
 * The vehicle is intentionally illustration-first, with a few metallic/shaded
 * details for dimension. One set of matching landmarks is interpolated through
 * overhead -> elevated three-quarter -> front. No crossfade, scene swap, GLB,
 * floating 3D chassis or external assets. Native vertical scroll drives it.
 */
type Point = readonly [number, number];
type Points = readonly Point[];
type Stages = readonly [Points, Points, Points];

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
const phase = (progress: number, start: number, end: number) =>
  smooth((progress - start) / (end - start));
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;
const format = (value: number) => value.toFixed(1);
const interpolatePoint = (from: Point, to: Point, amount: number): Point => [
  lerp(from[0], to[0], amount),
  lerp(from[1], to[1], amount),
];

// Cubic midpoint interpolation: positions and their tangents are continuous,
// so the car never snaps or dissolves when passing the middle camera angle.
function interpolate([top, middle, front]: Stages, t: number): Point[] {
  if (top.length !== middle.length || top.length !== front.length) {
    throw new Error("All automotive silhouettes must use matching landmarks");
  }
  const first = t <= 0.5;
  const u = clamp(first ? t * 2 : (t - 0.5) * 2);
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;
  return top.map((start, index): Point => {
    const center = middle[index], finish = front[index];
    return [0, 1].map(axis => {
      const a = start[axis], b = center[axis], c = finish[axis];
      const p0 = first ? a : b, p1 = first ? b : c;
      const m0 = first ? b - a : (c - a) / 2;
      const m1 = first ? (c - a) / 2 : c - b;
      return h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
    }) as unknown as Point;
  });
}

function outline(points: Points, close = true) {
  if (!points.length) return "";
  let d = "M" + format(points[0][0]) + " " + format(points[0][1]);
  const count = points.length;
  const n = close ? count : count - 1;
  for (let i = 0; i < n; i++) {
    const prev = points[close ? (i + count - 1) % count : Math.max(0, i - 1)];
    const current = points[i], next = points[(i + 1) % count];
    const after = points[close ? (i + 2) % count : Math.min(count - 1, i + 2)];
    d += " C" + format(current[0] + (next[0] - prev[0]) / 6) +
      " " + format(current[1] + (next[1] - prev[1]) / 6) +
      " " + format(next[0] - (after[0] - current[0]) / 6) +
      " " + format(next[1] - (after[1] - current[1]) / 6) +
      " " + format(next[0]) + " " + format(next[1]);
  }
  return d + (close ? " Z" : "");
}

const reflect = (points: Points): Point[] => points.map(([x, y]): Point => [1000 - x, y]).reverse();
const symmetric = (left: Points): Point[] => [...left, ...reflect(left)];

// All three camera views were designed together for one original, unbranded
// graphite sports sedan. The front has a tall glass area and full-height nose.
const BODY: Stages = [
  [[461,93],[426,104],[401,144],[390,222],[379,381],[384,524],[407,629],[436,688],[471,709]],
  [[448,148],[401,163],[357,220],[323,304],[311,439],[312,545],[333,646],[371,701],[413,725]],
  [[430,182],[373,192],[327,237],[275,329],[243,450],[219,545],[224,638],[263,706],[336,737]],
];
const WINDSHIELD: Stages = [
  [[445,246],[463,234],[537,234],[555,246],[571,453],[548,473],[452,473],[429,453]],
  [[408,260],[439,244],[561,244],[592,260],[625,443],[568,471],[432,471],[375,443]],
  [[356,282],[401,229],[599,229],[644,282],[684,458],[609,478],[391,478],[316,458]],
];
const HOOD: Stages = [
  [[418,510],[462,503],[538,503],[582,510],[595,628],[565,661],[435,661],[405,628]],
  [[356,477],[425,476],[575,476],[644,477],[702,575],[619,615],[381,615],[298,575]],
  [[308,475],[405,484],[595,484],[692,475],[765,582],[671,613],[329,613],[235,582]],
];
const GRILLE: Stages = [
  [[458,657],[480,656],[520,656],[542,657],[540,683],[520,691],[480,691],[460,683]],
  [[394,626],[427,621],[573,621],[606,626],[600,684],[557,699],[443,699],[400,684]],
  [[369,612],[416,604],[584,604],[631,612],[624,671],[555,694],[445,694],[376,671]],
];
const FRONT_BUMPER: Stages = [
  [[446,681],[476,687],[524,687],[554,681],[546,697],[523,705],[477,705],[454,697]],
  [[358,685],[401,700],[599,700],[642,685],[626,711],[584,722],[416,722],[374,711]],
  [[291,681],[370,707],[630,707],[709,681],[691,719],[615,733],[385,733],[309,719]],
];
const LEFT_HEADLIGHT: Stages = [
  [[402,618],[421,611],[474,646],[462,667],[419,658],[401,638]],
  [[314,543],[344,526],[439,539],[459,560],[426,587],[331,575]],
  [[230,555],[265,532],[366,535],[434,560],[403,583],[257,584]],
];
const LEFT_MIRROR: Stages = [
  [[387,284],[338,291],[330,316],[382,329]],
  [[328,315],[283,324],[269,353],[321,376]],
  [[297,335],[242,347],[224,376],[285,397]],
];
const SIDE_SHOULDER: Stages = [
  [[419,157],[406,298],[402,496],[429,667]],
  [[392,194],[338,340],[334,527],[370,682]],
  [[353,223],[288,375],[267,556],[318,701]],
];
const ROOF_LEFT: Stages = [
  [[457,257],[449,329],[454,446]],
  [[419,277],[397,365],[402,448]],
  [[399,278],[375,375],[354,454]],
];
const ROOF_RIGHT: Stages = [
  [[543,257],[551,329],[546,446]],
  [[581,277],[603,365],[598,448]],
  [[601,278],[625,375],[646,454]],
];

function Wheel({ position, width, height, visible }: {
  position: Point; width: number; height: number; visible: number;
}) {
  return (
    <g opacity={visible} transform={"translate(" + format(position[0]) + " " + format(position[1]) + ")"}>
      <rect x={format(-width / 2)} y={format(-height / 2)}
        width={format(width)} height={format(height)}
        rx={format(Math.min(width * .4, height * .23))}
        fill="#06090e" stroke="#323a44" strokeWidth="3"/>
      <path d={"M" + format(-width * .29) + " 0 H" + format(width * .29)}
        stroke="#6b7782" strokeWidth="3" opacity=".65"/>
      <path d={"M" + format(-width * .23) + " -16 H" + format(width * .23) +
        " M" + format(-width * .23) + " 16 H" + format(width * .23)}
        stroke="#424d57" strokeWidth="2"/>
    </g>
  );
}

export function CarScroll3D({ progress }: { progress: number }) {
  // Kept the public component signature for compatibility with the existing
  // Hero; the implementation itself is lightweight, two-dimensional SVG.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const angle = phase(progress, .11, .72);
  const roadShift = phase(progress, .12, .625);
  const lights = phase(progress, .785, .855);
  const flash = phase(progress, .865, .935);
  const rearLights = 1 - phase(angle, .05, .24);
  const frontTrim = phase(angle, .52, .92);

  const art = useMemo(() => {
    const body = symmetric(interpolate(BODY, angle));
    const lampL = interpolate(LEFT_HEADLIGHT, angle);
    const lampR = reflect(lampL);
    const lampCenter = (p: Points): Point => [
      p.reduce((sum, point) => sum + point[0], 0) / p.length,
      p.reduce((sum, point) => sum + point[1], 0) / p.length,
    ];
    return {
      body: outline(body),
      windshield: outline(interpolate(WINDSHIELD, angle)),
      hood: outline(interpolate(HOOD, angle)),
      grille: outline(interpolate(GRILLE, angle)),
      bumper: outline(interpolate(FRONT_BUMPER, angle)),
      leftHeadlight: outline(lampL),
      rightHeadlight: outline(lampR),
      leftMirror: outline(interpolate(LEFT_MIRROR, angle)),
      rightMirror: outline(reflect(interpolate(LEFT_MIRROR, angle))),
      leftShoulder: outline(interpolate(SIDE_SHOULDER, angle), false),
      rightShoulder: outline(reflect(interpolate(SIDE_SHOULDER, angle)), false),
      roofLeft: outline(interpolate(ROOF_LEFT, angle), false),
      roofRight: outline(interpolate(ROOF_RIGHT, angle), false),
      lampCenters: [lampCenter(lampL), lampCenter(lampR)] as [Point, Point],
    };
  }, [angle]);

  const wheelFade = 1 - phase(angle, .73, .96);
  const wheelFrontLeft = interpolatePoint(interpolatePoint([362,565],[300,573],Math.min(angle * 2,1)),[205,643],Math.max(0,angle*2-1));
  const wheelFrontRight: Point = [1000 - wheelFrontLeft[0], wheelFrontLeft[1]];
  const wheelRearLeft = interpolatePoint(interpolatePoint([364,236],[271,446],Math.min(angle*2,1)),[241,571],Math.max(0,angle*2-1));
  const wheelRearRight: Point = [1000 - wheelRearLeft[0],wheelRearLeft[1]];
  const wheelWidth = lerp(48,54,angle);
  const wheelHeight = lerp(131,110,angle);
  const beamsOpacity = lights * (.6 + .4 * flash);

  return (
    <div className="hero-morph-scene" aria-hidden="true">
      <svg className="hero-morph-svg" viewBox={isMobile ? "200 0 600 830" : "0 0 1000 830"} preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="sk-concept-asphalt" cx="50%" cy="51%" r="70%">
            <stop offset="0%" stopColor="#222630"/>
            <stop offset="55%" stopColor="#101219"/>
            <stop offset="100%" stopColor="#030408"/>
          </radialGradient>
          <linearGradient id="sk-concept-paint" x1="0" y1=".15" x2="1" y2=".92">
            <stop offset="0%" stopColor="#76808c"/>
            <stop offset="11%" stopColor="#303844"/>
            <stop offset="34%" stopColor="#101722"/>
            <stop offset="53%" stopColor="#06090f"/>
            <stop offset="79%" stopColor="#272f3a"/>
            <stop offset="100%" stopColor="#8895a1"/>
          </linearGradient>
          <linearGradient id="sk-concept-hood" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#343e4a"/>
            <stop offset="24%" stopColor="#151d28"/>
            <stop offset="60%" stopColor="#080c13"/>
            <stop offset="100%" stopColor="#38434e"/>
          </linearGradient>
          <linearGradient id="sk-concept-glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#647c8d"/>
            <stop offset="17%" stopColor="#263e4e"/>
            <stop offset="48%" stopColor="#09131e"/>
            <stop offset="84%" stopColor="#142635"/>
            <stop offset="100%" stopColor="#435a68"/>
          </linearGradient>
          <linearGradient id="sk-concept-LED" x1="0" x2="1">
            <stop offset="0%" stopColor="#d7ebf6"/>
            <stop offset="43%" stopColor="#9fc7e0"/>
            <stop offset="100%" stopColor="#e7f9ff"/>
          </linearGradient>
          <radialGradient id="sk-concept-bloom">
            <stop offset="0%" stopColor="#fff" stopOpacity="1"/>
            <stop offset="14%" stopColor="#f5fcff" stopOpacity=".97"/>
            <stop offset="39%" stopColor="#c5e4ff" stopOpacity=".53"/>
            <stop offset="100%" stopColor="#c5e4ff" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="sk-concept-shadow">
            <stop offset="0%" stopColor="#000" stopOpacity=".75"/>
            <stop offset="100%" stopColor="#000" stopOpacity="0"/>
          </radialGradient>
          <filter id="sk-concept-light-blur" x="-90%" y="-140%" width="280%" height="380%">
            <feGaussianBlur stdDeviation="11"/>
          </filter>
          <clipPath id="sk-concept-vehicle-clip">
            <path d={art.body}/>
          </clipPath>
          <clipPath id="sk-concept-grille-clip">
            <path d={art.grille}/>
          </clipPath>
        </defs>

        <rect width="1000" height="830" fill="url(#sk-concept-asphalt)"/>
        <g stroke="#818995" fill="none" opacity=".27">
          <path d={"M"+format(lerp(278,455,angle))+" -30 L"+format(lerp(278,63,angle))+" 870"} strokeWidth="3.2"/>
          <path d={"M"+format(lerp(722,545,angle))+" -30 L"+format(lerp(722,937,angle))+" 870"} strokeWidth="3.2"/>
        </g>
        <path d={"M500 -140 V970"} fill="none" stroke="#a9b1bb"
          strokeWidth={lerp(3.5,2,angle)} strokeDasharray="37 95"
          strokeDashoffset={format(-roadShift * 740)} opacity={lerp(.25,.07,angle)}/>
        <ellipse cx="500" cy={format(lerp(698,755,angle))}
          rx={format(lerp(145,334,angle))} ry={format(lerp(40,35,angle))}
          fill="url(#sk-concept-shadow)"/>

        <g className="hero-concept-car">
          <Wheel position={wheelRearLeft} width={wheelWidth} height={wheelHeight} visible={wheelFade}/>
          <Wheel position={wheelRearRight} width={wheelWidth} height={wheelHeight} visible={wheelFade}/>
          <Wheel position={wheelFrontLeft} width={wheelWidth} height={wheelHeight} visible={1}/>
          <Wheel position={wheelFrontRight} width={wheelWidth} height={wheelHeight} visible={1}/>

          <path d={art.leftMirror} fill="#121a24" stroke="#87949f" strokeWidth="3.1"/>
          <path d={art.rightMirror} fill="#121a24" stroke="#87949f" strokeWidth="3.1"/>
          <path d={art.body} fill="url(#sk-concept-paint)" stroke="#80909d" strokeWidth="4.2" strokeLinejoin="round"/>

          {/* Rear taillights do not move through the front body. */}
          <g opacity={rearLights} clipPath="url(#sk-concept-vehicle-clip)">
            <path d="M414 150 Q449 125 476 136 L477 155 Q449 149 423 177Z" fill="#d72943"/>
            <path d="M586 150 Q551 125 524 136 L523 155 Q551 149 577 177Z" fill="#d72943"/>
            <path d="M429 156 L468 145 M571 156 L532 145" stroke="#ff5365" strokeWidth="4" fill="none"/>
          </g>

          <g clipPath="url(#sk-concept-vehicle-clip)">
            <path d={art.leftShoulder} fill="none" stroke="#e0e7ed" strokeWidth="4" opacity=".37"/>
            <path d={art.rightShoulder} fill="none" stroke="#e0e7ed" strokeWidth="4" opacity=".37"/>
            <path d="M390 289 Q400 357 397 442" fill="none" stroke="#fff" strokeWidth="8" opacity={.04+.08*angle}/>
            <path d="M610 289 Q600 357 603 442" fill="none" stroke="#fff" strokeWidth="8" opacity={.04+.08*angle}/>
          </g>

          <path d={art.windshield} fill="url(#sk-concept-glass)" stroke="#8fa3b1" strokeWidth="4" strokeLinejoin="round"/>
          <path d={art.roofLeft} fill="none" stroke="#d1deea" strokeWidth="7" opacity=".17" strokeLinecap="round"/>
          <path d={art.roofRight} fill="none" stroke="#d1deea" strokeWidth="7" opacity=".13" strokeLinecap="round"/>

          <path d={art.hood} fill="url(#sk-concept-hood)" stroke="#637381" strokeWidth="3.8" strokeLinejoin="round"/>
          <g opacity={frontTrim} clipPath="url(#sk-concept-vehicle-clip)" fill="none">
            <path d="M318 516 Q397 508 443 531" stroke="#a1b1be" strokeWidth="4" opacity=".39"/>
            <path d="M682 516 Q603 508 557 531" stroke="#a1b1be" strokeWidth="4" opacity=".39"/>
            <path d="M324 591 Q500 612 676 591" stroke="#d9e4eb" strokeWidth="3" opacity=".19"/>
          </g>

          <path d={art.grille} fill="#05080d" stroke="#5d6e7d" strokeWidth="3.3"/>
          <g clipPath="url(#sk-concept-grille-clip)" stroke="#3d4752" strokeWidth="4">
            {[0,1,2,3,4].map(i=>
              <path key={i} d={"M310 "+format(lerp(671,620,angle)+i*12)+" H690"}/>
            )}
          </g>

          <path d={art.bumper} fill="#101720" stroke="#687b89" strokeWidth="3.6" clipPath="url(#sk-concept-vehicle-clip)"/>
          <path d="M339 719 Q500 740 661 719" fill="none" stroke="#df2a44" strokeWidth="5" clipPath="url(#sk-concept-vehicle-clip)"
            opacity={phase(angle,.7,.96)*.8} strokeLinecap="round"/>

          {/* LED housings never change object identity during the perspective move. */}
          <path d={art.leftHeadlight} fill="#0b1420" stroke="#a5bbc9" strokeWidth="4"/>
          <path d={art.rightHeadlight} fill="#0b1420" stroke="#a5bbc9" strokeWidth="4"/>
          <path d={art.leftHeadlight} fill="url(#sk-concept-LED)" opacity=".34"/>
          <path d={art.rightHeadlight} fill="url(#sk-concept-LED)" opacity=".34"/>
          <g opacity={beamsOpacity}>
            <path d={art.leftHeadlight} fill="#f4fcff" opacity=".88"/>
            <path d={art.rightHeadlight} fill="#f4fcff" opacity=".88"/>
            {art.lampCenters.map(([x,y],index)=>
              <g key={index}>
                <ellipse cx={format(x)} cy={format(y)}
                  rx={format(52+angle*62+flash*105)} ry={format(36+angle*28+flash*84)}
                  fill="url(#sk-concept-bloom)" filter="url(#sk-concept-light-blur)"/>
                <ellipse cx={format(x)} cy={format(y)}
                  rx={format(18+angle*20+flash*25)} ry={format(11+angle*12+flash*16)}
                  fill="url(#sk-concept-bloom)"/>
              </g>
            )}
          </g>
        </g>
      </svg>
    </div>
  );
}
