import client from './@base';
import { CardTemplateType, Locale, Profile, Space, SpaceType, User } from './types';

export async function getUsersAnalytics(by: {
  startedAt?: string;
  endedAt?: string;
  spaceType?: SpaceType[];
  locale?: string[];
}) {
  const res = await client.get<UsersStatistics>('/analytics/user', { params: by });

  return res.data;
}

export async function getSpaceAnalytics(by: {
  startedAt?: string;
  endedAt?: string;
  spaceType?: SpaceType[];
  locale?: string[];
}) {
  const res = await client.get<SpaceStatistics>('/analytics/space', { params: by });

  return res.data;
}

export async function getCardAnalytics() {
  const res = await client.get<CardStatistics>('/analytics/card');

  return res.data;
}

export interface CardStatistics {
  cardStats: {
    locale: Locale;
    type: CardTemplateType;
    spaceType: SpaceType;
    maxOrder: number;
    spaceMaxOrder?: number;
  }[];
}

export interface UsersStatistics {
  users: User[];
  profiles: Profile[];
  total: {
    users: number;
    profiles: number;
    removedProfiles: number;
  };
}

export interface SpaceStatistics {
  spaces: Space[];
  total: {
    spaces: number;
    removedSpaces: number;
  };
}
