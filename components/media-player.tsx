"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { getMediaMimeType, isVideoFile, isAudioFile } from "@/lib/utils";
import type { Gateway } from "@/types";

interface MediaPlayerProps {
  cid: string;
  filename: string;
  gateways: Gateway[];
  onGatewaySwitch?: (gateway: Gateway) => void;
}

interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  buffered: number;
  playbackRate: number;
}

export function MediaPlayer({ cid, filename, gateways, onGatewaySwitch }: MediaPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout>();

  const [currentGatewayIndex, setCurrentGatewayIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [availableGateways, setAvailableGateways] = useState<Gateway[]>([]);

  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    isFullscreen: false,
    buffered: 0,
    playbackRate: 1,
  });

  const isVideo = isVideoFile(filename);
  const isAudio = isAudioFile(filename);
  const mediaType = isVideo ? "video" : "audio";
  const mimeType = getMediaMimeType(filename);

  // 获取可用网关列表 - 如果没有可用网关，使用所有网关作为备选
  useEffect(() => {
    const available = gateways
      .filter((g) => g.available)
      .sort((a, b) => (a.latency || Infinity) - (b.latency || Infinity));
    // 如果没有可用网关，使用所有网关作为备选
    setAvailableGateways(available.length > 0 ? available : gateways);
  }, [gateways]);

  // 获取当前媒体URL
  const getCurrentMediaUrl = useCallback(() => {
    if (availableGateways.length === 0) return null;
    const gateway = availableGateways[currentGatewayIndex];
    return `${gateway.url}${cid}`;
  }, [availableGateways, currentGatewayIndex, cid]);

  const mediaRef = isVideo ? videoRef : audioRef;

  // 切换网关
  const switchToNextGateway = useCallback(() => {
    if (availableGateways.length <= 1) {
      setError("所有网关都无法播放此媒体文件");
      return;
    }

    const nextIndex = (currentGatewayIndex + 1) % availableGateways.length;
    setCurrentGatewayIndex(nextIndex);
    setError(null);
    setIsLoading(true);

    const nextGateway = availableGateways[nextIndex];
    onGatewaySwitch?.(nextGateway);
  }, [availableGateways, currentGatewayIndex, onGatewaySwitch]);

  // 重试当前网关
  const retryCurrentGateway = useCallback(() => {
    setError(null);
    setIsLoading(true);
    if (mediaRef.current) {
      mediaRef.current.load();
    }
  }, [mediaRef]);

  // 播放/暂停控制
  const togglePlay = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;

    if (playerState.isPlaying) {
      media.pause();
    } else {
      media.play().catch((err) => {
        console.error("播放失败:", err);
        setError("播放失败，尝试切换网关...");
        switchToNextGateway();
      });
    }
  }, [playerState.isPlaying, mediaRef, switchToNextGateway]);

  // 进度控制
  const handleSeek = useCallback((value: number[]) => {
    const media = mediaRef.current;
    if (!media) return;

    const newTime = value[0];
    media.currentTime = newTime;
    setPlayerState((prev) => ({ ...prev, currentTime: newTime }));
  }, [mediaRef]);

  // 音量控制
  const handleVolumeChange = useCallback((value: number[]) => {
    const media = mediaRef.current;
    if (!media) return;

    const newVolume = value[0];
    media.volume = newVolume;
    setPlayerState((prev) => ({
      ...prev,
      volume: newVolume,
      isMuted: newVolume === 0,
    }));
  }, [mediaRef]);

  // 静音切换
  const toggleMute = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;

    const newMuted = !playerState.isMuted;
    media.muted = newMuted;
    setPlayerState((prev) => ({ ...prev, isMuted: newMuted }));
  }, [playerState.isMuted, mediaRef]);

  // 全屏切换
  const toggleFullscreen = useCallback(async () => {
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
  }, []);

  // 快进/快退
  const skip = useCallback((seconds: number) => {
    const media = mediaRef.current;
    if (!media) return;

    const newTime = Math.max(0, Math.min(media.duration || 0, media.currentTime + seconds));
    media.currentTime = newTime;
  }, [mediaRef]);

  // 播放速度控制
  const changePlaybackRate = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;

    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playerState.playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];

    media.playbackRate = nextRate;
    setPlayerState((prev) => ({ ...prev, playbackRate: nextRate }));
  }, [playerState.playbackRate, mediaRef]);

  // 媒体事件监听
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const handleTimeUpdate = () => {
      setPlayerState((prev) => ({
        ...prev,
        currentTime: media.currentTime,
        buffered: media.buffered.length > 0 ? media.buffered.end(media.buffered.length - 1) : 0,
      }));
    };

    const handleLoadedMetadata = () => {
      setPlayerState((prev) => ({ ...prev, duration: media.duration }));
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handlePlaying = () => {
      setIsLoading(false);
      setPlayerState((prev) => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      setPlayerState((prev) => ({ ...prev, isPlaying: false }));
    };

    const handleEnded = () => {
      setPlayerState((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
    };

    const handleError = () => {
      console.error("媒体加载错误");
      setError("当前网关无法播放，尝试切换...");
      switchToNextGateway();
    };

    media.addEventListener("timeupdate", handleTimeUpdate);
    media.addEventListener("loadedmetadata", handleLoadedMetadata);
    media.addEventListener("canplay", handleCanPlay);
    media.addEventListener("waiting", handleWaiting);
    media.addEventListener("playing", handlePlaying);
    media.addEventListener("pause", handlePause);
    media.addEventListener("ended", handleEnded);
    media.addEventListener("error", handleError);

    return () => {
      media.removeEventListener("timeupdate", handleTimeUpdate);
      media.removeEventListener("loadedmetadata", handleLoadedMetadata);
      media.removeEventListener("canplay", handleCanPlay);
      media.removeEventListener("waiting", handleWaiting);
      media.removeEventListener("playing", handlePlaying);
      media.removeEventListener("pause", handlePause);
      media.removeEventListener("ended", handleEnded);
      media.removeEventListener("error", handleError);
    };
  }, [mediaRef, switchToNextGateway]);

  // 自动隐藏控制栏
  const handleMouseMove = useCallback(() => {
    setShowControls(true);

    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }

    if (playerState.isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [playerState.isPlaying]);

  // 格式化时间
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const currentUrl = getCurrentMediaUrl();
  const currentGateway = availableGateways[currentGatewayIndex];

  // 音频播放器样式
  if (isAudio) {
    return (
      <div className="bg-slate-900 rounded-xl overflow-hidden">
        {/* 音频可视化效果 */}
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

        {/* 错误提示 */}
        {error && (
          <div className="p-3 bg-red-900/30 border border-red-700/50 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={switchToNextGateway}
              className="text-red-400 hover:text-red-300"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              切换网关
            </Button>
          </div>
        )}

        {/* 控制栏 */}
        <div className="p-4 space-y-4">
          {/* 进度条 */}
          <div className="space-y-2">
            <Slider
              value={[playerState.currentTime]}
              max={playerState.duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>{formatTime(playerState.currentTime)}</span>
              <span>{formatTime(playerState.duration)}</span>
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => skip(-10)}
                className="text-slate-300 hover:text-white"
              >
                <SkipBack className="h-5 w-5" />
              </Button>

              <Button
                variant="default"
                size="icon"
                onClick={togglePlay}
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
                onClick={() => skip(10)}
                className="text-slate-300 hover:text-white"
              >
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center space-x-4">
              {/* 音量控制 */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
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
                  onValueChange={handleVolumeChange}
                  className="w-20"
                />
              </div>

              {/* 播放速度 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={changePlaybackRate}
                className="text-slate-300 hover:text-white"
              >
                {playerState.playbackRate}x
              </Button>
            </div>
          </div>

          {/* 网关信息 */}
          {currentGateway && (
            <div className="text-xs text-slate-500 text-center">
              当前网关: {currentGateway.name} ({currentGateway.latency}ms)
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

  // 视频播放器
  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-xl overflow-hidden group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => playerState.isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={currentUrl || undefined}
        className="w-full aspect-video"
        preload="metadata"
        crossOrigin="anonymous"
        playsInline
        onClick={togglePlay}
      />

      {/* 加载状态 */}
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

      {/* 错误提示 */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center p-6">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-white mb-2">{error}</p>
            <div className="flex space-x-2 justify-center">
              <Button variant="outline" size="sm" onClick={retryCurrentGateway}>
                <RefreshCw className="h-4 w-4 mr-1" />
                重试
              </Button>
              <Button variant="default" size="sm" onClick={switchToNextGateway}>
                切换网关
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 控制栏 */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"
          >
            {/* 顶部信息 */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start">
              <div>
                <h3 className="text-white font-medium truncate max-w-md">{filename}</h3>
                {currentGateway && (
                  <p className="text-slate-400 text-xs">
                    {currentGateway.name} · {currentGateway.latency}ms
                  </p>
                )}
              </div>
            </div>

            {/* 中央播放按钮 */}
            {!playerState.isPlaying && !isLoading && !error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  variant="default"
                  size="icon"
                  onClick={togglePlay}
                  className="h-16 w-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                >
                  <Play className="h-8 w-8 text-white ml-1" />
                </Button>
              </div>
            )}

            {/* 底部控制栏 */}
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
              {/* 进度条 */}
              <div className="group/slider">
                <Slider
                  value={[playerState.currentTime]}
                  max={playerState.duration || 100}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="cursor-pointer"
                />
                {/* 缓冲进度 */}
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
                    onClick={togglePlay}
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
                    onClick={() => skip(-10)}
                    className="text-white hover:bg-white/20"
                  >
                    <SkipBack className="h-5 w-5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => skip(10)}
                    className="text-white hover:bg-white/20"
                  >
                    <SkipForward className="h-5 w-5" />
                  </Button>

                  {/* 音量控制 */}
                  <div className="flex items-center space-x-2 group/volume">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleMute}
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
                        onValueChange={handleVolumeChange}
                      />
                    </div>
                  </div>

                  <span className="text-white text-sm">
                    {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {/* 播放速度 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={changePlaybackRate}
                    className="text-white hover:bg-white/20"
                  >
                    {playerState.playbackRate}x
                  </Button>

                  {/* 全屏 */}
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
