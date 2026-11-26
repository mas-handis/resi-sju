import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Hash,
  Layers,
  MapPin,
  Package,
  Phone,
  Plus,
  Trash2,
  Zap,
} from 'lucide-react';
import { ResiItem } from '../types';

interface ResiFormCardProps {
  item: ResiItem;
  index: number;
  total: number;
  isActive: boolean;
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
    headerBg: 'bg-gradient-to-r from-blue-50 to-sky-50 border-blue-200/80',
    badgeBg: 'bg-blue-600 text-white shadow-sm',
    titleText: 'text-blue-950',
    activeBorder: 'border-blue-400 ring-2 ring-blue-500/20 shadow-md',
    idleBorder: 'border-slate-200 hover:border-blue-300 shadow-sm',
  },
  {
    headerBg: 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200/80',
    badgeBg: 'bg-emerald-600 text-white shadow-sm',
    titleText: 'text-emerald-950',
    activeBorder: 'border-emerald-400 ring-2 ring-emerald-500/20 shadow-md',
    idleBorder: 'border-slate-200 hover:border-emerald-300 shadow-sm',
  },
  {
    headerBg: 'bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200/80',
    badgeBg: 'bg-violet-600 text-white shadow-sm',
    titleText: 'text-violet-950',
    activeBorder: 'border-violet-400 ring-2 ring-violet-500/20 shadow-md',
    idleBorder: 'border-slate-200 hover:border-violet-300 shadow-sm',
  },
  {
    headerBg: 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200/80',
    badgeBg: 'bg-orange-500 text-white shadow-sm',
    titleText: 'text-orange-950',
    activeBorder: 'border-orange-400 ring-2 ring-orange-500/20 shadow-md',
    idleBorder: 'border-slate-200 hover:border-orange-300 shadow-sm',
  },
  {
    headerBg: 'bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200/80',
    badgeBg: 'bg-rose-600 text-white shadow-sm',
    titleText: 'text-rose-950',
    activeBorder: 'border-rose-400 ring-2 ring-rose-500/20 shadow-md',
    idleBorder: 'border-slate-200 hover:border-rose-300 shadow-sm',
  },
];

