/**
 * Lightweight side-view motorcycle and fully geared rider for the final beat
 * of the cinematic intro. Inline SVG: no external image, no extra requests.
 */
export function LoadingMotorcycle() {
  return (
    <div className="sk-loader__bike-track" aria-hidden="true">
      <svg className="sk-loader__bike" viewBox="0 0 360 200"
        xmlns="http://www.w3.org/2000/svg" focusable="false">
        <defs>
          <linearGradient id="sk-loader-bike-red" x1="0" y1="0" x2=".9" y2="1">
            <stop offset="0" stopColor="#ff8790" />
            <stop offset=".35" stopColor="#ee2c49" />
            <stop offset=".75" stopColor="#ae152e" />
            <stop offset="1" stopColor="#570a19" />
          </linearGradient>
          <linearGradient id="sk-loader-bike-helmet" x1="0" y1="0" x2=".9" y2="1">
            <stop offset="0" stopColor="#838e9e" />
            <stop offset=".48" stopColor="#303845" />
            <stop offset="1" stopColor="#10151d" />
          </linearGradient>
          <radialGradient id="sk-loader-bike-light">
            <stop offset="0" stopColor="#fcf8da" stopOpacity=".8" />
            <stop offset=".35" stopColor="#fff4c0" stopOpacity=".35" />
            <stop offset="1" stopColor="#fff4c0" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Road contact and two independent spinning wheels. */}
        <ellipse cx="179" cy="188" rx="150" ry="7" fill="#000" opacity=".48" />
        <g className="sk-loader__bike-wheel" style={{ transformOrigin: "75px 156px" }}>
          <circle cx="75" cy="156" r="32" fill="#090b10" stroke="#444b55" strokeWidth="6" />
          <circle cx="75" cy="156" r="21" fill="#131922" stroke="#b5bec7" strokeWidth="3" />
          <path d="M75 135V177M54 156H96M60 141L90 171M90 141L60 171"
            stroke="#b8c4ce" strokeWidth="2.8" />
          <circle cx="75" cy="156" r="7" fill="#707f90" stroke="#d0dae2" strokeWidth="2" />
        </g>
        <g className="sk-loader__bike-wheel" style={{ transformOrigin: "279px 156px" }}>
          <circle cx="279" cy="156" r="32" fill="#090b10" stroke="#444b55" strokeWidth="6" />
          <circle cx="279" cy="156" r="21" fill="#131922" stroke="#b5bec7" strokeWidth="3" />
          <path d="M279 135V177M258 156H300M264 141L294 171M294 141L264 171"
            stroke="#b8c4ce" strokeWidth="2.8" />
          <circle cx="279" cy="156" r="7" fill="#707f90" stroke="#d0dae2" strokeWidth="2" />
        </g>

        {/* Frame, swingarm, fork and clean black mechanical shapes. */}
        <path d="M75 156L139 128L176 151L75 156M139 128L168 105L229 113L176 151Z"
          fill="none" stroke="#9fa8b4" strokeWidth="6" strokeLinejoin="round" />
        <path d="M75 156L140 143L177 151M232 109L279 156M243 109L285 154"
          fill="none" stroke="#d0d7df" strokeWidth="5.5" strokeLinecap="round" />
        <path d="M109 119L84 149M113 122L95 152" stroke="#d82b46"
          strokeWidth="5" strokeLinecap="round" />
        <path d="M117 150L222 151Q241 152 250 144" stroke="#515b69"
          strokeWidth="8" strokeLinecap="round" />
        <path d="M134 157H218L228 150" fill="none" stroke="#151923"
          strokeWidth="11" strokeLinecap="round" />
        <path d="M145 128Q149 112 170 116H191Q210 118 211 141L198 153H162Z"
          fill="#171d26" stroke="#5b6572" strokeWidth="4" />
        <path d="M156 129H199M159 136H202M170 120V150M184 120V149"
          stroke="#788695" strokeWidth="3" opacity=".58" />
        <circle cx="179" cy="138" r="11" fill="#535f6d" stroke="#b7c2cb" strokeWidth="3" />
        <circle cx="179" cy="138" r="4" fill="#d3dce1" />

        {/* Sculpted red fuel tank, seat, rear cowl and front fairing. */}
        <path d="M109 108Q132 103 154 106L167 119H116L101 116Z"
          fill="#161a22" stroke="#7b8490" strokeWidth="3" />
        <path d="M104 115L73 120L64 128L117 127L136 118Z"
          fill="url(#sk-loader-bike-red)" stroke="#f17987" strokeWidth="2.4" />
        <path d="M153 110Q173 86 195 91L227 107L213 122L166 124L148 117Z"
          fill="url(#sk-loader-bike-red)" stroke="#ff9aa2" strokeWidth="3" />
        <path d="M171 101Q189 95 206 103" fill="none" stroke="#ffbdc0"
          strokeWidth="3" opacity=".66" />
        <path d="M222 103Q245 97 259 114L252 132L222 132L209 122Z"
          fill="url(#sk-loader-bike-red)" stroke="#f87587" strokeWidth="3" />
        <path d="M223 118L247 117L237 126H219Z" fill="#151921" opacity=".9" />
        <path d="M253 118L272 123L262 132L248 129Z" fill="#e2eaf0" />
        <ellipse cx="270" cy="125" rx="22" ry="16" fill="url(#sk-loader-bike-light)" />
        <path d="M252 136Q270 126 292 137" fill="none" stroke="#d72843"
          strokeWidth="5" strokeLinecap="round" />
        <path d="M133 151L149 163H213L226 151" fill="none" stroke="#262c34"
          strokeWidth="5" strokeLinecap="round" />
        <path d="M226 99L239 91L252 93" stroke="#b7c1cd" strokeWidth="5"
          strokeLinecap="round" fill="none" />

        {/* Rider in full-face helmet, closed jacket, armored pants, gloves and boots. */}
        <path d="M160 62L181 59Q197 63 202 76L194 107Q181 114 164 109L148 91Z"
          fill="#212831" stroke="#626f7f" strokeWidth="3.2" strokeLinejoin="round" />
        <path d="M158 67L179 65L189 73L172 94L150 86Z" fill="#c81e38" />
        <path d="M163 72L174 79L164 92" fill="none" stroke="#ff6478"
          strokeWidth="3.2" strokeLinecap="round" />
        <path d="M152 95L170 112L181 127L196 137L194 145L179 146L156 131L141 116Z"
          fill="#222a35" stroke="#687584" strokeWidth="3" strokeLinejoin="round" />
        <path d="M173 116L194 122L208 138L202 148L185 144L165 135"
          fill="#131923" stroke="#596778" strokeWidth="2.8" strokeLinejoin="round" />
        <path d="M179 143L195 147L200 158L181 160L167 153Z"
          fill="#131820" stroke="#919ba8" strokeWidth="3" />
        <path d="M201 145L216 149L222 158L202 161L193 156Z"
          fill="#151a22" stroke="#919ba8" strokeWidth="2.5" />
        <path d="M194 79Q205 82 215 96L231 100L233 110L225 113L207 108L188 94"
          fill="#202832" stroke="#8290a0" strokeWidth="3.5"
          strokeLinejoin="round" strokeLinecap="round" />
        <path d="M226 99L239 100L242 109L235 114L227 111Z"
          fill="#101720" stroke="#8494a4" strokeWidth="2.2" />
        <path d="M176 28Q189 25 198 35Q207 48 200 59L190 69L171 65L157 53Q154 37 165 30Z"
          fill="url(#sk-loader-bike-helmet)" stroke="#b0bbc9" strokeWidth="3" />
        <path d="M181 36Q195 32 202 43L201 52L184 55L172 47Z"
          fill="#0a1320" stroke="#a4c0d1" strokeWidth="2.2" />
        <path d="M184 38Q195 36 199 42" fill="none" stroke="#7da2b9"
          strokeWidth="2" opacity=".76" />
        <path d="M162 49L168 63L188 69" fill="none" stroke="#c92642" strokeWidth="3" />
      </svg>
    </div>
  );
}
