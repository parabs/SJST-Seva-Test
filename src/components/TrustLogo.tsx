import React from 'react';

interface TrustLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
}

export function TrustLogo({ className = 'w-14 h-14', size }: TrustLogoProps) {
  const style = size ? { width: size, height: size } : undefined;
  const [customLogo, setCustomLogo] = React.useState<string | null>(() => {
    return localStorage.getItem('sjst_custom_logo') || null;
  });
  const [logoFailed, setLogoFailed] = React.useState(false);
  const [defaultLogoFailed, setDefaultLogoFailed] = React.useState(false);

  React.useEffect(() => {
    const handleStorage = () => {
      setCustomLogo(localStorage.getItem('sjst_custom_logo'));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  if (customLogo && !logoFailed) {
    return (
      <div className={`inline-flex items-center justify-center shrink-0 ${className}`} style={style}>
        <img
          src={customLogo}
          alt="Shree Jagannath Seva Trust Logo"
          onError={() => setLogoFailed(true)}
          className="w-full h-full object-contain drop-shadow-xs"
        />
      </div>
    );
  }

  if (!defaultLogoFailed) {
    return (
      <div className={`inline-flex items-center justify-center shrink-0 ${className}`} style={style}>
        <img
          src={`${import.meta.env.BASE_URL}images/Logo.jpeg`}
          alt="Shree Jagannath Seva Trust Logo"
          onError={() => setDefaultLogoFailed(true)}
          className="w-full h-full object-contain drop-shadow-xs"
        />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center justify-center shrink-0 ${className}`} style={style}>
      <svg
        viewBox="0 0 500 500"
        className="w-full h-full drop-shadow-xs"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Circular Text Path for Top Arc */}
          <path
            id="topTextArc"
            d="M 65,250 A 185,185 0 1,1 435,250"
            fill="none"
          />

          {/* Glowing Flame Gradient for Diya */}
          <linearGradient id="flameGrad" x1="0.5" y1="1" x2="0.5" y2="0">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>

          {/* Diya Base Terracotta Gradient */}
          <linearGradient id="diyaGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="50%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#451a03" />
          </linearGradient>

          {/* Petal Gradient */}
          <linearGradient id="petalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>

          {/* Green Hands Gradient */}
          <linearGradient id="handGrad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>

        {/* 1. TOP CIRCULAR ARCHED TRUST NAME */}
        <text
          fill="#ea580c"
          fontSize="31"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="4"
        >
          <textPath href="#topTextArc" startOffset="50%" textAnchor="middle">
            SHREE JAGANNATH SEVA TRUST
          </textPath>
        </text>

        {/* 2. SUNBURST 12 GOLDEN PETALS */}
        <g transform="translate(250, 225)">
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => (
            <path
              key={i}
              d="M 0,-115 C 24,-115 38,-78 28,-50 C 18,-20 -18,-20 -28,-50 C -38,-78 -24,-115 0,-115 Z"
              fill="url(#petalGrad)"
              stroke="#b45309"
              strokeWidth="2.5"
              transform={`rotate(${angle})`}
            />
          ))}
        </g>

        {/* 3. LORD JAGANNATH SACRED FACE */}
        {/* Black Face Base */}
        <circle cx="250" cy="225" r="70" fill="#1c1917" stroke="#b45309" strokeWidth="2.5" />

        {/* Top Forehead Sacred U-Tilak (Chandan) */}
        <path
          d="M 242,168 L 242,192 C 242,197 258,197 258,192 L 258,168 Z"
          fill="#fef08a"
          stroke="#ca8a04"
          strokeWidth="1.5"
        />
        {/* Red Flame/Bindu in Tilak */}
        <ellipse cx="250" cy="182" rx="3.5" ry="6" fill="#dc2626" />

        {/* Beaded Decorative Forehead Arc */}
        <g fill="#fde047">
          {[-45, -35, -25, -15, -5, 5, 15, 25, 35, 45].map((x, i) => (
            <circle key={i} cx={250 + x} cy={195 - Math.abs(x) * 0.15} r="2.2" />
          ))}
        </g>

        {/* Red Facial Markings / Crescent Wings above eyes */}
        <path
          d="M 195,200 Q 250,222 305,200 Q 250,212 195,200 Z"
          fill="#dc2626"
        />

        {/* White Eye Outline Bridge */}
        <path
          d="M 218,222 C 218,206 250,206 250,222 C 250,206 282,206 282,222 C 282,238 250,238 250,222 C 250,238 218,238 218,222 Z"
          fill="#ffffff"
          opacity="0.2"
        />

        {/* LEFT EYE (Devotee's left / Viewer's left) */}
        <circle cx="222" cy="225" r="22" fill="#ffffff" stroke="#1c1917" strokeWidth="1" />
        <circle cx="222" cy="225" r="13" fill="#dc2626" />
        <circle cx="222" cy="225" r="7.5" fill="#000000" />
        <circle cx="225" cy="222" r="2.5" fill="#ffffff" />

        {/* RIGHT EYE */}
        <circle cx="278" cy="225" r="22" fill="#ffffff" stroke="#1c1917" strokeWidth="1" />
        <circle cx="278" cy="225" r="13" fill="#dc2626" />
        <circle cx="278" cy="225" r="7.5" fill="#000000" />
        <circle cx="275" cy="222" r="2.5" fill="#ffffff" />

        {/* Golden Nose Nath / Nose Ring with White Pearls */}
        <circle cx="238" cy="254" r="5" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
        <path d="M 233,256 C 230,264 238,272 235,274" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        <circle cx="235" cy="274" r="2.5" fill="#ffffff" />

        {/* Lower Red Smile / Mouth */}
        <path
          d="M 216,264 C 230,278 270,278 284,264 C 284,272 268,284 250,284 C 232,284 216,272 216,264 Z"
          fill="#dc2626"
        />
        {/* Divine Smile Teeth Strip */}
        <path
          d="M 226,267 Q 250,275 274,267"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* 4. SJST TEAL CURVED LETTERS */}
        <g fill="#0f766e" fontWeight="900" fontSize="46" fontFamily="system-ui, -apple-system, sans-serif">
          <text x="135" y="360" transform="rotate(-20 135 360)">S</text>
          <text x="195" y="380" transform="rotate(-8 195 380)">J</text>
          <text x="260" y="382" transform="rotate(8 260 382)">S</text>
          <text x="325" y="360" transform="rotate(22 325 360)">T</text>
        </g>

        {/* 5. TWO GREEN STYLIZED HANDS / LEAF EMBRACES */}
        {/* Left Hand */}
        <path
          d="M 68,285 C 72,350 115,405 190,430 C 135,400 102,345 104,300 C 104,315 115,355 140,380 C 115,350 104,310 106,290 Z"
          fill="#16a34a"
        />
        {/* Right Hand */}
        <path
          d="M 432,285 C 428,350 385,405 310,430 C 365,400 398,345 396,300 C 396,315 385,355 360,380 C 385,350 396,310 394,290 Z"
          fill="#16a34a"
        />

        {/* 6. BOTTOM CENTER TRADITIONAL DIYA (OIL LAMP) */}
        {/* Diya Base */}
        <path
          d="M 220,418 C 220,438 280,438 280,418 C 265,423 235,423 220,418 Z"
          fill="url(#diyaGrad)"
          stroke="#451a03"
          strokeWidth="1.5"
        />
        <ellipse cx="250" cy="418" rx="28" ry="6" fill="#78350f" stroke="#ca8a04" strokeWidth="1" />
        
        {/* Decorative Diya Dots */}
        <circle cx="242" cy="425" r="1.5" fill="#fde047" />
        <circle cx="250" cy="426" r="1.5" fill="#fde047" />
        <circle cx="258" cy="425" r="1.5" fill="#fde047" />

        {/* Diya Flame Outer */}
        <path
          d="M 250,380 C 262,398 264,414 250,416 C 236,414 238,398 250,380 Z"
          fill="#ea580c"
        />
        {/* Diya Flame Middle (Golden) */}
        <path
          d="M 250,385 C 258,400 259,413 250,415 C 241,413 242,400 250,385 Z"
          fill="#fbbf24"
        />
        {/* Diya Flame Inner Glow (White Core) */}
        <ellipse cx="250" cy="405" rx="3" ry="7" fill="#ffffff" opacity="0.9" />
      </svg>
    </div>
  );
}
