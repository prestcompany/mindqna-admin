import { LibrarySubType } from '@/client/square-library';

export const subCategoryOptions = {
  info: [
    { label: '테스트', value: 'test' },
    { label: '이벤트 종료', value: 'eventend' },
    { label: '이벤트 진행중', value: 'eventing' },
    { label: '이벤트 예정', value: 'eventplan' },
    { label: '특별한 기능', value: 'special' },
  ],
  article: [
    { label: '혼자', value: 'alone' },
    { label: '친구', value: 'friend' },
    { label: '가족', value: 'family' },
    { label: '연인', value: 'couple' },
  ],
};

export const LibraryMap: Record<LibrarySubType, string> = {
  [LibrarySubType.TEST]: '테스트',
  [LibrarySubType.EVENTEND]: '이벤트 종료',
  [LibrarySubType.EVENTING]: '이벤트 진행중',
  [LibrarySubType.EVENTPLAN]: '이벤트 예정',
  [LibrarySubType.SPECIAL]: '특별한 기능',
  [LibrarySubType.ALONE]: '혼자',
  [LibrarySubType.FRIEND]: '친구',
  [LibrarySubType.FAMILY]: '가족',
  [LibrarySubType.COUPLE]: '연인',
};
