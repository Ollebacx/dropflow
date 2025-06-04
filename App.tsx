
import React, { useState, useCallback, useMemo, DragEvent as ReactDragEvent, useEffect, useRef } from 'react';
import { ImageFile, Reference, SortOrder, ImageFilterType } from './types';
import ImageGridItem from './components/ImageGridItem';
import ReferenceItem from './components/ReferenceItem';
import ShareModal from './components/ShareModal';
import { LinkIcon, TrashIcon, SortAscIcon, SortDescIcon, XCircleIcon, UploadIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, ChevronDownIcon, ChevronUpIcon, ArrowUpOnSquareIcon, CloudArrowUpIcon, XMarkIcon, ListBulletIcon, Squares2X2Icon } from './constants';

interface FilteringByReferenceDetail {
  id: string;
  text: string;
}

interface NotificationState {
  message: string;
  type: 'success' | 'error';
}

const dropPhrases = [
  "Drop it like it's hot!",
  "Incoming! Brace for files!",
  "Release the files!",
  "Let the dropping commence!",
  "Files, assemble!",
  "Prepare for data drop!",
  "Feed me your files!",
  "Make it rain (files)!",
  "Drop zone activated!",
  "Time to drop and load.",
  "File drop: engage!",
  "Gimme those pixels (and bits)!",
  "The drop is mightier than the click.",
  "Easy does it... now DROP!",
  "You've got the files, I've got the space.",
  "Drop it like your Wi-Fi depends on it.",
  "Drag, drop, and conquer.",
  "File drop incoming. Look busy!",
  "This is where the magic happens (with files).",
  "Show me what you got (files-wise).",
  "Drop 'em if you got 'em.",
  "Ready for your file payload?",
  "All your files are belong to us (temporarily).",
  "Just drop it.",
  "The system is ready for your drop.",
  "File drop mission: accepted.",
  "Don't be shy, drop those files.",
  "Uploading... I mean, dropping!",
  "Get ready for the file party!",
  "Let's get these files uploaded, drop-style.",
  "Your files are about to find a new home.",
  "On the count of three, drop!",
  "Dropping files like a pro.",
  "This app eats files for breakfast.",
  "Caution: Awesome file drop in progress.",
  "Files incoming! Clear the deck!",
  "The more files, the merrier the drop.",
  "File drop success in 3... 2... 1...",
  "Keep calm and drop files.",
  "May your drop be swift and your files be many.",
  "The chosen files for the grand drop!",
  "It's a bird! It's a plane! No, it's your files!",
  "Drop it here, we'll take care of the rest.",
  "Files detected. Prepare for awesomeness.",
  "The drop zone is hungry for files.",
  "Let the great file drop begin!",
  "Your files' journey starts with a drop.",
  "Unleash the file fury!",
  "One small drag for man, one giant drop for filekind.",
  "Drop 'til you can't stop!"
];

// Mock Data for Sessions
interface MockSession {
  id: string;
  name: string;
}

const mockSessions: MockSession[] = [
  { id: 'session_proj_alpha', name: 'Project Alpha - Phase 1 Keywords' },
  { id: 'session_client_beta', name: 'Client Beta - Approved Product Names' },
  { id: 'session_research_gamma', name: 'Research Gamma - Core Concepts' },
  { id: 'session_marketing_q1', name: 'Marketing Q1 - Campaign Tags' },
  { id: 'session_dev_sprint_5', name: 'Dev Sprint 5 - Feature IDs' },
];

const mockSessionReferences: Record<string, string[]> = {
  'session_proj_alpha': ['AlphaCore', 'SynergyMax', 'QuantumLeap', 'NovaMetric', 'ZenithPoint'],
  'session_client_beta': ['ProductX', 'ServiceY', 'SolutionZ', 'BetaFeature', 'ClientBrandName'],
  'session_research_gamma': ['MethodologyA', 'TheoremB', 'HypothesisC', 'VariableD', 'ConclusionE'],
  'session_marketing_q1': ['#SpringSale', '#NewProductLaunch', '#EarlyBird', '#LimitedTimeOffer', '#Q1Promo'],
  'session_dev_sprint_5': ['FEAT-101', 'FEAT-102-Subtask', 'BUG-205', 'UIUX-007', 'API-042'],
};


