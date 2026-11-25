import { ResiItem, SenderHeader } from './types';

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

// Exact A4 portrait pixel dimensions at 96 DPI (210/25.4*96 ≈ 793.7, 297/25.4*96 ≈ 1122.5)
export const A4_PX_WIDTH = 794;
export const A4_PX_HEIGHT = 1123;

export const DEFAULT_SENDER_HEADER: SenderHeader = {
  title: 'SUARA MUHAMMADIYAH',
  address: 'Jl. KHA Dahlan No. 107 Yogyakarta 55262',
  phone: '(0274) 376955 / 411302',
  email: 'suaramuhammadiyah@yahoo.com',
  logoDataUrl: null,
};

export function createEmptyResi(): ResiItem {
  return {
    id: crypto.randomUUID(),
    kepada: '',
    noHp: '',
    namaBarang: '',
    catatanKanan: '',
    dari: '',
    koliKe: '',
  };
}

export function createSampleResiList(): ResiItem[] {
  return [
    {
      id: crypto.randomUUID(),
      kepada:
        "TK Aisyiyah Pa'baeng Baeng\nJl. Sultan Alauddin No. 12, Kec. Tamalate\nKota Makassar, Sulawesi Selatan",
      noHp: '0812-4567-8901',
      namaBarang: 'MAP LAMA KARTON TK 6.800 EXP',
      catatanKanan: 'JNE',
      dari: '62',
      koliKe: '110',
    },
    {
      id: crypto.randomUUID(),
      kepada:
        "TK Aisyiyah Pa'baeng Baeng\nJl. Sultan Alauddin No. 12, Kec. Tamalate\nKota Makassar, Sulawesi Selatan",
      noHp: '0812-4567-8901',
      namaBarang: 'MAP LAMA KARTON TK 6.800 EXP',
      catatanKanan: 'JNE',
      dari: '62',
      koliKe: '111',
    },
    {
      id: crypto.randomUUID(),
      kepada:
        'SD Muhammadiyah Sapen\nJl. Bimo Kurdo No. 33, Demangan, Kec. Gondokusuman\nKota Yogyakarta, DI Yogyakarta 55221',
      noHp: '(0274) 512689',
      namaBarang: 'BUKU PAKET ISMUBA SEMESTER GENAP 1.250 EXP',
      catatanKanan: 'EXP',
      dari: '18',
      koliKe: '90',
    },
  ];
}
