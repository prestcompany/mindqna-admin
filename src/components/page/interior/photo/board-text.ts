import { LINE_HEIGHT } from './board-rules';

/** 글 너비(px). 브라우저에서는 canvas measureText 로 잰다. */
export type Measure = (text: string, fontSize: number) => number;

/** 앱 맞춤 규칙: 넘치면 0.9ⁿ 배로 줄여 다시 재고, 마지막 단계는 정확히 0.5. */
export const FIT_SCALES: number[] = (() => {
  const scales: number[] = [];
  for (let s = 1; s > 0.5; s *= 0.9) scales.push(s);
  return [...scales, 0.5];
})();

/** 판정 허용치(px). */
const TOLERANCE = 0.5;
const ELLIPSIS = '…';
const SAMPLE = '가나다라마바사';
/** 이 글자 앞뒤에서 줄을 바꿀 수 있다(한글·한자·가나). 그 밖에는 공백에서만 바꾼다. */
const CJK = /[ᄀ-ᇿ぀-ヿ㄰-㆏㐀-鿿가-힯豈-﫿]/;
/** 줄 첫머리에 오지 않는 닫는 문장부호. 앞 글자에 붙여 둔다. */
const NO_LINE_START = /[.,!?;:)\]}'"’”…。、！？）」』〉》]/;

/** sample(기본 "가나다라마바사")을 이어 최대 글자 수만큼, 최대 줄 수로 고르게 나눈 예시 글. 나머지는 앞줄부터 하나씩 더한다. */
export function exampleText(maxLength: number, maxLines: number, sample = SAMPLE): string {
  const count = Math.max(1, Math.min(maxLines, maxLength));
  const base = Math.floor(maxLength / count);
  const lines: string[] = [];
  let i = 0;
  for (let n = 0; n < count; n++) {
    let line = '';
    const size = base + (n < maxLength % count ? 1 : 0);
    for (let k = 0; k < size; k++, i++) line += sample[i % sample.length];
    lines.push(line);
  }
  return lines.join('\n');
}

/** 줄을 바꿀 수 있는 조각으로 나눈다. 공백은 앞 조각 끝에 붙인다. */
function chunks(paragraph: string): string[] {
  const out: string[] = [];
  let cur = '';
  const chars = Array.from(paragraph);
  chars.forEach((c, i) => {
    cur += c;
    const next = chars[i + 1];
    if (next === undefined || c === ' ' || CJK.test(c) || CJK.test(next)) {
      if (next === undefined || (next !== ' ' && !NO_LINE_START.test(next))) {
        out.push(cur);
        cur = '';
      }
    }
  });
  if (cur) out.push(cur);
  return out;
}

/** 한 조각이 줄보다 길면 글자로 쪼갠다. */
function breakChars(piece: string, width: number, size: number, measure: Measure): string[] {
  const out: string[] = [];
  let line = '';
  for (const c of Array.from(piece)) {
    if (line && measure(line + c, size) > width + TOLERANCE) {
      out.push(line);
      line = c;
    } else line += c;
  }
  return line ? [...out, line] : out;
}

/** 너비에 맞춰 줄을 나눈다. 줄 끝 공백은 너비에 넣지 않는다. */
export function wrapLines(text: string, width: number, size: number, measure: Measure): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const piece of chunks(paragraph)) {
      const joined = line + piece;
      if (measure(joined.trimEnd(), size) <= width + TOLERANCE) {
        line = joined;
        continue;
      }
      if (line) lines.push(line.trimEnd());
      const word = piece.trimEnd();
      const parts = breakChars(word, width, size, measure);
      // 쪼갠 마지막 조각 뒤 공백을 살려야 다음 낱말과 붙지 않는다.
      line = (parts.pop() ?? '') + piece.slice(word.length);
      lines.push(...parts);
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

export type FitResult = { fontSize: number; lines: string[]; truncated: boolean };

/**
 * 앱과 같은 규칙으로 칸에 글을 맞춘다: 줄 높이 = 글자 크기 × lineHeight(기본 1.25), 줄 수가 maxLines 를 넘거나 높이가 칸을 넘으면 줄인다.
 * 0.5 배에서도 넘치면 칸 높이에 들어가는 줄 수(최소 1, 최대 maxLines)에서 자르고 마지막 줄 끝에 "…".
 */
export function fitText(input: {
  text: string;
  fontSize: number;
  width: number;
  height: number;
  maxLines: number;
  measure: Measure;
  /** 줄 높이 = 글자 크기 × 이 값. 칠판 1.25, 쪽지 편지지 1.3. */
  lineHeight?: number;
}): FitResult {
  const { text, width, height, measure } = input;
  const lineHeight = input.lineHeight ?? LINE_HEIGHT;
  // 손으로 고친 설정의 0 줄에도 미리보기가 깨지지 않게 한다.
  const maxLines = Math.max(1, input.maxLines);
  let lines: string[] = [];
  let size = input.fontSize;
  for (const scale of FIT_SCALES) {
    size = input.fontSize * scale;
    lines = wrapLines(text, width, size, measure);
    const fits =
      lines.length <= maxLines &&
      lines.length * size * lineHeight <= height + TOLERANCE &&
      lines.every((l) => measure(l, size) <= width + TOLERANCE);
    if (fits) return { fontSize: size, lines, truncated: false };
  }
  // 앱 boardEllipsisLines 와 같다: 칸 높이에 들어가는 줄 수(최소 1)와 maxLines 중 작은 쪽까지 남긴다.
  const keep = Math.min(maxLines, Math.max(1, Math.floor((height + TOLERANCE) / (size * lineHeight))));
  if (lines.length <= keep) return { fontSize: size, lines, truncated: false };
  const kept = lines.slice(0, keep);
  let last = Array.from(kept[keep - 1]);
  while (last.length && measure(last.join('') + ELLIPSIS, size) > width + TOLERANCE) last = last.slice(0, -1);
  kept[keep - 1] = last.join('').trimEnd() + ELLIPSIS;
  return { fontSize: size, lines: kept, truncated: true };
}
