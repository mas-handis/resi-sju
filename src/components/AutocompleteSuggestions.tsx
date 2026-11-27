import React from 'react';
import { MapPin, Package, Phone, Sparkles, Star } from 'lucide-react';
import { getKelompokColor } from '../constants';
import { SavedItemSuggestion, SavedRecipient } from '../types';

interface RecipientSuggestionsDropdownProps {
  visible: boolean;
  suggestions: SavedRecipient[];
  onSelect: (recipient: SavedRecipient) => void;
}

export const RecipientSuggestionsDropdown: React.FC<
  RecipientSuggestionsDropdownProps
> = ({ visible, suggestions, onSelect }) => {
  if (!visible || suggestions.length === 0) return null;

  return (
    <div className="absolute left-0 right-0 top-full z-30 mt-1.5 rounded-xl border border-emerald-200 dark:border-white/20 bg-white/95 dark:bg-[#0F241D]/95 backdrop-blur-xl shadow-[0_14px_34px_rgba(11,110,79,0.2)] dark:shadow-[0_14px_34px_rgba(0,0,0,0.55)] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-emerald-500/12 to-orange-500/10 dark:from-emerald-500/20 dark:to-orange-500/15 border-b border-emerald-200/70 dark:border-white/10">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-200">
          <Sparkles className="w-3 h-3 text-orange-500 dark:text-orange-400" />
          Rekomendasi Alamat Tersimpan
        </span>
        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
          Klik untuk isi otomatis
        </span>
      </div>

      <div className="max-h-56 overflow-y-auto divide-y divide-emerald-100 dark:divide-white/10">
        {suggestions.map((rec) => {
          const colorCfg = getKelompokColor(rec.lastColorId);
          return (
            <button
              key={rec.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(rec);
              }}
              className="w-full px-3 py-2 text-left hover:bg-emerald-50/90 dark:hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white truncate">
                  <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span className="truncate">{rec.recipientName}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 dark:bg-orange-500/25 border border-orange-300 dark:border-orange-400/35 px-1.5 py-0.5 text-[10px] font-bold text-orange-800 dark:text-orange-200 flex-shrink-0">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  {rec.useCount}x
                </span>
              </div>

              {rec.address && (
                <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 pl-4">
                  {rec.address.replace(/\n/g, ', ')}
                </p>
              )}

              <div className="mt-1 flex flex-wrap items-center gap-2 pl-4">
                {rec.phone && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                    <Phone className="w-2.5 h-2.5" />
                    {rec.phone}
                  </span>
                )}
                {rec.lastItemName && (
                  <span
                    className={`inline-flex items-center gap-1 rounded border px-1.5 py-0 text-[9px] font-bold ${colorCfg.pillClass}`}
                  >
                    <Package className="w-2.5 h-2.5" />
                    {rec.lastItemName}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface ItemSuggestionsDropdownProps {
  visible: boolean;
  suggestions: SavedItemSuggestion[];
  onSelect: (item: SavedItemSuggestion) => void;
}

export const ItemSuggestionsDropdown: React.FC<ItemSuggestionsDropdownProps> = ({
  visible,
  suggestions,
  onSelect,
}) => {
  if (!visible || suggestions.length === 0) return null;

  return (
    <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-orange-200 dark:border-white/20 bg-white/95 dark:bg-[#0F241D]/95 backdrop-blur-xl shadow-[0_12px_28px_rgba(249,115,22,0.16)] dark:shadow-[0_12px_28px_rgba(0,0,0,0.5)] overflow-hidden">
      <div className="px-2.5 py-1 bg-orange-50/90 dark:bg-orange-500/15 border-b border-orange-200/70 dark:border-white/10 text-[10px] font-bold uppercase tracking-wider text-orange-800 dark:text-orange-200 flex items-center gap-1">
        <Package className="w-3 h-3" />
        Rekomendasi Barang Sering Dipakai
      </div>
      <div className="max-h-44 overflow-y-auto divide-y divide-orange-100/80 dark:divide-white/10">
        {suggestions.map((item) => {
          const colorCfg = getKelompokColor(item.defaultColorId);
          return (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(item);
              }}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between gap-2 hover:bg-orange-50 dark:hover:bg-white/10 transition-colors"
            >
              <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {item.itemName}
              </span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span
                  className="h-2.5 w-2.5 rounded-sm border border-black/30"
                  style={{ backgroundColor: colorCfg.hex }}
                  title={colorCfg.label}
                />
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-300">
                  {item.useCount}x
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
