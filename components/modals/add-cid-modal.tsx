"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/modal";

interface AddCidModalProps {
  isOpen: boolean;
  onClose: () => void;
  cid: string;
  name: string;
  size: string;
  isAdding: boolean;
  isDetecting: boolean;
  onCidChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSizeChange: (value: string) => void;
  onSubmit: () => void;
}

export function AddCidModal({
  isOpen,
  onClose,
  cid,
  name,
  size,
  isAdding,
  isDetecting,
  onCidChange,
  onNameChange,
  onSizeChange,
  onSubmit,
}: AddCidModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={<h3 className="text-lg font-semibold">添加CID</h3>}>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">CID</label>
          <Input
            placeholder="输入IPFS CID"
            value={cid}
            onChange={(e) => onCidChange(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            文件名 <span className="text-muted-foreground font-normal">(可选，留空自动检测)</span>
          </label>
          <Input
            placeholder="输入文件名或留空自动检测"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">文件大小 (字节，可选)</label>
          <Input type="number" placeholder="输入文件大小" value={size} onChange={(e) => onSizeChange(e.target.value)} />
        </div>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isAdding || isDetecting}
          >
            取消
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-cloudchan-blue to-cloudchan-purple"
            onClick={onSubmit}
            disabled={isAdding || isDetecting || !cid.trim()}
          >
            {isDetecting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                检测中...
              </>
            ) : isAdding ? (
              "添加中..."
            ) : (
              "添加"
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">如果未填写文件名，系统将自动从IPFS网络检测</p>
      </div>
    </Modal>
  );
}
