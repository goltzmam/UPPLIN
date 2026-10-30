-- Minimize audit entries produced by the final Auth API removal.
CREATE OR REPLACE FUNCTION public.update_deletion_job(p_job_id uuid, p_stage text, p_error text = NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
 IF p_stage='providers_revoked' THEN UPDATE privacy.deletion_jobs SET providers_revoked=true WHERE id=p_job_id;
 ELSIF p_stage='auth_erased' THEN
  UPDATE auth.audit_log_entries a SET payload=jsonb_build_object('action',a.payload->>'action','actor_id',j.anonymous_id::text,'log_type',a.payload->>'log_type')
  FROM privacy.deletion_jobs j WHERE j.id=p_job_id AND position(j.user_id::text IN a.payload::text)>0;
  UPDATE privacy.deletion_jobs SET auth_erased=true WHERE id=p_job_id;
 ELSIF p_stage='completed' THEN
  IF NOT EXISTS(SELECT 1 FROM privacy.deletion_jobs WHERE id=p_job_id AND data_erased AND auth_erased) THEN RAISE EXCEPTION 'deletion_incomplete'; END IF;
  UPDATE privacy.deletion_jobs SET status='completed',completed_at=now(),lease_until=NULL,error_code=NULL WHERE id=p_job_id;
 ELSIF p_stage='confirmation_sent' THEN UPDATE privacy.deletion_jobs SET confirmation_sent=true,contact_email=NULL WHERE id=p_job_id;
 ELSIF p_stage='retry' THEN UPDATE privacy.deletion_jobs SET lease_until=NULL,error_code=left(p_error,80) WHERE id=p_job_id;
 ELSE RAISE EXCEPTION 'invalid_stage'; END IF;
 UPDATE privacy.deletion_jobs SET updated_at=now() WHERE id=p_job_id;
END $$;
