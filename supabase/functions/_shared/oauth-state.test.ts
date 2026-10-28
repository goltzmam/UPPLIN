import { createOAuthState, verifyOAuthState } from './oauth-state.ts';
const user = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const secret = 'unit-test-only-secret';
const now = 1_800_000_000_000;
function equal(a: unknown,b: unknown) { if(a !== b) throw new Error(`Expected ${String(b)}, received ${String(a)}`); }
Deno.test('OAuth callback accepts a valid signed state for its user', async () => {
 const state = await createOAuthState(user,secret,now);
 equal(await verifyOAuthState(state,secret,now+1),user);
});
Deno.test('OAuth callback rejects substitution of organizer identity', async () => {
 const state = await createOAuthState(user,secret,now);
 equal(await verifyOAuthState(state.replace(user,other),secret,now+1),null);
});
Deno.test('OAuth callback rejects expired states and other client secrets', async () => {
 const state = await createOAuthState(user,secret,now);
 equal(await verifyOAuthState(state,secret,now+600_000),null);
 equal(await verifyOAuthState(state,'another-client-secret',now+1),null);
});
Deno.test('OAuth callback rejects legacy UUIDs and malformed signatures', async () => {
 equal(await verifyOAuthState(user,secret,now),null);
 equal(await verifyOAuthState(user+'.NaN.nonce.hash',secret,now),null);
 equal(await verifyOAuthState(await createOAuthState(user,secret,now),'',now),null);
});
