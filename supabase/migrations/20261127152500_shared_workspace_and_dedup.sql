-- Shared public workspace without login + strict server-side deduplication
-- Run this script in Supabase SQL Editor if not yet applied.

BEGIN;

-- 1. Drop old per-user RLS policies
DROP POLICY IF EXISTS saved_recipients_select_own ON public.saved_recipients;
DROP POLICY IF EXISTS saved_recipients_insert_own ON public.saved_recipients;
DROP POLICY IF EXISTS saved_recipients_update_own ON public.saved_recipients;
DROP POLICY IF EXISTS saved_recipients_delete_own ON public.saved_recipients;

DROP POLICY IF EXISTS saved_items_catalog_select_own ON public.saved_items_catalog;
DROP POLICY IF EXISTS saved_items_catalog_insert_own ON public.saved_items_catalog;
DROP POLICY IF EXISTS saved_items_catalog_update_own ON public.saved_items_catalog;
DROP POLICY IF EXISTS saved_items_catalog_delete_own ON public.saved_items_catalog;

DROP POLICY IF EXISTS shipment_records_select_own ON public.shipment_records;
DROP POLICY IF EXISTS shipment_records_insert_own ON public.shipment_records;
DROP POLICY IF EXISTS shipment_records_update_own ON public.shipment_records;
DROP POLICY IF EXISTS shipment_records_delete_own ON public.shipment_records;

-- 2. Drop old per-user unique constraints & allow user_id to be NULL for shared workspace rows
ALTER TABLE public.saved_recipients
  DROP CONSTRAINT IF EXISTS saved_recipients_user_key_unique,
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN user_id DROP DEFAULT;

ALTER TABLE public.saved_items_catalog
  DROP CONSTRAINT IF EXISTS saved_items_catalog_user_name_unique,
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN user_id DROP DEFAULT;

ALTER TABLE public.shipment_records
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN user_id DROP DEFAULT;

-- 3. Add global uniqueness on shared workspace catalogs
ALTER TABLE public.saved_recipients
  DROP CONSTRAINT IF EXISTS saved_recipients_normalized_key_unique,
  ADD CONSTRAINT saved_recipients_normalized_key_unique UNIQUE (normalized_key);

ALTER TABLE public.saved_items_catalog
  DROP CONSTRAINT IF EXISTS saved_items_catalog_normalized_name_unique,
  ADD CONSTRAINT saved_items_catalog_normalized_name_unique UNIQUE (normalized_name);

