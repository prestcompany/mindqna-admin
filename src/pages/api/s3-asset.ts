import { isAdminAssetKey, isJsonContentType, S3_ASSET_HEADERS, upstreamUrl } from '@/lib/s3-asset';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * 어드민이 올린 Lottie JSON 만 S3 에서 받아 같은 출처로 내려준다(S3 는 CORS 를 열어 두지 않았다).
 * 예전 /s3-proxy 는 버킷 전체(사용자 업로드 u/… 포함)를 어드민 도메인에서 열어, 올린 HTML 이 세션을 훔칠 수 있었다.
 * 키는 어드민 자산 모양만, 본문은 upstream 이 application/json 일 때만 넘기고, 모든 응답에 문서로 실행되지 않게 하는 헤더를 붙인다.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  for (const [name, value] of Object.entries(S3_ASSET_HEADERS)) res.setHeader(name, value);

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).end();
    return;
  }

  const key = req.query.key;
  if (!isAdminAssetKey(key)) {
    res.status(400).end();
    return;
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl(key), { redirect: 'error' });
  } catch {
    res.status(502).end();
    return;
  }
  if (!upstream.ok) {
    res.status(upstream.status).end();
    return;
  }
  if (!isJsonContentType(upstream.headers.get('content-type'))) {
    res.status(415).end();
    return;
  }

  // upstream 헤더(Set-Cookie 등)는 넘기지 않는다.
  const body = Buffer.from(await upstream.arrayBuffer());
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).send(body);
}
