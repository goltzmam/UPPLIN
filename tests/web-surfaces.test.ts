import {test} from 'node:test';
import assert from 'node:assert/strict';
import proxy from '../proxy.ts';
import {webSurface,legacyAdminUrl,recoveryRoutes,legacyRecoveryDestination} from '../src/lib/web-surfaces.ts';
test('web surfaces are exact host matches and never select admin or plans on native',()=>{
  assert.equal(webSurface('admin.upplin.com'),'admin');assert.equal(webSurface('planos.upplin.com'),'plans');
  assert.equal(webSurface('admin.upplin.com.evil.example'),'app');assert.equal(webSurface('admin.upplin.com',true),'app');assert.equal(webSurface('planos.upplin.com',true),'app');
});
test('each recovery context has distinct routes and login destination',()=>{
  assert.equal(recoveryRoutes('participant').login,'/login');assert.equal(recoveryRoutes('organizer').login,'/organizador/login');
  assert.notEqual(recoveryRoutes('participant').reset,recoveryRoutes('organizer').reset);
  assert.equal(legacyRecoveryDestination('/redefinir-senha','?tipo=organizador','#token_hash=x'),'/organizador/redefinir-senha#token_hash=x');
});
test('admin host serves private shell, blocks recovery, and does not accept app routes',()=>{
  const home=proxy(new Request('https://admin.upplin.com/'));
  assert.ok(home.headers.get('x-middleware-rewrite')?.endsWith('/admin-entry.html'));assert.ok(home.headers.get('x-robots-tag')?.includes('noindex'));
  const reset=proxy(new Request('https://admin.upplin.com/recuperar-senha'));
  assert.equal(reset.headers.get('location'),'https://admin.upplin.com/login');
  const image=proxy(new Request('https://admin.upplin.com/upplin-icon.svg'));assert.equal(image.headers.get('x-middleware-next'),'1');
});
test('landing host preserves campaign parameters and organizer actions leave for main app',()=>{
  const home=proxy(new Request('https://planos.upplin.com/'));assert.ok(home.headers.get('x-middleware-rewrite')?.endsWith('/plans-entry.html'));
  const login=proxy(new Request('https://planos.upplin.com/organizador/login'));assert.equal(login.headers.get('location'),'https://www.upplin.com/organizador/login');
  const legacy=proxy(new Request('https://www.upplin.com/planos/organizador?utm_source=campaign'));assert.equal(legacy.headers.get('location'),'https://planos.upplin.com/?utm_source=campaign');
  assert.equal(legacyAdminUrl('/admin/users'),'https://admin.upplin.com/users');
});
test('canonical domain and legacy index aliases permanently redirect without losing campaign parameters',()=>{
  for(const path of ['/', '/evento/show?utm_source=google', '/favicon.ico']) {
    const redirect=proxy(new Request('https://upplin.com'+path));
    assert.equal(redirect.status,308);assert.equal(redirect.headers.get('location'),'https://www.upplin.com'+path);
  }
  for(const path of ['/index','/index.html','/index.htm']) {
    const redirect=proxy(new Request('https://www.upplin.com'+path+'?utm_source=google'));
    assert.equal(redirect.status,308);assert.equal(redirect.headers.get('location'),'https://www.upplin.com/?utm_source=google');
  }
  const icon=proxy(new Request('https://www.upplin.com/favicon-upplin.png'));
  assert.equal(icon.headers.get('x-middleware-next'),'1');
});
test('moderation is a private web support surface',()=>{
  const response=proxy(new Request('https://admin.upplin.com/moderation'));
  assert.ok(response.headers.get('x-middleware-rewrite')?.endsWith('/admin-entry.html'));
  assert.ok(response.headers.get('x-robots-tag')?.includes('noindex'));
  assert.equal(webSurface('admin.upplin.com',true),'app');
});
