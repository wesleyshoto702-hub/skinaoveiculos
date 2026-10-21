import { memo } from "react";

/**
 * Decorative vector fleet for the final Hero (never stock photographs).
 * Each body is drawn individually in the more dimensional loading-screen style.
 * No downloads, no 3D meshes, no per-frame React state.
 */
type CarDesign = {
  kind: "car";
  id: string;
  color: string;
  body: string;
  windows: string;
  seams: string;
  highlight: string;
  rearWheel: number;
  frontWheel: number;
  accessory?: "pickup" | "offroad" | "race" | "van";
};

type BikeDesign = {
  kind: "motorcycle";
  id: string;
  color: string;
  style: "sport" | "naked" | "cruiser" | "adventure";
};

type Design = CarDesign | BikeDesign;

const fleet: Design[] = [
  {
    kind: "car", id: "executive-sedan", color: "#dc6174",
    body: "M9 66Q12 56 30 53L57 49L77 29Q86 24 105 24H142Q161 24 170 35L189 51L207 57Q214 60 213 72L201 78H11Z",
    windows: "M80 33Q88 28 104 28H123V49H63ZM128 28H140Q153 29 162 40L172 50H128Z",
    seams: "M125 50V69M169 50L177 67M125 56L135 57",
    highlight: "M25 56Q61 51 74 43M144 31Q166 35 181 51",
    rearWheel: 52, frontWheel: 176,
  },
  {
    kind: "car", id: "city-hatch", color: "#4eacdf",
    body: "M11 66L24 53L45 49L64 27Q70 22 83 22H134Q146 22 155 34L181 56L205 61Q212 64 211 74L200 79H12Z",
    windows: "M69 32Q76 27 86 27H118V50H54ZM124 27H133Q144 28 151 39L165 52H124Z",
    seams: "M122 50V69M158 53L165 68M40 56L28 64",
    highlight: "M30 54L46 50M64 36Q77 29 89 29",
    rearWheel: 51, frontWheel: 180,
  },
  {
    kind: "car", id: "family-suv", color: "#dfad4f",
    body: "M9 64L23 53H43L60 24Q64 19 76 19H158Q169 19 173 28L180 50L205 58Q213 61 213 73L202 79H10Z",
    windows: "M63 29H112V49H52ZM119 29H159L169 49H119Z",
    seams: "M115 50V70M173 51L178 70M85 57H95M137 57H147",
    highlight: "M30 56H47M64 23H154",
    rearWheel: 49, frontWheel: 181,
  },
  {
    kind: "car", id: "double-cab-pickup", color: "#57ba99",
    body: "M7 65L22 56H40L55 31Q60 25 71 25H117Q129 25 137 37L146 54H206L214 63V78H8Z",
    windows: "M59 34H92V53H47ZM99 34H116L132 53H99Z",
    seams: "M96 53V70M141 55V72M155 57H205",
    highlight: "M24 58H42M55 29Q63 26 74 27M150 54H203",
    rearWheel: 52, frontWheel: 183,
    accessory: "pickup",
  },
  {
    kind: "car", id: "grand-touring-coupe", color: "#b18df0",
    body: "M8 68L24 59L61 51L94 31Q107 25 135 27Q154 28 167 44L188 57L212 65V77H9Z",
    windows: "M95 37Q109 31 133 32L148 33L165 52H76Z",
    seams: "M150 54L156 70M85 58L92 60",
    highlight: "M24 62L67 52M111 30Q137 28 153 38",
    rearWheel: 52, frontWheel: 179,
    accessory: "race",
  },
  {
    kind: "car", id: "trail-4x4", color: "#8fc2ce",
    body: "M7 63L18 52H42L48 24H151L161 30L173 52H201Q212 55 213 70V78H8Z",
    windows: "M54 29H93V51H48ZM99 29H147L160 51H99Z",
    seams: "M96 52V69M163 53V71M42 27V52",
    highlight: "M51 24H146M22 55H43",
    rearWheel: 47, frontWheel: 185,
    accessory: "offroad",
  },
  {
    kind: "car", id: "touring-wagon", color: "#ed925c",
    body: "M9 65L20 55H45L59 28Q64 23 74 23H154Q166 23 175 39L185 51L206 58L213 69V78H9Z",
    windows: "M62 32H111V50H52ZM117 32H151L167 51H117Z",
    seams: "M113 51V70M168 52V69M71 57H81",
    highlight: "M24 57L48 53M67 25H150",
    rearWheel: 49, frontWheel: 182,
  },
  {
    kind: "car", id: "track-supercar", color: "#f07885",
    body: "M6 71L31 60L84 50L115 35Q129 30 148 34L171 49L200 62L215 70V78H7Z",
    windows: "M117 41Q131 35 146 39L166 51H94Z",
    seams: "M148 54L163 69M73 58L88 54",
    highlight: "M26 64L94 51M115 36Q133 31 147 36",
    rearWheel: 50, frontWheel: 181,
    accessory: "race",
  },
  { kind: "motorcycle", id: "sport-motorcycle", color: "#ed425b", style: "sport" },
  { kind: "motorcycle", id: "street-naked-motorcycle", color: "#57c2b8", style: "naked" },
  { kind: "motorcycle", id: "custom-cruiser-motorcycle", color: "#e8b55d", style: "cruiser" },
  { kind: "motorcycle", id: "adventure-motorcycle", color: "#9f97ea", style: "adventure" },
];

