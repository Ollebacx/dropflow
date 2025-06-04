
import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '../constants';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSessionName: string | null;
  onConfirmShare: (sessionName: string, shareType: 'copyLink' | 'sendToRetouch', assignee?: string, step?: string) => void;
}

const RETOUCH_STEPS = ["digital", "digital 2", "retouch", "qc", "qc2"];

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, initialSessionName, onConfirmShare }) => {
  const [sessionNameInput, setSessionNameInput] = useState(initialSessionName || '');
  const [selectedShareOption, setSelectedShareOption] = useState<'copyLink' | 'sendToRetouch'>('copyLink');
  const [assigneeName, setAssigneeName] = useState('');
  const [selectedStep, setSelectedStep] = useState<string>(RETOUCH_STEPS[0]);

  useEffect(() => {
    setSessionNameInput(initialSessionName || '');
    if (isOpen) { 
      setSelectedShareOption('copyLink');
      setAssigneeName('');
      setSelectedStep(RETOUCH_STEPS[0]);
    }
  }, [initialSessionName, isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!sessionNameInput.trim()) {
        alert("Session name cannot be empty.");
        return;
    }
    if (selectedShareOption === 'sendToRetouch' && !selectedStep) {
        alert("A step must be selected for sending to retouch team.");
        return;
    }
    onConfirmShare(
        sessionNameInput.trim(), 
        selectedShareOption, 
        selectedShareOption === 'sendToRetouch' ? assigneeName.trim() : undefined,
        selectedShareOption === 'sendToRetouch' ? selectedStep : undefined
    );
  };

  const isConfirmDisabled = !sessionNameInput.trim() || 
                            (selectedShareOption === 'sendToRetouch' && !selectedStep);
  const confirmButtonText = selectedShareOption === 'copyLink' ? 'Copy Link' : 'Send to Retouch';

  return (
    <div 
      className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-[1000] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 w-full max-w-md transform transition-all">
        <div className="flex justify-between items-center mb-4">
          <h2 id="share-modal-title" className="text-xl font-semibold text-gray-800">Share Session</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="Close share modal"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="sessionName" className="block text-sm font-medium text-gray-700 mb-1">
              Session Name
            </label>
            <input
              type="text"
              id="sessionName"
              value={sessionNameInput}
              onChange={(e) => setSessionNameInput(e.target.value)}
              placeholder="Enter a name for this session"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Share Method</label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="shareCopyLink"
                  name="shareOption"
                  value="copyLink"
                  checked={selectedShareOption === 'copyLink'}
                  onChange={() => setSelectedShareOption('copyLink')}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="shareCopyLink" className="ml-2 block text-sm text-gray-700">
                  Copy Link
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="shareSendToRetouch"
                  name="shareOption"
                  value="sendToRetouch"
                  checked={selectedShareOption === 'sendToRetouch'}
                  onChange={() => setSelectedShareOption('sendToRetouch')}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="shareSendToRetouch" className="ml-2 block text-sm text-gray-700">
                  Send to Retouch Team
                </label>
              </div>
            </div>
          </div>

          {selectedShareOption === 'sendToRetouch' && (
            <>
              <div>
                <label htmlFor="retouchStep" className="block text-sm font-medium text-gray-700 mb-1">
                  Step
                </label>
                <select
                  id="retouchStep"
                  value={selectedStep}
                  onChange={(e) => setSelectedStep(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                  required
                >
                  {RETOUCH_STEPS.map(step => (
                    <option key={step} value={step}>{step.charAt(0).toUpperCase() + step.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="assigneeName" className="block text-sm font-medium text-gray-700 mb-1">
                  Assign to (Optional)
                </label>
                <input
                  type="text"
                  id="assigneeName"
                  value={assigneeName}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  placeholder="Retoucher's Name or Email"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-opacity-75 transition-colors
                        ${isConfirmDisabled 
                            ? 'bg-gray-300 cursor-not-allowed' 
                            : 'bg-slate-700 hover:bg-slate-800 focus:ring-slate-500'
                        }`}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
