'use client';

import React from 'react';

type Tier = 'gold' | 'silver' | 'bronze' | 'zinc';

interface CrownCapProps {
  content?: string | null;
  tier?: Tier;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function CrownCap({ 
  content, 
  tier = 'zinc', 
  size = 'md',
  className = "" 
}: CrownCapProps) {
  
  // Size mapping
  const sizes = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-40 h-40',
    xl: 'w-56 h-56'
  };

  // Color mapping for gradients
  const gradients = {
    gold: {
      from: '#FDE047', // yellow-300
      via: '#CA8A04',  // yellow-600
      to: '#854D0E',   // yellow-800
      border: '#FEF08A'
    },
    silver: {
      from: '#E2E8F0', // slate-200
      via: '#94A3B8',  // slate-400
      to: '#475569',   // slate-600
      border: '#F1F5F9'
    },
    bronze: {
      from: '#FB923C', // orange-400
      via: '#C2410C',  // orange-700
      to: '#7C2D12',   // orange-900
      border: '#FFEDD5'
    },
    zinc: {
      from: '#3F3F46', // zinc-700
      via: '#18181B',  // zinc-900
      to: '#09090B',   // zinc-950
      border: '#71717A'
    }
  };

  const g = gradients[tier];

  // Generating the 21 rounded teeth path for a realistic crown cap
  const generateSerratedPath = () => {
    const teeth = 21;
    const outerRadius = 50;
    const innerRadius = 42; // Deeper for more character
    const center = 50;
    let path = "";

    for (let i = 0; i < teeth; i++) {
      const angle = (i * 2 * Math.PI) / teeth;
      const nextAngle = ((i + 1) * 2 * Math.PI) / teeth;
      const midAngle = angle + (Math.PI / teeth);

      // Outer point (the "peak" of the tooth)
      const x_outer = center + outerRadius * Math.cos(midAngle);
      const y_outer = center + outerRadius * Math.sin(midAngle);

      // Next inner point (the "valley")
      const x_inner_next = center + innerRadius * Math.cos(nextAngle);
      const y_inner_next = center + innerRadius * Math.sin(nextAngle);

      if (i === 0) {
        const x_start = center + innerRadius * Math.cos(angle);
        const y_start = center + innerRadius * Math.sin(angle);
        path += `M ${x_start} ${y_start}`;
      }

      // Use a Quadratic Bezier Curve to make the teeth rounded
      path += ` Q ${x_outer} ${y_outer} ${x_inner_next} ${y_inner_next}`;
    }
    path += " Z";
    return path;
  };

  const serratedPath = generateSerratedPath();

  return (
    <div className={`relative flex items-center justify-center select-none ${sizes[size]} ${className}`}>
      {/* External Glow based on Tier */}
      <div className={`absolute inset-0 rounded-full blur-xl opacity-20 transition-all duration-700 ${
        tier === 'gold' ? 'bg-yellow-500' : 
        tier === 'silver' ? 'bg-blue-300' : 
        tier === 'bronze' ? 'bg-orange-600' : 'bg-zinc-500'
      }`} />

      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl overflow-visible">
        <defs>
          <linearGradient id={`grad-${tier}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={g.from} />
            <stop offset="50%" stopColor={g.via} />
            <stop offset="100%" stopColor={g.to} />
          </linearGradient>
          
          <filter id="innerShadow">
            <feOffset dx="0" dy="2" />
            <feGaussianBlur stdDeviation="2" result="offset-blur" />
            <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
            <feFlood floodColor="black" floodOpacity="0.5" result="color" />
            <feComposite operator="in" in="color" in2="inverse" result="shadow" />
            <feComposite operator="over" in="shadow" in2="SourceGraphic" />
          </filter>
        </defs>

        {/* Outer Serrated Edge */}
        <path 
          d={serratedPath} 
          fill={`url(#grad-${tier})`}
          stroke={g.border}
          strokeWidth="0.5"
          className="transition-all duration-500"
        />

        {/* Central Inlay Area */}
        <circle 
          cx="50" cy="50" r="36" 
          fill="#09090B" 
          stroke={g.border}
          strokeWidth="0.5"
          filter="url(#innerShadow)"
        />
        
        {/* Subtle highlights on teeth */}
        <circle cx="50" cy="50" r="43" fill="none" stroke="white" strokeWidth="0.1" strokeDasharray="1, 4" opacity="0.3" />
      </svg>

      {/* Content Layer (Emoji or Image) */}
      <div className="absolute inset-0 flex items-center justify-center p-[20%]">
        {content ? (
          // If content is a hex color string, render a filled circle with that color.
          (typeof content === 'string' && content.startsWith('#')) ? (
            <div className="w-full h-full rounded-full overflow-hidden border border-zinc-800 shadow-inner">
              <div className="w-full h-full" style={{ background: content }} />
            </div>
          ) : content.length < 5 ? (
            <span 
              className="font-bold drop-shadow-md transition-all duration-300 animate-in zoom-in-50"
              style={{ fontSize: size === 'sm' ? '1.2rem' : size === 'md' ? '2.5rem' : size === 'lg' ? '4rem' : '6rem' }}
            >
              {content}
            </span>
          ) : (
            <div className="w-full h-full rounded-full overflow-hidden border border-zinc-800 shadow-inner">
              <img src={content} alt="Cap Icon" className="w-full h-full object-cover" />
            </div>
          )
        ) : (
          <div className="w-full h-full rounded-full bg-zinc-900/50 flex items-center justify-center border border-zinc-800/30">
            <span className="text-zinc-800 font-black text-[8px] uppercase tracking-tighter">Empty</span>
          </div>
        )}
      </div>
    </div>
  );
}
