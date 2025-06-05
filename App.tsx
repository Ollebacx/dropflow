
import React, { useState, useCallback, useMemo, DragEvent as ReactDragEvent, useEffect, useRef } from 'react';
import { ImageFile, Reference, SortOrder, ImageFilterType } from './types';
import ImageGridItem from './components/ImageGridItem';
import ReferenceItem from './components/ReferenceItem';
import FilterPanel from './components/FilterPanel'; // New component
import ShareModal from './components/ShareModal';
import ConfirmationModal from './components/ConfirmationModal';
import { LinkIcon, TrashIcon, SortAscIcon, SortDescIcon, XCircleIcon, UploadIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, ChevronDownIcon, ChevronUpIcon, ArrowUpOnSquareIcon, CloudArrowUpIcon, XMarkIcon, ListBulletIcon, Squares2X2Icon, DocumentDuplicateIcon, ArrowPathIcon, StopCircleIcon, StarIconFilled, StarIconOutline, NoSymbolIcon, CheckCircleIcon, AdjustmentsHorizontalIcon } from './constants'; // Added AdjustmentsHorizontalIcon

interface FilteringByReferenceDetail {
  id: string;
  text: string;
}

interface NotificationState {
  message: string;
  type: 'success' | 'error';
}

interface ConfirmationModalConfig {
  title: string;
  message: React.ReactNode;
  onConfirmAction: () => void;
  confirmButtonText?: string;
}

// Extend FileSystemDirectoryHandle definition if not fully available in standard TS lib
interface FileSystemDirectoryHandle {
  kind: 'directory';
  name: string;
  values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
  queryPermission(options?: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission(options?: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
}

interface FileSystemFileHandle {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
}

declare global {
  interface Window {
    showDirectoryPicker?(options?: { mode?: 'read' | 'readwrite', startIn?: string | FileSystemDirectoryHandle }): Promise<FileSystemDirectoryHandle>;
  }
}


const dropPhrases = [
  "Drop it like it's hot!", "Incoming! Brace for files!", "Release the files!", "Let the dropping commence!", "Files, assemble!",
  "Prepare for data drop!", "Feed me your files!", "Make it rain (files)!", "Drop zone activated!", "Time to drop and load.",
  "File drop: engage!", "Gimme those pixels (and bits)!", "The drop is mightier than the click.", "Easy does it... now DROP!",
  "You've got the files, I've got the space.", "Drop it like your Wi-Fi depends on it.", "Drag, drop, and conquer.",
  "File drop incoming. Look busy!", "This is where the magic happens (with files).", "Show me what you got (files-wise).",
  "Drop 'em if you got 'em.", "Ready for your file payload?", "All your files are belong to us (temporarily).", "Just drop it.",
  "The system is ready for your drop.", "File drop mission: accepted.", "Don't be shy, drop those files.", "Uploading... I mean, dropping!",
  "Get ready for the file party!", "Let's get these files uploaded, drop-style.", "Your files are about to find a new home.",
  "On the count of three, drop!", "Dropping files like a pro.", "This app eats files for breakfast.", "Caution: Awesome file drop in progress.",
  "Files incoming! Clear the deck!", "The more files, the merrier the drop.", "File drop success in 3... 2... 1...",
  "Keep calm and drop files.", "May your drop be swift and your files be many.", "The chosen files for the grand drop!",
  "It's a bird! It's a plane! No, it's your files!", "Drop it here, we'll take care of the rest.", "Files detected. Prepare for awesomeness.",
  "The drop zone is hungry for files.", "Let the great file drop begin!", "Your files' journey starts with a drop.",
  "Unleash the file fury!", "One small drag for man, one giant drop for filekind.", "Drop 'til you can't stop!"
];

interface Session {
  id: string;
  name: string;
}

const initialAppSessions: Session[] = [
  { id: 'session_proj_alpha', name: 'Project Alpha - Phase 1 Keywords' }, { id: 'session_client_beta', name: 'Client Beta - Approved Product Names' },
  { id: 'session_research_gamma', name: 'Research Gamma - Core Concepts' }, { id: 'session_marketing_q1', name: 'Marketing Q1 - Campaign Tags' },
  { id: 'session_dev_sprint_5', name: 'Dev Sprint 5 - Feature IDs' },
];

const mockSessionReferences: Record<string, string[]> = {
  'session_proj_alpha': ['AlphaCore', 'SynergyMax', 'QuantumLeap', 'NovaMetric', 'ZenithPoint'],
  'session_client_beta': ['ProductX', 'ServiceY', 'SolutionZ', 'BetaFeature', 'ClientBrandName'],
  'session_research_gamma': ['MethodologyA', 'TheoremB', 'HypothesisC', 'VariableD', 'ConclusionE'],
  'session_marketing_q1': ['#SpringSale', '#NewProductLaunch', '#EarlyBird', '#LimitedTimeOffer', '#Q1Promo'],
  'session_dev_sprint_5': ['FEAT-101', 'FEAT-102-Subtask', 'BUG-205', 'UIUX-007', 'API-042'],
};

interface SessionDisplayOption {
  id: string;
  name: string;
  isCreateOption?: boolean;
  originalSessionId?: string;
}

export const IMAGE_FILTER_TYPE_DISPLAY_NAMES: Record<ImageFilterType, string> = {
  [ImageFilterType.ALL]: "All",
  [ImageFilterType.ASSOCIATED]: "Associated",
  [ImageFilterType.UNASSOCIATED]: "Unassociated",
};

const DEFAULT_IMAGE_CARD_SIZE = 210;
const AUTO_REFRESH_INTERVAL_MS = 1000; // 30 seconds

async function getAllFileObjectsFromDirectory(dirHandle: FileSystemDirectoryHandle): Promise<File[]> {
  const filesArray: File[] = [];
  try {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && entry.name.match(/\.(jpe?g|png|gif|webp|svg)$/i)) {
        try {
          filesArray.push(await entry.getFile());
        } catch (e) {
          console.warn(`Could not get file ${entry.name}:`, e);
        }
      }
      // Note: Subdirectories are not traversed in this version.
    }
  } catch (e) {
    console.error(`Error iterating directory ${dirHandle.name}:`, e);
    throw e; // Re-throw to be caught by the caller
  }
  return filesArray;
}


