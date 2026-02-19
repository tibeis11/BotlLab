import React from 'react';

export const PhaseCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`pt-2 md:p-0 mb-8 ${className}`}>
    {children}
  </div>
);

export const PhaseTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">{children}</h2>
);

export const PhaseDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-zinc-400 text-base mb-8 max-w-2xl">{children}</p>
);

type InputFieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label?: string };

export const InputField = ({ label, ...props }: InputFieldProps) => (
    <div>
        {label && <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-wider">{label}</label>}
        <input 
            {...props}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 transition text-base font-mono placeholder:text-zinc-700" 
        />
    </div>
);
