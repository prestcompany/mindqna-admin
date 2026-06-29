import client from './@base';
import {
  CardEligibilityResult,
  QueryResultWithPagination,
  SearchPageResult,
  Space,
  SpaceActivityResult,
  SpaceActivitySummary,
  SpaceCardRepliesResult,
  SpaceCardRow,
  SpaceCoinRow,
  SpaceDetail,
  SpaceDiaryDetail,
  SpaceDiaryRow,
  SpaceDiaryStats,
  SpaceCoinStatsResult,
  SpaceMemberDetail,
  SpaceMembersResult,
  SpacePetInteriorResult,
  SpaceScheduleDetail,
  SpaceScheduleRow,
  SpaceType,
  UpdateSpaceParams,
} from './types';

export type SpaceOrderBy =
  | 'card'
  | 'replies'
  | 'members'
  | 'heart'
  | 'star'
  | 'exp'
  | 'roomCount'
  | 'interiorCount';

export type SearchSpacesParams = {
  page: number;
  keyword?: string;
  spaceId?: string;
  name?: string;
  username?: string;
  nickname?: string;
  type?: SpaceType;
  locale?: string;
  startDate?: string;
  endDate?: string;
};

export type SearchSpacesResult = QueryResultWithPagination<Space> & {
  totalCount: number;
};

export async function getSpaces(
  page: number,
  type?: SpaceType[],
  locale?: string[],
  orderBy?: SpaceOrderBy,
) {
  const res = await client.get<QueryResultWithPagination<Space>>('/space', { params: { page, type, locale, orderBy } });

  return res.data;
}

export async function getSpace(id: string) {
  const res = await client.get<SpaceDetail>(`/space/${id}`);

  return res.data;
}

export async function removeSpace(id: string) {
  const res = await client.delete(`/space/${id}`);

  return res.data;
}

export async function removeProfile(id: string) {
  const res = await client.delete(`/profile/${id}`);

  return res.data;
}

export async function searchSpaces(by: SearchSpacesParams) {
  const res = await client.get<SearchSpacesResult>(`/space/search`, { params: by });

  return res.data;
}

export async function getSpaceCards(id: string, page: number) {
  const res = await client.get<SearchPageResult<SpaceCardRow>>(`/space/${id}/cards`, { params: { page } });

  return res.data;
}

export async function getSpaceCardReplies(id: string, cardId: number) {
  const res = await client.get<SpaceCardRepliesResult>(`/space/${id}/cards/${cardId}/replies`);

  return res.data;
}

export async function getSpaceCoins(id: string, page: number) {
  const res = await client.get<SearchPageResult<SpaceCoinRow>>(`/space/${id}/coins`, { params: { page } });

  return res.data;
}

export async function getSpaceMembers(id: string) {
  const res = await client.get<SpaceMembersResult>(`/space/${id}/members`);

  return res.data;
}

export async function getSpaceMemberDetail(id: string, profileId: string) {
  const res = await client.get<SpaceMemberDetail>(`/space/${id}/members/${profileId}`);

  return res.data;
}

export async function getSpaceDiaries(id: string, page: number) {
  const res = await client.get<SearchPageResult<SpaceDiaryRow>>(`/space/${id}/diaries`, { params: { page } });

  return res.data;
}

export async function getSpaceDiary(id: string, diaryId: number) {
  const res = await client.get<SpaceDiaryDetail>(`/space/${id}/diaries/${diaryId}`);

  return res.data;
}

export async function getSpaceDiaryStats(id: string) {
  const res = await client.get<SpaceDiaryStats>(`/space/${id}/diary-stats`);

  return res.data;
}

export async function getSpaceSchedules(id: string, page: number) {
  const res = await client.get<SearchPageResult<SpaceScheduleRow>>(`/space/${id}/schedules`, { params: { page } });

  return res.data;
}

export async function getSpaceScheduleDetail(id: string, scheduleId: number) {
  const res = await client.get<SpaceScheduleDetail>(`/space/${id}/schedules/${scheduleId}`);

  return res.data;
}

export async function getSpacePetInterior(id: string) {
  const res = await client.get<SpacePetInteriorResult>(`/space/${id}/pet-interior`);

  return res.data;
}

export async function getSpaceActivity(id: string, page: number) {
  const res = await client.get<SpaceActivityResult>(`/space/${id}/activity`, { params: { page } });

  return res.data;
}

export async function getSpaceCardEligibility(id: string) {
  const res = await client.get<CardEligibilityResult>(`/space/${id}/card-eligibility`);

  return res.data;
}

export async function getSpaceCoinStats(id: string) {
  const res = await client.get<SpaceCoinStatsResult>(`/space/${id}/coin-stats`);

  return res.data;
}

export async function getSpaceActivitySummary(id: string) {
  const res = await client.get<SpaceActivitySummary>(`/space/${id}/activity-summary`);

  return res.data;
}

export async function updateSpace(id: string, body: UpdateSpaceParams) {
  const res = await client.put(`/space/${id}`, body);

  return res.data;
}

export async function forceCreateCard(spaceId: string) {
  const res = await client.post(`/space/${spaceId}/force-card`);

  return res.data;
}
