import client from './@base';
import { Locale } from './types';

export async function getSquareLibrary(category: string, page: number, subCategory?: LibrarySubType, locale?: Locale) {
  const res = await client.get<GetSquareLibrary>(`/square-library/${category}`, {
    params: { page, subCategory, locale },
  });
  return res.data;
}
export async function createSquareLibrary(body: LibraryData) {
  const res = await client.post('/square-library', body);

  return res.data;
}

export async function updateSquareLibrary(id: number, body: UpdatedLibraryData) {
  const res = await client.put(`/square-library/${id}`, body);

  return res.data;
}

export async function deleteSquareLibrary(id: number) {
  const res = await client.delete(`/square-library/${id}`);

  return res.data;
}

export type GetSquareLibrary = {
  data: LibraryData[];
  pageInfo: number;
};

export type LibraryData = {
  id?: number;
  name: string;
  img: string;
  category: LibraryType;
  subCategory: LibrarySubType;
  title: string;
  content?: string;
  link: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  isFixed: boolean;
  locale: Locale;
  clickCount?: number;
  viewCount?: number;
};

export type UpdatedLibraryData = Partial<LibraryData>;

export enum LibraryType {
  INFO = 'info',
  ARTICLE = 'article',
}

export enum LibrarySubType {
  TEST = 'test',
  EVENTEND = 'eventend',
  EVENTING = 'eventing',
  EVENTPLAN = 'eventplan',
  SPECIAL = 'special',
  ALONE = 'alone',
  FRIEND = 'friend',
  FAMILY = 'family',
  COUPLE = 'couple',
}
