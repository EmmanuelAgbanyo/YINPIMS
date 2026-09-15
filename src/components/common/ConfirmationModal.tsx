import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
      <div className="bg-white border border-[#E4E4E1] rounded-lg shadow-lg w-full max-w-md p-6 space-y-4">
        <div className="flex items-start space-x-3">
          <div
            className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
              isDestructive ? 'bg-[#FDF2F2] text-[#B0413E]' : 'bg-[#EBF4F4] text-[#14595A]'
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1C1C1A] font-heading">{title}</h3>
            <p className="text-xs text-[#6B6B66] mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E4E4E1]">
          <button
            onClick={onCancel}
            className="px-4 h-9 text-xs font-medium text-[#1C1C1A] bg-white border border-[#E4E4E1] rounded-md hover:bg-[#FAFAF9] transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>

          <button
            onClick={onConfirm}
            className={`px-4 h-9 text-xs font-medium text-white rounded-md transition-colors shadow-2xs cursor-pointer ${
              isDestructive
                ? 'bg-[#B0413E] hover:bg-[#903432]'
                : 'bg-[#14595A] hover:bg-[#0E4243]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
