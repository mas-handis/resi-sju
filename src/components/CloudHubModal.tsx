import React, { useMemo, useState } from 'react';
import { User } from '@supabase/supabase-js';
import {
  BookUser,
  CheckCircle2,
  ClipboardList,
  Cloud,
  CloudOff,
  History,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  UploadCloud,
  UserPlus,
  X,
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { AppMode, SavedRecipient, ShipmentRecord } from '../types';

export type CloudHubTab = 'addresses' | 'history' | 'account';

interface CloudHubModalProps {
  isOpen: boolean;
  initialTab?: CloudHubTab;
  onClose: () => void;
  user: User | null;
  recipients: SavedRecipient[];
  history: ShipmentRecord[];
  isSyncing: boolean;
  appMode: AppMode;
  onRefreshCloud: () => Promise<void>;
  onSyncLocalToCloud: () => Promise<void>;
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
  user,
  recipients,
  history,
  isSyncing,
  appMode,
  onRefreshCloud,
  onSyncLocalToCloud,
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

  // Auth form
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setAuthMessage(null);
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

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !email.trim() || !password) return;
    setAuthLoading(true);
    setAuthMessage(null);
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setAuthMessage({
          type: 'success',
          text: 'Berhasil masuk! Data Cloud sedang disinkronkan.',
        });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (data.session) {
          setAuthMessage({
            type: 'success',
            text: 'Akun berhasil dibuat & langsung terhubung ke Supabase!',
          });
        } else {
          setAuthMessage({
            type: 'success',
            text: 'Pendaftaran berhasil! Silakan cek inbox email Anda untuk konfirmasi sebelum masuk.',
          });
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Gagal menghubungi server Supabase.';
      setAuthMessage({ type: 'error', text: msg });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    setAuthLoading(true);
    try {
      await supabase.auth.signOut();
      setAuthMessage({
        type: 'success',
        text: 'Berhasil keluar dari akun Cloud.',
      });
    } finally {
      setAuthLoading(false);
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
              {user ? <Cloud className="w-4 h-4" /> : <BookUser className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                Database Cloud &amp; Rekomendasi Alamat
              </h2>
              <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 truncate">
                {user
                  ? `Terhubung ke Supabase (${user.email})`
                  : 'Mode Lokal Aktif • Masuk akun Cloud untuk sinkronisasi antar perangkat'}
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
          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'account'
                ? 'bg-gradient-to-r from-emerald-500 to-orange-500 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10'
            }`}
          >
            {user ? <Cloud className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
            Akun Cloud
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

          {activeTab === 'account' && (
            <div className="space-y-4">
              {!isSupabaseConfigured ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
                  Konfigurasi Supabase (`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`) belum terpasang di environment build ini.
                </div>
              ) : user ? (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-400/30 bg-emerald-50/70 dark:bg-emerald-500/10 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        Sinkronisasi Cloud Aktif
                      </p>
                      <p className="text-xs text-emerald-800 dark:text-emerald-200">
                        Login sebagai <span className="font-bold">{user.email}</span>
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Semua buku alamat, rekomendasi barang, dan riwayat pengiriman tersimpan aman di database Supabase dengan Row Level Security (hanya akun Anda yang bisa mengakses).
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={() => void onRefreshCloud()}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                      />
                      Refresh Data Cloud
                    </button>
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={() => void onSyncLocalToCloud()}
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 dark:border-white/20 bg-white dark:bg-white/10 px-3.5 py-2 text-xs font-bold text-emerald-900 dark:text-white hover:bg-emerald-50 dark:hover:bg-white/20 disabled:opacity-50"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      Unggah Cache Lokal ke Cloud
                    </button>
                    <button
                      type="button"
                      disabled={authLoading}
                      onClick={() => void handleSignOut()}
                      className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 dark:border-rose-400/30 bg-rose-50 dark:bg-rose-500/20 px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-500/30"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Keluar
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleAuthSubmit}
                  className="rounded-2xl border border-emerald-200 dark:border-white/15 bg-white dark:bg-white/[0.04] p-4 sm:p-5 space-y-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {authMode === 'login'
                          ? 'Masuk ke Akun Supabase Cloud'
                          : 'Daftar Akun Supabase Baru'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Sinkronkan alamat &amp; riwayat pengiriman di semua komputer/HP admin &amp; gudang.
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex rounded-full bg-emerald-100/80 dark:bg-black/30 p-1 border border-emerald-200/70 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold ${
                        authMode === 'login'
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      Masuk
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('signup')}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold ${
                        authMode === 'signup'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Daftar Baru
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@suaramuhammadiyah.id"
                        className="w-full rounded-lg border border-emerald-200 dark:border-white/15 bg-white dark:bg-black/25 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-orange-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="w-full rounded-lg border border-emerald-200 dark:border-white/15 bg-white dark:bg-black/25 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-orange-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {authMessage && (
                    <div
                      className={`rounded-xl px-3 py-2 text-xs font-medium ${
                        authMessage.type === 'success'
                          ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-400/30'
                          : 'bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-400/30'
                      }`}
                    >
                      {authMessage.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-orange-500 px-5 py-2 text-xs font-extrabold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
                  >
                    {authLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {authMode === 'login' ? 'Masuk ke Cloud' : 'Buat Akun Cloud'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