/** Metallic wheels with visible rims and spokes, like the loading vehicles. */
function Wheel({ x, y = 76, radius = 13 }: { x: number; y?: number; radius?: number }) {
  return (
    <g transform={"translate(" + x + " " + y + ")"}>
      <circle r={radius + 2} fill="#06080c" stroke="#414d5a" strokeWidth="3.2" />
      <circle r={radius - 3} fill="#1b2632" stroke="#bdc7d1" strokeWidth="2.6" />
      <path d="M0 -8V8M-8 0H8M-5.6 -5.6L5.6 5.6M5.6 -5.6L-5.6 5.6"
        stroke="#c0cbd6" strokeWidth="1.65" strokeLinecap="round" />
      <circle r="3.1" fill="#e3e8ee" stroke="#677484" strokeWidth="1.4" />
    </g>
  );
}

function CarArtwork({ design }: { design: CarDesign }) {
  const paint = "hero-paint-" + design.id;
  const glass = "hero-glass-" + design.id;
  return (
    <svg viewBox="0 0 220 100" role="presentation" focusable="false"
      xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={paint} x1="0" y1="0" x2=".26" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".60" />
          <stop offset=".24" stopColor={design.color} />
          <stop offset=".7" stopColor={design.color} stopOpacity=".84" />
          <stop offset="1" stopColor="#171c26" />
        </linearGradient>
        <linearGradient id={glass} x1="0" y1="0" x2=".7" y2="1">
          <stop offset="0" stopColor="#8da5b9" />
          <stop offset=".4" stopColor="#38536b" />
          <stop offset="1" stopColor="#111a29" />
        </linearGradient>
      </defs>
      <ellipse cx="110" cy="88" rx="99" ry="7" fill="#000" opacity=".5" />
      <path d={design.body} fill={"url(#" + paint + ")"}
        stroke={design.color} strokeWidth="2.8" strokeLinejoin="round" />
      <path d={design.windows} fill={"url(#" + glass + ")"}
        stroke="#9db6c7" strokeWidth="1.55" strokeLinejoin="round" />
      <path d={design.seams} fill="none" stroke="#111c2a"
        strokeWidth="1.65" strokeLinecap="round" opacity=".67" />
      <path d={design.highlight} fill="none" stroke="#ffffff"
        strokeWidth="2.1" strokeLinecap="round" opacity=".37" />
      <path d="M15 69Q108 74 207 70" stroke="#131924"
        strokeWidth="2.4" fill="none" opacity=".48" />
      {/* Light bar at the front, red rear lamp and understated door handles. */}
      <path d="M198 57L211 61L210 67L194 64Z" fill="#e5f6ff" opacity=".94" />
      <path d="M12 61L29 58" stroke="#ff6e7b" strokeWidth="4.2" strokeLinecap="round" />
      <path d="M88 56H97M133 56H142" stroke="#e4e6ed"
        strokeWidth="1.8" strokeLinecap="round" opacity=".67" />
      {design.accessory === "pickup" && (
        <path d="M146 54H208M202 54V72" fill="none"
          stroke="#d9f1eb" strokeWidth="2.5" opacity=".55" />
      )}
      {design.accessory === "offroad" && (
        <>
          <path d="M29 47V22M29 22H57" stroke="#9db0b8"
            strokeWidth="3.5" strokeLinecap="round" />
          <rect x="11" y="36" width="15" height="20" rx="3"
            fill="#222c36" stroke="#91a4af" strokeWidth="2" />
        </>
      )}
      {design.accessory === "race" && (
        <path d="M24 56L35 50L53 49" stroke={design.color}
          strokeWidth="4" strokeLinecap="round" fill="none" />
      )}
      <Wheel x={design.rearWheel} />
      <Wheel x={design.frontWheel} />
    </svg>
  );
}

