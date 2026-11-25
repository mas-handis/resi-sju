import React, { useRef, useState } from 'react';
import { Lock, Pencil, RotateCcw, Upload, X } from 'lucide-react';
import { DEFAULT_SENDER_HEADER } from '../constants';
import { SenderHeader } from '../types';
import { SuaraMuhammadiyahLogo } from './SuaraMuhammadiyahLogo';

interface SenderHeaderCardProps {
  sender: SenderHeader;
  onChange: (next: SenderHeader) => void;
}

export const SenderHeaderCard: React.FC<SenderHeaderCardProps> = ({ sender, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Kop Pengirim
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-medium text-slate-600">
            Otomatis
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing((prev) => !prev)}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
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

      {!isEditing ? (
        <div className="p-3.5 flex items-center gap-3">
          <SuaraMuhammadiyahLogo logoDataUrl={sender.logoDataUrl} height={36} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800 truncate">{sender.address}</p>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              Telp. {sender.phone} • {sender.email}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-3 bg-slate-50/40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <SuaraMuhammadiyahLogo logoDataUrl={sender.logoDataUrl} height={34} />
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
              onClick={() => onChange(DEFAULT_SENDER_HEADER)}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
              title="Kembalikan ke default Suara Muhammadiyah"
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
                  Telepon
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
                  Email
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
