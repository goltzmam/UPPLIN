-- Alerta de denúncia também para a caixa suporte@upplin.com (pedido do Gideão, 04/11/2026: "dá pra criar
-- o e-mail pra denúncias: suporte@upplin.com"). Só troca o corpo da função da 20261104200000, que segue
-- igual no resto: conta técnica de teste (privacy_test) não dispara alerta; os admins seguem recebendo o
-- aviso no app e por e-mail, e a caixa de suporte passa a receber um e-mail por denúncia.
-- Se um admin usar o próprio endereço de suporte, ele não recebe duas vezes.
-- Falha aqui nunca derruba a denúncia. O e-mail não carrega conteúdo do usuário: id é uuid,
-- target_kind e reason vêm de listas fechadas.
CREATE OR REPLACE FUNCTION public.notify_content_report()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
 a record;
 caixa constant text := 'suporte@upplin.com';
 corpo_html text;
 corpo_texto text;
BEGIN
 -- Only server-marked disposable technical accounts skip outbound alerts.
 IF EXISTS(SELECT 1 FROM auth.users u WHERE u.id=NEW.reporter_id AND u.raw_app_meta_data->>'privacy_test'='true') THEN RETURN NEW; END IF;
 corpo_html := '<p>Há uma nova denúncia para analisar. Prazo: 24 horas.</p><p>Código: '||NEW.id||'<br>Tipo: '||NEW.target_kind||'<br>Motivo: '||NEW.reason||'</p><p><a href="https://admin.upplin.com/moderation">Abrir Moderação e denúncias</a></p>';
 corpo_texto := 'Há uma nova denúncia para analisar. Prazo: 24 horas. Código: '||NEW.id||'. Tipo: '||NEW.target_kind||'. Motivo: '||NEW.reason||'. Painel: https://admin.upplin.com/moderation';

 FOR a IN SELECT r.user_id AS admin_id,u.email FROM public.user_roles r JOIN auth.users u ON u.id=r.user_id WHERE r.role='admin'::public.app_role LOOP
  BEGIN
   INSERT INTO public.notifications(user_id,title,body,type,data)
   VALUES(a.admin_id,'Nova denúncia','Há uma denúncia para analisar no painel.','content_report',pg_catalog.jsonb_build_object('report_id',NEW.id));
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'notify_content_report notification failed: %',SQLERRM;
  END;
  IF a.email IS NOT NULL AND pg_catalog.lower(a.email) <> caixa THEN
   BEGIN
    PERFORM public.enqueue_email('transactional_emails',pg_catalog.jsonb_build_object(
     'to',a.email,
     'subject','Nova denúncia na Upplin',
     'html',corpo_html,
     'text',corpo_texto,
     'label','content_report',
     'message_id',gen_random_uuid()::text,
     'idempotency_key','content-report-'||NEW.id||'-'||a.admin_id,
     'queued_at',now()));
   EXCEPTION WHEN OTHERS THEN RAISE WARNING 'notify_content_report email failed: %',SQLERRM;
   END;
  END IF;
 END LOOP;

 BEGIN
  PERFORM public.enqueue_email('transactional_emails',pg_catalog.jsonb_build_object(
   'to',caixa,
   'subject','Nova denúncia na Upplin',
   'html',corpo_html,
   'text',corpo_texto,
   'label','content_report',
   'message_id',gen_random_uuid()::text,
   'idempotency_key','content-report-'||NEW.id||'-suporte',
   'queued_at',now()));
 EXCEPTION WHEN OTHERS THEN RAISE WARNING 'notify_content_report support email failed: %',SQLERRM;
 END;

 RETURN NEW;
EXCEPTION WHEN OTHERS THEN
 RAISE WARNING 'notify_content_report failed: %',SQLERRM;
 RETURN NEW;
END $function$;

REVOKE ALL ON FUNCTION public.notify_content_report() FROM PUBLIC,anon,authenticated;
