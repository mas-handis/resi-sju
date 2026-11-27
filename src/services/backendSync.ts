import { getResiBottomRows, isResiFilled, parseIndonesianNumber } from '../constants';
import { supabase } from '../lib/supabase';
import {
  AppMode,
  KelompokColorId,
  ResiItem,
  SavedItemSuggestion,
  SavedRecipient,
  SenderHeader,
  ShipmentRecord,
  SuratJalanData,
} from '../types';

const LS_RECIPIENTS_KEY = 'resi_saved_recipients_v1';
const LS_ITEMS_KEY = 'resi_saved_items_v1';
const LS_HISTORY_KEY = 'resi_shipment_history_v1';

function normalizeKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function readJsonStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJsonStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
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
  };
}

function mapRecordRow(row: Record<string, unknown>): ShipmentRecord {
  return {
    id: String(row.id),
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

export async function fetchCloudBundle(): Promise<{
  recipients: SavedRecipient[];
  items: SavedItemSuggestion[];
  history: ShipmentRecord[];
}> {
  if (!supabase) {
    return {
      recipients: loadLocalRecipients(),
      items: loadLocalItemCatalog(),
      history: loadLocalHistory(),
    };
  }

  const [recRes, itemRes, histRes] = await Promise.all([
    supabase
      .from('saved_recipients')
      .select('*')
      .order('use_count', { ascending: false })
      .order('last_used_at', { ascending: false })
      .limit(500),
    supabase
      .from('saved_items_catalog')
      .select('*')
      .order('use_count', { ascending: false })
      .order('last_used_at', { ascending: false })
      .limit(300),
    supabase
      .from('shipment_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  if (recRes.error) throw recRes.error;
  if (itemRes.error) throw itemRes.error;
  if (histRes.error) throw histRes.error;

  const recipients = (recRes.data ?? []).map((r) => mapRecipientRow(r as Record<string, unknown>));
  const items = (itemRes.data ?? []).map((r) => mapItemRow(r as Record<string, unknown>));
  const history = (histRes.data ?? []).map((r) => mapRecordRow(r as Record<string, unknown>));

  writeJsonStorage(LS_RECIPIENTS_KEY, recipients);
  writeJsonStorage(LS_ITEMS_KEY, items);
  writeJsonStorage(LS_HISTORY_KEY, history);

  return { recipients, items, history };
}

export interface UpsertRecipientInput {
  recipientName: string;
  address: string;
  phone: string;
  lastItemName?: string;
  lastColorId?: KelompokColorId;
}

export async function recordRecipientUsage(
  input: UpsertRecipientInput,
  isAuthenticated: boolean
): Promise<SavedRecipient | null> {
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
    };
    localList.unshift(updatedLocal);
  }
  writeJsonStorage(LS_RECIPIENTS_KEY, localList);

  if (supabase && isAuthenticated) {
    const { data, error } = await supabase.rpc('record_recipient_usage', {
      p_recipient_name: name,
      p_address: input.address.trim(),
      p_phone: input.phone.trim(),
      p_last_item_name: input.lastItemName?.trim() ?? '',
      p_last_color_id: input.lastColorId ?? 'kelompok_a',
    });
    if (!error && data) {
      return mapRecipientRow(data as Record<string, unknown>);
    }
  }

  return updatedLocal;
}

export async function recordItemUsage(
  itemName: string,
  colorId: KelompokColorId = 'kelompok_a',
  isAuthenticated: boolean
): Promise<SavedItemSuggestion | null> {
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
    };
    localList.unshift(updatedLocal);
  }
  writeJsonStorage(LS_ITEMS_KEY, localList);

  if (supabase && isAuthenticated) {
    const { data, error } = await supabase.rpc('record_item_usage', {
      p_item_name: cleanName,
      p_default_color_id: colorId,
    });
    if (!error && data) {
      return mapItemRow(data as Record<string, unknown>);
    }
  }

  return updatedLocal;
}

export async function learnFromResiBatch(
  resiList: ResiItem[],
  isAuthenticated: boolean
): Promise<void> {
  const seenRecipients = new Set<string>();
  const seenItems = new Set<string>();

  for (const item of resiList) {
    if (!isResiFilled(item)) continue;
    const lines = item.kepada
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const recipientName = lines[0] ?? '';
    const address = lines.slice(1).join('\n');
    const bottomRows = getResiBottomRows(item);
    const firstRow = bottomRows[0];

    if (recipientName) {
      const rKey = normalizeKey(recipientName);
      if (!seenRecipients.has(rKey)) {
        seenRecipients.add(rKey);
        await recordRecipientUsage(
          {
            recipientName,
            address,
            phone: item.noHp.trim(),
            lastItemName: firstRow?.namaBarang.trim() ?? '',
            lastColorId: firstRow?.colorId ?? 'kelompok_a',
          },
          isAuthenticated
        );
      }
    }

    for (const row of bottomRows) {
      const iName = row.namaBarang.trim();
      if (iName) {
        const iKey = normalizeKey(iName);
        if (!seenItems.has(iKey)) {
          seenItems.add(iKey);
          await recordItemUsage(iName, row.colorId, isAuthenticated);
        }
      }
    }
  }
}

export async function learnFromSuratJalanBatch(
  sjList: SuratJalanData[],
  isAuthenticated: boolean
): Promise<void> {
  const seenRecipients = new Set<string>();
  const seenItems = new Set<string>();

  for (const sj of sjList) {
    const recipientName = sj.kepada.trim();
    const firstItem = sj.rows.find((r) => r.namaBarang.trim())?.namaBarang.trim() ?? '';
    if (recipientName) {
      const rKey = normalizeKey(recipientName);
      if (!seenRecipients.has(rKey)) {
        seenRecipients.add(rKey);
        await recordRecipientUsage(
          {
            recipientName,
            address: sj.alamat.trim(),
            phone: sj.telepon.trim(),
            lastItemName: firstItem,
            lastColorId: 'kelompok_a',
          },
          isAuthenticated
        );
      }
    }

    for (const row of sj.rows) {
      const iName = row.namaBarang.trim();
      if (iName) {
        const iKey = normalizeKey(iName);
        if (!seenItems.has(iKey)) {
          seenItems.add(iKey);
          await recordItemUsage(iName, 'kelompok_a', isAuthenticated);
        }
      }
    }
  }
}

export async function saveShipmentRecord(
  params: {
    docType: AppMode;
    sender: SenderHeader;
    resiList: ResiItem[];
    suratJalanList: SuratJalanData[];
  },
  isAuthenticated: boolean
): Promise<ShipmentRecord> {
  const { docType, sender, resiList, suratJalanList } = params;

  let title = '';
  let recipientSummary = '';
  let itemCount = 1;
  let totalKoli = 0;
  let payload: ResiItem[] | SuratJalanData[];

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
    itemCount = resiList.length;
    totalKoli = resiList.length;
    payload = resiList;
    await learnFromResiBatch(resiList, isAuthenticated);
  } else {
    const names = Array.from(
      new Set(suratJalanList.map((s) => s.kepada.trim()).filter(Boolean))
    );
    const firstSj = suratJalanList[0];
    const firstNomor = firstSj?.nomor.trim();
    const firstKepada = names[0] || 'Surat Jalan';
    title =
      suratJalanList.length > 1
        ? `${firstKepada} (${suratJalanList.length} Lembar)`
        : firstNomor
        ? `${firstNomor} — ${firstKepada}`
        : firstKepada;
    recipientSummary = names.slice(0, 3).join(', ');
    itemCount = suratJalanList.length;
    totalKoli = suratJalanList.reduce(
      (sum, sj) =>
        sum +
        sj.rows.reduce((rSum, r) => rSum + parseIndonesianNumber(r.jumlahKoli), 0),
      0
    );
    payload = suratJalanList;
    await learnFromSuratJalanBatch(suratJalanList, isAuthenticated);
  }

  const localRecord: ShipmentRecord = {
    id: crypto.randomUUID(),
    docType,
    presetId: sender.presetId,
    title,
    recipientSummary,
    itemCount,
    totalKoli: Math.round(totalKoli),
    senderSnapshot: sender,
    payload,
    createdAt: new Date().toISOString(),
  };

  if (supabase && isAuthenticated) {
    const { data, error } = await supabase
      .from('shipment_records')
      .insert({
        doc_type: docType,
        preset_id: sender.presetId,
        title,
        recipient_summary: recipientSummary,
        item_count: itemCount,
        total_koli: Math.round(totalKoli),
        sender_snapshot: sender,
        payload,
      })
      .select('*')
      .single();

    if (error) throw error;
    const saved = mapRecordRow(data as Record<string, unknown>);
    const nextHist = [saved, ...loadLocalHistory().filter((h) => h.id !== saved.id)].slice(
      0,
      100
    );
    writeJsonStorage(LS_HISTORY_KEY, nextHist);
    return saved;
  }

  const nextHist = [localRecord, ...loadLocalHistory()].slice(0, 100);
  writeJsonStorage(LS_HISTORY_KEY, nextHist);
  return localRecord;
}

