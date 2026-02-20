"use client";

import { lazy, Suspense, memo } from "react";
import { useDashboardContext } from "@/contexts/dashboard-context";

const GatewayModal = lazy(() => import("@/components/modals/gateway-modal").then(m => ({ default: m.GatewayModal })));
const FolderModal = lazy(() => import("@/components/modals/folder-modal").then(m => ({ default: m.FolderModal })));
const MoveModal = lazy(() => import("@/components/modals/move-modal").then(m => ({ default: m.MoveModal })));
const AddCidModal = lazy(() => import("@/components/modals/add-cid-modal").then(m => ({ default: m.AddCidModal })));
const SettingsModal = lazy(() => import("@/components/modals/settings-modal").then(m => ({ default: m.SettingsModal })));
const DownloadModal = lazy(() => import("@/components/modals/download-modal").then(m => ({ default: m.DownloadModal })));
const AddGatewayModal = lazy(() => import("@/components/modals/add-gateway-modal").then(m => ({ default: m.AddGatewayModal })));
const RenameFileModal = lazy(() => import("@/components/modals/rename-file-modal").then(m => ({ default: m.RenameFileModal })));
const ShareModal = lazy(() => import("@/components/modals/share-modal").then(m => ({ default: m.ShareModal })));
const PreviewModal = lazy(() => import("@/components/dashboard/preview-modal").then(m => ({ default: m.PreviewModal })));

function ModalLoadingFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg p-6 shadow-xl">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-sm text-muted-foreground">加载中...</p>
      </div>
    </div>
  );
}

export const LazyModals = memo(function LazyModals() {
  const ctx = useDashboardContext();
  
  return (
    <>
      <Suspense fallback={<ModalLoadingFallback />}>
        <GatewayModal
          isOpen={ctx.gatewayModalOpen}
          onClose={() => ctx.setGatewayModalOpen(false)}
          gateways={ctx.gateways}
          customGateways={ctx.customGateways}
          isTesting={ctx.isTestingGateways}
          isFetchingPublic={ctx.isFetchingPublicGateways}
          testProgress={ctx.testProgress}
          healthTrends={ctx.healthTrends}
          onRefresh={ctx.handleRefreshGateways}
          onAdd={() => ctx.setAddGatewayModalOpen(true)}
          onTest={ctx.handleTestSingleGateway}
          onRemove={ctx.handleRemoveCustomGateway}
          onUpdate={ctx.setGateways}
          onFetchPublic={ctx.handleFetchPublicGateways}
          onStartTest={ctx.handleStartTestGateways}
          onPauseTest={ctx.handlePauseTestGateways}
        />
      </Suspense>
      
      <Suspense fallback={null}>
        <FolderModal
          isOpen={ctx.folderModalOpen}
          onClose={() => ctx.setFolderModalOpen(false)}
          folderName={ctx.newFolderName}
          isEditing={!!ctx.editingFolder}
          onNameChange={ctx.setNewFolderName}
          onSubmit={ctx.editingFolder ? ctx.handleRenameFolder : ctx.handleCreateFolder}
        />
      </Suspense>
      
      <Suspense fallback={null}>
        <MoveModal
          isOpen={ctx.moveModalOpen}
          onClose={() => ctx.setMoveModalOpen(false)}
          file={ctx.selectedFileToMove}
          folders={ctx.folders}
          onMove={ctx.handleMoveFile}
        />
      </Suspense>
      
      <Suspense fallback={null}>
        <AddCidModal
          isOpen={ctx.addCidModalOpen}
          onClose={() => ctx.setAddCidModalOpen(false)}
          cid={ctx.newCid}
          name={ctx.newCidName}
          size={ctx.newCidSize}
          isAdding={ctx.isAddingCid}
          isDetecting={ctx.isDetectingCid}
          detectedInfo={ctx.detectedCidInfo}
          onCidChange={ctx.setNewCid}
          onNameChange={ctx.setNewCidName}
          onSizeChange={ctx.setNewCidSize}
          onSubmit={ctx.handleAddCid}
          onDetectCid={ctx.handleDetectCid}
        />
      </Suspense>
      
      <Suspense fallback={null}>
        <SettingsModal
          isOpen={ctx.settingsModalOpen}
          onClose={() => ctx.setSettingsModalOpen(false)}
          darkMode={ctx.darkMode}
          itemsPerPage={ctx.itemsPerPage}
          autoRefresh={ctx.autoRefresh}
          filesCount={ctx.files.length}
          foldersCount={ctx.folders.length}
          totalSize={ctx.totalSize}
          onDarkModeChange={ctx.setDarkMode}
          onItemsPerPageChange={ctx.setItemsPerPage}
          onAutoRefreshChange={ctx.setAutoRefresh}
        />
      </Suspense>
      
      <Suspense fallback={null}>
        <DownloadModal
          isOpen={ctx.downloadModalOpen}
          onClose={() => ctx.setDownloadModalOpen(false)}
          file={ctx.selectedFileForDownload}
          gateways={ctx.gateways}
          customGateways={ctx.customGateways}
          onDownload={ctx.handleDownload}
          onDownloadWithGateway={ctx.handleDownloadWithGateway}
          onTestGateways={ctx.handleTestGateways}
        />
      </Suspense>
      
      <Suspense fallback={null}>
        <AddGatewayModal
          isOpen={ctx.addGatewayModalOpen}
          onClose={() => ctx.setAddGatewayModalOpen(false)}
          name={ctx.newGatewayName}
          url={ctx.newGatewayUrl}
          region={ctx.newGatewayRegion}
          isAdding={ctx.isAddingGateway}
          onNameChange={ctx.setNewGatewayName}
          onUrlChange={ctx.setNewGatewayUrl}
          onRegionChange={ctx.setNewGatewayRegion}
          onValidateUrl={ctx.handleValidateGatewayUrl}
          onSubmit={ctx.handleAddCustomGateway}
        />
      </Suspense>
      
      <Suspense fallback={null}>
        <RenameFileModal
          isOpen={ctx.renameFileModalOpen}
          onClose={() => ctx.setRenameFileModalOpen(false)}
          file={ctx.selectedFileToRename}
          onRename={ctx.handleSubmitRenameFile}
        />
      </Suspense>
      
      <Suspense fallback={null}>
        <ShareModal
          isOpen={ctx.shareModalOpen}
          onClose={ctx.handleCloseShareModal}
          file={ctx.selectedFileToShare}
        />
      </Suspense>
      
      <Suspense fallback={<ModalLoadingFallback />}>
        {ctx.previewOpen && ctx.previewFile && (
          <PreviewModal
            isOpen={ctx.previewOpen}
            onClose={ctx.handleClosePreview}
            file={ctx.previewFile}
            gateways={ctx.gateways}
          />
        )}
      </Suspense>
    </>
  );
});
