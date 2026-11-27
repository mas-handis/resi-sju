import type { SupabaseClient } from '@supabase/supabase-js';
import { getResiBottomRows, isResiFilled, parseIndonesianNumber } from '../constants';
import { supabase } from '../lib/supabase';
import {
  AppMode,
  KelompokColorId,
  ResiItem,
  SavedItemSuggestion,
  SavedRecipient,
  SenderHeader,
  ShipmentActionType,
  ShipmentRecord,
  SuratJalanData,
} from '../types';

const LS_RECIPIENTS_KEY = 'resi_saved_recipients_v1';
const LS_ITEMS_KEY = 'resi_saved_items_v1';
const LS_HISTORY_KEY = 'resi_shipment_history_v1';
const LS_DELETED_IDS_KEY = 'resi_deleted_ids_v1';

// Prevent race conditions if user rapid-clicks Simpan/Print/PDF/Excel simultaneously
const inFlightSaves = new Map<string, Promise<SaveBatchResult>>();

function normalizeKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function getLocalDateKey(): string {
  try {
    return new Date().toLocaleDateString('en-CA');
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

async function hashCanonicalString(input: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoded = new TextEncoder().encode(input);
      const digest = await crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 32);
    }
  } catch {
    // fallback below
  }
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch ^ i;
    h2 = Math.imul(h2, 0x01000193);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0)
    .toString(16)
    .padStart(8, '0')}`;
}

function readJsonStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJsonStorage<T>(key: string, value: T): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
}

function getDeletedIds(): Set<string> {
  return new Set(readJsonStorage<string[]>(LS_DELETED_IDS_KEY, []));
}

function markIdDeleted(id: string): void {
  const current = readJsonStorage<string[]>(LS_DELETED_IDS_KEY, []);
  const next = [id, ...current.filter((x) => x !== id)].slice(0, 200);
  writeJsonStorage(LS_DELETED_IDS_KEY, next);
}

export function loadLocalRecipients(): SavedRecipient[] {
  const list = readJsonStorage<SavedRecipient[]>(LS_RECIPIENTS_KEY, []);
  return [...list].sort(
    (a, b) =>
      b.useCount - a.useCount ||
      new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
  );
}

export function loadLocalItemCatalog(): SavedItemSuggestion[] {
  const list = readJsonStorage<SavedItemSuggestion[]>(LS_ITEMS_KEY, []);
  return [...list].sort(
    (a, b) =>
      b.useCount - a.useCount ||
      new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
  );
}

export function loadLocalHistory(): ShipmentRecord[] {
  const list = readJsonStorage<ShipmentRecord[]>(LS_HISTORY_KEY, []);
  return [...list].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function mapRecipientRow(row: Record<string, unknown>): SavedRecipient {
  return {
    id: String(row.id),
    recipientName: String(row.recipient_name ?? ''),
    address: String(row.address ?? ''),
    phone: String(row.phone ?? ''),
    lastItemName: String(row.last_item_name ?? ''),
    lastColorId: (row.last_color_id as KelompokColorId) || 'kelompok_a',
    normalizedKey: String(row.normalized_key ?? ''),
    useCount: Number(row.use_count ?? 1),
    lastUsedAt: String(row.last_used_at ?? new Date().toISOString()),
    pendingSync: false,
  };
}

function mapItemRow(row: Record<string, unknown>): SavedItemSuggestion {
  return {
    id: String(row.id),
    itemName: String(row.item_name ?? ''),
    defaultColorId: (row.default_color_id as KelompokColorId) || 'kelompok_a',
    normalizedName: String(row.normalized_name ?? ''),
    useCount: Number(row.use_count ?? 1),
    lastUsedAt: String(row.last_used_at ?? new Date().toISOString()),
    pendingSync: false,
  };
}

function mapRecordRow(row: Record<string, unknown>): ShipmentRecord {
  const rawAction = String(row.last_action ?? 'save');
  const lastAction: ShipmentActionType =
    rawAction === 'print' || rawAction === 'pdf' || rawAction === 'excel'
      ? rawAction
      : 'save';
  return {
    id: String(row.id),
    dedupKey: row.dedup_key ? String(row.dedup_key) : undefined,
    lastAction,
    pendingSync: false,
    docType: (row.doc_type as AppMode) === 'surat_jalan' ? 'surat_jalan' : 'resi',
    presetId: row.preset_id === 'sju' ? 'sju' : 'sm',
    title: String(row.title ?? ''),
    recipientSummary: String(row.recipient_summary ?? ''),
    itemCount: Number(row.item_count ?? 1),
    totalKoli: Number(row.total_koli ?? 0),
    senderSnapshot: row.sender_snapshot as SenderHeader,
    payload: row.payload as ResiItem[] | SuratJalanData[],
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

async function queryCloudTables(client: SupabaseClient) {
  const [recRes, itemRes, histRes] = await Promise.all([
    client
      .from('saved_recipients')
      .select('*')
      .order('use_count', { ascending: false })
      .order('last_used_at', { ascending: false })
      .limit(500),
    client
      .from('saved_items_catalog')
      .select('*')
      .order('use_count', { ascending: false })
      .order('last_used_at', { ascending: false })
      .limit(300),
    client
      .from('shipment_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(150),
  ]);

  if (recRes.error) throw recRes.error;
  if (itemRes.error) throw itemRes.error;
  if (histRes.error) throw histRes.error;

  return {
    recipients: (recRes.data ?? []).map((r) =>
      mapRecipientRow(r as Record<string, unknown>)
    ),
    items: (itemRes.data ?? []).map((r) =>
      mapItemRow(r as Record<string, unknown>)
    ),
    history: (histRes.data ?? []).map((r) =>
      mapRecordRow(r as Record<string, unknown>)
    ),
  };
}

/**
 * Push any unsynced local records (saved while offline or before DB migration)
 * up to Supabase so they are never wiped out when fetching from an empty cloud.
 */
async function syncPendingLocalToCloud(
  client: SupabaseClient,
  cloudState: {
    recipients: SavedRecipient[];
    items: SavedItemSuggestion[];
    history: ShipmentRecord[];
  }
): Promise<boolean> {
  const deletedIds = getDeletedIds();
  const cloudRecKeys = new Set(cloudState.recipients.map((r) => r.normalizedKey));
  const cloudItemKeys = new Set(cloudState.items.map((i) => i.normalizedName));
  const cloudDedupKeys = new Set(
    cloudState.history.map((h) => h.dedupKey).filter((k): k is string => Boolean(k))
  );

  const localRecipients = loadLocalRecipients().filter((r) => !deletedIds.has(r.id));
  const localItems = loadLocalItemCatalog().filter((i) => !deletedIds.has(i.id));
  const localHistory = loadLocalHistory().filter((h) => !deletedIds.has(h.id));

  let pushedAny = false;

  // Sync recipients that are pendingSync OR when cloud is empty and local has recipients
  const recipientsToPush = localRecipients.filter(
    (r) =>
      !cloudRecKeys.has(r.normalizedKey) &&
      (r.pendingSync === true || cloudState.recipients.length === 0)
  );
  for (const r of recipientsToPush) {
    const { error } = await client.rpc('record_recipient_usage', {
      p_recipient_name: r.recipientName,
      p_address: r.address,
      p_phone: r.phone,
      p_last_item_name: r.lastItemName,
      p_last_color_id: r.lastColorId,
    });
    if (!error) pushedAny = true;
  }

  const itemsToPush = localItems.filter(
    (i) =>
      !cloudItemKeys.has(i.normalizedName) &&
      (i.pendingSync === true || cloudState.items.length === 0)
  );
  for (const i of itemsToPush) {
    const { error } = await client.rpc('record_item_usage', {
      p_item_name: i.itemName,
      p_default_color_id: i.defaultColorId,
    });
    if (!error) pushedAny = true;
  }

  const historyToPush = localHistory.filter((h) => {
    if (h.dedupKey && cloudDedupKeys.has(h.dedupKey)) return false;
    return h.pendingSync === true || cloudState.history.length === 0;
  });

  for (const h of historyToPush) {
    const fallbackDedup =
      h.dedupKey ||
      `${h.docType}:${h.createdAt.slice(0, 10)}:${await hashCanonicalString(
        JSON.stringify({ title: h.title, payload: h.payload })
      )}`;
    const { error } = await client.rpc('save_shared_shipment', {
      p_dedup_key: fallbackDedup,
      p_action: h.lastAction ?? 'save',
      p_doc_type: h.docType,
      p_preset_id: h.presetId,
      p_title: h.title,
      p_recipient_summary: h.recipientSummary,
      p_item_count: h.itemCount,
      p_total_koli: h.totalKoli,
      p_sender_snapshot: h.senderSnapshot,
      p_payload: h.payload,
      p_recipients: [],
      p_items: [],
    });
    if (!error) pushedAny = true;
  }

  return pushedAny;
}

export async function fetchCloudBundle(
  client: SupabaseClient | null = supabase
): Promise<{
  recipients: SavedRecipient[];
  items: SavedItemSuggestion[];
  history: ShipmentRecord[];
  fromCloud: boolean;
}> {
  if (!client) {
    return {
      recipients: loadLocalRecipients(),
      items: loadLocalItemCatalog(),
      history: loadLocalHistory(),
      fromCloud: false,
    };
  }

  try {
    let cloud = await queryCloudTables(client);
    const didPushLocal = await syncPendingLocalToCloud(client, cloud);
    if (didPushLocal) {
      cloud = await queryCloudTables(client);
    }

    writeJsonStorage(LS_RECIPIENTS_KEY, cloud.recipients);
    writeJsonStorage(LS_ITEMS_KEY, cloud.items);
    writeJsonStorage(LS_HISTORY_KEY, cloud.history);

    return {
      recipients: cloud.recipients,
      items: cloud.items,
      history: cloud.history,
      fromCloud: true,
    };
  } catch (err) {
    console.warn('Menggunakan cache lokal (Supabase belum siap/offline):', err);
    return {
      recipients: loadLocalRecipients(),
      items: loadLocalItemCatalog(),
      history: loadLocalHistory(),
      fromCloud: false,
    };
  }
}

export interface UpsertRecipientInput {
  recipientName: string;
  address: string;
  phone: string;
  lastItemName?: string;
  lastColorId?: KelompokColorId;
}

function upsertRecipientLocally(
  input: UpsertRecipientInput,
  pendingSync = false
): SavedRecipient | null {
  const name = input.recipientName.trim();
  if (!name) return null;

  const key = normalizeKey(name);
  const nowIso = new Date().toISOString();
  const localList = loadLocalRecipients();
  const existingIdx = localList.findIndex((r) => r.normalizedKey === key);

  let updatedLocal: SavedRecipient;
  if (existingIdx >= 0) {
    const prev = localList[existingIdx];
    updatedLocal = {
      ...prev,
      recipientName: name,
      address: input.address.trim() || prev.address,
      phone: input.phone.trim() || prev.phone,
      lastItemName: input.lastItemName?.trim() || prev.lastItemName,
      lastColorId: input.lastColorId || prev.lastColorId,
      useCount: prev.useCount + 1,
      lastUsedAt: nowIso,
      pendingSync: pendingSync || prev.pendingSync,
    };
    localList[existingIdx] = updatedLocal;
  } else {
    updatedLocal = {
      id: crypto.randomUUID(),
      recipientName: name,
      address: input.address.trim(),
      phone: input.phone.trim(),
      lastItemName: input.lastItemName?.trim() ?? '',
      lastColorId: input.lastColorId ?? 'kelompok_a',
      normalizedKey: key,
      useCount: 1,
      lastUsedAt: nowIso,
      pendingSync,
    };
    localList.unshift(updatedLocal);
  }
  writeJsonStorage(LS_RECIPIENTS_KEY, localList);
  return updatedLocal;
}

function upsertItemLocally(
  itemName: string,
  colorId: KelompokColorId = 'kelompok_a',
  pendingSync = false
): SavedItemSuggestion | null {
  const cleanName = itemName.trim();
  if (!cleanName) return null;

  const key = normalizeKey(cleanName);
  const nowIso = new Date().toISOString();
  const localList = loadLocalItemCatalog();
  const existingIdx = localList.findIndex((i) => i.normalizedName === key);

  let updatedLocal: SavedItemSuggestion;
  if (existingIdx >= 0) {
    const prev = localList[existingIdx];
    updatedLocal = {
      ...prev,
      itemName: cleanName,
      defaultColorId: colorId,
      useCount: prev.useCount + 1,
      lastUsedAt: nowIso,
      pendingSync: pendingSync || prev.pendingSync,
    };
    localList[existingIdx] = updatedLocal;
  } else {
    updatedLocal = {
      id: crypto.randomUUID(),
      itemName: cleanName,
      defaultColorId: colorId,
      normalizedName: key,
      useCount: 1,
      lastUsedAt: nowIso,
      pendingSync,
    };
    localList.unshift(updatedLocal);
  }
  writeJsonStorage(LS_ITEMS_KEY, localList);
  return updatedLocal;
}

export async function recordRecipientUsage(
  input: UpsertRecipientInput,
  client: SupabaseClient | null = supabase
): Promise<SavedRecipient | null> {
  if (!input.recipientName.trim()) return null;

  if (client) {
    try {
      const { data, error } = await client.rpc('record_recipient_usage', {
        p_recipient_name: input.recipientName.trim(),
        p_address: input.address.trim(),
        p_phone: input.phone.trim(),
        p_last_item_name: input.lastItemName?.trim() ?? '',
        p_last_color_id: input.lastColorId ?? 'kelompok_a',
      });
      if (!error && data) {
        const saved = mapRecipientRow(data as Record<string, unknown>);
        const nextList = [
          saved,
          ...loadLocalRecipients().filter(
            (r) => r.normalizedKey !== saved.normalizedKey
          ),
        ];
        writeJsonStorage(LS_RECIPIENTS_KEY, nextList);
        return saved;
      }
      if (error) {
        console.warn('Supabase record_recipient_usage error:', error);
      }
    } catch (err) {
      console.warn('Supabase record_recipient_usage exception:', err);
    }
  }

  return upsertRecipientLocally(input, true);
}

export interface SaveBatchParams {
  docType: AppMode;
  sender: SenderHeader;
  resiList: ResiItem[];
  suratJalanList: SuratJalanData[];
  action: ShipmentActionType;
}

export interface SaveBatchResult {
  saved: boolean;
  duplicate: boolean;
  empty: boolean;
  cloudSynced: boolean;
  record?: ShipmentRecord;
}

export function isBatchFilled(params: Omit<SaveBatchParams, 'action'>): boolean {
  if (params.docType === 'resi') {
    return params.resiList.some(isResiFilled);
  }
  return params.suratJalanList.some((sj) =>
    Boolean(
      sj.kepada.trim() ||
        sj.alamat.trim() ||
        sj.telepon.trim() ||
        sj.rows.some((r) => r.namaBarang.trim())
    )
  );
}

function extractBatchMetadata(params: Omit<SaveBatchParams, 'action'>) {
  const { docType, sender, resiList, suratJalanList } = params;

  const recipientsPayload: Array<{
    recipient_name: string;
    address: string;
    phone: string;
    last_item_name: string;
    last_color_id: KelompokColorId;
  }> = [];
  const itemsPayload: Array<{
    item_name: string;
    default_color_id: KelompokColorId;
  }> = [];

  const seenRecKeys = new Set<string>();
  const seenItemKeys = new Set<string>();

  let title = '';
  let recipientSummary = '';
  let itemCount = 1;
  let totalKoli = 0;
  let payload: ResiItem[] | SuratJalanData[];
  let canonicalBody: unknown;

  if (docType === 'resi') {
    const filled = resiList.filter(isResiFilled);
    const target = filled.length > 0 ? filled : resiList;
    const names = Array.from(
      new Set(
        target
          .map((r) => r.kepada.split('\n')[0]?.trim())
          .filter((s): s is string => Boolean(s))
      )
    );
    const firstRecipient = names[0] || 'Resi Pengiriman';
    title =
      names.length > 1
        ? `${firstRecipient} (+${names.length - 1} lainnya)`
        : firstRecipient;
    recipientSummary = names.slice(0, 3).join(', ');
    itemCount = target.length;
    totalKoli = target.length;
    payload = target;

    for (const item of target) {
      const lines = item.kepada
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const rName = lines[0] ?? '';
      const rAddr = lines.slice(1).join('\n');
      const bottomRows = getResiBottomRows(item);
      const firstRow = bottomRows[0];

      if (rName) {
        const key = normalizeKey(rName);
        if (!seenRecKeys.has(key)) {
          seenRecKeys.add(key);
          recipientsPayload.push({
            recipient_name: rName,
            address: rAddr,
            phone: item.noHp.trim(),
            last_item_name: firstRow?.namaBarang.trim() ?? '',
            last_color_id: firstRow?.colorId ?? 'kelompok_a',
          });
        }
      }

      for (const row of bottomRows) {
        const iName = row.namaBarang.trim();
        if (iName) {
          const iKey = normalizeKey(iName);
          if (!seenItemKeys.has(iKey)) {
            seenItemKeys.add(iKey);
            itemsPayload.push({
              item_name: iName,
              default_color_id: row.colorId,
            });
          }
        }
      }
    }

    canonicalBody = target.map((item) => ({
      kepada: normalizeKey(item.kepada),
      noHp: normalizeKey(item.noHp),
      dari: normalizeKey(item.dari),
      koliKe: normalizeKey(item.koliKe),
      rows: getResiBottomRows(item).map((r) => ({
        colorId: r.colorId,
        namaBarang: normalizeKey(r.namaBarang),
        useQty: r.useQty !== false,
        qty: r.useQty !== false ? normalizeKey(r.qty) : '',
      })),
    }));
  } else {
    const filledSj = suratJalanList.filter(
      (sj) =>
        sj.kepada.trim() ||
        sj.alamat.trim() ||
        sj.telepon.trim() ||
        sj.rows.some((r) => r.namaBarang.trim())
    );
    const target = filledSj.length > 0 ? filledSj : suratJalanList;
    const names = Array.from(
      new Set(target.map((s) => s.kepada.trim()).filter(Boolean))
    );
    const firstSj = target[0];
    const firstNomor = firstSj?.nomor.trim();
    const firstKepada = names[0] || 'Surat Jalan';
    title =
      target.length > 1
        ? `${firstKepada} (${target.length} Lembar)`
        : firstNomor
        ? `${firstNomor} — ${firstKepada}`
        : firstKepada;
    recipientSummary = names.slice(0, 3).join(', ');
    itemCount = target.length;
    totalKoli = target.reduce(
      (sum, sj) =>
        sum + sj.rows.reduce((rSum, r) => rSum + parseIndonesianNumber(r.jumlahKoli), 0),
      0
    );
    payload = target;

    for (const sj of target) {
      const rName = sj.kepada.trim();
      const firstItem = sj.rows.find((r) => r.namaBarang.trim())?.namaBarang.trim() ?? '';
      if (rName) {
        const key = normalizeKey(rName);
        if (!seenRecKeys.has(key)) {
          seenRecKeys.add(key);
          recipientsPayload.push({
            recipient_name: rName,
            address: sj.alamat.trim(),
            phone: sj.telepon.trim(),
            last_item_name: firstItem,
            last_color_id: 'kelompok_a',
          });
        }
      }
      for (const row of sj.rows) {
        const iName = row.namaBarang.trim();
        if (iName) {
          const iKey = normalizeKey(iName);
          if (!seenItemKeys.has(iKey)) {
            seenItemKeys.add(iKey);
            itemsPayload.push({
              item_name: iName,
              default_color_id: 'kelompok_a',
            });
          }
        }
      }
    }

    canonicalBody = target.map((sj) => ({
      nomor: normalizeKey(sj.nomor),
      tanggal: normalizeKey(sj.tanggal),
      pengirim: normalizeKey(sj.pengirim),
      kepada: normalizeKey(sj.kepada),
      alamat: normalizeKey(sj.alamat),
      telepon: normalizeKey(sj.telepon),
      beratPerKoli: normalizeKey(sj.beratPerKoli),
      totalBerat: normalizeKey(sj.totalBerat),
      catatan: normalizeKey(sj.catatan),
      rows: sj.rows
        .filter(
          (r) =>
            r.namaBarang.trim() ||
            r.qty.trim() ||
            r.jumlahKoli.trim() ||
            r.keterangan.trim()
        )
        .map((r) => ({
          namaBarang: normalizeKey(r.namaBarang),
          qty: normalizeKey(r.qty),
          jumlahKoli: normalizeKey(r.jumlahKoli),
          keterangan: normalizeKey(r.keterangan),
        })),
    }));
  }

  const canonicalSender = {
    presetId: sender.presetId,
    title: normalizeKey(sender.title),
    address: normalizeKey(sender.address),
    phone: normalizeKey(sender.phone),
    email: normalizeKey(sender.email),
  };

  return {
    title,
    recipientSummary,
    itemCount,
    totalKoli: Math.round(totalKoli),
    payload,
    recipientsPayload,
    itemsPayload,
    canonicalPayload: {
      docType,
      sender: canonicalSender,
      items: canonicalBody,
    },
  };
}

export async function recordShipmentWithDedup(
  params: SaveBatchParams,
  client: SupabaseClient | null = supabase
): Promise<SaveBatchResult> {
  if (!isBatchFilled(params)) {
    return { saved: false, duplicate: false, empty: true, cloudSynced: false };
  }

  const meta = extractBatchMetadata(params);
  const dateKey = getLocalDateKey();
  const contentHash = await hashCanonicalString(JSON.stringify(meta.canonicalPayload));
  const dedupKey = `${params.docType}:${dateKey}:${contentHash}`;

  const existingPromise = inFlightSaves.get(dedupKey);
  if (existingPromise) {
    return existingPromise;
  }

  const runSave = async (): Promise<SaveBatchResult> => {
    const localHist = loadLocalHistory();
    const existingLocal = localHist.find((h) => h.dedupKey === dedupKey);

    const senderSnapshot: SenderHeader = {
      ...params.sender,
    };

    if (client) {
      try {
        const { data, error } = await client.rpc('save_shared_shipment', {
          p_dedup_key: dedupKey,
          p_action: params.action,
          p_doc_type: params.docType,
          p_preset_id: params.sender.presetId,
          p_title: meta.title,
          p_recipient_summary: meta.recipientSummary,
          p_item_count: meta.itemCount,
          p_total_koli: meta.totalKoli,
          p_sender_snapshot: senderSnapshot,
          p_payload: meta.payload,
          p_recipients: meta.recipientsPayload,
          p_items: meta.itemsPayload,
        });

        if (!error && data) {
          const parsed = data as {
            inserted?: boolean;
            record?: Record<string, unknown>;
          };
          const record = parsed.record ? mapRecordRow(parsed.record) : undefined;
          const inserted = Boolean(parsed.inserted);

          if (record) {
            const nextHist = [
              record,
              ...loadLocalHistory().filter(
                (h) => h.id !== record.id && h.dedupKey !== dedupKey
              ),
            ].slice(0, 150);
            writeJsonStorage(LS_HISTORY_KEY, nextHist);
          }

          return {
            saved: true,
            duplicate: !inserted,
            empty: false,
            cloudSynced: true,
            record,
          };
        }
        if (error) {
          console.warn('Supabase save_shared_shipment error:', error);
        }
      } catch (err) {
        console.warn('Gagal sinkron ke Supabase, menyimpan secara lokal:', err);
      }
    }

    // Fallback to local deduplicated save (marked pendingSync so next fetch uploads it)
    if (existingLocal) {
      const updatedExisting: ShipmentRecord = {
        ...existingLocal,
        lastAction: params.action,
      };
      const nextHist = localHist.map((h) =>
        h.dedupKey === dedupKey ? updatedExisting : h
      );
      writeJsonStorage(LS_HISTORY_KEY, nextHist);
      return {
        saved: true,
        duplicate: true,
        empty: false,
        cloudSynced: false,
        record: updatedExisting,
      };
    }

    for (const r of meta.recipientsPayload) {
      upsertRecipientLocally(
        {
          recipientName: r.recipient_name,
          address: r.address,
          phone: r.phone,
          lastItemName: r.last_item_name,
          lastColorId: r.last_color_id,
        },
        true
      );
    }
    for (const i of meta.itemsPayload) {
      upsertItemLocally(i.item_name, i.default_color_id, true);
    }

    const localRecord: ShipmentRecord = {
      id: crypto.randomUUID(),
      dedupKey,
      lastAction: params.action,
      pendingSync: true,
      docType: params.docType,
      presetId: params.sender.presetId,
      title: meta.title,
      recipientSummary: meta.recipientSummary,
      itemCount: meta.itemCount,
      totalKoli: meta.totalKoli,
      senderSnapshot,
      payload: meta.payload,
      createdAt: new Date().toISOString(),
    };

    const nextHist = [localRecord, ...localHist].slice(0, 150);
    writeJsonStorage(LS_HISTORY_KEY, nextHist);

    return {
      saved: true,
      duplicate: false,
      empty: false,
      cloudSynced: false,
      record: localRecord,
    };
  };

  const promise = runSave().finally(() => {
    inFlightSaves.delete(dedupKey);
  });
  inFlightSaves.set(dedupKey, promise);
  return promise;
}

export async function deleteSavedRecipient(
  id: string,
  client: SupabaseClient | null = supabase
): Promise<void> {
  markIdDeleted(id);
  const nextLocal = loadLocalRecipients().filter((r) => r.id !== id);
  writeJsonStorage(LS_RECIPIENTS_KEY, nextLocal);

  if (client) {
    try {
      await client.from('saved_recipients').delete().eq('id', id);
    } catch {
      // ignore if offline
    }
  }
}

export async function deleteShipmentRecord(
  id: string,
  client: SupabaseClient | null = supabase
): Promise<void> {
  markIdDeleted(id);
  const nextLocal = loadLocalHistory().filter((h) => h.id !== id);
  writeJsonStorage(LS_HISTORY_KEY, nextLocal);

  if (client) {
    try {
      await client.from('shipment_records').delete().eq('id', id);
    } catch {
      // ignore if offline
    }
  }
}

export async function deleteSavedItem(
  id: string,
  client: SupabaseClient | null = supabase
): Promise<void> {
  markIdDeleted(id);
  const nextLocal = loadLocalItemCatalog().filter((i) => i.id !== id);
  writeJsonStorage(LS_ITEMS_KEY, nextLocal);

  if (client) {
    try {
      await client.from('saved_items_catalog').delete().eq('id', id);
    } catch {
      // ignore if offline
    }
  }
}

export function filterRecipientSuggestions(
  recipients: SavedRecipient[],
  rawQuery: string,
  limit = 6
): SavedRecipient[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) {
    return recipients.slice(0, limit);
  }

  const firstLine = q.split('\n')[0]?.trim() ?? q;
  if (!firstLine) return recipients.slice(0, limit);

  const scored = recipients
    .map((r) => {
      const nameL = r.recipientName.toLowerCase();
      const addrL = r.address.toLowerCase();
      const phoneL = r.phone.toLowerCase();
      const itemL = r.lastItemName.toLowerCase();

      let matchScore = 0;
      if (nameL.startsWith(firstLine)) matchScore = 100;
      else if (nameL.includes(firstLine)) matchScore = 70;
      else if (addrL.includes(firstLine)) matchScore = 45;
      else if (phoneL.includes(firstLine)) matchScore = 40;
      else if (itemL.includes(firstLine)) matchScore = 25;

      if (matchScore === 0) return null;
      return {
        recipient: r,
        score: matchScore + Math.min(r.useCount * 3, 40),
      };
    })
    .filter((entry): entry is { recipient: SavedRecipient; score: number } => Boolean(entry))
    .sort((a, b) => b.score - a.score || b.recipient.useCount - a.recipient.useCount);

  return scored.slice(0, limit).map((s) => s.recipient);
}

export function filterItemSuggestions(
  items: SavedItemSuggestion[],
  rawQuery: string,
  limit = 6
): SavedItemSuggestion[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return items.slice(0, limit);

  return items
    .filter((item) => item.itemName.toLowerCase().includes(q))
    .sort((a, b) => {
      const aStart = a.itemName.toLowerCase().startsWith(q) ? 1 : 0;
      const bStart = b.itemName.toLowerCase().startsWith(q) ? 1 : 0;
      if (aStart !== bStart) return bStart - aStart;
      return b.useCount - a.useCount;
    })
    .slice(0, limit);
}
