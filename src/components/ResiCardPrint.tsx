import React from 'react';
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
  if (len <= 3) return isFourRow ? 56 : 46;
  if (len <= 5) return isFourRow ? 44 : 36;
  if (len <= 7) return isFourRow ? 34 : 28;
  return isFourRow ? 24 : 20;
}

function getRightYellowFontSize(value: string, isFourRow: boolean): number {
  const len = value.trim().length;
  if (len <= 6) return isFourRow ? 26 : 22;
  if (len <= 11) return isFourRow ? 21 : 18;
  return isFourRow ? 17 : 15;
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
              padding: isFourRow ? '10px 18px' : '8px 16px',
              borderBottom: '2px solid #000000',
              backgroundColor: '#FFFFFF',
              flexShrink: 0,
            }}
          >
            <SuaraMuhammadiyahLogo
              logoDataUrl={sender.logoDataUrl}
              height={isFourRow ? 60 : 50}
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
                  lineHeight: 1.32,
                  color: '#111827',
                }}
              >
                {sender.address}
              </div>
              <div
                style={{
                  fontSize: isFourRow ? '13.5px' : '12.5px',
                  fontWeight: 600,
                  lineHeight: 1.32,
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

          {/* Kepada (Penerima + Alamat + Nomor HP di bawah alamat) */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-start',
              padding: isFourRow ? '14px 18px' : '11px 16px',
              gap: '12px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '100px',
                flexShrink: 0,
                fontSize: isFourRow ? '16.5px' : '15px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                color: '#111827',
                paddingTop: '4px',
              }}
            >
              KEPADA :
            </div>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                overflow: 'hidden',
              }}
            >
              {hasKepada ? (
                <>
                  <div
                    style={{
                      fontSize: isFourRow ? '27px' : '24px',
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
                      style={{
                        fontSize: isFourRow ? '22px' : '19.5px',
                        fontWeight: 600,
                        lineHeight: 1.34,
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
              ) : !isExport && !hasNoHp ? (
                <div
                  style={{
                    fontSize: isFourRow ? '16.5px' : '15px',
                    fontStyle: 'italic',
                    color: '#94A3B8',
                    paddingTop: '3px',
                  }}
                >
                  Nama instansi/penerima &amp; alamat lengkap...
                </div>
              ) : null}

              {hasNoHp && (
                <div
                  style={{
                    fontSize: isFourRow ? '22px' : '19.5px',
                    fontWeight: 700,
                    lineHeight: 1.3,
                    color: '#000000',
                    marginTop: hasKepada ? '6px' : '0px',
                    wordBreak: 'break-word',
                  }}
                >
                  {formatPhoneDisplay(item.noHp)}
                </div>
              )}
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

      {/* Bottom Row: Left = Pesanan (Yellow, Centered), Right Corner Row 3 = Kolom Kuning (Editable, Centered) */}
      <div
        style={{
          borderTop: '2px solid #000000',
          display: 'flex',
          flexDirection: 'row',
          minHeight: isFourRow ? '62px' : '54px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            backgroundColor: '#FFEB00',
            padding: isFourRow ? '10px 18px' : '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '100%',
              fontSize: isFourRow ? '26px' : '22.5px',
              fontWeight: 900,
              letterSpacing: '0.02em',
              lineHeight: 1.2,
              color: '#000000',
              textTransform: 'uppercase',
              textAlign: 'center',
              wordBreak: 'break-word',
            }}
          >
            {hasBarang ? (
              item.namaBarang
            ) : !isExport ? (
              <span
                style={{
                  color: '#854D0E',
                  opacity: 0.55,
                  fontWeight: 700,
                  fontStyle: 'italic',
                  textTransform: 'none',
                  fontSize: isFourRow ? '19px' : '17px',
                }}
              >
                Pesanan / nama barang...
              </span>
            ) : (
              '\u00A0'
            )}
          </div>
        </div>

        {/* Corner Row 3: Yellow cell beside pesanan */}
        <div
          style={{
            width: `${RIGHT_COL_WIDTH}px`,
            flexShrink: 0,
            borderLeft: '2.5px solid #000000',
            backgroundColor: '#FFEB00',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '100%',
              fontSize: `${getRightYellowFontSize(item.catatanKanan, isFourRow)}px`,
              fontWeight: 900,
              letterSpacing: '0.02em',
              lineHeight: 1.15,
              color: '#000000',
              textTransform: 'uppercase',
              textAlign: 'center',
              wordBreak: 'break-word',
            }}
          >
            {hasCatatanKanan ? (
              item.catatanKanan
            ) : !isExport ? (
              <span
                style={{
                  color: '#854D0E',
                  opacity: 0.5,
                  fontWeight: 700,
                  fontStyle: 'italic',
                  textTransform: 'none',
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
    </div>
  );
};
