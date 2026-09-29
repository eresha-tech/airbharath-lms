import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hasConfiguredValue,
  isOtpVerificationSuccessful,
  newUserValues,
  sessionRoleFromPersistedRole,
} from '../lib/auth-policy.ts';

test('missing and blank provider configuration fail closed', () => {
  assert.equal(hasConfiguredValue(undefined), false);
  assert.equal(hasConfiguredValue(''), false);
  assert.equal(hasConfiguredValue('   '), false);
});

test('configured provider values are accepted', () => {
  assert.equal(hasConfiguredValue('synthetic-provider-configuration'), true);
});

test('provider failure cannot become successful verification', () => {
  assert.equal(isOtpVerificationSuccessful(undefined), false);
  assert.equal(isOtpVerificationSuccessful({ type: 'error' }), false);
  assert.equal(isOtpVerificationSuccessful({ message: 'verification unsuccessful' }), false);
});

test('explicit provider success is accepted', () => {
  assert.equal(isOtpVerificationSuccessful({ type: 'success' }), true);
  assert.equal(isOtpVerificationSuccessful({ verified: true }), true);
});

test('new users are always created as students regardless of phone identity', () => {
  const first = newUserValues('910000000001');
  const second = newUserValues('910000000002');

  assert.equal(first.role, 'student');
  assert.equal(second.role, 'student');
  assert.equal(first.fullName, '');
  assert.equal(second.fullName, '');
});

test('a persisted administrator role remains administrator', () => {
  assert.equal(sessionRoleFromPersistedRole('admin'), 'admin');
});

test('a persisted normal role remains normal', () => {
  assert.equal(sessionRoleFromPersistedRole('student'), 'student');
});

test('missing or unexpected persisted roles fail closed to student', () => {
  assert.equal(sessionRoleFromPersistedRole(undefined), 'student');
  assert.equal(sessionRoleFromPersistedRole('owner'), 'student');
});
