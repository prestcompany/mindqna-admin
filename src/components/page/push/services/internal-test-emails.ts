/**
 * The team that checks a push before anyone else gets it.
 *
 * Prefilled into the 내부 테스트 field so the common case is no typing at all: open the
 * panel, confirm the resolution, send. The field stays editable — this is a starting point,
 * not a restriction.
 *
 * One address is not one person. Each of these fronts a SocialAccount, and several carry
 * more than one: a colleague signed in with Google on one phone and Kakao on another is two
 * accounts with two devices, and the resolver returns both on purpose. Measured against real
 * data these five resolved to ten accounts in dev and six in production, so the number beside
 * the send button will not match the number of lines here, and should not.
 *
 * Editing this list means a deploy. That is deliberate for now — five addresses that change
 * once a quarter do not earn a table and a management screen. If it starts changing weekly,
 * move it to the server and give it a UI rather than growing this file.
 */
export const INTERNAL_TEST_EMAILS = [
  'smej201@gmail.com',
  'sujin971220@gmail.com',
  'betty112112@naver.com',
  'hanjune.dev@gmail.com',
  'gargoyle@kakao.com',
];

export const INTERNAL_TEST_EMAILS_TEXT = INTERNAL_TEST_EMAILS.join('\n');
