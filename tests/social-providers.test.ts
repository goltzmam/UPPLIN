import { test } from 'node:test';
import assert from 'node:assert/strict';
import { socialProviderAvailability } from '../src/lib/social-providers.ts';

test('missing or disabled OAuth providers fail closed', () => {
  assert.deepEqual(socialProviderAvailability({}, 'web'), { appleEnabled: false, googleEnabled: false });
  assert.deepEqual(socialProviderAvailability({ external: { google: false, apple: false } }, 'ios'), { appleEnabled: false, googleEnabled: false });
});

test('iOS Google sign-in requires a configured Apple option; web and Android remain independent', () => {
  const googleOnly = { external: { google: true, apple: false } };
  assert.equal(socialProviderAvailability(googleOnly, 'ios').googleEnabled, false);
  for (const platform of ['web', 'android']) assert.equal(socialProviderAvailability(googleOnly, platform).googleEnabled, true);
  assert.deepEqual(socialProviderAvailability({ external: { google: true, apple: true } }, 'ios'), { appleEnabled: true, googleEnabled: true });
  assert.deepEqual(socialProviderAvailability({ external: { apple: true } }, 'ios'), { appleEnabled: true, googleEnabled: false });
});
