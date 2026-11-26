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
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-xs font-bold text-indigo-800 hover:bg-indigo-100 transition-colors shadow-xs"
        >
          <CopyCheck className="w-4 h-4 text-indigo-600" />
          Ambil Data Tujuan &amp; Barang dari Resi #1
        </button>
      )}

      {/* 2. Informasi Surat Jalan */}
      <div className="rounded-xl border border-indigo-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-indigo-50 to-sky-50 border-b border-indigo-200/80">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-indigo-600 text-white">
              <FileText className="w-3 h-3" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-950">
              Info Surat Jalan
            </span>
          </div>
          <span className="text-[11px] font-semibold text-indigo-700">
            2 Lembar / Hal. A4
          </span>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-800 mb-1">
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
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-1 text-xs font-bold text-slate-800">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                Tanggal
              </label>
              <button
                type="button"
                onClick={() => onChange({ tanggal: formatShortDateId() })}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
              >
                Hari Ini
              </button>
            </div>
            <input
              type="text"
              value={data.tanggal}
              onChange={(e) => onChange({ tanggal: e.target.value })}
              placeholder="26-Nov-26"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-slate-800 mb-1">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              Pengirim (Opsional)
            </label>
            <input
              type="text"
              value={data.pengirim}
              onChange={(e) => onChange({ pengirim: e.target.value })}
              placeholder="Nama kurir / ekspedisi"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      </div>

      {/* 3. Tujuan Pengiriman */}
      <div className="rounded-xl border border-sky-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-50 to-cyan-50 border-b border-sky-200/80">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-sky-600 text-white">
            <MapPin className="w-3 h-3" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-sky-950">
            Tujuan Pengiriman
          </span>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Kepada (Nama Penerima / Instansi)
            </label>
            <input
              type="text"
              value={data.kepada}
              onChange={(e) => onChange({ kepada: e.target.value })}
              placeholder="Contoh: BU INA LAUNDRY / Hj. Kamila"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Alamat Lengkap
            </label>
            <textarea
              rows={2}
              value={data.alamat}
              onChange={(e) => onChange({ alamat: e.target.value })}
              placeholder="Jl. Inspeksi Kanal Selatan II No. 80..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-y"
            />
          </div>

          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-slate-800 mb-1">
              <Phone className="w-3.5 h-3.5 text-sky-600" />
              Nomor Telepon / HP
            </label>
            <input
              type="tel"
              value={data.telepon}
              onChange={(e) => onChange({ telepon: e.target.value })}
              placeholder="0813-5513-1385"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
        </div>
      </div>

      {/* 4. Daftar Barang */}
      <div className="rounded-xl border border-amber-300/80 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-200">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-amber-500 text-slate-950">
              <Package className="w-3 h-3" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-950">
              Daftar Barang ({data.rows.length} Baris)
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-amber-900">
            {totalQty > 0 && <span>QTY: {formatIndonesianNumber(totalQty)}</span>}
            {totalKoli > 0 && (
              <span className="rounded bg-amber-200/80 px-1.5 py-0.5">
                {formatIndonesianNumber(totalKoli)} Koli
              </span>
            )}
          </div>
        </div>

        <div className="p-4 space-y-3">
          {data.rows.map((row, idx) => (
            <div
              key={row.id}
              className="rounded-xl border border-amber-200/90 bg-amber-50/40 p-3 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-950">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-amber-400 text-[11px] font-black text-slate-950">
                    {idx + 1}
                  </span>
                  Barang #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteRow(row.id)}
                  title="Hapus baris barang"
                  className="p-1 rounded-md text-rose-500 hover:bg-rose-50 transition-colors"
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
                  className="w-full rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/25"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    QTY
                  </label>
                  <input
                    type="text"
                    value={row.qty}
                    onChange={(e) =>
                      handleUpdateRow(row.id, { qty: e.target.value })
                    }
                    placeholder="1.806"
                    className="w-full rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-900 tabular-nums focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/25"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Jumlah Koli
                  </label>
                  <input
                    type="text"
                    value={row.jumlahKoli}
                    onChange={(e) =>
                      handleUpdateRow(row.id, { jumlahKoli: e.target.value })
                    }
                    placeholder="18"
                    className="w-full rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-900 tabular-nums focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/25"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Keterangan
                </label>
                <textarea
                  rows={2}
                  value={row.keterangan}
                  onChange={(e) =>
                    handleUpdateRow(row.id, { keterangan: e.target.value })
                  }
                  placeholder="Contoh: 61 KOLI @ 110 PCS"
                  className="w-full rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/25 resize-y"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddRow}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-amber-400 bg-amber-50/70 py-2 px-3 text-xs font-bold text-amber-900 hover:bg-amber-100/70 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Baris Barang
          </button>
        </div>
      </div>

      {/* 5. Pengaturan Ringkasan, Berat & Catatan */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-700 text-white">
            <ClipboardList className="w-3 h-3" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Berat &amp; Catatan Tambahan
          </span>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 mb-1">
                <Scale className="w-3 h-3 text-slate-500" />
                Berat / Koli (Opsional)
              </label>
              <input
                type="text"
                value={data.beratPerKoli}
                onChange={(e) => onChange({ beratPerKoli: e.target.value })}
                placeholder="Berat @ 44 Kg"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 mb-1">
                <Scale className="w-3 h-3 text-slate-500" />
                Total Berat (Opsional)
              </label>
              <input
                type="text"
                value={data.totalBerat}
                onChange={(e) => onChange({ totalBerat: e.target.value })}
                placeholder="Total Berat 2.684 Kg"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Note / Catatan Komplain
            </label>
            <textarea
              rows={2}
              value={data.catatan}
              onChange={(e) => onChange({ catatan: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none resize-y"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={data.showCopyLabels}
              onChange={(e) => onChange({ showCopyLabels: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Tag className="w-3.5 h-3.5 text-rose-500" />
              Tampilkan label merah COPY &amp; ASLI di pojok bawah
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};
