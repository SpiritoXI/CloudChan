"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useMediaPlayer } from "./use-media-player";
import { GatewaySelector } from "./gateway-selector";
import type { Gateway } from "@/types";

interface AudioPlayerProps {
  cid: string;
  gateways: Gateway[];
  onGatewaySwitch?: (gateway: Gateway) => void;
}

export function AudioPlayer({ cid, gateways, onGatewaySwitch }: AudioPlayerProps) {
  const {
    audioRef,
    playerState,
    isLoading,
    error,
    currentGatewayIndex,
    availableGateways,
    currentUrl,
    currentGateway,
    switchToGateway,
    switchToNextGateway,
    togglePlay,
    handleSeek,
    handleVolumeChange,
    toggleMute,
    skip,
    changePlaybackRate,
    setupMediaListeners,
    formatTime,
  } = useMediaPlayer({ gateways, cid, onGatewaySwitch });

  useEffect(() => {
    const cleanup = setupMediaListeners(false);
    return cleanup;
  }, [setupMediaListeners]);

  return (
    <div className="bg-slate-900 rounded-xl overflow-hidden">
      <div className="h-32 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center relative overflow-hidden">
        <div className="flex items-end space-x-1 h-16">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-2 bg-blue-500 rounded-full"
              animate={{
                height: playerState.isPlaying
                  ? [20, Math.random() * 60 + 20, 20]
                  : 20,
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                delay: i * 0.05,
              }}
            />
          ))}
        </div>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700/50 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => switchToNextGateway(false)}
            className="text-red-400 hover:text-red-300"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            切换网关
          </Button>
        </div>
      )}

      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <Slider
            value={[playerState.currentTime]}
            max={playerState.duration || 100}
            step={0.1}
            onValueChange={(v) => handleSeek(v, false)}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>{formatTime(playerState.currentTime)}</span>
            <span>{formatTime(playerState.duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => skip(-10, false)}
              className="text-slate-300 hover:text-white"
            >
              <SkipBack className="h-5 w-5" />
            </Button>

            <Button
              variant="default"
              size="icon"
              onClick={() => togglePlay(false)}
              className="h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700"
            >
              {playerState.isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => skip(10, false)}
              className="text-slate-300 hover:text-white"
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleMute(false)}
                className="text-slate-300 hover:text-white"
              >
                {playerState.isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
              <Slider
                value={[playerState.isMuted ? 0 : playerState.volume]}
                max={1}
                step={0.1}
                onValueChange={(v) => handleVolumeChange(v, false)}
                className="w-20"
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => changePlaybackRate(false)}
              className="text-slate-300 hover:text-white"
            >
              {playerState.playbackRate}x
            </Button>
          </div>
        </div>

        {availableGateways.length > 0 && (
          <div className="flex items-center justify-center">
            <GatewaySelector
              gateways={availableGateways}
              currentIndex={currentGatewayIndex}
              position="bottom"
              onSelect={(index) => switchToGateway(index, false)}
              onSwitchNext={() => switchToNextGateway(false)}
            />
          </div>
        )}
      </div>

      <audio
        ref={audioRef}
        src={currentUrl || undefined}
        preload="metadata"
        crossOrigin="anonymous"
      />
    </div>
  );
}
