import * as XLSX from 'xlsx-js-style';
import {
  formatIndonesianNumber,
  getKelompokColor,
  getResiBottomRows,
  isResiFilled,
  parseIndonesianNumber,
} from '../constants';
import {
  KelompokColorId,
  ResiItem,
  SavedItemSuggestion,
  SavedRecipient,
  SenderHeader,
  ShipmentActionType,
  ShipmentRecord,
  SuratJalanData,
} from '../types';
import { buildTimestamp } from './exportSheet';

type CellStyle = XLSX.CellStyle;

const FONT_NAME = 'Calibri';

const BORDER_THIN: CellStyle['border'] = {
  top: { style: 'thin', color: { rgb: 'CBD5E1' } },
  bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } },
};

const BORDER_HEADER: CellStyle['border'] = {
  top: { style: 'medium', color: { rgb: '0B6E4F' } },
  bottom: { style: 'medium', color: { rgb: 'C2410C' } },
  left: { style: 'thin', color: { rgb: 'FDBA74' } },
  right: { style: 'thin', color: { rgb: 'FDBA74' } },
};

const BORDER_TOTAL: CellStyle['border'] = {
  top: { style: 'medium', color: { rgb: 'EA580C' } },
  bottom: { style: 'medium', color: { rgb: 'EA580C' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } },
};

const STYLE_BANNER: CellStyle = {
  fill: { fgColor: { rgb: '0B6E4F' } },
  font: { name: FONT_NAME, sz: 14, bold: true, color: { rgb: 'FFFFFF' } },
  alignment: { horizontal: 'left', vertical: 'center' },
};

const STYLE_SUBTITLE: CellStyle = {
  fill: { fgColor: { rgb: 'ECFDF5' } },
  font: { name: FONT_NAME, sz: 10, italic: true, color: { rgb: '065F46' } },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: { bottom: { style: 'thin', color: { rgb: 'A7F3D0' } } },
};

