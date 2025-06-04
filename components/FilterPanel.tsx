
import React from 'react';
import { ImageFilterType, SortOrder } from '../types';
import { StarIconFilled, StarIconOutline, NoSymbolIcon, XMarkIcon, SortAscIcon, SortDescIcon } from '../constants';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatusFilter: ImageFilterType;
  onStatusFilterChange: (filter: ImageFilterType) => void;
  currentRatingFilter: number | null;
  onRatingFilterChange: (rating: number | null) => void;
  currentSortOrder: SortOrder;
  onSortOrderChange: () => void; // Simplified: just toggles
  onResetFilters: () => void;
  imageFilterTypeDisplayNames: Record<ImageFilterType, string>;
  sortOrderEnum: typeof SortOrder;
  isLoading: boolean;
  isReorderActive: boolean;
  isReferencingModeActive: boolean; // New prop
  imageFilterEnum: typeof ImageFilterType; // New prop
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  onClose,
  currentStatusFilter,
  onStatusFilterChange,
  currentRatingFilter,
  onRatingFilterChange,
  currentSortOrder,
  onSortOrderChange,
  onResetFilters,
  imageFilterTypeDisplayNames,
  sortOrderEnum,
  isLoading,
  isReorderActive,
  isReferencingModeActive, // Use prop
  imageFilterEnum, // Use prop
}) => {
  if (!isOpen) return null;

  const handleResetAndClose = () => {
    onResetFilters();
    // onClose(); // Optionally close after reset, or let user close with "Done"
  };
  
  const ControlButton: React.FC<{
    onClick: () => void;
    isActive: boolean;
    label: string | React.ReactNode;
    title?: string;
    disabled?: boolean;
    className?: string;
  }> = ({ onClick, isActive, label, title, disabled, className = "" }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-3 py-1.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-opacity-75 min-w-[70px] text-center justify-center
                  ${isActive ? 'bg-slate-700 text-white focus:ring-slate-500' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-400'}
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      aria-pressed={isActive}
    >
      {label}
    </button>
  );


  return (
    <div 
        className="absolute right-0 mt-2 w-80 md:w-96 bg-white shadow-lg border border-gray-200 p-4 z-30"
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-panel-title"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 id="filter-panel-title" className="text-lg font-semibold text-gray-800">Filter & Sort Options</h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-300"
          aria-label="Close filter panel"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-5">
        {/* Status Filter - Conditionally Rendered */}
        {isReferencingModeActive && (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Status</label>
            <div className="flex space-x-2 flex-wrap gap-y-1.5">
              {(Object.keys(imageFilterEnum) as Array<keyof typeof ImageFilterType>).map((enumKey) => {
                const filterValue = imageFilterEnum[enumKey];
                return (
                  <ControlButton
                    key={filterValue}
                    onClick={() => onStatusFilterChange(filterValue)}
                    isActive={currentStatusFilter === filterValue}
                    label={imageFilterTypeDisplayNames[filterValue]}
                    disabled={isLoading}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Rating Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Rating</label>
          <div className="flex space-x-2 flex-wrap gap-y-1.5">
            <ControlButton
              onClick={() => onRatingFilterChange(null)}
              isActive={currentRatingFilter === null}
              label="All"
              title="Show all ratings"
              disabled={isLoading}
            />
            <ControlButton
              onClick={() => onRatingFilterChange(0)}
              isActive={currentRatingFilter === 0}
              label={<NoSymbolIcon className="w-4 h-4 inline-block"/>}
              title="Show Not Rated (0 stars)"
              disabled={isLoading}
            />
            {[1, 2, 3, 4, 5].map(star => (
              <ControlButton
                key={star}
                onClick={() => onRatingFilterChange(star)}
                isActive={currentRatingFilter === star}
                label={<>{star} <StarIconFilled className="w-3.5 h-3.5 text-yellow-400 inline-block ml-0.5"/></>}
                title={`Show ${star}-star rated`}
                disabled={isLoading}
              />
            ))}
          </div>
        </div>

        {/* Sort Order */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Sort by Date</label>
          <div className="flex space-x-2">
             <ControlButton
                onClick={onSortOrderChange}
                isActive={false} // Button itself is not active, but shows current state
                label={
                    currentSortOrder === sortOrderEnum.DESC 
                    ? <><SortDescIcon className="inline-block mr-1.5 w-4 h-4"/>Newest First</> 
                    : <><SortAscIcon className="inline-block mr-1.5 w-4 h-4"/>Oldest First</>
                }
                title={isReorderActive ? "Custom order active for current reference" : `Toggle sort order (currently ${currentSortOrder === sortOrderEnum.DESC ? 'Newest First' : 'Oldest First'})`}
                disabled={isLoading || isReorderActive}
                className="flex-grow"
             />
          </div>
           {isReorderActive && <p className="text-xs text-blue-500 mt-1">Custom order active for this reference.</p>}
        </div>

      </div>

      <hr className="my-5 border-gray-200" />

      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={handleResetAndClose}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 transition-colors disabled:opacity-50"
        >
          Reset Filters
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-white bg-slate-700 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-500 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default FilterPanel;