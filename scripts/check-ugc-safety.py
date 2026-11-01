#!/usr/bin/env python3
"""Check UGC safety with disposable fixtures in the configured UPPLIN project.
Requires SUPABASE_ACCESS_TOKEN; never sends mail or calls a payment provider.
"""
import argparse
_parser=argparse.ArgumentParser(description=__doc__)
_parser.add_argument('--apply',action='store_true',help='Create temporary test users/data, run checks and remove them.')
if not _parser.parse_args().apply:
 print('Dry run. Use --apply to run the disposable integration checks.');raise SystemExit(0)
import os,json,urllib.request,urllib.error,uuid,secrets,base64,time
base='https://api.supabase.com/v1/projects/ermhzlthjlolqsbtjawf';supa='https://ermhzlthjlolqsbtjawf.supabase.co'
def call(url,token,data=None,apikey=None,method=None):
 h={'Authorization':'Bearer '+token,'Content-Type':'application/json','Prefer':'return=representation'}
 if apikey:h['apikey']=apikey
 req=urllib.request.Request(url,headers=h,data=json.dumps(data).encode() if data is not None else None,method=method or ('POST' if data is not None else 'GET'))
 with urllib.request.urlopen(req,timeout=80) as r:
  raw=r.read();return json.loads(raw) if raw else None
keys=call(base+'/api-keys',os.environ['SUPABASE_ACCESS_TOKEN']);anon=next(x['api_key'] for x in keys if x['name']=='anon');service=next(x['api_key'] for x in keys if x['name']=='service_role')
def rest(path,data=None,token=service,method=None):return call(supa+path,token,data,anon,method)
def q(sql):return call(base+'/database/query',os.environ['SUPABASE_ACCESS_TOKEN'],{'query':sql,'read_only':False})
def denied(fn,allowed=[400,401,403,404,409]):
 try:fn();raise AssertionError('Forbidden request succeeded')
 except urllib.error.HTTPError as e:assert e.code in allowed
