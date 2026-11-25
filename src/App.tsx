import { useRef, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  FileDown,
  FileText,
  ImageDown,
  Loader2,
  Plus,
  Printer,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { A3Sheet } from './components/A3Sheet';
import { PreviewPane } from './components/PreviewPane';
import { ResiFormCard } from './components/ResiFormCard';
import { SenderHeaderCard } from './components/SenderHeaderCard';
import {
  createEmptyResi,
  createSampleResiList,
  DEFAULT_SENDER_HEADER,
} from './constants';
import { GridCapacity, ResiItem, SenderHeader } from './types';
import { downloadA3Pdf, downloadA3Png } from './utils/exportSheet';

interface ToastState {
  message: string;
  undoItems?: ResiItem[];
}

export function App() {
  const [sender, setSender] = useState<SenderHeader>(DEFAULT_SENDER_HEADER);
  const [resiList, setResiList] = useState<ResiItem[]>(() => [createEmptyResi()]);
  const [gridCapacity, setGridCapacity] = useState<GridCapacity>(5);
  const [showCutLines, setShowCutLines] = useState<boolean>(true);
  const [activeResiId, setActiveResiId] = useState<string | null>(() => resiList[0]?.id ?? null);
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');
  const [exportingType, setExportingType] = useState<'pdf' | 'png' | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const exportRef = useRef<HTMLDivElement | null>(null);
  const koliRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const toastTimerRef = useRef<number | null>(null);

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
    if (resiList.length >= gridCapacity) return;
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
    if (resiList.length >= gridCapacity) return;
    const source = resiList[sourceIndex];
    if (!source) return;

    const duplicated: ResiItem = {
      ...source,
      id: crypto.randomUUID(),
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

  const handleChangeGridCapacity = (nextCapacity: GridCapacity) => {
    setGridCapacity(nextCapacity);
    if (resiList.length > nextCapacity) {
      const previous = resiList;
      setResiList(resiList.slice(0, nextCapacity));
      showToast(`Mode ${nextCapacity} Resi aktif. Resi ke-5 disembunyikan.`, previous);
    }
  };

  const isResiFilled = (r: ResiItem) =>
    Boolean(
      r.kepada.trim() ||
        r.noHp.trim() ||
        r.namaBarang.trim() ||
        r.catatanKanan.trim() ||
        r.dari.trim() ||
        r.koliKe.trim()
    );

  const handleClearAll = () => {
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
    const samples = createSampleResiList().slice(0, gridCapacity);
    setResiList(samples);
    setActiveResiId(samples[0]?.id ?? null);
    showToast('Contoh 3 resi Suara Muhammadiyah dimuat.');
  };

  const handleSelectSlot = (id: string) => {
    setActiveResiId(id);
    document.getElementById(`resi-card-${id}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const handleExport = async (type: 'pdf' | 'png') => {
    if (!exportRef.current || exportingType) return;
    setExportingType(type);
    try {
      const filename =
        type === 'pdf'
          ? await downloadA3Pdf(exportRef.current)
          : await downloadA3Png(exportRef.current);
      showToast(`Berhasil mengunduh ${filename}`);
    } catch (err) {
      console.error('Export failed:', err);
      showToast('Gagal mengekspor dokumen. Silakan coba lagi.');
    } finally {
      setExportingType(null);
    }
  };

  const filledCount = resiList.filter(isResiFilled).length;

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-slate-100 text-slate-900">
      {/* Top Application Header */}
      <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 px-4 lg:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate tracking-wide">
              RESI GENERATOR
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 truncate">
              Suara Muhammadiyah • {resiList.length}/{gridCapacity} slot terpasang
            </p>
          </div>
        </div>

        {/* Desktop & Tablet Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLoadSample}
            className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            title="Isi formulir dengan contoh data resi"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Muat Contoh
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Bersihkan Formulir</span>
            <span className="xl:hidden">Bersihkan</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="hidden xl:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            title="Cetak langsung ke printer kertas A3"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak
          </button>

          <button
            type="button"
            disabled={exportingType !== null}
            onClick={() => handleExport('png')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {exportingType === 'png' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ImageDown className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Download PNG</span>
            <span className="sm:hidden">PNG</span>
          </button>

          <button
            type="button"
            disabled={exportingType !== null}
            onClick={() => handleExport('pdf')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 shadow-sm transition-colors"
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
      <div className="no-print lg:hidden sticky top-[61px] z-20 bg-white border-b border-slate-200 px-4 py-2">
        <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMobileTab('form')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all ${
              mobileTab === 'form'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Formulir ({resiList.length}/{gridCapacity})
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all ${
              mobileTab === 'preview'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Pratinjau A3
          </button>
        </div>
      </div>

      {/* Main Split-Screen Workspace */}
      <main className="no-print flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
        {/* Left Panel: Cascading Resi Form */}
        <section
          className={`${
            mobileTab === 'form' ? 'flex' : 'hidden'
          } lg:flex flex-col w-full lg:w-[460px] xl:w-[510px] lg:flex-shrink-0 bg-slate-50 lg:border-r border-slate-200 lg:h-full`}
        >
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-4 pb-24 lg:pb-8">
            {/* Static Read-only Sender Kop */}
            <SenderHeaderCard sender={sender} onChange={setSender} />

            {/* Mobile Quick Utilities */}
            <div className="flex sm:hidden items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleLoadSample}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Muat Contoh
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Bersihkan Formulir
              </button>
            </div>

            {/* Resi Cards List */}
            <div className="space-y-3.5">
              {resiList.map((item, idx) => (
                <ResiFormCard
                  key={item.id}
                  item={item}
                  index={idx}
                  total={resiList.length}
                  canDuplicate={resiList.length < gridCapacity}
                  isActive={activeResiId === item.id}
                  koliInputRef={(el) => {
                    koliRefs.current[item.id] = el;
                  }}
                  onFocus={() => setActiveResiId(item.id)}
                  onChange={(patch) => handleUpdateResi(item.id, patch)}
                  onDuplicate={() => handleDuplicateResi(idx)}
                  onDelete={() => handleDeleteResi(item.id)}
                  onMoveUp={() => handleMoveResi(idx, -1)}
                  onMoveDown={() => handleMoveResi(idx, 1)}
                />
              ))}
            </div>

            {/* Add Resi CTA */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleAddResi}
                disabled={resiList.length >= gridCapacity}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white py-3 px-4 text-sm font-semibold text-slate-700 hover:border-slate-900 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Plus className="w-4 h-4" />
                {resiList.length >= gridCapacity
                  ? `Halaman A3 Penuh (Maks. ${gridCapacity} Resi)`
                  : `Tambah Resi (${resiList.length}/${gridCapacity})`}
              </button>
              <p className="mt-2 text-center text-[11px] text-slate-400">
                {filledCount} resi terisi • Tanpa login, data diproses langsung di browser Anda.
              </p>
            </div>
          </div>
        </section>

        {/* Right Panel: Sticky Live Preview A3 */}
        <section
          className={`${
            mobileTab === 'preview' ? 'flex' : 'hidden'
          } lg:flex flex-1 flex-col min-w-0 h-[calc(100vh-116px)] lg:h-full`}
        >
          <PreviewPane
            items={resiList}
            sender={sender}
            gridCapacity={gridCapacity}
            showCutLines={showCutLines}
            activeResiId={activeResiId}
            onChangeGridCapacity={handleChangeGridCapacity}
            onToggleCutLines={() => setShowCutLines((v) => !v)}
            onSelectSlot={handleSelectSlot}
          />
        </section>
      </main>

      {/* Mobile Sticky Bottom Bar */}
      {mobileTab === 'form' && (
        <div className="no-print lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-2.5 flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white py-2.5 text-xs font-semibold text-slate-800"
          >
            <Eye className="w-4 h-4" />
            Lihat Pratinjau A3
          </button>
          <button
            type="button"
            disabled={exportingType !== null}
            onClick={() => handleExport('pdf')}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {exportingType === 'pdf' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            Download PDF
          </button>
        </div>
      )}

      {/* Off-screen Unscaled A3 Export Target + Native Print Surface */}
      <div
        aria-hidden="true"
        className="print-only-sheet"
        style={{
          position: 'fixed',
          top: 0,
          left: '-10000px',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        <A3Sheet
          ref={exportRef}
          items={resiList}
          sender={sender}
          gridCapacity={gridCapacity}
          showCutLines={showCutLines}
          isExport={true}
        />
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="no-print fixed bottom-16 lg:bottom-5 right-4 z-50 flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-lg ring-1 ring-white/10">
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
  );
}

export default App;
