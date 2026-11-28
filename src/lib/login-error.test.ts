import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isLoginThrottled, loginErrorMessage, TOO_MANY_ATTEMPTS } from './login-error';

const axiosError = (status: number, data: unknown) => ({ response: { status, data } });

test('a 429 or code 25 from the login API is a lockout', () => {
  assert.equal(isLoginThrottled(axiosError(429, { code: 25, statusCode: 429, message: 'x' })), true);
  assert.equal(isLoginThrottled(axiosError(429, undefined)), true);
  assert.equal(isLoginThrottled(axiosError(400, { code: 25 })), true);
});

test('a wrong password, a network error, or anything else is not a lockout', () => {
  assert.equal(isLoginThrottled(axiosError(401, { code: 1, statusCode: 401 })), false);
  assert.equal(isLoginThrottled(new Error('Network Error')), false);
  assert.equal(isLoginThrottled(undefined), false);
});

test('the login page message follows the next-auth error query', () => {
  assert.equal(loginErrorMessage(TOO_MANY_ATTEMPTS), '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.');
  assert.equal(loginErrorMessage('CredentialsSignin'), '로그인을 실패했습니다. 아이디 또는 비밀번호를 다시 확인해주세요.');
  assert.equal(loginErrorMessage(undefined), null);
  assert.equal(loginErrorMessage(['TooManyAttempts']), '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.');
});
