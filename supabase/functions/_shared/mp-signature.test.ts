import { verifyMPSignature } from './mp-signature.ts';
const secret = 'unit-test-only-secret';
const now = 1_800_000_000_000;
const body = JSON.stringify({ data: { id: '1234' } });
async function notification(ts = String(now / 1000), id = '1234') {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(`id:${id};request-id:request-1;ts:${ts};`));
  const hash = Array.from(new Uint8Array(mac), b => b.toString(16).padStart(2, '0')).join('');
  return new Request(`https://example.com/mp-webhook?data.id=${id}`, { headers: { 'x-signature': `ts=${ts},v1=${hash}`, 'x-request-id': 'request-1' } });
}
function equal(a: unknown,b: unknown) { if(a !== b) throw new Error(`Expected ${String(b)}, received ${String(a)}`); }
Deno.test('MP accepts correctly signed payment notification', async () => {
 equal(await verifyMPSignature(await notification(), body, secret, now),true);
});
Deno.test('MP rejects missing secret and unsigned requests', async () => {
 equal(await verifyMPSignature(await notification(),body,'',now),false);
 equal(await verifyMPSignature(new Request('https://example.com'),body,secret,now),false);
});
Deno.test('MP rejects expired, future and non-numeric timestamps', async () => {
 for(const ts of [String(now/1000-301),String(now/1000+61),'NaN']) equal(await verifyMPSignature(await notification(ts),body,secret,now),false);
});
Deno.test('MP rejects tampered payment ID or secret', async () => {
 equal(await verifyMPSignature(await notification(),JSON.stringify({data:{id:'9999'}}),secret,now),false);
 equal(await verifyMPSignature(await notification(),body,'wrong-secret',now),false);
});
Deno.test('MP rejects malformed payloads', async () => {
 equal(await verifyMPSignature(await notification(),'not-json',secret,now),false);
 equal(await verifyMPSignature(await notification(),'null',secret,now),false);
});