const STYLE_TABLE_HEADER: CellStyle = {
  fill: { fgColor: { rgb: 'EA580C' } },
  font: { name: FONT_NAME, sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: BORDER_HEADER,
};

const STYLE_META_LABEL: CellStyle = {
  fill: { fgColor: { rgb: 'D1FAE5' } },
  font: { name: FONT_NAME, sz: 10, bold: true, color: { rgb: '065F46' } },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: BORDER_THIN,
};

const STYLE_META_VALUE: CellStyle = {
  fill: { fgColor: { rgb: 'FFFFFF' } },
  font: { name: FONT_NAME, sz: 10, color: { rgb: '0F172A' } },
  alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
  border: BORDER_THIN,
};

const STYLE_TOTAL_ROW: CellStyle = {
  fill: { fgColor: { rgb: 'FFEDD5' } },
  font: { name: FONT_NAME, sz: 11, bold: true, color: { rgb: '9A3412' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: BORDER_TOTAL,
};

function getKelompokBadgeStyle(colorId: KelompokColorId | undefined): CellStyle {
  const palette: Record<KelompokColorId, { bg: string; fg: string }> = {
    kelompok_a: { bg: 'FEF08A', fg: '854D0E' },
    kelompok_b: { bg: 'BBF7D0', fg: '166534' },
    kelompok_kb: { bg: 'BFDBFE', fg: '1E40AF' },
    tanpa_kelompok: { bg: 'FED7AA', fg: '9A3412' },
  };
  const chosen = palette[colorId ?? 'kelompok_a'] ?? palette.kelompok_a;
  return {
    fill: { fgColor: { rgb: chosen.bg } },
    font: { name: FONT_NAME, sz: 10, bold: true, color: { rgb: chosen.fg } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: BORDER_THIN,
  };
}

function getDataCellStyle(
  rowIndex: number,
  horizontal: 'left' | 'center' | 'right' = 'left',
  bold = false
): CellStyle {
  const isAlt = rowIndex % 2 === 1;
  return {
    fill: { fgColor: { rgb: isAlt ? 'F0FDF4' : 'FFFFFF' } },
    font: { name: FONT_NAME, sz: 10, bold, color: { rgb: '0F172A' } },
    alignment: { horizontal, vertical: 'center', wrapText: true },
    border: BORDER_THIN,
  };
}

function setCellStyle(
  ws: XLSX.WorkSheet,
  row: number,
  col: number,
  style: CellStyle
): void {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = ws[addr];
  if (!cell) {
    ws[addr] = { t: 's', v: '', s: style };
    return;
  }
  cell.s = style;
}

function styleRange(
  ws: XLSX.WorkSheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  style: CellStyle
): void {
  for (let r = startRow; r <= endRow; r += 1) {
    for (let c = startCol; c <= endCol; c += 1) {
      setCellStyle(ws, r, c, style);
    }
  }
}

function estimateRowHeight(
  rowValues: Array<string | number>,
  colWidths: number[],
  minHeight = 22
): number {
  let maxLines = 1;
  rowValues.forEach((val, idx) => {
    const text = String(val ?? '');
    if (!text) return;
    const width = Math.max(colWidths[idx] ?? 15, 8);
    const lines = text.split('\n').reduce((acc, part) => {
      return acc + Math.max(1, Math.ceil(part.length / Math.max(width - 2, 6)));
    }, 0);
    if (lines > maxLines) maxLines = lines;
  });
  return Math.max(minHeight, maxLines * 15 + 8);
}

function formatExportDateLabel(): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 16);
  }
}

function triggerExcelDownload(workbook: XLSX.WorkBook, filename: string): void {
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generates and downloads a styled Excel (.xlsx) recap of the shipping receipts.
 */
export function downloadResiExcel(resiList: ResiItem[], sender: SenderHeader): string {
  const hasAnyFilled = resiList.some(isResiFilled);
  const itemsToExport = hasAnyFilled ? resiList.filter(isResiFilled) : resiList;

  const headers = [
    'No',
    'Pengirim',
    'Penerima / Instansi',
    'Alamat Tujuan',
    'No. HP Penerima',
    'Kelompok / Warna',
    'Pesanan / Nama Barang',
    'QTY',
    'Koli Ke',
    'Dari (Total Koli)',
    'Alamat Pengirim',
    'Kontak Pengirim',
  ];

  const rowPrimaryColors: Array<KelompokColorId | undefined> = [];
  const dataRows = itemsToExport.map((item, idx) => {
    const kepadaLines = item.kepada
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const penerima = kepadaLines[0] ?? '';
    const alamat = kepadaLines.length > 1 ? kepadaLines.slice(1).join(', ') : '';
    const kontakPengirim = [sender.phone, sender.email].filter(Boolean).join(' | ');
    const dariTrimmed = item.dari.trim();
    const formattedDari = /^\d+$/.test(dariTrimmed) ? `${dariTrimmed} KOLI` : dariTrimmed;

    const bottomRows = getResiBottomRows(item);
    const activeRows =
      bottomRows.length > 1
        ? bottomRows.filter((r) => r.namaBarang.trim() || r.qty.trim())
        : bottomRows;
    const rowsForExport = activeRows.length > 0 ? activeRows : [bottomRows[0]];
    rowPrimaryColors.push(rowsForExport[0]?.colorId);

    const kelompokSummary = rowsForExport
      .map((r) => {
        const cfg = getKelompokColor(r.colorId);
        return `${cfg.label} (${cfg.colorName})`;
      })
      .join('\n');
    const barangSummary = rowsForExport
      .map((r) => r.namaBarang.trim())
      .filter(Boolean)
      .join('\n');
    const qtySummary = rowsForExport
      .map((r) => (r.useQty !== false ? r.qty.trim() : ''))
      .filter(Boolean)
      .join('\n');

    return [
      idx + 1,
      sender.title,
      penerima,
      alamat,
      item.noHp.trim(),
      kelompokSummary,
      barangSummary,
      qtySummary,
      item.koliKe.trim(),
      formattedDari,
      sender.address,
      kontakPengirim,
    ];
  });

  const bannerRow = [`REKAP RESI PENGIRIMAN — ${sender.title.toUpperCase()}`];
  const subtitleRow = [
    `Total: ${dataRows.length} Resi  •  Diunduh: ${formatExportDateLabel()}`,
  ];
  const totalRow = [
    'TOTAL',
    '',
    `${dataRows.length} Resi Pengiriman`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ];

  const aoa = [bannerRow, subtitleRow, [], headers, ...dataRows, totalRow];
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);

  const lastCol = headers.length - 1;
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
  ];

  const colWidths = headers.map((header, colIdx) => {
    let maxLen = header.length;
    for (const row of dataRows) {
      const cellStr = String(row[colIdx] ?? '');
      for (const line of cellStr.split('\n')) {
        if (line.length > maxLen) maxLen = line.length;
      }
    }
    const minWidth = colIdx === 0 ? 6 : colIdx === 7 || colIdx === 8 ? 10 : 14;
    const maxWidth = colIdx === 3 || colIdx === 6 || colIdx === 10 ? 44 : 32;
    return Math.min(Math.max(maxLen + 4, minWidth), maxWidth);
  });
  worksheet['!cols'] = colWidths.map((wch) => ({ wch }));

  // Apply colors, fonts, alignments, and borders
  styleRange(worksheet, 0, 0, 0, lastCol, STYLE_BANNER);
  styleRange(worksheet, 1, 1, 0, lastCol, STYLE_SUBTITLE);
  styleRange(worksheet, 3, 3, 0, lastCol, STYLE_TABLE_HEADER);

  const centerCols = new Set([0, 4, 7, 8, 9]);
  dataRows.forEach((_row, rIdx) => {
    const excelRow = 4 + rIdx;
    for (let c = 0; c <= lastCol; c += 1) {
      if (c === 5) {
        setCellStyle(worksheet, excelRow, c, getKelompokBadgeStyle(rowPrimaryColors[rIdx]));
      } else {
        setCellStyle(
          worksheet,
          excelRow,
          c,
          getDataCellStyle(rIdx, centerCols.has(c) ? 'center' : 'left', c === 0 || c === 2)
        );
      }
    }
  });

  const totalRowIdx = 4 + dataRows.length;
  styleRange(worksheet, totalRowIdx, totalRowIdx, 0, lastCol, STYLE_TOTAL_ROW);
  setCellStyle(worksheet, totalRowIdx, 2, {
    ...STYLE_TOTAL_ROW,
    alignment: { horizontal: 'left', vertical: 'center' },
  });

  // Row heights
  const rowHeights: XLSX.RowInfo[] = [
    { hpt: 30 },
    { hpt: 22 },
    { hpt: 10 },
    { hpt: 28 },
    ...dataRows.map((row) => ({ hpt: estimateRowHeight(row, colWidths, 24) })),
    { hpt: 24 },
  ];
  worksheet['!rows'] = rowHeights;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Resi');

  const prefix =
    sender.presetId === 'sju' ? 'rekap-resi-sju' : 'rekap-resi-suara-muhammadiyah';
  const filename = `${prefix}-${buildTimestamp()}.xlsx`;
  triggerExcelDownload(workbook, filename);

  return filename;
}

