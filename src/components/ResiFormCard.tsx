import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Hash,
  Layers,
  MapPin,
  Minus,
  Package,
  Palette,
  Phone,
  Plus,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import {
  getKelompokColor,
  KELOMPOK_COLOR_OPTIONS,
  MAX_BOTTOM_COLOR_ROWS,
} from '../constants';
import {
  filterItemSuggestions,
  filterRecipientSuggestions,
} from '../services/backendSync';
import {
  KelompokColorId,
  ResiBottomRow,
  ResiItem,
  SavedItemSuggestion,
  SavedRecipient,
} from '../types';
import {
  ItemSuggestionsDropdown,
  RecipientSuggestionsDropdown,
} from './AutocompleteSuggestions';

interface ResiFormCardProps {
  item: ResiItem;
  index: number;
  total: number;
  isActive: boolean;
  savedRecipients?: SavedRecipient[];
  savedItems?: SavedItemSuggestion[];
  koliInputRef?: (el: HTMLInputElement | null) => void;
  onFocus: () => void;
  onChange: (patch: Partial<ResiItem>) => void;
  onDuplicate: () => void;
  onAutoGenerateKoli: (totalKoli: number) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const CARD_THEMES = [
  {
    headerBg: 'bg-gradient-to-r from-emerald-500/15 to-orange-500/10 border-emerald-200/70 dark:from-emerald-500/20 dark:to-orange-500/15 dark:border-white/10',
    badgeBg: 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm',
    titleText: 'text-slate-900 dark:text-white',
    activeBorder: 'border-orange-400/80 ring-2 ring-orange-500/20 shadow-[0_8px_32px_rgba(249,115,22,0.14)] dark:border-orange-400/70 dark:ring-orange-500/25 dark:shadow-[0_8px_32px_rgba(249,115,22,0.18)]',
    idleBorder: 'border-emerald-200/80 hover:border-emerald-400/70 shadow-[0_8px_28px_rgba(16,185,129,0.08)] dark:border-white/15 dark:hover:border-emerald-400/50 dark:shadow-[0_8px_28px_rgba(0,0,0,0.28)]',
  },
  {
    headerBg: 'bg-gradient-to-r from-orange-500/15 to-emerald-500/10 border-orange-200/70 dark:from-orange-500/20 dark:to-emerald-500/15 dark:border-white/10',
    badgeBg: 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm',
    titleText: 'text-slate-900 dark:text-white',
    activeBorder: 'border-emerald-400/80 ring-2 ring-emerald-500/20 shadow-[0_8px_32px_rgba(16,185,129,0.14)] dark:border-emerald-400/70 dark:ring-emerald-500/25 dark:shadow-[0_8px_32px_rgba(16,185,129,0.18)]',
    idleBorder: 'border-orange-200/80 hover:border-orange-400/70 shadow-[0_8px_28px_rgba(249,115,22,0.08)] dark:border-white/15 dark:hover:border-orange-400/50 dark:shadow-[0_8px_28px_rgba(0,0,0,0.28)]',
  },
];

export const ResiFormCard: React.FC<ResiFormCardProps> = ({
  item,
  index,
  total,
  isActive,
  savedRecipients = [],
  savedItems = [],
  koliInputRef,
  onFocus,
  onChange,
  onDuplicate,
  onAutoGenerateKoli,
  onDelete,
  onMoveUp,
  onMoveDown,
}) => {
  const [recipientFocused, setRecipientFocused] = useState(false);
  const [itemFocused, setItemFocused] = useState(false);
  const theme = CARD_THEMES[index % CARD_THEMES.length];
  const [batchKoliInput, setBatchKoliInput] = useState<string>(() => {
    const match = item.dari.match(/\d+/);
    const num = match ? Number.parseInt(match[0], 10) : 10;
    return num >= 2 && num <= 100 ? String(num) : '10';
  });

  const parsedBatchCount = Number.parseInt(batchKoliInput, 10);
  const validBatchCount =
    !Number.isNaN(parsedBatchCount) && parsedBatchCount >= 2 && parsedBatchCount <= 100;

  const handleAdjustKoli = (delta: -1 | 1) => {
    const trimmed = item.koliKe.trim();
    if (!trimmed) {
      onChange({ koliKe: '1' });
      return;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isNaN(parsed) && String(parsed) === trimmed) {
      const next = Math.max(1, parsed + delta);
      onChange({ koliKe: String(next) });
    }
  };

  const handleAdjustBatchKoli = (delta: -1 | 1) => {
    const parsed = Number.parseInt(batchKoliInput.replace(/[^\d]/g, ''), 10);
    const base = !Number.isNaN(parsed) && parsed > 0 ? parsed : 2;
    const next = Math.min(100, Math.max(2, base + delta));
    setBatchKoliInput(String(next));
  };

  const extras = item.extraRows ?? [];
  const totalBottomRows = 1 + extras.length;
  const primaryColor = getKelompokColor(item.colorId);

  const handleAddExtraRow = () => {
    if (totalBottomRows >= MAX_BOTTOM_COLOR_ROWS) return;
    const usedColors = new Set<KelompokColorId>([
      item.colorId ?? 'kelompok_a',
      ...extras.map((r) => r.colorId),
    ]);
    const nextColor =
      KELOMPOK_COLOR_OPTIONS.find((opt) => !usedColors.has(opt.id))?.id ??
      'kelompok_b';

    const newRow: ResiBottomRow = {
      id: crypto.randomUUID(),
      useQty: item.useQty !== false,
      colorId: nextColor,
      namaBarang: '',
      qty: '',
    };
    onChange({ extraRows: [...extras, newRow] });
  };

  const handleUpdateExtraRow = (
    rowId: string,
    patch: Partial<ResiBottomRow>
  ) => {
    onChange({
      extraRows: extras.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
    });
  };

  const handleDeleteExtraRow = (rowId: string) => {
    onChange({
      extraRows: extras.filter((r) => r.id !== rowId),
    });
  };

  return (
    <div
      id={`resi-card-${item.id}`}
      onClick={onFocus}
      className={`rounded-2xl border bg-white/75 dark:bg-white/[0.06] backdrop-blur-xl transition-all ${
        isActive ? theme.activeBorder : theme.idleBorder
      }`}
    >
      {/* Glass Card Header */}
      <div
        className={`flex items-center justify-between gap-2 px-4 py-2.5 border-b rounded-t-2xl ${theme.headerBg}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs font-extrabold flex-shrink-0 ${theme.badgeBg}`}
          >
            {index + 1}
          </span>
          <span className={`text-sm font-bold truncate ${theme.titleText}`}>
            Resi
          </span>
          <span className="text-[11px] font-medium text-emerald-700/80 dark:text-emerald-200/80 flex-shrink-0">
            • Hal. {Math.floor(index / 4) + 1}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {total > 1 && (
            <div className="flex items-center mr-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp();
                }}
                disabled={index === 0}
                title="Pindah ke atas"
                className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-emerald-500/15 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/15 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown();
                }}
                disabled={index === total - 1}
                title="Pindah ke bawah"
                className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-emerald-500/15 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/15 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            title="Duplikat data resi ini (halaman A4 akan bertambah otomatis bila perlu)"
            className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-500/25 dark:border-emerald-400/35 dark:bg-emerald-500/20 dark:text-emerald-200 dark:hover:bg-emerald-500/35 dark:hover:text-white transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplikat</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title={total === 1 ? 'Kosongkan isian resi' : 'Hapus resi ini'}
            className="p-1.5 rounded-full text-rose-600 hover:text-rose-700 hover:bg-rose-500/15 dark:text-rose-300 dark:hover:text-white dark:hover:bg-rose-500/30 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Frosted Glass Form Sections */}
      <div className="p-4 space-y-3.5">
        {/* Group 1: Tujuan Pengiriman */}
        <div className="rounded-xl bg-emerald-50/55 border border-emerald-200/70 dark:bg-white/[0.05] dark:border-white/10 p-3 space-y-3">
          <div className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor={`kepada-${item.id}`}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-200"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Kepada (Penerima &amp; Alamat)
              </label>
              {savedRecipients.length > 0 && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setRecipientFocused((v) => !v);
                  }}
                  className="text-[10px] font-bold text-orange-600 hover:text-orange-700 dark:text-orange-300 dark:hover:text-orange-200"
                >
                  Pilih Alamat ({savedRecipients.length})
                </button>
              )}
            </div>
            <textarea
              id={`kepada-${item.id}`}
              rows={3}
              value={item.kepada}
              onFocus={() => {
                onFocus();
                setRecipientFocused(true);
              }}
              onBlur={() => setRecipientFocused(false)}
              onChange={(e) => {
                onChange({ kepada: e.target.value });
                setRecipientFocused(true);
              }}
              placeholder={"TK ABA Kauman Yogyakarta\nJl. Kauman GM I/163, Yogyakarta"}
              className="w-full rounded-lg border border-emerald-200/90 bg-white/90 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25 resize-y leading-relaxed"
            />
            <RecipientSuggestionsDropdown
              visible={recipientFocused}
              suggestions={filterRecipientSuggestions(savedRecipients, item.kepada)}
              onSelect={(rec) => {
                const fullKepada = rec.address
                  ? `${rec.recipientName}\n${rec.address}`
                  : rec.recipientName;
                const patch: Partial<ResiItem> = {
                  kepada: fullKepada,
                  noHp: rec.phone || item.noHp,
                };
                if (!item.namaBarang.trim() && rec.lastItemName) {
                  patch.namaBarang = rec.lastItemName;
                  patch.colorId = rec.lastColorId;
                }
                onChange(patch);
                setRecipientFocused(false);
              }}
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Baris pertama otomatis dicetak lebih tebal.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor={`nohp-${item.id}`}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-200"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Nomor HP / Telepon
              </label>
              <span className="rounded-full bg-white/80 border border-emerald-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-white/10 dark:border-transparent dark:text-slate-300">
                Opsional
              </span>
            </div>
            <input
              id={`nohp-${item.id}`}
              type="tel"
              value={item.noHp}
              onFocus={onFocus}
              onChange={(e) => onChange({ noHp: e.target.value })}
              placeholder="Contoh: 0812-3456-7890"
              className="w-full rounded-lg border border-emerald-200/90 bg-white/90 px-3 py-2 text-sm font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-400 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25"
            />
          </div>
        </div>

        {/* Group 2: Baris Warna Resi (Kelompok, Pesanan & QTY — hingga 3 baris warna) */}
        <div className="rounded-xl bg-orange-50/70 border border-orange-200/80 dark:bg-orange-500/[0.08] dark:border-orange-400/25 p-3 space-y-3">
          {/* Baris Warna Utama (#1) */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-900 dark:text-orange-200">
                <Palette className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                Warna Kelompok {totalBottomRows > 1 ? '#1' : ''}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-extrabold ${primaryColor.pillClass}`}
              >
                {primaryColor.label} • {primaryColor.colorName}
              </span>
            </div>

            {/* 4 Pilihan Warna Kelompok */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {KELOMPOK_COLOR_OPTIONS.map((opt) => {
                const selected = (item.colorId ?? 'kelompok_a') === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFocus();
                      onChange({ colorId: opt.id });
                    }}
                    className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[11px] font-bold transition-all ${
                      selected
                        ? 'border-orange-500 bg-white text-slate-900 ring-1 ring-orange-400/50 shadow-xs dark:border-orange-400 dark:bg-white/20 dark:text-white'
                        : 'border-orange-200/80 bg-white/60 text-slate-700 hover:bg-white dark:border-white/15 dark:bg-black/20 dark:text-slate-300 dark:hover:border-white/30 dark:hover:bg-white/10'
                    }`}
                    title={`${opt.label} (${opt.colorName})`}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-sm border border-black/40 flex-shrink-0"
                      style={{ backgroundColor: opt.hex }}
                    />
                    <span className="truncate">{opt.shortLabel}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2 relative">
                <label
                  htmlFor={`barang-${item.id}`}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 mb-1"
                >
                  <Package className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                  Pesanan / Barang {totalBottomRows > 1 ? '#1' : ''}
                </label>
                <input
                  id={`barang-${item.id}`}
                  type="text"
                  value={item.namaBarang}
                  onFocus={() => {
                    onFocus();
                    setItemFocused(true);
                  }}
                  onBlur={() => setItemFocused(false)}
                  onChange={(e) => {
                    onChange({ namaBarang: e.target.value });
                    setItemFocused(true);
                  }}
                  placeholder="Contoh: BUKU PAKET KELOMPOK A"
                  className="w-full rounded-lg border border-orange-200/90 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25"
                />
                <ItemSuggestionsDropdown
                  visible={itemFocused}
                  suggestions={filterItemSuggestions(savedItems, item.namaBarang)}
                  onSelect={(s) => {
                    onChange({
                      namaBarang: s.itemName,
                      colorId: s.defaultColorId,
                    });
                    setItemFocused(false);
                  }}
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <label
                    htmlFor={`qty-${item.id}`}
                    className="text-xs font-bold text-slate-700 dark:text-slate-200"
                  >
                    QTY {totalBottomRows > 1 ? '#1' : ''}
                  </label>
                  <input
                    type="checkbox"
                    checked={item.useQty !== false}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onChange({ useQty: e.target.checked })}
                    title="Centang untuk menampilkan kolom QTY pada resi"
                    aria-label="Tampilkan kolom QTY"
                    className="h-3.5 w-3.5 cursor-pointer rounded border-orange-300 bg-white dark:border-white/30 dark:bg-black/30 text-orange-500 focus:ring-orange-500"
                  />
                </div>
                <input
                  id={`qty-${item.id}`}
                  type="text"
                  inputMode="numeric"
                  disabled={item.useQty === false}
                  value={item.useQty === false ? '' : item.qty}
                  onFocus={onFocus}
                  onChange={(e) =>
                    onChange({ qty: e.target.value.replace(/[^\d]/g, '') })
                  }
                  placeholder={item.useQty === false ? 'Tanpa QTY' : '12'}
                  className="w-full rounded-lg border border-orange-200/90 bg-white/90 px-3 py-2 text-sm font-bold text-slate-900 tabular-nums placeholder:font-normal placeholder:text-slate-400 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Baris Warna Tambahan (#2 & #3) */}
          {extras.map((extra, extraIdx) => {
            const rowNum = extraIdx + 2;
            const rowColor = getKelompokColor(extra.colorId);
            return (
              <div
                key={extra.id}
                className="pt-3 border-t border-orange-200/80 dark:border-white/15 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-orange-900 dark:text-orange-200">
                      Warna Kelompok #{rowNum}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-extrabold ${rowColor.pillClass}`}
                    >
                      {rowColor.label} • {rowColor.colorName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteExtraRow(extra.id);
                    }}
                    title={`Hapus baris warna #${rowNum}`}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {KELOMPOK_COLOR_OPTIONS.map((opt) => {
                    const selected = extra.colorId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFocus();
                          handleUpdateExtraRow(extra.id, { colorId: opt.id });
                        }}
                        className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[11px] font-bold transition-all ${
                          selected
                            ? 'border-orange-500 bg-white text-slate-900 ring-1 ring-orange-400/50 shadow-xs dark:border-orange-400 dark:bg-white/20 dark:text-white'
                            : 'border-orange-200/80 bg-white/60 text-slate-700 hover:bg-white dark:border-white/15 dark:bg-black/20 dark:text-slate-300 dark:hover:border-white/30 dark:hover:bg-white/10'
                        }`}
                        title={`${opt.label} (${opt.colorName})`}
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-sm border border-black/40 flex-shrink-0"
                          style={{ backgroundColor: opt.hex }}
                        />
                        <span className="truncate">{opt.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={extra.namaBarang}
                      onFocus={onFocus}
                      onChange={(e) =>
                        handleUpdateExtraRow(extra.id, {
                          namaBarang: e.target.value,
                        })
                      }
                      placeholder={`Pesanan / Barang #${rowNum} (${rowColor.label})`}
                      className="w-full rounded-lg border border-orange-200/90 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                        QTY #{rowNum}
                      </span>
                      <input
                        type="checkbox"
                        checked={extra.useQty !== false}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          handleUpdateExtraRow(extra.id, {
                            useQty: e.target.checked,
                          })
                        }
                        title={`Centang untuk menampilkan QTY #${rowNum}`}
                        aria-label={`Tampilkan QTY #${rowNum}`}
                        className="h-3.5 w-3.5 cursor-pointer rounded border-orange-300 bg-white dark:border-white/30 dark:bg-black/30 text-orange-500 focus:ring-orange-500"
                      />
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      disabled={extra.useQty === false}
                      value={extra.useQty === false ? '' : extra.qty}
                      onFocus={onFocus}
                      onChange={(e) =>
                        handleUpdateExtraRow(extra.id, {
                          qty: e.target.value.replace(/[^\d]/g, ''),
                        })
                      }
                      placeholder={
                        extra.useQty === false ? 'Tanpa QTY' : `QTY #${rowNum}`
                      }
                      className="w-full rounded-lg border border-orange-200/90 bg-white/90 px-3 py-2 text-sm font-bold text-slate-900 tabular-nums placeholder:font-normal placeholder:text-slate-400 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Tombol Tambah Baris Warna (Maks 3 Kelompok dalam 1 Resi) */}
          {totalBottomRows < MAX_BOTTOM_COLOR_ROWS && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFocus();
                handleAddExtraRow();
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-full border border-dashed border-orange-400/70 bg-orange-500/10 py-1.5 px-3 text-xs font-bold text-orange-700 hover:bg-orange-500/20 dark:border-orange-400/50 dark:bg-orange-500/15 dark:text-orange-200 dark:hover:bg-orange-500/25 dark:hover:text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Kolom Warna Kelompok ({totalBottomRows}/{MAX_BOTTOM_COLOR_ROWS})
            </button>
          )}
        </div>

        {/* Group 3: Kotak Angka Kanan + Generate Otomatis Banyak Koli */}
        <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 dark:bg-emerald-500/[0.08] dark:border-emerald-400/25 p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor={`koli-${item.id}`}
                className="flex items-center gap-1 text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-1.5"
              >
                <Hash className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Koli Ke
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAdjustKoli(-1);
                  }}
                  title="Kurangi -1 nomor Koli"
                  aria-label="Kurangi 1 nomor Koli"
                  className="inline-flex h-[38px] w-8 items-center justify-center rounded-lg border border-emerald-200/90 bg-white/90 text-slate-700 hover:bg-white dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 transition-colors flex-shrink-0"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  ref={koliInputRef}
                  id={`koli-${item.id}`}
                  type="text"
                  inputMode="numeric"
                  value={item.koliKe}
                  onFocus={onFocus}
                  onChange={(e) => onChange({ koliKe: e.target.value })}
                  placeholder="1"
                  className="w-full min-w-0 rounded-lg border border-emerald-200/90 bg-white/90 px-2.5 py-2 text-center text-sm font-bold text-slate-900 tabular-nums placeholder:font-normal placeholder:text-slate-400 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAdjustKoli(1);
                  }}
                  title="Tambah +1 nomor Koli"
                  aria-label="Tambah 1 nomor Koli"
                  className="inline-flex h-[38px] w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white hover:from-orange-400 hover:to-amber-400 transition-all flex-shrink-0 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor={`dari-${item.id}`}
                className="flex items-center gap-1 text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-1.5"
              >
                <Hash className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Dari (Total Koli)
              </label>
              <div className="relative">
                <input
                  id={`dari-${item.id}`}
                  type="text"
                  value={item.dari}
                  onFocus={onFocus}
                  onChange={(e) => onChange({ dari: e.target.value })}
                  placeholder="20"
                  className="w-full rounded-lg border border-emerald-200/90 bg-white/90 pl-3 pr-12 py-2 text-sm font-bold text-slate-900 tabular-nums placeholder:font-normal placeholder:text-slate-400 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                />
                {(!item.dari.trim() || /^\d+$/.test(item.dari.trim())) && (
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider text-emerald-800 dark:bg-emerald-500/25 dark:border-emerald-400/30 dark:text-emerald-200">
                    KOLI
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Auto-Generate Koli 1 s/d N + Auto Multi-Page A4 */}
          <div className="pt-2.5 border-t border-emerald-200/70 dark:border-white/10">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
                <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Otomatis Banyak Koli
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                Kertas A4 menyesuaikan otomatis
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAdjustBatchKoli(-1);
                  }}
                  title="Kurangi -1 banyak koli"
                  aria-label="Kurangi 1 banyak koli"
                  className="inline-flex h-[34px] w-8 items-center justify-center rounded-lg border border-emerald-200/90 bg-white/90 text-slate-700 hover:bg-white dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 transition-colors flex-shrink-0"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  value={batchKoliInput}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={onFocus}
                  onChange={(e) =>
                    setBatchKoliInput(e.target.value.replace(/[^\d]/g, ''))
                  }
                  placeholder="10"
                  aria-label="Jumlah total koli"
                  className="w-12 rounded-lg border border-emerald-200/90 bg-white/90 px-2 py-1.5 text-center text-xs font-bold text-slate-900 tabular-nums dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAdjustBatchKoli(1);
                  }}
                  title="Tambah +1 banyak koli"
                  aria-label="Tambah 1 banyak koli"
                  className="inline-flex h-[34px] w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white hover:from-orange-400 hover:to-amber-400 transition-all flex-shrink-0 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                type="button"
                disabled={!validBatchCount}
                onClick={(e) => {
                  e.stopPropagation();
                  if (validBatchCount) {
                    onAutoGenerateKoli(parsedBatchCount);
                  }
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:from-orange-400 hover:to-amber-400 disabled:opacity-45 disabled:pointer-events-none shadow-[0_4px_14px_rgba(249,115,22,0.35)] transition-all"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                {validBatchCount
                  ? `Buat Otomatis 1–${parsedBatchCount} Koli (${Math.ceil(
                      parsedBatchCount / 4
                    )} Hal)`
                  : 'Isi 2–100 Koli'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
