import { useState, useRef, useCallback, useEffect } from "react";
import type { Gateway } from "@/types";

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  buffered: number;
  playbackRate: number;
}

export interface UseMediaPlayerOptions {
  gateways: Gateway[];
  cid: string;
  onGatewaySwitch?: (gateway: Gateway) => void;
}

export function useMediaPlayer({ gateways, cid, onGatewaySwitch }: UseMediaPlayerOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
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

  useEffect(() => {
    const available = gateways
      .filter((g) => g.available)
      .sort((a, b) => (a.latency || Infinity) - (b.latency || Infinity));
    setAvailableGateways(available.length > 0 ? available : gateways);
  }, [gateways]);

  const getCurrentMediaUrl = useCallback(() => {
    if (availableGateways.length === 0) return null;
    const gateway = availableGateways[currentGatewayIndex];
    return `${gateway.url}${cid}`;
  }, [availableGateways, currentGatewayIndex, cid]);

  const getMediaRef = useCallback((isVideo: boolean) => {
    return isVideo ? videoRef : audioRef;
  }, []);

  const switchToGateway = useCallback((index: number, isVideo: boolean) => {
    if (index === currentGatewayIndex) return;

    setCurrentGatewayIndex(index);
    setError(null);
    setIsLoading(true);

    const nextGateway = availableGateways[index];
    onGatewaySwitch?.(nextGateway);

    const media = isVideo ? videoRef.current : audioRef.current;
    if (media) {
      media.load();
    }
  }, [availableGateways, currentGatewayIndex, onGatewaySwitch]);

  const switchToNextGateway = useCallback((isVideo: boolean) => {
    if (availableGateways.length <= 1) {
      setError("所有网关都无法播放此媒体文件");
      return;
    }
    const nextIndex = (currentGatewayIndex + 1) % availableGateways.length;
    switchToGateway(nextIndex, isVideo);
  }, [availableGateways, currentGatewayIndex, switchToGateway]);

  const retryCurrentGateway = useCallback((isVideo: boolean) => {
    setError(null);
    setIsLoading(true);
    const media = isVideo ? videoRef.current : audioRef.current;
    if (media) {
      media.load();
    }
  }, []);

  const togglePlay = useCallback((isVideo: boolean) => {
    const media = isVideo ? videoRef.current : audioRef.current;
    if (!media) return;

    if (playerState.isPlaying) {
      media.pause();
    } else {
      media.play().catch(() => {
        setError("播放失败，尝试切换网关...");
        switchToNextGateway(isVideo);
      });
    }
  }, [playerState.isPlaying, switchToNextGateway]);

  const handleSeek = useCallback((value: number[], isVideo: boolean) => {
    const media = isVideo ? videoRef.current : audioRef.current;
    if (!media) return;

    const newTime = value[0];
    media.currentTime = newTime;
    setPlayerState((prev) => ({ ...prev, currentTime: newTime }));
  }, []);

  const handleVolumeChange = useCallback((value: number[], isVideo: boolean) => {
    const media = isVideo ? videoRef.current : audioRef.current;
    if (!media) return;

    const newVolume = value[0];
    media.volume = newVolume;
    setPlayerState((prev) => ({
      ...prev,
      volume: newVolume,
      isMuted: newVolume === 0,
    }));
  }, []);

  const toggleMute = useCallback((isVideo: boolean) => {
    const media = isVideo ? videoRef.current : audioRef.current;
    if (!media) return;

    const newMuted = !playerState.isMuted;
    media.muted = newMuted;
    setPlayerState((prev) => ({ ...prev, isMuted: newMuted }));
  }, [playerState.isMuted]);

  const skip = useCallback((seconds: number, isVideo: boolean) => {
    const media = isVideo ? videoRef.current : audioRef.current;
    if (!media) return;

    const newTime = Math.max(0, Math.min(media.duration || 0, media.currentTime + seconds));
    media.currentTime = newTime;
  }, []);

  const changePlaybackRate = useCallback((isVideo: boolean) => {
    const media = isVideo ? videoRef.current : audioRef.current;
    if (!media) return;

    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playerState.playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];

    media.playbackRate = nextRate;
    setPlayerState((prev) => ({ ...prev, playbackRate: nextRate }));
  }, [playerState.playbackRate]);

  const setupMediaListeners = useCallback((isVideo: boolean) => {
    const media = isVideo ? videoRef.current : audioRef.current;
    if (!media) return () => {};

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

    const handleCanPlay = () => setIsLoading(false);
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => {
      setIsLoading(false);
      setPlayerState((prev) => ({ ...prev, isPlaying: true }));
    };
    const handlePause = () => setPlayerState((prev) => ({ ...prev, isPlaying: false }));
    const handleEnded = () => setPlayerState((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
    const handleError = () => {
      setError("当前网关无法播放，尝试切换...");
      switchToNextGateway(isVideo);
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
  }, [switchToNextGateway]);

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

  const formatTime = useCallback((seconds: number): string => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  return {
    videoRef,
    audioRef,
    playerState,
    setPlayerState,
    currentGatewayIndex,
    isLoading,
    error,
    showControls,
    setShowControls,
    availableGateways,
    currentGateway: availableGateways[currentGatewayIndex],
    currentUrl: getCurrentMediaUrl(),
    getCurrentMediaUrl,
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
  };
}
