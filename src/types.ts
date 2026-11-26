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
