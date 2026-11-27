import fs from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import {
  deleteSavedRecipient,
  deleteShipmentRecord,
  fetchCloudBundle,
  loadLocalHistory,
  loadLocalRecipients,
  recordShipmentWithDedup,
} from './backendSync';
import type { ResiItem, SenderHeader } from '../types';

function createMemoryLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

function makeSender(): SenderHeader {
  return {
    presetId: 'sm',
    title: 'SUARA MUHAMMADIYAH',
    address: 'Jl. KHA. Dahlan No. 43',
    phone: '0274-376955',
    email: 'admin@suaramuhammadiyah.id',
    logoDataUrl: null,
  };
}

function makeResi(overrides: Partial<ResiItem> = {}): ResiItem {
  return {
    id: crypto.randomUUID(),
    kepada: 'TK ABA Kauman\nJl. Kauman GM I/163 Yogyakarta',
    noHp: '081234567890',
    namaBarang: 'BUKU PAKET KELOMPOK A',
    qty: '15',
    useQty: true,
    colorId: 'kelompok_a',
    dari: '1 KOLI',
    koliKe: '1',
    ...overrides,
  };
}

function createMockSupabase() {
  const recipients: Array<Record<string, unknown>> = [];
  const items: Array<Record<string, unknown>> = [];
  const records: Array<Record<string, unknown>> = [];

  const client = {
    from(table: string) {
      const target =
        table === 'saved_recipients'
          ? recipients
          : table === 'saved_items_catalog'
          ? items
          : records;
      const chain = {
        select: () => chain,
        order: () => chain,
        limit: async () => ({ data: [...target], error: null }),
        delete: () => ({
          eq: async (col: string, val: string) => {
            const idx = target.findIndex((r) => r[col] === val);
            if (idx >= 0) target.splice(idx, 1);
            return { error: null };
          },
        }),
      };
      return chain;
    },
    async rpc(fn: string, args: Record<string, unknown>) {
      if (fn === 'record_recipient_usage') {
        const name = String(args.p_recipient_name ?? '').trim();
        const key = name.toLowerCase().replace(/\s+/g, ' ');
        const existing = recipients.find((r) => r.normalized_key === key);
        if (existing) {
          existing.use_count = Number(existing.use_count) + 1;
          existing.last_used_at = new Date().toISOString();
          return { data: { ...existing }, error: null };
        }
        const row = {
          id: crypto.randomUUID(),
          recipient_name: name,
          address: String(args.p_address ?? ''),
          phone: String(args.p_phone ?? ''),
          last_item_name: String(args.p_last_item_name ?? ''),
          last_color_id: String(args.p_last_color_id ?? 'kelompok_a'),
          normalized_key: key,
          use_count: 1,
          last_used_at: new Date().toISOString(),
        };
        recipients.push(row);
        return { data: { ...row }, error: null };
      }

      if (fn === 'record_item_usage') {
        const name = String(args.p_item_name ?? '').trim();
        const key = name.toLowerCase().replace(/\s+/g, ' ');
        const existing = items.find((i) => i.normalized_name === key);
        if (existing) {
          existing.use_count = Number(existing.use_count) + 1;
          return { data: { ...existing }, error: null };
        }
        const row = {
          id: crypto.randomUUID(),
          item_name: name,
          default_color_id: String(args.p_default_color_id ?? 'kelompok_a'),
          normalized_name: key,
          use_count: 1,
          last_used_at: new Date().toISOString(),
        };
        items.push(row);
        return { data: { ...row }, error: null };
      }

      if (fn === 'save_shared_shipment') {
        const dedupKey = String(args.p_dedup_key);
        const existing = records.find((r) => r.dedup_key === dedupKey);
        if (existing) {
          existing.last_action = args.p_action;
          return { data: { inserted: false, record: { ...existing } }, error: null };
        }
        const row = {
          id: crypto.randomUUID(),
          dedup_key: dedupKey,
          last_action: args.p_action,
          doc_type: args.p_doc_type,
          preset_id: args.p_preset_id,
          title: args.p_title,
          recipient_summary: args.p_recipient_summary,
          item_count: args.p_item_count,
          total_koli: args.p_total_koli,
          sender_snapshot: args.p_sender_snapshot,
          payload: args.p_payload,
          created_at: new Date().toISOString(),
        };
        records.unshift(row);

        const recs = (args.p_recipients as Array<Record<string, unknown>>) ?? [];
        for (const r of recs) {
          await client.rpc('record_recipient_usage', {
            p_recipient_name: r.recipient_name,
            p_address: r.address,
            p_phone: r.phone,
            p_last_item_name: r.last_item_name,
            p_last_color_id: r.last_color_id,
          });
        }
        const itemRows = (args.p_items as Array<Record<string, unknown>>) ?? [];
        for (const i of itemRows) {
          await client.rpc('record_item_usage', {
            p_item_name: i.item_name,
            p_default_color_id: i.default_color_id,
          });
        }
        return { data: { inserted: true, record: { ...row } }, error: null };
      }

      return { data: null, error: new Error(`Unknown RPC ${fn}`) };
    },
  };

  return {
    client: client as unknown as SupabaseClient,
    recipients,
    items,
    records,
  };
}

