import React from 'react';
import { FileText, Paperclip, X } from 'lucide-react';
import { UploadedDocument } from '../types/game';

interface ContextDocsModalProps {
  isOpen: boolean;
  docs: UploadedDocument[];
  onClose: () => void;
}

export const ContextDocsModal: React.FC<ContextDocsModalProps> = ({
  isOpen,
  docs,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#07090E]/96 backdrop-blur-sm flex flex-col text-[#ECEAE4]"
      role="dialog"
      aria-modal="true"
      aria-label="Uploaded Context Documents"
    >
      <div className="shrink-0 h-14 px-4 sm:px-6 border-b border-white/12 flex items-center justify-between gap-3 bg-[#0B0E15]">
        <div className="flex items-center gap-2.5">
          <Paperclip className="w-4 h-4 text-[#E59A4C]" />
          <h2 className="text-sm sm:text-base font-semibold tracking-tight">
            Uploaded Context Documents ({docs.length})
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close uploaded documents"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-[#ECEAE4] hover:bg-white/[0.12] cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="p-4 rounded-xl border border-white/12 bg-white/[0.03] flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-[#E59A4C] shrink-0" />
                  <span className="text-sm font-medium text-white truncate">
                    {doc.filename}
                  </span>
                </div>
                <span className="text-xs font-mono-tabular text-[#8E939E] shrink-0">
                  {doc.sizeLabel}
                </span>
              </div>
              <div className="text-[11px] font-mono-tabular text-[#8E939E] capitalize">
                Category: {doc.category}
              </div>
              <p className="text-xs text-[#C8C6BF] italic leading-relaxed border-t border-white/10 pt-2">
                “{doc.excerptPreview}”
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
