import test from 'node:test';
import assert from 'node:assert/strict';
import {profileStatusForAction} from '../src/lib/admin-user-status.ts';
test('admin user actions map to profile status values',()=>{
  assert.equal(profileStatusForAction('suspend'),'suspended');
  assert.equal(profileStatusForAction('ban'),'banned');
  assert.equal(profileStatusForAction('activate'),'active');
});
