"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useMediaPlayer } from "./use-media-player";
import { GatewaySelector } from "./gateway-selector";
import type { Gateway } from "@/types";

interface VideoPlayerProps {
  cid: string;
  filename: string;
  gateways: Gateway[];
  onGatewaySwitch?: (gateway: Gateway) => void;
}

export function VideoPlayer({ cid, filename, gateways, onGatewaySwitch }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    videoRef,
    playerState,
    setPlayerState,
    isLoading,
    error,
    showControls,
    currentGatewayIndex,
    availableGateways,
    currentUrl,
    currentGateway,
    switchToGateway,
    switchToNextGateway,
    retryCurrentGateway,
    togglePlay,
    handleSeek,
    handleVolumeChange,
    toggleMute,
    skip,
    changePlaybackRate,
    setupMediaListeners,
    handleMouseMove,
    formatTime,
  } = useMediaPlayer({ gateways, cid, onGatewaySwitch });

  useEffect(() => {
    const cleanup = setupMediaListeners(true);
    return cleanup;
  }, [setupMediaListeners]);

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
        setPlayerState((prev) => ({ ...prev, isFullscreen: true }));
      } else {
        await document.exitFullscreen();
        setPlayerState((prev) => ({ ...prev, isFullscreen: false }));
      }
    } catch (err) {
      console.error("全屏切换失败:", err);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-xl overflow-hidden group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => playerState.isPlaying && showControls && setPlayerState(prev => ({ ...prev, isPlaying: prev.isPlaying }))}
    >
      <video
        ref={videoRef}
        src={currentUrl || undefined}
        className="w-full aspect-video"
        preload="metadata"
        crossOrigin="anonymous"
        playsInline
        onClick={() => togglePlay(true)}
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-white text-sm">加载中...</p>
            {currentGateway && (
              <p className="text-slate-400 text-xs mt-1">
                通过 {currentGateway.name} 加载
              </p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center p-6">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-white mb-2">{error}</p>
            <div className="flex space-x-2 justify-center">
              <Button variant="outline" size="sm" onClick={() => retryCurrentGateway(true)}>
                <RefreshCw className="h-4 w-4 mr-1" />
                重试
              </Button>
              <Button variant="default" size="sm" onClick={() => switchToNextGateway(true)}>
                切换网关
              </Button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"
          >
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start">
              <div>
                <h3 className="text-white font-medium truncate max-w-md">{filename}</h3>
              </div>
              {availableGateways.length > 0 && (
                <GatewaySelector
                  gateways={availableGateways}
                  currentIndex={currentGatewayIndex}
                  position="top"
                  onSelect={(index) => switchToGateway(index, true)}
                  onSwitchNext={() => switchToNextGateway(true)}
                />
              )}
            </div>

            {!playerState.isPlaying && !isLoading && !error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  variant="default"
                  size="icon"
                  onClick={() => togglePlay(true)}
                  className="h-16 w-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                >
                  <Play className="h-8 w-8 text-white ml-1" />
                </Button>
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
              <div className="group/slider">
                <Slider
                  value={[playerState.currentTime]}
                  max={playerState.duration || 100}
                  step={0.1}
                  onValueChange={(v) => handleSeek(v, true)}
                  className="cursor-pointer"
                />
                <div
                  className="h-1 bg-slate-600/50 rounded-full mt-1 transition-all"
                  style={{
                    width: `${(playerState.buffered / (playerState.duration || 1)) * 100}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => togglePlay(true)}
                    className="text-white hover:bg-white/20"
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
                    onClick={() => skip(-10, true)}
                    className="text-white hover:bg-white/20"
                  >
                    <SkipBack className="h-5 w-5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => skip(10, true)}
                    className="text-white hover:bg-white/20"
                  >
                    <SkipForward className="h-5 w-5" />
                  </Button>

                  <div className="flex items-center space-x-2 group/volume">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleMute(true)}
                      className="text-white hover:bg-white/20"
                    >
                      {playerState.isMuted ? (
                        <VolumeX className="h-5 w-5" />
                      ) : (
                        <Volume2 className="h-5 w-5" />
                      )}
                    </Button>
                    <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all">
                      <Slider
                        value={[playerState.isMuted ? 0 : playerState.volume]}
                        max={1}
                        step={0.1}
                        onValueChange={(v) => handleVolumeChange(v, true)}
                      />
                    </div>
                  </div>

                  <span className="text-white text-sm">
                    {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => changePlaybackRate(true)}
                    className="text-white hover:bg-white/20"
                  >
                    {playerState.playbackRate}x
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleFullscreen}
                    className="text-white hover:bg-white/20"
                  >
                    {playerState.isFullscreen ? (
                      <Minimize className="h-5 w-5" />
                    ) : (
                      <Maximize className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
