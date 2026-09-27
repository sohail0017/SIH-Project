import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  itemName: string;
  itemIdentifier?: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title,
  itemName,
  itemIdentifier,
  onClose,
  onConfirm,
}) => {
  const [deleting, setDeleting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade"
      onClick={onClose}
    >
      <div
        className="animate-pop w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
          </div>

          <h3 className="text-base font-bold text-slate-900 text-center">{title}</h3>
          <p className="text-xs text-slate-500 text-center mt-2 leading-relaxed">
            Are you sure you want to permanently delete{' '}
            <strong className="text-slate-800">{itemName}</strong>
            {itemIdentifier ? ` (${itemIdentifier})` : ''}? This operation will remove all associated database records and cannot be undone.
          </p>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              disabled={deleting}
              onClick={onClose}
              className="flex-1 py-2 text-xs font-semibold rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleConfirm}
              className="flex-1 py-2 text-xs font-semibold rounded-md bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleting ? 'Deleting…' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

