export interface ResiItem {
  id: string;
  kepada: string;
  noHp: string;
  namaBarang: string;
  catatanKanan: string;
  dari: string;
  koliKe: string;
}

export interface SenderHeader {
  title: string;
  address: string;
  phone: string;
  email: string;
  logoDataUrl: string | null;
}

export type GridCapacity = 4 | 5;
