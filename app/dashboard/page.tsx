"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cloud,
  Upload,
  Folder,
  File,
  Search,
  Settings,
  LogOut,
  Grid3X3,
  List,
  Plus,
  Download,
  Share2,
  Trash2,
  MoreVertical,
  Copy,
  Check,
  X,
  Globe,
  Zap,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAuthStore, useFileStore, useUIStore, useUploadStore } from "@/lib/store";
import { api, uploadApi, gatewayApi } from "@/lib/api";
import { CONFIG } from "@/lib/config";
import { formatFileSize, formatDate, getFileIcon, generateId, copyToClipboard } from "@/lib/utils";
import type { FileRecord, Gateway, Folder as FolderType } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, logout, password } = useAuthStore();
  const { files, folders, setFiles, setFolders, selectedFiles, toggleFileSelection, clearSelection } = useFileStore();
  const { showToast } = useUIStore();
  const { isUploading, uploadProgress, setIsUploading, setUploadProgress } = useUploadStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isLoading, setIsLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedFileForShare, setSelectedFileForShare] = useState<FileRecord | null>(null);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [isTestingGateways, setIsTestingGateways] = useState(false);
  const [gatewayModalOpen, setGatewayModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [sharePassword, setSharePassword] = useState("");
  const [shareExpiry, setShareExpiry] = useState("7");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [selectedFileToMove, setSelectedFileToMove] = useState<FileRecord | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

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
    } catch (error) {
      showToast("加载数据失败", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleFileUpload = async (fileList: FileList | null) => {
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
            folder_id: "default",
            hash: result.hash,
            verified: false,
            verify_status: "pending",
            uploadedAt: Date.now(),
          };

          await api.saveFile(fileRecord);
          setFiles([fileRecord, ...files]);
          showToast(`文件 ${file.name} 上传成功`, "success");

          uploadApi.verifyFile(result.cid).then((verifyResult) => {
            if (verifyResult.verified) {
              api.saveFile({ ...fileRecord, verified: true, verify_status: "ok" });
            }
          });
        } catch (error) {
          showToast(`文件 ${file.name} 上传失败`, "error");
        }
      }
    } catch (error) {
      showToast("获取上传令牌失败", "error");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (fileId: string | number) => {
    if (!confirm("确定要删除这个文件吗？")) return;

    try {
      await api.deleteFile(fileId);
      setFiles(files.filter((f) => f.id !== fileId));
      showToast("文件已删除", "success");
    } catch {
      showToast("删除失败", "error");
    }
  };

  const handleDownload = (cid: string, filename: string) => {
    const url = `https://ipfs.io/ipfs/${cid}`;
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyCID = async (cid: string, fileId: string | number) => {
    const success = await copyToClipboard(cid);
    if (success) {
      setCopiedId(fileId);
      showToast("CID 已复制到剪贴板", "success");
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      showToast("复制失败，请手动复制", "error");
    }
  };

  const handleShare = (file: FileRecord) => {
    setSelectedFileForShare(file);
    setShareUrl(`${window.location.origin}/share/${file.cid}`);
    setShareModalOpen(true);
  };

  const handleCopyShareLink = async () => {
    const success = await copyToClipboard(shareUrl);
    if (success) {
      showToast("分享链接已复制", "success");
    } else {
      showToast("复制失败", "error");
    }
  };

  const handleTestGateways = async () => {
    setIsTestingGateways(true);
    showToast("正在检测网关可用性...", "info");
    
    try {
      const cached = gatewayApi.getCachedResults();
      if (cached) {
        setGateways(cached);
        showToast(`已加载缓存的网关状态 (${cached.filter(g => g.available).length}/${cached.length} 可用)`, "success");
      } else {
        const results = await gatewayApi.testAllGateways(CONFIG.DEFAULT_GATEWAYS);
        setGateways(results);
        gatewayApi.cacheResults(results);
        showToast(`网关检测完成 (${results.filter(g => g.available).length}/${results.length} 可用)`, "success");
      }
      setGatewayModalOpen(true);
    } catch (error) {
      showToast("网关检测失败", "error");
    } finally {
      setIsTestingGateways(false);
    }
  };

  const handleRefreshGateways = async () => {
    setIsTestingGateways(true);
    showToast("正在重新检测网关...", "info");
    
    try {
      const results = await gatewayApi.testAllGateways(CONFIG.DEFAULT_GATEWAYS);
      setGateways(results);
      gatewayApi.cacheResults(results);
      showToast(`网关检测完成 (${results.filter(g => g.available).length}/${results.length} 可用)`, "success");
    } catch (error) {
      showToast("网关检测失败", "error");
    } finally {
      setIsTestingGateways(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      showToast("请输入文件夹名称", "error");
      return;
    }

    try {
      const newFolder = await api.createFolder(newFolderName.trim(), currentFolderId);
      setFolders([...folders, newFolder]);
      setNewFolderName("");
      setFolderModalOpen(false);
      showToast("文件夹创建成功", "success");
    } catch (error) {
      showToast("创建文件夹失败", "error");
    }
  };

  const handleRenameFolder = async () => {
    if (!editingFolder || !newFolderName.trim()) {
      showToast("请输入文件夹名称", "error");
      return;
    }

    try {
      await api.renameFolder(editingFolder.id, newFolderName.trim());
      setFolders(folders.map(f => f.id === editingFolder.id ? { ...f, name: newFolderName.trim() } : f));
      setEditingFolder(null);
      setNewFolderName("");
      setFolderModalOpen(false);
      showToast("文件夹重命名成功", "success");
    } catch (error) {
      showToast("重命名文件夹失败", "error");
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("确定要删除这个文件夹吗？文件夹中的文件不会被删除。")) return;

    try {
      await api.deleteFolder(folderId);
      setFolders(folders.filter(f => f.id !== folderId));
      if (currentFolderId === folderId) {
        setCurrentFolderId(null);
      }
      showToast("文件夹已删除", "success");
    } catch (error) {
      showToast("删除文件夹失败", "error");
    }
  };

  const handleMoveFile = async (targetFolderId: string | null) => {
    if (!selectedFileToMove) return;

    try {
      await api.moveFiles([selectedFileToMove.id], targetFolderId || "default");
      setFiles(files.map(f => f.id === selectedFileToMove.id ? { ...f, folder_id: targetFolderId || "default" } : f));
      setMoveModalOpen(false);
      setSelectedFileToMove(null);
      showToast("文件移动成功", "success");
    } catch (error) {
      showToast("移动文件失败", "error");
    }
  };

  const toggleFolderExpand = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const getCurrentFolderName = () => {
    if (!currentFolderId) return "全部文件";
    const folder = folders.find(f => f.id === currentFolderId);
    return folder ? folder.name : "全部文件";
  };

  const filteredFiles = files.filter(
    (file) => {
      const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.cid.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFolder = currentFolderId 
        ? file.folder_id === currentFolderId
        : (!file.folder_id || file.folder_id === "default");
      return matchesSearch && matchesFolder;
    }
  );

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        className="w-64 glass border-r border-white/20"
      >
        <div className="flex h-16 items-center border-b border-white/20 px-6">
          <Cloud className="mr-2 h-6 w-6 text-cloudchan-purple" />
          <span className="text-xl font-bold gradient-text">CrustShare</span>
        </div>

        <div className="p-4">
          <div className="mb-6 rounded-xl bg-white/50 p-4">
            <div className="mb-2 text-sm font-medium text-muted-foreground">存储空间</div>
            <div className="mb-2 text-2xl font-bold">{formatFileSize(totalSize)}</div>
            <Progress value={Math.min((totalSize / (1024 * 1024 * 1024)) * 100, 100)} className="h-2" />
            <div className="mt-2 text-xs text-muted-foreground">
              {files.length} 个文件 · {folders.length} 个文件夹
            </div>
          </div>

          <Button
            className="mb-4 w-full bg-gradient-to-r from-cloudchan-blue to-cloudchan-purple"
            onClick={() => document.getElementById("fileInput")?.click()}
            disabled={isUploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {isUploading ? "上传中..." : "上传文件"}
          </Button>

          <input
            id="fileInput"
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />

          <nav className="space-y-1 mb-4">
            <Button 
              variant="ghost" 
              className={`w-full justify-start ${!currentFolderId ? 'bg-white/30' : ''}`}
              onClick={() => setCurrentFolderId(null)}
            >
              <Folder className="mr-2 h-4 w-4" />
              全部文件
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Upload className="mr-2 h-4 w-4" />
              最近上传
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Share2 className="mr-2 h-4 w-4" />
              我的分享
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleTestGateways}
              disabled={isTestingGateways}
            >
              <Globe className="mr-2 h-4 w-4" />
              {isTestingGateways ? "检测中..." : "网关检测"}
            </Button>
          </nav>

          {/* Folders Section */}
          <div className="border-t border-white/20 pt-4">
            <div className="flex items-center justify-between mb-2 px-3">
              <span className="text-xs font-medium text-muted-foreground uppercase">文件夹</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  setEditingFolder(null);
                  setNewFolderName("");
                  setFolderModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {folders.length === 0 ? (
                <p className="text-xs text-muted-foreground px-3 py-2">暂无文件夹</p>
              ) : (
                folders.map((folder) => (
                  <div key={folder.id} className="group">
                    <Button
                      variant="ghost"
                      className={`w-full justify-start text-sm ${currentFolderId === folder.id ? 'bg-white/30' : ''}`}
                      onClick={() => setCurrentFolderId(folder.id)}
                    >
                      {currentFolderId === folder.id ? (
                        <FolderOpen className="mr-2 h-4 w-4 text-cloudchan-purple" />
                      ) : (
                        <Folder className="mr-2 h-4 w-4" />
                      )}
                      <span className="truncate flex-1 text-left">{folder.name}</span>
                      <div className="opacity-0 group-hover:opacity-100 flex">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFolder(folder);
                            setNewFolderName(folder.name);
                            setFolderModalOpen(true);
                          }}
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 w-full border-t border-white/20 p-4">
          <Button variant="ghost" className="w-full justify-start text-destructive" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            退出登录
          </Button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-white/20 bg-white/30 px-6 backdrop-blur-sm">
          <div className="flex items-center flex-1">
            {currentFolderId && (
              <Button
                variant="ghost"
                size="sm"
                className="mr-2"
                onClick={() => setCurrentFolderId(null)}
              >
                ← 返回
              </Button>
            )}
            <h2 className="text-lg font-semibold mr-4">{getCurrentFolderName()}</h2>
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
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Upload Progress */}
        {isUploading && (
          <div className="border-b border-white/20 bg-white/30 px-6 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">正在上传...</span>
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
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-cloudchan-purple border-t-transparent" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <Cloud className="mb-4 h-16 w-16 opacity-50" />
              <p className="text-lg font-medium">暂无文件</p>
              <p className="text-sm">拖拽文件到此处或点击上传按钮</p>
            </div>
          ) : viewMode === "list" ? (
            <div className="rounded-xl glass overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">文件名</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">大小</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">上传时间</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">CID</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((file, index) => (
                    <motion.tr
                      key={file.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-t border-white/20 hover:bg-white/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <span className="mr-2">{getFileIcon(file.name)}</span>
                          <span className="truncate max-w-[200px]">{file.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{formatFileSize(file.size)}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(file.date)}</td>
                      <td className="px-4 py-3">
                        <code className="rounded bg-white/50 px-2 py-1 text-xs">{file.cid.slice(0, 12)}...</code>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleCopyCID(file.cid, file.id)}
                            title="复制 CID"
                          >
                            {copiedId === file.id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleShare(file)}
                            title="分享"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDownload(file.cid, file.name)}
                            title="下载"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedFileToMove(file);
                              setMoveModalOpen(true);
                            }}
                            title="移动到文件夹"
                          >
                            <Folder className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete(file.id)}
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredFiles.map((file, index) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass rounded-xl p-4 card-hover cursor-pointer relative group"
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 bg-white/80"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyCID(file.cid, file.id);
                      }}
                      title="复制 CID"
                    >
                      {copiedId === file.id ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 bg-white/80"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(file);
                      }}
                      title="分享"
                    >
                      <Share2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 bg-white/80"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(file.cid, file.name);
                      }}
                      title="下载"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="mb-3 flex h-16 items-center justify-center text-4xl">
                    {getFileIcon(file.name)}
                  </div>
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Share Modal */}
      <AnimatePresence>
        {shareModalOpen && selectedFileForShare && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShareModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">分享文件</h3>
                <Button variant="ghost" size="icon" onClick={() => setShareModalOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium truncate">{selectedFileForShare.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(selectedFileForShare.size)}</p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">分享链接</label>
                  <div className="flex space-x-2">
                    <Input value={shareUrl} readOnly className="flex-1" />
                    <Button onClick={handleCopyShareLink}>
                      <Copy className="h-4 w-4 mr-1" />
                      复制
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">访问密码（可选）</label>
                  <Input
                    type="text"
                    placeholder="设置访问密码"
                    value={sharePassword}
                    onChange={(e) => setSharePassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">有效期</label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={shareExpiry}
                    onChange={(e) => setShareExpiry(e.target.value)}
                  >
                    <option value="1">1天</option>
                    <option value="7">7天</option>
                    <option value="30">30天</option>
                    <option value="0">永久有效</option>
                  </select>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2">CID: {selectedFileForShare.cid}</p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleCopyCID(selectedFileForShare.cid, selectedFileForShare.id)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    复制 CID
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gateway Modal */}
      <AnimatePresence>
        {gatewayModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setGatewayModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h3 className="text-lg font-semibold flex items-center">
                    <Globe className="h-5 w-5 mr-2" />
                    网关可用性检测
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    可用: {gateways.filter(g => g.available).length} / 总数: {gateways.length}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshGateways}
                    disabled={isTestingGateways}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${isTestingGateways ? 'animate-spin' : ''}`} />
                    重新检测
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setGatewayModalOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-6">
                {isTestingGateways && gateways.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="h-8 w-8 animate-spin text-cloudchan-purple" />
                    <span className="ml-2">正在检测网关...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {gateways.map((gateway, index) => (
                      <motion.div
                        key={gateway.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          gateway.available
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">{gateway.icon}</span>
                          <div>
                            <p className="font-medium text-sm">{gateway.name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                              {gateway.url}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {gateway.available ? (
                            <>
                              <span className="text-xs text-green-600 font-medium">
                                {gateway.latency}ms
                              </span>
                              <Zap className="h-4 w-4 text-green-500" />
                            </>
                          ) : (
                            <span className="text-xs text-red-500">不可用</span>
                          )}
                          <a
                            href={gateway.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Folder Modal */}
      <AnimatePresence>
        {folderModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setFolderModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {editingFolder ? "重命名文件夹" : "新建文件夹"}
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setFolderModalOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">文件夹名称</label>
                  <Input
                    placeholder="输入文件夹名称"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        editingFolder ? handleRenameFolder() : handleCreateFolder();
                      }
                    }}
                    autoFocus
                  />
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setFolderModalOpen(false)}
                  >
                    取消
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-cloudchan-blue to-cloudchan-purple"
                    onClick={editingFolder ? handleRenameFolder : handleCreateFolder}
                    disabled={!newFolderName.trim()}
                  >
                    {editingFolder ? "保存" : "创建"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Move File Modal */}
      <AnimatePresence>
        {moveModalOpen && selectedFileToMove && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setMoveModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">移动到文件夹</h3>
                <Button variant="ghost" size="icon" onClick={() => setMoveModalOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                <p className="text-sm text-muted-foreground mb-2">
                  移动文件: {selectedFileToMove.name}
                </p>
                
                <Button
                  variant="ghost"
                  className={`w-full justify-start ${!selectedFileToMove.folder_id || selectedFileToMove.folder_id === 'default' ? 'bg-slate-100' : ''}`}
                  onClick={() => handleMoveFile(null)}
                >
                  <Folder className="mr-2 h-4 w-4" />
                  根目录（全部文件）
                  {(!selectedFileToMove.folder_id || selectedFileToMove.folder_id === 'default') && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </Button>

                {folders.map((folder) => (
                  <Button
                    key={folder.id}
                    variant="ghost"
                    className={`w-full justify-start ${selectedFileToMove.folder_id === folder.id ? 'bg-slate-100' : ''}`}
                    onClick={() => handleMoveFile(folder.id)}
                  >
                    <Folder className="mr-2 h-4 w-4" />
                    {folder.name}
                    {selectedFileToMove.folder_id === folder.id && (
                      <Check className="ml-auto h-4 w-4" />
                    )}
                  </Button>
                ))}
              </div>

              <div className="mt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setMoveModalOpen(false)}
                >
                  取消
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
