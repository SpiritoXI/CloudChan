import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { cache, CacheKeys, CacheTTL } from '@/lib/cache';

export interface FileVersion {
  id: string;
  version: number;
  size: number;
  uploadDate: string;
  cid: string;
  comment?: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadDate: string;
  cid?: string;
  url?: string;
  status: 'uploading' | 'completed' | 'error';
  progress?: number;
  folderId?: string | null;
  tags?: string[];
  versions?: FileVersion[];
  currentVersion?: number;
}

interface StoreState {
  isAuthenticated: boolean;
  password: string;
  files: FileItem[];
  folders: Folder[];
  tags: Tag[];
  currentFolderId: string | null;
  searchTerm: string;
  selectedFiles: string[];
  setIsAuthenticated: (value: boolean) => void;
  setPassword: (value: string) => void;
  addFile: (file: FileItem) => void;
  updateFile: (id: string, updates: Partial<FileItem>) => void;
  deleteFile: (id: string) => void;
  setSearchTerm: (term: string) => void;
  toggleFileSelection: (id: string) => void;
  clearSelection: () => void;
  fileExists: (name: string) => boolean;
  getFileByName: (name: string) => FileItem | undefined;
  addFolder: (folder: Folder) => void;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;
  setCurrentFolder: (folderId: string | null) => void;
  getFolderById: (id: string) => Folder | undefined;
  getFoldersByParent: (parentId: string | null) => Folder[];
  addTag: (tag: Tag) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  addTagToFile: (fileId: string, tagId: string) => void;
  removeTagFromFile: (fileId: string, tagId: string) => void;
  getTagsByFile: (fileId: string) => Tag[];
  addVersion: (fileId: string, version: FileVersion) => void;
  restoreVersion: (fileId: string, version: number) => void;
  deleteVersion: (fileId: string, version: number) => void;
  getVersions: (fileId: string) => FileVersion[];
}

const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      password: '',
      files: [],
      folders: [],
      tags: [],
      currentFolderId: null,
      searchTerm: '',
      selectedFiles: [],
      setIsAuthenticated: (value) => set({ isAuthenticated: value }),
      setPassword: (value) => set({ password: value }),
      addFile: (file) => set((state) => ({ files: [...state.files, file] })),
      updateFile: (id, updates) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id ? { ...file, ...updates } : file
          ),
        })),
      deleteFile: (id) =>
        set((state) => ({ files: state.files.filter((file) => file.id !== id) })),
      setSearchTerm: (term) => set({ searchTerm: term }),
      toggleFileSelection: (id) =>
        set((state) => ({
          selectedFiles: state.selectedFiles.includes(id)
            ? state.selectedFiles.filter((fileId) => fileId !== id)
            : [...state.selectedFiles, id],
        })),
      clearSelection: () => set({ selectedFiles: [] }),
      fileExists: (name: string): boolean => {
        const state = get();
        return state.files.some((file: FileItem) => file.name === name);
      },
      getFileByName: (name: string): FileItem | undefined => {
        const state = get();
        return state.files.find((file: FileItem) => file.name === name);
      },
      addFolder: (folder: Folder) =>
        set((state) => ({ folders: [...state.folders, folder] })),
      updateFolder: (id, updates) =>
        set((state) => ({
          folders: state.folders.map((folder) =>
            folder.id === id ? { ...folder, ...updates } : folder
          ),
        })),
      deleteFolder: (id) =>
        set((state) => ({
          folders: state.folders.filter((folder) => folder.id !== id),
          files: state.files.map((file) =>
            file.folderId === id ? { ...file, folderId: null } : file
          ),
        })),
      setCurrentFolder: (folderId) => set({ currentFolderId: folderId }),
      getFolderById: (id) => {
        const state = get();
        return state.folders.find((folder: Folder) => folder.id === id);
      },
      getFoldersByParent: (parentId) => {
        const state = get();
        return state.folders.filter(
          (folder: Folder) => folder.parentId === parentId
        );
      },
      addTag: (tag: Tag) =>
        set((state) => ({ tags: [...state.tags, tag] })),
      updateTag: (id, updates) =>
        set((state) => ({
          tags: state.tags.map((tag) =>
            tag.id === id ? { ...tag, ...updates } : tag
          ),
        })),
      deleteTag: (id) =>
        set((state) => ({
          tags: state.tags.filter((tag) => tag.id !== id),
          files: state.files.map((file) => ({
            ...file,
            tags: file.tags?.filter((tagId) => tagId !== id) || [],
          })),
        })),
      addTagToFile: (fileId, tagId) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === fileId
              ? { ...file, tags: [...(file.tags || []), tagId] }
              : file
          ),
        })),
      removeTagFromFile: (fileId, tagId) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === fileId
              ? { ...file, tags: (file.tags || []).filter((id) => id !== tagId) }
              : file
          ),
        })),
      getTagsByFile: (fileId) => {
        const state = get();
        const file = state.files.find((f) => f.id === fileId);
        if (!file || !file.tags) return [];
        return state.tags.filter((tag) => file.tags?.includes(tag.id));
      },
      addVersion: (fileId, version) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === fileId
              ? {
                  ...file,
                  versions: [...(file.versions || []), version],
                  currentVersion: version.version,
                  size: version.size,
                  cid: version.cid,
                }
              : file
          ),
        })),
      restoreVersion: (fileId, version) =>
        set((state) => {
          const file = state.files.find((f) => f.id === fileId);
          if (!file || !file.versions) return state;

          const targetVersion = file.versions.find((v) => v.version === version);
          if (!targetVersion) return state;

          return {
            ...state,
            files: state.files.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    currentVersion: version,
                    size: targetVersion.size,
                    cid: targetVersion.cid,
                  }
                : f
            ),
          };
        }),
      deleteVersion: (fileId, version) =>
        set((state) => {
          const file = state.files.find((f) => f.id === fileId);
          if (!file || !file.versions) return state;

          const newVersions = file.versions.filter((v) => v.version !== version);
          const newCurrentVersion =
            file.currentVersion === version
              ? newVersions.length > 0
                ? Math.max(...newVersions.map((v) => v.version))
                : 1
              : file.currentVersion;

          return {
            ...state,
            files: state.files.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    versions: newVersions,
                    currentVersion: newCurrentVersion,
                  }
                : f
            ),
          };
        }),
      getVersions: (fileId) => {
        const state = get();
        const file = state.files.find((f) => f.id === fileId);
        return file?.versions || [];
      },
    }),
    {
      name: 'crustshare-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        files: state.files,
        folders: state.folders,
        tags: state.tags,
      }),
    }
  )
);

export default useStore;
