import Image from "next/image";
import { useState, useEffect } from "react";

export default function Logo({ 
  className = "w-8 h-8", 
  showText = true,
  textSize = "text-xl",
  useImage = true,
  imageSrc = "/brand/logo.svg",
  overrideText
}: { 
  className?: string; 
  showText?: boolean;
  textSize?: string;
  useImage?: boolean;
  imageSrc?: string;
  overrideText?: string;
}) {
  const [imgSrc, setImgSrc] = useState(imageSrc);
  const [hasError, setHasError] = useState(false);

  // Update internal state when prop changes
  useEffect(() => {
    setImgSrc(imageSrc);
    setHasError(false);
  }, [imageSrc]);

  return (
    <div className="flex items-center gap-3 select-none">
      <div className={`relative flex items-center justify-center ${className}`}>
        {useImage ? (
          (!hasError && imgSrc && (imgSrc.startsWith('http') || imgSrc.startsWith('blob'))) ? (
            /* Standard img tag for external/storage logos to avoid Next.js Image optimization issues on local dev */
            <img
              src={imgSrc}
              alt={overrideText || "BotlLab"}
              className="w-full h-full object-contain"
              onError={() => {
                console.error("Logo (img) failed to load:", imgSrc);
                setHasError(true);
              }}
            />
          ) : (
            <Image
              src={hasError || !imgSrc ? "/brand/logo.svg" : imgSrc}
              alt={overrideText || "BotlLab"}
              fill
              sizes="48px"
              className="object-contain"
              priority
              onError={() => {
                console.error("Logo (Image) failed to load:", imgSrc);
                setHasError(true);
              }}
            />
          )
        ) : (
          <div className="relative flex items-center justify-center bg-brand/10 border border-brand/20 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.15)] w-full h-full">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="w-3/5 h-3/5 text-brand"
            >
              <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
              <path d="M8.5 2h7" />
              <path d="M7 16h10" />
            </svg>
          </div>
        )}
      </div>
      
      {showText && (
        <span className={`font-bold tracking-tighter text-foreground ${textSize}`}>
          {overrideText ? (
            overrideText
          ) : (
            <>Botl<span className="text-brand">Lab</span></>
          )}
        </span>
      )}
    </div>
  );
}
