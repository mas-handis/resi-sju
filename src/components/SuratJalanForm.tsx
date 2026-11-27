import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
  CopyCheck,
  FileText,
  MapPin,
  Package,
  Phone,
  Plus,
  Scale,
  Tag,
  Trash2,
  User,
} from 'lucide-react';
import {
  formatIndonesianNumber,
  formatShortDateId,
  parseIndonesianNumber,
  SURAT_JALAN_SENDER_PRESETS,
} from '../constants';
import {
  filterItemSuggestions,
  filterRecipientSuggestions,
} from '../services/backendSync';
import {
  SavedItemSuggestion,
  SavedRecipient,
  SenderHeader,
  SuratJalanData,
  SuratJalanRow,
} from '../types';
import {
  ItemSuggestionsDropdown,
  RecipientSuggestionsDropdown,
} from './AutocompleteSuggestions';
import { SenderHeaderCard } from './SenderHeaderCard';

interface SuratJalanFormProps {
  items: SuratJalanData[];
  activeId: string | null;
  sender: SenderHeader;
  hasResiData: boolean;
  savedRecipients?: SavedRecipient[];
  savedItems?: SavedItemSuggestion[];
  onSenderChange: (next: SenderHeader) => void;
  onFocus: (id: string) => void;
  onChange: (id: string, patch: Partial<SuratJalanData>) => void;
  onAdd: () => void;
  onDuplicate: (index: number) => void;
  onDelete: (id: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onCopyFromResi: (targetId: string) => void;
}

interface SuratJalanCardProps {
  data: SuratJalanData;
  index: number;
  total: number;
  isActive: boolean;
  isCollapsed: boolean;
  sender: SenderHeader;
  hasResiData: boolean;
  savedRecipients: SavedRecipient[];
  savedItems: SavedItemSuggestion[];
  onToggleCollapse: () => void;
  onFocus: () => void;
  onChange: (patch: Partial<SuratJalanData>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onCopyFromResi: () => void;
}

const SuratJalanCard: React.FC<SuratJalanCardProps> = ({
  data,
  index,
  total,
  isActive,
  isCollapsed,
  sender,
  hasResiData,
  savedRecipients,
  savedItems,
  onToggleCollapse,
  onFocus,
  onChange,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onCopyFromResi,
}) => {
  const [recipientFocused, setRecipientFocused] = useState(false);
  const [focusedRowItemId, setFocusedRowItemId] = useState<string | null>(null);
  const totalQty = data.rows.reduce(
    (sum, r) => sum + parseIndonesianNumber(r.qty),
    0
  );
  const totalKoli = data.rows.reduce(
    (sum, r) => sum + parseIndonesianNumber(r.jumlahKoli),
    0
  );

  const handleUpdateRow = (id: string, patch: Partial<SuratJalanRow>) => {
    onChange({
      rows: data.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    });
  };

  const handleAddRow = () => {
    onChange({
      rows: [
        ...data.rows,
        {
          id: crypto.randomUUID(),
          namaBarang: '',
          qty: '',
          jumlahKoli: '',
          keterangan: '',
        },
      ],
    });
  };

  const handleDeleteRow = (id: string) => {
    if (data.rows.length <= 1) {
      onChange({
        rows: [
          {
            id: crypto.randomUUID(),
            namaBarang: '',
            qty: '',
            jumlahKoli: '',
            keterangan: '',
          },
        ],
      });
      return;
    }
    onChange({
      rows: data.rows.filter((r) => r.id !== id),
    });
  };

  const summaryLabel = [data.nomor.trim(), data.kepada.trim()]
    .filter(Boolean)
    .join(' • ');

  return (
    <div
      id={`sj-card-${data.id}`}
      onClick={onFocus}
      className={`rounded-2xl border bg-white/75 dark:bg-white/[0.06] backdrop-blur-xl transition-all overflow-hidden ${
        isActive
          ? 'border-orange-400/80 ring-2 ring-orange-500/20 shadow-[0_8px_32px_rgba(249,115,22,0.14)] dark:border-orange-400/70 dark:ring-orange-500/25 dark:shadow-[0_8px_32px_rgba(249,115,22,0.18)]'
          : 'border-emerald-200/80 hover:border-emerald-400/70 shadow-[0_8px_28px_rgba(16,185,129,0.08)] dark:border-white/15 dark:hover:border-emerald-400/50 dark:shadow-[0_8px_28px_rgba(0,0,0,0.28)]'
      }`}
    >
      {/* Card Header: Surat Jalan #N + Duplicate / Move / Delete / Collapse */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500/15 to-orange-500/10 border-b border-emerald-200/70 dark:from-emerald-500/20 dark:to-orange-500/15 dark:border-white/10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onFocus();
            onToggleCollapse();
          }}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
          title={isCollapsed ? 'Buka formulir Surat Jalan ini' : 'Ciutkan formulir'}
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-xs font-extrabold text-white shadow-sm flex-shrink-0">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                Surat Jalan #{index + 1}
              </span>
              <span className="text-[11px] font-medium text-emerald-700/80 dark:text-emerald-200/80 flex-shrink-0">
                • Hal. {index + 1}
              </span>
            </div>
            {isCollapsed && summaryLabel && (
              <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                {summaryLabel}
              </p>
            )}
          </div>
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-300 flex-shrink-0" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-500 dark:text-slate-300 flex-shrink-0" />
          )}
        </button>

