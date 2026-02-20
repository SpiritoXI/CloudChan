"use client";

import { Folder, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/common";
import type { FileRecord, Folder as FolderType } from "@/types";

interface MoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileRecord | null;
  folders: FolderType[];
  onMove: (folderId: string | null) => void;
}

export function MoveModal({ isOpen, onClose, file, folders, onMove }: MoveModalProps) {
  if (!file) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={<h3 className="text-lg font-semibold">移动到文件夹</h3>}>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        <p className="text-sm text-muted-foreground mb-2">移动文件: {file.name}</p>

        <Button
          variant="ghost"
          className={`w-full justify-start ${
            !file.folder_id || file.folder_id === "default" ? "bg-slate-100" : ""
          }`}
          onClick={() => onMove(null)}
        >
          <Folder className="mr-2 h-4 w-4" />
          根目录（全部文件）
          {(!file.folder_id || file.folder_id === "default") && <Check className="ml-auto h-4 w-4" />}
        </Button>

        {folders.map((folder) => (
          <Button
            key={folder.id}
            variant="ghost"
            className={`w-full justify-start ${file.folder_id === folder.id ? "bg-slate-100" : ""}`}
            onClick={() => onMove(folder.id)}
          >
            <Folder className="mr-2 h-4 w-4" />
            {folder.name}
            {file.folder_id === folder.id && <Check className="ml-auto h-4 w-4" />}
          </Button>
        ))}
      </div>

      <div className="mt-4">
        <Button variant="outline" className="w-full" onClick={onClose}>
          取消
        </Button>
      </div>
    </Modal>
  );
}
