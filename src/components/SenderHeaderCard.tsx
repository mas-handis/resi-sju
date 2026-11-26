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
    <div className="rounded-2xl border border-emerald-200/80 bg-white/75 dark:border-white/15 dark:bg-white/[0.07] backdrop-blur-xl shadow-[0_8px_32px_rgba(16,185,129,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-emerald-500/15 to-orange-500/10 dark:from-emerald-500/20 dark:to-orange-500/15 border-b border-emerald-200/70 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-xs">
            <Lock className="w-3 h-3" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
            Kop Pengirim
          </span>
          <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/25 dark:border-emerald-400/30 dark:text-emerald-200">
            2 Opsi
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-full bg-white/75 px-2.5 py-1 text-xs font-semibold text-orange-700 border border-orange-200 hover:bg-white dark:bg-white/10 dark:text-orange-200 dark:border-white/15 dark:hover:bg-white/20 dark:hover:text-white transition-colors"
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
      <div className="px-3.5 pt-3 pb-2 bg-emerald-50/60 border-b border-emerald-200/70 dark:bg-black/15 dark:border-white/10">
        <div
          className="grid grid-cols-2 gap-1.5 rounded-full bg-white/80 p-1 border border-emerald-200/80 dark:bg-black/30 dark:border-white/10"
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
                className={`inline-flex items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold transition-all ${
                  active
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_3px_12px_rgba(16,185,129,0.35)]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-emerald-100/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10'
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
          <div className="rounded-xl bg-white p-1.5 border border-slate-200/80 dark:border-transparent shadow-sm flex-shrink-0">
            <SuaraMuhammadiyahLogo
              presetId={sender.presetId}
              logoDataUrl={sender.logoDataUrl}
              height={sender.presetId === 'sju' ? 28 : 34}
              maxWidth={sender.presetId === 'sju' ? 136 : 102}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{sender.title}</p>
            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate mt-0.5">
              {sender.address}
            </p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 truncate">
              {sender.phone ? `Telp. ${sender.phone}` : ''}
              {sender.phone && sender.email ? ' • ' : ''}
              {sender.email}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-3 bg-emerald-50/40 dark:bg-black/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-white p-1 border border-slate-200/80 dark:border-transparent">
                <SuaraMuhammadiyahLogo
                  presetId={sender.presetId}
                  logoDataUrl={sender.logoDataUrl}
                  height={28}
                  maxWidth={110}
                />
              </div>
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
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/85 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-white dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Ganti Logo
                </button>
                {sender.logoDataUrl && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...sender, logoDataUrl: null })}
                    className="rounded-full border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700 hover:bg-rose-100 dark:border-rose-400/30 dark:bg-rose-500/20 dark:text-rose-200 dark:hover:bg-rose-500/30"
                  >
                    Hapus Logo
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange({ ...presets[sender.presetId] })}
              className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700 dark:text-orange-300 dark:hover:text-orange-200"
              title="Kembalikan ke default pilihan kop ini"
            >
              <RotateCcw className="w-3 h-3" />
              Default
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-emerald-800 dark:text-emerald-200 mb-1">
                Nama Pengirim
              </label>
              <input
                type="text"
                value={sender.title}
                onChange={(e) => onChange({ ...sender, title: e.target.value })}
                className="w-full rounded-lg border border-emerald-200/90 bg-white/90 px-2.5 py-1.5 text-xs text-slate-900 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-emerald-800 dark:text-emerald-200 mb-1">
                Alamat
              </label>
              <input
                type="text"
                value={sender.address}
                onChange={(e) => onChange({ ...sender, address: e.target.value })}
                className="w-full rounded-lg border border-emerald-200/90 bg-white/90 px-2.5 py-1.5 text-xs text-slate-900 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-emerald-800 dark:text-emerald-200 mb-1">
                  Telepon / HP
                </label>
                <input
                  type="text"
                  value={sender.phone}
                  onChange={(e) => onChange({ ...sender, phone: e.target.value })}
                  className="w-full rounded-lg border border-emerald-200/90 bg-white/90 px-2.5 py-1.5 text-xs text-slate-900 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-emerald-800 dark:text-emerald-200 mb-1">
                  Email (Opsional)
                </label>
                <input
                  type="text"
                  value={sender.email}
                  onChange={(e) => onChange({ ...sender, email: e.target.value })}
                  className="w-full rounded-lg border border-emerald-200/90 bg-white/90 px-2.5 py-1.5 text-xs text-slate-900 dark:border-white/15 dark:bg-black/25 dark:text-white focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
