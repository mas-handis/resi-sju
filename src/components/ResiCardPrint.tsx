import React, { useLayoutEffect, useRef } from 'react';
import { DEFAULT_SENDER_HEADER } from '../constants';
import { GridCapacity, ResiItem, SenderHeader } from '../types';
import { SuaraMuhammadiyahLogo } from './SuaraMuhammadiyahLogo';

interface ResiCardPrintProps {
  item: ResiItem;
  sender: SenderHeader;
  gridCapacity: GridCapacity;
  isExport?: boolean;
}

function getCodeFontSize(value: string, isFourRow: boolean): number {
  const len = value.trim().length;
  if (len <= 3) return isFourRow ? 62 : 52;
  if (len <= 5) return isFourRow ? 48 : 40;
  if (len <= 7) return isFourRow ? 36 : 30;
  return isFourRow ? 26 : 22;
}

function formatPhoneDisplay(raw: string): string {
  const trimmed = raw.trim();
  if (/^(no\.?\s*hp|hp|telp|wa)/i.test(trimmed)) {
    return trimmed;
  }
  return `No. HP: ${trimmed}`;
}

const RIGHT_COL_WIDTH = 196;

export const ResiCardPrint: React.FC<ResiCardPrintProps> = ({
  item,
  sender,
  gridCapacity,
  isExport = false,
}) => {
  const isFourRow = gridCapacity === 4;

  const kepadaLines = item.kepada.split('\n');
  const firstLine = kepadaLines[0] ?? '';
  const restLines = kepadaLines.slice(1).join('\n');
  const hasKepada = item.kepada.trim().length > 0;
  const hasNoHp = item.noHp.trim().length > 0;
  const hasBarang = item.namaBarang.trim().length > 0;
  const hasCatatanKanan = item.catatanKanan.trim().length > 0;

  // Refs for auto-fitting Kepada + Alamat + No HP to fill available space
  const kepadaBoxRef = useRef<HTMLDivElement | null>(null);
  const kepadaContentRef = useRef<HTMLDivElement | null>(null);
  const firstLineRef = useRef<HTMLDivElement | null>(null);
  const restLinesRef = useRef<HTMLDivElement | null>(null);
  const noHpRef = useRef<HTMLDivElement | null>(null);

  // Refs for auto-fitting yellow bottom bars (Pesanan & Pojok Kanan)
  const barangBoxRef = useRef<HTMLDivElement | null>(null);
  const barangTextRef = useRef<HTMLDivElement | null>(null);
  const kananBoxRef = useRef<HTMLDivElement | null>(null);
  const kananTextRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const box = kepadaBoxRef.current;
    const content = kepadaContentRef.current;
    if (!box || !content || (!hasKepada && !hasNoHp)) return;

    const availH = box.clientHeight;
    const availW = box.clientWidth;
    if (availH <= 0 || availW <= 0) return;

    const applySize = (baseSize: number) => {
      const firstSize = Math.round(baseSize * 1.15);
      const gapSmall = Math.max(3, Math.round(baseSize * 0.16));
      const gapPhone = Math.max(4, Math.round(baseSize * 0.24));

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

    const minSize = 13;
    const maxSize = isFourRow ? 54 : 44;

    let low = minSize;
    let high = maxSize;
    let best = minSize;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      applySize(mid);

      // Compare against inner box dimensions (minus 2px safety margin)
      const fitsHeight = content.scrollHeight <= availH - 2;
      const fitsWidth = content.scrollWidth <= availW + 1;

      if (fitsHeight && fitsWidth) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    applySize(best);
  }, [item.kepada, item.noHp, gridCapacity, hasKepada, hasNoHp, isFourRow]);

  useLayoutEffect(() => {
    const fitSingleBox = (
      box: HTMLDivElement | null,
      textEl: HTMLDivElement | null,
      minSize: number,
      maxSize: number
    ) => {
      if (!box || !textEl) return;
      const style = getComputedStyle(box);
      const padH = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const padW = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const availH = box.clientHeight - padH;
      const availW = box.clientWidth - padW;
      if (availH <= 0 || availW <= 0) return;

      let low = minSize;
      let high = maxSize;
      let best = minSize;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        textEl.style.fontSize = `${mid}px`;
        if (textEl.scrollHeight <= availH + 1 && textEl.scrollWidth <= availW + 1) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      textEl.style.fontSize = `${best}px`;
    };

    if (hasBarang) {
      fitSingleBox(barangBoxRef.current, barangTextRef.current, 14, isFourRow ? 40 : 35);
    }
    if (hasCatatanKanan) {
      fitSingleBox(kananBoxRef.current, kananTextRef.current, 13, isFourRow ? 36 : 32);
    }
  }, [item.namaBarang, item.catatanKanan, gridCapacity, hasBarang, hasCatatanKanan, isFourRow]);

  // Default Logo SM already includes "SUARA MUHAMMADIYAH" wordmark.
  // Only render a separate title line if user uploaded a custom logo or customized the title.
  const showSeparateTitle =
    Boolean(sender.logoDataUrl) ||
    sender.title.trim().toUpperCase() !== DEFAULT_SENDER_HEADER.title.toUpperCase();

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        border: '2.5px solid #000000',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        fontFamily: 'Arial, Helvetica, "Inter", sans-serif',
        color: '#000000',
        overflow: 'hidden',
      }}
    >
      {/* Upper Main Body: Left (Kop + Kepada + No HP) & Right Corner (Row 1: KOLI KE, Row 2: DARI) */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        {/* Left Section: Kop Pengirim + Kepada */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Kop Pengirim */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '16px',
              padding: isFourRow ? '10px 18px' : '7px 16px',
              borderBottom: '2px solid #000000',
              backgroundColor: '#FFFFFF',
              flexShrink: 0,
            }}
          >
            <SuaraMuhammadiyahLogo
              logoDataUrl={sender.logoDataUrl}
              height={isFourRow ? 58 : 48}
            />
            <div
              style={{
                width: '1.5px',
                alignSelf: 'stretch',
                backgroundColor: '#D1D5DB',
                margin: '2px 0',
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              {showSeparateTitle && (
                <div
                  style={{
                    fontSize: isFourRow ? '20px' : '18px',
                    fontWeight: 900,
                    letterSpacing: '0.03em',
                    lineHeight: 1.15,
                    color: '#000000',
                    marginBottom: '2px',
                  }}
                >
                  {sender.title}
                </div>
              )}
              <div
                style={{
                  fontSize: isFourRow ? '15.5px' : '14px',
                  fontWeight: 700,
                  lineHeight: 1.3,
                  color: '#111827',
                }}
              >
                {sender.address}
              </div>
              <div
                style={{
                  fontSize: isFourRow ? '13.5px' : '12.5px',
                  fontWeight: 600,
                  lineHeight: 1.3,
                  color: '#374151',
                  marginTop: '2px',
                }}
              >
                {sender.phone ? `Telp. ${sender.phone}` : ''}
                {sender.phone && sender.email ? '  |  ' : ''}
                {sender.email ? `Email: ${sender.email}` : ''}
              </div>
            </div>
          </div>

          {/* Kepada (Penerima + Alamat + Nomor HP di bawah alamat, auto-fit hingga penuh) */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'stretch',
              padding: isFourRow ? '12px 18px' : '9px 16px',
              gap: '12px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '94px',
                flexShrink: 0,
                fontSize: isFourRow ? '17px' : '15.5px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                color: '#111827',
                paddingTop: '4px',
              }}
            >
              KEPADA :
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
              }}
            >
              {hasKepada || hasNoHp ? (
                <div
                  ref={kepadaContentRef}
                  style={{
                    width: '100%',
                  }}
                >
                  {hasKepada && (
                    <>
                      <div
                        ref={firstLineRef}
                        style={{
                          fontSize: isFourRow ? '32px' : '27px',
                          fontWeight: 800,
                          lineHeight: 1.18,
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
                            fontSize: isFourRow ? '28px' : '23px',
                            fontWeight: 700,
                            lineHeight: 1.24,
                            color: '#111827',
                            marginTop: '4px',
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
                        fontSize: isFourRow ? '28px' : '23px',
                        fontWeight: 800,
                        lineHeight: 1.24,
                        color: '#000000',
                        marginTop: hasKepada ? '6px' : '0px',
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
                    fontSize: isFourRow ? '17px' : '15.5px',
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
            borderLeft: '2.5px solid #000000',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Corner Row 1: KOLI KE */}
          <div
            style={{
              flex: 1,
              borderBottom: '2px solid #000000',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                borderBottom: '1px solid #000000',
                backgroundColor: '#F3F4F6',
                padding: isFourRow ? '5px 8px' : '4px 8px',
                textAlign: 'center',
                fontSize: isFourRow ? '12.5px' : '11.5px',
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
                padding: '4px 8px',
              }}
            >
              {item.koliKe.trim() ? (
                <span
                  style={{
                    fontSize: `${getCodeFontSize(item.koliKe, isFourRow)}px`,
                    fontWeight: 900,
                    lineHeight: 1,
                    color: '#000000',
                    fontVariantNumeric: 'tabular-nums',
                    textAlign: 'center',
                  }}
                >
                  {item.koliKe}
                </span>
              ) : !isExport ? (
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#CBD5E1' }}>—</span>
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
                padding: isFourRow ? '5px 8px' : '4px 8px',
                textAlign: 'center',
                fontSize: isFourRow ? '12.5px' : '11.5px',
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
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 8px',
              }}
            >
              {item.dari.trim() ? (
                <span
                  style={{
                    fontSize: `${getCodeFontSize(item.dari, isFourRow)}px`,
                    fontWeight: 900,
                    lineHeight: 1,
                    color: '#000000',
                    fontVariantNumeric: 'tabular-nums',
                    textAlign: 'center',
                  }}
                >
                  {item.dari}
                </span>
              ) : !isExport ? (
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#CBD5E1' }}>—</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Left = Pesanan (Yellow, Centered, Auto-fit), Right Corner Row 3 = Kolom Kuning (Editable, Centered) */}
      <div
        style={{
          borderTop: '2px solid #000000',
          display: 'flex',
          flexDirection: 'row',
          height: isFourRow ? '68px' : '58px',
          flexShrink: 0,
        }}
      >
        <div
          ref={barangBoxRef}
          style={{
            flex: 1,
            minWidth: 0,
            backgroundColor: '#FFEB00',
            padding: isFourRow ? '6px 16px' : '5px 14px',
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
                fontSize: isFourRow ? '34px' : '30px',
                fontWeight: 900,
                letterSpacing: '0.02em',
                lineHeight: 1.12,
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
                fontSize: isFourRow ? '20px' : '18px',
                textAlign: 'center',
              }}
            >
              Pesanan / nama barang...
            </div>
          ) : (
            '\u00A0'
          )}
        </div>

        {/* Corner Row 3: Yellow cell beside pesanan */}
        <div
          ref={kananBoxRef}
          style={{
            width: `${RIGHT_COL_WIDTH}px`,
            flexShrink: 0,
            borderLeft: '2.5px solid #000000',
            backgroundColor: '#FFEB00',
            padding: '5px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          {hasCatatanKanan ? (
            <div
              ref={kananTextRef}
              style={{
                width: '100%',
                fontSize: isFourRow ? '32px' : '28px',
                fontWeight: 900,
                letterSpacing: '0.02em',
                lineHeight: 1.12,
                color: '#000000',
                textTransform: 'uppercase',
                textAlign: 'center',
                wordBreak: 'break-word',
              }}
            >
              {item.catatanKanan}
            </div>
          ) : !isExport ? (
            <span
              style={{
                color: '#854D0E',
                opacity: 0.5,
                fontWeight: 700,
                fontStyle: 'italic',
                fontSize: '14px',
              }}
            >
              —
            </span>
          ) : (
            '\u00A0'
          )}
        </div>
      </div>
    </div>
  );
};
