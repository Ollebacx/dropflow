
import React, { useState, DragEvent } from 'react';
import { ImageFile, Reference } from '../types';
import { CheckCircleIcon, LinkIcon, XCircleIcon, DocumentIcon } from '../constants';

interface ImageGridItemProps {
  image: ImageFile;
  isSelected: boolean;
  associatedReference: Reference | null;
  onSelect: (imageId: string, event: React.MouseEvent) => void;
  onUnassociate: (imageId: string) => void;
  isDraggable?: boolean;
  draggedImageId?: string | null; 
  onDragStartImage?: (event: DragEvent<HTMLDivElement>, imageId: string) => void;
  onDropOnImage?: (event: DragEvent<HTMLDivElement>, targetImageId: string) => void;
  onActualDragEnd?: () => void; 
}

const ImageGridItem: React.FC<ImageGridItemProps> = React.memo(({ 
  image, 
  isSelected, 
  associatedReference, 
  onSelect, 
  onUnassociate,
  isDraggable = false,
  draggedImageId,
  onDragStartImage,
  onDropOnImage,
  onActualDragEnd,
}) => {
  const [showDropIndicator, setShowDropIndicator] = useState(false);

  const handleImageClick = (event: React.MouseEvent) => {
    onSelect(image.id, event);
  };

  const handleUnassociateClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    onUnassociate(image.id);
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    if (isDraggable && onDragStartImage) {
      onDragStartImage(event, image.id);
      event.currentTarget.style.opacity = '0.6';
    }
  };

  const handleDragEnd = (event: DragEvent<HTMLDivElement>) => {
    if (isDraggable) {
        event.currentTarget.style.opacity = '1';
    }
    onActualDragEnd?.(); 
    setShowDropIndicator(false); 
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (isDraggable && draggedImageId && draggedImageId !== image.id) {
      event.preventDefault(); 
      setShowDropIndicator(true);
    }
  };
  
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (isDraggable && draggedImageId && draggedImageId !== image.id) {
      event.preventDefault(); 
      event.dataTransfer.dropEffect = 'move';
      setShowDropIndicator(true); 
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (isDraggable && draggedImageId && draggedImageId !== image.id) {
      if (event.currentTarget.contains(event.relatedTarget as Node)) {
        return; 
      }
      setShowDropIndicator(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (isDraggable && onDropOnImage && draggedImageId && draggedImageId !== image.id) {
      event.preventDefault();
      onDropOnImage(event, image.id);
    }
    setShowDropIndicator(false); 
  };
  
  const baseClasses = "w-[210px] h-[380px] relative group rounded-lg overflow-hidden transition-all duration-200 ease-out flex flex-col shadow-sm"; // Use a very subtle shadow for depth
  const cursorClasses = isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer';
  
  let ringClasses = '';
  if (isSelected && !isDraggable) {
    ringClasses = 'ring-2 ring-offset-0 ring-blue-500'; 
  }

  let hoverEffectClasses = 'hover:shadow-md'; // Slightly increase shadow on hover
  if (isDraggable) hoverEffectClasses = ''; 

  if (showDropIndicator && isDraggable && draggedImageId && draggedImageId !== image.id) {
    ringClasses = 'ring-2 ring-blue-500'; 
    hoverEffectClasses = ''; 
  }

  const canDisplayPreview = image.dataUrl && image.type.startsWith('image/');
  const fileExtension = image.name.split('.').pop()?.toUpperCase() || 'FILE';


  return (
    <div
      onClick={handleImageClick}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`${baseClasses} ${cursorClasses} ${ringClasses} ${hoverEffectClasses}`}
      title={isDraggable ? `Drag to reorder: ${image.name}` : `Click to select/deselect. Name: ${image.name}. Last modified: ${new Date(image.lastModified).toLocaleDateString()}`}
      role={isDraggable ? "listitem" : "button"}
      aria-pressed={!isDraggable && isSelected}
      aria-label={`File: ${image.name}${associatedReference ? `, Associated with: ${associatedReference.text}` : ''}`}
    >
      <div className="flex-grow relative overflow-hidden rounded-t-lg bg-gray-50"> {/* Ensure image respects rounded corners and provide a default bg */}
        {canDisplayPreview ? (
            <img src={image.dataUrl} alt={image.name} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
        ) : (
            <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-2 text-gray-500 pointer-events-none">
                <DocumentIcon className="w-16 h-16 mb-2 opacity-70 flex-shrink-0" />
                <p className="text-sm font-semibold text-gray-600 text-center break-all leading-tight" title={image.name}>
                    {fileExtension}
                </p>
            </div>
        )}
        {isSelected && !isDraggable && (
          <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1 z-10" aria-hidden="true">
            <CheckCircleIcon className="w-5 h-5" />
          </div>
        )}
      </div>
      
      <div className="p-3 border-t border-gray-100 bg-white rounded-b-lg">
        <p className="text-sm font-medium text-gray-800 truncate" title={image.name}>{image.name}</p>
        <p className="text-xs text-gray-500">{new Date(image.lastModified).toLocaleDateString()}</p>
        {associatedReference && (
          <div className="mt-2 flex items-center text-xs bg-green-50 text-green-700 px-2 py-1 rounded-md border border-green-200">
            <LinkIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
            <span className="truncate flex-grow" title={`Associated with: ${associatedReference.text}`}>
              {associatedReference.text}
            </span>
            {!isDraggable && (
            <button 
              onClick={handleUnassociateClick} 
              className="ml-1 p-0.5 rounded-full hover:bg-green-100 text-green-600 hover:text-green-800 focus:outline-none focus:ring-1 focus:ring-green-400"
              title="Unassociate this file"
              aria-label={`Unassociate file ${image.name} from reference ${associatedReference.text}`}
            >
              <XCircleIcon className="w-4 h-4"/>
            </button>
            )}
          </div>
        )}
      </div>
       {isDraggable && (
        <div className="absolute top-1.5 right-1.5 bg-gray-500 bg-opacity-60 text-white p-0.5 rounded-full z-10" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
          </svg>
        </div>
      )}
    </div>
  );
});

export default ImageGridItem;