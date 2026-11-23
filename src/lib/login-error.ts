/** authorize 가 던지는 오류 이름. next-auth 가 /login?error= 에 그대로 실어 보낸다. */
export const TOO_MANY_ATTEMPTS = 'TooManyAttempts';

/** 서버가 로그인 시도 제한으로 거절했는지(HTTP 429, code 25). 문구는 보지 않는다. */
export function isLoginThrottled(err: unknown): boolean {
  const res = (err as { response?: { status?: unknown; data?: { code?: unknown } } } | undefined)?.response;
  return res?.status === 429 || res?.data?.code === 25;
}

/** 로그인 화면에 띄울 문구. 모르는 오류면 null. */
export function loginErrorMessage(error: string | string[] | undefined): string | null {
  const code = Array.isArray(error) ? error[0] : error;
  if (code === TOO_MANY_ATTEMPTS) return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.';
  if (code === 'CredentialsSignin') return '로그인을 실패했습니다. 아이디 또는 비밀번호를 다시 확인해주세요.';
  return null;
}
