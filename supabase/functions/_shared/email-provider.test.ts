import { sendEmail, EmailProviderError } from './email-provider.ts';
function equal(a: unknown, b: unknown) { if (a !== b) throw new Error(`Expected ${String(b)}, received ${String(a)}`); }
const message = {from:'UPPLIN <no-reply@example.test>',to:'participant@example.test',subject:'Test',text:'Local test; never sent'};
Deno.test('Resend uses a stable idempotency key and the expected API', async () => {
  const calls: RequestInit[] = [];
  const mock: typeof fetch = (input, init) => {
    equal(String(input),'https://api.resend.com/emails'); calls.push(init!);
    return Promise.resolve(new Response(JSON.stringify({id:'local-message'}),{status:200}));
  };
  await sendEmail(message,'test-only-key','stable-message-id',mock);
  await sendEmail(message,'test-only-key','stable-message-id',mock);
  for (const call of calls) equal(new Headers(call.headers).get('Idempotency-Key'),'stable-message-id');
  equal(JSON.parse(String(calls[0].body)).to[0],message.to);
});
Deno.test('Resend exposes retry metadata without logging response content', async () => {
  const mock: typeof fetch = () => Promise.resolve(new Response('provider details',{status:429,headers:{'Retry-After':'30'}}));
  try { await sendEmail(message,'test-only-key','stable-message-id',mock); throw new Error('Expected rate limit'); }
  catch (error) {
    if (!(error instanceof EmailProviderError)) throw error;
    equal(error.status,429); equal(error.retryAfterSeconds,30); equal(error.message.includes('provider details'),false);
  }
});
