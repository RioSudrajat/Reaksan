export function LoginResearchIllustration({ className = "w-full max-w-[500px] h-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 540 460"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Ilustrasi Riset Kolaboratif Laboratorium Kimia Reaksan Unpad"
      role="img"
    >
      <defs>
        <radialGradient id="login-chem-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FEF1CC" stopOpacity="0.75" />
          <stop offset="70%" stopColor="#FEF7E6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FAF7F2" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="flask-gold-liquid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#F9B129" stopOpacity="0.95" />
        </linearGradient>

        <linearGradient id="beaker-blue-liquid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.95" />
        </linearGradient>

        <linearGradient id="book-unpad-amber" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F9B129" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>

        <linearGradient id="book-slate" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>

        <linearGradient id="book-green" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#048444" />
        </linearGradient>

        <filter id="login-shadow" x="-8%" y="-8%" width="120%" height="120%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="5" stdDeviation="8" floodColor="#212121" floodOpacity="0.08" />
        </filter>
      </defs>

      {/* Background Soft Yellow Lab Glow */}
      <circle cx="270" cy="230" r="190" fill="url(#login-chem-glow)" />

      {/* Floating Molecular Structure Bonds (Ball & Stick Molecule) */}
      <g opacity="0.6" transform="translate(60, 60)">
        {/* Central carbon */}
        <circle cx="30" cy="30" r="8" fill="#212121" />
        {/* Bonds */}
        <line x1="30" y1="30" x2="60" y2="15" stroke="#94A3B8" strokeWidth="2.5" />
        <line x1="30" y1="30" x2="10" y2="55" stroke="#94A3B8" strokeWidth="2.5" />
        <line x1="30" y1="30" x2="10" y2="10" stroke="#94A3B8" strokeWidth="2.5" />
        {/* Attached atoms */}
        <circle cx="60" cy="15" r="7" fill="#F45959" /> {/* Oxygen */}
        <circle cx="10" cy="55" r="5" fill="#38BDF8" /> {/* Hydrogen */}
        <circle cx="10" cy="10" r="6" fill="#F9B129" /> {/* Nitrogen */}
        {/* Chemical label */}
        <text x="70" y="18" fontSize="8" fontWeight="bold" fill="#8D6500" fontFamily="Inter, sans-serif">Sintesis Unpad</text>
      </g>

      {/* Floating Fume Hood / Laminar Flow Air Velocity Badge */}
      <g filter="url(#login-shadow)">
        <rect x="360" y="60" width="130" height="52" rx="10" fill="#FFFFFF" stroke="#E1E1E1" strokeWidth="1.5" />
        <circle cx="380" cy="86" r="12" fill="#E5F5ED" />
        <path d="M375 86 L379 90 L386 82" stroke="#048444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <text x="398" y="81" fontSize="9.5" fontWeight="bold" fill="#212121" fontFamily="Inter, sans-serif">Fume Hood #02</text>
        <text x="398" y="93" fontSize="8" fontWeight="medium" fill="#048444" fontFamily="Inter, sans-serif">Aliran: 0.5 m/s (Normal)</text>
        <text x="398" y="103" fontSize="7" fill="#6B6B6B" fontFamily="Inter, sans-serif">Lab Kimia Terpadu</text>
      </g>

      {/* Main Chemistry Lab Workstation Surface (Base) */}
      <ellipse cx="270" cy="410" rx="210" ry="28" fill="#E2E8F0" opacity="0.6" />
      <rect x="70" y="380" width="400" height="12" rx="3" fill="#D8DEE4" stroke="#CBD5E1" strokeWidth="1" />

      {/* Chemistry Stack of Reference Literature & Lab Logs */}
      {/* Book 1 (Bottom): "Vogel - Kimia Analisis Kuantitatif" */}
      <g filter="url(#login-shadow)">
        <rect x="180" y="358" width="160" height="24" rx="4" fill="url(#book-slate)" />
        <rect x="195" y="362" width="140" height="16" fill="#F8FAFC" />
        <line x1="200" y1="367" x2="325" y2="367" stroke="#E2E8F0" strokeWidth="1" />
        <line x1="200" y1="371" x2="310" y2="371" stroke="#E2E8F0" strokeWidth="1" />
        <text x="202" y="375" fontSize="7" fontWeight="bold" fill="#334155" fontFamily="Inter, sans-serif">Vogel&apos;s Quantitative Chemistry</text>
        <path d="M180 358 C176 370 176 370 180 382" stroke="#0F172A" strokeWidth="3" />
      </g>

      {/* Book 2 (Middle): "Kimia Organik & Polimer Unpad" */}
      <g filter="url(#login-shadow)">
        <rect x="190" y="335" width="145" height="24" rx="4" fill="url(#book-green)" />
        <rect x="202" y="339" width="130" height="16" fill="#FFFFFF" />
        <line x1="208" y1="344" x2="320" y2="344" stroke="#E5F5ED" strokeWidth="1" />
        <text x="210" y="351" fontSize="7" fontWeight="bold" fill="#048444" fontFamily="Inter, sans-serif">SOP Praktikum Kimia Organik</text>
      </g>

      {/* Book 3 (Top): "Reaksan Lab Log & Safety Manual" */}
      <g filter="url(#login-shadow)">
        <rect x="175" y="312" width="155" height="24" rx="4" fill="url(#book-unpad-amber)" />
        <rect x="188" y="316" width="138" height="16" fill="#FEF1CC" />
        <line x1="195" y1="322" x2="315" y2="322" stroke="#FDE68A" strokeWidth="1" />
        <text x="196" y="328" fontSize="7.5" fontWeight="bold" fill="#8D6500" fontFamily="Inter, sans-serif">Reaksan Unpad • Research Log</text>
      </g>

      {/* Glass Chemistry Apparatus on Left: Volumetric Flask & Graduated Cylinder */}
      <g filter="url(#login-shadow)">
        {/* Volumetric Flask (Labu Ukur 250 mL) */}
        <path
          d="M125 315 L129 315 L129 340 L146 375 L108 375 L125 340 Z"
          fill="#FFFFFF"
          fillOpacity="0.75"
          stroke="#94A3B8"
          strokeWidth="1.2"
        />
        {/* Flask Ring graduation */}
        <line x1="126" y1="330" x2="132" y2="330" stroke="#334155" strokeWidth="1" />
        {/* Liquid in volumetric flask (Emerald Green) */}
        <path
          d="M112 363 Q127 360 142 363 L144 374 L110 374 Z"
          fill="#10B981"
          opacity="0.9"
        />
        {/* Ground glass stopper */}
        <rect x="124" y="309" width="10" height="7" rx="1.5" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1" />

        {/* Graduated Cylinder with Blue liquid */}
        <rect x="155" y="320" width="12" height="60" rx="2" fill="#FFFFFF" fillOpacity="0.7" stroke="#94A3B8" strokeWidth="1" />
        <rect x="151" y="377" width="20" height="4" rx="1" fill="#CBD5E1" />
        {/* Blue liquid */}
        <rect x="156" y="340" width="10" height="38" fill="url(#beaker-blue-liquid)" />
        {/* Measurement lines */}
        <line x1="156" y1="330" x2="162" y2="330" stroke="#64748B" strokeWidth="1" />
        <line x1="156" y1="340" x2="160" y2="340" stroke="#64748B" strokeWidth="1" />
        <line x1="156" y1="350" x2="162" y2="350" stroke="#64748B" strokeWidth="1" />
        <line x1="156" y1="360" x2="160" y2="360" stroke="#64748B" strokeWidth="1" />
        <line x1="156" y1="370" x2="162" y2="370" stroke="#64748B" strokeWidth="1" />
      </g>

      {/* Central Screen: Molecular Modeling & Spectroscopy Terminal */}
      <g filter="url(#login-shadow)">
        <rect x="225" y="160" width="170" height="120" rx="12" fill="#212121" stroke="#334155" strokeWidth="3.5" />
        <rect x="231" y="166" width="158" height="108" rx="8" fill="#F8FAFC" />
        {/* Top window controls */}
        <circle cx="241" cy="176" r="3" fill="#F45959" />
        <circle cx="249" cy="176" r="3" fill="#F9B129" />
        <circle cx="257" cy="176" r="3" fill="#048444" />
        <text x="267" y="179" fontSize="6.5" fontWeight="bold" fill="#64748B" fontFamily="Inter, sans-serif">MOLECULAR DYNAMICS 3D</text>

        {/* 3D Benzene & Chemical Reaction Visualization on screen */}
        <g transform="translate(255, 195)">
          {/* Hexagon ring on monitor */}
          <polygon points="30,0 55,14 55,42 30,56 5,42 5,14" fill="#FEF1CC" stroke="#F9B129" strokeWidth="2" />
          <circle cx="30" cy="28" r="14" fill="none" stroke="#F9B129" strokeWidth="1.5" strokeDasharray="4 2" />
          {/* Reaction arrow */}
          <path d="M65 28 L90 28 M85 24 L90 28 L85 32" stroke="#212121" strokeWidth="2" strokeLinecap="round" />
          {/* Product peak graph */}
          <path d="M98 45 Q108 45 113 15 Q118 45 128 45" stroke="#048444" strokeWidth="2" fill="none" />
        </g>
        {/* Formula bar at bottom of monitor */}
        <rect x="235" y="254" width="150" height="16" rx="3" fill="#212121" />
        <text x="242" y="265" fontSize="7" fontWeight="bold" fill="#F9B129" fontFamily="monospace">Yield: 94.2% • pH: 7.2</text>
      </g>

      {/* Graduation Cap (Toga Akademik) perched on monitor */}
      <g filter="url(#login-shadow)">
        <polygon points="215,140 250,125 285,140 250,155" fill="#212121" />
        <rect x="240" y="150" width="20" height="10" rx="2" fill="#121826" />
        <path d="M250 140 Q220 148 215 168" stroke="#F9B129" strokeWidth="2.5" fill="none" />
        <circle cx="214" cy="170" r="3.5" fill="#F9B129" />
      </g>

      {/* RESEARCHER 1 (LEFT, STANDING): Inspecting Titration Flask in White Lab Coat */}
      <g>
        {/* Legs / Dark Trousers */}
        <rect x="135" y="280" width="10" height="65" rx="3" fill="#1E293B" />
        <rect x="148" y="280" width="10" height="65" rx="3" fill="#0F172A" />
        <ellipse cx="140" cy="346" rx="7" ry="3.5" fill="#121826" />
        <ellipse cx="153" cy="346" rx="7" ry="3.5" fill="#121826" />

        {/* White Lab Coat Body */}
        <path
          d="M130 230 C125 250 125 285 128 310 L166 310 C169 285 169 250 164 230 Z"
          fill="#FFFFFF"
          stroke="#CBD5E1"
          strokeWidth="1.2"
        />
        <line x1="147" y1="230" x2="147" y2="310" stroke="#E2E8F0" strokeWidth="1" />

        {/* Arm holding up Erlenmeyer Flask */}
        <path
          d="M158 240 Q178 230 182 215"
          stroke="#FFFFFF"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M158 240 Q178 230 182 215"
          stroke="#CBD5E1"
          strokeWidth="1"
          fill="none"
        />
        {/* Nitrile Glove */}
        <circle cx="182" cy="214" r="5" fill="#38BDF8" />

        {/* Erlenmeyer Flask held up towards the light */}
        <path
          d="M180 205 L184 205 L184 212 L196 230 L172 230 L180 212 Z"
          fill="#FFFFFF"
          fillOpacity="0.8"
          stroke="#94A3B8"
          strokeWidth="1.2"
        />
        {/* Liquid inside held flask (Glowing Amber Reaction) */}
        <path
          d="M174 223 Q184 220 194 223 L195 229 L173 229 Z"
          fill="url(#flask-gold-liquid)"
        />

        {/* Head with Safety Glasses */}
        <circle cx="147" cy="210" r="12" fill="#F8B195" />
        <path d="M138 206 C138 194 156 194 156 206 Z" fill="#212121" />
        {/* Safety Goggles */}
        <rect x="144" y="206" width="12" height="7" rx="2" fill="#E0F2FE" fillOpacity="0.85" stroke="#0284C7" strokeWidth="1" />
      </g>

      {/* RESEARCHER 2 (RIGHT, SEATED): Analyzing Data on Laptop in White Lab Coat */}
      <g>
        {/* Seated Legs */}
        <ellipse cx="400" cy="375" rx="30" ry="12" fill="#1E293B" />
        <path d="M380 370 C390 385 415 385 425 370 Z" fill="#0F172A" />

        {/* White Lab Coat */}
        <path
          d="M385 305 C375 320 375 365 380 370 L425 370 C430 365 430 320 420 305 Z"
          fill="#FFFFFF"
          stroke="#CBD5E1"
          strokeWidth="1.2"
        />
        {/* Lab coat collar & Reaksan ID badge */}
        <rect x="396" y="320" width="10" height="14" rx="1.5" fill="#FEF1CC" stroke="#F9B129" strokeWidth="0.8" />
        <line x1="398" y1="324" x2="404" y2="324" stroke="#8D6500" strokeWidth="1" />

        {/* Arms typing on laptop */}
        <path d="M382 320 L370 345" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" />
        <circle cx="369" cy="347" r="4.5" fill="#38BDF8" />

        {/* Laptop in front of seated researcher */}
        <polygon points="350,345 385,345 390,360 345,360" fill="#334155" />
        <rect x="352" y="326" width="32" height="19" rx="2" fill="#0F172A" />
        <rect x="354" y="328" width="28" height="15" rx="1" fill="#FEF1CC" />
        <line x1="358" y1="334" x2="378" y2="334" stroke="#F9B129" strokeWidth="2" />
        <line x1="358" y1="338" x2="372" y2="338" stroke="#048444" strokeWidth="1.5" />

        {/* Head with safety glasses */}
        <circle cx="403" cy="285" r="13" fill="#F8B195" />
        <path d="M393 280 C393 268 413 268 413 280 Z" fill="#475569" />
        <rect x="396" y="282" width="13" height="7" rx="2" fill="#E0F2FE" fillOpacity="0.85" stroke="#0284C7" strokeWidth="1" />
      </g>

      {/* APPARATUS (RIGHT FOREGROUND): Analytical Digital Balance */}
      <g filter="url(#login-shadow)">
        {/* Balance base */}
        <rect x="425" y="350" width="55" height="28" rx="4" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1" />
        {/* Digital LED Display */}
        <rect x="432" y="365" width="40" height="9" rx="2" fill="#0F172A" />
        <text x="435" y="372" fontSize="6.5" fontWeight="bold" fill="#048444" fontFamily="monospace">14.2850 g</text>
        {/* Glass draft shield box on top of balance */}
        <rect x="430" y="318" width="44" height="32" rx="2" fill="#FFFFFF" fillOpacity="0.5" stroke="#94A3B8" strokeWidth="1" />
        {/* Metal weighing pan inside */}
        <rect x="442" y="344" width="20" height="3" rx="1" fill="#64748B" />
        {/* Watch glass with chemical crystals on weighing pan */}
        <ellipse cx="452" cy="342" rx="8" ry="2.5" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="0.8" />
        <circle cx="450" cy="341" r="1.5" fill="#F9B129" />
        <circle cx="454" cy="341" r="1.2" fill="#F9B129" />
      </g>
    </svg>
  );
}