users=[];orgs=[];events=[];orders=[];posts=[];convs=[];objects=[];reports=[]
try:
 sessions=[]
 for label in ['participant','organizer','support']:
  password=secrets.token_urlsafe(24)+'Aa1!';email='ugc-'+uuid.uuid4().hex+'@audit.invalid'
  u=rest('/auth/v1/admin/users',{'email':email,'password':password,'email_confirm':True,'app_metadata':{'privacy_test':True},'user_metadata':{'full_name':'Verificação '+label}});users.append(u['id']);sessions.append(rest('/auth/v1/token?grant_type=password',{'email':email,'password':password},token=anon))
 rest('/rest/v1/user_roles',{'user_id':users[1],'role':'organizer'});rest('/rest/v1/user_roles',{'user_id':users[2],'role':'admin'})
 a,b,staff=[s['access_token'] for s in sessions]
 assert q("SELECT public.ugc_text_needs_review('CONTEÚDO SEXUAL EXPLÍCITO') uppercase,public.ugc_text_needs_review('ｐｏｒｎｏｇｒａｆｉａ') unicode")[0]=={'uppercase':True,'unicode':True}
 org=rest('/rest/v1/organizer_accounts',{'owner_user_id':users[1],'display_name':'Organizador temporário UGC','status':'active'})[0];orgs.append(org['id'])
 event=rest('/rest/v1/events',{'organizer_id':org['id'],'title':'Evento privado UGC','status':'draft','start_at':'2026-12-20T22:00:00Z'})[0];events.append(event['id'])
 order=rest('/rest/v1/orders',{'event_id':event['id'],'buyer_user_id':users[0],'status':'paid','total_cents':0})[0];orders.append(order['id'])
 ticket_type=rest('/rest/v1/ticket_types',{'event_id':event['id'],'name':'Ingresso técnico','quantity_total':10,'price_cents':0})[0]
 rest('/rest/v1/tickets',{'order_id':order['id'],'event_id':event['id'],'ticket_type_id':ticket_type['id'],'buyer_user_id':users[0],'status':'used','used_at':'2026-10-31T12:00:00Z'})
 review=rest('/rest/v1/event_reviews',{'event_id':event['id'],'user_id':users[0],'rating':5,'comment':'Conteúdo sexual explícito — exemplo técnico'},token=a)[0]
 assert review['moderation_status']=='pending' and rest('/rest/v1/event_reviews?id=eq.'+review['id'],token=b)==[]
 rest('/rest/v1/rpc/review_ugc',{'p_kind':'review','p_id':review['id'],'p_action':'approve'},token=staff)
 assert rest('/rest/v1/event_reviews?id=eq.'+review['id'],token=b)
 cid=rest('/rest/v1/rpc/start_chat',{'p_type':'user_organizer','p_event_id':event['id']},token=a);convs.append(cid)
 rest('/rest/v1/messages',{'conversation_id':cid,'sender_id':users[0],'content':'Mensagem técnica de verificação'},token=a)
 post=rest('/rest/v1/user_posts',{'user_id':users[1],'content':'Publicação de verificação','media_url':'https://www.upplin.com/pwa-192x192.png','media_type':'image','moderation_status':'approved'},token=b)[0];posts.append(post['id'])
 assert post['moderation_status']=='pending';assert rest('/rest/v1/user_posts?id=eq.'+post['id'],token=a)==[];assert rest('/rest/v1/user_posts?id=eq.'+post['id'],token=anon)==[]
 denied(lambda:rest('/rest/v1/user_posts?id=eq.'+post['id'],{'moderation_status':'approved'},token=b,method='PATCH'))
 denied(lambda:rest('/rest/v1/rpc/review_ugc',{'p_kind':'post','p_id':post['id'],'p_action':'approve'},token=a))
 denied(lambda:rest('/rest/v1/rpc/moderation_queue',{},token=a))
 rest('/rest/v1/rpc/review_ugc',{'p_kind':'post','p_id':post['id'],'p_action':'approve'},token=staff)
 assert rest('/rest/v1/user_posts?id=eq.'+post['id'],token=a)
 c=rest('/rest/v1/user_post_comments',{'post_id':post['id'],'user_id':users[0],'content':'Exemplo técnico: conteúdo sexual explícito','moderation_status':'approved'},token=a)[0]
 assert c['moderation_status']=='pending';assert rest('/rest/v1/user_post_comments?id=eq.'+c['id'],token=b)==[]
 rest('/rest/v1/rpc/review_ugc',{'p_kind':'comment','p_id':c['id'],'p_action':'approve'},token=staff)
 assert rest('/rest/v1/user_post_comments?id=eq.'+c['id'],token=b)
 ids=[]
 for kind,target in [('post',post['id']),('comment',c['id']),('profile',users[1]),('review',review['id'])]:
  token=b if kind in ['comment','review'] else a
  rid=rest('/rest/v1/rpc/report_content',{'p_kind':kind,'p_target':target,'p_reason':'other','p_details':'Verificação técnica de denúncia'},token=token);ids.append(rid);reports.append(rid)
  assert rest('/rest/v1/rpc/report_content',{'p_kind':kind,'p_target':target,'p_reason':'spam'},token=token)==rid
 assert rest('/rest/v1/content_reports',token=a)==[]
 queue=rest('/rest/v1/rpc/moderation_queue',{},token=staff);assert all(any(r['id']==rid for r in queue['reports']) for rid in ids)
 rest('/rest/v1/rpc/review_ugc',{'p_kind':'post','p_id':post['id'],'p_action':'hide','p_report_id':ids[0],'p_note':'Verificação concluída'},token=staff)
 assert rest('/rest/v1/user_posts?id=eq.'+post['id'],token=a)==[]
 rest('/rest/v1/rpc/review_ugc',{'p_kind':'post','p_id':post['id'],'p_action':'approve'},token=staff)
 print('UGC filter and review: pending media/text withheld, status bypass rejected, authorized approval/hide and all report types passed.',flush=True)
 denied(lambda:rest('/rest/v1/rpc/set_user_block',{'p_user_id':users[0],'p_blocked':True},token=a))
 denied(lambda:rest('/rest/v1/rpc/set_user_block',{'p_user_id':users[2],'p_blocked':True},token=a))
 rest('/rest/v1/rpc/set_user_block',{'p_user_id':users[1],'p_blocked':True},token=a)
 assert rest('/rest/v1/user_posts?id=eq.'+post['id'],token=a)==[]
 assert rest('/rest/v1/profiles_public?id=eq.'+users[1],token=a)==[]
 assert rest('/rest/v1/profiles_public?id=eq.'+users[0],token=b)==[]
 for token,sender in [(a,users[0]),(b,users[1])]:denied(lambda:rest('/rest/v1/messages',{'conversation_id':cid,'sender_id':sender,'content':'Mensagem bloqueada de teste'},token=token))
 denied(lambda:rest('/rest/v1/rpc/start_chat',{'p_type':'user_organizer','p_event_id':event['id']},token=a))
 assert rest('/rest/v1/orders?id=eq.'+order['id'],token=a)
 assert rest('/rest/v1/rpc/my_blocked_users',{},token=a)[0]['user_id']==users[1]
 rest('/rest/v1/rpc/set_user_block',{'p_user_id':users[1],'p_blocked':False},token=a)
 rest('/rest/v1/messages',{'conversation_id':cid,'sender_id':users[0],'content':'Mensagem após desbloqueio'},token=a)
 print('Blocking: bilateral content/profile hiding, two-way message rejection, chat-start rejection, preserved orders and unblock passed.',flush=True)
 # Profile filtering also applies to Auth-triggered initial names.
 rest('/rest/v1/profiles?id=eq.'+users[0],{'photo_url':'https://www.upplin.com/pwa-192x192.png'},token=a,method='PATCH')
 masked=rest('/rest/v1/profiles_public?id=eq.'+users[0],token=b)[0];assert masked['photo_url'] is None
 identities=rest('/rest/v1/rpc/get_chat_identities',{'p_conversation_ids':[cid]},token=b)
 assert next(p for p in identities if p['user_id']==users[0])['photo_url'] is None
 assert any(p['kind']=='profile' and p['id']==users[0] for p in rest('/rest/v1/rpc/moderation_queue',{},token=staff)['pending'])
 rest('/rest/v1/rpc/review_ugc',{'p_kind':'profile','p_id':users[0],'p_action':'approve'},token=staff)
 assert rest('/rest/v1/profiles_public?id=eq.'+users[0],token=b)[0]['photo_url']
 print('Profile media pending/approved visibility passed.',flush=True)
 support_conv=rest('/rest/v1/conversations',{'type':'user_admin','participant_1_id':users[0],'participant_2_id':users[2]})[0]['id'];convs.append(support_conv)
 rest('/rest/v1/profiles?id=eq.'+users[0],{'moderation_status':'hidden'},method='PATCH')
 rest('/rest/v1/messages',{'conversation_id':support_conv,'sender_id':users[0],'content':'Contato técnico com suporte da conta restrita'},token=a)
 denied(lambda:rest('/rest/v1/messages',{'conversation_id':cid,'sender_id':users[0],'content':'Mensagem restrita'},token=a))
 rest('/rest/v1/profiles?id=eq.'+users[0],{'moderation_status':'approved'},method='PATCH')
 print('Restricted users retain access to official support while peer messaging stays blocked.',flush=True)

 # Immutable media cannot be swapped at an approved URL, even after deletion.
 path=users[1]+'/immutable-'+uuid.uuid4().hex+'.png';objects.append(('user-posts',path));png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
 def upload(method='POST'):
  req=urllib.request.Request(supa+'/storage/v1/object/user-posts/'+path,data=png,method=method,headers={'Authorization':'Bearer '+b,'apikey':anon,'Content-Type':'image/png'})
  with urllib.request.urlopen(req,timeout=30) as r:return r.status
 upload();url=supa+'/storage/v1/object/public/user-posts/'+path
 post2=rest('/rest/v1/user_posts',{'user_id':users[1],'content':'Imagem imutável','media_url':url,'media_type':'image'},token=b)[0];posts.append(post2['id'])
 denied(lambda:upload('PUT'),[400,401,403])
 rest('/storage/v1/object/user-posts',{'prefixes':[path]},token=b,method='DELETE')
 denied(lambda:upload(),[400,401,403])
 print('Media replacement after review is denied, including deleting and re-uploading a referenced path.',flush=True)
finally:
 for oid in orders:rest('/rest/v1/orders?id=eq.'+oid,method='DELETE')
 for cid in convs:rest('/rest/v1/conversations?id=eq.'+cid,method='DELETE')
 for pid in posts:rest('/rest/v1/user_posts?id=eq.'+pid,method='DELETE')
 for eid in events:rest('/rest/v1/events?id=eq.'+eid,method='DELETE')
 for org in orgs:rest('/rest/v1/organizer_accounts?id=eq.'+org,method='DELETE')
 for bucket,path in objects:rest('/storage/v1/object/'+bucket,{'prefixes':[path]},method='DELETE')
 if reports:q("DELETE FROM public.content_reports WHERE id IN("+','.join("'%s'"%r for r in reports)+')')
 for uid in users:rest('/auth/v1/admin/users/'+uid,method='DELETE')
 print('Temporary moderation fixtures removed; no human report, payment or email used.',flush=True)
