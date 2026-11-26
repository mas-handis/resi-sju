import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Scissors, ZoomIn, ZoomOut } from 'lucide-react';
import { A4_PX_HEIGHT, A4_PX_WIDTH } from '../constants';
import { SenderHeader, SuratJalanData } from '../types';
import { SuratJalanSheet } from './SuratJalanSheet';

interface SuratJalanPreviewPaneProps {
  data: SuratJalanData;
  sender: SenderHeader;
  showCutLines: boolean;
  onToggleCutLines: () => void;
}

export const SuratJalanPreviewPane: React.FC<SuratJalanPreviewPaneProps> = ({
  data,
  sender,
  showCutLines,
  onToggleCutLines,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [fitScale, setFitScale] = useState(0.55);
  const [zoomMultiplier, setZoomMultiplier] = useState(1);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const computeScale = () => {
      const rect = node.getBoundingClientRect();
      const padX = 40;
      const padY = 48;
      const availW = Math.max(rect.width - padX, 240);
      const availH = Math.max(rect.height - padY, 320);

      const scaleW = availW / A4_PX_WIDTH;
      const scaleH = availH / A4_PX_HEIGHT;
      const nextFit = Math.min(scaleW, scaleH, 1.0);
      setFitScale(Math.max(nextFit, 0.25));
    };

    computeScale();
    const observer = new ResizeObserver(computeScale);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const effectiveScale = fitScale * zoomMultiplier;
  const scaledWidth = A4_PX_WIDTH * effectiveScale;
  const scaledHeight = A4_PX_HEIGHT * effectiveScale;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-200/90 via-sky-100/70 to-emerald-100/60">
      {/* Preview Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
            Preview Surat Jalan A4
          </span>
          <span className="hidden sm:inline-flex items-center rounded-md bg-sky-50 border border-sky-200 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
            210 × 297 mm • 2 Rangkap/Hal (Copy &amp; Asli)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleCutLines}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              showCutLines
                ? 'border-amber-300 bg-amber-50 text-amber-900 shadow-sm'
                : 'border-slate-200 bg-slate-100 text-slate-500 hover:text-slate-700'
            }`}
            title="Tampilkan atau sembunyikan garis bantu potong tengah"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Garis Potong</span>
          </button>

          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() =>
                setZoomMultiplier((z) => Math.max(0.75, +(z - 0.15).toFixed(2)))
              }
              title="Perkecil tampilan"
              className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomMultiplier(1)}
              title="Reset zoom pas layar"
              className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 border-x border-slate-200 inline-flex items-center gap-1"
            >
              <Maximize2 className="w-3 h-3" />
              {Math.round(effectiveScale * 100)}%
            </button>
            <button
              type="button"
              onClick={() =>
                setZoomMultiplier((z) => Math.min(1.75, +(z + 0.15).toFixed(2)))
              }
              title="Perbesar tampilan"
              className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Scaled A4 Viewport */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto custom-scrollbar flex flex-col items-center p-5"
      >
        <div
          style={{
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
            flexShrink: 0,
            position: 'relative',
          }}
          className="rounded-sm bg-white shadow-[0_12px_36px_rgba(15,23,42,0.16)] ring-1 ring-slate-900/10"
        >
          <div
            style={{
              width: `${A4_PX_WIDTH}px`,
              height: `${A4_PX_HEIGHT}px`,
              transform: `scale(${effectiveScale})`,
              transformOrigin: 'top left',
            }}
          >
            <SuratJalanSheet
              data={data}
              sender={sender}
              showCutLines={showCutLines}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
