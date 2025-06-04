export interface ImageFile {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number; // timestamp
  dataUrl?: string; // for preview, now optional
  fileObject: File; // original file object
  associatedReferenceId?: string | null;
  rating?: number; // 0-5 stars, 0 or undefined for no rating
  source: 'manual' | 'synced'; // Origin of the file
  syncedFolderName?: string; // Name of the directory if source is 'synced'
}

export interface Reference {
  id: string;
  text: string;
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum ImageFilterType {
  ALL = 'all',
  ASSOCIATED = 'associated',
  UNASSOCIATED = 'unassociated',
}