-- 4. Add deduplication key and last action metadata to shipment_records
ALTER TABLE public.shipment_records
  ADD COLUMN IF NOT EXISTS dedup_key text,
  ADD COLUMN IF NOT EXISTS last_action text NOT NULL DEFAULT 'save';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'shipment_records_last_action_check'
      AND conrelid = 'public.shipment_records'::regclass
  ) THEN
    ALTER TABLE public.shipment_records
      ADD CONSTRAINT shipment_records_last_action_check
      CHECK (last_action IN ('save', 'print', 'pdf', 'excel'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS shipment_records_dedup_key_unique
  ON public.shipment_records (dedup_key)
  WHERE dedup_key IS NOT NULL;

-- 5. Grant Data API access to anon & authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_recipients TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_items_catalog TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipment_records TO anon, authenticated;

-- 6. Shared workspace RLS policies (all shared rows have user_id IS NULL)
DROP POLICY IF EXISTS saved_recipients_shared_select ON public.saved_recipients;
DROP POLICY IF EXISTS saved_recipients_shared_insert ON public.saved_recipients;
DROP POLICY IF EXISTS saved_recipients_shared_update ON public.saved_recipients;
DROP POLICY IF EXISTS saved_recipients_shared_delete ON public.saved_recipients;

CREATE POLICY saved_recipients_shared_select ON public.saved_recipients
  FOR SELECT TO anon, authenticated USING (user_id IS NULL);
CREATE POLICY saved_recipients_shared_insert ON public.saved_recipients
  FOR INSERT TO anon, authenticated WITH CHECK (user_id IS NULL);
CREATE POLICY saved_recipients_shared_update ON public.saved_recipients
  FOR UPDATE TO anon, authenticated USING (user_id IS NULL) WITH CHECK (user_id IS NULL);
CREATE POLICY saved_recipients_shared_delete ON public.saved_recipients
  FOR DELETE TO anon, authenticated USING (user_id IS NULL);

DROP POLICY IF EXISTS saved_items_catalog_shared_select ON public.saved_items_catalog;
DROP POLICY IF EXISTS saved_items_catalog_shared_insert ON public.saved_items_catalog;
DROP POLICY IF EXISTS saved_items_catalog_shared_update ON public.saved_items_catalog;
DROP POLICY IF EXISTS saved_items_catalog_shared_delete ON public.saved_items_catalog;

CREATE POLICY saved_items_catalog_shared_select ON public.saved_items_catalog
  FOR SELECT TO anon, authenticated USING (user_id IS NULL);
CREATE POLICY saved_items_catalog_shared_insert ON public.saved_items_catalog
  FOR INSERT TO anon, authenticated WITH CHECK (user_id IS NULL);
CREATE POLICY saved_items_catalog_shared_update ON public.saved_items_catalog
  FOR UPDATE TO anon, authenticated USING (user_id IS NULL) WITH CHECK (user_id IS NULL);
CREATE POLICY saved_items_catalog_shared_delete ON public.saved_items_catalog
  FOR DELETE TO anon, authenticated USING (user_id IS NULL);

DROP POLICY IF EXISTS shipment_records_shared_select ON public.shipment_records;
DROP POLICY IF EXISTS shipment_records_shared_insert ON public.shipment_records;
DROP POLICY IF EXISTS shipment_records_shared_update ON public.shipment_records;
DROP POLICY IF EXISTS shipment_records_shared_delete ON public.shipment_records;

CREATE POLICY shipment_records_shared_select ON public.shipment_records
  FOR SELECT TO anon, authenticated USING (user_id IS NULL);
CREATE POLICY shipment_records_shared_insert ON public.shipment_records
  FOR INSERT TO anon, authenticated WITH CHECK (user_id IS NULL);
CREATE POLICY shipment_records_shared_update ON public.shipment_records
  FOR UPDATE TO anon, authenticated USING (user_id IS NULL) WITH CHECK (user_id IS NULL);
CREATE POLICY shipment_records_shared_delete ON public.shipment_records
  FOR DELETE TO anon, authenticated USING (user_id IS NULL);

-- 7. Shared RPC functions (SECURITY INVOKER, search_path='')
CREATE OR REPLACE FUNCTION public.record_recipient_usage(
  p_recipient_name text,
  p_address text DEFAULT ''::text,
  p_phone text DEFAULT ''::text,
  p_last_item_name text DEFAULT ''::text,
  p_last_color_id text DEFAULT 'kelompok_a'::text
)
RETURNS public.saved_recipients
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_name text := pg_catalog.btrim(pg_catalog.coalesce(p_recipient_name, ''));
  v_addr text := pg_catalog.btrim(pg_catalog.coalesce(p_address, ''));
  v_phone text := pg_catalog.btrim(pg_catalog.coalesce(p_phone, ''));
  v_item text := pg_catalog.btrim(pg_catalog.coalesce(p_last_item_name, ''));
  v_color text := CASE
    WHEN p_last_color_id IN ('kelompok_a', 'kelompok_b', 'kelompok_kb', 'tanpa_kelompok')
      THEN p_last_color_id
    ELSE 'kelompok_a'
  END;
  v_key text;
  v_row public.saved_recipients;
BEGIN
  IF pg_catalog.char_length(v_name) = 0 THEN
    RAISE EXCEPTION 'Recipient name cannot be empty';
  END IF;

  v_key := pg_catalog.lower(pg_catalog.regexp_replace(v_name, '\s+', ' ', 'g'));

  INSERT INTO public.saved_recipients (
    user_id,
    recipient_name,
    address,
    phone,
    last_item_name,
    last_color_id,
    normalized_key,
    use_count,
    last_used_at
  )
  VALUES (
    NULL,
    v_name,
    v_addr,
    v_phone,
    v_item,
    v_color,
    v_key,
    1,
    pg_catalog.now()
  )
  ON CONFLICT (normalized_key) DO UPDATE SET
    recipient_name = EXCLUDED.recipient_name,
    address = CASE
      WHEN pg_catalog.char_length(EXCLUDED.address) > 0 THEN EXCLUDED.address
      ELSE public.saved_recipients.address
    END,
    phone = CASE
      WHEN pg_catalog.char_length(EXCLUDED.phone) > 0 THEN EXCLUDED.phone
      ELSE public.saved_recipients.phone
    END,
    last_item_name = CASE
      WHEN pg_catalog.char_length(EXCLUDED.last_item_name) > 0 THEN EXCLUDED.last_item_name
      ELSE public.saved_recipients.last_item_name
    END,
    last_color_id = EXCLUDED.last_color_id,
    use_count = public.saved_recipients.use_count + 1,
    last_used_at = pg_catalog.now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_item_usage(
  p_item_name text,
  p_default_color_id text DEFAULT 'kelompok_a'::text
)
RETURNS public.saved_items_catalog
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_name text := pg_catalog.btrim(pg_catalog.coalesce(p_item_name, ''));
  v_color text := CASE
    WHEN p_default_color_id IN ('kelompok_a', 'kelompok_b', 'kelompok_kb', 'tanpa_kelompok')
      THEN p_default_color_id
    ELSE 'kelompok_a'
  END;
  v_key text;
  v_row public.saved_items_catalog;
BEGIN
  IF pg_catalog.char_length(v_name) = 0 THEN
    RAISE EXCEPTION 'Item name cannot be empty';
  END IF;

  v_key := pg_catalog.lower(pg_catalog.regexp_replace(v_name, '\s+', ' ', 'g'));

  INSERT INTO public.saved_items_catalog (
    user_id,
    item_name,
    default_color_id,
    normalized_name,
    use_count,
    last_used_at
  )
  VALUES (
    NULL,
    v_name,
    v_color,
    v_key,
    1,
    pg_catalog.now()
  )
  ON CONFLICT (normalized_name) DO UPDATE SET
    item_name = EXCLUDED.item_name,
    default_color_id = EXCLUDED.default_color_id,
    use_count = public.saved_items_catalog.use_count + 1,
    last_used_at = pg_catalog.now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_shared_shipment(
  p_dedup_key text,
  p_action text,
  p_doc_type text,
  p_preset_id text,
  p_title text,
  p_recipient_summary text,
  p_item_count integer,
  p_total_koli integer,
  p_sender_snapshot jsonb,
  p_payload jsonb,
  p_recipients jsonb DEFAULT '[]'::jsonb,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_action text := CASE
    WHEN p_action IN ('save', 'print', 'pdf', 'excel') THEN p_action
    ELSE 'save'
  END;
  v_doc_type text := CASE
    WHEN p_doc_type IN ('resi', 'surat_jalan') THEN p_doc_type
    ELSE 'resi'
  END;
  v_preset text := CASE
    WHEN p_preset_id IN ('sm', 'sju') THEN p_preset_id
    ELSE 'sm'
  END;
  v_dedup text := pg_catalog.btrim(pg_catalog.coalesce(p_dedup_key, ''));
  v_title text := pg_catalog.btrim(pg_catalog.coalesce(p_title, ''));
  v_record public.shipment_records;
  v_inserted boolean := false;
  v_rec jsonb;
  v_item jsonb;
BEGIN
  IF pg_catalog.char_length(v_dedup) = 0 THEN
    RAISE EXCEPTION 'Deduplication key cannot be empty';
  END IF;
  IF pg_catalog.char_length(v_title) = 0 THEN
    v_title := CASE WHEN v_doc_type = 'surat_jalan' THEN 'Surat Jalan' ELSE 'Resi Pengiriman' END;
  END IF;

  INSERT INTO public.shipment_records (
    user_id,
    dedup_key,
    last_action,
    doc_type,
    preset_id,
    title,
    recipient_summary,
    item_count,
    total_koli,
    sender_snapshot,
    payload
  )
  VALUES (
    NULL,
    v_dedup,
    v_action,
    v_doc_type,
    v_preset,
    v_title,
    pg_catalog.coalesce(p_recipient_summary, ''),
    GREATEST(pg_catalog.coalesce(p_item_count, 1), 1),
    GREATEST(pg_catalog.coalesce(p_total_koli, 0), 0),
    pg_catalog.coalesce(p_sender_snapshot, '{}'::jsonb),
    pg_catalog.coalesce(p_payload, '[]'::jsonb)
  )
  ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING
  RETURNING * INTO v_record;

  IF v_record.id IS NOT NULL THEN
    v_inserted := true;

    FOR v_rec IN
      SELECT value FROM pg_catalog.jsonb_array_elements(pg_catalog.coalesce(p_recipients, '[]'::jsonb))
    LOOP
      IF pg_catalog.char_length(pg_catalog.btrim(pg_catalog.coalesce(v_rec->>'recipient_name', ''))) > 0 THEN
        PERFORM public.record_recipient_usage(
          v_rec->>'recipient_name',
          pg_catalog.coalesce(v_rec->>'address', ''),
          pg_catalog.coalesce(v_rec->>'phone', ''),
          pg_catalog.coalesce(v_rec->>'last_item_name', ''),
          pg_catalog.coalesce(v_rec->>'last_color_id', 'kelompok_a')
        );
      END IF;
    END LOOP;

    FOR v_item IN
      SELECT value FROM pg_catalog.jsonb_array_elements(pg_catalog.coalesce(p_items, '[]'::jsonb))
    LOOP
      IF pg_catalog.char_length(pg_catalog.btrim(pg_catalog.coalesce(v_item->>'item_name', ''))) > 0 THEN
        PERFORM public.record_item_usage(
          v_item->>'item_name',
          pg_catalog.coalesce(v_item->>'default_color_id', 'kelompok_a')
        );
      END IF;
    END LOOP;
  ELSE
    UPDATE public.shipment_records
    SET last_action = v_action
    WHERE dedup_key = v_dedup
    RETURNING * INTO v_record;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'inserted', v_inserted,
    'record', pg_catalog.to_jsonb(v_record)
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.record_recipient_usage(text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_item_usage(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_shared_shipment(text, text, text, text, text, text, integer, integer, jsonb, jsonb, jsonb, jsonb) TO anon, authenticated;

COMMIT;
