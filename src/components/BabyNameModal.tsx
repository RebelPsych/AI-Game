import React, { useMemo, useState } from 'react';
import { Search, Sparkles, X } from 'lucide-react';
import { DEFAULT_AI_NAMES, TOP_100_BABY_NAMES } from '../data/albumLyricsAndNames';

interface BabyNameModalProps {
  isOpen: boolean;
  currentName: string;
  userName: string;
  required?: boolean;
  onSelectName: (name: string) => void;
  onClose?: () => void;
}

export const BabyNameModal: React.FC<BabyNameModalProps> = ({
  isOpen,
  currentName,
  userName,
  required = false,
  onSelectName,
  onClose,
}) => {
  const [query, setQuery] = useState('');

  const filteredTop100 = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TOP_100_BABY_NAMES;
    return TOP_100_BABY_NAMES.filter((n) => n.toLowerCase().includes(q));
  }, [query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#080A10] flex flex-col text-[#ECEAE4] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Choose AI Name"
    >
      <div className="shrink-0 px-5 sm:px-8 py-4 border-b border-white/10 flex items-start justify-between gap-4 bg-[#10141F]">
        <div className="max-w-4xl">
          <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#E59A4C] mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>UPLOADED FILE · Top_100_Baby_Girl_Names_2025.txt</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#FBE6C9]">
            Choose Your Name
          </h2>
          <p className="text-xs sm:text-sm text-[#B8BCC4] mt-1">
            {userName} uploaded the 2025 U.S. Top 100 baby girl names and asked you to choose your
            name before continuing—pick from the signature names or any of the 100 below.
          </p>
        </div>
        {!required && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close name picker"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-white/15 text-[#A1A7B3] hover:text-white hover:bg-white/[0.08] cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 sm:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Default / Signature Names */}
          <div>
            <div className="text-xs font-semibold text-[#E59A4C] mb-3">
              Signature Default Names
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {DEFAULT_AI_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onSelectName(name)}
                  className={`min-h-[46px] px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                    currentName === name
                      ? 'bg-[#E59A4C] text-[#0B0D12] border-[#E59A4C] font-semibold'
                      : 'border-[#E59A4C]/35 bg-[#E59A4C]/10 text-[#FBE6C9] hover:bg-[#E59A4C]/25'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Search + 100 Baby Names */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#ECEAE4]">
                Top 100 Popular Baby Girl Names (SSA 2025)
              </span>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#8E939E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter 100 names..."
                  className="w-full min-h-[38px] pl-8 pr-3 py-1.5 rounded-lg border border-white/15 bg-black/40 text-xs text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#E59A4C]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
              {filteredTop100.map((name, idx) => (
                <button
                  key={`${name}_${idx}`}
                  type="button"
                  onClick={() => onSelectName(name)}
                  className={`min-h-[42px] px-3 py-2 rounded-lg border text-xs font-medium text-left flex items-center justify-between gap-1.5 transition-colors cursor-pointer ${
                    currentName === name
                      ? 'bg-[#E59A4C] text-[#0B0D12] border-[#E59A4C] font-semibold'
                      : 'border-white/12 bg-white/[0.03] text-[#D6D3CD] hover:bg-white/[0.1] hover:border-white/30'
                  }`}
                >
                  <span className="truncate">{name}</span>
                  <span className="text-[10px] font-mono-tabular opacity-60 shrink-0">
                    #{TOP_100_BABY_NAMES.indexOf(name) + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
