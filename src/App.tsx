import { useRef, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  FileDown,
  FileSpreadsheet,
  FileText,
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
  paginateResiList,
  RESI_PER_PAGE,
} from './constants';
import { ResiItem, SenderHeader } from './types';
import { downloadResiExcel } from './utils/exportExcel';
import { downloadA4Pdf } from './utils/exportSheet';

interface ToastState {
  message: string;
  undoItems?: ResiItem[];
}

export function App() {
  const [sender, setSender] = useState<SenderHeader>(DEFAULT_SENDER_HEADER);
  const [resiList, setResiList] = useState<ResiItem[]>(() => [createEmptyResi()]);
  const [showCutLines, setShowCutLines] = useState<boolean>(true);
  const [activeResiId, setActiveResiId] = useState<string | null>(() => resiList[0]?.id ?? null);
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');
  const [exportingType, setExportingType] = useState<'pdf' | 'excel' | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

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

  const isResiFilled = (r: ResiItem) =>
    Boolean(
      r.kepada.trim() ||
        r.noHp.trim() ||
        r.namaBarang.trim() ||
        r.qty.trim() ||
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
    const samples = createSampleResiList();
    setResiList(samples);
    setActiveResiId(samples[0]?.id ?? null);
    showToast(`Contoh ${samples.length} resi TK ABA dimuat.`);
  };

  const handleSelectSlot = (id: string) => {
    setActiveResiId(id);
    document.getElementById(`resi-card-${id}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const handleExport = async (type: 'pdf' | 'excel') => {
    if (exportingType) return;
    if (type === 'pdf' && !exportRef.current) return;
    setExportingType(type);
    try {
      const result =
        type === 'pdf'
          ? await downloadA4Pdf(exportRef.current!, sender.presetId)
          : downloadResiExcel(resiList, sender);
      showToast(`Berhasil mengunduh ${result}`);
    } catch (err) {
      console.error('Export failed:', err);
      showToast('Gagal mengekspor dokumen. Silakan coba lagi.');
    } finally {
      setExportingType(null);
    }
  };

  const filledCount = resiList.filter(isResiFilled).length;
  const senderLabel = sender.presetId === 'sju' ? 'SJU' : 'Suara Muhammadiyah';

  return (
    <>
      <div className="no-print min-h-screen lg:h-screen flex flex-col bg-slate-100 text-slate-900">
        {/* Top Application Header (Colorful & Clear Action Hierarchy) */}
        <header className="sticky top-0 z-30 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white shadow-md px-4 lg:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-sm">
              <FileText className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold text-white leading-tight truncate tracking-wide">
                RESI GENERATOR
              </h1>
              <p className="text-[11px] sm:text-xs text-emerald-100 truncate">
                {senderLabel} • {resiList.length} resi ({pages.length} hal. A4)
              </p>
            </div>
          </div>

          {/* Desktop & Tablet Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSample}
              className="hidden md:inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300 shadow-sm transition-colors"
              title="Isi formulir dengan contoh data resi"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Muat Contoh
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-rose-300/40 bg-rose-500/25 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500/40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Bersihkan Formulir</span>
              <span className="xl:hidden">Bersihkan</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="hidden xl:inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/25 transition-colors"
              title="Cetak langsung ke printer kertas A4"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak
            </button>

            <button
              type="button"
              disabled={exportingType !== null}
              onClick={() => handleExport('excel')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-lime-300 px-3 py-2 text-xs font-bold text-emerald-950 hover:bg-lime-200 disabled:opacity-50 shadow-sm transition-colors"
              title="Unduh rekap data resi ke file Excel (.xlsx)"
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-extrabold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50 shadow-md transition-colors"
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
        <div className="lg:hidden sticky top-[61px] z-20 bg-white border-b border-slate-200 px-4 py-2">
          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMobileTab('form')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
                mobileTab === 'form'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Formulir ({resiList.length} Resi)
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('preview')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
                mobileTab === 'preview'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Pratinjau A4 ({pages.length})
            </button>
          </div>
        </div>

        {/* Main Split-Screen Workspace */}
        <main className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
          {/* Left Panel: Cascading Resi Form */}
          <section
            className={`${
              mobileTab === 'form' ? 'flex' : 'hidden'
            } lg:flex flex-col w-full lg:w-[460px] xl:w-[510px] lg:flex-shrink-0 bg-gradient-to-b from-slate-50 via-sky-50/30 to-emerald-50/30 lg:border-r border-slate-200 lg:h-full`}
          >
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-4 pb-24 lg:pb-8">
              {/* Sender Kop Selector (SM & SJU) */}
              <SenderHeaderCard sender={sender} onChange={setSender} />

              {/* Mobile Quick Utilities */}
              <div className="flex sm:hidden items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Muat Contoh
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Bersihkan
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
                    isActive={activeResiId === item.id}
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
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50/70 py-3 px-4 text-sm font-bold text-emerald-800 hover:border-emerald-600 hover:bg-emerald-100/80 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Resi Baru ({resiList.length} resi • {pages.length} Hal. A4)
                </button>
                <p className="mt-2 text-center text-[11px] text-slate-500">
                  <span className="font-semibold text-emerald-700">{filledCount} resi terisi</span>{' '}
                  • 4 resi per halaman A4, bertambah otomatis sesuai jumlah koli.
                </p>
              </div>
            </div>
          </section>

          {/* Right Panel: Sticky Multi-Page Live Preview A4 */}
          <section
            className={`${
              mobileTab === 'preview' ? 'flex' : 'hidden'
            } lg:flex flex-1 flex-col min-w-0 h-[calc(100vh-116px)] lg:h-full`}
          >
            <PreviewPane
              items={resiList}
              sender={sender}
              showCutLines={showCutLines}
              activeResiId={activeResiId}
              onToggleCutLines={() => setShowCutLines((v) => !v)}
              onSelectSlot={handleSelectSlot}
            />
          </section>
        </main>

        {/* Mobile Sticky Bottom Bar */}
        {mobileTab === 'form' && (
          <div className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white/95 backdrop-blur border-t border-slate-200 px-3 py-2.5 flex items-center gap-2 shadow-[0_-4px_12px_rgba(15,23,42,0.06)]">
            <button
              type="button"
              onClick={() => setMobileTab('preview')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 py-2.5 px-2 text-xs font-bold text-indigo-700"
            >
              <Eye className="w-4 h-4 flex-shrink-0" />
              <span>Pratinjau ({pages.length})</span>
            </button>
            <button
              type="button"
              disabled={exportingType !== null}
              onClick={() => handleExport('excel')}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 py-2.5 px-3 text-xs font-bold text-emerald-800 disabled:opacity-50"
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
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 px-2 text-xs font-bold text-white shadow-sm disabled:opacity-50"
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

      {/* Off-screen Multi-Page Unscaled A4 Export Target + Native Print Surface */}
      <div ref={exportRef} aria-hidden="true" className="print-only-sheet offscreen-print-sheet">
        {pages.map((pageItems, pageIdx) => (
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
        ))}
      </div>
    </>
  );
}

export default App;
