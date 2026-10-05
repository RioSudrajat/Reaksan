export function LandingLabIllustration({ className = "w-full max-w-[560px] h-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Ilustrasi Laboratorium Kimia Terpadu Reaksan Unpad"
      role="img"
    >
      <defs>
        {/* Soft atmospheric gradient */}
        <radialGradient id="chem-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FEF1CC" stopOpacity="0.8" />
          <stop offset="60%" stopColor="#FEF7E6" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FAF7F2" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="glass-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
          <stop offset="40%" stopColor="#EAF3FA" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#D2E6F5" stopOpacity="0.6" />
        </linearGradient>

        <linearGradient id="liquid-blue" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#73A5E8" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#3B74C4" stopOpacity="0.95" />
        </linearGradient>

        <linearGradient id="liquid-amber" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FBD47A" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#F9B129" stopOpacity="0.95" />
        </linearGradient>

        <linearGradient id="liquid-purple" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#D7A9E3" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#9B59B6" stopOpacity="0.95" />
        </linearGradient>

        <linearGradient id="liquid-emerald" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5CD88F" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#048444" stopOpacity="0.95" />
        </linearGradient>

        <linearGradient id="screen-grad-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FAF7F0" />
        </linearGradient>

        <filter id="chem-shadow" x="-8%" y="-8%" width="120%" height="120%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#212121" floodOpacity="0.08" />
        </filter>
        <filter id="bench-shadow" x="-5%" y="-5%" width="110%" height="110%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#212121" floodOpacity="0.1" />
        </filter>
      </defs>

      {/* Background Soft Chemistry Aura */}
      <circle cx="340" cy="250" r="220" fill="url(#chem-glow)" />

      {/* Floating Organic Molecular Formula Badges */}
      {/* Molecule 1: Benzene Ring Hexagon */}
      <g opacity="0.65" transform="translate(100, 70)">
        <polygon
          points="30,0 60,17 60,52 30,70 0,52 0,17"
          fill="none"
          stroke="#F9B129"
          strokeWidth="2.5"
        />
        <circle cx="30" cy="35" r="16" fill="none" stroke="#F9B129" strokeWidth="1.5" strokeDasharray="5 3" />
        <line x1="60" y1="17" x2="80" y2="6" stroke="#AE7C1D" strokeWidth="2" />
        <text x="83" y="10" fontSize="10" fontWeight="bold" fill="#8D6500" fontFamily="Inter, sans-serif">OH</text>
      </g>

      {/* Molecule 2: Ethanol Functional Group (C2H5OH) */}
      <g opacity="0.5" transform="translate(480, 50)">
        <circle cx="10" cy="20" r="5" fill="#212121" />
        <line x1="10" y1="20" x2="35" y2="10" stroke="#B7B7B7" strokeWidth="2.5" />
        <circle cx="35" cy="10" r="5" fill="#212121" />
        <line x1="35" y1="10" x2="60" y2="25" stroke="#B7B7B7" strokeWidth="2.5" />
        <circle cx="60" cy="25" r="6" fill="#F45959" />
        <line x1="60" y1="25" x2="78" y2="18" stroke="#B7B7B7" strokeWidth="2" />
        <circle cx="78" cy="18" r="4" fill="#6E8EDA" />
      </g>

      {/* Floating Analytical Status Metric: UV-Vis Absorbance */}
      <g filter="url(#chem-shadow)">
        <rect x="70" y="115" width="135" height="58" rx="10" fill="#FFFFFF" stroke="#E1E1E1" strokeWidth="1.5" />
        <rect x="78" y="123" width="22" height="22" rx="6" fill="#FEF1CC" />
        <path d="M84 134 L88 128 L94 139" stroke="#AE7C1D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <text x="106" y="133" fontSize="10" fontWeight="bold" fill="#212121" fontFamily="Inter, sans-serif">UV-Vis Spec</text>
        <text x="106" y="145" fontSize="8" fontWeight="medium" fill="#048444" fontFamily="Inter, sans-serif">✓ λmax = 520 nm</text>
        <text x="78" y="163" fontSize="7.5" fill="#6B6B6B" fontFamily="Inter, sans-serif">Kalibrasi: Siap Pakai</text>
      </g>

      {/* Floating Lab Safety & GHS Symbol Card */}
      <g filter="url(#chem-shadow)">
        <rect x="475" y="125" width="125" height="54" rx="10" fill="#FFFFFF" stroke="#E1E1E1" strokeWidth="1.5" />
        {/* Diamond hazard */}
        <polygon points="496,134 507,145 496,156 485,145" fill="#FFFFFF" stroke="#F45959" strokeWidth="2" />
        <path d="M493 147 L499 141 M496 141 L496 150" stroke="#F45959" strokeWidth="1.5" strokeLinecap="round" />
        <text x="515" y="143" fontSize="9.5" fontWeight="bold" fill="#212121" fontFamily="Inter, sans-serif">Lab Organik</text>
        <text x="515" y="155" fontSize="8" fill="#6B6B6B" fontFamily="Inter, sans-serif">Standar K3 FMIPA</text>
      </g>

      {/* Heavy Chemical Laboratory Workstation Bench */}
      <g filter="url(#bench-shadow)">
        {/* Main Bench Top (Epoxy chemical-resistant gray top) */}
        <path d="M60 340 L580 340 L565 355 L75 355 Z" fill="#D8DEE4" />
        <rect x="70" y="332" width="500" height="10" rx="3" fill="#E8EDF2" stroke="#CBD5E1" strokeWidth="1" />
        {/* Bench Frame / Cabinets */}
        <rect x="85" y="350" width="470" height="95" rx="4" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5" />
        {/* Cabinet Door Dividers */}
        <line x1="220" y1="350" x2="220" y2="445" stroke="#E2E8F0" strokeWidth="1.5" />
        <line x1="380" y1="350" x2="380" y2="445" stroke="#E2E8F0" strokeWidth="1.5" />
        {/* Cabinet handles */}
        <rect x="145" y="380" width="30" height="4" rx="2" fill="#B0BEC5" />
        <rect x="290" y="380" width="30" height="4" rx="2" fill="#B0BEC5" />
        <rect x="440" y="380" width="30" height="4" rx="2" fill="#B0BEC5" />
        {/* Gas / Vacuum service fixtures behind bench */}
        <circle cx="210" cy="326" r="4" fill="#F9B129" />
        <circle cx="222" cy="326" r="4" fill="#6E8EDA" />
      </g>

      {/* APPARATUS 1 (LEFT): Burette on Metal Stand for Titration */}
      <g>
        {/* Cast iron stand base */}
        <rect x="100" y="325" width="60" height="8" rx="2" fill="#475569" />
        {/* Vertical steel rod */}
        <rect x="127" y="165" width="4" height="162" fill="#64748B" />
        {/* Clamp holder */}
        <rect x="122" y="210" width="22" height="7" rx="1.5" fill="#334155" />
        <rect x="122" y="255" width="22" height="7" rx="1.5" fill="#334155" />
        {/* Glass Burette Tube */}
        <rect x="138" y="170" width="8" height="130" rx="3" fill="url(#glass-grad)" stroke="#94A3B8" strokeWidth="1" />
        {/* Burette graduation marks */}
        <line x1="140" y1="185" x2="144" y2="185" stroke="#475569" strokeWidth="1" />
        <line x1="140" y1="195" x2="145" y2="195" stroke="#475569" strokeWidth="1" />
        <line x1="140" y1="205" x2="144" y2="205" stroke="#475569" strokeWidth="1" />
        <line x1="140" y1="215" x2="145" y2="215" stroke="#475569" strokeWidth="1" />
        <line x1="140" y1="225" x2="144" y2="225" stroke="#475569" strokeWidth="1" />
        <line x1="140" y1="235" x2="145" y2="235" stroke="#475569" strokeWidth="1" />
        <line x1="140" y1="245" x2="144" y2="245" stroke="#475569" strokeWidth="1" />
        {/* Liquid in Burette (Amber Titrant) */}
        <rect x="139" y="200" width="6" height="98" fill="url(#liquid-amber)" opacity="0.85" />
        {/* Stopcock valve */}
        <polygon points="135,299 149,299 142,305" fill="#212121" />
        <rect x="132" y="300" width="20" height="3.5" rx="1" fill="#F9B129" />
        {/* Droplet falling */}
        <ellipse cx="142" cy="314" rx="1.5" ry="2.5" fill="#F9B129" />

        {/* Erlenmeyer Flask collecting titrant */}
        <path
          d="M136 308 L148 308 L158 333 L126 333 Z"
          fill="url(#glass-grad)"
          stroke="#94A3B8"
          strokeWidth="1.2"
        />
        {/* Titration liquid in Erlenmeyer (Reacting pink/purple indicator) */}
        <path
          d="M130 324 Q142 322 154 324 L157 332 L127 332 Z"
          fill="url(#liquid-purple)"
          opacity="0.85"
        />
      </g>

      {/* APPARATUS 2: Magnetic Stirrer / Hotplate with Beaker */}
      <g filter="url(#chem-shadow)">
        {/* Hotplate unit */}
        <rect x="180" y="310" width="70" height="23" rx="4" fill="#334155" stroke="#1E293B" strokeWidth="1" />
        {/* Ceramic heating surface */}
        <rect x="186" y="306" width="58" height="5" rx="1.5" fill="#F8FAFC" />
        {/* Digital display */}
        <rect x="187" y="316" width="26" height="11" rx="2" fill="#0F172A" />
        <text x="190" y="324" fontSize="6.5" fontWeight="bold" fill="#F9B129" fontFamily="monospace">75°C</text>
        {/* Control knobs */}
        <circle cx="225" cy="321" r="4" fill="#64748B" />
        <circle cx="238" cy="321" r="4" fill="#64748B" />

        {/* Glass Beaker on Hotplate */}
        <rect x="195" y="260" width="40" height="46" rx="2" fill="url(#glass-grad)" stroke="#94A3B8" strokeWidth="1.2" />
        <path d="M193 260 L237 260" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
        <path d="M192 260 L195 264" stroke="#94A3B8" strokeWidth="1.2" />
        {/* Beaker spout & graduation */}
        <line x1="200" y1="272" x2="206" y2="272" stroke="#64748B" strokeWidth="1" />
        <line x1="200" y1="282" x2="208" y2="282" stroke="#64748B" strokeWidth="1" />
        <line x1="200" y1="292" x2="206" y2="292" stroke="#64748B" strokeWidth="1" />
        {/* Blue Copper(II) Sulfate solution reacting */}
        <path
          d="M196 280 Q215 275 234 280 L234 305 L196 305 Z"
          fill="url(#liquid-blue)"
        />
        {/* Magnetic stir bar in beaker */}
        <rect x="210" y="299" width="10" height="3" rx="1.5" fill="#FFFFFF" />
        {/* Stir vortex line & bubbles */}
        <path d="M215 277 Q212 288 215 298" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="2 2" fill="none" opacity="0.8" />
        <circle cx="205" cy="289" r="1.5" fill="#FFFFFF" opacity="0.7" />
        <circle cx="223" cy="285" r="1.8" fill="#FFFFFF" opacity="0.7" />
      </g>

      {/* APPARATUS 3: Test Tube Rack with Multi-Colored Reagents */}
      <g filter="url(#chem-shadow)">
        {/* Wooden / Acrylic Rack */}
        <rect x="265" y="302" width="75" height="30" rx="3" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1" />
        <line x1="265" y1="316" x2="340" y2="316" stroke="#E2E8F0" strokeWidth="1.5" />

        {/* Tube 1: Amber Solution */}
        <rect x="274" y="270" width="8" height="52" rx="4" fill="url(#glass-grad)" stroke="#94A3B8" strokeWidth="1" />
        <rect x="275" y="285" width="6" height="35" rx="3" fill="url(#liquid-amber)" />

        {/* Tube 2: Emerald Green Solution */}
        <rect x="289" y="265" width="8" height="57" rx="4" fill="url(#glass-grad)" stroke="#94A3B8" strokeWidth="1" />
        <rect x="290" y="280" width="6" height="40" rx="3" fill="url(#liquid-emerald)" />

        {/* Tube 3: Azure Blue Solution */}
        <rect x="304" y="272" width="8" height="50" rx="4" fill="url(#glass-grad)" stroke="#94A3B8" strokeWidth="1" />
        <rect x="305" y="290" width="6" height="30" rx="3" fill="url(#liquid-blue)" />

        {/* Tube 4: Violet Permanganate Solution */}
        <rect x="319" y="268" width="8" height="54" rx="4" fill="url(#glass-grad)" stroke="#94A3B8" strokeWidth="1" />
        <rect x="320" y="282" width="6" height="38" rx="3" fill="url(#liquid-purple)" />
      </g>

      {/* APPARATUS 4: Computer Monitor with Analytical Chemistry Software */}
      <g filter="url(#chem-shadow)">
        {/* Monitor Stand */}
        <rect x="400" y="315" width="30" height="20" rx="2" fill="#94A3B8" />
        <rect x="385" y="331" width="60" height="4" rx="2" fill="#64748B" />

        {/* Monitor Screen Bezel */}
        <rect x="345" y="180" width="145" height="138" rx="10" fill="#212121" stroke="#334155" strokeWidth="3" />
        {/* Screen Display Area */}
        <rect x="350" y="185" width="135" height="128" rx="6" fill="url(#screen-grad-gold)" />

        {/* Software Top App Bar */}
        <rect x="350" y="185" width="135" height="16" rx="4" fill="#212121" />
        <circle cx="358" cy="193" r="2.5" fill="#F45959" />
        <circle cx="365" cy="193" r="2.5" fill="#F9B129" />
        <circle cx="372" cy="193" r="2.5" fill="#048444" />
        <text x="380" y="196" fontSize="7" fontWeight="bold" fill="#FEF1CC" fontFamily="Inter, sans-serif">REAKSAN UNPAD LAB SUITE</text>

        {/* Analytical Spectrum Chart Area */}
        <rect x="355" y="206" width="125" height="74" rx="4" fill="#FFFFFF" stroke="#E1E1E1" strokeWidth="1" />
        {/* Grid lines */}
        <line x1="355" y1="225" x2="480" y2="225" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="355" y1="245" x2="480" y2="245" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="355" y1="265" x2="480" y2="265" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />

        {/* HPLC / Spectrophotometer Absorption Peak Curves */}
        {/* Baseline & Peak 1 (Solvent) */}
        <path
          d="M360 270 Q375 268 382 250 T390 270"
          fill="none"
          stroke="#6E8EDA"
          strokeWidth="1.5"
        />
        {/* Main Product High-Resolution Peak (Target Compound) */}
        <path
          d="M390 270 Q405 270 415 218 Q422 215 428 270 L475 270"
          fill="none"
          stroke="#F9B129"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Area under curve fill */}
        <path
          d="M400 270 Q408 270 415 218 Q422 215 428 270 Z"
          fill="#F9B129"
          opacity="0.2"
        />
        {/* Peak label badge */}
        <rect x="410" y="208" width="46" height="11" rx="2" fill="#212121" />
        <text x="413" y="216" fontSize="6" fontWeight="bold" fill="#F9B129" fontFamily="Inter, sans-serif">Peak Area: 98.4%</text>

        {/* Chemical Molecular Structure inside software bottom panel */}
        <rect x="355" y="284" width="125" height="24" rx="3" fill="#FEF1CC" stroke="#FDE68A" strokeWidth="1" />
        <text x="360" y="295" fontSize="7" fontWeight="bold" fill="#8D6500" fontFamily="Inter, sans-serif">Sintesis Katalis Organik</text>
        <text x="360" y="303" fontSize="6" fill="#212121" fontFamily="monospace">C14H12O2 + H2SO4 → Purity Grade A</text>
      </g>

      {/* CHEMIST / STUDENT RESEARCHER (White Lab Coat, Safety Goggles, Blue Nitrile Gloves) */}
      <g>
        {/* Stool / Ergonomic Lab Chair */}
        <ellipse cx="505" cy="390" rx="36" ry="12" fill="#212121" />
        <path d="M490 395 L475 460 M520 395 L535 460 M505 400 L505 460" stroke="#64748B" strokeWidth="4" strokeLinecap="round" />

        {/* Trousers / Legs */}
        <path d="M485 385 C480 410 480 435 485 455 C490 460 500 460 505 450 C505 435 508 405 508 385 Z" fill="#1E293B" />
        <path d="M515 385 C515 405 518 435 522 450 C527 460 537 460 540 455 C542 435 540 410 535 385 Z" fill="#0F172A" />
        {/* Lab Safety Shoes */}
        <ellipse cx="493" cy="458" rx="12" ry="6" fill="#121826" />
        <ellipse cx="533" cy="458" rx="12" ry="6" fill="#121826" />

        {/* White Laboratory Coat (Jas Laboratorium) */}
        <path
          d="M480 270 C470 295 470 365 475 390 L545 390 C550 365 550 295 540 270 Z"
          fill="#FFFFFF"
          stroke="#CBD5E1"
          strokeWidth="1.5"
        />
        {/* Lab coat seams and pocket */}
        <line x1="510" y1="270" x2="510" y2="390" stroke="#E2E8F0" strokeWidth="1.5" />
        <rect x="485" y="320" width="16" height="20" rx="2" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
        {/* Pen in pocket */}
        <line x1="492" y1="315" x2="492" y2="323" stroke="#F9B129" strokeWidth="2" strokeLinecap="round" />

        {/* Right Arm in Lab Coat Reaching to Glassware / Keyboard */}
        <path
          d="M475 285 C460 300 445 315 425 320"
          stroke="#FFFFFF"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path
          d="M475 285 C460 300 445 315 425 320"
          stroke="#CBD5E1"
          strokeWidth="1"
          fill="none"
        />
        {/* Blue Nitrile Glove Hand */}
        <ellipse cx="420" cy="320" rx="7" ry="8" fill="#38BDF8" />

        {/* Head & Hair */}
        <circle cx="510" cy="242" r="18" fill="#F8B195" />
        {/* Neat Hair Tied Up for Lab Safety */}
        <path
          d="M495 238 C495 218 528 218 528 238 C520 228 502 228 495 238 Z"
          fill="#1E293B"
        />
        {/* Safety Goggles (Kacamata Pelindung Lab) */}
        <rect x="495" y="235" width="30" height="12" rx="4" fill="#E0F2FE" fillOpacity="0.8" stroke="#0284C7" strokeWidth="1.5" />
        <line x1="492" y1="240" x2="495" y2="240" stroke="#0284C7" strokeWidth="1.5" />
        <line x1="525" y1="240" x2="528" y2="240" stroke="#0284C7" strokeWidth="1.5" />
        <line x1="500" y1="237" x2="506" y2="243" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
      </g>

      {/* APPARATUS 5 (FOREGROUND RIGHT): Chemical Reagent Amber Bottle & Wash Bottle */}
      <g filter="url(#chem-shadow)">
        {/* Brown / Amber Reagent Bottle (e.g. H2SO4) */}
        <rect x="555" y="295" width="26" height="38" rx="4" fill="#B45309" stroke="#78350F" strokeWidth="1" />
        <rect x="562" y="287" width="12" height="9" rx="1.5" fill="#78350F" />
        {/* White label */}
        <rect x="557" y="305" width="22" height="18" rx="2" fill="#FFFFFF" />
        <text x="560" y="314" fontSize="5.5" fontWeight="bold" fill="#78350F" fontFamily="Inter, sans-serif">H₂SO₄</text>
        <text x="560" y="320" fontSize="4.5" fill="#B91C1C" fontFamily="Inter, sans-serif">98% P.A.</text>

        {/* Wash Bottle (Aquadest) with curved straw */}
        <rect x="590" y="290" width="22" height="43" rx="5" fill="#F0F9FF" stroke="#BAE6FD" strokeWidth="1.2" opacity="0.9" />
        <path d="M597 290 L605 290 L601 278" stroke="#0284C7" strokeWidth="2" fill="none" />
        <path d="M601 278 Q600 270 592 272" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}