const App: React.FC = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [referenceInput, setReferenceInput] = useState<string>('');
  const [imageSortOrder, setImageSortOrder] = useState<SortOrder>(SortOrder.DESC);
  const [imageFilter, setImageFilter] = useState<ImageFilterType>(ImageFilterType.ALL);
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null);
  const [filteringByReferenceDetail, setFilteringByReferenceDetail] = useState<FilteringByReferenceDetail | null>(null);
  const [referenceImageOrder, setReferenceImageOrder] = useState<Map<string, string[]>>(new Map());
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);

  const [showDropZoneOverlay, setShowDropZoneOverlay] = useState<boolean>(false);
  const [currentDropPhrase, setCurrentDropPhrase] = useState<string>(dropPhrases[0]);
  const dragOverDocumentCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageGalleryScrollContainerRef = useRef<HTMLDivElement>(null);

  const [sessions, setSessions] = useState<Session[]>(initialAppSessions);
  const [sessionSearchTerm, setSessionSearchTerm] = useState<string>('');
  const [isSessionListVisible, setIsSessionListVisible] = useState<boolean>(false);
  const sessionLoadContainerRef = useRef<HTMLDivElement>(null);
  const [loadedSessionNameForShare, setLoadedSessionNameForShare] = useState<string | null>(null);
  const [currentLoadedSessionName, setCurrentLoadedSessionName] = useState<string | null>(null);

  const [referenceAddMode, setReferenceAddMode] = useState<'manual' | 'session'>('session');
  const [isReferenceInputAreaCollapsed, setIsReferenceInputAreaCollapsed] = useState(false);

  const [isReferencingModeActive, setIsReferencingModeActive] = useState(false);
  const [isReferencesPanelCollapsed, setIsReferencesPanelCollapsed] = useState(false);
  const [referenceViewMode, setReferenceViewMode] = useState<'list' | 'grid'>('list');

  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const actionsButtonRef = useRef<HTMLButtonElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [confirmationModalConfig, setConfirmationModalConfig] = useState<ConfirmationModalConfig | null>(null);

  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const directoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  useEffect(() => { directoryHandleRef.current = directoryHandle; }, [directoryHandle]);

  const [isFolderSyncActive, setIsFolderSyncActive] = useState<boolean>(false);
  const isFolderSyncActiveRef = useRef(isFolderSyncActive);
   useEffect(() => { isFolderSyncActiveRef.current = isFolderSyncActive; }, [isFolderSyncActive]);

  const [isLoadingDirectory, setIsLoadingDirectory] = useState<boolean>(false);
  const [syncedFolderName, setSyncedFolderName] = useState<string | null>(null);
  const browserSupportsFileSystemAccessAPI = typeof window.showDirectoryPicker === 'function';
  const autoRefreshTimerRef = useRef<number | null>(null);
  const imagesRef = useRef(images);
  useEffect(() => { imagesRef.current = images; }, [images]);


  const [hoveredRatingInBar, setHoveredRatingInBar] = useState<number>(0);
  const [imageCardSize, setImageCardSize] = useState<number>(DEFAULT_IMAGE_CARD_SIZE); 
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const filterPanelButtonRef = useRef<HTMLButtonElement>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);


  const isReorderEnabled = useMemo(() => {
    return imageFilter === ImageFilterType.ASSOCIATED && !!filteringByReferenceDetail && !isFolderSyncActive;
  }, [imageFilter, filteringByReferenceDetail, isFolderSyncActive]);

  const imagesByIdMap = useMemo(() => new Map(images.map(img => [img.id, img])), [images]);
  const referenceMap = useMemo(() => new Map(references.map(ref => [ref.id, ref])), [references]);
  const sessionMap = useMemo(() => new Map(sessions.map(s => [s.id, s])), [sessions]);

  const areAnyImagesAssociated = useMemo(() => images.some(image => !!image.associatedReferenceId), [images]);

  const showAppNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
  }, []);

  const clearNonImageDataForNewSession = useCallback(() => {
    setReferences([]); 
    setSelectedImageIds(new Set()); 
    setSelectionAnchorId(null);
    setReferenceImageOrder(new Map()); 
    setFilteringByReferenceDetail(null); 
    setImageFilter(ImageFilterType.ALL);
    setCurrentLoadedSessionName(null); 
    setLoadedSessionNameForShare(null); 
    setRatingFilter(null);
    setImageSortOrder(SortOrder.DESC); 
    // setImageCardSize(DEFAULT_IMAGE_CARD_SIZE); // Keep user preference for card size
  }, []);


  const handleImagesUpload = useCallback((newImageFiles: ImageFile[]) => {
    setImages(prevImages => [...prevImages, ...newImageFiles.map(f => ({...f, source: 'manual' as 'manual'}))]);
  }, []);

  const addReferencesFromText = useCallback((text: string) => {
    if (text.trim() === '') return 0;
    const newRefTexts = text.split(/[,\n\s]+/).map(t => t.trim()).filter(t => t !== '' && !references.some(ref => ref.text.toLowerCase() === t.toLowerCase()));
    const newRefObjects: Reference[] = newRefTexts.map(t => ({ id: crypto.randomUUID(), text: t }));
    if (newRefObjects.length > 0) setReferences(prev => [...prev, ...newRefObjects]);
    return newRefObjects.length;
  }, [references]);

  const processAndSetImageFiles = useCallback(async (
    filesArray: File[],
    sourceInfo?: { source: 'synced'; folderName: string }
  ): Promise<ImageFile[]> => {
    if (filesArray.length === 0) return [];
    const fileSource = sourceInfo?.source || 'manual';
    const folderNameIfSynced = sourceInfo?.folderName;
    
    const isKnownImageType = (fileType: string) => ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'].some(t => fileType.startsWith(t));
    
    return Promise.all(filesArray.map(file => new Promise<ImageFile>((resolve, reject) => {
      const baseFileProps: Omit<ImageFile, 'dataUrl' | 'fileObject'> & { fileObject: File } = { 
        id: crypto.randomUUID(), 
        name: file.name, 
        type: file.type, 
        size: file.size, 
        lastModified: file.lastModified, 
        fileObject: file, 
        rating: 0,
        source: fileSource,
        ...(fileSource === 'synced' && folderNameIfSynced && { syncedFolderName: folderNameIfSynced })
      };

      if (isKnownImageType(file.type)) {
        const reader = new FileReader();
        reader.onload = (e) => resolve({ ...baseFileProps, dataUrl: e.target?.result as string });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } else {
        resolve(baseFileProps as ImageFile); 
      }
    })));
  }, []);

  const processFileListAndSetImages = useCallback(async (fileList: FileList) => {
    const filesArray: File[] = Array.from(fileList);
    if (filesArray.length === 0) return;
    try {
      // Manually added files, sourceInfo is undefined, defaults to 'manual'
      const fileObjects = await processAndSetImageFiles(filesArray); 
      if (fileObjects.length > 0) handleImagesUpload(fileObjects);
    } catch (error) {
      console.error("Error reading files:", error);
      showAppNotification("Error processing some files.", "error");
    }
  }, [handleImagesUpload, processAndSetImageFiles, showAppNotification]);

  useEffect(() => {
    const dragTarget = document.documentElement;
    const handleDragEnter = (event: globalThis.DragEvent) => {
      event.preventDefault(); if (isFolderSyncActive) return;
      if (event.dataTransfer?.types.includes('Files')) {
        dragOverDocumentCounterRef.current++;
        if (!showDropZoneOverlay) { setCurrentDropPhrase(dropPhrases[Math.floor(Math.random() * dropPhrases.length)]); setShowDropZoneOverlay(true); }
      }
    };
    const handleDragOver = (event: globalThis.DragEvent) => event.preventDefault();
    const handleDragLeave = (event: globalThis.DragEvent) => {
      event.preventDefault(); if (isFolderSyncActive) return;
      if (event.dataTransfer?.types.includes('Files')) {
        dragOverDocumentCounterRef.current--;
        if (dragOverDocumentCounterRef.current <= 0) { setShowDropZoneOverlay(false); dragOverDocumentCounterRef.current = 0; }
      }
    };
    const handleDrop = (event: globalThis.DragEvent) => {
      event.preventDefault(); if (isFolderSyncActive) return;
      setShowDropZoneOverlay(false); dragOverDocumentCounterRef.current = 0;
      if (event.dataTransfer?.files?.length) processFileListAndSetImages(event.dataTransfer.files);
    };
    dragTarget.addEventListener('dragenter', handleDragEnter); dragTarget.addEventListener('dragover', handleDragOver);
    dragTarget.addEventListener('dragleave', handleDragLeave); dragTarget.addEventListener('drop', handleDrop);
    return () => {
      dragTarget.removeEventListener('dragenter', handleDragEnter); dragTarget.removeEventListener('dragover', handleDragOver);
      dragTarget.removeEventListener('dragleave', handleDragLeave); dragTarget.removeEventListener('drop', handleDrop);
    };
  }, [processFileListAndSetImages, showDropZoneOverlay, isFolderSyncActive]);

  const filteredAndSortedImages = useMemo(() => {
    let filtered = images.filter(image => {
      if (imageFilter === ImageFilterType.ASSOCIATED) return filteringByReferenceDetail ? image.associatedReferenceId === filteringByReferenceDetail.id : !!image.associatedReferenceId;
      if (imageFilter === ImageFilterType.UNASSOCIATED) return !image.associatedReferenceId;
      return true;
    });

    if (ratingFilter !== null) {
      filtered = filtered.filter(image => {
        const imageActualRating = image.rating === undefined ? 0 : image.rating;
        return imageActualRating === ratingFilter;
      });
    }

    if (isReorderEnabled && filteringByReferenceDetail) {
      const customOrderIds = referenceImageOrder.get(filteringByReferenceDetail.id);
      if (customOrderIds) {
        const orderedImages: ImageFile[] = []; const customOrderSet = new Set(customOrderIds);
        customOrderIds.forEach(id => { const img = imagesByIdMap.get(id); if (img && img.associatedReferenceId === filteringByReferenceDetail.id) orderedImages.push(img); });
        const remainingImages = filtered.filter(img => !customOrderSet.has(img.id)).sort((a, b) => imageSortOrder === SortOrder.DESC ? b.lastModified - a.lastModified : a.lastModified - b.lastModified);
        return [...orderedImages, ...remainingImages];
      }
    }
    return [...filtered].sort((a, b) => imageSortOrder === SortOrder.DESC ? b.lastModified - a.lastModified : a.lastModified - b.lastModified);
  }, [images, imageSortOrder, imageFilter, filteringByReferenceDetail, referenceImageOrder, isReorderEnabled, imagesByIdMap, ratingFilter]);

  const groupedImagesForDisplay = useMemo(() => {
    if (filteredAndSortedImages.length === 0) return [];
    if (filteringByReferenceDetail) {
      const ref = referenceMap.get(filteringByReferenceDetail.id); if (!ref) return [];
      return [{ reference: ref, images: filteredAndSortedImages, isUnassociatedGroup: false, key: filteringByReferenceDetail.id }];
    }
    const finalGroups: Array<{ reference?: Reference; images: ImageFile[]; isUnassociatedGroup: boolean; key: string }> = [];
    const associatedImageMap = new Map<string, { ref: Reference; images: ImageFile[] }>();
    const unassociatedImages: ImageFile[] = [];
    for (const image of filteredAndSortedImages) {
      if (image.associatedReferenceId) {
        const ref = referenceMap.get(image.associatedReferenceId);
        if (ref) {
          if (!associatedImageMap.has(ref.id)) associatedImageMap.set(ref.id, { ref, images: [] });
          associatedImageMap.get(ref.id)!.images.push(image);
        } else { unassociatedImages.push(image); }
      } else { unassociatedImages.push(image); }
    }
    if (imageFilter === ImageFilterType.ALL || imageFilter === ImageFilterType.ASSOCIATED) {
      references.forEach(refObj => {
        const groupData = associatedImageMap.get(refObj.id);
        if (groupData?.images.length) finalGroups.push({ reference: groupData.ref, images: groupData.images, isUnassociatedGroup: false, key: groupData.ref.id });
      });
    }
    if ((imageFilter === ImageFilterType.ALL || imageFilter === ImageFilterType.UNASSOCIATED) && unassociatedImages.length > 0) {
      finalGroups.push({ images: unassociatedImages, isUnassociatedGroup: true, key: 'unassociated-group' });
    }
    return finalGroups;
  }, [filteredAndSortedImages, references, referenceMap, filteringByReferenceDetail, imageFilter]);

  const toggleSortOrder = useCallback(() => {
    setImageSortOrder(prev => prev === SortOrder.DESC ? SortOrder.ASC : SortOrder.DESC);
  }, []);

  const handleReferenceInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setReferenceInput(e.target.value), []);
  const handleAddReferencesFromInput = useCallback(() => { if (addReferencesFromText(referenceInput) > 0) setReferenceInput(''); }, [referenceInput, addReferencesFromText]);

  const handleImageSelect = useCallback((imageId: string, event: React.MouseEvent) => {
    if (isReorderEnabled) return;
    const isShiftClick = event.shiftKey;
    const visibleImagesForShift = groupedImagesForDisplay.flatMap(g => g.images);
    if (isShiftClick && selectionAnchorId && visibleImagesForShift.length) {
      const newSelected = new Set<string>();
      const anchorIdx = visibleImagesForShift.findIndex(img => img.id === selectionAnchorId);
      const currentIdx = visibleImagesForShift.findIndex(img => img.id === imageId);
      if (anchorIdx !== -1 && currentIdx !== -1) {
        const [start, end] = [Math.min(anchorIdx, currentIdx), Math.max(anchorIdx, currentIdx)];
        for (let i = start; i <= end; i++) if (visibleImagesForShift[i]) newSelected.add(visibleImagesForShift[i].id);
        setSelectedImageIds(newSelected);
      } else { setSelectedImageIds(prev => { const ns = new Set(prev); ns.has(imageId) ? ns.delete(imageId) : ns.add(imageId); return ns; }); setSelectionAnchorId(imageId); }
    } else { setSelectedImageIds(prev => { const ns = new Set(prev); ns.has(imageId) ? ns.delete(imageId) : ns.add(imageId); return ns; }); setSelectionAnchorId(imageId); }
  }, [selectionAnchorId, groupedImagesForDisplay, isReorderEnabled]);

  const handleUnassociateImage = useCallback((imageId: string) => {
    const imgToUpdate = imagesByIdMap.get(imageId); if (!imgToUpdate) return;
    const oldRefId = imgToUpdate.associatedReferenceId;
    setImages(prev => prev.map(img => img.id === imageId ? { ...img, associatedReferenceId: null, lastModified: Date.now() } : img));
    if (oldRefId && !isFolderSyncActive) { // Custom order only relevant if not folder sync active
      setReferenceImageOrder(prev => {
        const newO = new Map(prev); const currO = newO.get(oldRefId);
        if (currO) { const updO = currO.filter(id => id !== imageId); updO.length ? newO.set(oldRefId, updO) : newO.delete(oldRefId); } return newO;
      });
    }
    if (filteringByReferenceDetail?.id === oldRefId && !images.some(img => img.id !== imageId && img.associatedReferenceId === filteringByReferenceDetail.id)) {
      setFilteringByReferenceDetail(null);
      setImageFilter(isReferencingModeActive && images.some(i => i.id !== imageId && i.associatedReferenceId) ? ImageFilterType.ASSOCIATED : ImageFilterType.ALL);
    }
  }, [imagesByIdMap, images, filteringByReferenceDetail, isReferencingModeActive, isFolderSyncActive]);

  const handleDeleteImage = useCallback((imageId: string) => {
    if (isFolderSyncActive) { showAppNotification("Cannot delete files from synced folder. Manage in file system & refresh.", "error"); return; }
    const imgToDelete = imagesByIdMap.get(imageId); if (!imgToDelete) return;
    const assocRefId = imgToDelete.associatedReferenceId;
    setImages(prev => prev.filter(img => img.id !== imageId));
    setSelectedImageIds(prev => { const ns = new Set(prev); ns.delete(imageId); return ns; });
    if (selectionAnchorId === imageId) setSelectionAnchorId(null);
    if (assocRefId) {
      setReferenceImageOrder(prev => {
        const newO = new Map(prev); const currO = newO.get(assocRefId);
        if (currO) { const updO = currO.filter(id => id !== imageId); updO.length ? newO.set(assocRefId, updO) : newO.delete(assocRefId); } return newO;
      });
    }
     if (filteringByReferenceDetail?.id === assocRefId && !images.some(img => img.id !== imageId && img.associatedReferenceId === filteringByReferenceDetail.id)) {
      setFilteringByReferenceDetail(null);
      setImageFilter(isReferencingModeActive && images.some(i => i.id !== imageId && i.associatedReferenceId) ? ImageFilterType.ASSOCIATED : ImageFilterType.ALL);
    }
  }, [selectionAnchorId, images, filteringByReferenceDetail, imagesByIdMap, isReferencingModeActive, isFolderSyncActive, showAppNotification]);

  const handleDeleteReference = useCallback((refId: string) => {
    const updRefs = references.filter(ref => ref.id !== refId); setReferences(updRefs);
    if (updRefs.length === 0 && !isFolderSyncActive) { setCurrentLoadedSessionName(null); setLoadedSessionNameForShare(null); }
    setImages(prev => prev.map(img => img.associatedReferenceId === refId ? { ...img, associatedReferenceId: null, lastModified: Date.now() } : img));
    if (!isFolderSyncActive) { setReferenceImageOrder(prev => { const newO = new Map(prev); newO.delete(refId); return newO; }); }
    if (filteringByReferenceDetail?.id === refId) {
      setFilteringByReferenceDetail(null);
      setImageFilter(isReferencingModeActive && images.some(i => i.associatedReferenceId && i.associatedReferenceId !== refId) ? ImageFilterType.ASSOCIATED : ImageFilterType.ALL);
    }
  }, [references, images, filteringByReferenceDetail, isReferencingModeActive, isFolderSyncActive]);

  const imageCountByReference = useMemo(() => {
    const counts = new Map<string, number>();
    images.forEach(img => { if (img.associatedReferenceId) counts.set(img.associatedReferenceId, (counts.get(img.associatedReferenceId) || 0) + 1); });
    return counts;
  }, [images]);

  const handleMainFilterChange = useCallback((newFilter: ImageFilterType) => {
    setImageFilter(newFilter);
    setFilteringByReferenceDetail(null); 

    const willReorderBeDisabled = !(newFilter === ImageFilterType.ASSOCIATED && !!filteringByReferenceDetail && !isFolderSyncActive);

    if (willReorderBeDisabled) {
        setSelectedImageIds(new Set());
        setSelectionAnchorId(null);
    }
  }, [filteringByReferenceDetail, isFolderSyncActive]); 

  const handleReferenceItemClick = useCallback((refId: string) => {
    const refDetails = referenceMap.get(refId); if (!refDetails) return;
    if (selectedImageIds.size > 0 && !isReorderEnabled) {
      const now = Date.now();
      setImages(prev => prev.map(img => selectedImageIds.has(img.id) ? { ...img, associatedReferenceId: refId, lastModified: now } : img));
      if (!isFolderSyncActive) { // Custom order only if not folder sync
        setReferenceImageOrder(prev => {
          const newO = new Map(prev); const currO = newO.get(refId) || [];
          const newIds = Array.from(selectedImageIds).filter(id => !currO.includes(id));
          newO.set(refId, [...currO, ...newIds]); return newO;
        });
      }
      setSelectedImageIds(new Set()); setSelectionAnchorId(null);
    } else if (selectedImageIds.size === 0) {
      if (filteringByReferenceDetail?.id === refId) {
        setFilteringByReferenceDetail(null); if (imageFilter !== ImageFilterType.ASSOCIATED) setImageFilter(ImageFilterType.ASSOCIATED);
      } else {
        if ((imageCountByReference.get(refId) || 0) > 0) { setImageFilter(ImageFilterType.ASSOCIATED); setFilteringByReferenceDetail({ id: refId, text: refDetails.text }); }
        else setFilteringByReferenceDetail(null);
      }
      setSelectedImageIds(new Set()); setSelectionAnchorId(null);
    }
  }, [selectedImageIds, referenceMap, imageCountByReference, filteringByReferenceDetail, isReorderEnabled, imageFilter, isFolderSyncActive]);
  
  const getCurrentViewTitle = () => {
    if (isFolderSyncActive) return `Folder: ${syncedFolderName || 'Unknown'}`;
    if (filteringByReferenceDetail && imageFilter === ImageFilterType.ASSOCIATED) return `Files for: ${filteringByReferenceDetail.text}`;
    if (!isReferencingModeActive || isReferencesPanelCollapsed) return filteringByReferenceDetail && imageFilter === ImageFilterType.ASSOCIATED ? `Files for: ${filteringByReferenceDetail.text}` : "All Files";
    switch (imageFilter) { case ImageFilterType.ALL: return "All Files"; case ImageFilterType.ASSOCIATED: return "All Associated Files"; case ImageFilterType.UNASSOCIATED: return "All Unassociated Files"; default: return "Current View"; }
  };

  const handleImageDragStart = useCallback((e: ReactDragEvent<HTMLDivElement>, imgId: string) => { if (!isReorderEnabled) return; e.dataTransfer.setData('application/vnd.file-id', imgId); e.dataTransfer.effectAllowed = 'move'; setDraggedImageId(imgId); }, [isReorderEnabled]);
  const handleImageDrop = useCallback((e: ReactDragEvent<HTMLDivElement>, targetImgId: string) => {
    if (!isReorderEnabled || !filteringByReferenceDetail || !draggedImageId) return; e.preventDefault();
    const currDraggedId = e.dataTransfer.getData('application/vnd.file-id') || draggedImageId;
    if (!currDraggedId || currDraggedId === targetImgId) { setDraggedImageId(null); return; }
    setReferenceImageOrder(prevO => {
      const newO = new Map(prevO); const refId = filteringByReferenceDetail.id;
      const visibleForRef = filteredAndSortedImages.filter(i => i.associatedReferenceId === refId).map(i => i.id);
      let currOrderForRef = newO.get(refId) || visibleForRef;
      currOrderForRef = currOrderForRef.filter(id => imagesByIdMap.get(id)?.associatedReferenceId === refId);
      const draggedObj = imagesByIdMap.get(currDraggedId); if (!draggedObj || draggedObj.associatedReferenceId !== refId) { setDraggedImageId(null); return prevO; }
      let reordered = [...currOrderForRef]; const draggedIdx = reordered.indexOf(currDraggedId); if (draggedIdx > -1) reordered.splice(draggedIdx, 1);
      const targetIdx = reordered.indexOf(targetImgId);
      if (targetIdx !== -1) reordered.splice(targetIdx, 0, currDraggedId);
      else { const visTgtIdx = visibleForRef.indexOf(targetImgId); if (visTgtIdx !== -1) { let ins = false; for (let i = 0; i < reordered.length; i++) { if (visibleForRef.indexOf(reordered[i]) >= visTgtIdx) { reordered.splice(i, 0, currDraggedId); ins = true; break; } } if (!ins) reordered.push(currDraggedId); } else reordered.push(currDraggedId); }
      const finalUnique = Array.from(new Set(reordered)).filter(id => imagesByIdMap.get(id)?.associatedReferenceId === refId);
      finalUnique.length ? newO.set(refId, finalUnique) : newO.delete(refId); return newO;
    });
    setDraggedImageId(null);
  }, [isReorderEnabled, filteringByReferenceDetail, filteredAndSortedImages, imagesByIdMap, draggedImageId]);
  const handleActualDragEndFromItem = useCallback(() => setDraggedImageId(null), []);

  const getReferencePreviewImageUrl = useCallback((refId: string): string | null => {
    if (!isFolderSyncActive && referenceImageOrder.has(refId)) {
      const customOrder = referenceImageOrder.get(refId);
      if (customOrder?.length) { const img = imagesByIdMap.get(customOrder[0]); if (img?.associatedReferenceId === refId && img.dataUrl && img.type.startsWith('image/')) return img.dataUrl; }
    }
    const assocFiles = images.filter(i => i.associatedReferenceId === refId).sort((a, b) => b.lastModified - a.lastModified);
    for (const file of assocFiles) if (file.dataUrl && file.type.startsWith('image/')) return file.dataUrl;
    return null;
  }, [images, referenceImageOrder, imagesByIdMap, isFolderSyncActive]);

  const handleUploadButtonClick = () => { if (!isFolderSyncActive) fileInputRef.current?.click(); };
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (!isFolderSyncActive && e.target.files?.length) { processFileListAndSetImages(e.target.files); e.target.value = ''; } };
  const showGallerySubtitle = !(images.length === 0 && !filteringByReferenceDetail && !isFolderSyncActive);
  const handleSessionSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => setSessionSearchTerm(e.target.value);

  const openConfirmationModal = useCallback((title: string, message: React.ReactNode, onConfirm: () => void, confirmText?: string) => { setConfirmationModalConfig({ title, message, onConfirmAction: onConfirm, confirmButtonText: confirmText }); setIsConfirmationModalOpen(true); }, []);
  const closeConfirmationModal = useCallback(() => { setIsConfirmationModalOpen(false); setConfirmationModalConfig(null); }, []);

  const performLoadExistingSession = useCallback((sessionId: string) => {
    const session = sessionMap.get(sessionId); if (!session) return;
    clearNonImageDataForNewSession(); 
    const refs = mockSessionReferences[sessionId]; if (refs?.length) addReferencesFromText(refs.join(', '));
    // Images are not cleared by clearNonImageDataForNewSession anymore.
    // Associations will be implicitly cleared if we reset all images to source: manual or if they are re-associated.
    // Let's ensure all current images are treated as manual unless part of an active folder sync.
    setImages(prev => prev.map(img => 
        isFolderSyncActive && img.source === 'synced' && img.syncedFolderName === syncedFolderName 
        ? img // Keep synced files as they are
        : {...img, associatedReferenceId: null, source: 'manual', syncedFolderName: undefined} // Reset others
    ));

    setCurrentLoadedSessionName(session.name); setLoadedSessionNameForShare(session.name);
    setSessionSearchTerm(''); setIsSessionListVisible(false); showAppNotification(`Session '${session.name}' loaded.`, 'success'); closeConfirmationModal();
  }, [sessionMap, addReferencesFromText, showAppNotification, clearNonImageDataForNewSession, closeConfirmationModal, isFolderSyncActive, syncedFolderName]);

  const handleLoadExistingSession = useCallback((sessionId: string) => {
    const session = sessionMap.get(sessionId); if (!session) return;
    const hasData = references.length > 0 || (currentLoadedSessionName && currentLoadedSessionName !== session.name);
    const currentImageCount = images.filter(img => img.source === 'manual' || (img.source === 'synced' && img.syncedFolderName !== syncedFolderName)).length;

    if (hasData) openConfirmationModal("Confirm Session Load", <><p>Loading '<strong>{session.name}</strong>' replaces current refs ({references.length}) & clears associations for {currentImageCount} non-synced file(s).</p><p className="mt-1">Files in active sync folder remain associated if applicable.</p><p className="mt-2 font-semibold">Cannot be undone for refs/associations.</p><p className="mt-2">Proceed?</p></>, () => performLoadExistingSession(sessionId), "Load Session");
    else performLoadExistingSession(sessionId);
  }, [images, references.length, currentLoadedSessionName, sessionMap, openConfirmationModal, performLoadExistingSession, syncedFolderName]);

  const performCreateNewSession = useCallback((name: string) => {
    clearNonImageDataForNewSession(); 
    setImages(prev => prev.map(img => 
      isFolderSyncActive && img.source === 'synced' && img.syncedFolderName === syncedFolderName 
      ? img 
      : {...img, associatedReferenceId: null, source: 'manual', syncedFolderName: undefined}
    ));
    const newSess: Session = { id: crypto.randomUUID(), name }; setSessions(prev => [...prev, newSess]);
    setCurrentLoadedSessionName(name); setLoadedSessionNameForShare(name);
    setSessionSearchTerm(''); setIsSessionListVisible(false); showAppNotification(`Session '${name}' created & loaded.`, 'success'); closeConfirmationModal();
  }, [clearNonImageDataForNewSession, showAppNotification, closeConfirmationModal, isFolderSyncActive, syncedFolderName]);

  const handleCreateNewSession = useCallback((nameRaw: string) => {
    const name = nameRaw.trim() || "Untitled Session";
    const hasData = references.length > 0 || (currentLoadedSessionName && currentLoadedSessionName !== name);
    const currentImageCount = images.filter(img => img.source === 'manual' || (img.source === 'synced' && img.syncedFolderName !== syncedFolderName)).length;


    if (hasData) openConfirmationModal("Confirm Create New Session", <><p>Creating '<strong>{name}</strong>' replaces current refs ({references.length}) & clears associations for {currentImageCount} non-synced file(s).</p><p className="mt-1">Files in active sync folder remain associated if applicable.</p><p className="mt-2 font-semibold">Cannot be undone for current refs/associations.</p><p className="mt-2">Proceed?</p></>, () => performCreateNewSession(name), "Create and Load");
    else performCreateNewSession(name);
  }, [images, references.length, currentLoadedSessionName, openConfirmationModal, performCreateNewSession, syncedFolderName]);

  const sessionDisplayOptions = useMemo(() => {
    const opts: SessionDisplayOption[] = []; const term = sessionSearchTerm.trim().toLowerCase();
    const createName = `Create new session: "${sessionSearchTerm.trim() || "Untitled Session"}"`;
    opts.push({ id: 'create_new_session', name: createName, isCreateOption: true });
    const matched = sessions.filter(s => s.name !== currentLoadedSessionName && (term === '' || s.name.toLowerCase().includes(term))).map(s => ({ id: s.id, name: s.name, originalSessionId: s.id }));
    if (term !== '' && matched.length === 0) return [opts[0]];
    opts.push(...matched); return opts;
  }, [sessionSearchTerm, sessions, currentLoadedSessionName]);


  const loadFilesFromDirectoryHandle = useCallback(async (
    dirHandle: FileSystemDirectoryHandle,
    initialFileNamesFromThisFolderForRemovalCheck: Set<string>,
    isFromExplicitAction: boolean // To control notifications (e.g., silent auto-refresh if no changes)
  ) => {
    setIsLoadingDirectory(isFromExplicitAction);
    let filesAdded = 0, filesUpdated = 0, filesRemoved = 0, filesConflictResolved = 0;

    try {
      const filesFromFS_FileObjects = await getAllFileObjectsFromDirectory(dirHandle);
      const newFSImageFiles_Basic = await processAndSetImageFiles(filesFromFS_FileObjects, { source: 'synced', folderName: dirHandle.name });

      setImages(currentImagesInState => {
        const nextImages: ImageFile[] = [];
        const existingImagesInState_MapByName = new Map(currentImagesInState.map(img => [img.name, img]));
        const namesFoundInCurrentFSScan = new Set<string>();

        for (const fsImg of newFSImageFiles_Basic) {
          namesFoundInCurrentFSScan.add(fsImg.name);
          const existingMatch = existingImagesInState_MapByName.get(fsImg.name);

          if (existingMatch && existingMatch.source === 'synced' && existingMatch.syncedFolderName === dirHandle.name) {
            const updatedFile: ImageFile = {
              ...existingMatch,
              fileObject: fsImg.fileObject, type: fsImg.type, size: fsImg.size,
              lastModified: fsImg.lastModified, dataUrl: fsImg.dataUrl,
            };
            nextImages.push(updatedFile);
            if (fsImg.lastModified !== existingMatch.lastModified || fsImg.size !== existingMatch.size) {
              filesUpdated++;
            }
            existingImagesInState_MapByName.delete(fsImg.name);
          } else if (existingMatch && existingMatch.source === 'manual' && existingMatch.name === fsImg.name) {
            if (isFromExplicitAction) { // Only notify on explicit actions for conflicts
                 showAppNotification(`Synced file '${fsImg.name}' replaced a manual file.`, 'error');
            }
            filesConflictResolved++;
            nextImages.push(fsImg); // Synced file wins
            existingImagesInState_MapByName.delete(fsImg.name);
          } else if (!existingMatch) {
            nextImages.push(fsImg);
            filesAdded++;
          }
        }

        // Add back unprocessed files (manual files, or files from other synced folders)
        for (const remainingInMap of existingImagesInState_MapByName.values()) {
          if (remainingInMap.source === 'manual' || 
              (remainingInMap.source === 'synced' && remainingInMap.syncedFolderName !== dirHandle.name)) {
            nextImages.push(remainingInMap);
          }
        }

        // Determine removed files from *this* sync operation
        const removedFileIdsThisSync = new Set<string>();
        currentImagesInState.forEach(img => {
            if(img.source === 'synced' && img.syncedFolderName === dirHandle.name && !namesFoundInCurrentFSScan.has(img.name)) {
                removedFileIdsThisSync.add(img.id);
                filesRemoved++;
            }
        });

        if (removedFileIdsThisSync.size > 0) {
            setSelectedImageIds(prevSelected => {
              const newSelected = new Set(prevSelected);
              removedFileIdsThisSync.forEach(id => newSelected.delete(id));
              return newSelected.size !== prevSelected.size ? newSelected : prevSelected;
            });
            if (selectionAnchorId && removedFileIdsThisSync.has(selectionAnchorId)) {
              setSelectionAnchorId(null);
            }
            setReferenceImageOrder(prevOrder => {
               const newOrder = new Map(prevOrder);
               let changed = false;
               newOrder.forEach((ids, refId) => {
                   const filteredIds = ids.filter(id => !removedFileIdsThisSync.has(id));
                   if (filteredIds.length !== ids.length) {
                       changed = true;
                       if (filteredIds.length > 0) newOrder.set(refId, filteredIds);
                       else newOrder.delete(refId);
                   }
               });
               return changed ? newOrder : prevOrder;
            });
          }
        return nextImages;
      });

      if (isFromExplicitAction || filesAdded > 0 || filesUpdated > 0 || filesRemoved > 0 || filesConflictResolved > 0) {
        let summary = `Folder '${dirHandle.name}' sync: `;
        const parts = [];
        if (filesAdded > 0) parts.push(`${filesAdded} added`);
        if (filesUpdated > 0) parts.push(`${filesUpdated} updated`);
        if (filesRemoved > 0) parts.push(`${filesRemoved} removed`);
        if (filesConflictResolved > 0) parts.push(`${filesConflictResolved} manual files replaced by folder version`);
        if (parts.length === 0) summary += 'No changes detected.';
        else summary += parts.join(', ') + '.';
        showAppNotification(summary, 'success');
      }

    } catch (e: any) {
      console.error("Error loading files from directory handle:", e);
      showAppNotification(`Error processing folder '${dirHandle.name}': ${e.message || 'Unknown error'}.`, "error");
      if (e.name === 'NotAllowedError') handleStopFolderSync(false); // Stop sync if permissions issue persists
    } finally {
      setIsLoadingDirectory(false);
    }
  }, [processAndSetImageFiles, showAppNotification, selectionAnchorId]); // Removed handleStopFolderSync from deps to avoid loop


  const handleStartFolderSync = useCallback(async () => {
    if (!browserSupportsFileSystemAccessAPI) { showAppNotification("Browser doesn't support File System Access API.", "error"); return; }
    
    const doSync = async (handle: FileSystemDirectoryHandle) => {
      closeConfirmationModal();
      // Reset non-image related states if it's a new folder or significant change
      // This specific logic might need refinement based on desired UX for switching folders
      if (!directoryHandle || directoryHandle.name !== handle.name) {
          clearNonImageDataForNewSession(); // Clears refs, session names, filters etc.
      }

      setDirectoryHandle(handle); 
      setSyncedFolderName(handle.name); 
      setIsFolderSyncActive(true);
      
      // For the initial sync of this handle, or if switching to this handle
      const currentImageNamesFromThisFolder = new Set(
          imagesRef.current // Use ref to get current images before async setImages
            .filter(img => img.source === 'synced' && img.syncedFolderName === handle.name)
            .map(img => img.name)
      );

      await loadFilesFromDirectoryHandle(handle, currentImageNamesFromThisFolder, false);
      startAutoRefresh(); 
    };

    try {
        const newHandle = await window.showDirectoryPicker!();
        if (!newHandle) return;

        const perm = await newHandle.queryPermission({ mode: 'read' });
        if (perm === 'granted' || (perm === 'prompt' && await newHandle.requestPermission({ mode: 'read' }) === 'granted')) {
            const confirmMsg = <>
                <p>Sync with folder '<strong>{newHandle.name}</strong>'?</p>
                <ul className="list-disc list-inside text-xs space-y-1 my-2">
                    <li>Files from this folder will be added or updated (metadata like ratings/associations preserved for existing synced files).</li>
                    <li>Files previously synced from <em>this specific folder</em> but no longer present on disk will be removed.</li>
                    <li>Manually added files will remain untouched.</li>
                    <li>If a manual file has the same name as a folder file, the folder version takes precedence.</li>
                </ul>
                {(!directoryHandle || directoryHandle.name !== newHandle.name) && references.length > 0 && 
                    <p className="mt-2 text-xs text-orange-600">Note: Current references ({references.length}) and session info will be cleared as you are starting sync with a new/different folder.</p>
                }
            </>;
            openConfirmationModal("Confirm Folder Sync", confirmMsg, () => doSync(newHandle), "Start Sync");
        } else {
            showAppNotification("Folder read permission denied.", "error");
        }
    } catch (err: any) { 
        if (err.name === 'AbortError') showAppNotification("Folder selection cancelled.", "success"); 
        else { console.error("Dir select error:", err); showAppNotification("Could not select directory: " + err.message, "error"); } 
    }
  }, [browserSupportsFileSystemAccessAPI, directoryHandle, references.length, clearNonImageDataForNewSession, loadFilesFromDirectoryHandle, showAppNotification, openConfirmationModal, closeConfirmationModal]);


  const handleRefreshSyncedFolder = useCallback(async () => {
    if (!directoryHandle) return;
    try {
      const perm = await directoryHandle.queryPermission({ mode: 'read' });
      if (perm === 'granted' || (perm === 'prompt' && await directoryHandle.requestPermission({ mode: 'read' }) === 'granted')) {
        
        const currentImageNamesFromThisFolder = new Set(
          imagesRef.current // Use ref for current images state
            .filter(img => img.source === 'synced' && img.syncedFolderName === directoryHandle.name)
            .map(img => img.name)
        );
        await loadFilesFromDirectoryHandle(directoryHandle, currentImageNamesFromThisFolder, true);
      } else {
         showAppNotification("Folder read permission denied/revoked. Stop & restart sync.", "error");
         handleStopFolderSync(false); // Auto-stop if permission lost
      }
    } catch (e: any) { 
        showAppNotification(`Refresh permission error: ${e.message}`, "error"); 
        if (e.name === 'NotAllowedError') handleStopFolderSync(false);
    }
  }, [directoryHandle, loadFilesFromDirectoryHandle, showAppNotification]); // Added handleStopFolderSync

  const autoRefreshLogic = useCallback(async () => {
    if (!isFolderSyncActiveRef.current || !directoryHandleRef.current) return;
    
    try {
      const perm = await directoryHandleRef.current.queryPermission({ mode: 'read' });
      if (perm !== 'granted') {
        // Attempt to re-request if prompt, or stop if denied
        if (perm === 'prompt') {
          const newPerm = await directoryHandleRef.current.requestPermission({ mode: 'read' });
          if (newPerm !== 'granted') {
            showAppNotification("Auto-refresh: Permission denied. Stopping sync.", "error");
            handleStopFolderSync(false);
            return;
          }
        } else { // Denied or other state
          showAppNotification("Auto-refresh: Permission lost. Stopping sync.", "error");
          handleStopFolderSync(false);
          return;
        }
      }

      const currentImageNamesFromThisFolder = new Set(
        imagesRef.current // Use ref for current images state
          .filter(img => img.source === 'synced' && img.syncedFolderName === directoryHandleRef.current!.name)
          .map(img => img.name)
      );
      await loadFilesFromDirectoryHandle(directoryHandleRef.current!, currentImageNamesFromThisFolder, false); // isFromExplicitAction = false
    } catch (error: any) {
      console.error("Auto-refresh error:", error);
      if (error.name === 'NotAllowedError' || error.message.includes('permission')) {
        showAppNotification("Auto-refresh: Permission issue. Stopping sync.", "error");
        handleStopFolderSync(false);
      }
      // For other errors, auto-refresh might continue trying, or we could add a counter to stop after N failures.
    }
  }, [loadFilesFromDirectoryHandle, showAppNotification]); // Removed handleStopFolderSync from deps to avoid direct call loop

  const startAutoRefresh = useCallback(() => {
    stopAutoRefresh(); // Clear existing timer
    if (browserSupportsFileSystemAccessAPI) { // Only if API is supported
        autoRefreshTimerRef.current = window.setInterval(autoRefreshLogic, AUTO_REFRESH_INTERVAL_MS);
    }
  }, [autoRefreshLogic, browserSupportsFileSystemAccessAPI]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }
  }, []);


  const handleStopFolderSync = useCallback((confirm = true) => {
    const doStop = () => {
      stopAutoRefresh();
      // Clear only images from this specific synced folder
      setImages(prev => prev.filter(img => !(img.source === 'synced' && img.syncedFolderName === syncedFolderName)));
      
      // Reset folder sync specific state
      setDirectoryHandle(null); 
      setIsFolderSyncActive(false); 
      setSyncedFolderName(null); 
      setIsLoadingDirectory(false);
      
      // Optionally, reset filters or view related to folder content
      // setFilteringByReferenceDetail(null);
      // setImageFilter(ImageFilterType.ALL);

      showAppNotification("Folder sync stopped.", 'success'); 
      closeConfirmationModal(); 
    };

    if (confirm && images.some(img => img.source === 'synced' && img.syncedFolderName === syncedFolderName)) {
        openConfirmationModal("Confirm Stop Sync", <><p>Stopping sync for '<strong>{syncedFolderName}</strong>' will remove its files ({images.filter(i => i.source === 'synced' && i.syncedFolderName === syncedFolderName).length}) from this view.</p><p>Manually added files and files from other syncs (if any) will remain.</p><p className="mt-2">Stop syncing?</p></>, doStop);
    } else {
        doStop(); // Stop without confirmation if no files from this folder or confirm=false
    }
  }, [images, syncedFolderName, showAppNotification, openConfirmationModal, closeConfirmationModal, stopAutoRefresh]);


  useEffect(() => {
    if (isFolderSyncActive && directoryHandle) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
    return stopAutoRefresh; // Cleanup on unmount
  }, [isFolderSyncActive, directoryHandle, startAutoRefresh, stopAutoRefresh]);


  const performActualUnload = useCallback(() => {
    const nameUnloaded = currentLoadedSessionName || "current data";
    clearNonImageDataForNewSession(); // Clears refs, session names, filters, etc.
    // Make non-synced images manual and clear their associations
    setImages(prev => prev.map(i => 
        i.source === 'synced' && i.syncedFolderName === syncedFolderName // Keep currently synced files as is
        ? i 
        : { ...i, associatedReferenceId: null, source: 'manual', syncedFolderName: undefined }
    ));
    showAppNotification(`Session '${nameUnloaded}' & refs unloaded.`, 'success'); closeConfirmationModal();
  }, [currentLoadedSessionName, showAppNotification, closeConfirmationModal, clearNonImageDataForNewSession, syncedFolderName]);

  const handleUnloadSession = useCallback(() => {
    if (!currentLoadedSessionName && !references.length && !images.some(i => i.associatedReferenceId && i.source === 'manual')) { 
        showAppNotification("Nothing to unload (no session or manual associations).", "success"); return; 
    }
    const assocCount = images.filter(i => i.associatedReferenceId && i.source === 'manual').length;
    const needsConfirm = references.length > 0 || assocCount > 0;
    if (needsConfirm) openConfirmationModal("Confirm Unload Session", <><p>Unloading '<strong>{currentLoadedSessionName || 'current data'}</strong>' removes {references.length ? `refs (${references.length})` : 'any loaded refs'}{references.length && assocCount ? ' and ' : ''}{assocCount ? `clears ${assocCount} manual associations` : ''}.</p><p className="mt-1">Files (manual & synced) remain.</p><p className="mt-2 font-semibold">Cannot be undone for refs/associations.</p><p className="mt-2">Proceed?</p></>, performActualUnload, "Unload Session");
    else performActualUnload();
  }, [currentLoadedSessionName, references, images, performActualUnload, openConfirmationModal, showAppNotification]);

  const handleApplyRatingToSelectedImages = useCallback((rating: number) => {
    const newRating = rating < 0 ? 0 : rating > 5 ? 5 : rating; 
    setImages(prevImgs =>
      prevImgs.map(img =>
        selectedImageIds.has(img.id)
          ? { ...img, rating: newRating === 0 ? undefined : newRating } 
          : img
      )
    );
    const message = newRating === 0 ? 'Ratings cleared for selected images.' : `Applied ${newRating}-star rating to selected images.`;
    showAppNotification(message, 'success');
  }, [selectedImageIds, showAppNotification]);

  const handleDeselectAllImages = useCallback(() => {
    setSelectedImageIds(new Set());
    setSelectionAnchorId(null);
  }, []);

  const commonRatingForSelected = useMemo(() => {
    if (selectedImageIds.size === 0) return undefined;
    let firstRating: number | undefined = undefined;
    let isFirst = true;
    let mixed = false;
    for (const id of selectedImageIds) {
      const img = imagesByIdMap.get(id);
      if (img) {
        const currentImgRating = img.rating === undefined ? 0 : img.rating; 
        if (isFirst) {
          firstRating = currentImgRating;
          isFirst = false;
        } else if (currentImgRating !== firstRating) {
          mixed = true;
          break;
        }
      }
    }
    return mixed ? -1 : (firstRating === undefined ? 0 : firstRating) ; 
  }, [selectedImageIds, imagesByIdMap]);
  
  const showSelectionActionsBar = useMemo(() => {
    return selectedImageIds.size > 0 && !isReorderEnabled && !isFolderSyncActive;
  }, [selectedImageIds, isReorderEnabled, isFolderSyncActive]);

  const handleImageCardSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setImageCardSize(Number(event.target.value));
  };

  const handleRatingFilterClick = useCallback((newRating: number | null) => {
    setRatingFilter(prev => prev === newRating ? null : newRating);
  }, []);

  const resetAllGalleryFilters = useCallback(() => {
    setImageFilter(ImageFilterType.ALL);
    setRatingFilter(null);
    setImageSortOrder(SortOrder.DESC);
    // setImageCardSize(DEFAULT_IMAGE_CARD_SIZE); // Keep user card size preference
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (imageFilter !== ImageFilterType.ALL && isReferencingModeActive) count++;
    if (ratingFilter !== null) count++;
    if (imageSortOrder !== SortOrder.DESC) count++;
    return count;
  }, [imageFilter, ratingFilter, imageSortOrder, isReferencingModeActive]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isConfirmationModalOpen || isShareModalOpen) return;
      
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT')) {
        return;
      }

      if (showSelectionActionsBar) {
        const key = event.key;
        if (key >= '0' && key <= '5') {
          event.preventDefault();
          handleApplyRatingToSelectedImages(parseInt(key, 10));
          return; 
        }
      }

      if (selectedImageIds.size === 1 && !isReorderEnabled && !isFolderSyncActive) {
        const currentImageId = Array.from(selectedImageIds)[0];
        const currentIndex = filteredAndSortedImages.findIndex(img => img.id === currentImageId);

        if (currentIndex === -1) return; 

        let nextIndex = -1;

        if (event.key === 'ArrowRight') {
          if (currentIndex < filteredAndSortedImages.length - 1) {
            nextIndex = currentIndex + 1;
          }
        } else if (event.key === 'ArrowLeft') {
          if (currentIndex > 0) {
            nextIndex = currentIndex - 1;
          }
        }

        if (nextIndex !== -1) {
          event.preventDefault();
          const nextImage = filteredAndSortedImages[nextIndex];
          if (nextImage) {
            setSelectedImageIds(new Set([nextImage.id]));
            setSelectionAnchorId(nextImage.id);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
      showSelectionActionsBar, 
      handleApplyRatingToSelectedImages, 
      isConfirmationModalOpen, 
      isShareModalOpen,
      selectedImageIds,
      isReorderEnabled,
      isFolderSyncActive,
      filteredAndSortedImages, 
  ]);

  useEffect(() => {
    if (selectedImageIds.size === 1 && !isReorderEnabled && !isFolderSyncActive) {
      const selectedImageId = Array.from(selectedImageIds)[0];
      if (selectedImageId) {
        requestAnimationFrame(() => {
          const imageElement = document.getElementById(`image-card-${selectedImageId}`);
          if (imageElement) {
            imageElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            });
          }
        });
      }
    }
  }, [selectedImageIds, filteredAndSortedImages, isReorderEnabled, isFolderSyncActive]);


  useEffect(() => { const cb = (e: MouseEvent) => { if (sessionLoadContainerRef.current && !sessionLoadContainerRef.current.contains(e.target as Node)) setIsSessionListVisible(false); }; if (isSessionListVisible) document.addEventListener('mousedown', cb); else document.removeEventListener('mousedown', cb); return () => document.removeEventListener('mousedown', cb); }, [isSessionListVisible]);
  useEffect(() => { const cb = (e: MouseEvent) => { if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node) && actionsButtonRef.current && !actionsButtonRef.current.contains(e.target as Node)) setIsActionsMenuOpen(false); }; if (isActionsMenuOpen) document.addEventListener('mousedown', cb); else document.removeEventListener('mousedown', cb); return () => document.removeEventListener('mousedown', cb); }, [isActionsMenuOpen]);
  useEffect(() => { if (isReferenceInputAreaCollapsed) setIsSessionListVisible(false); }, [isReferenceInputAreaCollapsed]);
  useEffect(() => { if (notification) { const t = setTimeout(() => setNotification(null), 4000); return () => clearTimeout(t); } }, [notification]); // Increased notification time
  useEffect(() => { if (!isReferencingModeActive && (imageFilter !== ImageFilterType.ALL || filteringByReferenceDetail)) { setImageFilter(ImageFilterType.ALL); setFilteringByReferenceDetail(null); setSelectedImageIds(new Set()); setSelectionAnchorId(null); } }, [isReferencingModeActive, imageFilter, filteringByReferenceDetail]);
  
  useEffect(() => {
    const handleClickOutsideFilterPanel = (event: MouseEvent) => {
      if (
        filterPanelRef.current &&
        !filterPanelRef.current.contains(event.target as Node) &&
        filterPanelButtonRef.current &&
        !filterPanelButtonRef.current.contains(event.target as Node)
      ) {
        setIsFilterPanelOpen(false);
      }
    };
    if (isFilterPanelOpen) document.addEventListener('mousedown', handleClickOutsideFilterPanel);
    else document.removeEventListener('mousedown', handleClickOutsideFilterPanel);
    return () => document.removeEventListener('mousedown', handleClickOutsideFilterPanel);
  }, [isFilterPanelOpen]);

  const handleOpenShareModal = () => { setIsShareModalOpen(true); setIsActionsMenuOpen(false); };
  const handleCloseShareModal = () => setIsShareModalOpen(false);
  const handleConfirmShare = async (name: string, type: 'copyLink' | 'sendToRetouch', assignee?: string, step?: string) => {
    const shareName = name.trim() || (isFolderSyncActive && syncedFolderName ? `Folder: ${syncedFolderName}` : "Untitled Session");
    if (type === 'copyLink') try { await navigator.clipboard.writeText(window.location.href); showAppNotification(`Link copied for: ${shareName}!`); } catch (err) { console.error('Copy URL fail:', err); showAppNotification('Failed to copy URL.', 'error'); }
    else if (type === 'sendToRetouch') { if (step) { console.log(`Sending "${shareName}" to ${assignee || 'Unassigned'} for retouch (Step: ${step}).`); showAppNotification(`Session "${shareName}" sent for ${step}${assignee ? ` to ${assignee}` : ''}.`); } else showAppNotification('Step required for retouch.', 'error'); }
    handleCloseShareModal();
  };
  const showReferencesPanelFull = isReferencingModeActive && !isReferencesPanelCollapsed;

  if (showDropZoneOverlay && !isFolderSyncActive) return <div className="fixed inset-0 bg-blue-600 bg-opacity-90 flex items-center justify-center z-[9999] p-4"><h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white animate-pulse text-center">{currentDropPhrase}</h1></div>;

  return (
    <div className="min-h-screen flex flex-col text-gray-800 bg-white">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-800">Drop Flow</h1>
          <div className="flex items-center space-x-3">
             {!isFolderSyncActive && browserSupportsFileSystemAccessAPI && (<button onClick={handleStartFolderSync} className="flex items-center bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-3 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50 text-sm" title="Synchronize local folder (experimental)"><DocumentDuplicateIcon className="w-4 h-4 mr-2" />Sync Folder</button>)}
            {isFolderSyncActive && (<>
                <button onClick={handleRefreshSyncedFolder} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-sm disabled:bg-blue-300" title="Refresh synced folder"><ArrowPathIcon className={`w-4 h-4 mr-2`} />Refresh</button>
                <button onClick={() => handleStopFolderSync()} className="flex items-center bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 text-sm disabled:bg-red-300" title="Stop folder sync"><StopCircleIcon className="w-4 h-4 mr-2" />Stop Sync</button>
            </>)}
            <div className="relative">
                <button id="actions-button" ref={actionsButtonRef} onClick={() => setIsActionsMenuOpen(o => !o)} className="flex items-center bg-slate-700 hover:bg-slate-800 text-white font-medium py-2 px-4 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-opacity-50 text-sm" aria-haspopup="true" aria-expanded={isActionsMenuOpen} aria-controls="actions-menu" title="Open actions menu">Actions <ChevronDownIcon className={`w-4 h-4 ml-2 transition-transform duration-200 ${isActionsMenuOpen ? 'rotate-180' : ''}`} /></button>
                {isActionsMenuOpen && (<div id="actions-menu" ref={actionsMenuRef} className="absolute right-0 mt-2 w-56 bg-white shadow-sm border border-gray-200 py-1 z-50" role="menu" aria-orientation="vertical" aria-labelledby="actions-button">
                    <button onClick={handleOpenShareModal} className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:outline-none" role="menuitem" title="Share session/folder"><ArrowUpOnSquareIcon className="w-4 h-4 mr-3 text-gray-500" />Share</button>
                    <button onClick={() => { setIsActionsMenuOpen(false); showAppNotification('Publish triggered (dev).') }} disabled={!areAnyImagesAssociated} className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed" role="menuitem" title={!areAnyImagesAssociated ? "Associate files to enable Publish" : "Publish content"}><CloudArrowUpIcon className="w-4 h-4 mr-3 text-gray-500" />Publish</button>
                    <div role="separator" className="my-1 h-px bg-gray-200"></div>
                    <button onClick={() => { setIsReferencingModeActive(o => !o); if (isReferencingModeActive) setIsReferencesPanelCollapsed(false); setIsActionsMenuOpen(false); }} className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:outline-none" role="menuitem" title={isReferencingModeActive ? "Deactivate Referencing" : "Activate Referencing"}><LinkIcon className="w-4 h-4 mr-3 text-gray-500" />{isReferencingModeActive ? "Deactivate Referencing" : "Activate Referencing"}</button>
                </div>)}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col md:flex-row p-4 gap-4">
        <section className={`flex flex-col transition-all duration-300 ease-in-out ${showReferencesPanelFull ? 'md:w-2/3' : 'w-full'}`}>
          
          <div ref={imageGalleryScrollContainerRef} className="flex-grow overflow-y-auto min-h-0"> 
            <div className="bg-white border-b border-gray-200 pb-3"> 
              <div className="flex justify-between items-center mb-1 pt-2">
                <h2 className="text-xl font-semibold text-gray-800">File Gallery</h2>
                <div className="flex items-center space-x-2">
                    {images.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1.5">
                          <label htmlFor="imageCardSizeSlider" className="text-sm text-gray-600 whitespace-nowrap">Size: <span className="font-semibold">{imageCardSize}px</span></label>
                          <input
                            type="range"
                            id="imageCardSizeSlider"
                            min="120"
                            max="500" 
                            step="10"
                            value={imageCardSize}
                            onChange={handleImageCardSizeChange}
                            className="w-24 h-2 bg-gray-200 appearance-none cursor-pointer accent-slate-600 disabled:opacity-50"
                            title={`Adjust preview card size: ${imageCardSize}px`}
                            // disabled={isLoadingDirectory}
                          />
                        </div>
                        <div className="relative">
                          <button 
                              ref={filterPanelButtonRef}
                              onClick={() => setIsFilterPanelOpen(o => !o)}
                              className="flex items-center bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-3 transition-colors border border-gray-300 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-opacity-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Filter and sort options"
                              aria-haspopup="true"
                              aria-expanded={isFilterPanelOpen}
                              aria-controls="filter-sort-panel"
                              // disabled={isLoadingDirectory}
                          >
                              <AdjustmentsHorizontalIcon className="w-4 h-4 mr-2" />
                              Filters
                              {activeFilterCount > 0 && (
                                  <span className="ml-2 bg-slate-600 text-white text-xs font-semibold px-1.5 py-0.5">
                                      {activeFilterCount}
                                  </span>
                              )}
                          </button>
                          {isFilterPanelOpen && (
                              <div ref={filterPanelRef} id="filter-sort-panel">
                                  <FilterPanel
                                      isOpen={isFilterPanelOpen}
                                      onClose={() => setIsFilterPanelOpen(false)}
                                      currentStatusFilter={imageFilter}
                                      onStatusFilterChange={handleMainFilterChange}
                                      currentRatingFilter={ratingFilter}
                                      onRatingFilterChange={handleRatingFilterClick}
                                      currentSortOrder={imageSortOrder}
                                      onSortOrderChange={toggleSortOrder}
                                      onResetFilters={resetAllGalleryFilters}
                                      imageFilterTypeDisplayNames={IMAGE_FILTER_TYPE_DISPLAY_NAMES}
                                      sortOrderEnum={SortOrder}
                                      // isLoading={isLoadingDirectory}
                                      isReorderActive={isReorderEnabled}
                                      isReferencingModeActive={isReferencingModeActive}
                                      imageFilterEnum={ImageFilterType}
                                  />
                              </div>
                          )}
                        </div>
                      </div>
                    )}
                    {!isFolderSyncActive && (
                        <button onClick={handleUploadButtonClick} className="flex items-center bg-slate-700 hover:bg-slate-800 text-white font-medium py-2 px-3 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-opacity-50 text-sm" title="Upload files">
                            <UploadIcon className="w-4 h-4 mr-2" />Upload Files
                        </button>
                    )}
                </div>
              </div>
              {!isFolderSyncActive && (<input type="file" multiple ref={fileInputRef} onChange={handleFileInputChange} className="hidden" id="hidden-file-input" aria-hidden="true"/>)}
              
              <div className="space-y-1 mt-3"> 
                {showGallerySubtitle && (
                    <div>
                        <h3 className="text-lg font-medium text-gray-700 flex items-center flex-wrap">
                            <span>{getCurrentViewTitle()} ({filteredAndSortedImages.length})</span>
                            {filteringByReferenceDetail && imageFilter === ImageFilterType.ASSOCIATED && (
                                <button
                                    onClick={() => {
                                    setFilteringByReferenceDetail(null);
                                    setImageFilter(images.some(i => i.associatedReferenceId) ? ImageFilterType.ASSOCIATED : ImageFilterType.ALL);
                                    }}
                                    className="ml-2 p-0.5 hover:bg-red-100 text-red-600 hover:text-red-700 focus:outline-none focus:ring-1 focus:ring-red-300 disabled:opacity-50"
                                    title={`Clear filter for '${filteringByReferenceDetail.text}'`}
                                    // disabled={isLoadingDirectory}
                                    aria-label={`Clear filter for reference ${filteringByReferenceDetail.text}`}
                                >
                                    <XCircleIcon className="w-4 h-4" />
                                </button>
                            )}
                            <span className="ml-1 text-lg font-medium text-gray-700">
                              {!isReorderEnabled && selectedImageIds.size > 0 && ` - ${selectedImageIds.size} selected (${groupedImagesForDisplay.flatMap(g => g.images).filter(i => selectedImageIds.has(i.id)).length} visible)`}
                            </span>
                        </h3>
                        {isReorderEnabled && (<p className="text-xs text-blue-600">Drag & drop to reorder files for this reference.</p>)}
                        {isFolderSyncActive && (<p className="text-xs text-teal-600">
                            Displaying from: <strong>{syncedFolderName}</strong>.
                            {isLoadingDirectory ? ' Refreshing...' : (autoRefreshTimerRef.current ? ' Auto-sync active.' : ' Click "Refresh" for external changes.')}
                        </p>)}
                    </div>
                )}
              </div>
            </div>
          
            {isLoadingDirectory && images.length === 0 && (<p className="text-center text-gray-500 py-8 flex-grow flex items-center justify-center">Loading files from '{syncedFolderName}'...</p>)}
            {!isLoadingDirectory && groupedImagesForDisplay.length === 0 ? (<p className="text-center text-gray-500 py-8 flex-grow flex items-center justify-center">{images.length ? (filteringByReferenceDetail ? `No files for ref: "${filteringByReferenceDetail.text}".` : (isReferencingModeActive && !isReferencesPanelCollapsed && imageFilter !== ImageFilterType.ALL) ? 'No files match filter.' : (ratingFilter !== null ? `No files match ${ratingFilter === 0 ? 'Not Rated' : `${ratingFilter}-star`} filter.` : 'No files for current view.')) : (isFolderSyncActive ? `No images in '${syncedFolderName}' or empty. Add files & refresh.` : 'No files. Upload or drag & drop.')}</p>)
            : (<div className="pt-4">
                {groupedImagesForDisplay.map((group, idx) => (<div key={group.key} className={`${idx > 0 && group.isUnassociatedGroup ? "mt-6 pt-2" : ""} ${idx > 0 && !group.isUnassociatedGroup && group.reference && !groupedImagesForDisplay[idx-1].isUnassociatedGroup ? "" : ""}`}>
                    {group.reference && !filteringByReferenceDetail && (<h4 className="text-md font-semibold text-gray-700 mb-3 bg-gray-50 py-1.5 px-2">Reference: {group.reference.text} ({group.images.length})</h4>)}
                    <div className="flex flex-wrap justify-start gap-4 py-2">
                      {group.images.map(image => (<div key={image.id} className="relative group">
                          <ImageGridItem 
                              image={image} 
                              isSelected={!isReorderEnabled && selectedImageIds.has(image.id)} 
                              associatedReference={image.associatedReferenceId ? referenceMap.get(image.associatedReferenceId) ?? null : null} 
                              onSelect={handleImageSelect} 
                              onUnassociate={handleUnassociateImage} 
                              isDraggable={isReorderEnabled} 
                              draggedImageId={draggedImageId} 
                              onDragStartImage={handleImageDragStart} 
                              onDropOnImage={handleImageDrop} 
                              onActualDragEnd={handleActualDragEndFromItem}
                              cardWidth={imageCardSize}
                          />
                          {!isReorderEnabled && image.source === 'manual' && <button onClick={() => handleDeleteImage(image.id)} className="absolute top-1.5 left-1.5 bg-red-600 hover:bg-red-700 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:ring-2 focus:ring-offset-1 focus:ring-red-500 z-20" title="Delete file" aria-label={`Delete file ${image.name}`}><TrashIcon className="w-4 h-4" /></button>}
                        </div>))}
                    </div>
                    {!group.isUnassociatedGroup && !filteringByReferenceDetail && idx < groupedImagesForDisplay.length - 1 && (<hr className="my-6 border-t-2 border-gray-200" />)}
                  </div>))}
              </div>)}
          </div> 
          
          {showSelectionActionsBar && (
            <div className="sticky bottom-0 bg-slate-800 text-white p-2 md:p-3 shadow-md-top z-10 flex items-center justify-between space-x-2 md:space-x-4 border-t border-slate-700 shrink-0">
              <span className="text-sm font-medium px-2 whitespace-nowrap">
                {selectedImageIds.size} item{selectedImageIds.size === 1 ? '' : 's'} selected
              </span>
              <div className="flex items-center space-x-1 md:space-x-2">
                {[1, 2, 3, 4, 5].map(starValue => (
                  <button
                    key={starValue}
                    onClick={() => handleApplyRatingToSelectedImages(starValue)}
                    onMouseEnter={() => setHoveredRatingInBar(starValue)}
                    onMouseLeave={() => setHoveredRatingInBar(0)}
                    className="p-1 hover:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                    title={`Rate ${starValue} star${starValue === 1 ? '' : 's'}`}
                    aria-label={`Apply ${starValue} star rating`}
                  >
                    {(hoveredRatingInBar > 0 ? hoveredRatingInBar >= starValue : (commonRatingForSelected !== -1 && (commonRatingForSelected || 0) >= starValue))
                      ? <StarIconFilled className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" />
                      : <StarIconOutline className="w-5 h-5 md:w-6 md:h-6 text-slate-400 hover:text-yellow-500" />
                    }
                  </button>
                ))}
                <button
                  onClick={() => handleApplyRatingToSelectedImages(0)}
                  className="p-1.5 ml-1 md:ml-2 hover:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  title="Clear rating for selected (0)"
                  aria-label="Clear rating for selected items"
                >
                  <NoSymbolIcon className="w-4 h-4 md:w-5 md:h-5 text-slate-300 hover:text-white" />
                </button>
              </div>
              <button
                onClick={handleDeselectAllImages}
                className="text-sm bg-slate-600 hover:bg-slate-500 px-3 py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 whitespace-nowrap"
                title="Deselect all items"
              >
                Deselect All
              </button>
            </div>
          )}
        </section>

        <section id="references-panel" className={`md:sticky md:top-20 md:h-[calc(100vh-8rem)] transition-all duration-300 ease-in-out flex flex-col bg-white ${isReferencingModeActive ? (isReferencesPanelCollapsed ? 'md:w-[52px] p-3 md:border-l md:border-gray-200' : 'md:w-1/3 p-4 md:pl-6 md:border-l md:border-gray-200') : 'md:w-0 p-0 border-none opacity-0 pointer-events-none overflow-hidden'}`} aria-hidden={!isReferencingModeActive}>
          {isReferencingModeActive && (<>
              <div className={`flex justify-between items-center mb-4 ${isReferencesPanelCollapsed ? 'hidden' : ''}`}>
                <h2 className="text-xl font-semibold text-gray-800">References</h2>
                <div className="flex items-center space-x-1">
                    <button onClick={() => setIsReferencesPanelCollapsed(true)} className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300" title="Collapse References" aria-expanded="true" aria-controls="references-panel-content"><ChevronDoubleRightIcon className="w-5 h-5" /></button>
                    <button onClick={() => { setIsReferencingModeActive(false); setIsReferencesPanelCollapsed(false); }} className="p-1.5 hover:bg-red-100 text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-300" title="Close References (Exit Mode)"><XMarkIcon className="w-5 h-5" /></button>
                </div>
              </div>
              {isReferencesPanelCollapsed && (<div className="flex justify-center items-center h-full"><button onClick={() => setIsReferencesPanelCollapsed(false)} className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300" title="Show References" aria-expanded="false" aria-controls="references-panel-content"><ChevronDoubleLeftIcon className="w-6 h-6" /></button></div>)}
              <div id="references-panel-content" className={`flex-grow flex flex-col min-h-0 overflow-y-auto ${isReferencesPanelCollapsed ? 'hidden' : ''}`}>
                  {!isFolderSyncActive && (<div className="mb-4">
                        <div className="flex justify-between items-center mb-2"><h3 className="text-sm font-semibold text-gray-700">{referenceAddMode === 'manual' ? 'Add Manually' : 'Load/Create Session'}</h3><button onClick={() => setIsReferenceInputAreaCollapsed(o => !o)} className="p-1 hover:bg-gray-100 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-300" title={isReferenceInputAreaCollapsed ? 'Show input' : 'Hide input'} aria-expanded={!isReferenceInputAreaCollapsed} aria-controls="ref-input-collapsible">{isReferenceInputAreaCollapsed ? <ChevronDownIcon className="w-5 h-5" /> : <ChevronUpIcon className="w-5 h-5" />}</button></div>
                        <div id="ref-input-collapsible" className={`transition-all duration-300 ease-in-out ${isReferenceInputAreaCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[500px] opacity-100'}`}>
                            {referenceAddMode === 'manual' && (<div>
                                <textarea id="reference-input" rows={2} value={referenceInput} onChange={handleReferenceInputChange} placeholder="Ref001, Item ABC, Project X" className="w-full p-2 border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"/>
                                <button onClick={handleAddReferencesFromInput} className="mt-2 w-full bg-slate-700 hover:bg-slate-800 text-white font-medium py-2 px-3 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 text-sm">Add Manually</button>
                                <div className="my-3 flex items-center"><hr className="flex-grow border-t"/><span className="mx-3 text-xs text-gray-400">OR</span><hr className="flex-grow border-t"/></div>
                                <button onClick={() => { setReferenceAddMode('session'); setReferenceInput(''); }} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm border">Switch to Load/Create</button>
                            </div>)}
                            {referenceAddMode === 'session' && (<div ref={sessionLoadContainerRef}>
                                <input type="text" id="session-search" placeholder="Search or type to create..." value={sessionSearchTerm} onChange={handleSessionSearchChange} onFocus={() => !isReferenceInputAreaCollapsed && setIsSessionListVisible(true)} onClick={() => !isReferenceInputAreaCollapsed && setIsSessionListVisible(true)} className="w-full p-2 border border-gray-300 focus:ring-1 focus:ring-blue-500 text-sm mb-2" aria-haspopup="listbox" aria-expanded={isSessionListVisible && !isReferenceInputAreaCollapsed} disabled={isReferenceInputAreaCollapsed}/>
                                {isSessionListVisible && !isReferenceInputAreaCollapsed && sessionDisplayOptions.length > 0 && (<div className="absolute z-10 w-full mt-1 max-h-96 overflow-y-auto border bg-white shadow-sm p-1 space-y-1" role="listbox" id="session-listbox">
                                    {sessionDisplayOptions.map(opt => (<button key={opt.id} role="option" onClick={() => { if (opt.isCreateOption) handleCreateNewSession(sessionSearchTerm.trim() || "Untitled Session"); else if (opt.originalSessionId) handleLoadExistingSession(opt.originalSessionId); }} disabled={isReferenceInputAreaCollapsed} className={`w-full text-left p-1.5 text-sm ${opt.isCreateOption ? 'text-blue-600 hover:bg-blue-50 font-medium italic' : 'text-gray-700 hover:bg-gray-50'} disabled:opacity-50`} title={opt.name}>{opt.name}</button>))}
                                    {isSessionListVisible && !isReferenceInputAreaCollapsed && sessionDisplayOptions.length === 0 && sessionSearchTerm.trim() !== '' && (<p className="p-1.5 text-sm text-gray-500 text-center">No sessions match. Type to create.</p>)}
                                </div>)}
                                <div className="my-3 flex items-center"><hr className="flex-grow border-t"/><span className="mx-3 text-xs text-gray-400">OR</span><hr className="flex-grow border-t"/></div>
                                <button onClick={() => { setReferenceAddMode('manual'); setSessionSearchTerm(''); setIsSessionListVisible(false); }} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm border" disabled={isReferenceInputAreaCollapsed}>Switch to Add Manually</button>
                            </div>)}
                        </div>
                    </div>)}
                  {isFolderSyncActive && (<div className="mb-4 p-2 bg-teal-50 border border-teal-200 text-teal-700 text-sm">
                        <p className="font-medium">Folder Sync Active</p><p className="text-xs">Add refs below for files from '<strong>{syncedFolderName}</strong>'. Session loading disabled.</p>
                        <div className="mt-2"><textarea id="ref-input-sync" rows={2} value={referenceInput} onChange={handleReferenceInputChange} placeholder="Ref001, Item ABC" className="w-full p-2 border focus:ring-1 focus:ring-blue-500 text-sm"/>
                        <button onClick={handleAddReferencesFromInput} className="mt-2 w-full bg-slate-700 hover:bg-slate-800 text-white font-medium py-2 px-3 focus:outline-none focus:ring-2 focus:ring-slate-500 text-sm">Add References</button></div>
                    </div>)}
                  <hr className="my-4 border-t border-gray-200" />
                  <div className="flex-grow flex flex-col min-h-0">
                        {currentLoadedSessionName && !isFolderSyncActive && (<div className="p-2 mb-3 bg-blue-50 border border-blue-200 text-blue-700 text-sm shadow-sm flex justify-between items-center" role="status">
                            <div><p className="font-medium">Session: <span className="font-bold">{currentLoadedSessionName}</span></p><p className="text-xs mt-0.5">Add more refs manually.</p></div>
                            <button onClick={handleUnloadSession} className="p-1 ml-2 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-1 focus:ring-red-400 focus:ring-offset-1 focus:ring-offset-blue-50" title="Unload session & clear refs" aria-label={`Unload ${currentLoadedSessionName}`}><XCircleIcon className="w-5 h-5" /></button>
                        </div>)}
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-medium text-gray-700">Available References ({references.length})
                                {!isReorderEnabled && selectedImageIds.size > 0 && (<span className="text-sm text-blue-600 font-normal"> - Click to associate {selectedImageIds.size} file(s)</span>)}
                                {!isReorderEnabled && !selectedImageIds.size && references.length > 0 && imageCountByReference.size > 0 && !currentLoadedSessionName && !isFolderSyncActive && (<span className="text-sm text-gray-500 font-normal"> - Click ref to filter</span>)}
                                {isReorderEnabled && (<span className="text-sm text-blue-500 font-normal"> - Reordering active</span>)}
                            </h3>
                            <div className="flex items-center space-x-1">
                                <button onClick={() => setReferenceViewMode('list')} className={`p-1.5 ${referenceViewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'} text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2`} title="List View" aria-pressed={referenceViewMode === 'list'}><ListBulletIcon className="w-5 h-5" /></button>
                                <button onClick={() => setReferenceViewMode('grid')} className={`p-1.5 ${referenceViewMode === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'} text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2`} title="Grid View" aria-pressed={referenceViewMode === 'grid'}><Squares2X2Icon className="w-5 h-5" /></button>
                            </div>
                        </div>
                      {references.length === 0 ? (<p className="text-center text-gray-500 py-8 flex-grow flex items-center justify-center">{isFolderSyncActive ? `No refs for '${syncedFolderName}'. Add above.` : (currentLoadedSessionName ? `Session '${currentLoadedSessionName}' has no refs. Add manually.` : 'No refs. Use a method above.')}</p>)
                      : (<div className={`flex-grow overflow-y-auto pr-1 pb-1 ${referenceViewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-3' : 'flex flex-col space-y-2'}`}>
                            {references.map(ref => (<ReferenceItem key={ref.id} reference={ref} associatedImageCount={imageCountByReference.get(ref.id) || 0} onSelect={handleReferenceItemClick} canAssociate={!isReorderEnabled && selectedImageIds.size > 0} isFilterTarget={filteringByReferenceDetail?.id === ref.id} previewImageUrl={getReferencePreviewImageUrl(ref.id)} viewMode={referenceViewMode} onDelete={handleDeleteReference}/>))}
                        </div>)}
                  </div>
              </div></>)}
        </section>
      </main>

      {isShareModalOpen && (<ShareModal isOpen={isShareModalOpen} onClose={handleCloseShareModal} initialSessionName={isFolderSyncActive ? `Folder: ${syncedFolderName}` : (loadedSessionNameForShare || currentLoadedSessionName)} onConfirmShare={handleConfirmShare}/>)}
      {isConfirmationModalOpen && confirmationModalConfig && (<ConfirmationModal isOpen={isConfirmationModalOpen} onClose={closeConfirmationModal} onConfirm={confirmationModalConfig.onConfirmAction} title={confirmationModalConfig.title} message={confirmationModalConfig.message} confirmButtonText={confirmationModalConfig.confirmButtonText}/>)}
      {notification && (<div className={`fixed bottom-5 left-1/2 -translate-x-1/2 px-6 py-3 shadow-lg text-white text-sm z-[10000] ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`} role="alert" aria-live="assertive">{notification.message}</div>)}
    </div>
  );
};

export default App;