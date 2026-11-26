import React from 'react';
import {
  formatIndonesianNumber,
  parseIndonesianNumber,
} from '../constants';
import { SenderHeader, SuratJalanData } from '../types';
import { SuaraMuhammadiyahLogo } from './SuaraMuhammadiyahLogo';

interface SuratJalanCardPrintProps {
  data: SuratJalanData;
  sender: SenderHeader;
  copyRole: 'copy' | 'original';
}

export const SuratJalanCardPrint: React.FC<SuratJalanCardPrintProps> = ({
  data,
  sender,
  copyRole,
}) => {
  const isSju = sender.presetId === 'sju';
  const headerAccentBg = isSju ? '#FFEB00' : '#FBBF24';

  const copyLabelText =
    copyRole === 'copy'
      ? 'UNTUK DITINGGAL ( COPY )'
      : isSju
      ? 'UNTUK DIBAWA KEMBALI ( ASLI )'
      : 'UNTUK DIBAWA ( ASLI )';

  const totalQty = data.rows.reduce(
    (sum, row) => sum + parseIndonesianNumber(row.qty),
    0
  );
  const totalKoli = data.rows.reduce(
    (sum, row) => sum + parseIndonesianNumber(row.jumlahKoli),
    0
  );

  const formattedTotalQty = formatIndonesianNumber(totalQty);
  const formattedTotalKoli = formatIndonesianNumber(totalKoli);

  // Ensure at least 2 visible rows for balanced form layout
  const displayRows =
    data.rows.length >= 2
      ? data.rows
      : [
          ...data.rows,
          ...Array.from({ length: 2 - data.rows.length }, (_, idx) => ({
            id: `pad-${idx}`,
            namaBarang: '',
            qty: '',
            jumlahKoli: '',
            keterangan: '',
          })),
        ];

  const signatureColumns = isSju
    ? ['BAGIAN GUDANG', 'ADMINISTRASI', 'PENGIRIM', 'PENERIMA']
    : ['PENERIMA', 'BAGIAN GUDANG', 'PENGIRIM'];

  const compactRows = displayRows.length >= 4;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#FFFFFF',
        fontFamily: 'Calibri, "Carlito", Arial, Helvetica, sans-serif',
        color: '#000000',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        padding: '2px 4px',
        overflow: 'hidden',
      }}
    >
      {/* Top Content Block */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: isSju ? '6px' : '7px' }}>
        {isSju ? (
          <>
            {/* SJU Header: Left = Logo & Company, Right = Kepada/Alamat/No Tlp */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 52%' }}>
                <SuaraMuhammadiyahLogo
                  presetId="sju"
                  logoDataUrl={sender.logoDataUrl}
                  height={56}
                  maxWidth={110}
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: '#DC2626',
                      lineHeight: 1.15,
                      letterSpacing: '0.01em',
                    }}
                  >
                    {sender.title}
                  </div>
                  <div
                    style={{
                      fontSize: '8.5px',
                      fontWeight: 700,
                      color: '#4B5563',
                      letterSpacing: '0.06em',
                      marginBottom: '3px',
                    }}
                  >
                    PENERBIT &amp; PERCETAKAN
                  </div>
                  <div style={{ fontSize: '9px', lineHeight: 1.3, color: '#1F2937' }}>
                    <div>{sender.address}</div>
                    {sender.email && <div>Email: {sender.email}</div>}
                    {sender.phone && <div>Telp. {sender.phone}</div>}
                  </div>
                </div>
              </div>

              <div
                style={{
                  flex: '1 1 46%',
                  fontSize: '11px',
                  lineHeight: 1.32,
                  paddingTop: '2px',
                }}
              >
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span style={{ width: '58px', flexShrink: 0, fontWeight: 700 }}>KEPADA</span>
                  <span style={{ fontWeight: 700 }}>:</span>
                  <span style={{ fontWeight: 700, flex: 1 }}>{data.kepada || '-'}</span>
                </div>
                <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                  <span style={{ width: '58px', flexShrink: 0, fontWeight: 700 }}>ALAMAT</span>
                  <span style={{ fontWeight: 700 }}>:</span>
                  <span
                    style={{
                      flex: 1,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {data.alamat || '-'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                  <span style={{ width: '58px', flexShrink: 0, fontWeight: 700 }}>NO. TLP</span>
                  <span style={{ fontWeight: 700 }}>:</span>
                  <span style={{ fontWeight: 700, flex: 1 }}>{data.telepon || '-'}</span>
                </div>
              </div>
            </div>

            {/* SJU Centered Title */}
            <div style={{ textAlign: 'center', marginTop: '1px', marginBottom: '1px' }}>
              <div
                style={{
                  fontSize: '21px',
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                  lineHeight: 1.05,
                }}
              >
                SURAT JALAN
              </div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, marginTop: '2px' }}>
                No. {data.nomor || '-'}
                {data.tanggal ? `   •   Tanggal: ${data.tanggal}` : ''}
                {data.pengirim ? `   •   Pengirim: ${data.pengirim}` : ''}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* SM Header: Left = Logo + Kop, Right = SURAT JALAN */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <SuaraMuhammadiyahLogo
                  presetId="sm"
                  logoDataUrl={sender.logoDataUrl}
                  height={48}
                  maxWidth={112}
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 900,
                      lineHeight: 1.15,
                      color: '#000000',
                    }}
                  >
                    {sender.title}
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#111827', lineHeight: 1.25 }}>
                    {sender.address}
                  </div>
                  {sender.email && (
                    <div style={{ fontSize: '9px', color: '#1F2937', lineHeight: 1.25 }}>
                      Email: {sender.email}
                    </div>
                  )}
                  {sender.phone && (
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#000000', lineHeight: 1.25 }}>
                      Telp. {sender.phone}
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 900,
                  letterSpacing: '0.03em',
                  paddingRight: '10px',
                  color: '#000000',
                  flexShrink: 0,
                }}
              >
                SURAT JALAN
              </div>
            </div>

            {/* SM Metadata Box */}
            <div
              style={{
                border: '1.5px solid #000000',
                display: 'flex',
                flexDirection: 'row',
                fontSize: '10.5px',
                lineHeight: 1.32,
              }}
            >
              <div
                style={{
                  flex: '1 1 56%',
                  padding: '6px 10px',
                  borderRight: '1.5px solid #000000',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span style={{ width: '58px', flexShrink: 0, fontWeight: 700 }}>KEPADA</span>
                  <span style={{ fontWeight: 700 }}>:</span>
                  <span style={{ fontWeight: 800, flex: 1 }}>{data.kepada || '-'}</span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span style={{ width: '58px', flexShrink: 0, fontWeight: 700 }}>ALAMAT</span>
                  <span style={{ fontWeight: 700 }}>:</span>
                  <span
                    style={{
                      flex: 1,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {data.alamat || '-'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span style={{ width: '58px', flexShrink: 0, fontWeight: 700 }}>TELEPON</span>
                  <span style={{ fontWeight: 700 }}>:</span>
                  <span style={{ fontWeight: 700, flex: 1 }}>{data.telepon || '-'}</span>
                </div>
              </div>

              <div
                style={{
                  flex: '1 1 44%',
                  padding: '6px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: '3px',
                }}
              >
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span style={{ width: '62px', flexShrink: 0, fontWeight: 700 }}>Nomor</span>
                  <span style={{ fontWeight: 700 }}>:</span>
                  <span style={{ fontWeight: 800, flex: 1 }}>{data.nomor || '-'}</span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span style={{ width: '62px', flexShrink: 0, fontWeight: 700 }}>Tanggal</span>
                  <span style={{ fontWeight: 700 }}>:</span>
                  <span style={{ fontWeight: 700, flex: 1 }}>{data.tanggal || '-'}</span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span style={{ width: '62px', flexShrink: 0, fontWeight: 700 }}>Pengirim</span>
                  <span style={{ fontWeight: 700 }}>:</span>
                  <span style={{ fontWeight: 700, flex: 1 }}>{data.pengirim || ''}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Items Table */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            fontSize: compactRows ? '9.5px' : '10.5px',
          }}
        >
          <colgroup>
            <col style={{ width: '34px' }} />
            <col style={{ width: '38%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '18%' }} />
            <col />
          </colgroup>
          <thead>
            <tr
              style={{
                backgroundColor: headerAccentBg,
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              {['NO.', 'NAMA BARANG', 'QTY', 'JUMLAH KOLI', 'KETERANGAN'].map((col) => (
                <th
                  key={col}
                  style={{
                    border: '1.25px solid #000000',
                    padding: '4px 5px',
                    textAlign: 'center',
                    fontWeight: 800,
                    fontSize: '10px',
                    letterSpacing: '0.03em',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, idx) => {
              const hasContent =
                row.namaBarang.trim() ||
                row.qty.trim() ||
                row.jumlahKoli.trim() ||
                row.keterangan.trim();
              return (
                <tr key={row.id}>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: compactRows ? '2.5px 4px' : '4px 5px',
                      textAlign: 'center',
                      fontWeight: 700,
                    }}
                  >
                    {idx + 1}
                  </td>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: compactRows ? '2.5px 6px' : '4px 6px',
                      fontWeight: 700,
                      wordBreak: 'break-word',
                    }}
                  >
                    {hasContent ? row.namaBarang : '\u00A0'}
                  </td>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: compactRows ? '2.5px 6px' : '4px 6px',
                      textAlign: 'center',
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {row.qty}
                  </td>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: compactRows ? '2.5px 6px' : '4px 6px',
                      textAlign: 'center',
                      fontWeight: 800,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {row.jumlahKoli}
                  </td>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: compactRows ? '2.5px 6px' : '4px 6px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontWeight: 600,
                    }}
                  >
                    {row.keterangan}
                  </td>
                </tr>
              );
            })}

            {/* Total Row */}
            <tr>
              <td
                colSpan={2}
                style={{
                  border: '1.25px solid #000000',
                  padding: '4px 6px',
                  textAlign: 'center',
                  fontWeight: 900,
                  letterSpacing: '0.03em',
                }}
              >
                {isSju ? 'TOTAL' : 'TOTAL KOLI'}
              </td>
              <td
                style={{
                  border: '1.25px solid #000000',
                  padding: '4px 6px',
                  textAlign: 'center',
                  fontWeight: 900,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formattedTotalQty}
              </td>
              <td
                style={{
                  border: '1.25px solid #000000',
                  padding: '4px 6px',
                  textAlign: 'center',
                  fontWeight: 900,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {data.beratPerKoli.trim()
                  ? data.beratPerKoli.trim()
                  : formattedTotalKoli}
              </td>
              <td
                style={{
                  border: '1.25px solid #000000',
                  padding: '4px 6px',
                  fontWeight: 800,
                  textAlign: 'center',
                }}
              >
                {data.totalBerat.trim()
                  ? data.totalBerat.trim()
                  : data.beratPerKoli.trim() && formattedTotalKoli
                  ? `${formattedTotalKoli} KOLI`
                  : ''}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Red / Italic Note */}
        {data.catatan.trim() && (
          <div
            style={{
              fontSize: '9.5px',
              fontStyle: 'italic',
              fontWeight: 600,
              color: isSju ? '#1F2937' : '#DC2626',
              lineHeight: 1.25,
            }}
          >
            Note : {data.catatan}
          </div>
        )}
      </div>

      {/* Bottom Signature & Copy Role Block */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {isSju ? (
          /* SJU: 4 contiguous bordered columns */
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: headerAccentBg,
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
              >
                {signatureColumns.map((col) => (
                  <th
                    key={col}
                    style={{
                      border: '1.25px solid #000000',
                      padding: '4px 4px',
                      textAlign: 'center',
                      fontSize: '10px',
                      fontWeight: 800,
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {signatureColumns.map((col) => (
                  <td
                    key={col}
                    style={{
                      border: '1.25px solid #000000',
                      height: '62px',
                      verticalAlign: 'bottom',
                      textAlign: 'center',
                      padding: '4px 6px',
                      fontSize: '10px',
                      fontWeight: 600,
                    }}
                  >
                    (...............................)
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        ) : (
          /* SM: 2 signature groups matching SM reference (PENERIMA on left, BAGIAN GUDANG + PENGIRIM on right) */
          <div style={{ display: 'flex', gap: '14px' }}>
            <div style={{ flex: '1 1 36%', border: '1.25px solid #000000' }}>
              <div
                style={{
                  backgroundColor: headerAccentBg,
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                  borderBottom: '1.25px solid #000000',
                  padding: '3.5px 6px',
                  textAlign: 'center',
                  fontSize: '10px',
                  fontWeight: 800,
                }}
              >
                PENERIMA
              </div>
              <div
                style={{
                  height: '58px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  paddingBottom: '5px',
                  fontSize: '10px',
                  fontWeight: 600,
                }}
              >
                (...............................)
              </div>
            </div>

            <div
              style={{
                flex: '1 1 64%',
                border: '1.25px solid #000000',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  backgroundColor: headerAccentBg,
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                  borderBottom: '1.25px solid #000000',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                }}
              >
                <div
                  style={{
                    padding: '3.5px 6px',
                    textAlign: 'center',
                    fontSize: '10px',
                    fontWeight: 800,
                    borderRight: '1px solid #000000',
                  }}
                >
                  BAGIAN GUDANG
                </div>
                <div
                  style={{
                    padding: '3.5px 6px',
                    textAlign: 'center',
                    fontSize: '10px',
                    fontWeight: 800,
                  }}
                >
                  PENGIRIM
                </div>
              </div>
              <div
                style={{
                  height: '58px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    paddingBottom: '5px',
                    fontSize: '10px',
                    fontWeight: 600,
                    borderRight: '1px solid #000000',
                  }}
                >
                  (...............................)
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    paddingBottom: '5px',
                    fontSize: '10px',
                    fontWeight: 600,
                  }}
                >
                  (...............................)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footnote + Copy Indicator */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '9px', fontStyle: 'italic', color: '#1F2937' }}>
            {data.footnote}
          </div>
          {data.showCopyLabels && (
            <div
              style={{
                fontSize: '9.5px',
                fontWeight: 800,
                fontStyle: 'italic',
                color: '#DC2626',
                flexShrink: 0,
              }}
            >
              {copyLabelText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
