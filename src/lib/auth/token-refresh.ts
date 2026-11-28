/** 만료 1분 전부터 갱신한다. 요청이 가는 동안이나 서버와 시계가 조금 어긋나도 만료된 토큰을 보내지 않는다. */
export const REFRESH_MARGIN_MS = 60_000;

/** next-auth jwt 콜백이 액세스 토큰을 갱신할 때인지. exp 는 JWT 의 초 단위 만료 시각. */
export function needsRefresh(exp: number, now = Date.now()): boolean {
  return now >= exp * 1000 - REFRESH_MARGIN_MS;
}
