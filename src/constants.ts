import {
  KelompokColorId,
  ResiBottomRow,
  ResiItem,
  SenderHeader,
  SenderPresetId,
} from './types';

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

// Exact A4 portrait pixel dimensions at 96 DPI (210/25.4*96 ≈ 793.7, 297/25.4*96 ≈ 1122.5)
export const A4_PX_WIDTH = 794;
export const A4_PX_HEIGHT = 1123;

export const RESI_PER_PAGE = 4;
export const MAX_BOTTOM_COLOR_ROWS = 3;

export interface KelompokColorConfig {
  id: KelompokColorId;
  label: string;
  shortLabel: string;
  colorName: string;
  hex: string;
  rgb: [number, number, number];
  textHex: string;
  placeholderHex: string;
  pillClass: string;
}

export const KELOMPOK_COLOR_OPTIONS: KelompokColorConfig[] = [
  {
    id: 'kelompok_a',
    label: 'Kelompok A',
    shortLabel: 'Kel. A',
    colorName: 'Kuning',
    hex: '#FFEB00',
    rgb: [255, 235, 0],
    textHex: '#000000',
    placeholderHex: '#854D0E',
    pillClass: 'bg-[#FFEB00] text-slate-950 border-amber-500',
  },
  {
    id: 'kelompok_b',
    label: 'Kelompok B',
    shortLabel: 'Kel. B',
    colorName: 'Hijau',
    hex: '#7AC143',
    rgb: [122, 193, 67],
    textHex: '#000000',
    placeholderHex: '#14532D',
    pillClass: 'bg-[#7AC143] text-slate-950 border-green-700',
  },
  {
    id: 'kelompok_kb',
    label: 'Kelompok KB',
    shortLabel: 'Kel. KB',
    colorName: 'Biru',
    hex: '#3B93DB',
    rgb: [59, 147, 219],
    textHex: '#000000',
    placeholderHex: '#0F172A',
    pillClass: 'bg-[#3B93DB] text-slate-950 border-blue-700',
  },
  {
    id: 'tanpa_kelompok',
    label: 'Tanpa Kelompok',
    shortLabel: 'Tanpa Kel.',
    colorName: 'Oranye',
    hex: '#F59E0B',
    rgb: [245, 158, 11],
    textHex: '#000000',
    placeholderHex: '#78350F',
    pillClass: 'bg-[#F59E0B] text-slate-950 border-orange-600',
  },
];

export function getKelompokColor(colorId?: KelompokColorId): KelompokColorConfig {
  return (
    KELOMPOK_COLOR_OPTIONS.find((opt) => opt.id === colorId) ??
    KELOMPOK_COLOR_OPTIONS[0]
  );
}

export function getResiBottomRows(item: ResiItem): ResiBottomRow[] {
  const primary: ResiBottomRow = {
    id: `${item.id}-row-0`,
    colorId: item.colorId ?? 'kelompok_a',
    namaBarang: item.namaBarang,
    qty: item.qty,
  };
  const extras = (item.extraRows ?? []).slice(0, MAX_BOTTOM_COLOR_ROWS - 1);
  return [primary, ...extras];
}

export function getBottomRowHeightPx(rowCount: number): number {
  if (rowCount >= 3) return 28;
  if (rowCount === 2) return 34;
  return 48;
}

export function isResiFilled(r: ResiItem): boolean {
  return Boolean(
    r.kepada.trim() ||
      r.noHp.trim() ||
      r.namaBarang.trim() ||
      r.qty.trim() ||
      r.dari.trim() ||
      r.koliKe.trim() ||
      r.extraRows?.some((row) => row.namaBarang.trim() || row.qty.trim())
  );
}

export const SENDER_PRESETS: Record<SenderPresetId, SenderHeader> = {
  sm: {
    presetId: 'sm',
    title: 'SUARA MUHAMMADIYAH',
    address: 'Jl. KHA Dahlan No. 107 Yogyakarta 55262',
    phone: '(0274) 376955 / 411302',
    email: 'suaramuhammadiyah@yahoo.com',
    logoDataUrl: null,
  },
  sju: {
    presetId: 'sju',
    title: 'PENERBIT SURYA JAYA UTOMO',
    address: 'Jl. Perbalan Rt 03 Rw 08 Gunung pati. Semarang',
    phone: '0822 3251 8345',
    email: '',
    logoDataUrl: null,
  },
};

export const DEFAULT_SENDER_HEADER: SenderHeader = SENDER_PRESETS.sm;

export function createEmptyResi(): ResiItem {
  return {
    id: crypto.randomUUID(),
    kepada: '',
    noHp: '',
    namaBarang: '',
    qty: '',
    colorId: 'kelompok_a',
    extraRows: [],
    dari: '',
    koliKe: '',
  };
}

export function paginateResiList(items: ResiItem[]): ResiItem[][] {
  if (items.length === 0) return [[]];
  const pages: ResiItem[][] = [];
  for (let i = 0; i < items.length; i += RESI_PER_PAGE) {
    pages.push(items.slice(i, i + RESI_PER_PAGE));
  }
  return pages;
}

export function createSampleResiList(): ResiItem[] {
  return [
    {
      id: crypto.randomUUID(),
      kepada:
        'TK ABA Kauman Yogyakarta\nJl. Kauman GM I/163, Ngupasan, Kec. Gondomanan, Kota Yogyakarta, DI Yogyakarta 55122',
      noHp: '0812-2780-1919',
      namaBarang: 'BUKU PAKET KELOMPOK A SEMESTER GENAP',
      qty: '12',
      colorId: 'kelompok_a',
      extraRows: [
        {
          id: crypto.randomUUID(),
          colorId: 'kelompok_b',
          namaBarang: 'BUKU PAKET KELOMPOK B SEMESTER GENAP',
          qty: '15',
        },
      ],
      dari: '10',
      koliKe: '1',
    },
    {
      id: crypto.randomUUID(),
      kepada:
        "TK ABA Pa'baeng Baeng Makassar\nJl. Sultan Alauddin No. 12, Tamalate, Kota Makassar, Sulawesi Selatan",
      noHp: '0812-4567-8901',
      namaBarang: 'MAJALAH KUNTUM KELOMPOK B',
      qty: '20',
      colorId: 'kelompok_b',
      extraRows: [],
      dari: '62',
      koliKe: '11',
    },
    {
      id: crypto.randomUUID(),
      kepada:
        'TK ABA 24 Malang\nJl. Galunggung No. 57, Gading Kasri, Kec. Klojen, Kota Malang, Jawa Timur 65115',
      noHp: '0813-3456-7824',
      namaBarang: 'BUKU MEWARNAI KELOMPOK KB',
      qty: '8',
      colorId: 'kelompok_kb',
      extraRows: [],
      dari: '12',
      koliKe: '5',
    },
    {
      id: crypto.randomUUID(),
      kepada:
        'TK ABA 01 Surakarta\nJl. RM Said No. 136, Punggawan, Kec. Banjarsari, Kota Surakarta, Jawa Tengah 57132',
      noHp: '0856-4712-3301',
      namaBarang: 'MAP LAMA KARTON TK (UMUM)',
      qty: '24',
      colorId: 'tanpa_kelompok',
      extraRows: [
        {
          id: crypto.randomUUID(),
          colorId: 'kelompok_a',
          namaBarang: 'LKS KELOMPOK A',
          qty: '10',
        },
        {
          id: crypto.randomUUID(),
          colorId: 'kelompok_kb',
          namaBarang: 'ALAT PERAGA KB',
          qty: '6',
        },
      ],
      dari: '18',
      koliKe: '4',
    },
  ];
}
