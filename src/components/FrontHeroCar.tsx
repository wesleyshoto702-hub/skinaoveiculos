/**
 * Frontal bodywork mounted on the SAME 3D vehicle as the top-down drawing.
 *
 * The fascia is a perpendicular plane hinged to the nose of the top car.
 * Rotating the parent camera rig reveals it continuously (no separate car
 * scene, opacity swap, image transition or crossfade).
 */
export function FrontHeroCar() {
  return (
    <div className="hero-car-fascia" aria-hidden="true">
      <svg className="hero-front-car-svg" viewBox="0 0 800 740" xmlns="http://www.w3.org/2000/svg" role="presentation" focusable="false">
        <defs>
          <linearGradient id="skf-body" x1="0" x2=".12" y1="0" y2="1">
            <stop offset="0" stopColor="#414b57"/>
            <stop offset=".16" stopColor="#141b24"/>
            <stop offset=".39" stopColor="#252b36"/>
            <stop offset=".66" stopColor="#090e15"/>
            <stop offset=".86" stopColor="#363b47"/>
            <stop offset="1" stopColor="#07080d"/>
          </linearGradient>
          <linearGradient id="skf-hood" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#1f2732"/>
            <stop offset=".31" stopColor="#303a46"/>
            <stop offset=".55" stopColor="#11161f"/>
            <stop offset="1" stopColor="#0b1018"/>
          </linearGradient>
          <linearGradient id="skf-windshield" x1="0" x2="1" y1="0" y2=".55">
            <stop offset="0" stopColor="#647781"/>
            <stop offset=".13" stopColor="#1f3540"/>
            <stop offset=".48" stopColor="#070f18"/>
            <stop offset=".8" stopColor="#172d36"/>
            <stop offset="1" stopColor="#4b6070"/>
          </linearGradient>
          <linearGradient id="skf-side" x1="0" x2="1">
            <stop offset="0" stopColor="#0c1118"/>
            <stop offset=".5" stopColor="#363c48"/>
            <stop offset="1" stopColor="#090b12"/>
          </linearGradient>
          <linearGradient id="skf-lamp" x1="0" x2="1">
            <stop offset="0" stopColor="#b8ddf7"/>
            <stop offset=".25" stopColor="#ffffff"/>
            <stop offset=".67" stopColor="#d9f1ff"/>
            <stop offset="1" stopColor="#7fa8c7"/>
          </linearGradient>
          <radialGradient id="skf-halo">
            <stop offset="0" stopColor="#fff" stopOpacity=".98"/>
            <stop offset=".15" stopColor="#e8f6ff" stopOpacity=".72"/>
            <stop offset=".45" stopColor="#a7d6ff" stopOpacity=".28"/>
            <stop offset="1" stopColor="#b2deff" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="skf-grille" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#1d242e"/>
            <stop offset="1" stopColor="#010204"/>
          </linearGradient>
          <linearGradient id="skf-bumper" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#323a46"/>
            <stop offset=".45" stopColor="#0b0f17"/>
            <stop offset="1" stopColor="#1c242c"/>
          </linearGradient>
          <linearGradient id="skf-red" x1="0" x2="1">
            <stop offset="0" stopColor="#38050d"/>
            <stop offset=".16" stopColor="#f3334d"/>
            <stop offset=".5" stopColor="#c7102a"/>
            <stop offset=".84" stopColor="#fa384e"/>
            <stop offset="1" stopColor="#38050d"/>
          </linearGradient>
          <pattern id="skf-mesh" width="13" height="13" patternUnits="userSpaceOnUse">
            <path d="M0 0L7 6.5 0 13M13 0L6 6.5 13 13" stroke="#81909f" strokeOpacity=".35" strokeWidth="1.4" fill="none"/>
          </pattern>
        </defs>
        {/* Tires stand behind the body; their elliptical wheel wells preserve depth. */}
        <path d="M77 511q-14 6-16 33v127q7 29 28 29h77l-3-177Z" fill="#030407" stroke="#323842" strokeWidth="3"/>
        <path d="M723 511q14 6 16 33v127q-7 29-28 29h-77l3-177Z" fill="#030407" stroke="#323842" strokeWidth="3"/>
        <g stroke="#37434d" strokeWidth="3" opacity=".8">
          <path d="M84 560v111m14-126v130m18-130v134m21-132v125M716 560v111m-14-126v130m-18-130v134m-21-132v125"/>
        </g>
        {/* Roof: clearly above the long windscreen, never touching the hood. */}
        <path d="M213 296 240 135Q246 78 313 55 Q399 23 488 55Q557 80 562 135L588 296Z" fill="#10151d" stroke="#596774" strokeWidth="6"/>
        <path d="M258 130Q262 98 320 77Q397 49 481 77Q537 100 542 130" fill="none" stroke="#abb8c3" strokeOpacity=".56" strokeWidth="6"/>
        <path d="M227 264 276 123Q292 102 332 92Q400 75 468 92Q514 102 528 123L574 264Q402 288 227 264Z" fill="url(#skf-windshield)" stroke="#5b6b7a" strokeWidth="5"/>
        <path d="M297 111 260 243" stroke="#dcefff" strokeOpacity=".2" strokeWidth="12" strokeLinecap="round"/>
        <path d="M497 110 534 244" stroke="#bddcf1" strokeOpacity=".13" strokeWidth="8" strokeLinecap="round"/>
        <path d="M289 250Q400 268 510 250" stroke="#7f9baa" strokeOpacity=".3" strokeWidth="4" fill="none"/>
        {/* Side mirrors, hood shoulders and long body silhouette */}
        <path d="M224 245 167 254 132 307 166 329 217 310Z" fill="url(#skf-side)" stroke="#77838e" strokeWidth="4"/>
        <path d="M576 245 633 254 668 307 634 329 583 310Z" fill="url(#skf-side)" stroke="#77838e" strokeWidth="4"/>
        <path d="M194 288Q223 281 244 293Q400 322 556 293Q579 280 606 288L680 354Q705 379 717 426L745 568Q745 622 713 655L664 681H136L88 655Q55 617 55 568L84 426Q95 381 119 354Z" fill="url(#skf-body)" stroke="#67737f" strokeWidth="5"/>
        {/* Bonnet is intentionally tall: it slopes for 160px before the lamps. */}
        <path d="M207 308Q400 343 593 308L665 405Q400 440 136 405Z" fill="url(#skf-hood)" stroke="#555f6b" strokeWidth="3.5"/>
        <path d="M240 328Q402 356 557 328" stroke="#d2dde6" strokeOpacity=".18" strokeWidth="8" fill="none"/>
        <path d="M183 397 259 348M618 397l-78-49" stroke="#a4b5c2" strokeOpacity=".34" strokeWidth="6" fill="none"/>
        <path d="M159 419Q400 453 641 419" fill="none" stroke="#3b4651" strokeWidth="6"/>
        {/* Sculpted lamp pockets rather than overly horizontal light bars */}
        <path d="M106 451Q137 430 184 436L303 470 271 508 149 494 99 478Z" fill="#060c14" stroke="#788796" strokeWidth="3"/>
        <path d="M694 451Q663 430 616 436L497 470 529 508 651 494 701 478Z" fill="#060c14" stroke="#788796" strokeWidth="3"/>
        <path d="M117 457Q158 447 186 452L276 482 248 491 160 473Z" fill="#8ca7b9" opacity=".32"/>
        <path d="M683 457Q642 447 614 452L524 482 552 491 640 473Z" fill="#8ca7b9" opacity=".32"/>
        <g className="hero-front-lit-elements">
          <path d="M113 458Q152 448 186 456L270 483 248 487 162 470Z" fill="url(#skf-lamp)"/>
          <path d="M687 458Q648 448 614 456L530 483 552 487 638 470Z" fill="url(#skf-lamp)"/>
          <path d="M114 457Q151 446 188 454L265 479M686 457Q649 446 612 454L535 479" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round"/>
          <ellipse cx="179" cy="468" rx="92" ry="70" fill="url(#skf-halo)"/>
          <ellipse cx="621" cy="468" rx="92" ry="70" fill="url(#skf-halo)"/>
        </g>
        {/* Undercut grille keeps correct distance from the lamps. */}
        <path d="M290 479Q400 492 510 479L549 574Q397 598 251 574Z" fill="url(#skf-grille)" stroke="#535f6c" strokeWidth="4"/>
        <path d="M297 492Q398 508 502 492L527 562Q402 580 270 562Z" fill="url(#skf-mesh)"/>
        <path d="M386 484h28v8h-28z" fill="#7d8c99" opacity=".8"/>
        <path d="M116 522 227 522 205 590 104 573Z" fill="#070b10" stroke="#505d67" strokeWidth="3"/>
        <path d="M684 522 573 522 595 590 696 573Z" fill="#070b10" stroke="#505d67" strokeWidth="3"/>
        <path d="M127 558 191 566M673 558l-64 8" stroke="#d2243f" strokeWidth="5" opacity=".85"/>
        {/* Properly deep bumper and ground clearance */}
        <path d="M92 593Q399 630 708 593L713 634Q696 664 647 678H151Q103 662 87 634Z" fill="url(#skf-bumper)" stroke="#586571" strokeWidth="3"/>
        <path d="M121 641Q400 673 679 641" fill="none" stroke="#333d49" strokeWidth="8"/>
        <path d="M155 669Q398 688 645 669" fill="none" stroke="url(#skf-red)" strokeWidth="8" strokeLinecap="round"/>
        <path d="M302 595h196v33H302z" fill="#050608" stroke="#454e5a" strokeWidth="2"/>
        <text x="400" y="618" textAnchor="middle" fill="#e5e9ed" fontSize="21" fontWeight="800" letterSpacing="5" fontFamily="Arial, sans-serif">SKINÃO</text>
        <path d="M138 679h524" stroke="#0a0d12" strokeWidth="9" strokeLinecap="round"/>
      </svg>
      <span className="hero-front-light-cones" />
      <span className="hero-front-headlight-spot hero-front-headlight-spot--left" />
      <span className="hero-front-headlight-spot hero-front-headlight-spot--right" />
    </div>
  );
}
