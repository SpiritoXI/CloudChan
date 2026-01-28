import { create } from 'zustand';

export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadDate: string;
  cid?: string;
  status: 'uploading' | 'completed' | 'error';
  progress?: number;
}

interface StoreState {
  isAuthenticated: boolean;
  password: string;
  files: FileItem[];
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
}

const useStore = create<StoreState>((set) => ({
  isAuthenticated: false,
  password: '',
  files: [],
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
}));

export default useStore;
