export type AppMode = 'resi' | 'surat_jalan';

export type SenderPresetId = 'sm' | 'sju';

export type KelompokColorId =
  | 'kelompok_a'
  | 'kelompok_b'
  | 'kelompok_kb'
  | 'tanpa_kelompok';

export interface ResiBottomRow {
  id: string;
  colorId: KelompokColorId;
  namaBarang: string;
  qty: string;
}

export interface ResiItem {
  id: string;
  kepada: string;
  noHp: string;
  namaBarang: string;
  qty: string;
  colorId?: KelompokColorId;
  extraRows?: ResiBottomRow[];
  dari: string;
  koliKe: string;
}

export interface SenderHeader {
  presetId: SenderPresetId;
  title: string;
  address: string;
  phone: string;
  email: string;
  logoDataUrl: string | null;
}

export interface SuratJalanRow {
  id: string;
  namaBarang: string;
  qty: string;
  jumlahKoli: string;
  keterangan: string;
}

export interface SuratJalanData {
  id: string;
  nomor: string;
  tanggal: string;
  pengirim: string;
  kepada: string;
  alamat: string;
  telepon: string;
  rows: SuratJalanRow[];
  beratPerKoli: string;
  totalBerat: string;
  catatan: string;
  footnote: string;
  showCopyLabels: boolean;
}