/**
 * Generates and downloads a styled Excel (.xlsx) summary for one or more Surat Jalan sheets.
 */
export function downloadSuratJalanExcel(
  items: SuratJalanData | SuratJalanData[],
  sender: SenderHeader
): string {
  const sheetList = Array.isArray(items) ? items : [items];
  const workbook = XLSX.utils.book_new();

  if (sheetList.length > 1) {
    const summaryHeaders = [
      'No.',
      'Nomor Surat Jalan',
      'Tanggal',
      'Kepada',
      'Alamat',
      'Telepon',
      'Total QTY',
      'Total Koli',
      'Total Berat',
    ];
    const summaryRows = sheetList.map((data, idx) => {
      const totalQty = data.rows.reduce((sum, r) => sum + parseIndonesianNumber(r.qty), 0);
      const totalKoli = data.rows.reduce(
        (sum, r) => sum + parseIndonesianNumber(r.jumlahKoli),
        0
      );
      return [
        idx + 1,
        data.nomor.trim(),
        data.tanggal.trim(),
        data.kepada.trim(),
        data.alamat.trim().replace(/\n/g, ', '),
        data.telepon.trim(),
        formatIndonesianNumber(totalQty),
        formatIndonesianNumber(totalKoli),
        data.totalBerat.trim(),
      ];
    });

    const grandQty = sheetList.reduce(
      (s, d) => s + d.rows.reduce((rs, r) => rs + parseIndonesianNumber(r.qty), 0),
      0
    );
    const grandKoli = sheetList.reduce(
      (s, d) => s + d.rows.reduce((rs, r) => rs + parseIndonesianNumber(r.jumlahKoli), 0),
      0
    );

    const summaryAoa = [
      [`REKAP SURAT JALAN — ${sender.title.toUpperCase()}`],
      [`Total: ${sheetList.length} Lembar  •  Diunduh: ${formatExportDateLabel()}`],
      [],
      summaryHeaders,
      ...summaryRows,
      [
        'TOTAL',
        '',
        '',
        `${sheetList.length} Surat Jalan`,
        '',
        '',
        formatIndonesianNumber(grandQty),
        formatIndonesianNumber(grandKoli),
        '',
      ],
    ];

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryAoa);
    const lastSumCol = summaryHeaders.length - 1;
    summaryWs['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastSumCol } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastSumCol } },
    ];
    const sumWidths = [7, 24, 15, 24, 38, 16, 13, 13, 18];
    summaryWs['!cols'] = sumWidths.map((wch) => ({ wch }));

    styleRange(summaryWs, 0, 0, 0, lastSumCol, STYLE_BANNER);
    styleRange(summaryWs, 1, 1, 0, lastSumCol, STYLE_SUBTITLE);
    styleRange(summaryWs, 3, 3, 0, lastSumCol, STYLE_TABLE_HEADER);

    const sumCenterCols = new Set([0, 2, 5, 6, 7, 8]);
    summaryRows.forEach((_row, rIdx) => {
      const excelRow = 4 + rIdx;
      for (let c = 0; c <= lastSumCol; c += 1) {
        setCellStyle(
          summaryWs,
          excelRow,
          c,
          getDataCellStyle(rIdx, sumCenterCols.has(c) ? 'center' : 'left', c === 0 || c === 3)
        );
      }
    });

    const sumTotalIdx = 4 + summaryRows.length;
    styleRange(summaryWs, sumTotalIdx, sumTotalIdx, 0, lastSumCol, STYLE_TOTAL_ROW);
    setCellStyle(summaryWs, sumTotalIdx, 3, {
      ...STYLE_TOTAL_ROW,
      alignment: { horizontal: 'left', vertical: 'center' },
    });

    summaryWs['!rows'] = [
      { hpt: 30 },
      { hpt: 22 },
      { hpt: 10 },
      { hpt: 28 },
      ...summaryRows.map((row) => ({ hpt: estimateRowHeight(row, sumWidths, 24) })),
      { hpt: 24 },
    ];

    XLSX.utils.book_append_sheet(workbook, summaryWs, 'Rekap Surat Jalan');
  }

  sheetList.forEach((data, sheetIdx) => {
    const activeRows = data.rows.filter(
      (r) =>
        r.namaBarang.trim() ||
        r.qty.trim() ||
        r.jumlahKoli.trim() ||
        r.keterangan.trim()
    );
    const rowsToExport = activeRows.length > 0 ? activeRows : data.rows;

    const totalQty = data.rows.reduce((sum, r) => sum + parseIndonesianNumber(r.qty), 0);
    const totalKoli = data.rows.reduce(
      (sum, r) => sum + parseIndonesianNumber(r.jumlahKoli),
      0
    );

    const itemRows = rowsToExport.map((row, idx) => [
      idx + 1,
      row.namaBarang.trim(),
      row.qty.trim(),
      row.jumlahKoli.trim(),
      row.keterangan.trim().replace(/\n/g, '; '),
    ]);

    const aoa: (string | number)[][] = [
      [`SURAT JALAN — ${sender.title.toUpperCase()}`],
      [`Diunduh: ${formatExportDateLabel()}`],
      ['Nomor', data.nomor || '-', 'Kepada', data.kepada || '-', ''],
      ['Tanggal', data.tanggal || '-', 'Alamat', data.alamat.replace(/\n/g, ', ') || '-', ''],
      ['Pengirim', data.pengirim || '-', 'Telepon', data.telepon || '-', ''],
      [],
      ['No.', 'Nama Barang', 'QTY', 'Jumlah Koli', 'Keterangan'],
      ...itemRows,
      [
        'TOTAL',
        `${rowsToExport.length} Jenis Barang`,
        formatIndonesianNumber(totalQty),
        data.beratPerKoli.trim() || formatIndonesianNumber(totalKoli),
        data.totalBerat.trim() ||
          (data.beratPerKoli.trim() && totalKoli
            ? `${formatIndonesianNumber(totalKoli)} KOLI`
            : ''),
      ],
    ];

    const hasCatatan = Boolean(data.catatan.trim());
    if (hasCatatan) {
      aoa.push([]);
      aoa.push(['Catatan', data.catatan.trim(), '', '', '']);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    const sjWidths = [11, 38, 14, 18, 38];
    worksheet['!cols'] = sjWidths.map((wch) => ({ wch }));

    const merges: XLSX.Range[] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
      { s: { r: 2, c: 3 }, e: { r: 2, c: 4 } },
      { s: { r: 3, c: 3 }, e: { r: 3, c: 4 } },
      { s: { r: 4, c: 3 }, e: { r: 4, c: 4 } },
    ];
    if (hasCatatan) {
      const catRowIdx = 8 + itemRows.length + 1;
      merges.push({ s: { r: catRowIdx, c: 1 }, e: { r: catRowIdx, c: 4 } });
    }
    worksheet['!merges'] = merges;

    // Style Banner & Subtitle
    styleRange(worksheet, 0, 0, 0, 4, STYLE_BANNER);
    styleRange(worksheet, 1, 1, 0, 4, STYLE_SUBTITLE);

    // Style Meta Block (Rows 2..4)
    for (let r = 2; r <= 4; r += 1) {
      setCellStyle(worksheet, r, 0, STYLE_META_LABEL);
      setCellStyle(worksheet, r, 1, STYLE_META_VALUE);
      setCellStyle(worksheet, r, 2, STYLE_META_LABEL);
      setCellStyle(worksheet, r, 3, STYLE_META_VALUE);
      setCellStyle(worksheet, r, 4, STYLE_META_VALUE);
    }

    // Style Table Header (Row 6)
    styleRange(worksheet, 6, 6, 0, 4, STYLE_TABLE_HEADER);

    // Style Data Rows
    const sjCenterCols = new Set([0, 2, 3]);
    itemRows.forEach((_row, rIdx) => {
      const excelRow = 7 + rIdx;
      for (let c = 0; c <= 4; c += 1) {
        setCellStyle(
          worksheet,
          excelRow,
          c,
          getDataCellStyle(rIdx, sjCenterCols.has(c) ? 'center' : 'left', c === 0)
        );
      }
    });

    // Style Total Row
    const totalRowIdx = 7 + itemRows.length;
    styleRange(worksheet, totalRowIdx, totalRowIdx, 0, 4, STYLE_TOTAL_ROW);
    setCellStyle(worksheet, totalRowIdx, 1, {
      ...STYLE_TOTAL_ROW,
      alignment: { horizontal: 'left', vertical: 'center' },
    });

    const rowHeights: XLSX.RowInfo[] = [
      { hpt: 30 },
      { hpt: 22 },
      { hpt: 22 },
      { hpt: estimateRowHeight([data.alamat], [38], 24) },
      { hpt: 22 },
      { hpt: 10 },
      { hpt: 28 },
      ...itemRows.map((row) => ({ hpt: estimateRowHeight(row, sjWidths, 24) })),
      { hpt: 24 },
    ];
    if (hasCatatan) {
      const catRowIdx = totalRowIdx + 2;
      setCellStyle(worksheet, catRowIdx, 0, STYLE_META_LABEL);
      styleRange(worksheet, catRowIdx, catRowIdx, 1, 4, STYLE_META_VALUE);
      rowHeights.push({ hpt: 10 });
      rowHeights.push({ hpt: estimateRowHeight([data.catatan], [70], 24) });
    }
    worksheet['!rows'] = rowHeights;

    const tabName = sheetList.length === 1 ? 'Surat Jalan' : `SJ #${sheetIdx + 1}`;
    XLSX.utils.book_append_sheet(workbook, worksheet, tabName);
  });

  const prefix = sender.presetId === 'sju' ? 'surat-jalan-sju' : 'surat-jalan-sm';
  const filename = `${prefix}-${buildTimestamp()}.xlsx`;
  triggerExcelDownload(workbook, filename);

  return filename;
}

