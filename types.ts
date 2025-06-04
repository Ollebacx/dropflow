export interface ImageFile {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number; // timestamp
  dataUrl: string; // for preview
  fileObject: File; // original file object
  associatedReferenceId?: string | null;
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
