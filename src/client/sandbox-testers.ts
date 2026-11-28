import client from './@base';

/** 운영·스테이징·중국에서 Sandbox/TestFlight 구매를 실제로 지급받는 계정. */
export type SandboxTesterRow = {
  userId: string;
  /** 탈퇴한 계정이면 null. */
  username: string | null;
  memo: string;
  /** ISO */
  createdAt: string;
};

export type SandboxTestersResult = { items: SandboxTesterRow[] };

/** 최근에 넣은 순. */
export async function getSandboxTesters() {
  const res = await client.get<SandboxTestersResult>('/sandbox-testers');

  return res.data;
}

/** 넣거나 메모를 바꾼다(upsert). 없는 사용자는 404. */
export async function saveSandboxTester(userId: string, memo: string) {
  const res = await client.put<SandboxTesterRow>(`/sandbox-testers/${encodeURIComponent(userId)}`, { memo });

  return res.data;
}

export async function removeSandboxTester(userId: string) {
  const res = await client.delete<{ removed: boolean }>(`/sandbox-testers/${encodeURIComponent(userId)}`);

  return res.data;
}
