import client from './@base';
import { Locale, Profile, QueryResultWithPagination, Space } from './types';

export async function getGames(page: number) {
  const res = await client.get<QueryResultWithPagination<Game>>('/games', { params: { page } });

  return res.data;
}

export async function createGame(params: GameCreateParams) {
  const { ...body } = params;

  console.log('body', body);
  const res = await client.post('/games', body);

  return res.data;
}

export async function updateGame(params: GameUpdateParams) {
  const { id, ...body } = params;

  const res = await client.put(`/games/${id}`, body);

  return res.data;
}

export async function removeGame(id: number) {
  const res = await client.delete(`/games/${id}`);

  return res.data;
}

export async function getGameRankings(page: number) {
  const res = await client.get<QueryResultWithPagination<GameRanking>>(`/games/rankings`, {
    params: { page },
  });

  return res.data;
}

export async function getGamePlays(page: number) {
  const res = await client.get<QueryResultWithPagination<GamePlay>>(`/games/plays`, {
    params: { page },
  });

  return res.data;
}

export async function getGamePlayLogs(gameId: number, page: number) {
  const res = await client.get<QueryResultWithPagination<GamePlayLog>>(`/games/${gameId}/play-logs`, {
    params: { page },
  });

  return res.data;
}

export async function getGameRewards(page: number) {
  const res = await client.get<QueryResultWithPagination<GameReward>>(`/games/rewards`, {
    params: { page },
  });

  return res.data;
}

export async function getGameRewardPolicies(page: number) {
  const res = await client.get<QueryResultWithPagination<GameRewardPolicy>>(`/games/reward-policies`, {
    params: { page },
  });

  return res.data;
}

export async function createGameRewardForTest() {
  const res = await client.post('/games/test/reward');

  return res.data;
}

export enum GamePlayStatus {
  STARTED = 'STARTED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED',
  ERROR = 'ERROR',
}

export enum RankingType {
  INDIVIDUAL = 'INDIVIDUAL',
  TOTAL = 'TOTAL',
  EVENT = 'EVENT',
  SEASONAL = 'SEASONAL',
}

export enum RankingPeriodType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum RewardPeriodType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  SEASONAL = 'SEASONAL',
  EVENT = 'EVENT',
  ALWAYS = 'ALWAYS',
}

export enum RewardType {
  RANK = 'RANK',
  ACHIEVEMENT = 'ACHIEVEMENT',
  PARTICIPATION = 'PARTICIPATION',
  CONSECUTIVE = 'CONSECUTIVE',
  MILESTONE = 'MILESTONE',
  SPECIAL = 'SPECIAL',
}

// Interfaces
export interface Game {
  id: number;
  type: GameType;
  name: string;
  bgmUrl?: string | null;
  isActive: boolean;
  playLimitLife: number;
  timeLimitSecond: number;
  dailyPlayLimit: number;
  ticketRechargeHeart: number;
  ticketRechargeStar: number;
  stageScore: number;
  backgroundColor: string; // background color: 전체 배경 및 필터 텍스트
  primaryKeyColor: string; // key color 1: 메인 버튼 색상
  secondaryKeyColor: string; // key color 2: 버튼 강조, 타이틀 스트로크, 랭킹 내역
  primaryAccentColor: string; // point color 1: 타이머 박스, 점수 내역 스트로크
  secondaryAccentColor: string; // point color 2: 점수 내역 그림자
  headerTextColor: string; // text color: 랭킹 헤더 및 필터
  createdAt: Date;
  updatedAt: Date;
  gamePlays?: GamePlay[];
  gamePlayLogs?: GamePlayLog[];
  gameTicketHistories?: GameTicketHistory[];
  gameRankings?: GameRanking[];
  gameRewardPolicies?: GameRewardPolicy[];
  gameRewards?: GameReward[];
  images?: GameImgItem[];
  currentRanking?: GameRanking;
}

export interface GamePlay {
  id: number;
  gameId: number;
  profileId: string;
  spaceId: string;
  score: number;
  startedAt: Date;
  endedAt?: Date | null;
  updatedAt: Date;
  createdAt: Date;
  game?: Game;
  profile?: Profile;
  space?: Space;
  playLogs?: GamePlayLog[];
}

export interface GamePlayLog {
  id: number;
  gameId: number;
  gamePlayId: number;
  profileId: string;
  spaceId: string;
  status: GamePlayStatus;
  clientInfo?: string | null;
  message?: string | null;
  createdAt: Date;
  updatedAt: Date;
  gamePlay: GamePlay;
  game: Game;
}

export interface GameTicketHistory {
  id: number;
  gameId: number;
  profileId: string;
  spaceId: string;
  ticketDate: Date;
  playCount: number;
  rechargedCount: number;
  lastRechargedAt?: Date | null;
  createdAt: Date;
  game: Game;
}

export interface GameRanking {
  id: number;
  gameId?: number | null;
  rankingType: RankingType;
  periodType: RankingPeriodType;
  profileId: string;
  spaceId: string;
  score: number;
  rank: number;
  week?: number | null;
  month?: number | null;
  year: number;
  createdAt: Date;
  updatedAt: Date;
  game?: Game | null;
  profile?: Profile;
  space?: Space;
}

export interface GameRewardPolicy {
  id: number;
  gameId: number;
  rewardType: RewardType;
  periodType: RewardPeriodType;
  condition: any; // JSON type
  hearts: number;
  isActive: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  game: Game;
}

export type GameRewardCondition = { rank: number; score: number };

export interface GameReward {
  id: number;
  year: number;
  month: number;
  week: number;
  rewardType: RewardType;
  periodType: RewardPeriodType;
  condition: GameRewardCondition; // JSON type
  heartsEarned: number;
  createdAt: Date;
  gameId: number;
  profileId: string;
  spaceId: string;
  game: Game;
  profile: Profile;
  space: Space;
}

export interface ImgItem {
  id: number;
  locale: Locale;
  type: ImgType;
  uri: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum ImgType {
  asset = 'asset',
  data = 'data',
  game = 'game',
}

export enum GameType {
  SPEED_MATH = 'SPEED_MATH', // 사칙연산 빨리하기
  MEMORY_TAP = 'MEMORY_TAP', // 기억하고 누르기
  SEQUENCE_TAP = 'SEQUENCE_TAP', // 따라 누르기
  SEQUENCE_TAP_2 = 'SEQUENCE_TAP_2', // 따라 누르기 2
  SWIPE_MATCH = 'SWIPE_MATCH', // 문지르기 (스와이프 동작을 이용한 게임)
  DODGE_AND_COLLECT = 'DODGE_AND_COLLECT', // 물건 피하고 재화 받기
  ETC = 'ETC',
}

export interface GameCreateParams {
  name: string;
  type: GameType;
  bgmUrl?: string | null;
  isActive?: boolean;
  playLimitLife?: number;
  timeLimitSecond?: number;
  dailyPlayLimit?: number;
  ticketRechargeHeart?: number;
  ticketRechargeStar?: number;
  stageScore?: number;
  backgroundColor?: string;
  primaryKeyColor?: string;
  secondaryKeyColor?: string;
  primaryAccentColor?: string;
  secondaryAccentColor?: string;
  headerTextColor?: string;
  images?: GameImgItem[];
}

export type GameUpdateParams = Partial<GameCreateParams> & { id: number };

interface GameImgItem {
  type: 'game';
  locale: Locale;
  uri: string;
  name: string;
}
