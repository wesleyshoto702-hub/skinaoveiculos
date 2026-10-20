/**
 * A purpose-built front view for the second half of the scroll film.
 * The top-down scene stays in place while this illustration is crossfaded in,
 * creating a camera-angle change without a heavy 3D renderer or video.
 */
export function FrontHeroCar() {
  return (
    <div className="hero-front-scene" aria-hidden="true">
      <div className="hero-front-environment">
        <span className="hero-front-horizon" />
        <span className="hero-front-road" />
        <span className="hero-front-reflection" />
      </div>
      <div className="hero-front-light-cones">
        <span className="hero-front-cone hero-front-cone--left" />
        <span className="hero-front-cone hero-front-cone--right" />
      </div>
      <div className="hero-front-car-body">
        <svg className="hero-front-car-svg" viewBox="0 0 1000 590" xmlns="http://www.w3.org/2000/svg" focusable="false" role="presentation">
          <defs>
            <linearGradient id="sk-front-body" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#59606d"/>
              <stop offset=".22" stopColor="#252b34"/>
              <stop offset=".48" stopColor="#0c0f16"/>
              <stop offset=".78" stopColor="#1b2028"/>
              <stop offset="1" stopColor="#07080c"/>
            </linearGradient>
            <linearGradient id="sk-front-hood" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#292e39"/>
              <stop offset=".56" stopColor="#10141b"/>
              <stop offset="1" stopColor="#424752"/>
            </linearGradient>
            <linearGradient id="sk-front-glass" x1="0" x2="1" y1="0" y2=".85">
              <stop offset="0" stopColor="#334654"/>
              <stop offset=".19" stopColor="#172630"/>
              <stop offset=".47" stopColor="#060b11"/>
              <stop offset=".76" stopColor="#1d3039"/>
              <stop offset="1" stopColor="#38424d"/>
            </linearGradient>
            <linearGradient id="sk-front-grill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#14191f"/>
              <stop offset="1" stopColor="#020306"/>
            </linearGradient>
            <linearGradient id="sk-front-bumper" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#414751"/>
              <stop offset=".28" stopColor="#181b23"/>
              <stop offset=".77" stopColor="#080a0f"/>
              <stop offset="1" stopColor="#353b45"/>
            </linearGradient>
            <linearGradient id="sk-front-headlight" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#f8feff"/>
              <stop offset=".35" stopColor="#d1edff"/>
              <stop offset=".78" stopColor="#fcfeff"/>
              <stop offset="1" stopColor="#83b7dc"/>
            </linearGradient>
            <linearGradient id="sk-front-red" x1="0" x2="1">
              <stop offset="0" stopColor="#3b0b13"/>
              <stop offset=".35" stopColor="#e72340"/>
              <stop offset=".64" stopColor="#fb354f"/>
              <stop offset="1" stopColor="#44080d"/>
            </linearGradient>
            <radialGradient id="sk-front-spot">
              <stop offset="0" stopColor="#ffffff" stopOpacity="1"/>
              <stop offset=".1" stopColor="#f1faff" stopOpacity=".9"/>
              <stop offset=".35" stopColor="#d0eaff" stopOpacity=".4"/>
              <stop offset="1" stopColor="#c3e5ff" stopOpacity="0"/>
            </radialGradient>
            <pattern id="sk-front-mesh" width="15" height="12" patternUnits="userSpaceOnUse">
              <path d="M0 0 8 6 0 12M15 0 7 6 15 12" stroke="#5c6670" strokeWidth="1.4" opacity=".37" fill="none"/>
            </pattern>
            <filter id="sk-front-shadow" x="-30%" y="-90%" width="160%" height="280%">
              <feGaussianBlur stdDeviation="21"/>
            </filter>
          </defs>
          {/* Low car stance and shadow */}
          <ellipse cx="500" cy="533" rx="420" ry="29" fill="#000" opacity=".94" filter="url(#sk-front-shadow)"/>
          <path d="M106 391h88v133H92v-64Z" fill="#040507" stroke="#383f46" strokeWidth="5"/>
          <path d="M807 391h89l13 69v64H806Z" fill="#040507" stroke="#383f46" strokeWidth="5"/>
          <g stroke="#34383f" strokeWidth="5" opacity=".8">
            <path d="M110 410v95M128 405v105M150 405v105M171 411v92M829 409v98M850 405v106M871 407v101M890 412v91"/>
          </g>
          {/* Roof and windscreen */}
          <path d="M238 295 290 150Q303 119 353 109 Q500 81 647 109 Q699 119 711 150L763 295Z" fill="#151a22" stroke="#707d89" strokeWidth="5"/>
          <path d="M303 282 340 160Q348 143 385 135Q503 116 615 135Q656 144 666 160L698 282Z" fill="url(#sk-front-glass)" stroke="#4d5d69" strokeWidth="4"/>
          <path d="M356 155 334 260" stroke="#e0f3ff" strokeOpacity=".25" strokeWidth="10" strokeLinecap="round"/>
          <path d="M639 152 661 253" stroke="#e0f3ff" strokeOpacity=".17" strokeWidth="8" strokeLinecap="round"/>
          <path d="M490 129 475 285" stroke="#6d7f8a" strokeOpacity=".22" strokeWidth="4"/>
          <path d="M280 191 227 198 199 246 231 260 264 251Z" fill="#121720" stroke="#66727c" strokeWidth="3"/>
          <path d="M720 191 773 198 801 246 769 260 736 251Z" fill="#121720" stroke="#66727c" strokeWidth="3"/>
          {/* Hood / fenders / body */}
          <path d="M237 270Q291 267 316 283Q499 303 681 283Q707 266 763 270L839 330Q878 343 894 394L913 458Q907 505 866 519H136Q94 507 87 458L105 394Q123 342 162 330Z" fill="url(#sk-front-body)" stroke="#4b545e" strokeWidth="6"/>
          <path d="M302 294Q498 315 696 294L797 348Q501 366 205 348Z" fill="url(#sk-front-hood)" stroke="#636c76" strokeWidth="3"/>
          <path d="M320 305 257 340M679 305l65 35" fill="none" stroke="#9ba4af" strokeOpacity=".36" strokeWidth="6"/>
          <path d="M251 343Q504 371 751 343" stroke="#d6e0e9" strokeOpacity=".19" strokeWidth="8" fill="none"/>
          <path d="M128 354Q155 326 211 331L354 375H172Z" fill="#070c14" stroke="#82909e" strokeWidth="3"/>
          <path d="M872 354Q845 326 789 331L646 375H828Z" fill="#070c14" stroke="#82909e" strokeWidth="3"/>
          {/* The light strips are visible even before ignition */}
          <path d="M151 350Q204 338 275 359L341 377L291 386 192 373Z" fill="#8fa4b7" opacity=".34"/>
          <path d="M849 350Q796 338 725 359L659 377L709 386 808 373Z" fill="#8fa4b7" opacity=".34"/>
          <g className="hero-front-lit-elements">
            <path d="M151 350Q215 340 279 362L333 377L292 379 202 359Z" fill="url(#sk-front-headlight)"/>
            <path d="M849 350Q785 340 721 362L667 377L708 379 798 359Z" fill="url(#sk-front-headlight)"/>
            <path d="M150 349Q227 336 316 372M850 349Q773 336 684 372" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round"/>
            <ellipse cx="215" cy="362" rx="130" ry="89" fill="url(#sk-front-spot)" opacity=".75"/>
            <ellipse cx="785" cy="362" rx="130" ry="89" fill="url(#sk-front-spot)" opacity=".75"/>
          </g>
          {/* Grill, splitter and bumper */}
          <path d="M342 385Q500 396 658 385L685 447Q501 481 316 447Z" fill="url(#sk-front-grill)" stroke="#68717b" strokeWidth="4"/>
          <path d="M342 393Q501 406 657 393L664 437Q499 463 336 437Z" fill="url(#sk-front-mesh)" opacity=".83"/>
          <path d="M486 381h28v9h-28z" fill="#e0e4e9" opacity=".55"/>
          <path d="M137 407h158l-30 61-136-8Z" fill="#06080c" stroke="#424c57" strokeWidth="3"/>
          <path d="M863 407H705l30 61 136-8Z" fill="#06080c" stroke="#424c57" strokeWidth="3"/>
          <path d="M152 441 238 455M848 441l-86 14" stroke="#c2263b" strokeWidth="5" opacity=".8"/>
          <path d="M109 472Q508 509 891 472L870 511Q500 545 130 511Z" fill="url(#sk-front-bumper)" stroke="#56616c" strokeWidth="3"/>
          <path d="M174 508Q500 533 826 508" stroke="url(#sk-front-red)" strokeWidth="8" fill="none" strokeLinecap="round"/>
          <path d="M340 480h320v23H340z" fill="#08090c" stroke="#4b525d" strokeWidth="2"/>
          <text x="500" y="497" textAnchor="middle" fill="#e8eaf0" fontSize="18" fontWeight="800" letterSpacing="5" fontFamily="Arial, sans-serif">SKINÃO</text>
          <path d="M92 459 103 472M908 459l-11 13" stroke="#ed243e" strokeWidth="6" strokeLinecap="round"/>
        </svg>
        <span className="hero-front-headlight-spot hero-front-headlight-spot--left" />
        <span className="hero-front-headlight-spot hero-front-headlight-spot--right" />
      </div>
    </div>
  );
}
