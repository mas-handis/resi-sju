import * as XLSX from 'xlsx';
import {
  formatIndonesianNumber,
  getKelompokColor,
  getResiBottomRows,
  isResiFilled,
  parseIndonesianNumber,
} from '../constants';
import { ResiItem, SenderHeader, SuratJalanData } from '../types';
import { buildTimestamp } from './exportSheet';

/**
 * Generates and downloads an Excel (.xlsx) recap of the shipping receipts.
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

  const rows = itemsToExport.map((item, idx) => {
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

    const kelompokSummary = rowsForExport
      .map((r) => {
        const cfg = getKelompokColor(r.colorId);
        return `${cfg.label} (${cfg.colorName})`;
      })
      .join('; ');
    const barangSummary = rowsForExport
      .map((r) => r.namaBarang.trim())
      .filter(Boolean)
      .join('; ');
    const qtySummary = rowsForExport
      .map((r) => (r.useQty !== false ? r.qty.trim() : ''))
      .filter(Boolean)
      .join('; ');

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

  const sheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Auto-calculate column widths with sensible min/max limits
  worksheet['!cols'] = headers.map((header, colIdx) => {
    let maxLen = header.length;
    for (const row of rows) {
      const cellStr = String(row[colIdx] ?? '');
      if (cellStr.length > maxLen) {
        maxLen = cellStr.length;
      }
    }
    const minWidth = colIdx === 0 ? 5 : 10;
    const maxWidth = 55;
    return { wch: Math.min(Math.max(maxLen + 3, minWidth), maxWidth) };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Resi');

  const prefix = sender.presetId === 'sju' ? 'rekap-resi-sju' : 'rekap-resi-suara-muhammadiyah';
  const filename = `${prefix}-${buildTimestamp()}.xlsx`;

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

  return filename;
}

/**
 * Generates and downloads an Excel (.xlsx) summary for one or more Surat Jalan sheets.
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
    const summaryWs = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows]);
    summaryWs['!cols'] = [
      { wch: 6 },
      { wch: 24 },
      { wch: 14 },
      { wch: 24 },
      { wch: 36 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
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

    const aoa: (string | number)[][] = [
      ['SURAT JALAN', sender.title],
      ['Nomor', data.nomor, 'Kepada', data.kepada],
      ['Tanggal', data.tanggal, 'Alamat', data.alamat.replace(/\n/g, ', ')],
      ['Pengirim', data.pengirim || '-', 'Telepon', data.telepon || '-'],
      [],
      ['No.', 'Nama Barang', 'QTY', 'Jumlah Koli', 'Keterangan'],
      ...rowsToExport.map((row, idx) => [
        idx + 1,
        row.namaBarang.trim(),
        row.qty.trim(),
        row.jumlahKoli.trim(),
        row.keterangan.trim().replace(/\n/g, '; '),
      ]),
      [
        'TOTAL',
        '',
        formatIndonesianNumber(totalQty),
        data.beratPerKoli.trim() || formatIndonesianNumber(totalKoli),
        data.totalBerat.trim() ||
          (data.beratPerKoli.trim() && totalKoli
            ? `${formatIndonesianNumber(totalKoli)} KOLI`
            : ''),
      ],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    worksheet['!cols'] = [
      { wch: 10 },
      { wch: 36 },
      { wch: 14 },
      { wch: 18 },
      { wch: 38 },
    ];

    const tabName = sheetList.length === 1 ? 'Surat Jalan' : `SJ #${sheetIdx + 1}`;
    XLSX.utils.book_append_sheet(workbook, worksheet, tabName);
  });

  const prefix = sender.presetId === 'sju' ? 'surat-jalan-sju' : 'surat-jalan-sm';
  const filename = `${prefix}-${buildTimestamp()}.xlsx`;

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

  return filename;
}
