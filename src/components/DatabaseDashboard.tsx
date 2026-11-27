import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookUser,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Database,
  Eye,
  EyeOff,
  FileSpreadsheet,
  History,
  Lock,
  LogIn,
  LogOut,
  Moon,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { getKelompokColor, getResiBottomRows } from '../constants';
import {
  AppMode,
  ResiItem,
  SavedItemSuggestion,
  SavedRecipient,
  ShipmentActionType,
  ShipmentRecord,
  SuratJalanData,
} from '../types';
import { ADMIN_USERNAME, loginAdmin, logoutAdmin } from '../utils/adminAuth';
import {
  downloadDatabaseReportExcel,
  ExportPeriodMode,
  filterHistoryByPeriod,
  INDONESIAN_MONTHS,
} from '../utils/exportExcel';

type DbTableTab = 'history' | 'recipients' | 'items';

const ACTION_LABELS: Record<ShipmentActionType, string> = {
  save: 'Disimpan',
  print: 'Dicetak',
  pdf: 'Unduh PDF',
  excel: 'Unduh Excel',
};

interface DatabaseDashboardProps {
  themeMode: 'dark' | 'light';
  onToggleTheme: () => void;
  isAdmin: boolean;
  onAdminAuthChange: (loggedIn: boolean) => void;
  recipients: SavedRecipient[];
  items: SavedItemSuggestion[];
  history: ShipmentRecord[];
  isSyncing: boolean;
  isCloudConnected: boolean;
  onRefresh: () => Promise<void>;
  onDeleteRecipient: (id: string) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
  onBackToApp: () => void;
}

