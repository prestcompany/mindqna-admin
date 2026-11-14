// 서버 400 은 typia 형식 오류와 규칙 오류 두 모양이지만 둘 다 response.data.message 를 담는다.
export function toErrorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (typeof message === 'string' && message) return message;
  if (err instanceof Error) return err.message;
  return String(err);
}

/** 서버가 규칙으로 거절한 요청(HTTP 400)인지. 네트워크 오류·500 과 가른다. */
export function isBadRequest(err: unknown): boolean {
  return (err as { response?: { status?: unknown } })?.response?.status === 400;
}