export async function deleteSavedRecipient(
  id: string,
  isAuthenticated: boolean
): Promise<void> {
  const nextLocal = loadLocalRecipients().filter((r) => r.id !== id);
  writeJsonStorage(LS_RECIPIENTS_KEY, nextLocal);

  if (supabase && isAuthenticated) {
    const { error } = await supabase.from('saved_recipients').delete().eq('id', id);
    if (error) throw error;
  }
}

export async function deleteShipmentRecord(
  id: string,
  isAuthenticated: boolean
): Promise<void> {
  const nextLocal = loadLocalHistory().filter((h) => h.id !== id);
  writeJsonStorage(LS_HISTORY_KEY, nextLocal);

  if (supabase && isAuthenticated) {
    const { error } = await supabase.from('shipment_records').delete().eq('id', id);
    if (error) throw error;
  }
}

export async function syncLocalCacheToCloud(): Promise<void> {
  if (!supabase) return;
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) return;

  const localRecipients = loadLocalRecipients();
  for (const r of localRecipients.slice(0, 50)) {
    await supabase.rpc('record_recipient_usage', {
      p_recipient_name: r.recipientName,
      p_address: r.address,
      p_phone: r.phone,
      p_last_item_name: r.lastItemName,
      p_last_color_id: r.lastColorId,
    });
  }

  const localItems = loadLocalItemCatalog();
  for (const i of localItems.slice(0, 50)) {
    await supabase.rpc('record_item_usage', {
      p_item_name: i.itemName,
      p_default_color_id: i.defaultColorId,
    });
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

  // Only match against first line or full query tokens
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
