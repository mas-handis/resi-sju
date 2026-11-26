import * as XLSX from 'xlsx';
import {
  getKelompokColor,
  getResiBottomRows,
  isResiFilled,
} from '../constants';
import { ResiItem, SenderHeader } from '../types';
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
      .map((r) => r.qty.trim())
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
