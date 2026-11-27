import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx-js-style';
import type {
  SavedItemSuggestion,
  SavedRecipient,
  SenderHeader,
  ShipmentRecord,
} from '../types';
import {
  buildDatabaseReportWorkbook,
  filterHistoryByPeriod,
} from './exportExcel';

const SENDER: SenderHeader = {
  presetId: 'sm',
  title: 'SUARA MUHAMMADIYAH',
  address: 'Jl. KHA. Dahlan No. 43',
  phone: '0274-376955',
  email: 'admin@suaramuhammadiyah.id',
  logoDataUrl: null,
};

const SAMPLE_HISTORY: ShipmentRecord[] = [
  {
    id: 'rec-nov-2026',
    docType: 'resi',
    presetId: 'sm',
    title: 'PDA MEDAN',
    recipientSummary: 'PDA MEDAN',
    itemCount: 14,
    totalKoli: 14,
    lastAction: 'print',
    senderSnapshot: SENDER,
    payload: [
      {
        id: 'r1',
        kepada: 'PDA MEDAN\nJl. Medan No. 1',
        noHp: '08123456',
        namaBarang: 'BUKU PAKET A',
        qty: '20',
        useQty: true,
        colorId: 'kelompok_a',
        dari: '14 KOLI',
        koliKe: '1',
      },
    ],
    createdAt: '2026-11-27T09:44:00.000Z',
  },
  {
    id: 'rec-oct-2026',
    docType: 'surat_jalan',
    presetId: 'sju',
    title: 'SJ-001 — TK ABA',
    recipientSummary: 'TK ABA',
    itemCount: 1,
    totalKoli: 3,
    lastAction: 'excel',
    senderSnapshot: SENDER,
    payload: [
      {
        id: 'sj1',
        nomor: 'SJ-001',
        tanggal: '15 Oktober 2026',
        pengirim: 'SJU',
        kepada: 'TK ABA',
        alamat: 'Yogyakarta',
        telepon: '08111',
        rows: [
          {
            id: 'row1',
            namaBarang: 'MAJALAH ANAK',
            qty: '50',
            jumlahKoli: '3',
            keterangan: '',
          },
        ],
        beratPerKoli: '',
        totalBerat: '',
        catatan: '',
        footnote: '',
        showCopyLabels: false,
      },
    ],
    createdAt: '2026-10-15T08:00:00.000Z',
  },
  {
    id: 'rec-dec-2025',
    docType: 'resi',
    presetId: 'sm',
    title: 'TK LAMA 2025',
    recipientSummary: 'TK LAMA 2025',
    itemCount: 2,
    totalKoli: 2,
    lastAction: 'save',
    senderSnapshot: SENDER,
    payload: [],
    createdAt: '2025-12-10T05:00:00.000Z',
  },
];

describe('Database Dashboard Excel Export', () => {
  it('filters shipment history accurately by month and by year', () => {
    const nov2026 = filterHistoryByPeriod(SAMPLE_HISTORY, {
      mode: 'month',
      year: 2026,
      month: 11,
    });
    expect(nov2026.map((h) => h.id)).toEqual(['rec-nov-2026']);

    const all2026 = filterHistoryByPeriod(SAMPLE_HISTORY, {
      mode: 'year',
      year: 2026,
      month: 11,
    });
    expect(all2026.map((h) => h.id)).toEqual(['rec-nov-2026', 'rec-oct-2026']);

    const all2025 = filterHistoryByPeriod(SAMPLE_HISTORY, {
      mode: 'year',
      year: 2025,
      month: 1,
    });
    expect(all2025.map((h) => h.id)).toEqual(['rec-dec-2025']);
  });

  it('builds colorful 4-sheet workbook with styled banner, headers, and valid xlsx buffer', () => {
    const recipients: SavedRecipient[] = [
      {
        id: 'addr1',
        recipientName: 'PDA MEDAN',
        address: 'Jl. Medan No. 1',
        phone: '08123456',
        lastItemName: 'BUKU PAKET A',
        lastColorId: 'kelompok_a',
        normalizedKey: 'pda medan',
        useCount: 3,
        lastUsedAt: '2026-11-27T09:44:00.000Z',
      },
    ];
    const items: SavedItemSuggestion[] = [
      {
        id: 'it1',
        itemName: 'BUKU PAKET A',
        defaultColorId: 'kelompok_a',
        normalizedName: 'buku paket a',
        useCount: 3,
        lastUsedAt: '2026-11-27T09:44:00.000Z',
      },
    ];

    const wb = buildDatabaseReportWorkbook({
      history: SAMPLE_HISTORY.slice(0, 2),
      recipients,
      items,
      periodLabel: 'Tahun 2026',
    });

    expect(wb.SheetNames).toEqual([
      'Rekap Transaksi',
      'Detail Pengiriman',
      'Buku Alamat',
      'Katalog Barang',
    ]);

    const txSheet = wb.Sheets['Rekap Transaksi'];
    expect(txSheet['A1']?.s?.fill?.fgColor?.rgb).toBe('0B6E4F');
    expect(txSheet['A4']?.s?.fill?.fgColor?.rgb).toBe('EA580C');
    expect(txSheet['C5']?.s?.fill?.fgColor?.rgb).toBe('D1FAE5');

    const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
    expect(bytes.byteLength).toBeGreaterThan(2000);
  });
});
