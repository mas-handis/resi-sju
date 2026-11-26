export type SenderPresetId = 'sm' | 'sju';

export interface ResiItem {
  id: string;
  kepada: string;
  noHp: string;
  namaBarang: string;
  qty: string;
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
