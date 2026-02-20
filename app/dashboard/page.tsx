"use client";

import { useRef, useMemo } from "react";
import { DashboardProvider, useDashboardContext } from "@/contexts/dashboard-context";
import { useAuthStore } from "@/lib/store";
import { Sidebar, FileList } from "@/components/common";
import { BatchToolbar, UploadProgress, DashboardHeader } from "@/components/dashboard";
import { LazyModals } from "@/components/dashboard/lazy-modals";

function DashboardContent() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ctx = useDashboardContext();
  const { isAuthenticated } = useAuthStore();
  
  const filteredFiles = useMemo(() => {
    return ctx.files.filter((file) => {
      const matchesSearch =
        file.name.toLowerCase().includes(ctx.searchQuery.toLowerCase()) ||
        file.cid.toLowerCase().includes(ctx.searchQuery.toLowerCase());
      const matchesFolder = ctx.currentFolderId
        ? file.folder_id === ctx.currentFolderId
        : true;
      return matchesSearch && matchesFolder;
    });
  }, [ctx.files, ctx.searchQuery, ctx.currentFolderId]);
  
  const currentFolderName = useMemo(() => {
    return ctx.currentFolderId
      ? ctx.folders.find((f) => f.id === ctx.currentFolderId)?.name || "全部文件"
      : "全部文件";
  }, [ctx.currentFolderId, ctx.folders]);
  
  if (!isAuthenticated) return null;
  
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
      <Sidebar
        totalSize={ctx.totalSize}
        filesCount={ctx.files.length}
        foldersCount={ctx.folders.length}
        folders={ctx.folders}
        currentFolderId={ctx.currentFolderId}
        isUploading={ctx.isUploading}
        onUploadClick={() => fileInputRef.current?.click()}
        onAddCidClick={() => ctx.setAddCidModalOpen(true)}
        onTestGateways={ctx.handleTestGateways}
        onFolderSelect={(folderId) => {
          ctx.setCurrentFolderId(folderId);
        }}
        onCreateFolder={() => {
          ctx.setEditingFolder(null);
          ctx.setNewFolderName("");
          ctx.setFolderModalOpen(true);
        }}
        onEditFolder={(folder) => {
          ctx.setEditingFolder(folder);
          ctx.setNewFolderName(folder.name);
          ctx.setFolderModalOpen(true);
        }}
        onDeleteFolder={ctx.handleDeleteFolder}
        onLogout={ctx.handleLogout}
      />
      
      <main className="flex-1 overflow-hidden">
        <DashboardHeader
          currentFolderName={currentFolderName}
          searchQuery={ctx.searchQuery}
          viewMode={ctx.viewMode}
          showBackButton={!!ctx.currentFolderId}
          onSearchChange={ctx.setSearchQuery}
          onViewModeChange={ctx.setViewMode}
          onBack={() => ctx.setCurrentFolderId(null)}
          onSettingsClick={() => ctx.setSettingsModalOpen(true)}
        />
        
        <BatchToolbar
          selectedCount={ctx.selectedFiles.length}
          folders={ctx.folders}
          onClearSelection={ctx.handleClearSelection}
          onBatchMove={ctx.handleBatchMove}
          onBatchCopy={ctx.handleBatchCopy}
          onBatchDelete={ctx.handleBatchDelete}
        />
        
        {ctx.isUploading && <UploadProgress progress={ctx.uploadProgress} />}
        
        <div
          className={`h-[calc(100vh-4rem)] overflow-auto p-6 ${ctx.dragOver ? "bg-cloudchan-purple/10" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            ctx.setDragOver(true);
          }}
          onDragLeave={() => ctx.setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            ctx.setDragOver(false);
            ctx.handleFileUpload(e.dataTransfer.files);
          }}
        >
          <FileList
            files={filteredFiles}
            viewMode={ctx.viewMode}
            isLoading={ctx.isLoading}
            copiedId={ctx.copiedId}
            selectedFiles={ctx.selectedFiles}
            onCopyCid={ctx.handleCopyCID}
            onDownload={(cid, filename) => ctx.handleDownload(cid, filename)}
            onDownloadWithGateway={(cid, filename, gatewayUrl) => ctx.handleDownloadWithGateway(cid, filename, gatewayUrl)}
            onDownloadMenu={(file) => {
              ctx.setSelectedFileForDownload(file);
              ctx.setDownloadModalOpen(true);
            }}
            onMove={(file) => {
              ctx.setSelectedFileToMove(file);
              ctx.setMoveModalOpen(true);
            }}
            onDelete={ctx.handleDelete}
            onPreview={ctx.handlePreview}
            onRename={ctx.handleRenameFile}
            onShare={ctx.handleShareFile}
            onToggleSelection={ctx.handleToggleSelection}
            onSelectAll={ctx.handleSelectAll}
            gateways={ctx.gateways}
          />
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => ctx.handleFileUpload(e.target.files)}
        />
      </main>
      
      <LazyModals />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}
