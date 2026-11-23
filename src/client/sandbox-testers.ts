import client from './@base';
import { SandboxTesterRow, SandboxTestersResult } from './types';

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