describe('backendSync shared persistence & deduplication', () => {
  it('preserves local data & auto-syncs to empty cloud without wiping localStorage', async () => {
    globalThis.localStorage = createMemoryLocalStorage();

    // 1. User saves offline (or before Supabase tables were opened)
    const offlineRes = await recordShipmentWithDedup(
      {
        docType: 'resi',
        sender: makeSender(),
        resiList: [makeResi()],
        suratJalanList: [],
        action: 'save',
      },
      null
    );
    expect(offlineRes.saved).toBe(true);
    expect(offlineRes.cloudSynced).toBe(false);
    expect(loadLocalHistory().length).toBe(1);
    expect(loadLocalRecipients().length).toBe(1);

    // 2. Cloud starts completely empty -> fetchCloudBundle must NOT wipe localStorage!
    const mock = createMockSupabase();
    const bundle = await fetchCloudBundle(mock.client);
    expect(bundle.fromCloud).toBe(true);
    expect(bundle.history.length).toBe(1);
    expect(bundle.recipients.length).toBe(1);
    expect(mock.records.length).toBe(1);
    expect(mock.recipients.length).toBe(1);
  });

  it('deduplicates 3x rapid Simpan clicks + Print + Download PDF + Download Excel', async () => {
    globalThis.localStorage = createMemoryLocalStorage();
    const mock = createMockSupabase();
    const resi = makeResi({ id: 'fixed-tab-1' });
    const sender = makeSender();

    // Rapid 3x Simpan clicks simultaneously
    const [r1, r2, r3] = await Promise.all([
      recordShipmentWithDedup(
        { docType: 'resi', sender, resiList: [resi], suratJalanList: [], action: 'save' },
        mock.client
      ),
      recordShipmentWithDedup(
        { docType: 'resi', sender, resiList: [resi], suratJalanList: [], action: 'save' },
        mock.client
      ),
      recordShipmentWithDedup(
        { docType: 'resi', sender, resiList: [resi], suratJalanList: [], action: 'save' },
        mock.client
      ),
    ]);

    expect(r1.saved).toBe(true);
    expect(r2.saved).toBe(true);
    expect(r3.saved).toBe(true);
    expect(mock.records.length).toBe(1);

    // Print, Download PDF, Download Excel on the same content (even with different random UUID)
    const sameContentDifferentId = makeResi({ id: crypto.randomUUID() });
    const rPrint = await recordShipmentWithDedup(
      {
        docType: 'resi',
        sender,
        resiList: [sameContentDifferentId],
        suratJalanList: [],
        action: 'print',
      },
      mock.client
    );
    const rPdf = await recordShipmentWithDedup(
      {
        docType: 'resi',
        sender,
        resiList: [sameContentDifferentId],
        suratJalanList: [],
        action: 'pdf',
      },
      mock.client
    );
    const rExcel = await recordShipmentWithDedup(
      {
        docType: 'resi',
        sender,
        resiList: [sameContentDifferentId],
        suratJalanList: [],
        action: 'excel',
      },
      mock.client
    );

    expect(rPrint.duplicate).toBe(true);
    expect(rPdf.duplicate).toBe(true);
    expect(rExcel.duplicate).toBe(true);
    expect(mock.records.length).toBe(1);
    expect(mock.recipients[0].use_count).toBe(1);
    expect(mock.records[0].last_action).toBe('excel');

    // Editing content creates a new DB row
    const editedResi = makeResi({ qty: '25' });
    const rEdited = await recordShipmentWithDedup(
      {
        docType: 'resi',
        sender,
        resiList: [editedResi],
        suratJalanList: [],
        action: 'save',
      },
      mock.client
    );
    expect(rEdited.duplicate).toBe(false);
    expect(mock.records.length).toBe(2);
  });

  it('live Supabase round-trip (insert, deduplicate, fetch, cleanup)', async () => {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) return;
    const raw = fs.readFileSync(envPath, 'utf8');
    const urlMatch = raw.match(/^VITE_SUPABASE_URL=(.+)$/m);
    const keyMatch = raw.match(/^VITE_SUPABASE_PUBLISHABLE_KEY=(.+)$/m);
    const url = urlMatch?.[1]?.trim().replace(/^["']|["']$/g, '');
    const key = keyMatch?.[1]?.trim().replace(/^["']|["']$/g, '');
    if (!url || !key) return;

    globalThis.localStorage = createMemoryLocalStorage();
    const realClient = createClient(url, key);
    const uniqueTag = `TEST_AUTO_${Date.now()}`;
    const testResi = makeResi({
      kepada: `${uniqueTag}\nJl. Pengujian No. 1`,
      namaBarang: `BARANG_${uniqueTag}`,
    });

    const first = await recordShipmentWithDedup(
      {
        docType: 'resi',
        sender: makeSender(),
        resiList: [testResi],
        suratJalanList: [],
        action: 'save',
      },
      realClient
    );

    expect(first.cloudSynced).toBe(true);
    expect(first.duplicate).toBe(false);
    expect(first.record?.id).toBeTruthy();

    // Duplicate check on live Supabase
    const second = await recordShipmentWithDedup(
      {
        docType: 'resi',
        sender: makeSender(),
        resiList: [testResi],
        suratJalanList: [],
        action: 'pdf',
      },
      realClient
    );
    expect(second.cloudSynced).toBe(true);
    expect(second.duplicate).toBe(true);

    // Verify fetchCloudBundle sees the live record
    const bundle = await fetchCloudBundle(realClient);
    expect(bundle.fromCloud).toBe(true);
    const foundRec = bundle.recipients.find((r) => r.recipientName === uniqueTag);
    const foundHist = bundle.history.find((h) => h.id === first.record?.id);
    expect(foundHist).toBeTruthy();
    expect(foundRec).toBeTruthy();

    // Clean up test rows so production DB stays clean
    await deleteShipmentRecord(first.record!.id, realClient);
    await deleteSavedRecipient(foundRec!.id, realClient);
    const itemRow = bundle.items.find((i) => i.itemName === `BARANG_${uniqueTag}`);
    if (itemRow) {
      await realClient.from('saved_items_catalog').delete().eq('id', itemRow.id);
    }
  });
});
