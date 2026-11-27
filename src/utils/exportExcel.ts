import * as XLSX from 'xlsx-js-style';
import {
  formatIndonesianNumber,
  getKelompokColor,
  getResiBottomRows,
  isResiFilled,
  parseIndonesianNumber,
} from '../constants';
import { KelompokColorId, ResiItem, SenderHeader, SuratJalanData } from '../types';
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