export type ExportPeriodMode = 'month' | 'year';

export const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

const DB_ACTION_LABELS: Record<ShipmentActionType, string> = {
  save: 'Disimpan',
  print: 'Dicetak',
  pdf: 'Unduh PDF',
  excel: 'Unduh Excel',
};

function formatDateTimeShort(iso: string): string {
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
}

function getDocBadgeStyle(docType: 'resi' | 'surat_jalan'): CellStyle {
  return docType === 'surat_jalan'
    ? {
        fill: { fgColor: { rgb: 'FFEDD5' } },
        font: { name: FONT_NAME, sz: 10, bold: true, color: { rgb: '9A3412' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: BORDER_THIN,
      }
    : {
        fill: { fgColor: { rgb: 'D1FAE5' } },
        font: { name: FONT_NAME, sz: 10, bold: true, color: { rgb: '065F46' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: BORDER_THIN,
      };
}

function getActionBadgeStyle(action: ShipmentActionType | undefined): CellStyle {
  const palette: Record<ShipmentActionType, { bg: string; fg: string }> = {
    save: { bg: 'E0F2FE', fg: '075985' },
    print: { bg: 'FEF3C7', fg: '92400E' },
    pdf: { bg: 'FCE7F3', fg: '9D174D' },
    excel: { bg: 'DCFCE7', fg: '166534' },
  };
  const chosen = palette[action ?? 'save'] ?? palette.save;
  return {
    fill: { fgColor: { rgb: chosen.bg } },
    font: { name: FONT_NAME, sz: 10, bold: true, color: { rgb: chosen.fg } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER_THIN,
  };
}

function getUsageBadgeStyle(rowIndex: number): CellStyle {
  return {
    fill: { fgColor: { rgb: rowIndex % 2 === 1 ? 'FFEDD5' : 'FEF3C7' } },
    font: { name: FONT_NAME, sz: 10, bold: true, color: { rgb: '9A3412' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER_THIN,
  };
}

/**
 * Filters shipment history by calendar month or full year in local time.
 */
export function filterHistoryByPeriod(
  history: ShipmentRecord[],
  options: { mode: ExportPeriodMode; year: number; month: number }
): ShipmentRecord[] {
  return history.filter((rec) => {
    const dt = new Date(rec.createdAt);
    if (Number.isNaN(dt.getTime())) return false;
    const recYear = dt.getFullYear();
    const recMonth = dt.getMonth() + 1;
    if (recYear !== options.year) return false;
    if (options.mode === 'month' && recMonth !== options.month) return false;
    return true;
  });
}

function summarizeRecordItems(rec: ShipmentRecord): string {
  if (rec.docType === 'resi') {
    const lines: string[] = [];
    (rec.payload as ResiItem[]).forEach((item, idx) => {
      const penerima = item.kepada.split('\n')[0]?.trim() || `Resi #${idx + 1}`;
      const rows = getResiBottomRows(item)
        .filter((r) => r.namaBarang.trim() || r.qty.trim())
        .map((r) => {
          const qtyPart = r.useQty !== false && r.qty.trim() ? ` (${r.qty.trim()})` : '';
          return `${r.namaBarang.trim()}${qtyPart}`;
        });
      if (rows.length > 0) {
        lines.push(`${penerima}: ${rows.join(', ')}`);
      }
    });
    return lines.join('\n') || '-';
  }

  const lines: string[] = [];
  (rec.payload as SuratJalanData[]).forEach((sj, idx) => {
    const penerima = sj.kepada.trim() || `SJ #${idx + 1}`;
    const rows = sj.rows
      .filter((r) => r.namaBarang.trim())
      .map((r) => {
        const qtyPart = r.qty.trim() ? ` (QTY ${r.qty.trim()})` : '';
        return `${r.namaBarang.trim()}${qtyPart}`;
      });
    if (rows.length > 0) {
      lines.push(`${penerima}: ${rows.join(', ')}`);
    }
  });
  return lines.join('\n') || '-';
}

function buildStyledSheet(params: {
  title: string;
  subtitle: string;
  headers: string[];
  rows: Array<Array<string | number>>;
  totalRow?: Array<string | number>;
  colWidths: number[];
  centerCols: Set<number>;
  boldCols?: Set<number>;
  customCellStyle?: (
    rowIdx: number,
    colIdx: number
  ) => CellStyle | undefined;
}): XLSX.WorkSheet {
  const {
    title,
    subtitle,
    headers,
    rows,
    totalRow,
    colWidths,
    centerCols,
    boldCols = new Set([0]),
    customCellStyle,
  } = params;

  const aoa: Array<Array<string | number>> = [
    [title],
    [subtitle],
    [],
    headers,
    ...rows,
  ];
  if (totalRow) {
    aoa.push(totalRow);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const lastCol = headers.length - 1;
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
  ];
  ws['!cols'] = colWidths.map((wch) => ({ wch }));

  styleRange(ws, 0, 0, 0, lastCol, STYLE_BANNER);
  styleRange(ws, 1, 1, 0, lastCol, STYLE_SUBTITLE);
  styleRange(ws, 3, 3, 0, lastCol, STYLE_TABLE_HEADER);

  rows.forEach((_row, rIdx) => {
    const excelRow = 4 + rIdx;
    for (let c = 0; c <= lastCol; c += 1) {
      const override = customCellStyle?.(rIdx, c);
      if (override) {
        setCellStyle(ws, excelRow, c, override);
      } else {
        setCellStyle(
          ws,
          excelRow,
          c,
          getDataCellStyle(rIdx, centerCols.has(c) ? 'center' : 'left', boldCols.has(c))
        );
      }
    }
  });

  const rowHeights: XLSX.RowInfo[] = [
    { hpt: 32 },
    { hpt: 22 },
    { hpt: 10 },
    { hpt: 28 },
    ...rows.map((row) => ({ hpt: estimateRowHeight(row, colWidths, 24) })),
  ];

  if (totalRow) {
    const totalRowIdx = 4 + rows.length;
    styleRange(ws, totalRowIdx, totalRowIdx, 0, lastCol, STYLE_TOTAL_ROW);
    rowHeights.push({ hpt: 26 });
  }

  ws['!rows'] = rowHeights;
  return ws;
}

/**
 * Builds a colorful, multi-sheet Excel workbook for the Database Dashboard export.
 */
export function buildDatabaseReportWorkbook(params: {
  history: ShipmentRecord[];
  recipients: SavedRecipient[];
  items: SavedItemSuggestion[];
  periodLabel: string;
}): XLSX.WorkBook {
  const { history, recipients, items, periodLabel } = params;
  const workbook = XLSX.utils.book_new();
  const exportedAt = formatExportDateLabel();

  const resiCount = history.filter((h) => h.docType === 'resi').length;
  const sjCount = history.filter((h) => h.docType === 'surat_jalan').length;
  const totalItemsInPeriod = history.reduce((sum, h) => sum + (h.itemCount || 0), 0);
  const totalKoliInPeriod = history.reduce((sum, h) => sum + (h.totalKoli || 0), 0);

  // Sheet 1: Rekap Transaksi
  const summaryRows = history.map((rec, idx) => [
    idx + 1,
    formatDateTimeShort(rec.createdAt),
    rec.docType === 'surat_jalan' ? 'Surat Jalan' : 'Resi',
    rec.presetId === 'sju' ? 'SJU' : 'Suara Muhammadiyah',
    DB_ACTION_LABELS[rec.lastAction ?? 'save'],
    rec.title,
    rec.recipientSummary || '-',
    rec.itemCount,
    rec.totalKoli,
    summarizeRecordItems(rec),
  ]);

  const txWs = buildStyledSheet({
    title: `LAPORAN DATABASE PENGIRIMAN — ${periodLabel.toUpperCase()}`,
    subtitle: `Periode: ${periodLabel}  •  Total Transaksi: ${history.length} (${resiCount} Resi, ${sjCount} Surat Jalan)  •  Total Koli: ${formatIndonesianNumber(totalKoliInPeriod)}  •  Diunduh: ${exportedAt}`,
    headers: [
      'No',
      'Tanggal & Waktu',
      'Jenis Dokumen',
      'Kop Pengirim',
      'Status Aksi',
      'Judul / Tujuan',
      'Ringkasan Penerima',
      'Jumlah Resi/SJ',
      'Total Koli',
      'Rincian Barang & QTY',
    ],
    rows: summaryRows,
    totalRow: [
      'TOTAL',
      '',
      `${history.length} Transaksi`,
      '',
      '',
      `${resiCount} Resi • ${sjCount} SJ`,
      '',
      totalItemsInPeriod,
      totalKoliInPeriod,
      '',
    ],
    colWidths: [6, 20, 15, 20, 14, 28, 28, 14, 12, 46],
    centerCols: new Set([0, 1, 2, 3, 4, 7, 8]),
    boldCols: new Set([0, 5]),
    customCellStyle: (rIdx, cIdx) => {
      const rec = history[rIdx];
      if (!rec) return undefined;
      if (cIdx === 2) return getDocBadgeStyle(rec.docType);
      if (cIdx === 4) return getActionBadgeStyle(rec.lastAction);
      return undefined;
    },
  });
  XLSX.utils.book_append_sheet(workbook, txWs, 'Rekap Transaksi');

  // Sheet 2: Detail Pengiriman per baris Resi / Surat Jalan
  const detailRows: Array<Array<string | number>> = [];
  const detailDocTypes: Array<'resi' | 'surat_jalan'> = [];
  const detailColorIds: Array<KelompokColorId | undefined> = [];

  history.forEach((rec) => {
    const tanggalLabel = formatDateTimeShort(rec.createdAt);
    const kopLabel = rec.presetId === 'sju' ? 'SJU' : 'Suara Muhammadiyah';

    if (rec.docType === 'resi') {
      (rec.payload as ResiItem[]).forEach((item) => {
        const lines = item.kepada
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        const penerima = lines[0] ?? '-';
        const alamat = lines.slice(1).join(', ') || '-';
        const rows = getResiBottomRows(item);
        const barang = rows.map((r) => r.namaBarang.trim()).filter(Boolean).join('; ') || '-';
        const qty =
          rows
            .map((r) => (r.useQty !== false ? r.qty.trim() : ''))
            .filter(Boolean)
            .join('; ') || '-';
        const cfg = getKelompokColor(rows[0]?.colorId);

        detailRows.push([
          detailRows.length + 1,
          tanggalLabel,
          'Resi',
          kopLabel,
          penerima,
          alamat,
          item.noHp.trim() || '-',
          cfg.label,
          barang,
          qty,
          `Koli ${item.koliKe || '-'} / ${item.dari || '-'}`,
        ]);
        detailDocTypes.push('resi');
        detailColorIds.push(rows[0]?.colorId);
      });
    } else {
      (rec.payload as SuratJalanData[]).forEach((sj) => {
        const activeRows = sj.rows.filter(
          (r) => r.namaBarang.trim() || r.qty.trim() || r.jumlahKoli.trim()
        );
        const targetRows = activeRows.length > 0 ? activeRows : sj.rows;
        targetRows.forEach((row) => {
          detailRows.push([
            detailRows.length + 1,
            sj.tanggal.trim() || tanggalLabel,
            'Surat Jalan',
            kopLabel,
            sj.kepada.trim() || '-',
            sj.alamat.trim().replace(/\n/g, ', ') || '-',
            sj.telepon.trim() || '-',
            sj.nomor.trim() || '-',
            row.namaBarang.trim() || '-',
            row.qty.trim() || '-',
            row.jumlahKoli.trim()
              ? `${row.jumlahKoli.trim()} Koli${
                  row.keterangan.trim() ? ` (${row.keterangan.trim()})` : ''
                }`
              : row.keterangan.trim() || '-',
          ]);
          detailDocTypes.push('surat_jalan');
          detailColorIds.push(undefined);
        });
      });
    }
  });

  const detailWs = buildStyledSheet({
    title: `DETAIL BARANG & PENERIMA — ${periodLabel.toUpperCase()}`,
    subtitle: `Rincian ${detailRows.length} baris pengiriman dalam periode ${periodLabel}  •  Diunduh: ${exportedAt}`,
    headers: [
      'No',
      'Tanggal',
      'Jenis',
      'Kop',
      'Penerima / Instansi',
      'Alamat Tujuan',
      'No. HP / Telp',
      'Kelompok / No. SJ',
      'Nama Barang',
      'QTY',
      'Koli / Keterangan',
    ],
    rows: detailRows,
    colWidths: [6, 19, 13, 19, 26, 36, 16, 18, 34, 11, 22],
    centerCols: new Set([0, 1, 2, 3, 6, 7, 9]),
    boldCols: new Set([0, 4]),
    customCellStyle: (rIdx, cIdx) => {
      if (cIdx === 2) return getDocBadgeStyle(detailDocTypes[rIdx] ?? 'resi');
      if (cIdx === 7 && detailDocTypes[rIdx] === 'resi') {
        return getKelompokBadgeStyle(detailColorIds[rIdx]);
      }
      return undefined;
    },
  });
  XLSX.utils.book_append_sheet(workbook, detailWs, 'Detail Pengiriman');

  // Sheet 3: Buku Alamat
  const recRows = recipients.map((rec, idx) => [
    idx + 1,
    rec.recipientName,
    rec.address ? rec.address.replace(/\n/g, ', ') : '-',
    rec.phone || '-',
    rec.lastItemName || '-',
    `${rec.useCount}x`,
    formatDateTimeShort(rec.lastUsedAt),
  ]);

  const recWs = buildStyledSheet({
    title: 'BUKU ALAMAT PELANGGAN TERSIMPAN',
    subtitle: `Total ${recipients.length} penerima/instansi terdaftar  •  Diunduh: ${exportedAt}`,
    headers: [
      'No',
      'Nama Penerima / Instansi',
      'Alamat Lengkap',
      'No. HP / Telepon',
      'Barang Terakhir',
      'Frekuensi',
      'Terakhir Dipakai',
    ],
    rows: recRows,
    colWidths: [6, 28, 42, 18, 32, 12, 20],
    centerCols: new Set([0, 3, 5, 6]),
    boldCols: new Set([0, 1]),
    customCellStyle: (rIdx, cIdx) => (cIdx === 5 ? getUsageBadgeStyle(rIdx) : undefined),
  });
  XLSX.utils.book_append_sheet(workbook, recWs, 'Buku Alamat');

  // Sheet 4: Katalog Barang
  const catalogRows = items.map((it, idx) => {
    const cfg = getKelompokColor(it.defaultColorId);
    return [
      idx + 1,
      it.itemName,
      `${cfg.label} (${cfg.colorName})`,
      `${it.useCount}x`,
      formatDateTimeShort(it.lastUsedAt),
    ];
  });

  const catWs = buildStyledSheet({
    title: 'KATALOG BARANG PENGIRIMAN',
    subtitle: `Total ${items.length} jenis barang tercatat otomatis  •  Diunduh: ${exportedAt}`,
    headers: ['No', 'Nama Barang', 'Kelompok Warna', 'Dipakai', 'Terakhir Dipakai'],
    rows: catalogRows,
    colWidths: [6, 40, 24, 12, 20],
    centerCols: new Set([0, 2, 3, 4]),
    boldCols: new Set([0, 1]),
    customCellStyle: (rIdx, cIdx) => {
      if (cIdx === 2) return getKelompokBadgeStyle(items[rIdx]?.defaultColorId);
      if (cIdx === 3) return getUsageBadgeStyle(rIdx);
      return undefined;
    },
  });
  XLSX.utils.book_append_sheet(workbook, catWs, 'Katalog Barang');

  return workbook;
}

/**
 * Generates and downloads a styled multi-sheet Excel database report for a chosen month or year.
 */
export function downloadDatabaseReportExcel(params: {
  history: ShipmentRecord[];
  recipients: SavedRecipient[];
  items: SavedItemSuggestion[];
  mode: ExportPeriodMode;
  year: number;
  month: number;
}): { filename: string; count: number } {
  const filteredHistory = filterHistoryByPeriod(params.history, {
    mode: params.mode,
    year: params.year,
    month: params.month,
  });

  const monthName = INDONESIAN_MONTHS[params.month - 1] ?? String(params.month);
  const periodLabel =
    params.mode === 'month' ? `${monthName} ${params.year}` : `Tahun ${params.year}`;

  const workbook = buildDatabaseReportWorkbook({
    history: filteredHistory,
    recipients: params.recipients,
    items: params.items,
    periodLabel,
  });

  const slug =
    params.mode === 'month'
      ? `bulanan-${params.year}-${String(params.month).padStart(2, '0')}`
      : `tahunan-${params.year}`;
  const filename = `laporan-database-resi-${slug}.xlsx`;

  triggerExcelDownload(workbook, filename);
  return { filename, count: filteredHistory.length };
}
