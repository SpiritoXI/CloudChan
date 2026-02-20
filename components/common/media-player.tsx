"use client";

import { isVideoFile, isAudioFile } from "@/lib/utils";
import { AudioPlayer } from "../media/audio-player";
import { VideoPlayer } from "../media/video-player";
import type { Gateway } from "@/types";

interface MediaPlayerProps {
  cid: string;
  filename: string;
  gateways: Gateway[];
  onGatewaySwitch?: (gateway: Gateway) => void;
}

export function MediaPlayer({ cid, filename, gateways, onGatewaySwitch }: MediaPlayerProps) {
  const isVideo = isVideoFile(filename);
  const isAudio = isAudioFile(filename);

  if (isAudio) {
    return (
      <AudioPlayer
        cid={cid}
        gateways={gateways}
        onGatewaySwitch={onGatewaySwitch}
      />
    );
  }

  return (
    <VideoPlayer
      cid={cid}
      filename={filename}
      gateways={gateways}
      onGatewaySwitch={onGatewaySwitch}
    />
  );
}
