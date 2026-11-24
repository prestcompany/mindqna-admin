const BUCKET_ORIGIN = 'https://mindqna.s3.amazonaws.com';

/**
 * 어드민이 올린 Lottie: 서버 uploadSingleFileToS3 가 `<YYYY-MM-DD>/<원래 파일 이름>` 으로 둔다.
 * 사용자 업로드(u/…)·하위 폴더·`..`·역슬래시·.json 이 아닌 것은 받지 않는다.
 */
const ADMIN_ASSET_KEY = /^\d{4}-\d{2}-\d{2}\/[^/\\]+\.json$/;

export function isAdminAssetKey(key: unknown): key is string {
  return typeof key === 'string' && ADMIN_ASSET_KEY.test(key) && !key.includes('..') && !key.endsWith('/.json');
}

export function upstreamUrl(key: string): string {
  return `${BUCKET_ORIGIN}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

/**
 * 본문은 JSON 으로 읽힐 때만 넘긴다. HTML 등은 어드민 도메인에서 열리면 세션을 훔칠 수 있다.
 * S3 의 Content-Type 은 보지 않는다. 예전에 올린 Lottie 는 application/octet-stream·text/plain 으로 저장돼 있을 수 있다.
 */
export function isJsonBody(body: Buffer): boolean {
  try {
    JSON.parse(body.toString('utf8'));
    return true;
  } catch {
    return false;
  }
}

/** Vercel 함수 응답 한도(4.5MB)보다 조금 작게 끊어, 넘으면 불투명하게 실패하지 않고 413 을 준다. */
export const MAX_ASSET_BYTES = 4.4 * 1024 * 1024;

/** fetch().json() 에는 영향이 없고, 주소를 직접 열었을 때 문서로 실행되지 않게 한다. */
export const S3_ASSET_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Content-Disposition': 'attachment',
  'Content-Security-Policy': "sandbox; default-src 'none'",
} as const;

/** S3 주소를 /api/s3-asset 요청으로 바꾼다. 주소가 아니면 null. */
export function assetProxyPath(fileUrl: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(fileUrl).pathname;
  } catch {
    return null;
  }
  let key: string;
  try {
    key = decodeURIComponent(pathname.slice(1));
  } catch {
    return null;
  }
  return `/api/s3-asset?key=${encodeURIComponent(key)}`;
}
