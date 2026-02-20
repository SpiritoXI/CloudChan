"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/common";

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderName: string;
  isEditing: boolean;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
}

export function FolderModal({
  isOpen,
  onClose,
  folderName,
  isEditing,
  onNameChange,
  onSubmit,
}: FolderModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={<h3 className="text-lg font-semibold">{isEditing ? "重命名文件夹" : "新建文件夹"}</h3>}
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">文件夹名称</label>
          <Input
            placeholder="输入文件夹名称"
            value={folderName}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSubmit();
              }
            }}
            autoFocus
          />
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-cloudchan-blue to-cloudchan-purple"
            onClick={onSubmit}
            disabled={!folderName.trim()}
          >
            {isEditing ? "保存" : "创建"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
