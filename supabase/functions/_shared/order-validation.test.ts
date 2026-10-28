import { isSaleOpen, validateOrderItems } from './order-validation.ts';
function equal(a: unknown,b: unknown) { if(a !== b) throw new Error(`Expected ${String(b)}, received ${String(a)}`); }
Deno.test('orders accept distinct ticket types and integral quantities', () => {
 equal(validateOrderItems([{ticket_type_id:'a',qty:1},{ticket_type_id:'b',qty:10}]),null);
});
Deno.test('orders reject missing, fractional, non-finite and out-of-range quantities', () => {
 for(const qty of [0,-1,11,1.5,NaN,Infinity,'1',null]) {
  if(validateOrderItems([{ticket_type_id:'a',qty}])===null)throw new Error(`Accepted invalid quantity ${qty}`);
 }
 for(const items of [null,[],[null],[{}]]) if(validateOrderItems(items)===null)throw new Error('Accepted malformed items');
});
Deno.test('orders cannot bypass per-type limits with duplicate item rows', () => {
 if(validateOrderItems([{ticket_type_id:'a',qty:10},{ticket_type_id:'a',qty:10}])===null)throw new Error('Accepted duplicate rows');
});
Deno.test('orders enforce the sales window and permit unrestricted windows', () => {
 const now=Date.parse('2026-10-26T12:00:00Z');
 equal(isSaleOpen(null,null,now),true);
 equal(isSaleOpen('2026-10-27T00:00:00Z',null,now),false);
 equal(isSaleOpen(null,'2026-10-25T00:00:00Z',now),false);
 equal(isSaleOpen('2026-10-25T00:00:00Z','2026-10-27T00:00:00Z',now),true);
});
