import { useEffect, useState } from "react";
import { LoadingMotorcycle } from "./LoadingMotorcycle";

interface LoadingScreenProps {
  sceneReady: boolean;
  onFinished: () => void;
}

const MIN_SHOW_MS = 3000;
const MAX_WAIT_MS = 7000;
const EXIT_DURATION_MS = 850;

/** A lightweight SVG/CSS brand intro shown while the genuine 3D hero initializes. */
export function LoadingScreen({ sceneReady, onFinished }: LoadingScreenProps) {
  const [elapsed, setElapsed] = useState(0);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(media.matches);
    const started = performance.now();
    const interval = window.setInterval(() => {
      setElapsed(performance.now() - started);
    }, 140); // The progress rail animates in CSS; fewer React commits during 3D boot.
    return () => window.clearInterval(interval);
  }, []);

  // Run the exit exactly once, only when the scene is ready or the fallback
  // timeout has elapsed; retain a short branded intro for visual continuity.
  useEffect(() => {
    if (isLeaving) return;
    const minimum = isReducedMotion ? 200 : MIN_SHOW_MS;
    if (elapsed >= minimum && (sceneReady || elapsed >= MAX_WAIT_MS)) {
      setIsLeaving(true);
    }
  }, [elapsed, sceneReady, isLeaving, isReducedMotion]);

  useEffect(() => {
    if (!isLeaving) return;
    const id = window.setTimeout(onFinished, isReducedMotion ? 80 : EXIT_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [isLeaving, isReducedMotion, onFinished]);

  // The progress line does not falsely reach 100% before the real 3D scene
  // signals readiness. Its early portion is a gentle perceived-progress ramp.
  const canComplete = sceneReady || elapsed >= MAX_WAIT_MS;
  const earlyProgress = 9 + 82 * (1 - Math.exp(-elapsed / 1300));
  const percent = Math.round(isLeaving ? 100 : canComplete ? 100 : Math.min(91, earlyProgress));

  return (
    <div className={"sk-loader" + (isLeaving ? " sk-loader--leaving" : "")}
      role="status" aria-label="Preparando a experiência Skinão Veículos">
      <div className="sk-loader__grain" aria-hidden="true" />
      <div className="sk-loader__accent" aria-hidden="true" />

      <div className="sk-loader__content">
        <div className="sk-loader__brand-wrap">
          <div className="sk-loader__smoke" aria-hidden="true">
            <i className="sk-loader__smoke-puff sk-loader__smoke-puff--1" />
            <i className="sk-loader__smoke-puff sk-loader__smoke-puff--2" />
            <i className="sk-loader__smoke-puff sk-loader__smoke-puff--3" />
            <i className="sk-loader__smoke-puff sk-loader__smoke-puff--4" />
            <i className="sk-loader__smoke-puff sk-loader__smoke-puff--5" />
            <i className="sk-loader__smoke-puff sk-loader__smoke-puff--6" />
          </div>
          <div className="sk-loader__brand" aria-label="Skinão Veículos">
            <span className="sk-loader__brand-title">SKINÃO<span>.</span></span>
            <span className="sk-loader__brand-subtitle">V E Í C U L O S</span>
          </div>
          <p className="sk-loader__tagline">A ESTRADA COMEÇA AQUI</p>
        </div>

        <div className="sk-loader__road" aria-hidden="true">
          <div className="sk-loader__road-glow" />
          <div className="sk-loader__road-line sk-loader__road-line--first" />
          <div className="sk-loader__road-line sk-loader__road-line--second" />
          <div className="sk-loader__car-track sk-loader__car-track--original">
            <svg className="sk-loader__car" viewBox="0 0 640 255" xmlns="http://www.w3.org/2000/svg" focusable="false">
              <defs>
                <linearGradient id="sk-loader-body" x1="0" y1="0" x2=".2" y2="1">
                  <stop offset="0" stopColor="#808c98" />
                  <stop offset=".21" stopColor="#313c49" />
                  <stop offset=".57" stopColor="#151b25" />
                  <stop offset="1" stopColor="#080b11" />
                </linearGradient>
                <linearGradient id="sk-loader-window" x1="0" y1="0" x2=".7" y2="1">
                  <stop offset="0" stopColor="#668096" />
                  <stop offset=".4" stopColor="#22394b" />
                  <stop offset="1" stopColor="#0b1520" />
                </linearGradient>
                <linearGradient id="sk-loader-headlamp" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#b7e2ff" />
                  <stop offset="1" stopColor="#f9fdff" />
                </linearGradient>
                <radialGradient id="sk-loader-headlamp-glow">
                  <stop offset="0" stopColor="#effaff" stopOpacity=".85" />
                  <stop offset=".25" stopColor="#b5e4ff" stopOpacity=".5" />
                  <stop offset="1" stopColor="#9ed9ff" stopOpacity="0" />
                </radialGradient>
              </defs>

              <ellipse cx="322" cy="218" rx="257" ry="14" fill="#000" opacity=".56"/>
              <g className="sk-loader__car-body">
                {/* Single side-profile concept sedan, heading to the right. */}
                <path
                  d="M55 177Q56 153 83 148L136 140Q154 133 178 116L246 74
                     Q275 57 318 57H417Q456 57 478 76L527 130
                     579 143Q604 147 609 168L612 191Q612 207 593 209H572
                     Q564 174 533 172Q492 170 482 209H195Q187 170 150 169
                     Q108 168 101 209H75Q55 209 55 190Z"
                  fill="url(#sk-loader-body)" stroke="#8493a2" strokeWidth="4" strokeLinejoin="round"
                />
                <path d="M196 129L256 80Q276 68 317 68H410Q442 69 461 83L503 132Z"
                  fill="url(#sk-loader-window)" stroke="#607587" strokeWidth="3"/>
                <path d="M325 70L329 132M206 138L513 138" stroke="#8998a7" strokeWidth="3" opacity=".65"/>
                <path d="M249 81L216 123M435 81L478 123" fill="none" stroke="#d5e7f6" strokeWidth="5" opacity=".19"/>
                <path d="M73 159Q96 156 119 158" stroke="#f33f54" strokeWidth="8" strokeLinecap="round" />
                <path d="M571 155L600 161Q608 168 606 176H560Z"
                  fill="url(#sk-loader-headlamp)" />
                <ellipse cx="608" cy="171" rx="38" ry="27" fill="url(#sk-loader-headlamp-glow)" />
                <path d="M208 145Q346 151 520 145" stroke="#a5b3be" strokeWidth="3" opacity=".32"/>
                <path d="M239 186H476M92 186H112" stroke="#232d37" strokeWidth="3" />
                <path d="M554 197H590" stroke="#df2744" strokeWidth="4" strokeLinecap="round"/>
                <path d="M243 177H268" stroke="#495867" strokeWidth="3" strokeLinecap="round"/>
                <g className="sk-loader__wheel sk-loader__wheel--rear">
                  <circle cx="150" cy="200" r="36" fill="#05080c" stroke="#303a45" strokeWidth="8"/>
                  <circle cx="150" cy="200" r="24" fill="#8b9aa8" stroke="#1d2934" strokeWidth="5"/>
                  <circle cx="150" cy="200" r="17" fill="#202b36"/>
                  <path d="M150 183V217M133 200H167M138 188L162 212M162 188L138 212"
                    stroke="#9eadb9" strokeWidth="4"/>
                  <circle cx="150" cy="200" r="5" fill="#cdd8df"/>
                </g>
                <g className="sk-loader__wheel sk-loader__wheel--front">
                  <circle cx="532" cy="200" r="36" fill="#05080c" stroke="#303a45" strokeWidth="8"/>
                  <circle cx="532" cy="200" r="24" fill="#8b9aa8" stroke="#1d2934" strokeWidth="5"/>
                  <circle cx="532" cy="200" r="17" fill="#202b36"/>
                  <path d="M532 183V217M515 200H549M520 188L544 212M544 188L520 212"
                    stroke="#9eadb9" strokeWidth="4"/>
                  <circle cx="532" cy="200" r="5" fill="#cdd8df"/>
                </g>
              </g>
            </svg>
          </div>
          {/* Second pass: a red two-door sports coupe with a lower roof and long bonnet. */}
          <div className="sk-loader__car-track sk-loader__car-track--red">
            <svg className="sk-loader__car sk-loader__car--red" viewBox="0 0 640 255"
              xmlns="http://www.w3.org/2000/svg" focusable="false">
              <defs>
                <linearGradient id="sk-loader-coupe-paint" x1="0" y1="0" x2=".2" y2="1">
                  <stop offset="0" stopColor="#ffb0a8"/>
                  <stop offset=".17" stopColor="#fa4652"/>
                  <stop offset=".48" stopColor="#ba172b"/>
                  <stop offset="1" stopColor="#560a1b"/>
                </linearGradient>
                <linearGradient id="sk-loader-coupe-glass" x1="0" y1="0" x2=".65" y2="1">
                  <stop offset="0" stopColor="#94acb9"/>
                  <stop offset=".3" stopColor="#355061"/>
                  <stop offset="1" stopColor="#0c1622"/>
                </linearGradient>
                <linearGradient id="sk-loader-coupe-light" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#b7deff"/>
                  <stop offset="1" stopColor="#ffffff"/>
                </linearGradient>
                <radialGradient id="sk-loader-coupe-glow">
                  <stop offset="0" stopColor="#eefaff" stopOpacity=".8"/>
                  <stop offset=".4" stopColor="#b8e5ff" stopOpacity=".33"/>
                  <stop offset="1" stopColor="#a2d8ff" stopOpacity="0"/>
                </radialGradient>
              </defs>
              <ellipse cx="323" cy="222" rx="267" ry="12" fill="#000" opacity=".55"/>
              <g className="sk-loader__car-body">
                {/* Unique fastback coupe silhouette, noticeably different from the first sedan. */}
                <path d="M57 178Q63 159 88 154L126 148L187 143
                         Q201 141 220 117L258 90Q278 72 313 71
                         H383Q408 72 427 93L466 133
                         542 146L596 153Q617 157 622 177
                         L623 190Q623 204 604 208H568
                         Q557 169 524 169Q487 170 476 208H196
                         Q188 167 149 167Q109 167 99 208
                         H76Q58 208 57 191Z"
                  fill="url(#sk-loader-coupe-paint)" stroke="#ff8894"
                  strokeWidth="3.8" strokeLinejoin="round"/>
                {/* Short cabin, sharply raked windscreen and sloping fastback. */}
                <path d="M218 137L268 95Q285 81 312 81H381
                         Q397 82 411 97L451 136Z"
                  fill="url(#sk-loader-coupe-glass)" stroke="#d8838d" strokeWidth="3"/>
                <path d="M343 82L349 136" stroke="#d49197" strokeWidth="3.5" opacity=".65"/>
                <path d="M273 93L230 132M391 89L428 130"
                  stroke="#e5f2ff" strokeWidth="5" opacity=".16" fill="none"/>
                {/* Black aerodynamic skirt and discreet sporting side air intake. */}
                <path d="M208 188L473 188L459 201L208 201Z" fill="#280911" opacity=".74"/>
                <path d="M420 169Q460 168 479 175L462 184H413Z" fill="#470914" opacity=".75"/>
                <path d="M221 148Q338 151 474 146" fill="none" stroke="#ffd6d4"
                  strokeWidth="3.1" opacity=".32"/>
                <path d="M508 151Q552 149 588 156" fill="none" stroke="#ffb2ad"
                  strokeWidth="3.4" opacity=".46"/>
                <path d="M185 140H197" stroke="#ffb6b2" strokeWidth="4" strokeLinecap="round"/>
                {/* Tail spoiler and lights — this car has its own coupe styling. */}
                <path d="M89 145L151 142L160 147L92 152Z" fill="#5b101d" stroke="#ff5964" strokeWidth="2"/>
                <path d="M64 165L101 161" stroke="#ff5265" strokeWidth="8" strokeLinecap="round"/>
                <path d="M576 156L608 159L615 170L562 170Z"
                  fill="url(#sk-loader-coupe-light)"/>
                <ellipse cx="611" cy="169" rx="36" ry="22" fill="url(#sk-loader-coupe-glow)"/>
                <path d="M570 196H604" stroke="#fce5e6" strokeWidth="2.5" opacity=".34"/>

                <g className="sk-loader__wheel">
                  <circle cx="149" cy="199" r="36" fill="#05070b" stroke="#242c35" strokeWidth="8"/>
                  <circle cx="149" cy="199" r="23" fill="#d6dce3" stroke="#3d4753" strokeWidth="5"/>
                  <circle cx="149" cy="199" r="15" fill="#222b37"/>
                  <path d="M149 181V217M131 199H167M136 186L162 212M162 186L136 212"
                    stroke="#d3dce5" strokeWidth="4"/>
                  <circle cx="149" cy="199" r="5" fill="#e9edf1"/>
                </g>
                <g className="sk-loader__wheel">
                  <circle cx="524" cy="199" r="36" fill="#05070b" stroke="#242c35" strokeWidth="8"/>
                  <circle cx="524" cy="199" r="23" fill="#d6dce3" stroke="#3d4753" strokeWidth="5"/>
                  <circle cx="524" cy="199" r="15" fill="#222b37"/>
                  <path d="M524 181V217M506 199H542M511 186L537 212M537 186L511 212"
                    stroke="#d3dce5" strokeWidth="4"/>
                  <circle cx="524" cy="199" r="5" fill="#e9edf1"/>
                </g>
              </g>
            </svg>
          </div>
          {/* Third pass: fully geared rider on a red 2D motorcycle, near the intro's end. */}
          <LoadingMotorcycle />
        </div>

        <div className="sk-loader__progress">
          <div className="sk-loader__progress-meta">
            <span>PREPARANDO SUA EXPERIÊNCIA</span>
            <span className="sk-loader__percent" aria-hidden="true">{percent.toString().padStart(2, "0")}%</span>
          </div>
          <div className="sk-loader__progress-rail">
            <div className="sk-loader__progress-fill" style={{ width: percent + "%" }} />
          </div>
        </div>
      </div>
      <div className="sk-loader__bottom" aria-hidden="true">
        <span>SKINÃO VEÍCULOS</span><span>LAVRAS — MG</span>
      </div>
    </div>
  );
}
