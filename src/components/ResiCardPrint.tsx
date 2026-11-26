import React, { useLayoutEffect, useRef } from 'react';
import { ResiItem, SenderHeader } from '../types';
import { SuaraMuhammadiyahLogo } from './SuaraMuhammadiyahLogo';

interface ResiCardPrintProps {
  item: ResiItem;
  sender: SenderHeader;
  isExport?: boolean;
}

function getCodeFontSize(value: string): number {
  const len = value.trim().length;
  if (len <= 3) return 40;
  if (len <= 5) return 32;
  if (len <= 7) return 24;
  return 18;
}

function formatPhoneDisplay(raw: string): string {
  const trimmed = raw.trim();
  if (/^(no\.?\s*hp|hp|telp|wa)/i.test(trimmed)) {
    return trimmed;
  }
  return `No. HP: ${trimmed}`;
}

const LEFT_LABEL_WIDTH = 68;
const RIGHT_COL_WIDTH = 148;

export const ResiCardPrint: React.FC<ResiCardPrintProps> = ({
  item,
  sender,
  isExport = false,
}) => {
  const kepadaLines = item.kepada.split('\n');
  const firstLine = kepadaLines[0] ?? '';
  const restLines = kepadaLines.slice(1).join('\n');
  const hasKepada = item.kepada.trim().length > 0;
  const hasNoHp = item.noHp.trim().length > 0;
  const hasBarang = item.namaBarang.trim().length > 0;
  const hasQty = item.qty.trim().length > 0;

  // Detect "<number> KOLI" pattern in `dari` so we can render the number bold and "KOLI" cleanly underneath
  const dariTrimmed = item.dari.trim();
  const koliMatch = dariTrimmed.match(/^(\d+)\s+koli$/i);

  // Refs for auto-fitting Kop Pengirim text lines cleanly
  const kopBoxRef = useRef<HTMLDivElement | null>(null);
  const kopTitleRef = useRef<HTMLDivElement | null>(null);
  const kopAddrRef = useRef<HTMLDivElement | null>(null);
  const kopContactRef = useRef<HTMLDivElement | null>(null);

  // Refs for auto-fitting Kepada + Alamat + No HP to fill available space safely
  const kepadaBoxRef = useRef<HTMLDivElement | null>(null);
  const kepadaContentRef = useRef<HTMLDivElement | null>(null);
  const firstLineRef = useRef<HTMLDivElement | null>(null);
  const restLinesRef = useRef<HTMLDivElement | null>(null);
  const noHpRef = useRef<HTMLDivElement | null>(null);

  // Refs for auto-fitting yellow bottom bars (Pesanan & QTY)
  const barangBoxRef = useRef<HTMLDivElement | null>(null);
  const barangTextRef = useRef<HTMLDivElement | null>(null);
  const qtyBoxRef = useRef<HTMLDivElement | null>(null);
  const qtyTextRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const box = kepadaBoxRef.current;
    const content = kepadaContentRef.current;
    if (!box || !content || (!hasKepada && !hasNoHp)) return;

    const availH = box.clientHeight;
    const availW = box.clientWidth;
    if (availH <= 0 || availW <= 0) return;

    const applySize = (baseSize: number) => {
      const firstSize = Math.round(baseSize * 1.12);
      const gapSmall = Math.max(2, Math.round(baseSize * 0.14));
      const gapPhone = Math.max(3, Math.round(baseSize * 0.2));

      if (firstLineRef.current) {
        firstLineRef.current.style.fontSize = `${firstSize}px`;
      }
      if (restLinesRef.current) {
        restLinesRef.current.style.fontSize = `${baseSize}px`;
        restLinesRef.current.style.marginTop = `${gapSmall}px`;
      }
      if (noHpRef.current) {
        noHpRef.current.style.fontSize = `${baseSize}px`;
        noHpRef.current.style.marginTop = hasKepada ? `${gapPhone}px` : '0px';
      }
    };

    const minSize = 10;
    const maxSize = 32;

    let low = minSize;
    let high = maxSize;
    let best = minSize;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      applySize(mid);

      // Leave a 10px vertical safety buffer so descenders never clip in html2canvas/print
      const fitsHeight = content.scrollHeight <= availH - 10;
      const fitsWidth = content.scrollWidth <= availW;

      if (fitsHeight && fitsWidth) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    applySize(best);
  }, [item.kepada, item.noHp, hasKepada, hasNoHp, sender.presetId, sender.logoDataUrl]);

  useLayoutEffect(() => {
    const fitSingleBox = (
      box: HTMLDivElement | null,
      textEl: HTMLDivElement | null,
      minSize: number,
      maxSize: number,
      extraReserveH = 8
    ) => {
      if (!box || !textEl) return;
      const style = getComputedStyle(box);
      const padH = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const padW = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const availH = box.clientHeight - padH - extraReserveH;
      const availW = box.clientWidth - padW;
      if (availH <= 0 || availW <= 0) return;

      let low = minSize;
      let high = maxSize;
      let best = minSize;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        textEl.style.fontSize = `${mid}px`;
        if (textEl.scrollHeight <= availH && textEl.scrollWidth <= availW) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      textEl.style.fontSize = `${best}px`;
    };

    if (hasBarang) {
      fitSingleBox(barangBoxRef.current, barangTextRef.current, 11, 24, 8);
    }
    if (hasQty) {
      fitSingleBox(qtyBoxRef.current, qtyTextRef.current, 11, 24, 16);
    }
  }, [item.namaBarang, item.qty, hasBarang, hasQty]);

  useLayoutEffect(() => {
    const box = kopBoxRef.current;
    if (!box) return;
    const availW = box.clientWidth;
    if (availW <= 0) return;

    const fitLineToWidth = (
      el: HTMLDivElement | null,
      minSize: number,
      maxSize: number
    ) => {
      if (!el) return;
      let low = minSize;
      let high = maxSize;
      let best = minSize;
      while (low <= high) {
        const mid = (low + high) / 2;
        el.style.fontSize = `${mid}px`;
        if (el.scrollWidth <= availW - 2) {
          best = mid;
          low = mid + 0.5;
        } else {
          high = mid - 0.5;
        }
        if (high - low < 0.4) break;
      }
      el.style.fontSize = `${Math.floor(best * 10) / 10}px`;
    };

    fitLineToWidth(kopTitleRef.current, 11, 19);
    fitLineToWidth(kopAddrRef.current, 9.5, 14);
    fitLineToWidth(kopContactRef.current, 8.5, 11.5);
  }, [sender.title, sender.address, sender.phone, sender.email, sender.presetId, sender.logoDataUrl]);

  const hasContactLine = Boolean(sender.phone || sender.email);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        border: '2px solid #000000',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        fontFamily: 'Arial, Helvetica, "Inter", sans-serif',
        color: '#000000',
        overflow: 'hidden',
      }}
    >
      {/* Upper Main Body: Left ([DARI | Kop] + [KEPADA | Recipient]) & Right Corner ([KOLI KE] + [DARI]) */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        {/* Left Section */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Row 1: Kolom Kiri "DARI" + Logo & Kop Pengirim */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'stretch',
              borderBottom: '1.5px solid #000000',
              backgroundColor: '#FFFFFF',
              flexShrink: 0,
            }}
          >
            {/* Left Label Column: DARI */}
            <div
              style={{
                width: `${LEFT_LABEL_WIDTH}px`,
                flexShrink: 0,
                borderRight: '1.5px solid #000000',
                backgroundColor: '#F3F4F6',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 6px',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '0.05em',
                color: '#111827',
                boxSizing: 'border-box',
              }}
            >
              DARI
            </div>

            {/* Logo + Kop Details */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '10px',
                padding: '7px 12px',
              }}
            >
              <SuaraMuhammadiyahLogo
                presetId={sender.presetId}
                logoDataUrl={sender.logoDataUrl}
                height={sender.presetId === 'sju' ? 36 : 48}
                maxWidth={sender.presetId === 'sju' ? 168 : 120}
              />
              <div
                style={{
                  width: '1.5px',
                  alignSelf: 'stretch',
                  backgroundColor: '#D1D5DB',
                  margin: '1px 0',
                  flexShrink: 0,
                }}
              />
              <div
                ref={kopBoxRef}
                style={{
                  minWidth: 0,
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  paddingBottom: '2px',
                }}
              >
                <div
                  ref={kopTitleRef}
                  style={{
                    fontSize: '18px',
                    fontWeight: 900,
                    letterSpacing: '0.02em',
                    lineHeight: 1.24,
                    color: '#000000',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {sender.title}
                </div>
                <div
                  ref={kopAddrRef}
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 700,
                    lineHeight: 1.28,
                    color: '#111827',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {sender.address}
                </div>
                {hasContactLine && (
                  <div
                    ref={kopContactRef}
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      lineHeight: 1.3,
                      color: '#374151',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {sender.phone ? `Telp. ${sender.phone}` : ''}
                    {sender.phone && sender.email ? ' | ' : ''}
                    {sender.email ? `Email: ${sender.email}` : ''}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Kolom Kiri "KEPADA" + Penerima & Alamat & No HP */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'stretch',
              overflow: 'hidden',
            }}
          >
            {/* Left Label Column: KEPADA (aligned vertically with DARI above) */}
            <div
              style={{
                width: `${LEFT_LABEL_WIDTH}px`,
                flexShrink: 0,
                borderRight: '1.5px solid #000000',
                backgroundColor: '#F3F4F6',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                color: '#111827',
                boxSizing: 'border-box',
              }}
            >
              KEPADA
            </div>

            <div
              ref={kepadaBoxRef}
              style={{
                flex: 1,
                minWidth: 0,
                height: '100%',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '6px 12px',
                boxSizing: 'border-box',
              }}
            >
              {hasKepada || hasNoHp ? (
                <div
                  ref={kepadaContentRef}
                  style={{
                    width: '100%',
                    paddingTop: '2px',
                    paddingBottom: '4px',
                  }}
                >
                  {hasKepada && (
                    <>
                      <div
                        ref={firstLineRef}
                        style={{
                          fontSize: '22px',
                          fontWeight: 800,
                          lineHeight: 1.24,
                          color: '#000000',
                          wordBreak: 'break-word',
                        }}
                      >
                        {firstLine}
                      </div>
                      {restLines.length > 0 && (
                        <div
                          ref={restLinesRef}
                          style={{
                            fontSize: '19px',
                            fontWeight: 700,
                            lineHeight: 1.28,
                            color: '#111827',
                            marginTop: '3px',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {restLines}
                        </div>
                      )}
                    </>
                  )}

                  {hasNoHp && (
                    <div
                      ref={noHpRef}
                      style={{
                        fontSize: '19px',
                        fontWeight: 800,
                        lineHeight: 1.28,
                        color: '#000000',
                        marginTop: hasKepada ? '4px' : '0px',
                        wordBreak: 'break-word',
                      }}
                    >
                      {formatPhoneDisplay(item.noHp)}
                    </div>
                  )}
                </div>
              ) : !isExport ? (
                <div
                  style={{
                    fontSize: '13.5px',
                    fontStyle: 'italic',
                    color: '#94A3B8',
                  }}
                >
                  Nama instansi/penerima &amp; alamat lengkap...
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right Corner Column — Row 1: KOLI KE, Row 2: DARI */}
        <div
          style={{
            width: `${RIGHT_COL_WIDTH}px`,
            flexShrink: 0,
            borderLeft: '2px solid #000000',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Corner Row 1: KOLI KE */}
          <div
            style={{
              flex: 1,
              borderBottom: '1.5px solid #000000',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                borderBottom: '1px solid #000000',
                backgroundColor: '#F3F4F6',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
                padding: '4px 6px',
                textAlign: 'center',
                fontSize: '10.5px',
                fontWeight: 800,
                letterSpacing: '0.09em',
                color: '#000000',
                flexShrink: 0,
              }}
            >
              KOLI KE
            </div>
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px 6px 5px',
              }}
            >
              {item.koliKe.trim() ? (
                <span
                  style={{
                    fontSize: `${getCodeFontSize(item.koliKe)}px`,
                    fontWeight: 900,
                    lineHeight: 1.05,
                    color: '#000000',
                    fontVariantNumeric: 'tabular-nums',
                    textAlign: 'center',
                  }}
                >
                  {item.koliKe}
                </span>
              ) : !isExport ? (
                <span style={{ fontSize: '22px', fontWeight: 700, color: '#CBD5E1' }}>—</span>
              ) : null}
            </div>
          </div>

          {/* Corner Row 2: DARI */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                borderBottom: '1px solid #000000',
                backgroundColor: '#F3F4F6',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
                padding: '4px 6px',
                textAlign: 'center',
                fontSize: '10.5px',
                fontWeight: 800,
                letterSpacing: '0.09em',
                color: '#000000',
                flexShrink: 0,
              }}
            >
              DARI
            </div>
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px 6px 5px',
              }}
            >
              {dariTrimmed ? (
                koliMatch ? (
                  <>
                    <span
                      style={{
                        fontSize: `${getCodeFontSize(koliMatch[1])}px`,
                        fontWeight: 900,
                        lineHeight: 1,
                        color: '#000000',
                        fontVariantNumeric: 'tabular-nums',
                        textAlign: 'center',
                      }}
                    >
                      {koliMatch[1]}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        letterSpacing: '0.12em',
                        color: '#1F2937',
                        marginTop: '2px',
                      }}
                    >
                      KOLI
                    </span>
                  </>
                ) : (
                  <span
                    style={{
                      fontSize: `${getCodeFontSize(dariTrimmed)}px`,
                      fontWeight: 900,
                      lineHeight: 1.05,
                      color: '#000000',
                      fontVariantNumeric: 'tabular-nums',
                      textAlign: 'center',
                      wordBreak: 'break-word',
                    }}
                  >
                    {dariTrimmed}
                  </span>
                )
              ) : !isExport ? (
                <span style={{ fontSize: '22px', fontWeight: 700, color: '#CBD5E1' }}>—</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Left = Pesanan (Yellow, Centered), Right Corner Row 3 = QTY inside Yellow Box */}
      <div
        style={{
          borderTop: '1.5px solid #000000',
          display: 'flex',
          flexDirection: 'row',
          height: '48px',
          flexShrink: 0,
        }}
      >
        <div
          ref={barangBoxRef}
          style={{
            flex: 1,
            minWidth: 0,
            backgroundColor: '#FFEB00',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
            padding: '2px 12px 4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          {hasBarang ? (
            <div
              ref={barangTextRef}
              style={{
                width: '100%',
                fontSize: '22px',
                fontWeight: 900,
                letterSpacing: '0.02em',
                lineHeight: 1.2,
                color: '#000000',
                textTransform: 'uppercase',
                textAlign: 'center',
                wordBreak: 'break-word',
              }}
            >
              {item.namaBarang}
            </div>
          ) : !isExport ? (
            <div
              style={{
                width: '100%',
                color: '#854D0E',
                opacity: 0.55,
                fontWeight: 700,
                fontStyle: 'italic',
                fontSize: '15px',
                textAlign: 'center',
              }}
            >
              Pesanan / nama barang...
            </div>
          ) : (
            '\u00A0'
          )}
        </div>

        {/* Corner Row 3: QTY inside yellow box */}
        <div
          ref={qtyBoxRef}
          style={{
            width: `${RIGHT_COL_WIDTH}px`,
            flexShrink: 0,
            borderLeft: '2px solid #000000',
            backgroundColor: '#FFEB00',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
            padding: '2px 8px 4px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          <span
            style={{
              fontSize: '9px',
              fontWeight: 800,
              letterSpacing: '0.1em',
              lineHeight: 1.1,
              color: '#000000',
            }}
          >
            QTY
          </span>
          {hasQty ? (
            <div
              ref={qtyTextRef}
              style={{
                width: '100%',
                fontSize: '21px',
                fontWeight: 900,
                letterSpacing: '0.02em',
                lineHeight: 1.1,
                color: '#000000',
                fontVariantNumeric: 'tabular-nums',
                textAlign: 'center',
                wordBreak: 'break-word',
              }}
            >
              {item.qty}
            </div>
          ) : !isExport ? (
            <span
              style={{
                color: '#854D0E',
                opacity: 0.5,
                fontWeight: 700,
                fontStyle: 'italic',
                fontSize: '13px',
                lineHeight: 1.1,
              }}
            >
              —
            </span>
          ) : (
            <span style={{ lineHeight: 1.1 }}>{'\u00A0'}</span>
          )}
        </div>
      </div>
    </div>
  );
};
