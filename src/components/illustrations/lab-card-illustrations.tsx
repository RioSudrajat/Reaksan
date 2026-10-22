export type LabCode =
  | "lab-organik"
  | "lab-anorganik"
  | "lab-biokimia"
  | "lab-analitik"
  | "lab-fisik";

interface LabIllustrationProps {
  className?: string;
  idPrefix?: string;
}

// 1. LAB KIMIA ORGANIK: Rotary Evaporator, Benzene Ring, Amber Bottle & Hotplate Stirrer
export function LabOrganikIllustration({
  className = "w-full h-auto",
  idPrefix = "org",
}: LabIllustrationProps) {
  const glow = `${idPrefix}-glow`;
  const glass = `${idPrefix}-glass`;
  const amberLiquid = `${idPrefix}-amber`;
  const shadow = `${idPrefix}-shadow`;

  return (
    <svg
      viewBox="0 0 400 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Ilustrasi Laboratorium Kimia Organik"
      role="img"
    >
      <defs>
        <radialGradient id={glow} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FEF1CC" stopOpacity="0.85" />
          <stop offset="70%" stopColor="#FEF7E6" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FAF7F2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={glass} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#E2EAF2" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id={amberLiquid} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FBD47A" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <filter id={shadow} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#212121" floodOpacity="0.08" />
        </filter>
      </defs>

      {/* Atmospheric Background */}
      <circle cx="200" cy="90" r="95" fill={`url(#${glow})`} />

      {/* Floating Benzene Hexagon Badge (Top Left) */}
      <g opacity="0.85" transform="translate(30, 25)" filter={`url(#${shadow})`}>
        <rect x="0" y="0" width="82" height="42" rx="8" fill="#FFFFFF" stroke="#E1E1E1" strokeWidth="1" />
        <polygon points="20,10 32,17 32,31 20,38 8,31 8,17" fill="none" stroke="#D97706" strokeWidth="1.8" />
        <circle cx="20" cy="24" r="7" fill="none" stroke="#D97706" strokeWidth="1.2" strokeDasharray="3 2" />
        <text x="39" y="21" fontSize="9" fontWeight="bold" fill="#212121" fontFamily="sans-serif">C6H6</text>
        <text x="39" y="32" fontSize="7" fill="#6B6B6B" fontFamily="sans-serif">Aromatik</text>
      </g>

      {/* Workstation Bench Surface */}
      <rect x="40" y="148" width="320" height="8" rx="2" fill="#CBD5E1" />
      <rect x="50" y="156" width="300" height="14" rx="2" fill="#E2E8F0" />

      {/* INSTRUMENT: Rotary Evaporator (Rotavap) */}
      <g filter={`url(#${shadow})`}>
        {/* Main Stand & Motor Base */}
        <rect x="135" y="85" width="22" height="63" rx="3" fill="#334155" />
        <rect x="120" y="142" width="52" height="8" rx="2" fill="#1E293B" />
        <circle cx="146" cy="100" r="5" fill="#F9B129" />
        <circle cx="146" cy="115" r="3.5" fill="#64748B" />

        {/* Diagonal Vapor Duct */}
        <line x1="146" y1="92" x2="195" y2="120" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />

        {/* Spiral Condenser Glass Tower */}
        <rect x="138" y="30" width="16" height="58" rx="7" fill={`url(#${glass})`} stroke="#94A3B8" strokeWidth="1.2" />
        {/* Glass Spiral coil inside */}
        <path
          d="M142 38 Q150 42 142 46 Q150 50 142 54 Q150 58 142 62 Q150 66 142 70 Q150 74 142 78"
          stroke="#3880F6"
          strokeWidth="1.5"
          fill="none"
          opacity="0.8"
        />

        {/* Heating Water Bath (Right Base) */}
        <rect x="180" y="125" width="46" height="23" rx="4" fill="#64748B" />
        <rect x="185" y="122" width="36" height="5" rx="1.5" fill="#94A3B8" />

        {/* Round Bottom Evaporation Flask (Rotates in water bath) */}
        <circle cx="203" cy="120" r="14" fill={`url(#${glass})`} stroke="#94A3B8" strokeWidth="1.2" />
        <path d="M192 124 Q203 120 214 124 A 12 12 0 0 1 192 124 Z" fill={`url(#${amberLiquid})`} />

        {/* Receiving Flask (Under Condenser) */}
        <circle cx="146" cy="136" r="10" fill={`url(#${glass})`} stroke="#94A3B8" strokeWidth="1" />
        <path d="M138 139 Q146 136 154 139 A 8 8 0 0 1 138 139 Z" fill="#93C5FD" opacity="0.8" />
      </g>

      {/* APPARATUS 2: Magnetic Hotplate Stirrer with Erlenmeyer Flask */}
      <g filter={`url(#${shadow})`}>
        {/* Stirrer Body */}
        <rect x="250" y="128" width="48" height="20" rx="3" fill="#334155" />
        <rect x="254" y="124" width="40" height="4" rx="1" fill="#F8FAFC" />
        <circle cx="262" cy="138" r="3" fill="#F9B129" />
        <circle cx="272" cy="138" r="3" fill="#64748B" />
        <rect x="280" y="134" width="13" height="7" rx="1" fill="#0F172A" />
        <text x="282" y="140" fontSize="5" fontWeight="bold" fill="#F9B129" fontFamily="monospace">60°C</text>

        {/* Erlenmeyer Flask */}
        <path d="M268 96 L276 96 L286 124 L258 124 Z" fill={`url(#${glass})`} stroke="#94A3B8" strokeWidth="1.2" />
        <path d="M260 116 Q272 113 284 116 L285 123 L259 123 Z" fill={`url(#${amberLiquid})`} />
        {/* Stir Bar */}
        <rect x="268" y="120" width="8" height="2.5" rx="1" fill="#FFFFFF" />
      </g>

      {/* APPARATUS 3: Amber Chemical Reagent Bottle with Dropper (Right) */}
      <g filter={`url(#${shadow})`}>
        <rect x="312" y="108" width="22" height="40" rx="3" fill="#B45309" stroke="#78350F" strokeWidth="1" />
        <rect x="317" y="100" width="12" height="8" rx="1.5" fill="#78350F" />
        {/* Label */}
        <rect x="315" y="118" width="16" height="18" rx="1" fill="#FEF3C7" />
        <text x="318" y="126" fontSize="5.5" fontWeight="bold" fill="#78350F" fontFamily="sans-serif">EtOH</text>
        <text x="318" y="132" fontSize="4.5" fill="#92400E" fontFamily="sans-serif">96%</text>
      </g>
    </svg>
  );
}

