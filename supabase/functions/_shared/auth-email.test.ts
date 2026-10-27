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
