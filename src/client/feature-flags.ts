import client from './@base';
import { FeatureFlagRow, FeatureFlagsResult, UpdateFeatureFlagParams } from './types';

export async function getFeatureFlags() {
  const res = await client.get<FeatureFlagsResult>('/feature-flags');

  return res.data;
}

export async function updateFeatureFlag(key: string, body: UpdateFeatureFlagParams) {
  const res = await client.put<FeatureFlagRow>(`/feature-flags/${encodeURIComponent(key)}`, body);

  return res.data;
}
