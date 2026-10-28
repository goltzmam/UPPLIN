import { authEmailDeliveries } from './auth-email.ts';
function equal(a: unknown, b: unknown) { if (a !== b) throw new Error(`Expected ${String(b)}, received ${String(a)}`); }
const url = 'https://example.supabase.co';
const site = 'https://www.upplin.com';
Deno.test('signup links use the Supabase verification endpoint and supplied redirect', () => {
  const [message] = authEmailDeliveries({user:{email:'participant@example.test'},email_data:{email_action_type:'signup',token_hash:'hash-with+reserved',redirect_to:site+'/email-confirmado'}},url,site);
  const link = new URL(message.confirmationUrl);
  equal(link.origin,url); equal(link.pathname,'/auth/v1/verify');
  equal(link.searchParams.get('token'),'hash-with+reserved');
  equal(link.searchParams.get('redirect_to'),site+'/email-confirmado');
});
Deno.test('secure email changes send the correct hash to each address', () => {
  const messages = authEmailDeliveries({user:{email:'old@example.test',new_email:'new@example.test'},email_data:{email_action_type:'email_change',token:'old-code',token_new:'new-code',token_hash:'new-hash',token_hash_new:'old-hash'}},url,site);
  equal(messages.length,2); equal(messages[0].to,'old@example.test'); equal(messages[1].to,'new@example.test');
  equal(new URL(messages[0].confirmationUrl).searchParams.get('token'),'old-hash');
  equal(new URL(messages[1].confirmationUrl).searchParams.get('token'),'new-hash');
  equal(messages[0].token,'old-code'); equal(messages[1].token,'new-code');
});
Deno.test('non-secure email changes send only to the new address', () => {
  const messages = authEmailDeliveries({user:{email:'old@example.test',new_email:'new@example.test'},email_data:{email_action_type:'email_change',token_hash:'new-hash',token:'new-code'}},url,site);
  equal(messages.length,1); equal(messages[0].to,'new@example.test');
});
Deno.test('auth email rejects missing verification tokens', () => {
  let rejected = false;
  try { authEmailDeliveries({user:{email:'user@example.test'},email_data:{email_action_type:'signup'}},url,site); } catch { rejected = true; }
  equal(rejected,true);
});
Deno.test('recovery links keep organizer context and tokens in the fragment', () => {
  const [delivery] = authEmailDeliveries({user:{email:'organizer@example.test'},email_data:{email_action_type:'recovery',token_hash:'private-recovery-hash',redirect_to:site+'/organizador/redefinir-senha'}},url,site);
  const link=new URL(delivery.confirmationUrl);
  equal(link.origin,site); equal(link.pathname,'/organizador/redefinir-senha'); equal(link.search,'');
  equal(new URLSearchParams(link.hash.slice(1)).get('token_hash'),'private-recovery-hash');
});
Deno.test('participant recovery and legacy organizer links stay in their own flow', () => {
  for(const [target,expected] of [[site+'/redefinir-senha','/redefinir-senha'],[site+'/redefinir-senha?tipo=organizador','/organizador/redefinir-senha']]) {
    const [delivery]=authEmailDeliveries({user:{email:'user@example.test'},email_data:{email_action_type:'recovery',token_hash:'hash',redirect_to:target}},url,site);
    equal(new URL(delivery.confirmationUrl).pathname,expected);
  }
});
Deno.test('recovery cannot redirect into admin or a different site', () => {
  for(const redirect_to of ['https://admin.upplin.com/login','https://external.example/redefinir-senha',site+'/admin']) {
    let blocked=false;try {authEmailDeliveries({user:{email:'user@example.test'},email_data:{email_action_type:'recovery',token_hash:'hash',redirect_to}},url,site);}catch{blocked=true;}
    equal(blocked,true);
  }
});
