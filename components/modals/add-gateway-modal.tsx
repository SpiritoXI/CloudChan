"use client";

import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/modal";

interface AddGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  url: string;
  region: "CN" | "INTL";
  onNameChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  onRegionChange: (value: "CN" | "INTL") => void;
  onSubmit: () => void;
}

export function AddGatewayModal({
  isOpen,
  onClose,
  name,
  url,
  region,
  onNameChange,
  onUrlChange,
  onRegionChange,
  onSubmit,
}: AddGatewayModalProps) {
  const title = (
    <h3 className="text-lg font-semibold flex items-center">
      <Globe className="h-5 w-5 mr-2" />
      添加自定义网关
    </h3>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">网关名称</label>
          <Input placeholder="例如：我的网关" value={name} onChange={(e) => onNameChange(e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">网关URL</label>
          <Input
            placeholder="https://gateway.example.com/ipfs/"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">支持格式: https://example.com/ipfs/ 或 https://example.com/</p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">区域</label>
          <div className="flex space-x-2">
            <Button variant={region === "CN" ? "default" : "outline"} className="flex-1" onClick={() => onRegionChange("CN")}>
              🇨🇳 国内
            </Button>
            <Button
              variant={region === "INTL" ? "default" : "outline"}
              className="flex-1"
              onClick={() => onRegionChange("INTL")}
            >
              🌍 国际
            </Button>
          </div>
        </div>

        <div className="flex space-x-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-cloudchan-blue to-cloudchan-purple"
            onClick={onSubmit}
            disabled={!name.trim() || !url.trim()}
          >
            添加并检测
          </Button>
        </div>
      </div>
    </Modal>
  );
}
