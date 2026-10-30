-- Purge personal email payloads, including failed messages, in the same
-- transaction that marks personal data erased. Queue names are fixed, never
-- supplied by clients. Do not retain queued password/reset links after erasure.
CREATE FUNCTION privacy.erase_queued_personal_email() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE queue_table text;
BEGIN
 IF NEW.data_erased AND NOT OLD.data_erased AND OLD.contact_email IS NOT NULL THEN
  FOREACH queue_table IN ARRAY ARRAY[
   'q_auth_emails','a_auth_emails','q_auth_emails_dlq','a_auth_emails_dlq',
   'q_transactional_emails','a_transactional_emails','q_transactional_emails_dlq','a_transactional_emails_dlq'
  ] LOOP
   IF to_regclass(format('pgmq.%I',queue_table)) IS NOT NULL THEN
    EXECUTE format('DELETE FROM pgmq.%I WHERE lower(message->>''to'')=lower($1)',queue_table)
     USING OLD.contact_email;
   END IF;
  END LOOP;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION privacy.erase_queued_personal_email() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER erase_queued_personal_email BEFORE UPDATE OF data_erased ON privacy.deletion_jobs
FOR EACH ROW EXECUTE FUNCTION privacy.erase_queued_personal_email();
