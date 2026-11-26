import { ResiItem, SenderHeader, SenderPresetId } from './types';

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

// Exact A4 portrait pixel dimensions at 96 DPI (210/25.4*96 ≈ 793.7, 297/25.4*96 ≈ 1122.5)
export const A4_PX_WIDTH = 794;
export const A4_PX_HEIGHT = 1123;

export const RESI_PER_PAGE = 4;

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
      namaBarang: 'MAP LAMA KARTON TK 6.800 EXP',
      qty: '12',
      dari: '10 KOLI',
      koliKe: '1',
    },
    {
      id: crypto.randomUUID(),
      kepada:
        "TK ABA Pa'baeng Baeng Makassar\nJl. Sultan Alauddin No. 12, Tamalate, Kota Makassar, Sulawesi Selatan",
      noHp: '0812-4567-8901',
      namaBarang: 'BUKU PAKET TK ABA SEMESTER GENAP',
      qty: '15',
      dari: '62 KOLI',
      koliKe: '11',
    },
    {
      id: crypto.randomUUID(),
      kepada:
        'TK ABA 24 Malang\nJl. Galunggung No. 57, Gading Kasri, Kec. Klojen, Kota Malang, Jawa Timur 65115',
      noHp: '0813-3456-7824',
      namaBarang: 'MAJALAH KUNTUM & LKS PAUD 1.500 EXP',
      qty: '8',
      dari: '12 KOLI',
      koliKe: '5',
    },
    {
      id: crypto.randomUUID(),
      kepada:
        'TK ABA 01 Surakarta\nJl. RM Said No. 136, Punggawan, Kec. Banjarsari, Kota Surakarta, Jawa Tengah 57132',
      noHp: '0856-4712-3301',
      namaBarang: 'RAPOR KURIKULUM MERDEKA TK ABA',
      qty: '24',
      dari: '18 KOLI',
      koliKe: '4',
    },
  ];
}
