
import React from 'react';
import { Reference } from '../types';
import { LinkIcon, TrashIcon } from '../constants';

interface ReferenceItemProps {
  reference: Reference;
  associatedImageCount: number;
  onSelect: (referenceId: string) => void;
  canAssociate: boolean;
  isFilterTarget: boolean;
  previewImageUrl?: string | null;
  viewMode: 'list' | 'grid';
  onDelete: (referenceId: string) => void;
}

const ReferenceItem: React.FC<ReferenceItemProps> = React.memo(({ 
  reference, 
  associatedImageCount, 
  onSelect, 
  canAssociate,
  isFilterTarget,
  previewImageUrl,
  viewMode,
  onDelete,
}) => {
  
  const handleSelect = () => {
    onSelect(reference.id);
  };

  const handleLocalDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(reference.id);
  }

  let itemTitle = reference.text;
  if (canAssociate) {
    itemTitle = `Click to associate selected images with "${reference.text}"`;
  } else if (!canAssociate && associatedImageCount > 0) { // Simplified condition, canBeFilterTrigger logic
    itemTitle = `Click to show images associated with "${reference.text}" (${associatedImageCount})`;
  } else if (associatedImageCount > 0) {
    itemTitle = `Reference "${reference.text}" has ${associatedImageCount} associated image(s). Select images to associate or click to filter.`;
  }


  let stateClasses = ""; 
  if (isFilterTarget) {
    stateClasses = 'ring-2 ring-offset-0 ring-blue-500';
  }

  const canBeClickedForAction = canAssociate || (!canAssociate && associatedImageCount > 0);

  if (canAssociate) {
    stateClasses += ' hover:bg-blue-50 cursor-pointer';
  } else if (!canAssociate && associatedImageCount > 0) { // Click to filter
    stateClasses += ' hover:bg-gray-50 cursor-pointer';
  } else { // No action on click, just info
    stateClasses += ' cursor-default';
  }
  
  const commonDivProps = {
    title: itemTitle,
    role: "button" as React.ButtonHTMLAttributes<HTMLDivElement>['role'],
    "aria-pressed": isFilterTarget,
    tabIndex: canBeClickedForAction ? 0 : -1,
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => { if (e.key === 'Enter' || e.key === ' ') { if (canBeClickedForAction) handleSelect(); }},
    onClick: canBeClickedForAction ? handleSelect : undefined,
  };

  if (viewMode === 'list') {
    return (
      <div
        {...commonDivProps}
        className={`group relative w-full transition-all duration-150 ease-in-out flex items-center p-2 space-x-3 bg-white border border-gray-200 hover:shadow-sm ${stateClasses}`}
      >
        {previewImageUrl ? (
          <img 
            src={previewImageUrl} 
            alt={`Preview for ${reference.text}`} 
            className="w-14 h-14 object-cover flex-shrink-0 pointer-events-none"
          />
        ) : (
          <div className="w-14 h-14 bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-gray-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
        )}
        <div className="flex-grow min-w-0">
          <span className="text-sm text-gray-800 truncate block" title={reference.text}>{reference.text}</span>
          {associatedImageCount > 0 && (
            <div className={`flex items-center text-xs mt-0.5 ${isFilterTarget ? 'text-blue-600' : 'text-green-600'}`}>
              <LinkIcon className="w-3 h-3 mr-1 flex-shrink-0" />
              <span>{associatedImageCount}</span>
            </div>
          )}
        </div>
        <button 
          onClick={handleLocalDelete}
          className="ml-2 p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:ring-1 focus:ring-red-300 hover:bg-red-50 flex-shrink-0"
          title={`Delete reference: ${reference.text}`}
          aria-label={`Delete reference ${reference.text}`}
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Grid View (default)
  let baseClasses = "transition-all duration-150 ease-in-out flex flex-col shadow-sm bg-white";
  return (
    <div
      {...commonDivProps}
      className={`group relative ${baseClasses} ${stateClasses}`}
    >
      {previewImageUrl ? (
        <img 
          src={previewImageUrl} 
          alt={`Preview for ${reference.text}`} 
          className="w-full h-32 object-cover pointer-events-none"
        />
      ) : (
        <div className="w-full h-32 bg-gray-100 flex items-center justify-center border-b border-gray-200 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </div>
      )}
      <div className="p-3 flex justify-between items-center">
        <span className="text-sm text-gray-800 truncate flex-grow" title={reference.text}>{reference.text}</span>
        {associatedImageCount > 0 && (
          <div className={`flex items-center text-xs ml-2 px-1.5 py-0.5 
                          ${isFilterTarget ? 'text-blue-700 bg-blue-100 border border-blue-200' : 'text-green-700 bg-green-50 group-hover:bg-green-100 border border-green-200'}`} 
               title={`${associatedImageCount} image(s) associated`}>
            <LinkIcon className="w-3 h-3 mr-1" />
            <span>{associatedImageCount}</span>
          </div>
        )}
      </div>
      <button 
        onClick={handleLocalDelete}
        className="absolute top-1.5 right-1.5 p-1 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:ring-1 focus:ring-offset-1 focus:ring-red-300 z-10 bg-white/70 hover:bg-white"
        title={`Delete reference: ${reference.text}`}
        aria-label={`Delete reference ${reference.text}`}
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  );
});

export default ReferenceItem;