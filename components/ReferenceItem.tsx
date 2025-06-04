
import React from 'react';
import { Reference } from '../types';
import { LinkIcon } from '../constants';

interface ReferenceItemProps {
  reference: Reference;
  associatedImageCount: number;
  onSelect: (referenceId: string) => void;
  canAssociate: boolean;
  isFilterTarget: boolean;
  previewImageUrl?: string | null;
}

const ReferenceItem: React.FC<ReferenceItemProps> = React.memo(({ 
  reference, 
  associatedImageCount, 
  onSelect, 
  canAssociate,
  isFilterTarget,
  previewImageUrl
}) => {
  
  const handleSelect = () => {
    onSelect(reference.id);
  };

  const canBeFilterTrigger = !canAssociate && associatedImageCount > 0;

  let itemTitle = reference.text;
  if (canAssociate) {
    itemTitle = `Click to associate selected images with "${reference.text}"`;
  } else if (canBeFilterTrigger) {
    itemTitle = `Click to show images associated with "${reference.text}" (${associatedImageCount})`;
  } else if (associatedImageCount > 0) {
    itemTitle = `Reference "${reference.text}" has ${associatedImageCount} associated image(s). Select images to associate or click to filter.`;
  }

  let baseClasses = "rounded-lg transition-all duration-150 ease-in-out flex flex-col shadow-sm"; // Use a very subtle shadow for depth
  let stateClasses = ""; // Resting state is transparent background

  if (isFilterTarget) {
    stateClasses = 'ring-2 ring-offset-0 ring-blue-500'; // No border, just ring
  }

  if (canAssociate) {
    stateClasses += ' hover:bg-blue-50 cursor-pointer';
  } else if (canBeFilterTrigger) {
    stateClasses += ' hover:bg-gray-50 cursor-pointer';
  } else {
    stateClasses += ' cursor-default';
  }


  return (
    <div
      className={`${baseClasses} ${stateClasses}`}
      title={itemTitle}
      role="button"
      aria-pressed={isFilterTarget}
      tabIndex={(canAssociate || canBeFilterTrigger) ? 0 : -1}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { if (canAssociate || canBeFilterTrigger) handleSelect(); }}}
      onClick={(canAssociate || canBeFilterTrigger) ? handleSelect : undefined}
    >
      {previewImageUrl && (
        <img 
          src={previewImageUrl} 
          alt={`Preview for ${reference.text}`} 
          className="w-full h-32 object-cover rounded-t-lg pointer-events-none"
        />
      )}
       {!previewImageUrl && (
        <div className="w-full h-32 bg-gray-100 rounded-t-lg flex items-center justify-center border-b border-gray-200"> {/* Internal border-b for visual separation */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </div>
      )}
      <div className="p-3 flex justify-between items-center group bg-white rounded-b-lg"> {/* Explicit white bg for bottom part if needed */}
        <span className="text-sm text-gray-800 truncate flex-grow" title={reference.text}>{reference.text}</span>
        {associatedImageCount > 0 && (
          <div className={`flex items-center text-xs ml-2 px-1.5 py-0.5 rounded-md
                          ${isFilterTarget ? 'text-blue-700 bg-blue-100 border border-blue-200' : 'text-green-700 bg-green-50 group-hover:bg-green-100 border border-green-200'}`} 
               title={`${associatedImageCount} image(s) associated`}>
            <LinkIcon className="w-3 h-3 mr-1" />
            <span>{associatedImageCount}</span>
          </div>
        )}
      </div>
    </div>
  );
});

export default ReferenceItem;