// 2. LAB KIMIA ANORGANIK: Crystal Lattice, Coordination Complexes & High-Temp Muffle Furnace
export function LabAnorganikIllustration({
  className = "w-full h-auto",
  idPrefix = "anorg",
}: LabIllustrationProps) {
  const glow = `${idPrefix}-glow`;
  const glass = `${idPrefix}-glass`;
  const cobalt = `${idPrefix}-cobalt`;
  const shadow = `${idPrefix}-shadow`;

  return (
    <svg
      viewBox="0 0 400 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Ilustrasi Laboratorium Kimia Anorganik"
      role="img"
    >
      <defs>
        <radialGradient id={glow} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E0ECFF" stopOpacity="0.85" />
          <stop offset="70%" stopColor="#EEF4FF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FAF7F2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={glass} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#E2EAF2" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id={cobalt} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <filter id={shadow} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#212121" floodOpacity="0.08" />
        </filter>
      </defs>

      <circle cx="200" cy="90" r="95" fill={`url(#${glow})`} />

      {/* Floating 3D Octahedral Coordination Complex (Top Left) */}
      <g opacity="0.9" transform="translate(35, 20)" filter={`url(#${shadow})`}>
        <rect x="0" y="0" width="88" height="46" rx="8" fill="#FFFFFF" stroke="#E1E1E1" strokeWidth="1" />
        {/* Central Metal Ion and Coordination Bonds */}
        <circle cx="24" cy="23" r="5" fill="#2563EB" />
        {/* 6 coordinate ligand points */}
        <line x1="24" y1="23" x2="24" y2="11" stroke="#93C5FD" strokeWidth="1.5" />
        <circle cx="24" cy="11" r="3" fill="#10B981" />
        <line x1="24" y1="23" x2="24" y2="35" stroke="#93C5FD" strokeWidth="1.5" />
        <circle cx="24" cy="35" r="3" fill="#10B981" />
        <line x1="24" y1="23" x2="13" y2="23" stroke="#93C5FD" strokeWidth="1.5" />
        <circle cx="13" cy="23" r="3" fill="#10B981" />
        <line x1="24" y1="23" x2="35" y2="23" stroke="#93C5FD" strokeWidth="1.5" />
        <circle cx="35" cy="23" r="3" fill="#10B981" />
        <text x="44" y="22" fontSize="8.5" fontWeight="bold" fill="#212121" fontFamily="sans-serif">[Cu(NH3)4]²⁺</text>
        <text x="44" y="33" fontSize="7" fill="#6B6B6B" fontFamily="sans-serif">Kompleks</text>
      </g>

      {/* Workstation Bench Surface */}
      <rect x="40" y="148" width="320" height="8" rx="2" fill="#CBD5E1" />
      <rect x="50" y="156" width="300" height="14" rx="2" fill="#E2E8F0" />

      {/* INSTRUMENT: High-Temperature Muffle Furnace */}
      <g filter={`url(#${shadow})`}>
        <rect x="140" y="70" width="76" height="78" rx="6" fill="#334155" stroke="#1E293B" strokeWidth="1.5" />
        {/* Door and Chamber Viewport */}
        <rect x="148" y="78" width="60" height="44" rx="3" fill="#1E293B" />
        {/* Glowing Heat Core */}
        <rect x="156" y="86" width="44" height="28" rx="2" fill="#F97316" opacity="0.9" />
        <rect x="162" y="92" width="32" height="16" rx="2" fill="#FDE047" opacity="0.8" />
        {/* Crucible inside furnace */}
        <path d="M172 98 L184 98 L181 106 L175 106 Z" fill="#FFFFFF" opacity="0.95" />

        {/* Digital Thermocouple Temperature Display */}
        <rect x="148" y="128" width="36" height="14" rx="2" fill="#0F172A" />
        <text x="151" y="139" fontSize="7" fontWeight="bold" fill="#EF4444" fontFamily="monospace">950°C</text>
        {/* Controls */}
        <circle cx="195" cy="135" r="3.5" fill="#94A3B8" />
        <circle cx="205" cy="135" r="3.5" fill="#94A3B8" />
      </g>

      {/* APPARATUS 2: Transition Metal Solution Beakers (Cobalt, Nickel, Copper) */}
      <g filter={`url(#${shadow})`}>
        {/* Beaker 1: Deep Blue Copper Sulfate */}
        <rect x="235" y="110" width="28" height="38" rx="2" fill={`url(#${glass})`} stroke="#94A3B8" strokeWidth="1.2" />
        <path d="M236 122 Q249 119 262 122 L262 147 L236 147 Z" fill={`url(#${cobalt})`} opacity="0.9" />
        <line x1="240" y1="128" x2="245" y2="128" stroke="#FFFFFF" strokeWidth="1" opacity="0.6" />
        <line x1="240" y1="136" x2="246" y2="136" stroke="#FFFFFF" strokeWidth="1" opacity="0.6" />

        {/* Beaker 2: Emerald Nickel Solution */}
        <rect x="272" y="116" width="26" height="32" rx="2" fill={`url(#${glass})`} stroke="#94A3B8" strokeWidth="1.2" />
        <path d="M273 126 Q285 124 297 126 L297 147 L273 147 Z" fill="#10B981" opacity="0.85" />

        {/* Beaker 3: Violet Permanganate */}
        <rect x="306" y="105" width="28" height="43" rx="2" fill={`url(#${glass})`} stroke="#94A3B8" strokeWidth="1.2" />
        <path d="M307 118 Q320 115 333 118 L333 147 L307 147 Z" fill="#8B5CF6" opacity="0.85" />
      </g>

      {/* Porcelain Crucible and Tongs in Foreground */}
      <g filter={`url(#${shadow})`}>
        <path d="M95 130 L115 130 L110 148 L100 148 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.2" />
        <path d="M88 122 Q105 132 108 138" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

// 3. LAB BIOKIMIA: DNA Double Helix, Micropipette, PCR Tubes & Petri Dish
export function LabBiokimiaIllustration({
  className = "w-full h-auto",
  idPrefix = "bio",
}: LabIllustrationProps) {
  const glow = `${idPrefix}-glow`;
  const glass = `${idPrefix}-glass`;
  const emerald = `${idPrefix}-emerald`;
  const shadow = `${idPrefix}-shadow`;

  return (
    <svg
      viewBox="0 0 400 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Ilustrasi Laboratorium Biokimia"
      role="img"
    >
      <defs>
        <radialGradient id={glow} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#DCFCE7" stopOpacity="0.85" />
          <stop offset="70%" stopColor="#F0FDF4" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FAF7F2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={glass} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#E2EAF2" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id={emerald} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id={shadow} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#212121" floodOpacity="0.08" />
        </filter>
      </defs>

      <circle cx="200" cy="90" r="95" fill={`url(#${glow})`} />

      {/* Floating 3D DNA Helix Badge (Top Left) */}
      <g opacity="0.9" transform="translate(30, 20)" filter={`url(#${shadow})`}>
        <rect x="0" y="0" width="85" height="44" rx="8" fill="#FFFFFF" stroke="#E1E1E1" strokeWidth="1" />
        {/* DNA Strand Wave */}
        <path d="M12 28 Q18 14 24 22 Q30 30 36 16" stroke="#059669" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M12 16 Q18 30 24 22 Q30 14 36 28" stroke="#10B981" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Base pair rungs */}
        <line x1="15" y1="22" x2="19" y2="22" stroke="#6EE7B7" strokeWidth="1.5" />
        <line x1="22" y1="22" x2="26" y2="22" stroke="#6EE7B7" strokeWidth="1.5" />
        <line x1="29" y1="22" x2="33" y2="22" stroke="#6EE7B7" strokeWidth="1.5" />
        <text x="42" y="21" fontSize="9" fontWeight="bold" fill="#212121" fontFamily="sans-serif">DNA</text>
        <text x="42" y="32" fontSize="7" fill="#6B6B6B" fontFamily="sans-serif">Genomik</text>
      </g>

      {/* Workstation Bench Surface */}
      <rect x="40" y="148" width="320" height="8" rx="2" fill="#CBD5E1" />
      <rect x="50" y="156" width="300" height="14" rx="2" fill="#E2E8F0" />

      {/* APPARATUS 1: Precision Research Micropipette on Stand */}
      <g filter={`url(#${shadow})`}>
        {/* Stand */}
        <rect x="145" y="65" width="6" height="83" rx="2" fill="#64748B" />
        <rect x="135" y="144" width="26" height="5" rx="1.5" fill="#334155" />
        <rect x="140" y="65" width="28" height="6" rx="2" fill="#475569" />

        {/* Micropipette 100-1000 µL hanging */}
        <rect x="156" y="55" width="10" height="26" rx="4" fill="#048444" />
        <rect x="159" y="47" width="4" height="8" rx="2" fill="#F9B129" />
        {/* Volume counter window */}
        <rect x="157" y="62" width="8" height="8" rx="1" fill="#FFFFFF" />
        <text x="158" y="68" fontSize="4.5" fontWeight="bold" fill="#212121" fontFamily="monospace">500</text>
        {/* Shaft & disposable tip */}
        <rect x="159" y="81" width="4" height="28" rx="1" fill="#E2E8F0" />
        <polygon points="159,109 163,109 161.5,124 160.5,124" fill="#93C5FD" opacity="0.9" />
      </g>

      {/* APPARATUS 2: 96-well / PCR Microtubes Rack (Eppendorf) */}
      <g filter={`url(#${shadow})`}>
        <rect x="185" y="125" width="65" height="23" rx="3" fill="#0284C7" />
        <line x1="185" y1="133" x2="250" y2="133" stroke="#0369A1" strokeWidth="1" />
        {/* 6 Microtubes in rack with colored caps */}
        <rect x="190" y="117" width="6" height="14" rx="2" fill="#FFFFFF" stroke="#0284C7" strokeWidth="0.8" />
        <circle cx="193" cy="116" r="3" fill="#EF4444" />

        <rect x="200" y="115" width="6" height="16" rx="2" fill="#FFFFFF" stroke="#0284C7" strokeWidth="0.8" />
        <circle cx="203" cy="114" r="3" fill="#F9B129" />

        <rect x="210" y="118" width="6" height="13" rx="2" fill="#FFFFFF" stroke="#0284C7" strokeWidth="0.8" />
        <circle cx="213" cy="117" r="3" fill="#10B981" />

        <rect x="220" y="115" width="6" height="16" rx="2" fill="#FFFFFF" stroke="#0284C7" strokeWidth="0.8" />
        <circle cx="223" cy="114" r="3" fill="#8B5CF6" />

        <rect x="230" y="117" width="6" height="14" rx="2" fill="#FFFFFF" stroke="#0284C7" strokeWidth="0.8" />
        <circle cx="233" cy="116" r="3" fill="#3B82F6" />

        <rect x="240" y="116" width="6" height="15" rx="2" fill="#FFFFFF" stroke="#0284C7" strokeWidth="0.8" />
        <circle cx="243" cy="115" r="3" fill="#F43F5E" />
      </g>

      {/* APPARATUS 3: Glass Petri Dish with Agar & Bacterial Culture Streaks */}
      <g filter={`url(#${shadow})`}>
        <ellipse cx="295" cy="138" rx="26" ry="9" fill={`url(#${glass})`} stroke="#94A3B8" strokeWidth="1.2" />
        <ellipse cx="295" cy="138" rx="22" ry="7" fill="#FEF08A" opacity="0.8" />
        {/* Inoculation streaks */}
        <path d="M284 137 Q292 135 298 138 Q305 136 310 139" stroke="#E11D48" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <path d="M288 140 Q294 139 300 141" stroke="#E11D48" strokeWidth="1" fill="none" strokeLinecap="round" />
      </g>

      {/* Glass Media Bottle with Blue Screw Cap (Right) */}
      <g filter={`url(#${shadow})`}>
        <rect x="330" y="105" width="24" height="43" rx="3" fill={`url(#${glass})`} stroke="#94A3B8" strokeWidth="1.2" />
        <rect x="334" y="98" width="16" height="8" rx="1.5" fill="#2563EB" />
        <path d="M331 122 Q342 120 353 122 L353 147 L331 147 Z" fill={`url(#${emerald})`} opacity="0.8" />
      </g>
    </svg>
  );
}

// 4. LAB KIMIA ANALITIK: Chromatography HPLC, UV-Vis Spectrophotometer & Analytical Balance
export function LabAnalitikIllustration({
  className = "w-full h-auto",
  idPrefix = "analyt",
}: LabIllustrationProps) {
  const glow = `${idPrefix}-glow`;
  const glass = `${idPrefix}-glass`;
  const amber = `${idPrefix}-amber`;
  const shadow = `${idPrefix}-shadow`;

  return (
    <svg
      viewBox="0 0 400 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Ilustrasi Laboratorium Kimia Analitik"
      role="img"
    >
      <defs>
        <radialGradient id={glow} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FEF7E6" stopOpacity="0.85" />
          <stop offset="70%" stopColor="#FFFDF7" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FAF7F2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={glass} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#E2EAF2" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id={amber} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FBD47A" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <filter id={shadow} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#212121" floodOpacity="0.08" />
        </filter>
      </defs>

      <circle cx="200" cy="90" r="95" fill={`url(#${glow})`} />

      {/* Floating UV-Vis λmax Status Card (Top Left) */}
      <g opacity="0.9" transform="translate(30, 20)" filter={`url(#${shadow})`}>
        <rect x="0" y="0" width="88" height="44" rx="8" fill="#FFFFFF" stroke="#E1E1E1" strokeWidth="1" />
        <rect x="6" y="8" width="18" height="18" rx="4" fill="#FEF1CC" />
        <path d="M10 17 L14 12 L19 21" stroke="#D97706" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <text x="29" y="17" fontSize="8.5" fontWeight="bold" fill="#212121" fontFamily="sans-serif">UV-Vis Spec</text>
        <text x="29" y="27" fontSize="7" fontWeight="bold" fill="#048444" fontFamily="sans-serif">λ = 520 nm</text>
        <text x="8" y="38" fontSize="6.5" fill="#6B6B6B" fontFamily="sans-serif">Kuantifikasi Presisi</text>
      </g>

      {/* Workstation Bench Surface */}
      <rect x="40" y="148" width="320" height="8" rx="2" fill="#CBD5E1" />
      <rect x="50" y="156" width="300" height="14" rx="2" fill="#E2E8F0" />

      {/* INSTRUMENT 1: HPLC / Chromatograph Unit & Monitor */}
      <g filter={`url(#${shadow})`}>
        {/* Chromatography Module Stack */}
        <rect x="135" y="75" width="55" height="73" rx="4" fill="#334155" stroke="#1E293B" strokeWidth="1.2" />
        {/* Solvent Tray Top */}
        <rect x="138" y="70" width="49" height="7" rx="2" fill="#64748B" />
        {/* Autosampler Door */}
        <rect x="141" y="88" width="43" height="22" rx="2" fill="#1E293B" />
        <circle cx="147" cy="99" r="2.5" fill="#10B981" />
        <circle cx="155" cy="99" r="2.5" fill="#F9B129" />
        {/* Pump LEDs */}
        <circle cx="143" cy="80" r="1.5" fill="#10B981" />
        <circle cx="148" cy="80" r="1.5" fill="#10B981" />

        {/* Digital Analytical Monitor */}
        <rect x="200" y="60" width="70" height="65" rx="5" fill="#212121" stroke="#334155" strokeWidth="2" />
        <rect x="204" y="64" width="62" height="57" rx="3" fill="#0F172A" />
        {/* Chromatogram Peaks on Monitor */}
        <line x1="208" y1="108" x2="262" y2="108" stroke="#334155" strokeWidth="1" />
        <path
          d="M208 108 L218 108 L224 82 L228 108 L238 108 L244 68 L248 108 L262 108"
          stroke="#F9B129"
          strokeWidth="1.5"
          fill="none"
          strokeLinejoin="round"
        />
        <text x="238" y="76" fontSize="5" fontWeight="bold" fill="#10B981" fontFamily="monospace">99.4%</text>
        {/* Monitor Stand */}
        <rect x="232" y="125" width="6" height="23" fill="#94A3B8" />
        <rect x="220" y="145" width="30" height="3" rx="1" fill="#64748B" />
      </g>

      {/* APPARATUS 2: Precision Burette on Retort Stand */}
      <g filter={`url(#${shadow})`}>
        {/* Stand base & rod */}
        <rect x="285" y="144" width="22" height="4" rx="1" fill="#1E293B" />
        <rect x="295" y="45" width="2.5" height="100" fill="#64748B" />
        <rect x="293" y="65" width="16" height="5" rx="1" fill="#475569" />

        {/* Burette Tube */}
        <rect x="303" y="40" width="5" height="85" rx="2" fill={`url(#${glass})`} stroke="#94A3B8" strokeWidth="0.8" />
        <rect x="303.5" y="55" width="4" height="60" fill={`url(#${amber})`} />
        {/* Stopcock */}
        <circle cx="305.5" cy="126" r="2.5" fill="#F9B129" />
        {/* Droplet */}
        <circle cx="305.5" cy="133" r="1" fill="#D97706" />

        {/* Erlenmeyer Flask */}
        <path d="M301 135 L310 135 L317 148 L294 148 Z" fill={`url(#${glass})`} stroke="#94A3B8" strokeWidth="1" />
        <path d="M296 144 Q305 142 315 144 L316 148 L295 148 Z" fill="#F43F5E" opacity="0.85" />
      </g>

      {/* APPARATUS 3: Analytical 4-Decimal Balance with Draft Shield (Right) */}
      <g filter={`url(#${shadow})`}>
        <rect x="330" y="112" width="32" height="36" rx="2" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1" />
        <rect x="333" y="115" width="26" height="22" rx="1" fill={`url(#${glass})`} stroke="#94A3B8" strokeWidth="0.8" />
        {/* Pan inside */}
        <ellipse cx="346" cy="130" rx="8" ry="2" fill="#E2E8F0" />
        {/* Display */}
        <rect x="335" y="139" width="22" height="7" rx="1" fill="#0F172A" />
        <text x="337" y="144" fontSize="4.5" fontWeight="bold" fill="#10B981" fontFamily="monospace">0.0000g</text>
      </g>
    </svg>
  );
}

// 5. LAB KIMIA FISIK: Bomb Calorimeter, Activation Energy Curve Display & Laser Optics
export function LabFisikIllustration({
  className = "w-full h-auto",
  idPrefix = "phys",
}: LabIllustrationProps) {
  const glow = `${idPrefix}-glow`;
  const glass = `${idPrefix}-glass`;
  const coral = `${idPrefix}-coral`;
  const shadow = `${idPrefix}-shadow`;

  return (
    <svg
      viewBox="0 0 400 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Ilustrasi Laboratorium Kimia Fisik"
      role="img"
    >
      <defs>
        <radialGradient id={glow} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE4E6" stopOpacity="0.85" />
          <stop offset="70%" stopColor="#FFF1F2" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FAF7F2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={glass} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#E2EAF2" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id={coral} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="100%" stopColor="#E11D48" />
        </linearGradient>
        <filter id={shadow} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#212121" floodOpacity="0.08" />
        </filter>
      </defs>

      <circle cx="200" cy="90" r="95" fill={`url(#${glow})`} />

      {/* Floating Kinetics Activation Energy Curve Badge (Top Left) */}
      <g opacity="0.9" transform="translate(30, 20)" filter={`url(#${shadow})`}>
        <rect x="0" y="0" width="88" height="44" rx="8" fill="#FFFFFF" stroke="#E1E1E1" strokeWidth="1" />
        {/* Activation Energy Curve */}
        <path d="M8 32 Q18 32 22 14 Q26 36 36 36" stroke="#E11D48" strokeWidth="2" fill="none" strokeLinecap="round" />
        <line x1="22" y1="14" x2="22" y2="32" stroke="#FDA4AF" strokeWidth="1" strokeDasharray="2 2" />
        <text x="42" y="21" fontSize="9" fontWeight="bold" fill="#212121" fontFamily="sans-serif">ΔH & Ea</text>
        <text x="42" y="32" fontSize="7" fill="#6B6B6B" fontFamily="sans-serif">Termodinamika</text>
      </g>

      {/* Workstation Bench Surface */}
      <rect x="40" y="148" width="320" height="8" rx="2" fill="#CBD5E1" />
      <rect x="50" y="156" width="300" height="14" rx="2" fill="#E2E8F0" />

      {/* INSTRUMENT 1: Heavy Bomb Calorimeter System */}
      <g filter={`url(#${shadow})`}>
        {/* Outer Insulated Water Jacket Container */}
        <rect x="135" y="80" width="56" height="68" rx="8" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
        {/* Stainless Steel Bomb Vessel inside */}
        <rect x="145" y="94" width="36" height="46" rx="5" fill="#475569" stroke="#1E293B" strokeWidth="1" />
        <rect x="150" y="86" width="26" height="8" rx="2" fill="#64748B" />

        {/* Ignition Wires / Thermocouple Leads */}
        <path d="M155 86 L155 70 Q165 65 175 70 L175 86" stroke="#EF4444" strokeWidth="1.5" fill="none" />
        <rect x="160" y="65" width="10" height="7" rx="1.5" fill="#1E293B" />
        <circle cx="165" cy="68" r="1.5" fill="#FDE047" />

        {/* Precision Thermometer / Probe */}
        <rect x="177" y="55" width="3" height="45" rx="1.5" fill={`url(#${glass})`} stroke="#94A3B8" strokeWidth="0.8" />
        <rect x="177" y="80" width="3" height="18" fill="#E11D48" />
      </g>

      {/* INSTRUMENT 2: Laser Spectroscopy / Reaction Kinetics System */}
      <g filter={`url(#${shadow})`}>
        {/* Laser Unit */}
        <rect x="210" y="124" width="35" height="24" rx="3" fill="#1E293B" />
        <circle cx="218" cy="136" r="3" fill="#EF4444" />
        <rect x="228" y="132" width="12" height="8" rx="1" fill="#048444" />
        {/* Emitted Laser Beam */}
        <line x1="245" y1="136" x2="275" y2="136" stroke="#EF4444" strokeWidth="2" strokeDasharray="4 2" />

        {/* Optical Prism / Beam Splitter */}
        <polygon points="275,124 290,146 265,146" fill={`url(#${glass})`} stroke="#94A3B8" strokeWidth="1.2" opacity="0.8" />
        {/* Refracted & Split Beams */}
        <line x1="282" y1="135" x2="310" y2="120" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="3 2" />
        <line x1="282" y1="135" x2="310" y2="142" stroke="#F97316" strokeWidth="1.5" strokeDasharray="3 2" />
      </g>

      {/* APPARATUS 3: Digital Kinetics / Conductivity Photometer Monitor */}
      <g filter={`url(#${shadow})`}>
        <rect x="315" y="82" width="46" height="66" rx="4" fill="#334155" stroke="#1E293B" strokeWidth="1.2" />
        <rect x="320" y="87" width="36" height="30" rx="2" fill="#0F172A" />
        {/* Display Thermal Kinetics Curve */}
        <path d="M323 112 Q332 93 352 93" stroke="#F43F5E" strokeWidth="1.5" fill="none" />
        <text x="324" y="96" fontSize="5" fontWeight="bold" fill="#38BDF8" fontFamily="monospace">298.15K</text>
        {/* Control Knobs */}
        <circle cx="328" cy="128" r="3" fill="#94A3B8" />
        <circle cx="338" cy="128" r="3" fill="#94A3B8" />
        <circle cx="348" cy="128" r="3" fill="#94A3B8" />
      </g>
    </svg>
  );
}

// Unified component mapping lab code to corresponding SVG illustration
export function LabCardIllustration({
  labCode,
  className = "w-full h-auto",
  idPrefix,
}: {
  labCode: string;
  className?: string;
  idPrefix?: string;
}) {
  const code = labCode.toLowerCase();
  const prefix = idPrefix || code.replace(/[^a-z0-9]/g, "");

  if (code.includes("organik") && !code.includes("anorganik")) {
    return <LabOrganikIllustration className={className} idPrefix={prefix} />;
  }
  if (code.includes("anorganik")) {
    return <LabAnorganikIllustration className={className} idPrefix={prefix} />;
  }
  if (code.includes("biokimia")) {
    return <LabBiokimiaIllustration className={className} idPrefix={prefix} />;
  }
  if (code.includes("analitik")) {
    return <LabAnalitikIllustration className={className} idPrefix={prefix} />;
  }
  if (code.includes("fisik")) {
    return <LabFisikIllustration className={className} idPrefix={prefix} />;
  }

  // Fallback to organic
  return <LabOrganikIllustration className={className} idPrefix={prefix} />;
}
