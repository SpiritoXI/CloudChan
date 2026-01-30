"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Settings, List, Grid3X3, ChevronLeft, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sidebar } from "@/components/sidebar";
import { FileList } from "@/components/file-list";
import { ShareModal } from "@/components/modals/share-modal";
import { GatewayModal } from "@/components/modals/gateway-modal";
import { FolderModal } from "@/components/modals/folder-modal";
import { MoveModal } from "@/components/modals/move-modal";
import { AddCidModal } from "@/components/modals/add-cid-modal";
import { SettingsModal } from "@/components/modals/settings-modal";
import { DownloadModal } from "@/components/modals/download-modal";
import { AddGatewayModal } from "@/components/modals/add-gateway-modal";
import { useAuthStore, useFileStore, useUIStore, useUploadStore, useGatewayStore } from "@/lib/store";
import { api, uploadApi, gatewayApi, shareApi } from "@/lib/api";
import { CONFIG } from "@/lib/config";
import { generateId, copyToClipboard } from "@/lib/utils";
import type { FileRecord, Gateway, Folder as FolderType } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, logout, password } = useAuthStore();
  const { files, folders, setFiles, setFolders } = useFileStore();
  const { showToast } = useUIStore();
  const { isUploading, uploadProgress, setIsUploading, setUploadProgress } = useUploadStore();
  const { customGateways, addCustomGateway, removeCustomGateway } = useGatewayStore();

  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isLoading, setIsLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Modal States
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedFileForShare, setSelectedFileForShare] = useState<FileRecord | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [sharePassword, setSharePassword] = useState("");
  const [shareExpiry, setShareExpiry] = useState("7");

  const [gatewayModalOpen, setGatewayModalOpen] = useState(false);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [isTestingGateways, setIsTestingGateways] = useState(false);

  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);

  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [selectedFileToMove, setSelectedFileToMove] = useState<FileRecord | null>(null);

  const [addCidModalOpen, setAddCidModalOpen] = useState(false);
  const [newCid, setNewCid] = useState("");
  const [newCidName, setNewCidName] = useState("");
  const [newCidSize, setNewCidSize] = useState("");
  const [isAddingCid, setIsAddingCid] = useState(false);
  const [isDetectingCid, setIsDetectingCid] = useState(false);

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [selectedFileForDownload, setSelectedFileForDownload] = useState<FileRecord | null>(null);

  const [addGatewayModalOpen, setAddGatewayModalOpen] = useState(false);
  const [newGatewayName, setNewGatewayName] = useState("");
  const [newGatewayUrl, setNewGatewayUrl] = useState("");
  const [newGatewayRegion, setNewGatewayRegion] = useState<"CN" | "INTL">("CN");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data on mount
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/");
      return;
    }
    loadData();
  }, [isAuthenticated, router]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [filesData, foldersData] = await Promise.all([api.loadFiles(), api.loadFolders()]);
      setFiles(filesData);
      setFolders(foldersData);
    } catch {
      showToast("加载数据失败", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // File operations
  const handleFileUpload = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;

      const filesArray = Array.from(fileList);
      const validFiles = filesArray.filter((file) => {
        if (file.size > CONFIG.UPLOAD.MAX_SIZE) {
          showToast(`文件 ${file.name} 超过1GB限制`, "error");
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) return;

      setIsUploading(true);

      try {
        const token = await api.getToken();

        for (const file of validFiles) {
          setUploadProgress(0);

          try {
            const result = await uploadApi.uploadToCrust(file, token, (progress) => {
              setUploadProgress(progress);
            });

            const fileRecord: FileRecord = {
              id: generateId(),
              name: file.name,
              size: result.size,
              cid: result.cid,
              date: new Date().toLocaleString(),
              folder_id: currentFolderId || "default",
              hash: result.hash,
              verified: false,
              verify_status: "pending",
              uploadedAt: Date.now(),
            };

            await api.saveFile(fileRecord);
            setFiles((prev) => [fileRecord, ...prev]);
            showToast(`文件 ${file.name} 上传成功`, "success");
          } catch {
            showToast(`文件 ${file.name} 上传失败`, "error");
          }
        }
      } catch {
        showToast("获取上传令牌失败", "error");
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [currentFolderId, setFiles, setIsUploading, setUploadProgress, showToast]
  );

  const handleDelete = useCallback(
    async (fileId: string | number) => {
      if (!confirm("确定要删除这个文件吗？")) return;

      try {
        await api.deleteFile(fileId);
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        showToast("文件已删除", "success");
      } catch {
        showToast("删除失败", "error");
      }
    },
    [setFiles, showToast]
  );

  const handleCopyCID = useCallback(
    async (cid: string, fileId: string | number) => {
      const success = await copyToClipboard(cid);
      if (success) {
        setCopiedId(fileId);
        showToast("CID 已复制到剪贴板", "success");
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        showToast("复制失败，请手动复制", "error");
      }
    },
    [showToast]
  );

  const handleShare = useCallback((file: FileRecord) => {
    setSelectedFileForShare(file);
    setShareUrl(`${window.location.origin}/share/${file.cid}`);
    setSharePassword("");
    setShareExpiry("7");
    setShareModalOpen(true);
  }, []);

  const handleCopyShareLink = useCallback(async () => {
    if (selectedFileForShare) {
      try {
        // 保存到服务端
        await shareApi.createShare({
          cid: selectedFileForShare.cid,
          filename: selectedFileForShare.name,
          size: selectedFileForShare.size,
          password: sharePassword,
          expiry: shareExpiry,
        });

        // 同时保存到localStorage作为备份和离线支持
        const shareData = {
          cid: selectedFileForShare.cid,
          filename: selectedFileForShare.name,
          size: selectedFileForShare.size,
          password: sharePassword,
          expiry: shareExpiry,
          createdAt: Date.now(),
        };

        const storedShares = localStorage.getItem("crustshare_shares");
        const shares = storedShares ? JSON.parse(storedShares) : [];
        const existingIndex = shares.findIndex((s: { cid: string }) => s.cid === selectedFileForShare.cid);

        if (existingIndex >= 0) {
          shares[existingIndex] = shareData;
        } else {
          shares.push(shareData);
        }

        localStorage.setItem("crustshare_shares", JSON.stringify(shares));
      } catch (error) {
        console.error("保存分享信息到服务端失败:", error);
        showToast("保存分享信息失败，但链接仍可复制", "warning");
      }
    }

    const success = await copyToClipboard(shareUrl);
    if (success) {
      showToast("分享链接已复制", "success");
    } else {
      showToast("复制失败", "error");
    }
  }, [selectedFileForShare, shareUrl, sharePassword, shareExpiry, showToast]);

  // Gateway operations
  const getAllGateways = useCallback(async () => {
    const allGateways = [...CONFIG.DEFAULT_GATEWAYS];

    // 从公共网关源获取更多网关
    try {
      const publicGateways = await gatewayApi.fetchPublicGateways();
      publicGateways.forEach((publicGateway) => {
        if (!allGateways.find((g) => g.url === publicGateway.url)) {
          allGateways.push(publicGateway);
        }
      });
    } catch {
      console.warn("获取公共网关列表失败，使用默认网关");
    }

    customGateways.forEach((custom) => {
      if (!allGateways.find((g) => g.url === custom.url)) {
        allGateways.push(custom);
      }
    });
    return allGateways;
  }, [customGateways]);

  const handleTestGateways = useCallback(async () => {
    setIsTestingGateways(true);
    showToast("正在检测网关可用性...", "info");

    try {
      const cached = gatewayApi.getCachedResults();
      if (cached) {
        setGateways(cached);
        showToast(
          `已加载缓存的网关状态 (${cached.filter((g) => g.available).length}/${cached.length} 可用)`,
          "success"
        );
      } else {
        const allGateways = await getAllGateways();
        const results = await gatewayApi.testAllGateways(allGateways);
        setGateways(results);
        gatewayApi.cacheResults(results);
        showToast(
          `网关检测完成 (${results.filter((g) => g.available).length}/${results.length} 可用)`,
          "success"
        );
      }
      setGatewayModalOpen(true);
    } catch {
      showToast("网关检测失败", "error");
    } finally {
      setIsTestingGateways(false);
    }
  }, [getAllGateways, showToast]);

  const handleRefreshGateways = useCallback(async () => {
    setIsTestingGateways(true);
    showToast("正在重新检测网关...", "info");

    try {
      const allGateways = await getAllGateways();
      const results = await gatewayApi.testAllGateways(allGateways);
      setGateways(results);
      gatewayApi.cacheResults(results);
      showToast(
        `网关检测完成 (${results.filter((g) => g.available).length}/${results.length} 可用)`,
        "success"
      );
    } catch {
      showToast("网关检测失败", "error");
    } finally {
      setIsTestingGateways(false);
    }
  }, [getAllGateways, showToast]);

  const handleTestSingleGateway = useCallback(
    async (gateway: Gateway) => {
      showToast(`正在测试 ${gateway.name}...`, "info");
      const result = await gatewayApi.testGateway(gateway);
      setGateways((prev) =>
        prev.map((g) =>
          g.name === gateway.name
            ? { ...g, available: result.available, latency: result.latency, lastChecked: Date.now() }
            : g
        )
      );
      showToast(
        result.available ? `${gateway.name} 可用 (${result.latency}ms)` : `${gateway.name} 不可用`,
        result.available ? "success" : "error"
      );
    },
    [showToast]
  );

  const handleAddCustomGateway = useCallback(() => {
    if (!newGatewayName.trim() || !newGatewayUrl.trim()) {
      showToast("请输入网关名称和URL", "error");
      return;
    }

    let url = newGatewayUrl.trim();
    if (!url.endsWith("/")) {
      url += "/";
    }
    if (!url.includes("/ipfs/")) {
      url += "ipfs/";
    }

    const newGateway: Gateway = {
      name: newGatewayName.trim(),
      url: url,
      icon: "🌐",
      priority: 100,
      region: newGatewayRegion,
    };

    addCustomGateway(newGateway);
    setNewGatewayName("");
    setNewGatewayUrl("");
    setAddGatewayModalOpen(false);
    showToast("自定义网关添加成功", "success");
    handleRefreshGateways();
  }, [newGatewayName, newGatewayUrl, newGatewayRegion, addCustomGateway, showToast, handleRefreshGateways]);

  const handleRemoveCustomGateway = useCallback(
    (name: string) => {
      removeCustomGateway(name);
      showToast("自定义网关已删除", "success");
      setGateways((prev) => prev.filter((g) => g.name !== name));
    },
    [removeCustomGateway, showToast]
  );

  // Download operations
  const getBestGateway = useCallback(async (): Promise<string> => {
    // 先检查缓存
    const cached = gatewayApi.getCachedResults();
    if (cached && cached.length > 0) {
      const availableGateways = cached.filter((g) => g.available);
      if (availableGateways.length > 0) {
        const bestGateway = availableGateways.sort(
          (a, b) => (a.latency || Infinity) - (b.latency || Infinity)
        )[0];
        showToast(`使用最优网关: ${bestGateway.name} (${bestGateway.latency}ms)`, "success");
        return bestGateway.url;
      }
    }

    // 如果没有缓存，自动检测
    showToast("正在自动检测可用网关...", "info");
    try {
      const { url, gateway } = await gatewayApi.getBestGatewayUrl(customGateways);
      if (gateway) {
        showToast(`使用最优网关: ${gateway.name} (${gateway.latency}ms)`, "success");
      }
      return url;
    } catch {
      return "https://ipfs.io/ipfs/";
    }
  }, [showToast, customGateways]);

  const handleDownload = useCallback(
    async (cid: string, filename: string) => {
      const gatewayUrl = await getBestGateway();
      const url = `${gatewayUrl}${cid}`;
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [getBestGateway]
  );

  const handleDownloadWithGateway = useCallback(
    (cid: string, filename: string, gateway: Gateway) => {
      const url = `${gateway.url}${cid}`;
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`正在通过 ${gateway.name} 下载...`, "success");
    },
    [showToast]
  );

  // Folder operations
  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) {
      showToast("请输入文件夹名称", "error");
      return;
    }

    try {
      const newFolder = await api.createFolder(newFolderName.trim(), currentFolderId);
      setFolders((prev) => [...prev, newFolder]);
      setNewFolderName("");
      setFolderModalOpen(false);
      showToast("文件夹创建成功", "success");
    } catch {
      showToast("创建文件夹失败", "error");
    }
  }, [newFolderName, currentFolderId, setFolders, showToast]);

  const handleRenameFolder = useCallback(async () => {
    if (!editingFolder || !newFolderName.trim()) {
      showToast("请输入文件夹名称", "error");
      return;
    }

    try {
      await api.renameFolder(editingFolder.id, newFolderName.trim());
      setFolders((prev) =>
        prev.map((f) => (f.id === editingFolder.id ? { ...f, name: newFolderName.trim() } : f))
      );
      setEditingFolder(null);
      setNewFolderName("");
      setFolderModalOpen(false);
      showToast("文件夹重命名成功", "success");
    } catch {
      showToast("重命名文件夹失败", "error");
    }
  }, [editingFolder, newFolderName, setFolders, showToast]);

  const handleDeleteFolder = useCallback(
    async (folderId: string) => {
      if (!confirm("确定要删除这个文件夹吗？文件夹中的文件不会被删除。")) return;

      try {
        await api.deleteFolder(folderId);
        setFolders((prev) => prev.filter((f) => f.id !== folderId));
        if (currentFolderId === folderId) {
          setCurrentFolderId(null);
        }
        showToast("文件夹已删除", "success");
      } catch {
        showToast("删除文件夹失败", "error");
      }
    },
    [currentFolderId, setFolders, showToast]
  );

  const handleMoveFile = useCallback(
    async (targetFolderId: string | null) => {
      if (!selectedFileToMove) return;

      try {
        await api.moveFiles([selectedFileToMove.id], targetFolderId || "default");
        setFiles((prev) =>
          prev.map((f) =>
            f.id === selectedFileToMove.id ? { ...f, folder_id: targetFolderId || "default" } : f
          )
        );
        setMoveModalOpen(false);
        setSelectedFileToMove(null);
        showToast("文件移动成功", "success");
      } catch {
        showToast("移动文件失败", "error");
      }
    },
    [selectedFileToMove, setFiles, showToast]
  );

  // CID operations
  const handleAddCid = useCallback(async () => {
    if (!newCid.trim()) {
      showToast("请输入CID", "error");
      return;
    }

    setIsAddingCid(true);

    try {
      let name = newCidName.trim();
      let size = newCidSize ? parseInt(newCidSize) : 0;

      if (!name) {
        setIsDetectingCid(true);
        showToast("正在检测CID信息...", "info");
        const cidInfo = await api.fetchCidInfo(newCid.trim());
        if (cidInfo) {
          name = cidInfo.name;
          size = cidInfo.size;
          setNewCidName(name);
          setNewCidSize(size.toString());
          showToast(`检测到文件名: ${name}`, "success");
        } else {
          name = `file-${newCid.trim().slice(0, 8)}`;
          setNewCidName(name);
          showToast("无法自动检测文件名，使用默认名称", "warning");
        }
        setIsDetectingCid(false);
      }

      const newFile = await api.addCid(newCid.trim(), name, size, currentFolderId || "default");
      setFiles((prev) => [...prev, newFile]);
      setAddCidModalOpen(false);
      setNewCid("");
      setNewCidName("");
      setNewCidSize("");
      showToast("CID添加成功", "success");
    } catch {
      showToast("添加CID失败", "error");
    } finally {
      setIsAddingCid(false);
      setIsDetectingCid(false);
    }
  }, [newCid, newCidName, newCidSize, currentFolderId, setFiles, showToast]);

  // Filter files
  const filteredFiles = files.filter((file) => {
    const matchesSearch =
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.cid.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = currentFolderId
      ? file.folder_id === currentFolderId
      : !file.folder_id || file.folder_id === "default";
    return matchesSearch && matchesFolder;
  });

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const currentFolderName = currentFolderId
    ? folders.find((f) => f.id === currentFolderId)?.name || "全部文件"
    : "全部文件";

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
      {/* Sidebar */}
      <Sidebar
        totalSize={totalSize}
        filesCount={files.length}
        foldersCount={folders.length}
        folders={folders}
        currentFolderId={currentFolderId}
        isUploading={isUploading}
        isTestingGateways={isTestingGateways}
        onUploadClick={() => fileInputRef.current?.click()}
        onAddCidClick={() => setAddCidModalOpen(true)}
        onTestGateways={handleTestGateways}
        onFolderSelect={setCurrentFolderId}
        onCreateFolder={() => {
          setEditingFolder(null);
          setNewFolderName("");
          setFolderModalOpen(true);
        }}
        onEditFolder={(folder) => {
          setEditingFolder(folder);
          setNewFolderName(folder.name);
          setFolderModalOpen(true);
        }}
        onDeleteFolder={handleDeleteFolder}
        onLogout={() => {
          logout();
          router.push("/");
        }}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-white/20 bg-white/30 px-6 backdrop-blur-sm">
          <div className="flex items-center flex-1">
            {currentFolderId && (
              <Button variant="ghost" size="sm" className="mr-2" onClick={() => setCurrentFolderId(null)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                返回
              </Button>
            )}
            <h2 className="text-lg font-semibold mr-4">{currentFolderName}</h2>
            <div className="flex items-center flex-1 max-w-xl">
              <Search className="mr-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索文件..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 bg-transparent focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-white/50" : ""}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "bg-white/50" : ""}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSettingsModalOpen(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Upload Progress */}
        {isUploading && (
          <div className="border-b border-white/20 bg-white/30 px-6 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center">
                <Upload className="h-4 w-4 mr-2 animate-pulse" />
                正在上传...
              </span>
              <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* File List */}
        <div
          className={`h-[calc(100vh-4rem)] overflow-auto p-6 ${dragOver ? "bg-cloudchan-purple/10" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFileUpload(e.dataTransfer.files);
          }}
        >
          <FileList
            files={filteredFiles}
            viewMode={viewMode}
            isLoading={isLoading}
            copiedId={copiedId}
            onCopyCid={handleCopyCID}
            onShare={handleShare}
            onDownload={handleDownload}
            onDownloadMenu={(file) => {
              setSelectedFileForDownload(file);
              setDownloadModalOpen(true);
            }}
            onMove={(file) => {
              setSelectedFileToMove(file);
              setMoveModalOpen(true);
            }}
            onDelete={handleDelete}
          />
        </div>
      </main>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
      />

      {/* Modals */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        file={selectedFileForShare}
        shareUrl={shareUrl}
        sharePassword={sharePassword}
        shareExpiry={shareExpiry}
        onPasswordChange={setSharePassword}
        onExpiryChange={setShareExpiry}
        onCopyLink={handleCopyShareLink}
        onCopyCid={() => selectedFileForShare && handleCopyCID(selectedFileForShare.cid, selectedFileForShare.id)}
      />

      <GatewayModal
        isOpen={gatewayModalOpen}
        onClose={() => setGatewayModalOpen(false)}
        gateways={gateways}
        customGateways={customGateways}
        isTesting={isTestingGateways}
        onRefresh={handleRefreshGateways}
        onAdd={() => setAddGatewayModalOpen(true)}
        onTest={handleTestSingleGateway}
        onRemove={handleRemoveCustomGateway}
        onUpdate={setGateways}
      />

      <FolderModal
        isOpen={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        folderName={newFolderName}
        isEditing={!!editingFolder}
        onNameChange={setNewFolderName}
        onSubmit={editingFolder ? handleRenameFolder : handleCreateFolder}
      />

      <MoveModal
        isOpen={moveModalOpen}
        onClose={() => setMoveModalOpen(false)}
        file={selectedFileToMove}
        folders={folders}
        onMove={handleMoveFile}
      />

      <AddCidModal
        isOpen={addCidModalOpen}
        onClose={() => setAddCidModalOpen(false)}
        cid={newCid}
        name={newCidName}
        size={newCidSize}
        isAdding={isAddingCid}
        isDetecting={isDetectingCid}
        onCidChange={setNewCid}
        onNameChange={setNewCidName}
        onSizeChange={setNewCidSize}
        onSubmit={handleAddCid}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        darkMode={darkMode}
        itemsPerPage={itemsPerPage}
        autoRefresh={autoRefresh}
        filesCount={files.length}
        foldersCount={folders.length}
        totalSize={totalSize}
        onDarkModeChange={(value) => {
          setDarkMode(value);
          showToast(value ? "已切换到深色模式" : "已切换到浅色模式", "success");
        }}
        onItemsPerPageChange={(value) => {
          setItemsPerPage(value);
          showToast(`每页显示 ${value} 个文件`, "success");
        }}
        onAutoRefreshChange={(value) => {
          setAutoRefresh(value);
          showToast(value ? "已开启自动刷新" : "已关闭自动刷新", "success");
        }}
      />

      <DownloadModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        file={selectedFileForDownload}
        gateways={gateways}
        customGateways={customGateways}
        onDownload={handleDownload}
        onDownloadWithGateway={handleDownloadWithGateway}
        onTestGateways={handleTestGateways}
      />

      <AddGatewayModal
        isOpen={addGatewayModalOpen}
        onClose={() => setAddGatewayModalOpen(false)}
        name={newGatewayName}
        url={newGatewayUrl}
        region={newGatewayRegion}
        onNameChange={setNewGatewayName}
        onUrlChange={setNewGatewayUrl}
        onRegionChange={setNewGatewayRegion}
        onSubmit={handleAddCustomGateway}
      />
    </div>
  );
}
