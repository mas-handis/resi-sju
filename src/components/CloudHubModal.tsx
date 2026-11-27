import React, { useMemo, useState } from 'react';
import {
  BookUser,
  ClipboardList,
  History,
  Loader2,
  MapPin,
  Package,
  Phone,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { AppMode, SavedRecipient, ShipmentRecord } from '../types';

export type CloudHubTab = 'addresses' | 'history';

interface CloudHubModalProps {
  isOpen: boolean;
  initialTab?: CloudHubTab;
  onClose: () => void;
  recipients: SavedRecipient[];
  history: ShipmentRecord[];
  appMode: AppMode;
  onSaveRecipientManual: (input: {
    recipientName: string;
    address: string;
    phone: string;
    lastItemName: string;
  }) => Promise<void>;
  onUseRecipient: (recipient: SavedRecipient) => void;
  onDeleteRecipient: (id: string) => Promise<void>;
  onLoadRecord: (record: ShipmentRecord) => void;
  onDeleteRecord: (id: string) => Promise<void>;
}

export const CloudHubModal: React.FC<CloudHubModalProps> = ({
  isOpen,
  initialTab = 'addresses',
  onClose,
  recipients,
  history,
  appMode,
  onSaveRecipientManual,
  onUseRecipient,
  onDeleteRecipient,
  onLoadRecord,
  onDeleteRecord,
}) => {
  const [activeTab, setActiveTab] = useState<CloudHubTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | AppMode>('all');

  // Manual address creation form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newItem, setNewItem] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const filteredRecipients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter(
      (r) =>
        r.recipientName.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q) ||
        r.lastItemName.toLowerCase().includes(q)
    );
  }, [recipients, searchQuery]);

  const filteredHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return history.filter((h) => {
      if (historyFilter !== 'all' && h.docType !== historyFilter) return false;
      if (!q) return true;
      return (
        h.title.toLowerCase().includes(q) ||
        h.recipientSummary.toLowerCase().includes(q)
      );
    });
  }, [history, historyFilter, searchQuery]);

  if (!isOpen) return null;

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || savingManual) return;
    setSavingManual(true);
    try {
      await onSaveRecipientManual({
        recipientName: newName.trim(),
        address: newAddress.trim(),
        phone: newPhone.trim(),
        lastItemName: newItem.trim(),
      });
      setNewName('');
      setNewAddress('');
      setNewPhone('');
      setNewItem('');
      setShowAddForm(false);
    } finally {
      setSavingManual(false);
    }
  };

  const formatDateTime = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl border border-emerald-200/80 dark:border-white/15 bg-white/95 dark:bg-[#0D1E18]/95 backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.4)] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 bg-gradient-to-r from-emerald-500/15 to-orange-500/15 dark:from-emerald-500/20 dark:to-orange-500/15 border-b border-emerald-200/70 dark:border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-orange-500 text-white flex items-center justify-center shadow-sm flex-shrink-0">
              <BookUser className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                Riwayat Penggunaan &amp; Buku Alamat
              </h2>
              <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 truncate">
                Rekomendasi alamat otomatis &amp; arsip pengiriman tersimpan di perangkat
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-500 hover:text-slate-900 hover:bg-emerald-500/15 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/15 transition-colors"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 bg-emerald-50/60 dark:bg-black/20 border-b border-emerald-200/60 dark:border-white/10 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('addresses')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'addresses'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10'
            }`}
          >
            <BookUser className="w-3.5 h-3.5" />
            Buku Alamat ({recipients.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Riwayat Pengiriman ({history.length})
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-4">
          {activeTab === 'addresses' && (
            <>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama sekolah, toko, alamat, atau no HP..."
                    className="w-full rounded-xl border border-emerald-200 dark:border-white/15 bg-white dark:bg-black/25 pl-9 pr-3 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-orange-400 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddForm((v) => !v)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:from-emerald-400 hover:to-teal-400 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Alamat Manual
                </button>
              </div>

              {showAddForm && (
                <form
                  onSubmit={handleManualSubmit}
                  className="rounded-xl border border-emerald-200 dark:border-white/15 bg-emerald-50/70 dark:bg-white/[0.05] p-3.5 space-y-2.5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                        Nama Penerima / Instansi *
                      </label>
                      <input
                        type="text"
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Contoh: TK ABA Kauman Yogyakarta"
                        className="w-full rounded-lg border border-emerald-200 dark:border-white/15 bg-white dark:bg-black/25 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                        Nomor HP / Telepon
                      </label>
                      <input
                        type="text"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="0812-3456-7890"
                        className="w-full rounded-lg border border-emerald-200 dark:border-white/15 bg-white dark:bg-black/25 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                      Alamat Lengkap
                    </label>
                    <textarea
                      rows={2}
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      placeholder="Jl. Kauman GM I/163, Yogyakarta"
                      className="w-full rounded-lg border border-emerald-200 dark:border-white/15 bg-white dark:bg-black/25 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                        Pesanan Biasanya (Opsional)
                      </label>
                      <input
                        type="text"
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        placeholder="BUKU PAKET KELOMPOK A"
                        className="w-full rounded-lg border border-emerald-200 dark:border-white/15 bg-white dark:bg-black/25 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={savingManual}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-orange-400 disabled:opacity-50"
                    >
                      {savingManual && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Simpan Alamat
                    </button>
                  </div>
                </form>
              )}

              {filteredRecipients.length === 0 ? (
                <div className="rounded-xl border border-dashed border-emerald-200 dark:border-white/15 p-8 text-center">
                  <BookUser className="w-8 h-8 mx-auto text-emerald-500/70 mb-2" />
                  <p className="text-sm font-bold text-slate-800 dark:text-white">
                    Belum ada alamat tersimpan
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Alamat yang Anda cetak, unduh PDF/Excel, atau simpan otomatis akan muncul di sini dan direkomendasikan saat mengetik.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRecipients.map((rec) => (
                    <div
                      key={rec.id}
                      className="rounded-xl border border-emerald-200/80 dark:border-white/12 bg-white dark:bg-white/[0.04] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {rec.recipientName}
                          </span>
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500/15 dark:bg-orange-500/25 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:text-orange-200 flex-shrink-0">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            Dipakai {rec.useCount}x
                          </span>
                        </div>
                        {rec.address && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 pl-5">
                            {rec.address.replace(/\n/g, ', ')}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 pl-5 text-[11px] text-slate-500 dark:text-slate-400">
                          {rec.phone && (
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-medium">
                              <Phone className="w-3 h-3" />
                              {rec.phone}
                            </span>
                          )}
                          {rec.lastItemName && (
                            <span className="inline-flex items-center gap-1">
                              <Package className="w-3 h-3 text-orange-500" />
                              {rec.lastItemName}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onUseRecipient(rec);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 text-xs font-bold text-white hover:from-emerald-400 hover:to-teal-400 transition-all shadow-xs"
                        >
                          Pakai ke {appMode === 'surat_jalan' ? 'Surat Jalan' : 'Resi'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDeleteRecipient(rec.id)}
                          title="Hapus alamat"
                          className="p-1.5 rounded-full text-rose-600 hover:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'history' && (
            <>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nomor surat jalan atau penerima..."
                    className="w-full rounded-xl border border-emerald-200 dark:border-white/15 bg-white dark:bg-black/25 pl-9 pr-3 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-orange-400 focus:outline-none"
                  />
                </div>
                <div className="inline-flex rounded-xl border border-emerald-200 dark:border-white/15 bg-emerald-50/60 dark:bg-black/20 p-1">
                  {(['all', 'resi', 'surat_jalan'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setHistoryFilter(f)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                        historyFilter === f
                          ? 'bg-orange-500 text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {f === 'all' ? 'Semua' : f === 'resi' ? 'Resi' : 'Surat Jalan'}
                    </button>
                  ))}
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="rounded-xl border border-dashed border-orange-200 dark:border-white/15 p-8 text-center">
                  <History className="w-8 h-8 mx-auto text-orange-500/70 mb-2" />
                  <p className="text-sm font-bold text-slate-800 dark:text-white">
                    Belum ada riwayat tersimpan
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Klik tombol <span className="font-bold">Simpan</span> di header untuk menyimpan batch Resi atau Surat Jalan agar bisa dicetak ulang kapan saja.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredHistory.map((rec) => (
                    <div
                      key={rec.id}
                      className="rounded-xl border border-emerald-200/80 dark:border-white/12 bg-white dark:bg-white/[0.04] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${
                              rec.docType === 'surat_jalan'
                                ? 'bg-orange-500'
                                : 'bg-emerald-500'
                            }`}
                          >
                            {rec.docType === 'surat_jalan' ? (
                              <ClipboardList className="w-3 h-3" />
                            ) : (
                              <Package className="w-3 h-3" />
                            )}
                            {rec.docType === 'surat_jalan' ? 'Surat Jalan' : 'Resi'}
                          </span>
                          <span className="rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-200">
                            {rec.presetId === 'sju' ? 'SJU' : 'Suara Muhammadiyah'}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {formatDateTime(rec.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {rec.title}
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300">
                          {rec.itemCount}{' '}
                          {rec.docType === 'surat_jalan' ? 'lembar' : 'resi'}
                          {rec.totalKoli > 0 ? ` • ${rec.totalKoli} Koli` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onLoadRecord(rec);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:from-orange-400 hover:to-amber-400 transition-all shadow-xs"
                        >
                          Muat ke Editor
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDeleteRecord(rec.id)}
                          title="Hapus riwayat"
                          className="p-1.5 rounded-full text-rose-600 hover:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
