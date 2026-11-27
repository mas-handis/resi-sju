import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  BookUser,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  Moon,
  Package,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Sparkles,
  Sun,
  Trash2,
} from 'lucide-react';
import { A3Sheet } from './components/A3Sheet';
import { CloudHubModal, CloudHubTab } from './components/CloudHubModal';
import { DatabaseDashboard } from './components/DatabaseDashboard';
import { PreviewPane } from './components/PreviewPane';
import { ResiFormCard } from './components/ResiFormCard';
import { SenderHeaderCard } from './components/SenderHeaderCard';
import { SuratJalanForm } from './components/SuratJalanForm';
import { SuratJalanPreviewPane } from './components/SuratJalanPreviewPane';
import { SuratJalanSheet } from './components/SuratJalanSheet';
import {
  createEmptyResi,
  createEmptySuratJalan,
  createSampleResiList,
  createSampleSuratJalan,
  DEFAULT_SENDER_HEADER,
  getResiBottomRows,
  isResiFilled,
  paginateResiList,
  RESI_PER_PAGE,
  SURAT_JALAN_SENDER_PRESETS,
} from './constants';
import {
  deleteSavedItem,
  deleteSavedRecipient,
  deleteShipmentRecord,
  fetchCloudBundle,
  loadLocalHistory,
  loadLocalItemCatalog,
  loadLocalRecipients,
  recordRecipientUsage,
  recordShipmentWithDedup,
} from './services/backendSync';
import {
  AppMode,
  ResiItem,
  SavedItemSuggestion,
  SavedRecipient,
  SenderHeader,
  ShipmentActionType,
  ShipmentRecord,
  SuratJalanData,
} from './types';
import { isAdminAuthenticated } from './utils/adminAuth';
import { downloadResiExcel, downloadSuratJalanExcel } from './utils/exportExcel';
import { downloadA4Pdf } from './utils/exportSheet';
import { downloadSuratJalanPdf } from './utils/exportSuratJalanPdf';

interface ToastState {
  message: string;
  undoItems?: ResiItem[];
}

