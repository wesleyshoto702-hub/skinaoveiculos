import { useEffect, useState } from "react";

interface LoadingScreenProps {
  sceneReady: boolean;
  onFinished: () => void;
}

const MIN_SHOW_MS = 2000;
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
    }, 70);
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
          <div className="sk-loader__car-track">
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