export const ResiFormCard: React.FC<ResiFormCardProps> = ({
  item,
  index,
  total,
  isActive,
  koliInputRef,
  onFocus,
  onChange,
  onDuplicate,
  onAutoGenerateKoli,
  onDelete,
  onMoveUp,
  onMoveDown,
}) => {
  const theme = CARD_THEMES[index % CARD_THEMES.length];
  const [batchKoliInput, setBatchKoliInput] = useState<string>(() => {
    const match = item.dari.match(/\d+/);
    const num = match ? Number.parseInt(match[0], 10) : 10;
    return num >= 2 && num <= 100 ? String(num) : '10';
  });

  const parsedBatchCount = Number.parseInt(batchKoliInput, 10);
  const validBatchCount =
    !Number.isNaN(parsedBatchCount) && parsedBatchCount >= 2 && parsedBatchCount <= 100;

  const handleIncrementKoli = () => {
    const trimmed = item.koliKe.trim();
    if (!trimmed) {
      onChange({ koliKe: '1' });
      return;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isNaN(parsed) && String(parsed) === trimmed) {
      onChange({ koliKe: String(parsed + 1) });
    }
  };

  return (
    <div
      id={`resi-card-${item.id}`}
      onClick={onFocus}
      className={`rounded-xl border bg-white transition-all overflow-hidden ${
        isActive ? theme.activeBorder : theme.idleBorder
      }`}
    >
      {/* Color-Coded Card Header */}
      <div
        className={`flex items-center justify-between gap-2 px-4 py-2.5 border-b ${theme.headerBg}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs font-extrabold flex-shrink-0 ${theme.badgeBg}`}
          >
            {index + 1}
          </span>
          <span className={`text-sm font-bold truncate ${theme.titleText}`}>
            Resi #{index + 1}
          </span>
          <span className="text-[11px] font-medium text-slate-500 flex-shrink-0">
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
                className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-white/80 disabled:opacity-30 disabled:pointer-events-none transition-colors"
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
                className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-white/80 disabled:opacity-30 disabled:pointer-events-none transition-colors"
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
            className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 hover:border-sky-300 transition-colors"
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
            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Color-Grouped Form Fields */}
      <div className="p-4 space-y-3.5">
        {/* Group 1: Tujuan Pengiriman (Biru Lembut) */}
        <div className="rounded-xl bg-sky-50/55 border border-sky-200/80 p-3 space-y-3">
          <div>
            <label
              htmlFor={`kepada-${item.id}`}
              className="flex items-center gap-1.5 text-xs font-bold text-sky-900 mb-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-sky-600" />
              Kepada (Penerima &amp; Alamat)
            </label>
            <textarea
              id={`kepada-${item.id}`}
              rows={3}
              value={item.kepada}
              onFocus={onFocus}
              onChange={(e) => onChange({ kepada: e.target.value })}
              placeholder={"TK ABA Kauman Yogyakarta\nJl. Kauman GM I/163, Yogyakarta"}
              className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-y leading-relaxed"
            />
            <p className="mt-1 text-[11px] text-sky-700/80">
              Baris pertama otomatis dicetak lebih tebal.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor={`nohp-${item.id}`}
                className="flex items-center gap-1.5 text-xs font-bold text-sky-900"
              >
                <Phone className="w-3.5 h-3.5 text-sky-600" />
                Nomor HP / Telepon
              </label>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
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
              className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
        </div>

        {/* Group 2: Baris Kuning Resi (Pesanan & QTY) */}
        <div className="rounded-xl bg-amber-50/90 border border-amber-300/80 p-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor={`barang-${item.id}`}
                  className="flex items-center gap-1.5 text-xs font-bold text-amber-950"
                >
                  <Package className="w-3.5 h-3.5 text-amber-600" />
                  Pesanan / Barang
                </label>
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold bg-[#FFEB00] text-slate-900 border border-amber-500/60">
                  Blok Kuning
                </span>
              </div>
              <input
                id={`barang-${item.id}`}
                type="text"
                value={item.namaBarang}
                onFocus={onFocus}
                onChange={(e) => onChange({ namaBarang: e.target.value })}
                placeholder="Contoh: MAP LAMA KARTON TK"
                className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor={`qty-${item.id}`}
                  className="block text-xs font-bold text-amber-950"
                >
                  QTY
                </label>
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold bg-[#FFEB00] text-slate-900 border border-amber-500/60">
                  Kuning
                </span>
              </div>
              <input
                id={`qty-${item.id}`}
                type="text"
                inputMode="numeric"
                value={item.qty}
                onFocus={onFocus}
                onChange={(e) => onChange({ qty: e.target.value.replace(/[^\d]/g, '') })}
                placeholder="12"
                className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 tabular-nums placeholder:font-normal placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
              />
            </div>
          </div>
        </div>

        {/* Group 3: Kotak Angka Kanan + Generate Otomatis Banyak Koli */}
        <div className="rounded-xl bg-indigo-50/60 border border-indigo-200/80 p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor={`koli-${item.id}`}
                className="flex items-center gap-1 text-xs font-bold text-indigo-950 mb-1.5"
              >
                <Hash className="w-3.5 h-3.5 text-indigo-600" />
                Koli Ke
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  ref={koliInputRef}
                  id={`koli-${item.id}`}
                  type="text"
                  inputMode="numeric"
                  value={item.koliKe}
                  onFocus={onFocus}
                  onChange={(e) => onChange({ koliKe: e.target.value })}
                  placeholder="1"
                  className="w-full min-w-0 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 tabular-nums placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleIncrementKoli();
                  }}
                  title="Tambah +1 nomor Koli"
                  className="inline-flex h-[38px] px-2.5 items-center justify-center rounded-lg border border-indigo-300 bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 transition-colors flex-shrink-0 shadow-sm"
                >
                  <Plus className="w-3 h-3 mr-0.5" />1
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor={`dari-${item.id}`}
                className="flex items-center gap-1 text-xs font-bold text-indigo-950 mb-1.5"
              >
                <Hash className="w-3.5 h-3.5 text-indigo-600" />
                Dari (Total Koli)
              </label>
              <input
                id={`dari-${item.id}`}
                type="text"
                value={item.dari}
                onFocus={onFocus}
                onChange={(e) => onChange({ dari: e.target.value })}
                placeholder="10 KOLI"
                className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 tabular-nums placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Auto-Generate Koli 1 s/d N + Auto Multi-Page A4 */}
          <div className="pt-2.5 border-t border-indigo-200/80">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-950">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                Otomatis Banyak Koli
              </span>
              <span className="text-[10px] font-medium text-indigo-700">
                Kertas A4 menyesuaikan otomatis
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-24 flex-shrink-0">
                <input
                  type="number"
                  min={2}
                  max={100}
                  value={batchKoliInput}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={onFocus}
                  onChange={(e) => setBatchKoliInput(e.target.value)}
                  aria-label="Jumlah total koli"
                  className="w-full rounded-lg border border-indigo-200 bg-white pl-2.5 pr-7 py-1.5 text-xs font-bold text-slate-900 tabular-nums focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400">
                  koli
                </span>
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
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-45 disabled:pointer-events-none shadow-sm transition-colors"
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
