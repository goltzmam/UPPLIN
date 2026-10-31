import test from 'node:test';
import assert from 'node:assert/strict';
import {safeMediaUrl} from '../src/lib/safety-media.ts';
test('support media links accept HTTPS without exposing an executable URL from a report',()=>{
  assert.equal(safeMediaUrl('https://www.upplin.com/pwa-192x192.png'),'https://www.upplin.com/pwa-192x192.png');
  for(const value of ['javascript:alert(1)','data:text/html,<script>alert(1)</script>','http://example.invalid/image.png','https://user:password@example.invalid/image.png','not-a-url',''])assert.equal(safeMediaUrl(value),undefined);
});
