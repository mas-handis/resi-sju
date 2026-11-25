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
        'TK ABA Kauman Yogyakarta\nJl. Kauman GM I/163, Ngupasan, Kec. Gondomanan, Kota Yogyakarta, DI Yogyakarta 55122',
      noHp: '0812-2780-1919',
      namaBarang: 'MAP LAMA KARTON TK 6.800 EXP',
      catatanKanan: 'JNE',
      dari: '45',
      koliKe: '101',
    },
    {
      id: crypto.randomUUID(),
      kepada:
        "TK ABA Pa'baeng Baeng Makassar\nJl. Sultan Alauddin No. 12, Tamalate, Kota Makassar, Sulawesi Selatan",
      noHp: '0812-4567-8901',
      namaBarang: 'BUKU PAKET TK ABA SEMESTER GENAP',
      catatanKanan: 'POS',
      dari: '62',
      koliKe: '110',
    },
    {
      id: crypto.randomUUID(),
      kepada:
        'TK ABA 24 Malang\nJl. Galunggung No. 57, Gading Kasri, Kec. Klojen, Kota Malang, Jawa Timur 65115',
      noHp: '0813-3456-7824',
      namaBarang: 'MAJALAH KUNTUM & LKS PAUD 1.500 EXP',
      catatanKanan: 'KILAT',
      dari: '12',
      koliKe: '25',
    },
    {
      id: crypto.randomUUID(),
      kepada:
        'TK ABA 01 Surakarta\nJl. RM Said No. 136, Punggawan, Kec. Banjarsari, Kota Surakarta, Jawa Tengah 57132',
      noHp: '0856-4712-3301',
      namaBarang: 'RAPOR KURIKULUM MERDEKA TK ABA',
      catatanKanan: 'J&T',
      dari: '18',
      koliKe: '48',
    },
    {
      id: crypto.randomUUID(),
      kepada:
        'TK ABA 14 Surabaya\nJl. Tambak Segaran Wetan No. 17, Tambaksari, Kota Surabaya, Jawa Timur 60135',
      noHp: '0815-5092-1414',
      namaBarang: 'SERAGAM BATIK & ATRIBUT TK ABA',
      catatanKanan: 'CARGO',
      dari: '30',
      koliKe: '73',
    },
  ];
}