export function App() {
  const [appMode, setAppMode] = useState<AppMode>('resi');
  const [sender, setSender] = useState<SenderHeader>(DEFAULT_SENDER_HEADER);
  const [resiList, setResiList] = useState<ResiItem[]>(() => [createEmptyResi()]);
  const [sjSender, setSjSender] = useState<SenderHeader>(SURAT_JALAN_SENDER_PRESETS.sm);
  const [suratJalanList, setSuratJalanList] = useState<SuratJalanData[]>(() => [
    createEmptySuratJalan('sm'),
  ]);
  const [showCutLines, setShowCutLines] = useState<boolean>(true);
  const [activeResiId, setActiveResiId] = useState<string | null>(() => resiList[0]?.id ?? null);
  const [activeSjId, setActiveSjId] = useState<string | null>(
    () => suratJalanList[0]?.id ?? null
  );
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    try {
      return localStorage.getItem('resi_ui_theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [exportingType, setExportingType] = useState<'pdf' | 'excel' | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [savedRecipients, setSavedRecipients] = useState<SavedRecipient[]>(() =>
    loadLocalRecipients()
  );
  const [savedItems, setSavedItems] = useState<SavedItemSuggestion[]>(() =>
    loadLocalItemCatalog()
  );
  const [shipmentHistory, setShipmentHistory] = useState<ShipmentRecord[]>(() =>
    loadLocalHistory()
  );
  const [cloudModalOpen, setCloudModalOpen] = useState(false);
  const [cloudInitialTab, setCloudInitialTab] = useState<CloudHubTab>('addresses');
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => isAdminAuthenticated());
  const [isDatabaseRoute, setIsDatabaseRoute] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.location.pathname === '/database' ||
      window.location.hash === '#/database' ||
      window.location.search.includes('page=database')
    );
  });
  const [hasSwitchedMode, setHasSwitchedMode] = useState(false);
  const [modePillRect, setModePillRect] = useState<{ left: number; width: number; ready: boolean }>({
    left: 4,
    width: 0,
    ready: false,
  });

  const modeTabListRef = useRef<HTMLDivElement | null>(null);
  const resiTabRef = useRef<HTMLButtonElement | null>(null);
  const sjTabRef = useRef<HTMLButtonElement | null>(null);

  const handleModeSwitch = (nextMode: AppMode) => {
    if (nextMode === appMode) return;
    setHasSwitchedMode(true);
    setAppMode(nextMode);
  };

  useLayoutEffect(() => {
    const updatePill = () => {
      const container = modeTabListRef.current;
      const activeBtn = appMode === 'resi' ? resiTabRef.current : sjTabRef.current;
      if (!container || !activeBtn) return;
      setModePillRect({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
        ready: true,
      });
    };

    updatePill();

    const container = modeTabListRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updatePill);
    observer.observe(container);
    if (resiTabRef.current) observer.observe(resiTabRef.current);
    if (sjTabRef.current) observer.observe(sjTabRef.current);
    return () => observer.disconnect();
  }, [appMode]);

  const reloadLocalStores = useCallback(() => {
    setSavedRecipients(loadLocalRecipients());
    setSavedItems(loadLocalItemCatalog());
    setShipmentHistory(loadLocalHistory());
  }, []);

  const syncSharedDatabase = useCallback(async () => {
    setIsSyncingCloud(true);
    try {
      const bundle = await fetchCloudBundle();
      setSavedRecipients(bundle.recipients);
      setSavedItems(bundle.items);
      setShipmentHistory(bundle.history);
      setIsCloudConnected(bundle.fromCloud);
    } finally {
      setIsSyncingCloud(false);
    }
  }, []);

  useEffect(() => {
    void syncSharedDatabase();
  }, [syncSharedDatabase]);

  useEffect(() => {
    const onRouteChange = () => {
      setIsDatabaseRoute(
        window.location.pathname === '/database' ||
          window.location.hash === '#/database' ||
          window.location.search.includes('page=database')
      );
    };
    window.addEventListener('popstate', onRouteChange);
    window.addEventListener('hashchange', onRouteChange);
    return () => {
      window.removeEventListener('popstate', onRouteChange);
      window.removeEventListener('hashchange', onRouteChange);
    };
  }, []);

  const navigateToDatabase = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/database');
    }
    setIsDatabaseRoute(true);
    void syncSharedDatabase();
  };

  const navigateBackHome = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
    }
    setIsDatabaseRoute(false);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', themeMode === 'dark');
    try {
      localStorage.setItem('resi_ui_theme', themeMode);
    } catch {
      // ignore storage quota errors
    }
  }, [themeMode]);

  const exportRef = useRef<HTMLDivElement | null>(null);
  const koliRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const toastTimerRef = useRef<number | null>(null);

  const pages = paginateResiList(resiList);

  const showToast = (message: string, undoItems?: ResiItem[]) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ message, undoItems });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, undoItems ? 6000 : 3200);
  };

  const handleUpdateResi = (id: string, patch: Partial<ResiItem>) => {
    setResiList((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleAddResi = () => {
    const next = createEmptyResi();
    setResiList((prev) => [...prev, next]);
    setActiveResiId(next.id);
    requestAnimationFrame(() => {
      document.getElementById(`resi-card-${next.id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  };

  const handleDuplicateResi = (sourceIndex: number) => {
    const source = resiList[sourceIndex];
    if (!source) return;

    const duplicated: ResiItem = {
      ...source,
      id: crypto.randomUUID(),
      extraRows: source.extraRows?.map((r) => ({ ...r, id: crypto.randomUUID() })),
    };

    setResiList((prev) => {
      const next = [...prev];
      next.splice(sourceIndex + 1, 0, duplicated);
      return next;
    });
    setActiveResiId(duplicated.id);
    showToast(`Data Resi #${sourceIndex + 1} diduplikasi — silakan ubah nomor Koli Ke.`);

    requestAnimationFrame(() => {
      const koliEl = koliRefs.current[duplicated.id];
      if (koliEl) {
        koliEl.focus();
        koliEl.select();
      }
      document.getElementById(`resi-card-${duplicated.id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  };

  const handleAutoGenerateKoli = (sourceIndex: number, totalKoli: number) => {
    const source = resiList[sourceIndex];
    if (!source) return;

    const clampedCount = Math.max(2, Math.min(100, Math.floor(totalKoli)));
    const previous = resiList;

    const generated: ResiItem[] = Array.from({ length: clampedCount }, (_, idx) => ({
      ...source,
      id: idx === 0 ? source.id : crypto.randomUUID(),
      extraRows:
        idx === 0
          ? source.extraRows
          : source.extraRows?.map((r) => ({ ...r, id: crypto.randomUUID() })),
      koliKe: String(idx + 1),
      dari: `${clampedCount} KOLI`,
    }));

    const nextList = [
      ...resiList.slice(0, sourceIndex),
      ...generated,
      ...resiList.slice(sourceIndex + 1),
    ];

    setResiList(nextList);
    setActiveResiId(generated[0].id);

    const totalPages = Math.ceil(nextList.length / RESI_PER_PAGE);
    showToast(
      `Berhasil membuat ${clampedCount} resi (Koli ke 1–${clampedCount} dari ${clampedCount} koli) dalam ${totalPages} halaman A4.`,
      previous
    );
  };

  const handleDeleteResi = (id: string) => {
    if (resiList.length === 1) {
      const fresh = createEmptyResi();
      setResiList([fresh]);
      setActiveResiId(fresh.id);
      return;
    }
    setResiList((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (activeResiId === id) {
        setActiveResiId(next[0]?.id ?? null);
      }
      return next;
    });
  };

  const handleMoveResi = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= resiList.length) return;
    setResiList((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const handleClearAll = () => {
    if (appMode === 'surat_jalan') {
      const fresh = createEmptySuratJalan(sjSender.presetId);
      setSuratJalanList([fresh]);
      setActiveSjId(fresh.id);
      showToast('Formulir Surat Jalan dibersihkan.');
      return;
    }
    const previous = resiList;
    const hasContent = previous.some(isResiFilled);
    const fresh = createEmptyResi();
    setResiList([fresh]);
    setActiveResiId(fresh.id);
    if (hasContent) {
      showToast('Formulir dibersihkan.', previous);
    }
  };

  const handleLoadSample = () => {
    if (appMode === 'surat_jalan') {
      const sample = createSampleSuratJalan(sjSender.presetId);
      setSuratJalanList([sample]);
      setActiveSjId(sample.id);
      showToast(
        `Contoh Surat Jalan ${
          sjSender.presetId === 'sju' ? 'SJU' : 'Suara Muhammadiyah'
        } dimuat.`
      );
      return;
    }
    const samples = createSampleResiList();
    setResiList(samples);
    setActiveResiId(samples[0]?.id ?? null);
    showToast(`Contoh ${samples.length} resi TK ABA dimuat.`);
  };

  const handleUpdateSuratJalan = (id: string, patch: Partial<SuratJalanData>) => {
    setSuratJalanList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const handleAddSuratJalan = () => {
    const next = createEmptySuratJalan(sjSender.presetId);
    setSuratJalanList((prev) => [...prev, next]);
    setActiveSjId(next.id);
    showToast(`Surat Jalan #${suratJalanList.length + 1} ditambahkan.`);
    requestAnimationFrame(() => {
      document.getElementById(`sj-card-${next.id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  };

  const handleDuplicateSuratJalan = (sourceIndex: number) => {
    const source = suratJalanList[sourceIndex];
    if (!source) return;
    const duplicated: SuratJalanData = {
      ...source,
      id: crypto.randomUUID(),
      rows: source.rows.map((r) => ({ ...r, id: crypto.randomUUID() })),
    };
    setSuratJalanList((prev) => {
      const next = [...prev];
      next.splice(sourceIndex + 1, 0, duplicated);
      return next;
    });
    setActiveSjId(duplicated.id);
    showToast(
      `Surat Jalan #${sourceIndex + 1} diduplikasi ke Halaman #${sourceIndex + 2}.`
    );
    requestAnimationFrame(() => {
      document.getElementById(`sj-card-${duplicated.id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  };

  const handleDeleteSuratJalan = (id: string) => {
    if (suratJalanList.length <= 1) {
      const fresh = createEmptySuratJalan(sjSender.presetId);
      setSuratJalanList([fresh]);
      setActiveSjId(fresh.id);
      return;
    }
    setSuratJalanList((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (activeSjId === id) {
        setActiveSjId(next[0]?.id ?? null);
      }
      return next;
    });
  };

  const handleMoveSuratJalan = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= suratJalanList.length) return;
    setSuratJalanList((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const handleSelectSjSheet = (id: string) => {
    setActiveSjId(id);
    document.getElementById(`sj-card-${id}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const handleCopyFromResiToSuratJalan = (targetId?: string) => {
    const first = resiList[0];
    if (!first) return;
    const lines = first.kepada
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const penerima = lines[0] ?? '';
    const alamat = lines.slice(1).join('\n');
    const bottomRows = getResiBottomRows(first);
    const totalKoliMatch = first.dari.trim().match(/^(\d+)/);
    const defaultKoli = totalKoliMatch ? totalKoliMatch[1] : '';

    setSuratJalanList((prev) =>
      prev.map((sj, idx) => {
        const shouldUpdate = targetId ? sj.id === targetId : idx === 0;
        if (!shouldUpdate) return sj;
        return {
          ...sj,
          kepada: penerima || sj.kepada,
          alamat: alamat || sj.alamat,
          telepon: first.noHp.trim() || sj.telepon,
          rows: bottomRows.map((row, rowIdx) => ({
            id: crypto.randomUUID(),
            namaBarang: row.namaBarang,
            qty: row.qty,
            jumlahKoli: rowIdx === 0 ? defaultKoli : '',
            keterangan: '',
          })),
        };
      })
    );
    showToast('Data tujuan & barang disalin dari Resi #1 ke Surat Jalan.');
  };

  const handleSelectSlot = (id: string) => {
    setActiveResiId(id);
    document.getElementById(`resi-card-${id}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const saveCurrentShipment = async (
    action: ShipmentActionType,
    manualTrigger = false
  ) => {
    const currentSender = appMode === 'surat_jalan' ? sjSender : sender;
    const result = await recordShipmentWithDedup({
      docType: appMode,
      sender: currentSender,
      resiList,
      suratJalanList,
      action,
    });

    if (result.empty) {
      if (manualTrigger) {
        showToast('Isi minimal 1 tujuan atau nama barang sebelum menyimpan.');
      }
      return;
    }

    if (result.cloudSynced) {
      await syncSharedDatabase();
    } else {
      reloadLocalStores();
    }

    if (manualTrigger) {
      if (result.duplicate) {
        showToast('Data pengiriman ini sudah tercatat di Riwayat (tidak didobelkan).');
      } else {
        showToast(
          result.cloudSynced
            ? 'Tersimpan ke database bersama & Riwayat Penggunaan.'
            : 'Tersimpan di perangkat & Riwayat Penggunaan.'
        );
      }
    }
  };

  const handleSaveToDatabase = async () => {
    if (isSavingCloud) return;
    setIsSavingCloud(true);
    try {
      await saveCurrentShipment('save', true);
    } catch (err) {
      console.error('Save record failed:', err);
      showToast('Gagal menyimpan ke riwayat penggunaan.');
    } finally {
      setIsSavingCloud(false);
    }
  };

  const handleUseSavedRecipient = (rec: SavedRecipient) => {
    if (appMode === 'surat_jalan') {
      const targetId = activeSjId || suratJalanList[0]?.id;
      setSuratJalanList((prev) =>
        prev.map((sj, idx) => {
          const match = targetId ? sj.id === targetId : idx === 0;
          if (!match) return sj;
          const nextRows =
            sj.rows.length > 0 && !sj.rows[0].namaBarang.trim() && rec.lastItemName
              ? sj.rows.map((r, rIdx) =>
                  rIdx === 0 ? { ...r, namaBarang: rec.lastItemName } : r
                )
              : sj.rows;
          return {
            ...sj,
            kepada: rec.recipientName,
            alamat: rec.address || sj.alamat,
            telepon: rec.phone || sj.telepon,
            rows: nextRows,
          };
        })
      );
      showToast(`Alamat "${rec.recipientName}" diisikan ke Surat Jalan.`);
    } else {
      const targetId = activeResiId || resiList[0]?.id;
      const fullKepada = rec.address
        ? `${rec.recipientName}\n${rec.address}`
        : rec.recipientName;
      setResiList((prev) =>
        prev.map((item, idx) => {
          const match = targetId ? item.id === targetId : idx === 0;
          if (!match) return item;
          return {
            ...item,
            kepada: fullKepada,
            noHp: rec.phone || item.noHp,
            namaBarang: item.namaBarang.trim() ? item.namaBarang : rec.lastItemName,
            colorId: item.namaBarang.trim() ? item.colorId : rec.lastColorId,
          };
        })
      );
      showToast(`Alamat "${rec.recipientName}" diisikan ke Resi.`);
    }
  };

  const handleLoadShipmentRecord = (record: ShipmentRecord) => {
    if (record.docType === 'surat_jalan') {
      const loaded = record.payload as SuratJalanData[];
      if (Array.isArray(loaded) && loaded.length > 0) {
        setAppMode('surat_jalan');
        if (record.senderSnapshot) {
          setSjSender(record.senderSnapshot);
        }
        setSuratJalanList(loaded);
        setActiveSjId(loaded[0].id);
        showToast(`Riwayat Surat Jalan "${record.title}" dimuat.`);
      }
    } else {
      const loaded = record.payload as ResiItem[];
      if (Array.isArray(loaded) && loaded.length > 0) {
        setAppMode('resi');
        if (record.senderSnapshot) {
          setSender(record.senderSnapshot);
        }
        setResiList(loaded);
        setActiveResiId(loaded[0].id);
        showToast(`Riwayat ${loaded.length} Resi "${record.title}" dimuat.`);
      }
    }
  };

  const handlePrint = () => {
    void saveCurrentShipment('print');
    window.print();
  };

  const handleExport = async (type: 'pdf' | 'excel') => {
    if (exportingType) return;
    setExportingType(type);
    try {
      const savePromise = saveCurrentShipment(type).catch((err) => {
        console.error('Auto-save before export failed:', err);
      });
      let result: string;
      if (appMode === 'surat_jalan') {
        result =
          type === 'pdf'
            ? await downloadSuratJalanPdf(suratJalanList, sjSender, showCutLines)
            : downloadSuratJalanExcel(suratJalanList, sjSender);
      } else {
        result =
          type === 'pdf'
            ? await downloadA4Pdf(resiList, sender, showCutLines)
            : downloadResiExcel(resiList, sender);
      }
      await savePromise;
      showToast(`Berhasil mengunduh ${result}`);
    } catch (err) {
      console.error('Export failed:', err);
      showToast('Gagal mengekspor dokumen. Silakan coba lagi.');
    } finally {
      setExportingType(null);
    }
  };

  const handleAdminDeleteRecipient = async (id: string) => {
    if (!isAdminAuthenticated()) {
      showToast('Login admin terlebih dahulu untuk menghapus alamat.');
      return;
    }
    await deleteSavedRecipient(id);
    await syncSharedDatabase();
    showToast('Alamat dihapus.');
  };

  const handleAdminDeleteItem = async (id: string) => {
    if (!isAdminAuthenticated()) {
      showToast('Login admin terlebih dahulu untuk menghapus barang.');
      return;
    }
    await deleteSavedItem(id);
    await syncSharedDatabase();
    showToast('Barang dihapus.');
  };

  const handleAdminDeleteRecord = async (id: string) => {
    if (!isAdminAuthenticated()) {
      showToast('Login admin terlebih dahulu untuk menghapus riwayat.');
      return;
    }
    await deleteShipmentRecord(id);
    await syncSharedDatabase();
    showToast('Riwayat dihapus.');
  };

  const filledCount = resiList.filter(isResiFilled).length;
  const activeSender = appMode === 'surat_jalan' ? sjSender : sender;
  const senderLabel = activeSender.presetId === 'sju' ? 'SJU' : 'Suara Muhammadiyah';

  if (isDatabaseRoute) {
    return (
      <DatabaseDashboard
        themeMode={themeMode}
        onToggleTheme={() => setThemeMode((t) => (t === 'dark' ? 'light' : 'dark'))}
        isAdmin={isAdmin}
        onAdminAuthChange={setIsAdmin}
        recipients={savedRecipients}
        items={savedItems}
        history={shipmentHistory}
        isSyncing={isSyncingCloud}
        isCloudConnected={isCloudConnected}
        onRefresh={syncSharedDatabase}
        onDeleteRecipient={handleAdminDeleteRecipient}
        onDeleteItem={handleAdminDeleteItem}
        onDeleteRecord={handleAdminDeleteRecord}
        onBackToApp={navigateBackHome}
      />
    );
  }

  return (
    <>
      <div className="no-print relative min-h-screen lg:h-screen flex flex-col bg-[#F3F8F5] dark:bg-[#08130F] text-slate-900 dark:text-slate-100 overflow-x-hidden transition-colors">
        {/* Ambient Green & Orange Glows for Glassmorphism */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 overflow-hidden z-0"
        >
          <div className="absolute -top-28 -left-24 h-96 w-96 rounded-full bg-emerald-400/30 dark:bg-emerald-500/25 blur-[110px]" />
          <div className="absolute top-1/3 left-1/3 h-80 w-80 rounded-full bg-orange-300/25 dark:bg-orange-500/15 blur-[120px]" />
          <div className="absolute -bottom-28 -right-20 h-96 w-96 rounded-full bg-orange-400/30 dark:bg-orange-500/25 blur-[115px]" />
        </div>

        {/* Top Application Header — Glassmorphism (Light & Dark, Hijau & Oranye) */}
        <header className="sticky top-0 z-30 bg-white/75 dark:bg-[#0D1E18]/75 backdrop-blur-xl border-b border-emerald-200/80 dark:border-white/15 text-slate-900 dark:text-white shadow-[0_8px_32px_rgba(11,110,79,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] px-4 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-[0_4px_14px_rgba(249,115,22,0.35)]">
              {appMode === 'surat_jalan' ? (
                <ClipboardList className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <FileText className="w-4 h-4 stroke-[2.5]" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight truncate tracking-wide">
                {appMode === 'surat_jalan' ? 'SURAT JALAN GENERATOR' : 'RESI GENERATOR'}
              </h1>
              <p className="text-[11px] sm:text-xs text-emerald-700 dark:text-emerald-300/90 truncate font-semibold">
                {senderLabel}
              </p>
            </div>
          </div>

          {/* Mode Switcher: Resi vs Surat Jalan (Sliding Glass Pill) */}
          <div
            ref={modeTabListRef}
            className="relative order-3 sm:order-2 w-full sm:w-auto flex items-center rounded-full bg-emerald-100/80 dark:bg-white/[0.07] backdrop-blur-md p-1 border border-emerald-200/80 dark:border-white/15"
            role="tablist"
            aria-label="Pilih Jenis Dokumen"
          >
            <span
              aria-hidden="true"
              style={{
                width: modePillRect.ready ? `${modePillRect.width}px` : undefined,
                transform: modePillRect.ready
                  ? `translate3d(${modePillRect.left}px, 0, 0)`
                  : undefined,
                opacity: modePillRect.ready ? 1 : 0,
              }}
              className="pointer-events-none absolute top-1 bottom-1 left-0 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 shadow-[0_4px_14px_rgba(249,115,22,0.4)] transition-[transform,width,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform"
            />
            <button
              ref={resiTabRef}
              type="button"
              role="tab"
              aria-selected={appMode === 'resi'}
              onClick={() => handleModeSwitch('resi')}
              className={`relative z-10 flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors duration-300 ${
                appMode === 'resi'
                  ? 'text-white'
                  : 'text-emerald-900 dark:text-slate-300 hover:text-emerald-950 dark:hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5 transition-transform duration-300" />
              Resi
            </button>
            <button
              ref={sjTabRef}
              type="button"
              role="tab"
              aria-selected={appMode === 'surat_jalan'}
              onClick={() => handleModeSwitch('surat_jalan')}
              className={`relative z-10 flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors duration-300 ${
                appMode === 'surat_jalan'
                  ? 'text-white'
                  : 'text-emerald-900 dark:text-slate-300 hover:text-emerald-950 dark:hover:text-white'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 transition-transform duration-300" />
              Surat Jalan
            </button>
          </div>

          {/* Desktop & Tablet Actions */}
          <div className="order-2 sm:order-3 flex items-center gap-2">
            {/* Theme Toggle (Gelap / Terang) */}
            <button
              type="button"
              onClick={() => setThemeMode((t) => (t === 'dark' ? 'light' : 'dark'))}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-white/15 bg-white/80 dark:bg-white/[0.08] backdrop-blur-md px-2.5 py-2 text-xs font-bold text-emerald-900 dark:text-amber-200 hover:bg-white dark:hover:bg-white/20 transition-colors shadow-xs"
              title={themeMode === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
              aria-label="Ganti tema gelap atau terang"
            >
              {themeMode === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden 2xl:inline">Terang</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="hidden 2xl:inline">Gelap</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setCloudInitialTab('addresses');
                setCloudModalOpen(true);
                void syncSharedDatabase();
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-white/15 bg-white/80 dark:bg-white/[0.08] backdrop-blur-md px-3 py-2 text-xs font-bold text-emerald-900 dark:text-white hover:bg-white dark:hover:bg-white/20 transition-colors shadow-xs whitespace-nowrap"
              title="Buka Riwayat Penggunaan & Buku Alamat"
            >
              <BookUser className="w-3.5 h-3.5 text-orange-600 dark:text-orange-300" />
              <span className="hidden md:inline">Riwayat Penggunaan</span>
              <span className="rounded-full bg-emerald-500/15 dark:bg-emerald-500/30 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-200">
                {isAdmin ? shipmentHistory.length : Math.min(shipmentHistory.length, 5)}
              </span>
            </button>

            <button
              type="button"
              disabled={isSavingCloud}
              onClick={() => void handleSaveToDatabase()}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 dark:border-emerald-400/40 bg-emerald-100/80 dark:bg-emerald-500/20 backdrop-blur-md px-3 py-2 text-xs font-bold text-emerald-900 dark:text-emerald-100 hover:bg-emerald-200 dark:hover:bg-emerald-500/35 disabled:opacity-50 transition-colors"
              title="Simpan pengiriman ini ke Riwayat & perbarui rekomendasi alamat"
            >
              {isSavingCloud ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span className="hidden lg:inline">Simpan</span>
            </button>

            <button
              type="button"
              onClick={handleLoadSample}
              className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-orange-300 dark:border-orange-400/40 bg-orange-100/90 dark:bg-orange-500/20 backdrop-blur-md px-3.5 py-2 text-xs font-bold text-orange-900 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-500/35 dark:hover:text-white transition-colors"
              title="Isi formulir dengan contoh pengisian"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-600 dark:text-orange-300" />
              Contoh Pengisian
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-rose-200 dark:border-white/15 bg-rose-50/90 dark:bg-white/[0.08] backdrop-blur-md px-3 py-2 text-xs font-semibold text-rose-700 dark:text-slate-200 hover:bg-rose-100 dark:hover:bg-rose-500/30 dark:hover:border-rose-400/40 dark:hover:text-white transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Bersihkan Formulir</span>
              <span className="xl:hidden">Bersihkan</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="hidden xl:inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-white/15 bg-white/80 dark:bg-white/[0.08] backdrop-blur-md px-3 py-2 text-xs font-semibold text-emerald-900 dark:text-white hover:bg-white dark:hover:bg-white/20 transition-colors"
              title="Cetak langsung ke printer kertas A4"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak
            </button>

            <button
              type="button"
              disabled={exportingType !== null}
              onClick={() => handleExport('excel')}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3.5 py-2 text-xs font-bold text-white hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 shadow-[0_4px_14px_rgba(16,185,129,0.35)] transition-all"
              title="Unduh rekap data ke file Excel (.xlsx)"
            >
              {exportingType === 'excel' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Download Excel</span>
              <span className="sm:hidden">Excel</span>
            </button>

            <button
              type="button"
              disabled={exportingType !== null}
              onClick={() => handleExport('pdf')}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-xs font-extrabold text-white hover:from-orange-400 hover:to-amber-400 disabled:opacity-50 shadow-[0_4px_18px_rgba(249,115,22,0.45)] transition-all"
            >
              {exportingType === 'pdf' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Download PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>
          </div>
        </header>

        {/* Mobile Tab Switcher */}
        <div className="lg:hidden sticky top-[61px] z-20 bg-white/80 dark:bg-[#0D1E18]/80 backdrop-blur-xl border-b border-emerald-200/70 dark:border-white/10 px-4 py-2">
          <div className="grid grid-cols-2 gap-1.5 rounded-full bg-emerald-100/70 dark:bg-white/[0.07] p-1 border border-emerald-200/60 dark:border-white/10">
            <button
              type="button"
              onClick={() => setMobileTab('form')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-bold transition-all ${
                mobileTab === 'form'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'
                  : 'text-emerald-900 dark:text-slate-300'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              {appMode === 'surat_jalan'
                ? `Formulir (${suratJalanList.length} SJ)`
                : `Formulir (${resiList.length} Resi)`}
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('preview')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-bold transition-all ${
                mobileTab === 'preview'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                  : 'text-emerald-900 dark:text-slate-300'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              {appMode === 'surat_jalan'
                ? `Pratinjau A4 (${suratJalanList.length})`
                : `Pratinjau A4 (${pages.length})`}
            </button>
          </div>
        </div>

        {/* Main Split-Screen Workspace */}
        <main className="relative z-10 flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
          {/* Left Panel: Cascading Glass Form */}
          <section
            className={`${
              mobileTab === 'form' ? 'flex' : 'hidden'
            } lg:flex flex-col w-full lg:w-[460px] xl:w-[510px] lg:flex-shrink-0 bg-white/40 dark:bg-black/15 backdrop-blur-sm lg:border-r border-emerald-200/70 dark:border-white/10 lg:h-full overflow-x-hidden`}
          >
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-4 sm:p-5 space-y-4 pb-24 lg:pb-8">
              {/* Mobile Quick Utilities */}
              <div className="flex sm:hidden items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-orange-300 dark:border-orange-400/40 bg-orange-100/80 dark:bg-orange-500/20 backdrop-blur-md px-3 py-2 text-xs font-bold text-orange-900 dark:text-orange-200"
                >
                  <Sparkles className="w-3.5 h-3.5 text-orange-600 dark:text-orange-300" />
                  Contoh Pengisian
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-rose-200 dark:border-rose-400/30 bg-rose-50/90 dark:bg-rose-500/20 backdrop-blur-md px-3 py-2 text-xs font-bold text-rose-700 dark:text-rose-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Bersihkan
                </button>
              </div>

              <div
                key={`form-mode-${appMode}`}
                className={`space-y-4 ${
                  hasSwitchedMode
                    ? appMode === 'surat_jalan'
                      ? 'animate-mode-from-right'
                      : 'animate-mode-from-left'
                    : ''
                }`}
              >
                {appMode === 'surat_jalan' ? (
                  <SuratJalanForm
                    items={suratJalanList}
                    activeId={activeSjId}
                    sender={sjSender}
                    hasResiData={resiList.some(isResiFilled)}
                    savedRecipients={savedRecipients}
                    savedItems={savedItems}
                    onSenderChange={setSjSender}
                    onFocus={setActiveSjId}
                    onChange={handleUpdateSuratJalan}
                    onAdd={handleAddSuratJalan}
                    onDuplicate={handleDuplicateSuratJalan}
                    onDelete={handleDeleteSuratJalan}
                    onMove={handleMoveSuratJalan}
                    onCopyFromResi={handleCopyFromResiToSuratJalan}
                  />
                ) : (
                  <>
                    {/* Sender Kop Selector (SM & SJU) */}
                    <SenderHeaderCard sender={sender} onChange={setSender} />

                    {/* Resi Cards List */}
                    <div className="space-y-3.5">
                      {resiList.map((item, idx) => (
                        <ResiFormCard
                          key={item.id}
                          item={item}
                          index={idx}
                          total={resiList.length}
                          isActive={activeResiId === item.id}
                          savedRecipients={savedRecipients}
                          savedItems={savedItems}
                          koliInputRef={(el) => {
                            koliRefs.current[item.id] = el;
                          }}
                          onFocus={() => setActiveResiId(item.id)}
                          onChange={(patch) => handleUpdateResi(item.id, patch)}
                          onDuplicate={() => handleDuplicateResi(idx)}
                          onAutoGenerateKoli={(count) => handleAutoGenerateKoli(idx, count)}
                          onDelete={() => handleDeleteResi(item.id)}
                          onMoveUp={() => handleMoveResi(idx, -1)}
                          onMoveDown={() => handleMoveResi(idx, 1)}
                        />
                      ))}
                    </div>

                    {/* Add Resi CTA (unlimited, auto-paginated 4 per A4) */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleAddResi}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-400/60 dark:border-emerald-400/50 bg-emerald-50/80 dark:bg-emerald-500/10 backdrop-blur-md py-3 px-4 text-sm font-bold text-emerald-800 dark:text-emerald-200 hover:border-emerald-600 dark:hover:border-emerald-400 hover:bg-emerald-100/80 dark:hover:bg-emerald-500/20 dark:hover:text-white transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        Tambah Resi Baru ({resiList.length} resi • {pages.length} Hal. A4)
                      </button>
                      <p className="mt-2 text-center text-[11px] text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                          {filledCount} resi terisi
                        </span>{' '}
                        • 4 resi per halaman A4, bertambah otomatis sesuai jumlah koli.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Right Panel: Sticky Multi-Page Live Preview A4 */}
          <section
            className={`${
              mobileTab === 'preview' ? 'flex' : 'hidden'
            } lg:flex flex-1 flex-col min-w-0 h-[calc(100vh-116px)] lg:h-full overflow-hidden`}
          >
            <div
              key={`preview-mode-${appMode}`}
              className={`flex-1 flex flex-col min-h-0 ${
                hasSwitchedMode
                  ? appMode === 'surat_jalan'
                    ? 'animate-mode-from-right'
                    : 'animate-mode-from-left'
                  : ''
              }`}
            >
              {appMode === 'surat_jalan' ? (
                <SuratJalanPreviewPane
                  items={suratJalanList}
                  sender={sjSender}
                  showCutLines={showCutLines}
                  activeId={activeSjId}
                  onToggleCutLines={() => setShowCutLines((v) => !v)}
                  onSelectSheet={handleSelectSjSheet}
                />
              ) : (
                <PreviewPane
                  items={resiList}
                  sender={sender}
                  showCutLines={showCutLines}
                  activeResiId={activeResiId}
                  onToggleCutLines={() => setShowCutLines((v) => !v)}
                  onSelectSlot={handleSelectSlot}
                />
              )}
            </div>
          </section>
        </main>

        {/* Mobile Sticky Bottom Bar */}
        {mobileTab === 'form' && (
          <div className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white/85 dark:bg-[#0D1E18]/85 backdrop-blur-xl border-t border-emerald-200/70 dark:border-white/15 px-3 py-2.5 flex items-center gap-2 shadow-[0_-8px_24px_rgba(11,110,79,0.12)] dark:shadow-[0_-8px_24px_rgba(0,0,0,0.4)]">
            <button
              type="button"
              onClick={() => setMobileTab('preview')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-200 dark:border-white/20 bg-emerald-50/90 dark:bg-white/10 py-2.5 px-2 text-xs font-bold text-emerald-900 dark:text-white"
            >
              <Eye className="w-4 h-4 flex-shrink-0" />
              <span>
                {appMode === 'surat_jalan'
                  ? `Pratinjau (${suratJalanList.length})`
                  : `Pratinjau (${pages.length})`}
              </span>
            </button>
            <button
              type="button"
              disabled={exportingType !== null}
              onClick={() => handleExport('excel')}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 px-3 text-xs font-bold text-white disabled:opacity-50"
            >
              {exportingType === 'excel' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              Excel
            </button>
            <button
              type="button"
              disabled={exportingType !== null}
              onClick={() => handleExport('pdf')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 py-2.5 px-2 text-xs font-bold text-white shadow-sm disabled:opacity-50"
            >
              {exportingType === 'pdf' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4 flex-shrink-0" />
              )}
              <span>Download PDF</span>
            </button>
          </div>
        )}

        {/* Toast Notification */}
        {toast && (
          <div className="fixed bottom-16 lg:bottom-5 right-4 z-50 flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-lg ring-1 ring-white/10">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{toast.message}</span>
            {toast.undoItems && (
              <button
                type="button"
                onClick={() => {
                  if (toast.undoItems) {
                    setResiList(toast.undoItems);
                    setActiveResiId(toast.undoItems[0]?.id ?? null);
                  }
                  setToast(null);
                }}
                className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 text-xs font-semibold text-white hover:bg-white/25 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Urungkan
              </button>
            )}
          </div>
        )}
      </div>

      {/* Address Book & History Modal */}
      <CloudHubModal
        isOpen={cloudModalOpen}
        initialTab={cloudInitialTab}
        onClose={() => setCloudModalOpen(false)}
        recipients={savedRecipients}
        history={shipmentHistory}
        appMode={appMode}
        isAdmin={isAdmin}
        onAdminAuthChange={setIsAdmin}
        onOpenDatabaseDashboard={navigateToDatabase}
        isSyncing={isSyncingCloud}
        isCloudConnected={isCloudConnected}
        onRefresh={syncSharedDatabase}
        onSaveRecipientManual={async (input) => {
          await recordRecipientUsage(input);
          await syncSharedDatabase();
          showToast(`Alamat "${input.recipientName}" disimpan ke Buku Alamat.`);
        }}
        onUseRecipient={handleUseSavedRecipient}
        onDeleteRecipient={handleAdminDeleteRecipient}
        onLoadRecord={handleLoadShipmentRecord}
        onDeleteRecord={handleAdminDeleteRecord}
      />

      {/* Off-screen Multi-Page Unscaled A4 Export Target + Native Print Surface */}
      <div ref={exportRef} aria-hidden="true" className="print-only-sheet offscreen-print-sheet">
        {appMode === 'surat_jalan' ? (
          suratJalanList.map((sjItem) => (
            <div key={`export-sj-${sjItem.id}`} className="print-page-wrapper">
              <SuratJalanSheet
                data={sjItem}
                sender={sjSender}
                showCutLines={showCutLines}
              />
            </div>
          ))
        ) : (
          pages.map((pageItems, pageIdx) => (
            <div key={`export-page-${pageIdx}`} className="print-page-wrapper">
              <A3Sheet
                items={pageItems}
                sender={sender}
                showCutLines={showCutLines}
                isExport={true}
                pageNumber={pageIdx + 1}
                startIndex={pageIdx * RESI_PER_PAGE}
              />
            </div>
          ))
        )}
      </div>
    </>
  );
}

export default App;
