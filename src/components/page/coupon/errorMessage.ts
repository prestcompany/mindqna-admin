// NestJS BadRequestException serializes as { statusCode, message, error }, where
// `message` is a string or an array of strings. The backend returns several distinct,
// actionable Korean messages for coupon mutations (reward locked, capacity too low,
// duplicate code, etc.) — extract that message instead of stringifying the whole
// AxiosError, which collapses every rejection to the same opaque text.
export const errorMessage = (err: unknown): string => {
  const message = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
  return `${err}`;
};
