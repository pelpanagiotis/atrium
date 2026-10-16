ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_provider_check;
ALTER TABLE tasks
  ADD CONSTRAINT tasks_provider_check
  CHECK (provider IS NULL OR provider = ANY (ARRAY['linear'::text, 'jira'::text, 'github'::text, 'gitlab'::text, 'gitea'::text, 'fake'::text]));

ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_provider_check;
ALTER TABLE integrations
  ADD CONSTRAINT integrations_provider_check
  CHECK (provider = ANY (ARRAY['linear'::text, 'jira'::text, 'github'::text, 'gitlab'::text, 'gitea'::text, 'fake'::text]));

CREATE OR REPLACE FUNCTION record_webhook_delivery(
  p_provider text,
  p_delivery_id text,
  p_signature_valid boolean,
  p_body_sha256 text,
  p_payload jsonb,
  p_integration_id uuid,
  p_workspace_id uuid
) RETURNS TABLE (delivery uuid, inserted boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  existing_id uuid;
  new_id uuid;
BEGIN
  IF p_provider NOT IN ('linear', 'jira', 'github', 'gitlab', 'gitea', 'fake') THEN
    RAISE EXCEPTION 'Unknown provider';
  END IF;
  IF char_length(p_delivery_id) < 8 OR char_length(p_delivery_id) > 200 THEN
    RAISE EXCEPTION 'Invalid delivery id';
  END IF;
  SELECT id INTO existing_id FROM webhook_deliveries
  WHERE provider = p_provider AND delivery_id = p_delivery_id;
  IF existing_id IS NOT NULL THEN
    delivery := existing_id;
    inserted := false;
    RETURN NEXT;
    RETURN;
  END IF;
  INSERT INTO webhook_deliveries (
    provider, delivery_id, integration_id, workspace_id, signature_valid, body_sha256, payload, status
  ) VALUES (
    p_provider,
    p_delivery_id,
    p_integration_id,
    p_workspace_id,
    p_signature_valid,
    p_body_sha256,
    coalesce(p_payload, '{}'::jsonb),
    CASE WHEN p_signature_valid THEN 'received' ELSE 'rejected' END
  ) RETURNING id INTO new_id;
  IF p_signature_valid THEN
    INSERT INTO jobs (workspace_id, kind, payload, status, idempotency_key)
    VALUES (
      p_workspace_id,
      'process_webhook',
      jsonb_build_object('deliveryId', new_id),
      'pending',
      'webhook:' || p_provider || ':' || p_delivery_id
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;
  delivery := new_id;
  inserted := true;
  RETURN NEXT;
END;
$$;
