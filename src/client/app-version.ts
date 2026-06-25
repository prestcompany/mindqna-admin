import client from './@base';
import { AppPlatform, AppVersionPolicies, AppVersionPolicy, UpdateAppVersionParams } from './types';

export async function getAppVersionPolicies() {
  const res = await client.get<AppVersionPolicies>('/app-version');

  return res.data;
}

export async function updateAppVersionPolicy(platform: AppPlatform, body: UpdateAppVersionParams) {
  const res = await client.put<AppVersionPolicy>(`/app-version/${platform}`, body);

  return res.data;
}
