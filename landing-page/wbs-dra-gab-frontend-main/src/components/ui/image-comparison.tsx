import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface ImageComparisonProps {
  beforeImage: string;
  afterImage: string;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  beforePosition?: string;
  afterPosition?: string;
}

export function ImageComparison({ beforeImage, afterImage, onInteractionStart, onInteractionEnd, beforePosition = "center", afterPosition = "center" }: ImageComparisonProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const position = ((x - rect.left) / rect.width) * 100;
    
    setSliderPosition(Math.max(0, Math.min(100, position)));
  };

  const handleMouseEnter = () => {
    onInteractionStart?.();
  };

  const handleMouseLeave = () => {
    onInteractionEnd?.();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    onInteractionStart?.();
    handleMove(e);
  };

  return (
    <div 
      ref={containerRef}
      className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl cursor-ew-resize select-none border border-white/5 bg-neutral-900 touch-none"
      onMouseMove={handleMove}
      onTouchMove={handleMove}
      onTouchStart={handleTouchStart}
      onTouchEnd={onInteractionEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* After Image */}
      <div className="absolute inset-0">
        <img 
          src={afterImage} 
          alt="Depois" 
          className="w-full h-full object-cover"
          style={{ objectPosition: afterPosition }}
        />
        <div className="absolute top-4 right-4 bg-accent/80 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-bold text-white uppercase tracking-widest border border-white/10">
          Depois
        </div>
      </div>

      {/* Before Image (clipped) */}
      <div 
        className="absolute inset-0 transition-none"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img 
          src={beforeImage} 
          alt="Antes" 
          className="w-full h-full object-cover"
          style={{ objectPosition: beforePosition }}
        />
        <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-bold text-white uppercase tracking-widest border border-white/10">
          Antes
        </div>
      </div>

      {/* Slider Handle - Refined & Lighter */}
      <div 
        className="absolute inset-y-0 w-px bg-white/30 backdrop-blur-sm transition-none pointer-events-none"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-2xl">
          <div className="flex gap-1">
            <div className="w-0.5 h-2 bg-white/60 rounded-full" />
            <div className="w-0.5 h-2 bg-white/60 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
