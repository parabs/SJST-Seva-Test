import React, { useState, useEffect } from 'react';

interface MaaDurgaWatermarkProps {
  className?: string;
  opacity?: number;
  size?: 'sm' | 'md' | 'lg' | 'receipt' | 'full';
  monochrome?: boolean;
  customImageUrl?: string;
}

export function MaaDurgaWatermark({
  className = '',
  opacity = 0.22,
  size = 'md',
  monochrome = false,
  customImageUrl
}: MaaDurgaWatermarkProps) {
  const [activeImage, setActiveImage] = useState<string | null>(() => {
    if (customImageUrl) return customImageUrl;
    return localStorage.getItem('sjst_custom_watermark') || `${import.meta.env.BASE_URL}images/Watermark.jpeg`;
  });
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  useEffect(() => {
    if (customImageUrl) {
      setActiveImage(customImageUrl);
      setImageLoadFailed(false);
      return;
    }
    const saved = localStorage.getItem('sjst_custom_watermark');
    if (saved) {
      setActiveImage(saved);
      setImageLoadFailed(false);
    } else {
      setActiveImage(`${import.meta.env.BASE_URL}images/Watermark.jpeg`);
    }

    const handleStorage = () => {
      const updated = localStorage.getItem('sjst_custom_watermark');
      if (updated) {
        setActiveImage(updated);
        setImageLoadFailed(false);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [customImageUrl]);

  // Determine sizing
  const sizeClasses = {
    sm: 'w-48 h-48',
    md: 'w-72 h-72 sm:w-96 sm:h-96',
    lg: 'w-[450px] h-[450px] sm:w-[600px] sm:h-[600px]',
    receipt: 'w-auto h-[90%] max-h-[290px] aspect-[3/4]',
    full: 'w-full h-full max-w-2xl max-h-[85vh]'
  }[size];

  // If a custom photo image / Watermark.jpeg is specified and hasn't errored out
  if (activeImage && !imageLoadFailed) {
    return (
      <div 
        className={`pointer-events-none select-none flex items-center justify-center ${className}`}
        style={{ opacity }}
        aria-hidden="true"
      >
        <img
          src={activeImage}
          alt="Maa Durga Watermark"
          onError={() => {
            setImageLoadFailed(true);
          }}
          className={`${sizeClasses} object-contain mix-blend-multiply transition-opacity duration-300 filter contrast-125`}
        />
      </div>
    );
  }

  // Authentic, lifelike rendered portrait of Shree Jagannath Seva Trust Maa Durga Idol
  return (
    <div 
      className={`pointer-events-none select-none flex items-center justify-center ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 500 660"
        preserveAspectRatio="xMidYMid meet"
        className={`${sizeClasses} object-contain transition-opacity duration-300`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Rich Gold Mukut Gradient */}
          <linearGradient id="durgaGold1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={monochrome ? '#64748b' : '#fef08a'} />
            <stop offset="30%" stopColor={monochrome ? '#94a3b8' : '#f59e0b'} />
            <stop offset="70%" stopColor={monochrome ? '#475569' : '#d97706'} />
            <stop offset="100%" stopColor={monochrome ? '#334155' : '#b45309'} />
          </linearGradient>

          {/* Glowing Divine Face Gradient (Golden Idol Skin) */}
          <radialGradient id="durgaFaceSkin" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor={monochrome ? '#f8fafc' : '#fef3c7'} />
            <stop offset="60%" stopColor={monochrome ? '#e2e8f0' : '#fed778'} />
            <stop offset="100%" stopColor={monochrome ? '#cbd5e1' : '#f59e0b'} />
          </radialGradient>

          {/* Prabhavali Radiant Aura */}
          <radialGradient id="prabhavaliAura" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor={monochrome ? '#cbd5e1' : '#fef9c3'} stopOpacity="0.85" />
            <stop offset="50%" stopColor={monochrome ? '#94a3b8' : '#fde047'} stopOpacity="0.45" />
            <stop offset="85%" stopColor={monochrome ? '#64748b' : '#d97706'} stopOpacity="0.2" />
            <stop offset="100%" stopColor={monochrome ? '#475569' : '#92400e'} stopOpacity="0" />
          </radialGradient>

          {/* Marigold Orange & Yellow Gradients */}
          <radialGradient id="marigoldYellow" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor={monochrome ? '#e2e8f0' : '#fef08a'} />
            <stop offset="60%" stopColor={monochrome ? '#94a3b8' : '#eab308'} />
            <stop offset="100%" stopColor={monochrome ? '#475569' : '#ca8a04'} />
          </radialGradient>

          <radialGradient id="marigoldOrange" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor={monochrome ? '#cbd5e1' : '#fdba74'} />
            <stop offset="60%" stopColor={monochrome ? '#64748b' : '#f97316'} />
            <stop offset="100%" stopColor={monochrome ? '#334155' : '#c2410c'} />
          </radialGradient>

          {/* Purple Orchid / Lotus Gradient */}
          <radialGradient id="purpleOrchid" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor={monochrome ? '#e2e8f0' : '#f0abfc'} />
            <stop offset="60%" stopColor={monochrome ? '#94a3b8' : '#c026d3'} />
            <stop offset="100%" stopColor={monochrome ? '#475569' : '#701a75'} />
          </radialGradient>

          {/* Trishul Metallic Silver */}
          <linearGradient id="trishulSilver" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="40%" stopColor="#94a3b8" />
            <stop offset="70%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
        </defs>

        {/* 1. Outer Golden Prabhavali (Radiant Halo / Daak Saj Arch) */}
        <g id="prabhavaliHalo">
          <circle cx="250" cy="240" r="230" fill="url(#prabhavaliAura)" />
          
          {/* Radiant Arched Filigree Halo Behind Mukut */}
          <path
            d="M 60 300 C 60 120, 440 120, 440 300 C 410 320, 390 280, 370 240 C 330 150, 170 150, 130 240 C 110 280, 90 320, 60 300 Z"
            fill="url(#durgaGold1)"
            stroke={monochrome ? '#334155' : '#78350f'}
            strokeWidth="1.5"
            opacity="0.8"
          />

          {/* Ornate Halo Rays */}
          {[...Array(20)].map((_, i) => {
            const angle = -80 + i * 8.4;
            const rad = (angle * Math.PI) / 180;
            const x1 = 250 + Math.cos(rad) * 200;
            const y1 = 240 + Math.sin(rad) * 200;
            const x2 = 250 + Math.cos(rad) * 230;
            const y2 = 240 + Math.sin(rad) * 230;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={monochrome ? '#64748b' : '#d97706'}
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.7"
              />
            );
          })}
        </g>

        {/* 2. Flowing Jet-Black Hair Locks Framing Face & Shoulders */}
        <g id="keshHair">
          {/* Left Hair Cascade */}
          <path
            d="M 170 200 C 140 230, 120 300, 110 440 C 130 450, 150 380, 160 300 C 170 260, 170 220, 170 200 Z"
            fill={monochrome ? '#1e293b' : '#09090b'}
          />
          <path
            d="M 150 250 C 125 310, 105 390, 95 490 C 120 500, 140 430, 150 350 Z"
            fill={monochrome ? '#0f172a' : '#18181b'}
          />

          {/* Right Hair Cascade */}
          <path
            d="M 330 200 C 360 230, 380 300, 390 440 C 370 450, 350 380, 340 300 C 330 260, 330 220, 330 200 Z"
            fill={monochrome ? '#1e293b' : '#09090b'}
          />
          <path
            d="M 350 250 C 375 310, 395 390, 405 490 C 380 500, 360 430, 350 350 Z"
            fill={monochrome ? '#0f172a' : '#18181b'}
          />
        </g>

        {/* 3. Splendid Multi-Tiered Golden Mukut (Crown) with Filigree & Daak Saaj */}
        <g id="goldenMukut">
          {/* Wide Upper Crown Wing Arches */}
          <path
            d="M 160 210 C 110 170, 70 110, 100 40 C 130 70, 160 130, 200 160 Z"
            fill="url(#durgaGold1)"
            stroke={monochrome ? '#334155' : '#78350f'}
            strokeWidth="1.5"
          />
          <path
            d="M 340 210 C 390 170, 430 110, 400 40 C 370 70, 340 130, 300 160 Z"
            fill="url(#durgaGold1)"
            stroke={monochrome ? '#334155' : '#78350f'}
            strokeWidth="1.5"
          />

          {/* Central Tiered Majestic Crown Peak */}
          <path
            d="M 160 220 C 160 150, 200 70, 250 20 C 300 70, 340 150, 340 220 C 300 230, 200 230, 160 220 Z"
            fill="url(#durgaGold1)"
            stroke={monochrome ? '#1e293b' : '#78350f'}
            strokeWidth="2"
          />

          {/* Crown Filigree Patterns & Nested Arches */}
          <path
            d="M 180 215 C 180 160, 210 100, 250 55 C 290 100, 320 160, 320 215 Z"
            fill="url(#durgaGold1)"
            stroke={monochrome ? '#475569' : '#92400e'}
            strokeWidth="1.5"
            opacity="0.9"
          />

          <path
            d="M 200 210 C 200 170, 220 120, 250 85 C 280 120, 300 170, 300 210 Z"
            fill="url(#durgaGold1)"
            stroke={monochrome ? '#475569' : '#b45309'}
            strokeWidth="1.2"
          />

          {/* Top Ruby Finial & Kalash */}
          <circle cx="250" cy="18" r="8" fill={monochrome ? '#334155' : '#dc2626'} stroke="url(#durgaGold1)" strokeWidth="2" />
          <path d="M 246 10 L 250 0 L 254 10 Z" fill="url(#durgaGold1)" />

          {/* Crown Studded Rubies & Emerald Jewels */}
          <circle cx="250" cy="65" r="6" fill={monochrome ? '#475569' : '#dc2626'} stroke="#fef08a" strokeWidth="1" />
          <circle cx="250" cy="110" r="7" fill={monochrome ? '#475569' : '#059669'} stroke="#fef08a" strokeWidth="1" />
          <circle cx="250" cy="155" r="8" fill={monochrome ? '#475569' : '#dc2626'} stroke="#fef08a" strokeWidth="1.2" />
          <circle cx="215" cy="140" r="5.5" fill={monochrome ? '#475569' : '#059669'} />
          <circle cx="285" cy="140" r="5.5" fill={monochrome ? '#475569' : '#059669'} />
          <circle cx="190" cy="175" r="5" fill={monochrome ? '#475569' : '#dc2626'} />
          <circle cx="310" cy="175" r="5" fill={monochrome ? '#475569' : '#dc2626'} />

          {/* Matha Patti / Forehead Crown Band */}
          <path
            d="M 160 220 C 205 240, 295 240, 340 220 L 338 238 C 295 258, 205 258, 162 238 Z"
            fill="url(#durgaGold1)"
            stroke={monochrome ? '#1e293b' : '#78350f'}
            strokeWidth="1.8"
          />

          {/* Hanging Golden Pearls from Forehead Band */}
          {[...Array(13)].map((_, i) => {
            const cx = 178 + i * 12;
            const cy = 244 + Math.sin((i / 12) * Math.PI) * 6;
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r="2.8"
                fill={monochrome ? '#f8fafc' : '#fef08a'}
                stroke={monochrome ? '#334155' : '#92400e'}
                strokeWidth="0.8"
              />
            );
          })}
        </g>

        {/* 4. Divine Face of Maa Durga (Golden Glow, Serene Expression) */}
        <g id="durgaFace">
          {/* Face Contour Oval */}
          <path
            d="M 170 235 C 155 295, 170 370, 250 405 C 330 370, 345 295, 330 235 C 290 252, 210 252, 170 235 Z"
            fill="url(#durgaFaceSkin)"
            stroke={monochrome ? '#1e293b' : '#78350f'}
            strokeWidth="2.2"
          />

          {/* Ornate Large Golden Ear Ornaments (Kaan-Pasha / Jhumkas) */}
          {/* Left Ear Ring */}
          <circle cx="145" cy="305" r="22" fill="url(#durgaGold1)" stroke={monochrome ? '#1e293b' : '#78350f'} strokeWidth="1.8" />
          <circle cx="145" cy="305" r="14" fill={monochrome ? '#334155' : '#dc2626'} />
          <circle cx="145" cy="305" r="6" fill="url(#durgaGold1)" />
          <circle cx="145" cy="335" r="7" fill="url(#durgaGold1)" stroke={monochrome ? '#1e293b' : '#92400e'} strokeWidth="1" />

          {/* Right Ear Ring */}
          <circle cx="355" cy="305" r="22" fill="url(#durgaGold1)" stroke={monochrome ? '#1e293b' : '#78350f'} strokeWidth="1.8" />
          <circle cx="355" cy="305" r="14" fill={monochrome ? '#334155' : '#dc2626'} />
          <circle cx="355" cy="305" r="6" fill="url(#durgaGold1)" />
          <circle cx="355" cy="335" r="7" fill="url(#durgaGold1)" stroke={monochrome ? '#1e293b' : '#92400e'} strokeWidth="1" />

          {/* Forehead Chandan & Red Kumkum Bindi */}
          <circle cx="250" cy="270" r="8" fill={monochrome ? '#0f172a' : '#dc2626'} />
          <circle cx="250" cy="270" r="3.5" fill={monochrome ? '#f8fafc' : '#fef08a'} />

          {/* Trinetra (Third Eye of Wisdom) on Forehead */}
          <path
            d="M 250 250 C 242 258, 242 266, 250 274 C 258 266, 258 258, 250 250 Z"
            fill={monochrome ? '#0f172a' : '#b91c1c'}
            stroke={monochrome ? '#475569' : '#f59e0b'}
            strokeWidth="1.2"
          />
          <circle cx="250" cy="262" r="2.5" fill={monochrome ? '#f8fafc' : '#fef08a'} />

          {/* Fine Sandalwood Chandan Filigree Pattern across Forehead */}
          {[...Array(7)].map((_, i) => {
            const offset = (i - 3) * 11;
            if (offset === 0) return null;
            return (
              <circle
                key={i}
                cx={250 + offset}
                cy={258 + Math.abs(offset) * 0.2}
                r="1.8"
                fill={monochrome ? '#cbd5e1' : '#fef08a'}
              />
            );
          })}

          {/* Gracefully Arched Eyebrows (Kajal Drawn) */}
          <path
            d="M 188 285 C 205 272, 226 273, 240 282"
            fill="none"
            stroke={monochrome ? '#0f172a' : '#09090b'}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 312 285 C 295 272, 274 273, 260 282"
            fill="none"
            stroke={monochrome ? '#0f172a' : '#09090b'}
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Large Almond-Shaped Divine Lotus Eyes (Padmapalash Lochana) */}
          {/* Left Eye */}
          <g id="leftDurgaEye">
            <path
              d="M 185 296 C 205 284, 228 286, 242 298 C 226 310, 202 308, 185 296 Z"
              fill="#ffffff"
              stroke={monochrome ? '#0f172a' : '#09090b'}
              strokeWidth="2.5"
            />
            {/* Iris & Pupil */}
            <circle cx="214" cy="297" r="6.5" fill={monochrome ? '#0f172a' : '#09090b'} />
            <circle cx="216" cy="295" r="2.2" fill="#ffffff" />
            {/* Extended Kajal Liner Wings */}
            <path d="M 185 296 C 177 293, 172 291, 168 293" fill="none" stroke={monochrome ? '#0f172a' : '#09090b'} strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 242 298 C 246 300, 250 301, 253 300" fill="none" stroke={monochrome ? '#0f172a' : '#09090b'} strokeWidth="1.8" strokeLinecap="round" />
          </g>

          {/* Right Eye */}
          <g id="rightDurgaEye">
            <path
              d="M 315 296 C 295 284, 272 286, 258 298 C 274 310, 298 308, 315 296 Z"
              fill="#ffffff"
              stroke={monochrome ? '#0f172a' : '#09090b'}
              strokeWidth="2.5"
            />
            {/* Iris & Pupil */}
            <circle cx="286" cy="297" r="6.5" fill={monochrome ? '#0f172a' : '#09090b'} />
            <circle cx="284" cy="295" r="2.2" fill="#ffffff" />
            {/* Extended Kajal Liner Wings */}
            <path d="M 315 296 C 323 293, 328 291, 332 293" fill="none" stroke={monochrome ? '#0f172a' : '#09090b'} strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 258 298 C 254 300, 250 301, 247 300" fill="none" stroke={monochrome ? '#0f172a' : '#09090b'} strokeWidth="1.8" strokeLinecap="round" />
          </g>

          {/* Slender Nose & Traditional Ornate Nath (Nose Ring) */}
          <path
            d="M 250 282 C 247 304, 241 328, 245 336 C 248 338, 253 338, 255 336"
            fill="none"
            stroke={monochrome ? '#334155' : '#92400e'}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path d="M 241 336 C 238 334, 236 336, 238 338" fill="none" stroke={monochrome ? '#334155' : '#92400e'} strokeWidth="1.8" />
          <path d="M 259 336 C 262 334, 264 336, 262 338" fill="none" stroke={monochrome ? '#334155' : '#92400e'} strokeWidth="1.8" />

          {/* Traditional Golden Nose Ring (Nath) on Devotee's Left */}
          <circle
            cx="237"
            cy="336"
            r="16"
            fill="none"
            stroke="url(#durgaGold1)"
            strokeWidth="2.2"
          />
          <circle cx="224" cy="328" r="3" fill={monochrome ? '#475569' : '#dc2626'} />
          <circle cx="221" cy="339" r="2.8" fill={monochrome ? '#f8fafc' : '#fef08a'} />
          {/* Nath Chain Connecting to Ear */}
          <path
            d="M 223 328 C 198 318, 168 312, 147 308"
            fill="none"
            stroke="url(#durgaGold1)"
            strokeWidth="1.2"
            strokeDasharray="3 4"
          />

          {/* Serene Divine Smile (Vermilion Red Lips) */}
          <path
            d="M 230 360 C 240 357, 250 361, 260 357 C 270 361, 260 376, 250 376 C 240 376, 230 366, 230 360 Z"
            fill={monochrome ? '#475569' : '#dc2626'}
            stroke={monochrome ? '#1e293b' : '#991b1b'}
            strokeWidth="1.8"
          />
          {/* Lower Lip Sheen */}
          <path
            d="M 235 362 C 242 359, 250 363, 258 359 C 265 363, 258 371, 250 371 C 242 371, 235 366, 235 362 Z"
            fill={monochrome ? '#64748b' : '#ef4444'}
          />

          {/* Kantha / Neck lines */}
          <path d="M 242 388 C 247 391, 253 391, 258 388" fill="none" stroke={monochrome ? '#94a3b8' : '#d97706'} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 225 415 C 241 424, 259 424, 275 415" fill="none" stroke={monochrome ? '#94a3b8' : '#d97706'} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 218 428 C 239 438, 261 438, 282 428" fill="none" stroke={monochrome ? '#94a3b8' : '#d97706'} strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* 5. Ornate Necklaces & Golden Hansuli Choker */}
        <g id="durgaJewelry">
          {/* Broad Temple Choker (Hansuli) */}
          <path
            d="M 188 418 C 220 455, 280 455, 312 418 L 318 440 C 280 480, 220 480, 182 440 Z"
            fill="url(#durgaGold1)"
            stroke={monochrome ? '#1e293b' : '#78350f'}
            strokeWidth="1.8"
          />
          {/* Choker Gemstones */}
          {[...Array(9)].map((_, i) => (
            <circle
              key={i}
              cx={202 + i * 12}
              cy={434 + Math.sin((i / 8) * Math.PI) * 8}
              r="2.8"
              fill={i % 2 === 0 ? (monochrome ? '#475569' : '#dc2626') : (monochrome ? '#64748b' : '#059669')}
            />
          ))}

          {/* Layered Long Golden Haar */}
          <path
            d="M 160 445 C 205 520, 295 520, 340 445"
            fill="none"
            stroke="url(#durgaGold1)"
            strokeWidth="3.5"
          />
          {/* Central Sun Medallion */}
          <circle cx="250" cy="515" r="18" fill="url(#durgaGold1)" stroke={monochrome ? '#1e293b' : '#78350f'} strokeWidth="2" />
          <circle cx="250" cy="515" r="10" fill={monochrome ? '#334155' : '#dc2626'} />
          <circle cx="250" cy="515" r="4" fill="url(#durgaGold1)" />

          {/* Golden Saree Zari Embroidery Across Shoulders */}
          <path
            d="M 120 460 C 180 500, 320 500, 380 460 L 400 580 C 310 630, 190 630, 100 580 Z"
            fill="url(#durgaGold1)"
            opacity="0.85"
            stroke={monochrome ? '#1e293b' : '#92400e'}
            strokeWidth="1.5"
          />
        </g>

        {/* 6. Sacred Marigold & Purple Orchid Puja Garlands (Genda Phool Mala) */}
        <g id="flowerGarlands">
          {/* Left Shoulder Cascade */}
          {[...Array(9)].map((_, i) => {
            const cx = 145 - i * 5;
            const cy = 360 + i * 28;
            const isYellow = i % 3 === 0;
            const isOrange = i % 3 === 1;
            const grad = isYellow ? 'url(#marigoldYellow)' : (isOrange ? 'url(#marigoldOrange)' : 'url(#purpleOrchid)');
            return (
              <g key={`left-flower-${i}`}>
                <circle cx={cx} cy={cy} r="14" fill={grad} stroke={monochrome ? '#334155' : '#78350f'} strokeWidth="0.8" />
                <circle cx={cx} cy={cy} r="7" fill={isYellow ? '#fef08a' : (isOrange ? '#fdba74' : '#f0abfc')} opacity="0.8" />
                {/* Green Leaf Accent */}
                {i % 2 === 0 && (
                  <path
                    d={`M ${cx - 14} ${cy} C ${cx - 24} ${cy - 8}, ${cx - 24} ${cy + 8}, ${cx - 14} ${cy} Z`}
                    fill={monochrome ? '#475569' : '#15803d'}
                  />
                )}
              </g>
            );
          })}

          {/* Right Shoulder Cascade */}
          {[...Array(9)].map((_, i) => {
            const cx = 355 + i * 5;
            const cy = 360 + i * 28;
            const isYellow = i % 3 === 0;
            const isOrange = i % 3 === 1;
            const grad = isYellow ? 'url(#marigoldYellow)' : (isOrange ? 'url(#marigoldOrange)' : 'url(#purpleOrchid)');
            return (
              <g key={`right-flower-${i}`}>
                <circle cx={cx} cy={cy} r="14" fill={grad} stroke={monochrome ? '#334155' : '#78350f'} strokeWidth="0.8" />
                <circle cx={cx} cy={cy} r="7" fill={isYellow ? '#fef08a' : (isOrange ? '#fdba74' : '#f0abfc')} opacity="0.8" />
                {/* Green Leaf Accent */}
                {i % 2 === 0 && (
                  <path
                    d={`M ${cx + 14} ${cy} C ${cx + 24} ${cy - 8}, ${cx + 24} ${cy + 8}, ${cx + 14} ${cy} Z`}
                    fill={monochrome ? '#475569' : '#15803d'}
                  />
                )}
              </g>
            );
          })}
        </g>

        {/* 7. Sacred Silver Trishul (Trident) Held Diagonally Across Left Chest */}
        <g id="trishulTrident">
          {/* Main Trishul Pole */}
          <line
            x1="100"
            y1="590"
            x2="210"
            y2="340"
            stroke="url(#trishulSilver)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <line
            x1="98"
            y1="588"
            x2="208"
            y2="338"
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.8"
          />
          {/* Trishul Prongs (Center & Side Blades) */}
          <path
            d="M 210 340 L 222 312 L 225 316 L 213 344 Z"
            fill="url(#trishulSilver)"
          />
          <path
            d="M 207 334 C 196 330, 192 318, 196 308 C 202 318, 206 326, 210 334 Z"
            fill="url(#trishulSilver)"
          />
          <path
            d="M 215 348 C 226 344, 230 332, 226 322 C 220 332, 216 340, 212 348 Z"
            fill="url(#trishulSilver)"
          />
        </g>

        {/* Traditional Watermark Ribbon Banner */}
        <g id="shreeDurgaLabel" opacity="0.6">
          <text
            x="250"
            y="640"
            textAnchor="middle"
            fontFamily="serif"
            fontSize="14"
            fontWeight="bold"
            letterSpacing="3"
            fill={monochrome ? '#334155' : '#78350f'}
          >
            ॥ श्री दुर्गार्पणमस्तु ॥
          </text>
        </g>
      </svg>
    </div>
  );
}