export const DatabaseDashboard: React.FC<DatabaseDashboardProps> = ({
  themeMode,
  onToggleTheme,
  isAdmin,
  onAdminAuthChange,
  recipients,
  items,
  history,
  isSyncing,
  isCloudConnected,
  onRefresh,
  onDeleteRecipient,
  onDeleteItem,
  onDeleteRecord,
  onBackToApp,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<DbTableTab>('history');
  const [searchQuery, setSearchQuery] = useState('');
  const [docFilter, setDocFilter] = useState<'all' | AppMode>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailRecord, setDetailRecord] = useState<ShipmentRecord | null>(null);

  // Excel Period Export state
  const now = new Date();
  const [exportMode, setExportMode] = useState<ExportPeriodMode>('month');
  const [exportMonth, setExportMonth] = useState<number>(() => now.getMonth() + 1);
  const [exportYear, setExportYear] = useState<number>(() => now.getFullYear());
  const [exportNotice, setExportNotice] = useState<{
    type: 'success' | 'info';
    text: string;
  } | null>(null);

  const availableYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    history.forEach((h) => {
      const y = new Date(h.createdAt).getFullYear();
      if (!Number.isNaN(y)) years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [history]);

  const periodHistory = useMemo(
    () =>
      filterHistoryByPeriod(history, {
        mode: exportMode,
        year: exportYear,
        month: exportMonth,
      }),
    [history, exportMode, exportYear, exportMonth]
  );

  const handleDownloadPeriodExcel = () => {
    if (periodHistory.length === 0) {
      const label =
        exportMode === 'month'
          ? `${INDONESIAN_MONTHS[exportMonth - 1]} ${exportYear}`
          : `Tahun ${exportYear}`;
      setExportNotice({
        type: 'info',
        text: `Belum ada transaksi pada ${label}. Pilih bulan/tahun lain yang memiliki data.`,
      });
      return;
    }

    const { filename, count } = downloadDatabaseReportExcel({
      history,
      recipients,
      items,
      mode: exportMode,
      year: exportYear,
      month: exportMonth,
    });
    setExportNotice({
      type: 'success',
      text: `Berhasil mengunduh ${filename} (${count} transaksi, 4 sheet lengkap & berwarna).`,
    });
  };

  const filteredHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return history.filter((rec) => {
      if (docFilter !== 'all' && rec.docType !== docFilter) return false;
      if (!q) return true;
      return (
        rec.title.toLowerCase().includes(q) ||
        rec.recipientSummary.toLowerCase().includes(q) ||
        rec.presetId.toLowerCase().includes(q)
      );
    });
  }, [history, docFilter, searchQuery]);

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

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.itemName.toLowerCase().includes(q));
  }, [items, searchQuery]);

  const resiCount = useMemo(
    () => history.filter((h) => h.docType === 'resi').length,
    [history]
  );
  const sjCount = useMemo(
    () => history.filter((h) => h.docType === 'surat_jalan').length,
    [history]
  );

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = loginAdmin(username, password);
    if (!res.ok) {
      setLoginError(res.error ?? 'Username atau Password salah.');
      return;
    }
    setLoginError(null);
    setPassword('');
    onAdminAuthChange(true);
    void onRefresh();
  };

  const handleLogout = () => {
    logoutAdmin();
    onAdminAuthChange(false);
    setUsername('');
    setPassword('');
    setDetailRecord(null);
    setConfirmDeleteId(null);
  };

  const handleConfirmedDelete = async (
    kind: DbTableTab,
    id: string
  ): Promise<void> => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      if (kind === 'history') await onDeleteRecord(id);
      else if (kind === 'recipients') await onDeleteRecipient(id);
      else await onDeleteItem(id);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
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
    <div className="relative min-h-screen flex flex-col bg-[#F3F8F5] dark:bg-[#08130F] text-slate-900 dark:text-slate-100 overflow-x-hidden transition-colors">
      {/* Ambient Green & Orange Glows for Glassmorphism */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-28 -left-24 h-96 w-96 rounded-full bg-emerald-400/30 dark:bg-emerald-500/25 blur-[110px]" />
        <div className="absolute top-1/3 left-1/3 h-80 w-80 rounded-full bg-orange-300/25 dark:bg-orange-500/15 blur-[120px]" />
        <div className="absolute -bottom-28 -right-20 h-96 w-96 rounded-full bg-orange-400/30 dark:bg-orange-500/25 blur-[115px]" />
      </div>

      {/* Top Glass Header */}
      <header className="sticky top-0 z-30 bg-white/75 dark:bg-[#0D1E18]/75 backdrop-blur-xl border-b border-emerald-200/80 dark:border-white/15 px-4 lg:px-6 py-3 flex items-center justify-between gap-3 shadow-[0_8px_32px_rgba(11,110,79,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-[0_4px_14px_rgba(249,115,22,0.35)]">
            <Database className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight truncate tracking-wide">
              DATABASE RESI GENERATOR
            </h1>
            <p className="text-[11px] sm:text-xs text-emerald-700 dark:text-emerald-300/90 truncate font-semibold">
              {isAdmin
                ? `Admin: ${ADMIN_USERNAME} • ${
                    isCloudConnected ? 'Terhubung ke Supabase' : 'Mode Lokal'
                  }`
                : 'Login Admin Diperlukan'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-white/15 bg-white/80 dark:bg-white/[0.08] backdrop-blur-md px-2.5 py-2 text-xs font-bold text-emerald-900 dark:text-amber-200 hover:bg-white dark:hover:bg-white/20 transition-colors"
            title={themeMode === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
          >
            {themeMode === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-300" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-emerald-700" />
            )}
          </button>

          {isAdmin && (
            <>
              <button
                type="button"
                disabled={isSyncing}
                onClick={() => void onRefresh()}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-white/15 bg-white/80 dark:bg-white/[0.08] backdrop-blur-md px-3 py-2 text-xs font-bold text-emerald-900 dark:text-white hover:bg-white dark:hover:bg-white/20 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Muat Ulang</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 dark:border-rose-400/30 bg-rose-50/90 dark:bg-rose-500/20 px-3 py-2 text-xs font-bold text-rose-700 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-500/30 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onBackToApp}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3.5 py-2 text-xs font-bold text-white hover:from-emerald-400 hover:to-teal-400 transition-all shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 flex flex-col">
        {!isAdmin ? (
          <div className="flex-1 flex items-center justify-center py-8">
            <form
              onSubmit={handleLoginSubmit}
              className="w-full max-w-md rounded-2xl border border-emerald-200/80 dark:border-white/15 bg-white/80 dark:bg-white/[0.06] backdrop-blur-xl p-6 sm:p-7 shadow-[0_24px_60px_rgba(11,110,79,0.12)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.45)] space-y-5"
            >
              <div className="flex flex-col items-center text-center space-y-2.5">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-orange-500 text-white flex items-center justify-center shadow-[0_6px_18px_rgba(249,115,22,0.35)]">
                  <Lock className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Login Dashboard Database
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Masukkan Username dan Password admin untuk melihat seluruh data &amp; mengelola riwayat.
                </p>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label
                    htmlFor="admin-username"
                    className="block text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-1.5"
                  >
                    Username
                  </label>
                  <input
                    id="admin-username"
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    placeholder="Masukkan username"
                    className="w-full rounded-xl border border-emerald-200/90 dark:border-white/15 bg-white/90 dark:bg-black/30 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-password"
                    className="block text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="admin-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (loginError) setLoginError(null);
                      }}
                      placeholder="Masukkan password"
                      className="w-full rounded-xl border border-emerald-200/90 dark:border-white/15 bg-white/90 dark:bg-black/30 pl-3.5 pr-10 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {loginError && (
                <div className="rounded-xl border border-rose-300 dark:border-rose-400/40 bg-rose-50 dark:bg-rose-500/15 px-3.5 py-2.5 text-xs font-semibold text-rose-700 dark:text-rose-200">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-orange-500 py-2.5 px-5 text-sm font-extrabold text-white shadow-[0_6px_18px_rgba(249,115,22,0.35)] hover:opacity-95 transition-opacity"
              >
                <LogIn className="w-4 h-4" />
                Masuk
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="rounded-2xl border border-emerald-200/80 dark:border-white/15 bg-white/75 dark:bg-white/[0.06] backdrop-blur-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    Total Transaksi
                  </span>
                  <History className="w-4 h-4 text-orange-500" />
                </div>
                <p className="mt-1.5 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {history.length}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {resiCount} Resi • {sjCount} Surat Jalan
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200/80 dark:border-white/15 bg-white/75 dark:bg-white/[0.06] backdrop-blur-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    Buku Alamat Tersimpan
                  </span>
                  <BookUser className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="mt-1.5 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {recipients.length}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Penerima &amp; instansi terdaftar
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200/80 dark:border-white/15 bg-white/75 dark:bg-white/[0.06] backdrop-blur-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    Katalog Barang
                  </span>
                  <ShieldCheck className="w-4 h-4 text-teal-500" />
                </div>
                <p className="mt-1.5 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {items.length}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Nama pesanan otomatis
                </p>
              </div>
            </div>

            {/* Excel Export Bar (Per Bulan / Per Tahun) */}
            <div className="rounded-2xl border border-emerald-200/80 dark:border-white/15 bg-white/80 dark:bg-white/[0.06] backdrop-blur-xl p-4 shadow-sm space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-xs flex-shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                      Download Laporan Excel Database
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Pilih rekap <span className="font-semibold">Per Bulan</span> atau{' '}
                      <span className="font-semibold">Per Tahun</span> (otomatis rapi, berwarna &amp; berisi 4 sheet lengkap).
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Period Mode Toggle */}
                  <div className="inline-flex rounded-full border border-emerald-200 dark:border-white/15 bg-emerald-50/80 dark:bg-black/25 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setExportMode('month');
                        setExportNotice(null);
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                        exportMode === 'month'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-emerald-900 dark:text-slate-300'
                      }`}
                    >
                      Per Bulan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExportMode('year');
                        setExportNotice(null);
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                        exportMode === 'year'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-emerald-900 dark:text-slate-300'
                      }`}
                    >
                      Per Tahun
                    </button>
                  </div>

                  {/* Month Picker (when Per Bulan) */}
                  {exportMode === 'month' && (
                    <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 dark:border-white/15 bg-white dark:bg-black/25 px-2.5 py-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <select
                        value={exportMonth}
                        onChange={(e) => {
                          setExportMonth(Number(e.target.value));
                          setExportNotice(null);
                        }}
                        aria-label="Pilih bulan laporan Excel"
                        className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                      >
                        {INDONESIAN_MONTHS.map((mName, idx) => (
                          <option
                            key={mName}
                            value={idx + 1}
                            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          >
                            {mName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Year Picker */}
                  <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 dark:border-white/15 bg-white dark:bg-black/25 px-2.5 py-1.5">
                    <select
                      value={exportYear}
                      onChange={(e) => {
                        setExportYear(Number(e.target.value));
                        setExportNotice(null);
                      }}
                      aria-label="Pilih tahun laporan Excel"
                      className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                    >
                      {availableYears.map((yr) => (
                        <option
                          key={yr}
                          value={yr}
                          className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        >
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="rounded-full bg-emerald-500/15 dark:bg-emerald-500/25 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-200 tabular-nums">
                    {periodHistory.length} transaksi
                  </span>

                  <button
                    type="button"
                    onClick={handleDownloadPeriodExcel}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs font-extrabold text-white hover:from-emerald-400 hover:to-teal-400 shadow-[0_4px_14px_rgba(16,185,129,0.35)] transition-all"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Download Excel
                  </button>
                </div>
              </div>

              {exportNotice && (
                <div
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold ${
                    exportNotice.type === 'success'
                      ? 'bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 border border-emerald-400/30'
                      : 'bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-400/30'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{exportNotice.text}</span>
                </div>
              )}
            </div>

            {/* Database Panel */}
            <div className="rounded-2xl border border-emerald-200/80 dark:border-white/15 bg-white/80 dark:bg-white/[0.06] backdrop-blur-xl shadow-sm overflow-hidden">
              {/* Tabs & Filters */}
              <div className="p-4 border-b border-emerald-200/70 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-emerald-50/50 dark:bg-black/20">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('history');
                      setConfirmDeleteId(null);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                      activeTab === 'history'
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    Semua Riwayat ({history.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('recipients');
                      setConfirmDeleteId(null);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                      activeTab === 'recipients'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10'
                    }`}
                  >
                    <BookUser className="w-3.5 h-3.5" />
                    Semua Alamat ({recipients.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('items');
                      setConfirmDeleteId(null);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                      activeTab === 'items'
                        ? 'bg-gradient-to-r from-emerald-500 to-orange-500 text-white shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    Katalog Barang ({items.length})
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {activeTab === 'history' && (
                    <div className="inline-flex rounded-xl border border-emerald-200 dark:border-white/15 bg-white/80 dark:bg-black/25 p-1">
                      {(['all', 'resi', 'surat_jalan'] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setDocFilter(f)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                            docFilter === f
                              ? 'bg-orange-500 text-white'
                              : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {f === 'all' ? 'Semua' : f === 'resi' ? 'Resi' : 'Surat Jalan'}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="relative min-w-[220px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari data database..."
                      className="w-full rounded-xl border border-emerald-200 dark:border-white/15 bg-white dark:bg-black/25 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-orange-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Table Body */}
              <div className="overflow-x-auto">
                {activeTab === 'history' && (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-emerald-500/10 dark:bg-white/[0.04] text-emerald-950 dark:text-emerald-200 border-b border-emerald-200/70 dark:border-white/10">
                        <th className="py-3 px-4 font-bold">No</th>
                        <th className="py-3 px-4 font-bold">Jenis &amp; Kop</th>
                        <th className="py-3 px-4 font-bold">Judul / Tujuan</th>
                        <th className="py-3 px-4 font-bold">Jumlah</th>
                        <th className="py-3 px-4 font-bold">Aksi</th>
                        <th className="py-3 px-4 font-bold">Waktu</th>
                        <th className="py-3 px-4 font-bold text-right">Kelola</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-100 dark:divide-white/10">
                      {filteredHistory.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-10 text-center text-slate-500 dark:text-slate-400"
                          >
                            Tidak ada data riwayat yang cocok.
                          </td>
                        </tr>
                      ) : (
                        filteredHistory.map((rec, idx) => (
                          <tr
                            key={rec.id}
                            className="hover:bg-emerald-50/50 dark:hover:bg-white/[0.03] transition-colors"
                          >
                            <td className="py-3 px-4 font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap items-center gap-1">
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
                                  {rec.presetId === 'sju' ? 'SJU' : 'SM'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 max-w-[280px]">
                              <p className="font-bold text-slate-900 dark:text-white truncate">
                                {rec.title}
                              </p>
                              {rec.recipientSummary && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  {rec.recipientSummary}
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap font-semibold">
                              {rec.itemCount}{' '}
                              {rec.docType === 'surat_jalan' ? 'lembar' : 'resi'}
                              {rec.totalKoli > 0 ? ` • ${rec.totalKoli} Koli` : ''}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="rounded-full bg-emerald-500/15 dark:bg-emerald-500/25 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-200">
                                {ACTION_LABELS[rec.lastAction ?? 'save']}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                              {formatDateTime(rec.createdAt)}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-right">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setDetailRecord(rec)}
                                  className="inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-white/15 bg-white dark:bg-white/10 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-white/20"
                                >
                                  <Eye className="w-3 h-3" />
                                  Detail
                                </button>
                                {confirmDeleteId === rec.id ? (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={deletingId === rec.id}
                                      onClick={() =>
                                        void handleConfirmedDelete('history', rec.id)
                                      }
                                      className="rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-500 disabled:opacity-50"
                                    >
                                      Ya, Hapus
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="rounded-full border border-slate-300 dark:border-white/20 px-2 py-1 text-[11px] font-semibold"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(rec.id)}
                                    title="Hapus riwayat"
                                    className="p-1.5 rounded-full text-rose-600 hover:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {activeTab === 'recipients' && (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-emerald-500/10 dark:bg-white/[0.04] text-emerald-950 dark:text-emerald-200 border-b border-emerald-200/70 dark:border-white/10">
                        <th className="py-3 px-4 font-bold">No</th>
                        <th className="py-3 px-4 font-bold">Nama Penerima / Instansi</th>
                        <th className="py-3 px-4 font-bold">Alamat</th>
                        <th className="py-3 px-4 font-bold">No. HP</th>
                        <th className="py-3 px-4 font-bold">Barang Terakhir</th>
                        <th className="py-3 px-4 font-bold">Dipakai</th>
                        <th className="py-3 px-4 font-bold text-right">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-100 dark:divide-white/10">
                      {filteredRecipients.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-10 text-center text-slate-500 dark:text-slate-400"
                          >
                            Tidak ada alamat tersimpan.
                          </td>
                        </tr>
                      ) : (
                        filteredRecipients.map((rec, idx) => (
                          <tr
                            key={rec.id}
                            className="hover:bg-emerald-50/50 dark:hover:bg-white/[0.03] transition-colors"
                          >
                            <td className="py-3 px-4 font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                              {rec.recipientName}
                            </td>
                            <td className="py-3 px-4 max-w-[280px] text-slate-600 dark:text-slate-300">
                              {rec.address ? rec.address.replace(/\n/g, ', ') : '-'}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-emerald-700 dark:text-emerald-300 font-medium">
                              {rec.phone || '-'}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                              {rec.lastItemName || '-'}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="rounded-full bg-orange-500/15 dark:bg-orange-500/25 px-2.5 py-0.5 text-[10px] font-bold text-orange-700 dark:text-orange-200">
                                {rec.useCount}x
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-right">
                              {confirmDeleteId === rec.id ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={deletingId === rec.id}
                                    onClick={() =>
                                      void handleConfirmedDelete('recipients', rec.id)
                                    }
                                    className="rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-500 disabled:opacity-50"
                                  >
                                    Ya, Hapus
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="rounded-full border border-slate-300 dark:border-white/20 px-2 py-1 text-[11px] font-semibold"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(rec.id)}
                                  title="Hapus alamat"
                                  className="p-1.5 rounded-full text-rose-600 hover:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {activeTab === 'items' && (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-emerald-500/10 dark:bg-white/[0.04] text-emerald-950 dark:text-emerald-200 border-b border-emerald-200/70 dark:border-white/10">
                        <th className="py-3 px-4 font-bold">No</th>
                        <th className="py-3 px-4 font-bold">Nama Barang</th>
                        <th className="py-3 px-4 font-bold">Kelompok</th>
                        <th className="py-3 px-4 font-bold">Dipakai</th>
                        <th className="py-3 px-4 font-bold">Terakhir Dipakai</th>
                        <th className="py-3 px-4 font-bold text-right">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-100 dark:divide-white/10">
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-10 text-center text-slate-500 dark:text-slate-400"
                          >
                            Tidak ada barang di katalog.
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((it, idx) => {
                          const cfg = getKelompokColor(it.defaultColorId);
                          return (
                            <tr
                              key={it.id}
                              className="hover:bg-emerald-50/50 dark:hover:bg-white/[0.03] transition-colors"
                            >
                              <td className="py-3 px-4 font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                {it.itemName}
                              </td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-white/15 px-2.5 py-0.5 text-[10px] font-bold">
                                  <span
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: cfg.hex }}
                                  />
                                  {cfg.label}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="rounded-full bg-orange-500/15 dark:bg-orange-500/25 px-2.5 py-0.5 text-[10px] font-bold text-orange-700 dark:text-orange-200">
                                  {it.useCount}x
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                                {formatDateTime(it.lastUsedAt)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {confirmDeleteId === it.id ? (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={deletingId === it.id}
                                      onClick={() =>
                                        void handleConfirmedDelete('items', it.id)
                                      }
                                      className="rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-500 disabled:opacity-50"
                                    >
                                      Ya, Hapus
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="rounded-full border border-slate-300 dark:border-white/20 px-2 py-1 text-[11px] font-semibold"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(it.id)}
                                    title="Hapus barang"
                                    className="p-1.5 rounded-full text-rose-600 hover:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Detail Modal for inspecting a record's full payload */}
      {detailRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          onClick={() => setDetailRecord(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-emerald-200/80 dark:border-white/15 bg-white/95 dark:bg-[#0D1E18]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-gradient-to-r from-emerald-500/15 to-orange-500/15 border-b border-emerald-200/70 dark:border-white/10">
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                  Detail {detailRecord.docType === 'surat_jalan' ? 'Surat Jalan' : 'Resi'}:{' '}
                  {detailRecord.title}
                </h3>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  {formatDateTime(detailRecord.createdAt)} •{' '}
                  {detailRecord.presetId === 'sju' ? 'SJU' : 'Suara Muhammadiyah'} •{' '}
                  {ACTION_LABELS[detailRecord.lastAction ?? 'save']}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailRecord(null)}
                className="p-1.5 rounded-full text-slate-500 hover:bg-emerald-500/15 dark:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-3 text-xs">
              {detailRecord.docType === 'resi'
                ? (detailRecord.payload as ResiItem[]).map((item, idx) => {
                    const rows = getResiBottomRows(item);
                    return (
                      <div
                        key={item.id ?? idx}
                        className="rounded-xl border border-emerald-200/80 dark:border-white/12 bg-emerald-50/40 dark:bg-white/[0.04] p-3.5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between font-bold text-emerald-900 dark:text-emerald-200">
                          <span>Resi #{idx + 1}</span>
                          <span>
                            Koli {item.koliKe || '-'} / {item.dari || '-'}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-900 dark:text-white whitespace-pre-line">
                          {item.kepada || '-'}
                        </p>
                        {item.noHp && (
                          <p className="text-slate-600 dark:text-slate-300">HP: {item.noHp}</p>
                        )}
                        <div className="pt-1 border-t border-emerald-200/60 dark:border-white/10 space-y-1">
                          {rows.map((r, rIdx) => (
                            <div key={r.id ?? rIdx} className="flex justify-between gap-2">
                              <span>{r.namaBarang || '-'}</span>
                              <span className="font-bold">
                                {r.useQty !== false && r.qty ? `QTY: ${r.qty}` : 'Tanpa QTY'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                : (detailRecord.payload as SuratJalanData[]).map((sj, idx) => (
                    <div
                      key={sj.id ?? idx}
                      className="rounded-xl border border-orange-200/80 dark:border-white/12 bg-orange-50/40 dark:bg-white/[0.04] p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between font-bold text-orange-900 dark:text-orange-200">
                        <span>
                          Surat Jalan #{idx + 1} ({sj.nomor || 'Tanpa Nomor'})
                        </span>
                        <span>{sj.tanggal || '-'}</span>
                      </div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        Kepada: {sj.kepada || '-'}
                      </p>
                      {sj.alamat && (
                        <p className="text-slate-600 dark:text-slate-300">{sj.alamat}</p>
                      )}
                      {sj.telepon && (
                        <p className="text-slate-600 dark:text-slate-300">Telp: {sj.telepon}</p>
                      )}
                      <div className="pt-1 border-t border-orange-200/60 dark:border-white/10 space-y-1">
                        {sj.rows
                          .filter((r) => r.namaBarang.trim() || r.qty.trim())
                          .map((r, rIdx) => (
                            <div key={r.id ?? rIdx} className="flex justify-between gap-2">
                              <span>{r.namaBarang}</span>
                              <span className="font-bold">
                                QTY: {r.qty || '-'} • Koli: {r.jumlahKoli || '-'}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
