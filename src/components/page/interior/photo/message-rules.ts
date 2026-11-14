import type { InteriorFeature, MessageFeatureConfig, PhotoAssetRef } from '@/client/types';
import { exampleText } from './board-text';
import { ratioDiff } from './template-rules';

export const MESSAGE_DEFAULT = { maxLength: 80, maxLines: 7 } as const;

/** 피그마 편지지(`6107:65763`) 300×356 기준. 앱 읽기 화면과 같은 값이다. */
const PAPER = { width: 300, height: 356 };
const RATIO_TOLERANCE = 0.05;
/** 본문 글자 크기(300 너비 기준). 앱은 언어별로 다르고 어드민은 그 밖의 언어 값을 쓴다. */
const FONT_SIZE = 25;
export const MESSAGE_LINE_HEIGHT = 1.3;
const SAMPLE = '가나다라마';

type Size = { width: number; height: number };
type Box = { x: number; y: number; width: number; height: number };

/** 300×356 편지지의 글 상자(px). 본문은 가로·세로 가운데, 서명은 본문 아래 12px 에 한 줄. */
const TEXT_PX: Box = { x: 25.5, y: 40, width: 249, height: 240 };
const SIGN_PX: Box = { x: 25.5, y: 292, width: 249, height: 32 };

const ratioOf = (b: Box): Box => ({
  x: b.x / PAPER.width,
  y: b.y / PAPER.height,
  width: b.width / PAPER.width,
  height: b.height / PAPER.height,
});

/** 편지지 대비 글 상자(0–1). */
export const MESSAGE_LAYOUT = { text: ratioOf(TEXT_PX), sign: ratioOf(SIGN_PX) };

/** 편지지 원본 px 로 바꾼 글 상자·서명 상자와 글자 크기. */
export function messageLayout(paper: Size): { text: Box; sign: Box; fontSize: number } {
  const sx = paper.width / PAPER.width;
  const sy = paper.height / PAPER.height;
  const scale = (b: Box): Box => ({ x: b.x * sx, y: b.y * sy, width: b.width * sx, height: b.height * sy });
  return { text: scale(TEXT_PX), sign: scale(SIGN_PX), fontSize: FONT_SIZE * sx };
}

const isIntIn = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;

/** 서버 쪽지 설정 검사와 같은 규칙. */
export function messageConfigProblems(draft: {
  paper: PhotoAssetRef | null;
  paperWidth: number;
  paperHeight: number;
  maxLength: number;
  maxLines: number;
}): string[] {
  const problems: string[] = [];
  if (!draft.paper) problems.push('편지지 그림을 고르세요.');
  else if (draft.paper.uri === null) problems.push('편지지 그림을 다시 고르세요.');
  else if (!(draft.paperWidth > 0 && draft.paperHeight > 0)) problems.push('편지지 그림 크기를 읽지 못했습니다.');
  if (!isIntIn(draft.maxLength, 1, 200)) problems.push('최대 글자 수는 1–200 정수여야 합니다');
  if (!isIntIn(draft.maxLines, 1, 20)) problems.push('최대 줄 수는 1–20 정수여야 합니다');
  return problems;
}

/** 편지지가 300:356 에서 5% 넘게 벗어나면 앱 읽기 화면에서 글 상자가 그림과 어긋난다. */
export function paperWarnings(size: Size | null): string[] {
  if (!size || !(size.width > 0 && size.height > 0)) return [];
  const diff = ratioDiff(size, PAPER);
  if (diff <= RATIO_TOLERANCE) return [];
  return [`편지지 비율이 300:356 과 ${Math.round(diff * 100)}% 다릅니다. 앱에서 글 자리가 그림과 어긋날 수 있습니다.`];
}

/** "가나다라마" 를 이어 최대 글자 수만큼, 최대 줄 수로 고르게 나눈 예시 글. */
export function exampleMessage(maxLength: number, maxLines: number): string {
  return exampleText(maxLength, maxLines, SAMPLE);
}

/** 최대 글자·줄 입력. 정수로 반올림해 범위 안에 넣는다. 숫자가 아니면 null(입력을 되돌린다). */
export function parseMessageNumber(raw: string, min: number, max: number): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

const isPositive = (n: unknown): n is number => typeof n === 'number' && n > 0;

/** 저장된 쪽지 설정. 손으로 고쳐 편지지 id·크기가 빠졌으면 없는 것처럼 다룬다(미리보기가 NaN 으로 그리지 않게). */
export function readMessageConfig(feature: InteriorFeature | undefined, config: unknown): MessageFeatureConfig | null {
  if (feature !== 'message' || !config || typeof config !== 'object') return null;
  const c = config as Partial<MessageFeatureConfig>;
  return typeof c.paperImgId === 'number' && isPositive(c.paperWidth) && isPositive(c.paperHeight)
    ? (c as MessageFeatureConfig)
    : null;
}