/** Four visibly different motorbike silhouettes, each with a geared rider. */
function BikeArtwork({ design }: { design: BikeDesign }) {
  const { style } = design;
  const sport = style === "sport";
  const cruiser = style === "cruiser";
  const adventure = style === "adventure";
  const paint = "hero-bike-paint-" + design.id;
  const helmetX = sport ? 119 : cruiser ? 101 : adventure ? 108 : 109;
  const helmetY = sport ? 24 : adventure ? 19 : cruiser ? 24 : 23;
  const torso = sport
    ? "M108 34L122 36Q132 40 140 52L123 59L100 48Z"
    : cruiser
      ? "M91 35L109 34L123 55L101 62L91 52Z"
      : adventure
        ? "M99 31L116 30L127 53L103 59L95 44Z"
        : "M100 34L116 32L131 53L106 59L98 46Z";
  const arm = sport
    ? "M124 43L146 49L162 44"
    : cruiser
      ? "M115 41L136 39L157 35"
      : adventure
        ? "M119 39L136 43L153 41"
        : "M118 42L138 49L156 45";
  const tank = sport
    ? "M99 54L126 43L145 52L136 65H104Z"
    : cruiser
      ? "M85 56Q103 46 131 53L140 66H94Z"
      : adventure
        ? "M98 51L126 45L143 58L131 69H103Z"
        : "M99 53L126 46L144 56L130 67H103Z";
  const fairing = sport
    ? "M137 55Q150 45 166 50L181 60L171 72L137 71Z"
    : cruiser
      ? "M150 60L167 59L174 69L156 70Z"
      : adventure
        ? "M141 51L164 49L179 65L164 74H141Z"
        : "M138 58L156 55L167 67L146 74Z";

  return (
    <svg viewBox="0 0 220 100" role="presentation" focusable="false"
      xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={paint} x1="0" y1="0" x2=".65" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".46" />
          <stop offset=".22" stopColor={design.color} />
          <stop offset=".7" stopColor={design.color} />
          <stop offset="1" stopColor="#1d2330" />
        </linearGradient>
      </defs>
      <ellipse cx="111" cy="95" rx="97" ry="5" fill="#000" opacity=".42" />
      <Wheel x={41} y={77} radius={13} />
      <Wheel x={182} y={77} radius={13} />
      {/* Chassis, rear swingarm, chain and front fork. */}
      <path d="M41 77L89 57L115 75L41 77M89 57L120 46L158 61L115 75Z"
        fill="none" stroke="#9aabb9" strokeWidth="4" strokeLinejoin="round" />
      <path d="M145 48L182 77M151 45L187 76"
        stroke="#cbd5dd" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M42 77L102 79L122 74" stroke="#384554"
        strokeWidth="5" strokeLinecap="round" />
      <path d="M96 77H148L159 73" stroke="#171b22"
        strokeWidth="7" strokeLinecap="round" />
      <circle cx="112" cy="68" r="12" fill="#202b37"
        stroke="#738294" strokeWidth="2.6" />
      <circle cx="112" cy="68" r="4.4" fill="#b3bdc8" />
      {/* Distinctive rear section and painted fuel tank. */}
      <path d={cruiser ? "M59 61Q76 49 94 57L94 68L62 71Z" : "M65 57L83 51H101L104 66L69 69Z"}
        fill={"url(#" + paint + ")"} stroke={design.color} strokeWidth="2.6" />
      <path d="M81 48H103L114 54H86Z" fill="#171d26" stroke="#8794a5" strokeWidth="2" />
      <path d={tank} fill={"url(#" + paint + ")"} stroke={design.color}
        strokeWidth="2.6" strokeLinejoin="round" />
      <path d={fairing} fill={"url(#" + paint + ")"} stroke={design.color}
        strokeWidth="2.6" strokeLinejoin="round" />
      {adventure && (
        <>
          <path d="M154 48L161 26L170 26L169 52" fill="#809bb1"
            fillOpacity=".44" stroke="#a4c7d5" strokeWidth="2" />
          <rect x="57" y="48" width="22" height="19" rx="3"
            fill="#323b4c" stroke={design.color} strokeWidth="2" />
        </>
      )}
      {cruiser && (
        <path d="M151 47L156 31L173 31" fill="none"
          stroke="#d2dce5" strokeWidth="3.3" strokeLinecap="round" />
      )}
      {!cruiser && (
        <path d="M144 48L156 42L165 44" fill="none"
          stroke="#c0cbd7" strokeWidth="3" strokeLinecap="round" />
      )}
      <path d="M169 58L183 63L177 69L166 66Z"
        fill="#eff6e6" opacity=".9" />
      <path d="M64 57L57 62" stroke="#ff7580"
        strokeWidth="3.8" strokeLinecap="round" />
      {/* Rider: armored jacket, trousers, boots, gloves, full-face helmet. */}
      <path d={torso} fill="#252c38" stroke="#7d8c9b"
        strokeWidth="2.5" strokeLinejoin="round" />
      <path d={arm} fill="none" stroke="#253140"
        strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d={arm} fill="none" stroke="#8494a5"
        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={cruiser ? "M104 55L97 66L120 77" : "M106 54L99 68L120 78"}
        fill="none" stroke="#2a3543" strokeWidth="9"
        strokeLinecap="round" strokeLinejoin="round" />
      <path d="M117 77L130 82" fill="none" stroke="#8998a8"
        strokeWidth="7" strokeLinecap="round" />
      <path d="M121 82L137 83" fill="none" stroke="#151c25"
        strokeWidth="7" strokeLinecap="round" />
      <path d="M105 47L116 49" fill="none" stroke={design.color}
        strokeWidth="3" strokeLinecap="round" />
      <g transform={"translate(" + helmetX + " " + helmetY + ")"}>
        <path d="M-11 0Q-11-10 0-11Q11-12 13 0L10 7L-5 10L-10 6Z"
          fill="#2c394a" stroke="#b5c0cd" strokeWidth="2.6" />
        <path d="M-3-6Q6-7 12-1L10 3L0 4L-7 1Z"
          fill="#0b1420" stroke="#8eafc5" strokeWidth="1.8" />
        <path d="M-7 7L3 9" stroke={design.color}
          strokeWidth="2.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export const HeroBackdropCars = memo(function HeroBackdropCars({ visible }: { visible: boolean }) {
  return (
    <div className={"hero-background-cars" + (visible ? " hero-background-cars--visible" : "")}
      aria-hidden="true">
      {fleet.map((design, index) => (
        <span
          className={"hero-background-car hero-background-car--" + (index + 1) +
            (design.kind === "motorcycle" ? " hero-background-car--motorcycle" : "")}
          key={design.id}
          style={{ color: design.color }}
        >
          {design.kind === "car"
            ? <CarArtwork design={design} />
            : <BikeArtwork design={design} />}
        </span>
      ))}
    </div>
  );
});