const App: React.FC = () => {
  const [images, setImages] = useState<ImageFile[]>([]); // "images" now means generic files
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

  const [sessionSearchTerm, setSessionSearchTerm] = useState<string>('');
  const [isSessionListVisible, setIsSessionListVisible] = useState<boolean>(false);
  const sessionLoadContainerRef = useRef<HTMLDivElement>(null);
  const [loadedSessionNameForShare, setLoadedSessionNameForShare] = useState<string | null>(null);


  const [referenceAddMode, setReferenceAddMode] = useState<'manual' | 'session'>('session');
  const [isReferenceInputAreaCollapsed, setIsReferenceInputAreaCollapsed] = useState(false);
  
  const [isReferencingModeActive, setIsReferencingModeActive] = useState(false);
  const [isReferencesPanelCollapsed, setIsReferencesPanelCollapsed] = useState(false); // For chevron collapse
  const [referenceViewMode, setReferenceViewMode] = useState<'list' | 'grid'>('list');


  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const actionsButtonRef = useRef<HTMLButtonElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);


  const isReorderEnabled = useMemo(() => {
    return imageFilter === ImageFilterType.ASSOCIATED && !!filteringByReferenceDetail;
  }, [imageFilter, filteringByReferenceDetail]);

  const imagesByIdMap = useMemo(() => new Map(images.map(img => [img.id, img])), [images]);
  const referenceMap = useMemo(() => new Map(references.map(ref => [ref.id, ref])), [references]);

  const areAnyImagesAssociated = useMemo(() => {
    return images.some(image => !!image.associatedReferenceId);
  }, [images]);

  const handleImagesUpload = useCallback((newImageFiles: ImageFile[]) => {
    setImages(prevImages => [...prevImages, ...newImageFiles]);
  }, []);

  const addReferencesFromText = useCallback((text: string) => {
    if (text.trim() === '') return 0;
    const newRefTexts = text
      .split(/[,\s]+/) 
      .map(t => t.trim())
      .filter(t => t !== '' && !references.some(ref => ref.text.toLowerCase() === t.toLowerCase())); 
      
    const newRefObjects: Reference[] = newRefTexts.map(t => ({
      id: crypto.randomUUID(),
      text: t,
    }));

    if (newRefObjects.length > 0) {
      setReferences(prevReferences => [...prevReferences, ...newRefObjects]);
    }
    return newRefObjects.length;
  }, [references]);

  const processFileListAndSetImages = useCallback((fileList: FileList) => {
    const filesArray: File[] = Array.from(fileList); // Accept all files
    if (filesArray.length === 0) return;

    const newFileObjectsPromises: Promise<ImageFile>[] = filesArray.map(file => {
      return new Promise((resolve, reject) => {
        const isKnownImageType = (fileType: string) => 
          ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'].some(t => fileType.startsWith(t));

        if (isKnownImageType(file.type)) {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              id: crypto.randomUUID(),
              name: file.name,
              type: file.type,
              size: file.size,
              lastModified: file.lastModified,
              dataUrl: e.target?.result as string,
              fileObject: file,
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        } else {
          // For non-image files or unrenderable image types, resolve without dataUrl
          resolve({
            id: crypto.randomUUID(),
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
            // dataUrl is omitted, will be undefined
            fileObject: file,
          });
        }
      });
    });

    Promise.all(newFileObjectsPromises)
      .then(fileObjects => {
        if (fileObjects.length > 0) {
          handleImagesUpload(fileObjects);
        }
      })
      .catch(error => console.error("Error reading files:", error));
  }, [handleImagesUpload]);

  useEffect(() => {
    const dragTarget = document.documentElement;

    const handleDragEnter = (event: globalThis.DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer?.types.includes('Files')) {
        dragOverDocumentCounterRef.current++;
        if (!showDropZoneOverlay) { 
          const randomIndex = Math.floor(Math.random() * dropPhrases.length);
          setCurrentDropPhrase(dropPhrases[randomIndex]);
          setShowDropZoneOverlay(true);
        }
      }
    };

    const handleDragOver = (event: globalThis.DragEvent) => {
      event.preventDefault(); 
    };

    const handleDragLeave = (event: globalThis.DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer?.types.includes('Files')) {
          dragOverDocumentCounterRef.current--;
          if (dragOverDocumentCounterRef.current <= 0) {
            setShowDropZoneOverlay(false);
            dragOverDocumentCounterRef.current = 0;
          }
      }
    };

    const handleDrop = (event: globalThis.DragEvent) => {
      event.preventDefault();
      setShowDropZoneOverlay(false);
      dragOverDocumentCounterRef.current = 0;
      if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
        processFileListAndSetImages(event.dataTransfer.files);
      }
    };

    dragTarget.addEventListener('dragenter', handleDragEnter);
    dragTarget.addEventListener('dragover', handleDragOver);
    dragTarget.addEventListener('dragleave', handleDragLeave);
    dragTarget.addEventListener('drop', handleDrop);

    return () => {
      dragTarget.removeEventListener('dragenter', handleDragEnter);
      dragTarget.removeEventListener('dragover', handleDragOver);
      dragTarget.removeEventListener('dragleave', handleDragLeave);
      dragTarget.removeEventListener('drop', handleDrop);
    };
  }, [processFileListAndSetImages, showDropZoneOverlay]);


  const filteredAndSortedImages = useMemo(() => {
    let filtered = images.filter(image => {
      if (imageFilter === ImageFilterType.ASSOCIATED) {
        if (filteringByReferenceDetail) {
          return image.associatedReferenceId === filteringByReferenceDetail.id;
        }
        return !!image.associatedReferenceId;
      }
      if (imageFilter === ImageFilterType.UNASSOCIATED) {
        return !image.associatedReferenceId;
      }
      return true; // ImageFilterType.ALL
    });

    if (isReorderEnabled && filteringByReferenceDetail) {
      const customOrderIds = referenceImageOrder.get(filteringByReferenceDetail.id);
      if (customOrderIds) {
        const orderedImages: ImageFile[] = [];
        const customOrderSet = new Set(customOrderIds);

        customOrderIds.forEach(id => {
          const img = imagesByIdMap.get(id);
          if (img && img.associatedReferenceId === filteringByReferenceDetail.id) { 
            orderedImages.push(img);
          }
        });

        const remainingImages = filtered
          .filter(img => !customOrderSet.has(img.id))
          .sort((a, b) => imageSortOrder === SortOrder.DESC ? b.lastModified - a.lastModified : a.lastModified - b.lastModified);
        
        return [...orderedImages, ...remainingImages];
      }
    }

    return [...filtered].sort((a, b) => {
      if (imageSortOrder === SortOrder.DESC) {
        return b.lastModified - a.lastModified;
      }
      return a.lastModified - b.lastModified;
    });
  }, [images, imageSortOrder, imageFilter, filteringByReferenceDetail, referenceImageOrder, isReorderEnabled, imagesByIdMap]);
  
  const groupedImagesForDisplay = useMemo(() => {
    if (filteredAndSortedImages.length === 0) return [];
  
    // If filtering by a specific reference, always show as one group
    if (filteringByReferenceDetail) {
      const ref = referenceMap.get(filteringByReferenceDetail.id);
      if (!ref) return []; 
      return [{
        reference: ref,
        images: filteredAndSortedImages,
        isUnassociatedGroup: false,
        key: filteringByReferenceDetail.id
      }];
    }
  
    const finalGroups: Array<{ reference?: Reference; images: ImageFile[]; isUnassociatedGroup: boolean; key: string }> = [];
    
    // Store all images associated with a reference, keyed by referenceId
    // The images list for each reference will maintain the order from filteredAndSortedImages
    const associatedImageMap = new Map<string, { ref: Reference; images: ImageFile[] }>();
    // Store all unassociated images, maintaining their order from filteredAndSortedImages
    const unassociatedImages: ImageFile[] = [];
  
    for (const image of filteredAndSortedImages) { // filteredAndSortedImages is already sorted by date/custom order
      if (image.associatedReferenceId) {
        const ref = referenceMap.get(image.associatedReferenceId);
        if (ref) { // Ensure the reference actually exists
          if (!associatedImageMap.has(ref.id)) {
            associatedImageMap.set(ref.id, { ref, images: [] });
          }
          associatedImageMap.get(ref.id)!.images.push(image); // Images are added preserving their sorted order
        } else {
          // Image associated with a deleted/unknown ref, treat as unassociated for display
          unassociatedImages.push(image);
        }
      } else {
        unassociatedImages.push(image);
      }
    }
  
    // Add associated groups to finalGroups, ordered by the main 'references' state array
    if (imageFilter === ImageFilterType.ALL || imageFilter === ImageFilterType.ASSOCIATED) {
      references.forEach(refObj => { // Iterate through the global 'references' list from state
        const groupData = associatedImageMap.get(refObj.id);
        if (groupData && groupData.images.length > 0) {
          finalGroups.push({
            reference: groupData.ref,
            images: groupData.images, // These images are already sorted correctly relative to each other
            isUnassociatedGroup: false,
            key: groupData.ref.id,
          });
        }
      });
    }
    
    // Add the group of unassociated images at the end, if any exist and current filter allows them
    if ((imageFilter === ImageFilterType.ALL || imageFilter === ImageFilterType.UNASSOCIATED) && unassociatedImages.length > 0) {
      finalGroups.push({
        images: unassociatedImages, // Already sorted correctly relative to each other
        isUnassociatedGroup: true,
        key: 'unassociated-group'
      });
    }
    
    return finalGroups;
  
  }, [filteredAndSortedImages, references, referenceMap, filteringByReferenceDetail, imageFilter]);


  const toggleSortOrder = useCallback(() => {
    if (isReorderEnabled) {
        console.log("Custom order is active for this reference; date sort is secondary for un-ordered items.");
    }
    setImageSortOrder(prevOrder => prevOrder === SortOrder.DESC ? SortOrder.ASC : SortOrder.DESC);
  }, [isReorderEnabled]);

  const handleReferenceInputChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReferenceInput(event.target.value);
  }, []);

  const handleAddReferencesFromInput = useCallback(() => {
    const countAdded = addReferencesFromText(referenceInput);
    if (countAdded > 0) {
      setReferenceInput('');
    }
  }, [referenceInput, addReferencesFromText]);

  const handleImageSelect = useCallback((imageId: string, event: React.MouseEvent) => {
    if (isReorderEnabled) return; 

    const isShiftClick = event.shiftKey;
    // For shift-click, we need a flat list of currently *visible* images in their display order to determine range.
    // This flat list can be derived from `groupedImagesForDisplay`.
    const visibleImagesForShiftSelection = groupedImagesForDisplay.flatMap(group => group.images);


    if (isShiftClick && selectionAnchorId && visibleImagesForShiftSelection.length > 0) {
      const newSelectedIds = new Set<string>();
      const anchorIndex = visibleImagesForShiftSelection.findIndex(img => img.id === selectionAnchorId);
      const currentIndex = visibleImagesForShiftSelection.findIndex(img => img.id === imageId);

      if (anchorIndex !== -1 && currentIndex !== -1) {
        const startIndex = Math.min(anchorIndex, currentIndex);
        const endIndex = Math.max(anchorIndex, currentIndex);
        for (let i = startIndex; i <= endIndex; i++) {
          if (visibleImagesForShiftSelection[i]) {
            newSelectedIds.add(visibleImagesForShiftSelection[i].id);
          }
        }
        // Preserve existing selections if Ctrl/Cmd is also held, otherwise replace.
        // Current behavior is replace, which is fine for shift-click.
        setSelectedImageIds(newSelectedIds);
      } else { 
        // Fallback if anchor or current not found in visible list (shouldn't happen if clicking visible items)
        setSelectedImageIds(prevSelected => {
          const newSelected = new Set(prevSelected);
          if (newSelected.has(imageId)) {
            newSelected.delete(imageId);
          } else {
            newSelected.add(imageId);
          }
          return newSelected;
        });
        setSelectionAnchorId(imageId);
      }
    } else { 
      setSelectedImageIds(prevSelected => {
        const newSelected = new Set(prevSelected);
        if (newSelected.has(imageId)) {
          newSelected.delete(imageId);
        } else {
          newSelected.add(imageId);
        }
        return newSelected;
      });
      setSelectionAnchorId(imageId);
    }
  }, [selectionAnchorId, groupedImagesForDisplay, isReorderEnabled]);


  const handleUnassociateImage = useCallback((imageId: string) => {
    const imageToUpdate = imagesByIdMap.get(imageId);
    if (!imageToUpdate) return;
    const oldReferenceId = imageToUpdate.associatedReferenceId;

    setImages(prevImages => 
      prevImages.map(img => 
        img.id === imageId ? { ...img, associatedReferenceId: null, lastModified: Date.now() } : img
      )
    );

    if (oldReferenceId) {
        setReferenceImageOrder(prevOrders => {
            const newOrders = new Map(prevOrders);
            const currentOrder = newOrders.get(oldReferenceId);
            if (currentOrder) {
                const updatedOrder = currentOrder.filter(id => id !== imageId);
                if (updatedOrder.length > 0) {
                    newOrders.set(oldReferenceId, updatedOrder);
                } else {
                    newOrders.delete(oldReferenceId); 
                }
            }
            return newOrders;
        });
    }
    
    if (filteringByReferenceDetail && oldReferenceId === filteringByReferenceDetail.id) {
        const stillHasImagesForThisRef = images.some(img => 
            img.id !== imageId && img.associatedReferenceId === filteringByReferenceDetail.id
        );
        if (!stillHasImagesForThisRef) {
            setFilteringByReferenceDetail(null); 
             // If referencing mode active, default to "All Associated" if it makes sense, or "All".
            if (isReferencingModeActive) {
                const anyOtherAssociated = images.some(img => img.id !== imageId && img.associatedReferenceId);
                setImageFilter(anyOtherAssociated ? ImageFilterType.ASSOCIATED : ImageFilterType.ALL);
            } else {
                 setImageFilter(ImageFilterType.ALL);
            }
        }
    }
  }, [imagesByIdMap, images, filteringByReferenceDetail, isReferencingModeActive]); 
  
  const handleDeleteImage = useCallback((imageId: string) => {
    const imageToDelete = imagesByIdMap.get(imageId);
    if (!imageToDelete) return;
    const associatedRefId = imageToDelete.associatedReferenceId;

    setImages(prevImages => prevImages.filter(img => img.id !== imageId));
    setSelectedImageIds(prevSelected => {
      const newSelected = new Set(prevSelected);
      newSelected.delete(imageId);
      return newSelected;
    });
    if (selectionAnchorId === imageId) {
      setSelectionAnchorId(null);
    }

    if (associatedRefId) {
        setReferenceImageOrder(prevOrders => {
            const newOrders = new Map(prevOrders);
            const currentOrder = newOrders.get(associatedRefId);
            if (currentOrder) {
                const updatedOrder = currentOrder.filter(id => id !== imageId);
                 if (updatedOrder.length > 0) {
                    newOrders.set(associatedRefId, updatedOrder);
                } else {
                    newOrders.delete(associatedRefId);
                }
            }
            return newOrders;
        });
    }

    if (filteringByReferenceDetail && associatedRefId === filteringByReferenceDetail.id) {
        const stillHasImagesForThisRef = images.some(img => 
            img.id !== imageId && img.associatedReferenceId === filteringByReferenceDetail.id
        );
        if (!stillHasImagesForThisRef) {
            setFilteringByReferenceDetail(null);
             if (isReferencingModeActive) {
                const anyOtherAssociated = images.some(img => img.id !== imageId && img.associatedReferenceId);
                setImageFilter(anyOtherAssociated ? ImageFilterType.ASSOCIATED : ImageFilterType.ALL);
            } else {
                 setImageFilter(ImageFilterType.ALL);
            }
        }
    }
  }, [selectionAnchorId, images, filteringByReferenceDetail, imagesByIdMap, isReferencingModeActive]); 

  const handleDeleteReference = useCallback((referenceId: string) => {
    setReferences(prev => prev.filter(ref => ref.id !== referenceId));
    setImages(prevImages => 
      prevImages.map(img => 
        img.associatedReferenceId === referenceId ? { ...img, associatedReferenceId: null, lastModified: Date.now() } : img
      )
    );
    setReferenceImageOrder(prevOrders => {
        const newOrders = new Map(prevOrders);
        newOrders.delete(referenceId);
        return newOrders;
    });
    if (filteringByReferenceDetail?.id === referenceId) {
      setFilteringByReferenceDetail(null);
      // After deleting the currently filtered reference, switch to a sensible default filter.
      if (isReferencingModeActive) {
        const anyOtherAssociated = images.some(img => img.associatedReferenceId && img.associatedReferenceId !== referenceId);
        setImageFilter(anyOtherAssociated ? ImageFilterType.ASSOCIATED : ImageFilterType.ALL);
      } else {
        setImageFilter(ImageFilterType.ALL);
      }
    }
  }, [filteringByReferenceDetail, images, isReferencingModeActive]);


  const imageCountByReference = useMemo(() => {
    const counts = new Map<string, number>();
    images.forEach(img => {
      if (img.associatedReferenceId) {
        counts.set(img.associatedReferenceId, (counts.get(img.associatedReferenceId) || 0) + 1);
      }
    });
    return counts;
  }, [images]);

  const handleMainFilterChange = useCallback((newFilter: ImageFilterType) => {
    setImageFilter(newFilter);
    setFilteringByReferenceDetail(null); 
    if (!isReorderEnabled) { 
        setSelectedImageIds(new Set()); 
        setSelectionAnchorId(null);
    }
  }, [isReorderEnabled]);

  const handleReferenceItemClick = useCallback((referenceId: string) => {
    const refDetails = referenceMap.get(referenceId);
    if (!refDetails) return;
  
    if (selectedImageIds.size > 0 && !isReorderEnabled) { 
      const now = Date.now();
      setImages(prevImages =>
        prevImages.map(img =>
          selectedImageIds.has(img.id) ? { ...img, associatedReferenceId: referenceId, lastModified: now } : img
        )
      );
      // Update referenceImageOrder: newly associated images go to the end of the custom order for that reference.
      setReferenceImageOrder(prevOrders => {
        const newOrders = new Map(prevOrders);
        const currentOrder = newOrders.get(referenceId) || [];
        const newIdsToAdd = Array.from(selectedImageIds).filter(id => !currentOrder.includes(id));
        newOrders.set(referenceId, [...currentOrder, ...newIdsToAdd]);
        return newOrders;
      });

      setSelectedImageIds(new Set());
      setSelectionAnchorId(null);
    } else if (selectedImageIds.size === 0) { 
      if (filteringByReferenceDetail?.id === referenceId) {
        setFilteringByReferenceDetail(null); 
        // Revert to a broader filter, e.g., all associated or all files, depending on context
         if(imageFilter === ImageFilterType.ASSOCIATED) { /* No change needed if already on 'Associated' */ }
         else { setImageFilter(ImageFilterType.ASSOCIATED); } // Or ImageFilterType.ALL if preferred
      } else {
        const refAssociatedImageCount = imageCountByReference.get(referenceId) || 0;
        if (refAssociatedImageCount > 0) {
          setImageFilter(ImageFilterType.ASSOCIATED); 
          setFilteringByReferenceDetail({ id: referenceId, text: refDetails.text });
        } else {
          setFilteringByReferenceDetail(null); 
          // Optionally, show a notification that this reference has no files.
        }
      }
      setSelectedImageIds(new Set()); 
      setSelectionAnchorId(null);
    }
  }, [selectedImageIds, referenceMap, imageCountByReference, filteringByReferenceDetail, isReorderEnabled]);


  const FilterButtonComponent: React.FC<{ 
    label: string;
    type: ImageFilterType;
    currentFilter: ImageFilterType;
    onClick: (type: ImageFilterType) => void;
    isActive?: boolean; 
  }> = ({ label, type, currentFilter, onClick, isActive }) => (
    <button
      onClick={() => onClick(type)}
      className={`px-3 py-1.5 text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-opacity-75 ${
        (isActive === undefined ? currentFilter === type : isActive) && !filteringByReferenceDetail 
        ? 'bg-slate-700 text-white focus:ring-slate-500'
        : (isActive && filteringByReferenceDetail && type === ImageFilterType.ASSOCIATED) 
        ? 'bg-slate-700 text-white focus:ring-slate-500' 
        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-400'
      }`}
      aria-pressed={isActive === undefined ? currentFilter === type : isActive}
    >
      {label}
    </button>
  );
  
  const getCurrentViewTitle = () => {
    const count = filteredAndSortedImages.length; // This count is correct for the overall filter
    if (filteringByReferenceDetail && imageFilter === ImageFilterType.ASSOCIATED) {
        return `Files for: ${filteringByReferenceDetail.text}`;
    }
    if (!isReferencingModeActive || isReferencesPanelCollapsed) {
        if (filteringByReferenceDetail && imageFilter === ImageFilterType.ASSOCIATED) {
             return `Files for: ${filteringByReferenceDetail.text}`;
        }
        return "All Files"; 
    }

    switch (imageFilter) {
        case ImageFilterType.ALL: return "All Files"; 
        case ImageFilterType.ASSOCIATED: return "All Associated Files"; 
        case ImageFilterType.UNASSOCIATED: return "All Unassociated Files"; 
        default: return "Current View";
    }
  }

  const handleImageDragStart = useCallback((event: ReactDragEvent<HTMLDivElement>, imageId: string) => {
    if (!isReorderEnabled) return;
    event.dataTransfer.setData('application/vnd.file-id', imageId); 
    event.dataTransfer.effectAllowed = 'move';
    setDraggedImageId(imageId);
  }, [isReorderEnabled]);

  const handleImageDrop = useCallback((event: ReactDragEvent<HTMLDivElement>, targetImageId: string) => {
    if (!isReorderEnabled || !filteringByReferenceDetail || !draggedImageId) return;
    event.preventDefault();
    const currentDraggedImageId = event.dataTransfer.getData('application/vnd.file-id') || draggedImageId; 


    if (!currentDraggedImageId || currentDraggedImageId === targetImageId) {
      setDraggedImageId(null);
      return;
    }

    setReferenceImageOrder(prevOrders => {
      const newOrders = new Map(prevOrders);
      const refId = filteringByReferenceDetail.id;
      
      // Get the current full list of images for this reference, sorted by date/previous custom order
      // This uses `filteredAndSortedImages` which already reflects the current visual order if custom sort is active.
      const imagesCurrentlyVisibleForRef = filteredAndSortedImages
                                        .filter(img => img.associatedReferenceId === refId)
                                        .map(img => img.id);

      // Use current visible order as the base if no specific order exists yet, or if it's more up-to-date.
      let currentOrderForRef = newOrders.get(refId) || imagesCurrentlyVisibleForRef;
      
      // Ensure currentOrderForRef only contains valid image IDs for this reference.
      currentOrderForRef = currentOrderForRef.filter(id => {
          const img = imagesByIdMap.get(id);
          return img && img.associatedReferenceId === refId;
      });


      const draggedImageObject = imagesByIdMap.get(currentDraggedImageId);
      if (!draggedImageObject || draggedImageObject.associatedReferenceId !== refId) {
        setDraggedImageId(null); // Should not happen if drag started correctly
        return prevOrders; 
      }

      let reorderedIds = [...currentOrderForRef];
      const draggedItemIndex = reorderedIds.indexOf(currentDraggedImageId);

      if (draggedItemIndex > -1) {
        reorderedIds.splice(draggedItemIndex, 1); // Remove dragged item from its old position
      } else {
        // If dragged item wasn't in currentOrderForRef (e.g. new item not yet in custom order), it's fine, will be inserted.
      }
      
      const targetItemIndex = reorderedIds.indexOf(targetImageId);

      if (targetItemIndex !== -1) { 
        // Insert before the target.
        reorderedIds.splice(targetItemIndex, 0, currentDraggedImageId); 
      } else {
        // Target not in current order? This might happen if `currentOrderForRef` was stale or target is new.
        // Fallback: try to find target in the `imagesCurrentlyVisibleForRef` and insert relative to that.
        const visibleTargetIdx = imagesCurrentlyVisibleForRef.indexOf(targetImageId);
        if (visibleTargetIdx !== -1) {
            // Find where to insert in `reorderedIds` to match `visibleTargetIdx`
            let inserted = false;
            for (let i = 0; i < reorderedIds.length; i++) {
                if (imagesCurrentlyVisibleForRef.indexOf(reorderedIds[i]) >= visibleTargetIdx) {
                    reorderedIds.splice(i, 0, currentDraggedImageId);
                    inserted = true;
                    break;
                }
            }
            if (!inserted) reorderedIds.push(currentDraggedImageId); // Add to end if no suitable place found
        } else {
             // If target is completely unknown (shouldn't happen for a drop target), add to end.
            reorderedIds.push(currentDraggedImageId);
        }
      }
      
      // Ensure all items in the final order are unique and actually belong to this reference
      const finalUniqueIdsForRef = Array.from(new Set(reorderedIds))
                                     .filter(id => {
                                         const img = imagesByIdMap.get(id);
                                         return img && img.associatedReferenceId === refId;
                                     });

      if (finalUniqueIdsForRef.length > 0) {
        newOrders.set(refId, finalUniqueIdsForRef);
      } else {
        newOrders.delete(refId); // Should not happen if we just reordered items within it.
      }
      return newOrders;
    });
    setDraggedImageId(null);
  }, [isReorderEnabled, filteringByReferenceDetail, filteredAndSortedImages, imagesByIdMap, draggedImageId]);

  const handleActualDragEndFromItem = useCallback(() => {
    setDraggedImageId(null);
  }, []);

  const getReferencePreviewImageUrl = useCallback((referenceId: string): string | null => {
    const customOrder = referenceImageOrder.get(referenceId);
    if (customOrder && customOrder.length > 0) {
      const firstImageId = customOrder[0];
      const image = imagesByIdMap.get(firstImageId);
      if (image && image.associatedReferenceId === referenceId && image.dataUrl && image.type.startsWith('image/')) {
        return image.dataUrl;
      }
    }

    // Find the first web-renderable image in sorted order
    const associatedFiles = images
      .filter(img => img.associatedReferenceId === referenceId)
      .sort((a, b) => b.lastModified - a.lastModified);
      
    for (const file of associatedFiles) {
        if (file.dataUrl && file.type.startsWith('image/')) {
            return file.dataUrl;
        }
    }
    return null;
  }, [images, referenceImageOrder, imagesByIdMap]);

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      processFileListAndSetImages(event.target.files);
      event.target.value = ''; // Reset file input
    }
  };

  const showGallerySubtitle = !(images.length === 0 && !filteringByReferenceDetail); 

  const handleSessionSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSessionSearchTerm(event.target.value);
    setLoadedSessionNameForShare(null);
  };

  const handleLoadSessionFromListItem = (sessionId: string) => {
    const refsFromSession = mockSessionReferences[sessionId];
    if (refsFromSession && refsFromSession.length > 0) {
      addReferencesFromText(refsFromSession.join(', '));
    }
    const loadedSession = mockSessions.find(s => s.id === sessionId);
    setLoadedSessionNameForShare(loadedSession ? loadedSession.name : null);
    setSessionSearchTerm('');
    setIsSessionListVisible(false);
  };
  

  const filteredMockSessions = useMemo(() => {
    if (!sessionSearchTerm.trim()) return mockSessions;
    return mockSessions.filter(session =>
      session.name.toLowerCase().includes(sessionSearchTerm.toLowerCase())
    );
  }, [sessionSearchTerm]);

  useEffect(() => {
    const handleClickOutsideSessionList = (event: MouseEvent) => {
      if (sessionLoadContainerRef.current && !sessionLoadContainerRef.current.contains(event.target as Node)) {
        setIsSessionListVisible(false);
      }
    };

    if (isSessionListVisible) {
      document.addEventListener('mousedown', handleClickOutsideSessionList);
    } else {
      document.removeEventListener('mousedown', handleClickOutsideSessionList);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutsideSessionList);
    };
  }, [isSessionListVisible]);

  useEffect(() => {
    const handleClickOutsideActionsMenu = (event: MouseEvent) => {
        if (
            actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node) &&
            actionsButtonRef.current && !actionsButtonRef.current.contains(event.target as Node)
        ) {
            setIsActionsMenuOpen(false);
        }
    };

    if (isActionsMenuOpen) {
        document.addEventListener('mousedown', handleClickOutsideActionsMenu);
    } else {
        document.removeEventListener('mousedown', handleClickOutsideActionsMenu);
    }

    return () => {
        document.removeEventListener('mousedown', handleClickOutsideActionsMenu);
    };
  }, [isActionsMenuOpen]);

  useEffect(() => {
    if (isReferenceInputAreaCollapsed) {
      setIsSessionListVisible(false);
    }
  }, [isReferenceInputAreaCollapsed]);

  const showAppNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleOpenShareModal = () => {
    setIsShareModalOpen(true);
    setIsActionsMenuOpen(false);
  };

  const handleCloseShareModal = () => {
    setIsShareModalOpen(false);
  };

  const handleConfirmShare = async (sessionName: string, shareType: 'copyLink' | 'sendToRetouch', assignee?: string, step?: string) => {
    if (shareType === 'copyLink') {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showAppNotification(`Link copied for session: ${sessionName}!`);
      } catch (err) {
        console.error('Failed to copy URL: ', err);
        showAppNotification('Failed to copy URL.', 'error');
      }
    } else if (shareType === 'sendToRetouch') {
      if (step) { // Assignee is optional
        console.log(`Sending session "${sessionName}" to ${assignee || 'Unassigned'} for retouch (Step: ${step}).`);
        showAppNotification(`Session "${sessionName}" sent for step: ${step}${assignee ? ` to ${assignee}` : ''}.`);
      } else {
         showAppNotification('A step is required for sending to retouch.', 'error');
      }
    }
    handleCloseShareModal();
  };

  const showReferencesPanelFull = isReferencingModeActive && !isReferencesPanelCollapsed;

  useEffect(() => {
    if (!isReferencingModeActive) {
        if (imageFilter !== ImageFilterType.ALL || filteringByReferenceDetail) {
            setImageFilter(ImageFilterType.ALL);
            setFilteringByReferenceDetail(null);
            setSelectedImageIds(new Set());
            setSelectionAnchorId(null);
        }
    }
  }, [isReferencingModeActive]);


  if (showDropZoneOverlay) {
    return (
      <div className="fixed inset-0 bg-blue-600 bg-opacity-90 flex items-center justify-center z-[9999] p-4">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white animate-pulse text-center">
          {currentDropPhrase}
        </h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col text-gray-800 bg-white">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-800">Drop Flow</h1>
          <div className="relative">
            <button
              id="actions-button"
              ref={actionsButtonRef}
              onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
              className="flex items-center bg-slate-700 hover:bg-slate-800 text-white font-medium py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-opacity-50 text-sm"
              aria-haspopup="true"
              aria-expanded={isActionsMenuOpen}
              aria-controls="actions-menu"
              title="Open actions menu"
            >
              Actions
              <ChevronDownIcon className={`w-4 h-4 ml-2 transition-transform duration-200 ${isActionsMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {isActionsMenuOpen && (
              <div
                id="actions-menu"
                ref={actionsMenuRef}
                className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-sm border border-gray-200 py-1 z-50"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="actions-button"
              >
                <button
                  onClick={handleOpenShareModal}
                  className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:outline-none"
                  role="menuitem"
                  title="Share this session"
                >
                  <ArrowUpOnSquareIcon className="w-4 h-4 mr-3 text-gray-500" />
                  Share
                </button>
                <button
                  onClick={() => { console.log('Publish clicked'); setIsActionsMenuOpen(false); showAppNotification('Publish action triggered (dev).') }}
                  disabled={!areAnyImagesAssociated}
                  className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  role="menuitem"
                  title={!areAnyImagesAssociated ? "Associate files to references to enable Publish" : "Publish content"}
                >
                  <CloudArrowUpIcon className="w-4 h-4 mr-3 text-gray-500" />
                  Publish
                </button>
                <div role="separator" className="my-1 h-px bg-gray-200"></div>
                <button
                  onClick={() => {
                    const newModeActive = !isReferencingModeActive;
                    setIsReferencingModeActive(newModeActive);
                    if (!newModeActive) { 
                      setIsReferencesPanelCollapsed(false); 
                    }
                    setIsActionsMenuOpen(false);
                  }}
                  className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:outline-none"
                  role="menuitem"
                  title={isReferencingModeActive ? "Deactivate Referencing Mode" : "Activate Referencing Mode"}
                >
                  <LinkIcon className="w-4 h-4 mr-3 text-gray-500" />
                  {isReferencingModeActive ? "Deactivate Referencing" : "Activate Referencing"}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-grow flex flex-col md:flex-row p-4 gap-4">
        <section className={`flex flex-col transition-all duration-300 ease-in-out ${showReferencesPanelFull ? 'md:w-2/3' : 'w-full'}`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              File Gallery
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleUploadButtonClick}
                className="flex items-center bg-slate-700 hover:bg-slate-800 text-white font-medium py-2 px-3 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-opacity-50 text-sm"
                title="Upload files"
              >
                <UploadIcon className="w-4 h-4 mr-2" />
                Upload Files
              </button>
            </div>
          </div>
          <input 
            type="file" 
            multiple 
            ref={fileInputRef} 
            onChange={handleFileInputChange} 
            className="hidden" 
            id="hidden-file-input"
            aria-hidden="true"
          />
          
          <div className="space-y-3">
             {showGallerySubtitle && (
              <div>
                  <h3 className="text-lg font-medium text-gray-700">
                    {getCurrentViewTitle()} ({filteredAndSortedImages.length})
                    {!isReorderEnabled && selectedImageIds.size > 0 && 
                      ` - ${selectedImageIds.size} selected (${
                        // Count how many of the globally selected IDs are visible in the current (potentially grouped) view
                        Array.from(selectedImageIds).filter(id => 
                          groupedImagesForDisplay.some(group => group.images.some(img => img.id === id))
                        ).length
                      } visible)`
                    }
                  </h3>
                  {isReorderEnabled && (
                      <p className="text-xs text-blue-600">Drag & drop to reorder files for this reference.</p>
                  )}
                </div>
             )}
           
            <div className="flex items-center space-x-2 pt-1 flex-wrap">
              {showReferencesPanelFull && (
                <>
                  <span className="text-sm font-medium text-gray-600 whitespace-nowrap mr-2">Filter by status:</span>
                  <FilterButtonComponent label="All" type={ImageFilterType.ALL} currentFilter={imageFilter} onClick={handleMainFilterChange} />
                  <FilterButtonComponent 
                    label="Associated" 
                    type={ImageFilterType.ASSOCIATED} 
                    currentFilter={imageFilter} 
                    onClick={handleMainFilterChange}
                    isActive={imageFilter === ImageFilterType.ASSOCIATED} 
                  />
                  <FilterButtonComponent label="Unassociated" type={ImageFilterType.UNASSOCIATED} currentFilter={imageFilter} onClick={handleMainFilterChange} />
                  {filteringByReferenceDetail && imageFilter === ImageFilterType.ASSOCIATED && (
                    <button 
                      onClick={() => {
                          setFilteringByReferenceDetail(null); 
                           // After clearing specific ref filter, remain on "Associated" if there are any associated items.
                           // Or switch to "All" if no associated items left / preferred.
                           if (images.some(img => img.associatedReferenceId)) {
                               setImageFilter(ImageFilterType.ASSOCIATED);
                           } else {
                               setImageFilter(ImageFilterType.ALL);
                           }
                      }}
                      className="ml-2 flex items-center px-2 py-1 text-xs rounded-md transition-colors bg-red-100 hover:bg-red-200 text-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-opacity-50"
                      title={`Clear filter for '${filteringByReferenceDetail.text}' and show all associated files`}
                    >
                      <XCircleIcon className="w-4 h-4 mr-1"/>
                      <span className="truncate max-w-xs">Clear: {filteringByReferenceDetail.text}</span>
                    </button>
                  )}
                </>
              )}
               {images.length > 0 && (
                <div className="ml-auto"> 
                    <button
                    onClick={toggleSortOrder}
                    className={`flex items-center px-3 py-1.5 text-sm rounded-md transition-colors h-fit
                                ${isReorderEnabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-70' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                    title={isReorderEnabled ? "Custom order active; date sort applies to un-ordered items or other views" : `Sort by date ${imageSortOrder === SortOrder.DESC ? 'oldest first' : 'newest first'}`}
                    disabled={isReorderEnabled}
                    aria-disabled={isReorderEnabled}
                    >
                    {imageSortOrder === SortOrder.DESC ? <SortDescIcon className="mr-1.5 w-4 h-4"/> : <SortAscIcon className="mr-1.5 w-4 h-4" />}
                    Date ({imageSortOrder === SortOrder.DESC ? 'Newest' : 'Oldest'})
                    </button>
                </div>
               )}
            </div>
          </div>
          
          <hr className="border-t border-gray-200 my-4" />

          {groupedImagesForDisplay.length === 0 ? (
            <p className="text-center text-gray-500 py-8 flex-grow flex items-center justify-center">
              {images.length > 0 
                ? (filteringByReferenceDetail 
                    ? `No files found for reference: "${filteringByReferenceDetail.text}".` 
                    : (isReferencingModeActive && !isReferencesPanelCollapsed && imageFilter !== ImageFilterType.ALL)
                        ? 'No files match the current status filter.'
                        : 'No files found for the current view.'
                  )
                : 'No files uploaded yet. Click "Upload Files" or drag and drop files onto the page.'
              }
            </p>
          ) : (
            <div>
              {groupedImagesForDisplay.map((group, groupIndex) => (
                <div 
                  key={group.key} 
                  className={`${groupIndex > 0 && group.isUnassociatedGroup ? "mt-6 pt-2" : "" } 
                              ${groupIndex > 0 && !group.isUnassociatedGroup && group.reference && !groupedImagesForDisplay[groupIndex-1].isUnassociatedGroup ? "" : ""}`}
                >
                  {group.reference && !filteringByReferenceDetail && (
                    <h4 className="text-md font-semibold text-gray-700 mb-3 bg-gray-50 py-1.5 px-2 rounded-md">
                      Reference: {group.reference.text} ({group.images.length})
                    </h4>
                  )}
                  <div className="flex flex-wrap justify-left gap-4 py-2"> 
                    {group.images.map(image => (
                      <div key={image.id} className="relative group">
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
                        />
                        {!isReorderEnabled && 
                          <button 
                            onClick={() => handleDeleteImage(image.id)}
                            className="absolute top-1.5 left-1.5 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:ring-2 focus:ring-offset-1 focus:ring-red-500 z-20"
                            title="Delete file"
                            aria-label={`Delete file ${image.name}`}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        }
                      </div>
                    ))}
                  </div>
                  
                  {/* Separator logic: Add after an associated group if it's not the absolute last group in the display */}
                  {!group.isUnassociatedGroup && 
                   !filteringByReferenceDetail && 
                   groupIndex < groupedImagesForDisplay.length - 1 && (
                    <hr className="my-6 border-t-2 border-gray-200" />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section
          id="references-panel"
          className={`md:sticky md:top-20 md:h-[calc(100vh-8rem)] transition-all duration-300 ease-in-out flex flex-col bg-white
                      ${isReferencingModeActive
                          ? (isReferencesPanelCollapsed
                              ? 'md:w-[52px] p-3 md:border-l md:border-gray-200' 
                              : 'md:w-1/3 p-4 md:pl-6 md:border-l md:border-gray-200') 
                          : 'md:w-0 p-0 border-none opacity-0 pointer-events-none overflow-hidden' 
                      }`}
          aria-hidden={!isReferencingModeActive}
        >
          {isReferencingModeActive && (
            <>
              <div className={`flex justify-between items-center mb-4 ${isReferencesPanelCollapsed ? 'hidden' : ''}`}>
                <h2 className="text-xl font-semibold text-gray-800">References</h2>
                <div className="flex items-center space-x-1">
                    <button 
                        onClick={() => setIsReferencesPanelCollapsed(true)}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                        title="Collapse References Panel"
                        aria-expanded="true"
                        aria-controls="references-panel-content"
                    >
                        <ChevronDoubleRightIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => {
                        setIsReferencingModeActive(false);
                        setIsReferencesPanelCollapsed(false); 
                        }}
                        className="p-1.5 rounded-full hover:bg-red-100 text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                        title="Close References Panel (Exit Referencing Mode)"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
              </div>

              {isReferencesPanelCollapsed && (
                <div className="flex justify-center items-center h-full">
                    <button
                        onClick={() => setIsReferencesPanelCollapsed(false)}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                        title="Show References Panel"
                        aria-expanded="false"
                        aria-controls="references-panel-content"
                    >
                        <ChevronDoubleLeftIcon className="w-6 h-6" />
                    </button>
                </div>
              )}

              <div id="references-panel-content" className={`flex-grow flex flex-col min-h-0 overflow-y-auto ${isReferencesPanelCollapsed ? 'hidden' : ''}`}>
                  <div className="mb-4"> 
                      <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-semibold text-gray-700">
                              {referenceAddMode === 'manual' ? 'Add References Manually' : 'Load References from Session'}
                          </h3>
                          <button
                              onClick={() => setIsReferenceInputAreaCollapsed(!isReferenceInputAreaCollapsed)}
                              className="p-1 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-300"
                              title={isReferenceInputAreaCollapsed ? 'Show input area' : 'Hide input area'}
                              aria-expanded={!isReferenceInputAreaCollapsed}
                              aria-controls="reference-input-collapsible-area"
                          >
                              {isReferenceInputAreaCollapsed ? <ChevronDownIcon className="w-5 h-5" /> : <ChevronUpIcon className="w-5 h-5" />}
                          </button>
                      </div>
                      <div
                          id="reference-input-collapsible-area"
                          className={`transition-all duration-300 ease-in-out ${
                              isReferenceInputAreaCollapsed 
                                ? 'max-h-0 opacity-0 overflow-hidden' 
                                : 'max-h-[500px] opacity-100 overflow-visible' 
                          }`}
                      >
                          {referenceAddMode === 'manual' && (
                          <div>
                              <div className="mb-3">
                              <textarea
                                  id="reference-input"
                                  rows={2}
                                  value={referenceInput}
                                  onChange={handleReferenceInputChange}
                                  placeholder="e.g., Ref001, Item ABC, Project X"
                                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              />
                              <button
                                  onClick={handleAddReferencesFromInput}
                                  className="mt-2 w-full bg-slate-700 hover:bg-slate-800 text-white font-medium py-2 px-3 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-opacity-50 text-sm"
                              >
                                  Add Manually
                              </button>
                              </div>
                              <div className="my-3 flex items-center">
                              <hr className="flex-grow border-t border-gray-300" />
                              <span className="mx-3 text-xs text-gray-400 font-medium">OR</span>
                              <hr className="flex-grow border-t border-gray-300" />
                              </div>
                              <button
                              onClick={() => {
                                  setReferenceAddMode('session');
                                  setReferenceInput(''); 
                                  setLoadedSessionNameForShare(null);
                              }}
                              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 text-sm border border-gray-300"
                              >
                              Switch to Load from Session
                              </button>
                          </div>
                          )}

                          {referenceAddMode === 'session' && (
                          <div ref={sessionLoadContainerRef}>
                              <div className="mb-3 relative">
                              <input
                                  type="text"
                                  id="session-search-input"
                                  placeholder="Search sessions..."
                                  value={sessionSearchTerm}
                                  onChange={handleSessionSearchChange}
                                  onFocus={() => !isReferenceInputAreaCollapsed && setIsSessionListVisible(true)}
                                  onClick={() => !isReferenceInputAreaCollapsed && setIsSessionListVisible(true)}
                                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm mb-2"
                                  aria-haspopup="listbox"
                                  aria-expanded={isSessionListVisible && !isReferenceInputAreaCollapsed}
                                  disabled={isReferenceInputAreaCollapsed}
                              />
                              {isSessionListVisible && !isReferenceInputAreaCollapsed && mockSessions.length > 0 && (
                                  <div 
                                  className="absolute z-10 w-full mt-1 max-h-96 overflow-y-auto border border-gray-300 rounded-md bg-white shadow-sm p-1 space-y-1"
                                  role="listbox"
                                  id="session-listbox"
                                  >
                                  {filteredMockSessions.length > 0 ? (
                                      filteredMockSessions.map(session => (
                                      <button
                                          key={session.id}
                                          role="option"
                                          onClick={() => handleLoadSessionFromListItem(session.id)}
                                          disabled={isReferenceInputAreaCollapsed}
                                          className={`w-full text-left p-1.5 rounded-md text-sm transition-colors text-gray-700 hover:bg-blue-50
                                                      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
                                          title={`Load session: ${session.name}`}
                                      >
                                          {session.name}
                                      </button>
                                      ))
                                  ) : (
                                      <p className="p-1.5 text-sm text-gray-500 text-center">No sessions match your search.</p>
                                  )}
                                  </div>
                              )}
                              </div>
                              <div className="my-3 flex items-center">
                              <hr className="flex-grow border-t border-gray-300" />
                              <span className="mx-3 text-xs text-gray-400 font-medium">OR</span>
                              <hr className="flex-grow border-t border-gray-300" />
                              </div>
                              <button
                              onClick={() => {
                                  setReferenceAddMode('manual');
                                  setSessionSearchTerm('');
                                  setIsSessionListVisible(false);
                                  setLoadedSessionNameForShare(null);
                              }}
                              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 text-sm border border-gray-300"
                              disabled={isReferenceInputAreaCollapsed}
                              >
                              Switch to Add Manually
                              </button>
                          </div>
                          )}
                      </div>
                  </div>
                  
                  <hr className="my-4 border-t border-gray-200" />


                  <div className="flex-grow flex flex-col min-h-0">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-medium text-gray-700">
                                Available References ({references.length})
                                {!isReorderEnabled && selectedImageIds.size > 0 && (
                                    <span className="text-sm text-blue-600 font-normal"> - Click to associate {selectedImageIds.size} file(s)</span>
                                )}
                                {!isReorderEnabled && selectedImageIds.size === 0 && references.length > 0 && imageCountByReference.size > 0 && (
                                    <span className="text-sm text-gray-500 font-normal"> - Click a reference with files to filter</span>
                                )}
                                {isReorderEnabled && (
                                    <span className="text-sm text-blue-500 font-normal"> - Reordering active for current reference</span>
                                )}
                            </h3>
                            <div className="flex items-center space-x-1">
                                <button
                                    onClick={() => setReferenceViewMode('list')}
                                    className={`p-1.5 rounded-md text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300
                                                ${referenceViewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                                    title="List View"
                                    aria-pressed={referenceViewMode === 'list'}
                                >
                                    <ListBulletIcon className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setReferenceViewMode('grid')}
                                    className={`p-1.5 rounded-md text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300
                                                ${referenceViewMode === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                                    title="Grid View"
                                    aria-pressed={referenceViewMode === 'grid'}
                                >
                                    <Squares2X2Icon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                      {references.length === 0 ? (
                      <p className="text-center text-gray-500 py-8 flex-grow flex items-center justify-center">
                          {'No references added yet. Use a method above.'}
                      </p>
                      ) : (
                        <div className={`flex-grow overflow-y-auto pr-1 pb-1 ${
                            referenceViewMode === 'grid' 
                            ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-3' 
                            : 'flex flex-col space-y-2'
                        }`}>
                            {references.map(ref => (
                                <ReferenceItem
                                key={ref.id}
                                reference={ref}
                                associatedImageCount={imageCountByReference.get(ref.id) || 0}
                                onSelect={handleReferenceItemClick} 
                                canAssociate={!isReorderEnabled && selectedImageIds.size > 0}
                                isFilterTarget={filteringByReferenceDetail?.id === ref.id}
                                previewImageUrl={getReferencePreviewImageUrl(ref.id)}
                                viewMode={referenceViewMode}
                                onDelete={handleDeleteReference}
                                />
                            ))}
                        </div>
                      )}
                  </div>
              </div> 
            </>
          )}
        </section>
      </main>

      {isShareModalOpen && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={handleCloseShareModal}
          initialSessionName={loadedSessionNameForShare}
          onConfirmShare={handleConfirmShare}
        />
      )}

      {notification && (
        <div 
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-md shadow-lg text-white text-sm z-[10000]
                      ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
          role="alert"
          aria-live="assertive"
        >
          {notification.message}
        </div>
      )}
    </div>
  );
};

export default App;
