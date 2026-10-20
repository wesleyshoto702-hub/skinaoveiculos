import { FrontHeroCar } from "./FrontHeroCar";

/**
 * One articulated CSS-3D vehicle rig. The top surface and the front fascia
 * share a hinge and one camera rotation, so they never crossfade as two cars.
 * The upward-running road conveys speed without aggressive car zoom.
 */
export function HeroCar() {
  return (
    <div className="hero-moving-car" aria-hidden="true">
      <span className="hero-car-floor-glow" />
      <div className="hero-car-top-shell">
      <svg className="hero-car-svg" viewBox="0 0 400 760" role="presentation" focusable="false" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="sk-body" x1="0" x2="1" y1="0" y2=".24">
            <stop offset="0" stopColor="#070a0d"/>
            <stop offset=".09" stopColor="#42454c"/>
            <stop offset=".18" stopColor="#1b2027"/>
            <stop offset=".42" stopColor="#07090e"/>
            <stop offset=".58" stopColor="#10141a"/>
            <stop offset=".84" stopColor="#343944"/>
            <stop offset="1" stopColor="#050609"/>
          </linearGradient>
          <linearGradient id="sk-hood" x1=".05" x2=".92" y1="0" y2=".2">
            <stop offset="0" stopColor="#0d1015"/>
            <stop offset=".22" stopColor="#20252c"/>
            <stop offset=".5" stopColor="#070a0e"/>
            <stop offset=".82" stopColor="#242a32"/>
            <stop offset="1" stopColor="#0b0d12"/>
          </linearGradient>
          <linearGradient id="sk-glass" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#4b5a64"/>
            <stop offset=".22" stopColor="#141e29"/>
            <stop offset=".68" stopColor="#06090e"/>
            <stop offset="1" stopColor="#344450"/>
          </linearGradient>
          <linearGradient id="sk-red-line" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#5b0b14" stopOpacity=".1"/>
            <stop offset=".5" stopColor="#ed233d" stopOpacity=".92"/>
            <stop offset="1" stopColor="#fb293e" stopOpacity=".18"/>
          </linearGradient>
          <linearGradient id="sk-beam" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#e6f8ff" stopOpacity=".95"/>
            <stop offset=".22" stopColor="#d8efff" stopOpacity=".36"/>
            <stop offset="1" stopColor="#e2f5ff" stopOpacity="0"/>
          </linearGradient>
          <radialGradient id="sk-halo">
            <stop offset="0" stopColor="#f3faff" stopOpacity=".95"/>
            <stop offset=".15" stopColor="#cceaff" stopOpacity=".5"/>
            <stop offset="1" stopColor="#a3c8ff" stopOpacity="0"/>
          </radialGradient>
          <filter id="sk-drop-shadow" x="-70%" y="-35%" width="240%" height="190%">
            <feGaussianBlur stdDeviation="20"/>
          </filter>
          <filter id="sk-headlight-blur" x="-120%" y="-110%" width="340%" height="360%">
            <feGaussianBlur stdDeviation="12"/>
          </filter>
        </defs>
        {/* Floor shadow and outer wheel tracks, beneath the moving body */}
        <path d="M112 96 Q198 48 289 96 L342 604 Q342 700 200 715 Q57 700 58 604Z" fill="#000" opacity=".87" filter="url(#sk-drop-shadow)"/>
        <g fill="#040507" stroke="#22272e" strokeWidth="2">
          <rect x="37" y="140" width="53" height="141" rx="23"/>
          <rect x="310" y="140" width="53" height="141" rx="23"/>
          <rect x="28" y="487" width="62" height="150" rx="25"/>
          <rect x="310" y="487" width="62" height="150" rx="25"/>
        </g>
        <g stroke="#313740" strokeWidth="2" opacity=".8">
          <path d="M42 162h40M41 179h41M41 198h42M40 219h43M41 241h42M42 261h40M315 162h40M315 179h42M315 198h42M315 219h43M315 241h42M315 261h40"/>
          <path d="M34 517h47M34 542h47M34 567h47M34 592h47M34 615h47M317 517h47M317 542h47M317 567h47M317 592h47M317 615h47"/>
        </g>
        {/* Mirrors and aerodynamic body */}
        <path d="M100 256 43 268 Q35 274 46 296 L97 313Z" fill="#1d222b" stroke="#58626c" strokeWidth="2"/>
        <path d="M300 256 358 268 Q365 274 354 296 L302 313Z" fill="#1d222b" stroke="#58626c" strokeWidth="2"/>
        <path d="M147 55 Q102 63 98 129 L86 237 77 335 81 573 Q83 665 121 687 Q199 709 279 687 Q317 665 319 573 L323 335 314 237 302 129 Q296 63 253 55 Q197 40 147 55Z" fill="url(#sk-body)" stroke="#6c7785" strokeWidth="2.6"/>
        <path d="M147 65 Q113 74 108 132 L99 302 95 577 Q101 647 124 676" fill="none" stroke="#a5b0b9" strokeWidth="3" opacity=".46"/>
        <path d="M253 65 Q287 74 292 132 L301 302 305 577 Q299 647 276 676" fill="none" stroke="#b3b8c0" strokeWidth="3" opacity=".46"/>
        <path d="M148 58 Q200 39 252 58" fill="none" stroke="#424c57" strokeWidth="6"/>
        {/* Rear deck and glowing rear lamps */}
        <path d="M127 96 Q196 70 273 96 L286 169 Q199 139 114 169Z" fill="#0d1117" stroke="#313b48" strokeWidth="2"/>
        <path d="M107 117 120 100 153 90 152 106 124 126Z" fill="#ef2941" opacity=".8"/>
        <path d="M293 117 280 100 247 90 248 106 276 126Z" fill="#ef2941" opacity=".8"/>
        <path d="M105 120 123 101" stroke="#ff5867" strokeWidth="5" opacity=".85"/>
        <path d="M295 120 277 101" stroke="#ff5867" strokeWidth="5" opacity=".85"/>
        {/* Glasshouse: rear glass, cabin, windscreen */}
        <path d="M130 170 Q199 142 269 170 L278 242 Q199 223 122 242Z" fill="url(#sk-glass)" stroke="#60717f" strokeWidth="2.4"/>
        <path d="M119 251 Q200 229 281 251 L290 437 Q200 460 111 437Z" fill="#0b1018" stroke="#39434f" strokeWidth="3"/>
        <path d="M138 266 Q200 254 264 266 L269 420 Q199 437 132 420Z" fill="#0b1119"/>
        <path d="M129 448 Q200 465 271 448 L284 512 Q203 529 116 512Z" fill="url(#sk-glass)" stroke="#6d808e" strokeWidth="2.5"/>
        <path d="M131 474 Q195 485 268 474" stroke="#cad7e0" strokeOpacity=".4" strokeWidth="3"/>
        <path d="M150 184 169 233 149 429" stroke="#b4c8d8" strokeWidth="7" strokeLinecap="round" opacity=".11"/>
        <path d="M254 180 244 241 255 424" stroke="#b4c8d8" strokeWidth="9" strokeLinecap="round" opacity=".07"/>
        <path d="M130 318 100 303M272 318l28-15" stroke="#747e8a" strokeWidth="3"/>
        {/* Hood: metallic bevels and red accents */}
        <path d="M111 526 Q200 537 289 526 L302 603 Q298 657 271 676 Q200 698 129 676 Q101 655 99 603Z" fill="url(#sk-hood)" stroke="#4a5662" strokeWidth="2.5"/>
        <path d="M124 541 145 638M276 541l-21 97" stroke="#697780" strokeOpacity=".5" strokeWidth="4"/>
        <path d="M167 556 Q200 550 233 556" stroke="#fff" strokeOpacity=".09" strokeWidth="9"/>
        <path d="M159 548 150 616" stroke="url(#sk-red-line)" strokeWidth="3"/>
        <path d="M241 548 250 616" stroke="url(#sk-red-line)" strokeWidth="3"/>
        <path d="M150 650 Q200 661 250 650" fill="none" stroke="#5c6672" strokeWidth="4"/>
        <path d="M143 672 Q200 681 258 672" fill="none" stroke="#06080b" strokeWidth="10" strokeLinecap="round"/>
        <path d="M169 680h62" stroke="#ab1729" strokeWidth="3" strokeLinecap="round"/>
        {/* Headlight housings are painted into the moving vehicle */}
        <path d="M103 622 160 645 155 664 106 655 Q99 646 103 622Z" fill="#070c13" stroke="#758797" strokeWidth="2"/>
        <path d="M297 622 240 645 245 664 294 655 Q301 646 297 622Z" fill="#070c13" stroke="#758797" strokeWidth="2"/>
        <g className="hero-vehicle-lights">
          <path d="M109 635 149 651" stroke="#e8f7ff" strokeWidth="9" strokeLinecap="round"/>
          <path d="M291 635 251 651" stroke="#e8f7ff" strokeWidth="9" strokeLinecap="round"/>
          <ellipse cx="129" cy="648" rx="65" ry="48" fill="url(#sk-halo)" filter="url(#sk-headlight-blur)"/>
          <ellipse cx="271" cy="648" rx="65" ry="48" fill="url(#sk-halo)" filter="url(#sk-headlight-blur)"/>
          <path d="M122 649 157 655 99 760 -15 760Z" fill="url(#sk-beam)" opacity=".6"/>
          <path d="M278 649 243 655 301 760 415 760Z" fill="url(#sk-beam)" opacity=".6"/>
        </g>
        <path d="M109 635 149 651M291 635 251 651" stroke="#a6b5c4" strokeWidth="3" opacity=".5" strokeLinecap="round"/>
        {/* Final subtle surface reflection */}
        <path d="M111 163Q103 209 102 250M290 166Q297 207 299 255" stroke="#f4f9ff" strokeWidth="3" opacity=".16" fill="none"/>
      </svg>
      </div>
      <FrontHeroCar />
      <span className="hero-car-speed-pulse" />
    </div>
  );
}
