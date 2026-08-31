export const USER_CODE_MIN_LENGTH = 8;
export const USER_CODE_ERROR_MESSAGE = '유효한 유저코드를 입력해주세요';
export const SAME_USER_CODE_ERROR_MESSAGE = '서로 다른 유저코드를 입력해주세요';

export function normalizeUserCode(value: string) {
  return value.trim();
}

export function isValidUserCode(value: string) {
  return normalizeUserCode(value).length >= USER_CODE_MIN_LENGTH;
}

export function areDifferentUserCodes(oldUserCode: string, newUserCode: string) {
  return normalizeUserCode(oldUserCode) !== normalizeUserCode(newUserCode);
}
