export interface ArchiveTreeNode {
  id: string; // fullPath
  name: string;
  type: "folder" | "file";
  path: string;
  children?: ArchiveTreeNode[];
  size?: number;
}

export interface ListArchiveContentsInput {
  folderPath: string;
  maxDepth?: number; // 기본 3
}

export interface ReadArchiveFileInput {
  filePath: string;
}

export interface SaveArchiveFileInput {
  filePath: string;
  content: string;
}
