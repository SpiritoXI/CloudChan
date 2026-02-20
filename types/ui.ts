export type ViewMode = 'list' | 'grid';
export type FileSortField = 'name' | 'size' | 'date' | 'type';
export type FileSortOrder = 'asc' | 'desc';

export interface FileFilter {
  folderId?: string;
  searchQuery?: string;
  tags?: string[];
  fileType?: string;
}

export interface StorageStats {
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
}