        <div className="flex items-center gap-1 flex-shrink-0">
          {total > 1 && (
            <div className="flex items-center mr-0.5">
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
            title="Duplikat Surat Jalan ini ke halaman A4 baru"
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
            title={total === 1 ? 'Kosongkan isian Surat Jalan' : 'Hapus Surat Jalan ini'}
            className="p-1.5 rounded-full text-rose-600 hover:text-rose-700 hover:bg-rose-500/15 dark:text-rose-300 dark:hover:text-white dark:hover:bg-rose-500/30 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-3.5 space-y-3.5">
          {/* Quick Import from Resi */}
          {hasResiData && (
            <button
              type="button"
              onClick={onCopyFromResi}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-orange-300 bg-orange-50/85 backdrop-blur-md px-3 py-2 text-xs font-bold text-orange-800 hover:bg-orange-100/90 dark:border-orange-400/40 dark:bg-orange-500/15 dark:text-orange-200 dark:hover:bg-orange-500/25 dark:hover:text-white transition-colors"
            >
              <CopyCheck className="w-4 h-4 text-orange-500 dark:text-orange-400" />
              Ambil Data Tujuan &amp; Barang dari Resi #1
            </button>
          )}

      {/* 2. Informasi Surat Jalan */}
      <div className="rounded-2xl border border-emerald-200/80 bg-white/75 dark:border-white/15 dark:bg-white/[0.06] backdrop-blur-xl shadow-[0_8px_28px_rgba(16,185,129,0.08)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.28)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-emerald-500/15 to-orange-500/10 border-b border-emerald-200/70 dark:from-emerald-500/20 dark:to-orange-500/15 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
              <FileText className="w-3 h-3" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
              Info Surat Jalan
            </span>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-1">
              Nomor Surat Jalan
            </label>
            <input
              type="text"
              value={data.nomor}
              onChange={(e) => onChange({ nomor: e.target.value })}
              placeholder={
                sender.presetId === 'sju'
                  ? '01/SJU/AKBAR/X/2026'
                  : '15/SM/MAP/2026'
              }
              className="w-full rounded-lg border border-emerald-200/90 bg-white/90 px-3 py-2 text-sm font-bold text-slate-900 placeholder:text-slate-400 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-1 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Tanggal
              </label>
              <button
                type="button"
                onClick={() => onChange({ tanggal: formatShortDateId() })}
                className="text-[10px] font-bold text-orange-600 hover:text-orange-700 dark:text-orange-300 dark:hover:text-orange-200"
              >
                Hari Ini
              </button>
            </div>
            <input
              type="text"
              value={data.tanggal}
              onChange={(e) => onChange({ tanggal: e.target.value })}
              placeholder="26-Nov-26"
              className="w-full rounded-lg border border-emerald-200/90 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 placeholder:text-slate-400 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25"
            />
          </div>

          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-1">
              <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Pengirim (Opsional)
            </label>
            <input
              type="text"
              value={data.pengirim}
              onChange={(e) => onChange({ pengirim: e.target.value })}
              placeholder="Nama kurir / ekspedisi"
              className="w-full rounded-lg border border-emerald-200/90 bg-white/90 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25"
            />
          </div>
        </div>
      </div>

      {/* 3. Tujuan Pengiriman */}
      <div className="rounded-2xl border border-emerald-200/80 bg-white/75 dark:border-white/15 dark:bg-white/[0.06] backdrop-blur-xl shadow-[0_8px_28px_rgba(16,185,129,0.08)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.28)]">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border-b border-emerald-200/70 dark:from-emerald-500/20 dark:to-teal-500/15 dark:border-white/10 rounded-t-2xl">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500 text-white">
            <MapPin className="w-3 h-3" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
            Tujuan Pengiriman
          </span>
        </div>

        <div className="p-4 space-y-3">
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-200">
                Kepada (Nama Penerima / Instansi)
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
            <input
              type="text"
              value={data.kepada}
              onFocus={() => setRecipientFocused(true)}
              onBlur={() => setRecipientFocused(false)}
              onChange={(e) => {
                onChange({ kepada: e.target.value });
                setRecipientFocused(true);
              }}
              placeholder="Contoh: BU INA LAUNDRY / Hj. Kamila"
              className="w-full rounded-lg border border-emerald-200/90 bg-white/90 px-3 py-2 text-sm font-bold text-slate-900 placeholder:text-slate-400 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
            />
            <RecipientSuggestionsDropdown
              visible={recipientFocused}
              suggestions={filterRecipientSuggestions(savedRecipients, data.kepada)}
              onSelect={(rec) => {
                const nextRows =
                  data.rows.length > 0 &&
                  !data.rows[0].namaBarang.trim() &&
                  rec.lastItemName
                    ? data.rows.map((r, i) =>
                        i === 0 ? { ...r, namaBarang: rec.lastItemName } : r
                      )
                    : data.rows;
                onChange({
                  kepada: rec.recipientName,
                  alamat: rec.address || data.alamat,
                  telepon: rec.phone || data.telepon,
                  rows: nextRows,
                });
                setRecipientFocused(false);
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-1">
              Alamat Lengkap
            </label>
            <textarea
              rows={2}
              value={data.alamat}
              onChange={(e) => onChange({ alamat: e.target.value })}
              placeholder="Jl. Inspeksi Kanal Selatan II No. 80..."
              className="w-full rounded-lg border border-emerald-200/90 bg-white/90 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 resize-y"
            />
          </div>

          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-1">
              <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Nomor Telepon / HP
            </label>
            <input
              type="tel"
              value={data.telepon}
              onChange={(e) => onChange({ telepon: e.target.value })}
              placeholder="0813-5513-1385"
              className="w-full rounded-lg border border-emerald-200/90 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 placeholder:text-slate-400 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
            />
          </div>
        </div>
      </div>

      {/* 4. Daftar Barang */}
      <div className="rounded-2xl border border-orange-200/80 bg-white/75 dark:border-white/15 dark:bg-white/[0.06] backdrop-blur-xl shadow-[0_8px_28px_rgba(249,115,22,0.08)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.28)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-orange-500/15 to-amber-500/10 border-b border-orange-200/70 dark:from-orange-500/20 dark:to-amber-500/15 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-orange-500 to-amber-500 text-white">
              <Package className="w-3 h-3" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
              Daftar Barang ({data.rows.length} Baris)
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-orange-800 dark:text-orange-200">
            {totalQty > 0 && <span>QTY: {formatIndonesianNumber(totalQty)}</span>}
            {totalKoli > 0 && (
              <span className="rounded-full bg-orange-500/15 border border-orange-400/40 px-2 py-0.5 text-orange-900 dark:bg-orange-500/30 dark:text-white">
                {formatIndonesianNumber(totalKoli)} Koli
              </span>
            )}
          </div>
        </div>

        <div className="p-4 space-y-3">
          {data.rows.map((row, idx) => (
            <div
              key={row.id}
              className="rounded-xl border border-orange-200/75 bg-orange-50/55 dark:border-white/12 dark:bg-black/20 p-3 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-orange-900 dark:text-orange-200">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-orange-500 to-amber-500 text-[11px] font-black text-white">
                    {idx + 1}
                  </span>
                  Barang #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteRow(row.id)}
                  title="Hapus baris barang"
                  className="p-1 rounded-md text-rose-600 hover:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={row.namaBarang}
                  onFocus={() => setFocusedRowItemId(row.id)}
                  onBlur={() => setFocusedRowItemId(null)}
                  onChange={(e) => {
                    handleUpdateRow(row.id, { namaBarang: e.target.value });
                    setFocusedRowItemId(row.id);
                  }}
                  placeholder="Nama Barang (contoh: MAP RAPORT LAMA KARTON)"
                  className="w-full rounded-lg border border-orange-200/90 bg-white/90 px-3 py-1.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25"
                />
                <ItemSuggestionsDropdown
                  visible={focusedRowItemId === row.id}
                  suggestions={filterItemSuggestions(savedItems, row.namaBarang)}
                  onSelect={(s) => {
                    handleUpdateRow(row.id, { namaBarang: s.itemName });
                    setFocusedRowItemId(null);
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    QTY
                  </label>
                  <input
                    type="text"
                    value={row.qty}
                    onChange={(e) =>
                      handleUpdateRow(row.id, { qty: e.target.value })
                    }
                    placeholder="1.806"
                    className="w-full rounded-lg border border-orange-200/90 bg-white/90 px-3 py-1.5 text-sm font-bold text-slate-900 tabular-nums placeholder:text-slate-400 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Jumlah Koli
                  </label>
                  <input
                    type="text"
                    value={row.jumlahKoli}
                    onChange={(e) =>
                      handleUpdateRow(row.id, { jumlahKoli: e.target.value })
                    }
                    placeholder="18"
                    className="w-full rounded-lg border border-orange-200/90 bg-white/90 px-3 py-1.5 text-sm font-bold text-slate-900 tabular-nums placeholder:text-slate-400 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Keterangan
                </label>
                <textarea
                  rows={2}
                  value={row.keterangan}
                  onChange={(e) =>
                    handleUpdateRow(row.id, { keterangan: e.target.value })
                  }
                  placeholder="Contoh: 61 KOLI @ 110 PCS"
                  className="w-full rounded-lg border border-orange-200/90 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25 resize-y"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddRow}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-full border border-dashed border-orange-400/70 bg-orange-500/10 py-2 px-3 text-xs font-bold text-orange-700 hover:bg-orange-500/20 dark:border-orange-400/50 dark:bg-orange-500/15 dark:text-orange-200 dark:hover:bg-orange-500/25 dark:hover:text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Baris Barang
          </button>
        </div>
      </div>

      {/* 5. Pengaturan Ringkasan, Berat & Catatan */}
      <div className="rounded-2xl border border-emerald-200/80 bg-white/75 dark:border-white/15 dark:bg-white/[0.06] backdrop-blur-xl shadow-[0_8px_28px_rgba(16,185,129,0.08)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.28)] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50/70 border-b border-emerald-200/70 dark:bg-white/[0.05] dark:border-white/10">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500 text-white">
            <ClipboardList className="w-3 h-3" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
            Berat &amp; Catatan Tambahan
          </span>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                <Scale className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                Berat / Koli (Opsional)
              </label>
              <input
                type="text"
                value={data.beratPerKoli}
                onChange={(e) => onChange({ beratPerKoli: e.target.value })}
                placeholder="Berat @ 44 Kg"
                className="w-full rounded-lg border border-emerald-200/90 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-emerald-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                <Scale className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                Total Berat (Opsional)
              </label>
              <input
                type="text"
                value={data.totalBerat}
                onChange={(e) => onChange({ totalBerat: e.target.value })}
                placeholder="Total Berat 2.684 Kg"
                className="w-full rounded-lg border border-emerald-200/90 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-emerald-900 dark:text-emerald-200 mb-1">
              Note / Catatan Komplain
            </label>
            <textarea
              rows={2}
              value={data.catatan}
              onChange={(e) => onChange({ catatan: e.target.value })}
              className="w-full rounded-lg border border-emerald-200/90 bg-white/90 px-3 py-1.5 text-xs text-slate-900 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-emerald-400 focus:outline-none resize-y"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={data.showCopyLabels}
              onChange={(e) => onChange({ showCopyLabels: e.target.checked })}
              className="h-4 w-4 rounded border-emerald-300 bg-white dark:border-white/30 dark:bg-black/30 text-orange-500 focus:ring-orange-500"
            />
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Tag className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
              Tampilkan label merah COPY &amp; ASLI di pojok bawah
            </span>
          </label>
        </div>
      </div>
        </div>
      )}
    </div>
  );
};

export const SuratJalanForm: React.FC<SuratJalanFormProps> = ({
  items,
  activeId,
  sender,
  hasResiData,
  savedRecipients = [],
  savedItems = [],
  onSenderChange,
  onFocus,
  onChange,
  onAdd,
  onDuplicate,
  onDelete,
  onMove,
  onCopyFromResi,
}) => {
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (activeId) {
      setCollapsedMap((prev) => (prev[activeId] ? { ...prev, [activeId]: false } : prev));
    }
  }, [activeId]);

  return (
    <div className="space-y-4">
      {/* 1. Kop Pengirim (SM & SJU) */}
      <SenderHeaderCard
        sender={sender}
        onChange={onSenderChange}
        presets={SURAT_JALAN_SENDER_PRESETS}
      />

      {/* Surat Jalan Cards List */}
      <div className="space-y-3.5">
        {items.map((item, idx) => (
          <SuratJalanCard
            key={item.id}
            data={item}
            index={idx}
            total={items.length}
            isActive={activeId === item.id}
            isCollapsed={Boolean(collapsedMap[item.id])}
            sender={sender}
            hasResiData={hasResiData}
            savedRecipients={savedRecipients}
            savedItems={savedItems}
            onToggleCollapse={() =>
              setCollapsedMap((prev) => ({
                ...prev,
                [item.id]: !prev[item.id],
              }))
            }
            onFocus={() => onFocus(item.id)}
            onChange={(patch) => onChange(item.id, patch)}
            onDuplicate={() => onDuplicate(idx)}
            onDelete={() => onDelete(item.id)}
            onMoveUp={() => onMove(idx, -1)}
            onMoveDown={() => onMove(idx, 1)}
            onCopyFromResi={() => onCopyFromResi(item.id)}
          />
        ))}
      </div>

      {/* Add New Manual Surat Jalan CTA */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onAdd}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-400/60 dark:border-emerald-400/50 bg-emerald-50/80 dark:bg-emerald-500/10 backdrop-blur-md py-3 px-4 text-sm font-bold text-emerald-800 dark:text-emerald-200 hover:border-emerald-600 dark:hover:border-emerald-400 hover:bg-emerald-100/80 dark:hover:bg-emerald-500/20 dark:hover:text-white transition-all"
        >
          <Plus className="w-4 h-4" />
          Tambah Surat Jalan Baru ({items.length} Hal. A4)
        </button>
        <p className="mt-2 text-center text-[11px] text-slate-600 dark:text-slate-400">
          Klik <span className="font-semibold text-emerald-700 dark:text-emerald-300">Duplikat</span> untuk menyalin isi kertas, atau tombol di atas untuk mengisi manual dari awal.
        </p>
      </div>
    </div>
  );
};
