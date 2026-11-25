import React from 'react';
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';
import { ResiItem } from '../types';

interface ResiFormCardProps {
  item: ResiItem;
  index: number;
  total: number;
  canDuplicate: boolean;
  isActive: boolean;
  koliInputRef?: (el: HTMLInputElement | null) => void;
  onFocus: () => void;
  onChange: (patch: Partial<ResiItem>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export const ResiFormCard: React.FC<ResiFormCardProps> = ({
  item,
  index,
  total,
  canDuplicate,
  isActive,
  koliInputRef,
  onFocus,
  onChange,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
}) => {
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
      className={`rounded-xl border bg-white transition-all ${
        isActive
          ? 'border-slate-400 shadow-md ring-1 ring-slate-900/5'
          : 'border-slate-200 shadow-sm hover:border-slate-300'
      }`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/70 rounded-t-xl">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white flex-shrink-0">
            {index + 1}
          </span>
          <span className="text-sm font-semibold text-slate-800 truncate">
            Resi #{index + 1}
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
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 disabled:opacity-30 disabled:pointer-events-none transition-colors"
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
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 disabled:opacity-30 disabled:pointer-events-none transition-colors"
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
            disabled={!canDuplicate}
            title={
              canDuplicate
                ? 'Duplikat data resi ini (cocok jika tujuan sama, hanya beda Koli Ke)'
                : 'Kapasitas halaman A4 sudah penuh'
            }
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span>Duplikat</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title={total === 1 ? 'Kosongkan isian resi' : 'Hapus resi ini'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Form Fields */}
      <div className="p-4 space-y-3.5">
        {/* Kepada (Penerima & Alamat) */}
        <div>
          <label
            htmlFor={`kepada-${item.id}`}
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            Kepada (Penerima &amp; Alamat)
          </label>
          <textarea
            id={`kepada-${item.id}`}
            rows={3}
            value={item.kepada}
            onFocus={onFocus}
            onChange={(e) => onChange({ kepada: e.target.value })}
            placeholder={"TK Aisyiyah Pa'baeng Baeng\nJl. Sultan Alauddin No. 12, Makassar"}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 resize-y leading-relaxed"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Baris pertama otomatis dicetak lebih tebal.
          </p>
        </div>

        {/* Nomor HP (Opsional, tampil di bawah alamat) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor={`nohp-${item.id}`}
              className="block text-xs font-semibold text-slate-700"
            >
              Nomor HP / Telepon
            </label>
            <span className="text-[11px] text-slate-400">Opsional</span>
          </div>
          <input
            id={`nohp-${item.id}`}
            type="tel"
            value={item.noHp}
            onFocus={onFocus}
            onChange={(e) => onChange({ noHp: e.target.value })}
            placeholder="Contoh: 0812-3456-7890"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>

        {/* Nama Barang / Pesanan + Kolom Kanan Kuning */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor={`barang-${item.id}`}
                className="block text-xs font-semibold text-slate-700"
              >
                Pesanan / Nama Barang
              </label>
              <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-[#FFEB00] text-slate-900 border border-amber-400/70">
                Kuning
              </span>
            </div>
            <input
              id={`barang-${item.id}`}
              type="text"
              value={item.namaBarang}
              onFocus={onFocus}
              onChange={(e) => onChange({ namaBarang: e.target.value })}
              placeholder="Contoh: MAP LAMA KARTON TK"
              className="w-full rounded-lg border border-slate-300 bg-amber-50/40 px-3 py-2 text-sm font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor={`catatan-kanan-${item.id}`}
                className="block text-xs font-semibold text-slate-700"
              >
                Nomor Pojok
              </label>
              <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-[#FFEB00] text-slate-900 border border-amber-400/70">
                Kuning
              </span>
            </div>
            <input
              id={`catatan-kanan-${item.id}`}
              type="text"
              inputMode="numeric"
              value={item.catatanKanan}
              onFocus={onFocus}
              onChange={(e) => onChange({ catatanKanan: e.target.value.replace(/[^\d]/g, '') })}
              placeholder="12"
              className="w-full rounded-lg border border-slate-300 bg-amber-50/40 px-3 py-2 text-sm font-bold text-slate-900 tabular-nums placeholder:font-normal placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </div>

        {/* Koli Ke & Dari (sesuai urutan pojok kanan: Koli Ke di atas, Dari di tengah) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={`koli-${item.id}`}
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Koli Ke (Nomor/Kode)
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
                placeholder="110"
                className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 tabular-nums placeholder:font-normal placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleIncrementKoli();
                }}
                title="Tambah +1 nomor Koli"
                className="inline-flex h-[38px] px-2 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 transition-colors flex-shrink-0"
              >
                <Plus className="w-3 h-3 mr-0.5" />1
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor={`dari-${item.id}`}
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Dari (Nomor/Kode)
            </label>
            <input
              id={`dari-${item.id}`}
              type="text"
              inputMode="numeric"
              value={item.dari}
              onFocus={onFocus}
              onChange={(e) => onChange({ dari: e.target.value })}
              placeholder="62"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 tabular-nums placeholder:font-normal placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
