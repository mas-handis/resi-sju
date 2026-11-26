import React, { useRef, useState } from 'react';
import { Building2, Lock, Pencil, RotateCcw, Upload, X } from 'lucide-react';
import { SENDER_PRESETS } from '../constants';
import { SenderHeader, SenderPresetId } from '../types';
import { SuaraMuhammadiyahLogo } from './SuaraMuhammadiyahLogo';

interface SenderHeaderCardProps {
  sender: SenderHeader;
  onChange: (next: SenderHeader) => void;
  presets?: Record<SenderPresetId, SenderHeader>;
}

const PRESET_OPTIONS: { id: SenderPresetId; label: string; shortLabel: string }[] = [
  { id: 'sm', label: 'Suara Muhammadiyah', shortLabel: 'Suara Muhammadiyah' },
  { id: 'sju', label: 'Surya Jaya Utomo (SJU)', shortLabel: 'SJU' },
];

export const SenderHeaderCard: React.FC<SenderHeaderCardProps> = ({
  sender,
  onChange,
  presets = SENDER_PRESETS,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectPreset = (presetId: SenderPresetId) => {
    onChange({ ...presets[presetId] });
    setIsEditing(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange({ ...sender, logoDataUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="rounded-xl border border-emerald-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200/80">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-emerald-600 text-white">
            <Lock className="w-3 h-3" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
            Kop Pengirim
          </span>
          <span className="inline-flex items-center rounded-full bg-emerald-600/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
            2 Opsi
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200 hover:bg-white hover:text-emerald-900 transition-colors"
        >
          {isEditing ? (
            <>
              <X className="w-3.5 h-3.5" />
              Selesai
            </>
          ) : (
            <>
              <Pencil className="w-3 h-3" />
              Sesuaikan
            </>
          )}
        </button>
      </div>

      {/* 2-Option Kop Pengirim Switcher (SM vs SJU) */}
      <div className="px-3.5 pt-3 pb-2 bg-emerald-50/30 border-b border-emerald-100">
        <div
          className="grid grid-cols-2 gap-1.5 rounded-lg bg-emerald-100/70 p-1"
          role="group"
          aria-label="Pilih Kop Pengirim"
        >
          {PRESET_OPTIONS.map((opt) => {
            const active = sender.presetId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectPreset(opt.id)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold transition-all ${
                  active
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-900 hover:bg-white/70'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!isEditing ? (
        <div className="p-3.5 flex items-center gap-3">
          <SuaraMuhammadiyahLogo
            presetId={sender.presetId}
            logoDataUrl={sender.logoDataUrl}
            height={sender.presetId === 'sju' ? 30 : 38}
            maxWidth={sender.presetId === 'sju' ? 145 : 110}
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 truncate">{sender.title}</p>
            <p className="text-[11px] font-medium text-slate-600 truncate mt-0.5">
              {sender.address}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {sender.phone ? `Telp. ${sender.phone}` : ''}
              {sender.phone && sender.email ? ' • ' : ''}
              {sender.email}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-3 bg-slate-50/40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <SuaraMuhammadiyahLogo
                presetId={sender.presetId}
                logoDataUrl={sender.logoDataUrl}
                height={32}
                maxWidth={130}
              />
              <div className="flex items-center gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Ganti Logo
                </button>
                {sender.logoDataUrl && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...sender, logoDataUrl: null })}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-500 hover:text-red-600"
                  >
                    Hapus Logo
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange({ ...SENDER_PRESETS[sender.presetId] })}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
              title="Kembalikan ke default pilihan kop ini"
            >
              <RotateCcw className="w-3 h-3" />
              Default
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Nama Pengirim
              </label>
              <input
                type="text"
                value={sender.title}
                onChange={(e) => onChange({ ...sender, title: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Alamat
              </label>
              <input
                type="text"
                value={sender.address}
                onChange={(e) => onChange({ ...sender, address: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Telepon / HP
                </label>
                <input
                  type="text"
                  value={sender.phone}
                  onChange={(e) => onChange({ ...sender, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Email (Opsional)
                </label>
                <input
                  type="text"
                  value={sender.email}
                  onChange={(e) => onChange({ ...sender, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
