"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

export function Tooltip({ children, content, side = "right", className }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const sideClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    right: "left-[87.5%] top-1/2 -translate-y-1/2 ml-3",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2", 
    left: "right-full top-1/2 -translate-y-1/2 mr-3"
  };

  return (
    <div 
      className="relative w-full block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      
      {/* Tooltip */}
      <div
        className={cn(
          "absolute z-50 px-3 py-1.5 font-mono text-xs text-white bg-gray-800 rounded-lg shadow-lg",
          "transition-all duration-200 ease-out",
          "pointer-events-none whitespace-nowrap",
          isVisible 
            ? "opacity-100 visible translate-x-0 scale-100" 
            : "opacity-0 invisible -translate-x-1 scale-95",
          sideClasses[side],
          className
        )}
      >
        {content}
        
        {/* Arrow */}
        {side === "right" && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 border-4 border-transparent border-r-gray-800" />
        )}
        {side === "left" && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 border-4 border-transparent border-l-gray-800" />
        )}
        {side === "top" && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 border-4 border-transparent border-t-gray-800" />
        )}
        {side === "bottom" && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 border-4 border-transparent border-b-gray-800" />
        )}
      </div>
    </div>
  );
} 