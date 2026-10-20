import { memo } from "react";

// Vector silhouettes are intentionally illustrative, not photos of actual
// inventory. No raster downloads, Three.js objects or per-frame JS updates.
const silhouettes = [
  { id: "sedan", body: "M10 61 L22 51 L51 47 L70 30 L130 30 L153 47 L189 52 L205 61 V72 H10 Z", windows: "M74 35 H126 L143 47 H58 Z", front: 55, back: 172 },
  { id: "hatch", body: "M10 60 L25 52 L49 48 L68 25 H128 L161 49 L195 55 L205 62 V72 H10 Z", windows: "M71 31 H123 L149 48 H55 Z", front: 53, back: 173 },
  { id: "suv", body: "M9 58 L22 47 H44 L56 23 H155 L170 47 H194 L207 58 V72 H9 Z", windows: "M58 29 H98 V47 H49 Z M104 29 H151 L162 47 H104 Z", front: 54, back: 174 },
  { id: "pickup", body: "M9 59 L26 49 H47 L63 29 H117 L138 49 H199 L209 61 V72 H9 Z", windows: "M66 35 H112 L129 49 H54 Z", front: 53, back: 179 },
  { id: "coupe", body: "M10 62 L26 53 L57 47 L88 30 H141 L165 46 L196 55 L207 62 V72 H10 Z", windows: "M91 36 H137 L155 47 H73 Z", front: 52, back: 174 },
  { id: "van", body: "M10 58 L20 32 Q22 23 34 23 H165 L193 43 L206 59 V72 H10 Z", windows: "M32 31 H100 V48 H25 Z M106 31 H160 L180 48 H106 Z", front: 50, back: 175 },
  { id: "wagon", body: "M9 60 L26 49 H46 L58 28 H152 L174 49 H196 L208 60 V72 H9 Z", windows: "M61 34 H109 V49 H50 Z M114 34 H149 L165 49 H114 Z", front: 55, back: 176 },
  // Five additional body styles: keep the fleet varied in the central space.
  { id: "roadster", body: "M8 62 L30 54 L65 48 L91 36 H139 L157 47 L195 55 L211 62 V72 H8 Z", windows: "M92 39 H133 L149 48 H73 Z", front: 50, back: 177 },
  { id: "crossover", body: "M9 60 L21 50 L43 47 L65 26 H144 L170 46 L202 57 V72 H9 Z", windows: "M69 33 H106 V47 H55 Z M112 33 H140 L158 47 H112 Z", front: 53, back: 179 },
  { id: "supercar", body: "M8 65 L35 56 L84 49 L108 37 H143 L160 48 L195 58 L210 65 V72 H8 Z", windows: "M110 41 H140 L152 49 H92 Z", front: 47, back: 181 },
  { id: "utility", body: "M9 59 L26 47 H58 L71 30 H122 L140 49 H204 L211 60 V72 H9 Z", windows: "M75 35 H116 L129 48 H64 Z", front: 54, back: 182 },
  { id: "premium-sedan", body: "M9 60 L23 51 L50 47 L73 27 H143 L167 47 L198 55 L209 61 V72 H9 Z", windows: "M77 33 H109 V47 H63 Z M115 33 H139 L154 47 H115 Z", front: 51, back: 176 },
] as const;

export const HeroBackdropCars = memo(function HeroBackdropCars({ visible }: { visible: boolean }) {
  return (
    <div className={"hero-background-cars" + (visible ? " hero-background-cars--visible" : "")} aria-hidden="true">
      {silhouettes.map((car, index) => (
        <span className={"hero-background-car hero-background-car--" + (index + 1)} key={car.id}>
          <svg viewBox="0 0 220 90" role="presentation" focusable="false" xmlns="http://www.w3.org/2000/svg">
            <path d={car.body} fill="currentColor" fillOpacity=".17" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round"/>
            <path d={car.windows} fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" opacity=".75"/>
            <path d="M15 61 H202" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".42"/>
            <circle cx={car.front} cy="69" r="12" fill="#101115" stroke="currentColor" strokeWidth="3.1"/>
            <circle cx={car.back} cy="69" r="12" fill="#101115" stroke="currentColor" strokeWidth="3.1"/>
            <circle cx={car.front} cy="69" r="5.4" fill="none" stroke="currentColor" strokeWidth="1.4" opacity=".65"/>
            <circle cx={car.back} cy="69" r="5.4" fill="none" stroke="currentColor" strokeWidth="1.4" opacity=".65"/>
          </svg>
        </span>
      ))}
    </div>
  );
});
