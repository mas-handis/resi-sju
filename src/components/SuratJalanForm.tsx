import React from 'react';
import {
  Calendar,
  ClipboardList,
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
import { SenderHeader, SuratJalanData, SuratJalanRow } from '../types';
import { SenderHeaderCard } from './SenderHeaderCard';

interface SuratJalanFormProps {
  data: SuratJalanData;
  sender: SenderHeader;
  hasResiData: boolean;
  onSenderChange: (next: SenderHeader) => void;
  onChange: (patch: Partial<SuratJalanData>) => void;
  onCopyFromResi: () => void;
}

export const SuratJalanForm: React.FC<SuratJalanFormProps> = ({
  data,
  sender,
  hasResiData,
  onSenderChange,
  onChange,
  onCopyFromResi,
}) => {
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

  return (
    <div className="space-y-4">
      {/* 1. Kop Pengirim (SM & SJU) */}
      <SenderHeaderCard
        sender={sender}
        onChange={onSenderChange}
        presets={SURAT_JALAN_SENDER_PRESETS}
      />

      {/* Quick Import from Resi */}
      {hasResiData && (
        <button
          type="button"
          onClick={onCopyFromResi}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-300 bg-orange-50/85 backdrop-blur-md px-3.5 py-2.5 text-xs font-bold text-orange-800 hover:bg-orange-100/90 dark:border-orange-400/40 dark:bg-orange-500/15 dark:text-orange-200 dark:hover:bg-orange-500/25 dark:hover:text-white transition-colors"
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
      <div className="rounded-2xl border border-emerald-200/80 bg-white/75 dark:border-white/15 dark:bg-white/[0.06] backdrop-blur-xl shadow-[0_8px_28px_rgba(16,185,129,0.08)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.28)] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border-b border-emerald-200/70 dark:from-emerald-500/20 dark:to-teal-500/15 dark:border-white/10">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500 text-white">
            <MapPin className="w-3 h-3" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
            Tujuan Pengiriman
          </span>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-1">
              Kepada (Nama Penerima / Instansi)
            </label>
            <input
              type="text"
              value={data.kepada}
              onChange={(e) => onChange({ kepada: e.target.value })}
              placeholder="Contoh: BU INA LAUNDRY / Hj. Kamila"
              className="w-full rounded-lg border border-emerald-200/90 bg-white/90 px-3 py-2 text-sm font-bold text-slate-900 placeholder:text-slate-400 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
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

              <div>
                <input
                  type="text"
                  value={row.namaBarang}
                  onChange={(e) =>
                    handleUpdateRow(row.id, { namaBarang: e.target.value })
                  }
                  placeholder="Nama Barang (contoh: MAP RAPORT LAMA KARTON)"
                  className="w-full rounded-lg border border-orange-200/90 bg-white/90 px-3 py-1.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25"
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
  );
};
