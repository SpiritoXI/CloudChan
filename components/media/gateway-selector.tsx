"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Check, RefreshCw, Signal, SignalHigh, SignalMedium, SignalLow } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Gateway } from "@/types";

interface GatewaySelectorProps {
  gateways: Gateway[];
  currentIndex: number;
  position?: "top" | "bottom";
  onSelect: (index: number) => void;
  onSwitchNext: () => void;
}

function getSignalIcon(latency: number | undefined) {
  if (!latency || latency === Infinity) return <Signal className="h-3 w-3 text-slate-400" />;
  if (latency < 500) return <SignalHigh className="h-3 w-3 text-green-400" />;
  if (latency < 1500) return <SignalMedium className="h-3 w-3 text-yellow-400" />;
  return <SignalLow className="h-3 w-3 text-red-400" />;
}

export function GatewaySelector({ 
  gateways, 
  currentIndex, 
  position = "top",
  onSelect, 
  onSwitchNext 
}: GatewaySelectorProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentGateway = gateways[currentIndex];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (index: number) => {
    onSelect(index);
    setShowMenu(false);
  };

  const menuAnimation = position === "top" 
    ? { initial: { opacity: 0, y: -10, scale: 0.95 }, exit: { opacity: 0, y: -10, scale: 0.95 } }
    : { initial: { opacity: 0, y: 10, scale: 0.95 }, exit: { opacity: 0, y: 10, scale: 0.95 } };

  const menuPosition = position === "top" 
    ? "top-full right-0 mt-2" 
    : "bottom-full left-1/2 -translate-x-1/2 mb-2";

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowMenu(!showMenu)}
        className="text-white hover:bg-white/20 text-xs flex items-center space-x-1"
      >
        <Globe className="h-3 w-3" />
        <span>{currentGateway?.name || `网关 ${currentIndex + 1}`}</span>
        {currentGateway?.latency && currentGateway.latency !== Infinity && (
          <span className="text-slate-400">({currentGateway.latency}ms)</span>
        )}
      </Button>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            {...menuAnimation}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.15 }}
            className={`absolute ${menuPosition} w-64 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden z-50`}
          >
            <div className="p-2 border-b border-slate-700">
              <p className="text-xs text-slate-400 font-medium">选择网关</p>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {gateways.map((gateway, index) => (
                <button
                  key={gateway.url}
                  onClick={() => handleSelect(index)}
                  className={`w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-700 transition-colors ${
                    index === currentIndex ? 'bg-slate-700/50' : ''
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{gateway.icon || '🌐'}</span>
                    <div>
                      <p className="text-sm text-white">{gateway.name}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[120px]">
                        {gateway.url.replace('/ipfs/', '')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getSignalIcon(gateway.latency)}
                    {index === currentIndex && (
                      <Check className="h-3 w-3 text-blue-400 ml-1" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            {gateways.length > 1 && (
              <div className="p-2 border-t border-slate-700">
                <button
                  onClick={() => {
                    onSwitchNext();
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors flex items-center justify-center space-x-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>自动切换下一个</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
