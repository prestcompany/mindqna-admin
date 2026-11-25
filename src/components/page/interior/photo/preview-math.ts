import { ratioDiff } from './template-rules';

/** 앱의 가구 칸 하나: 360px 화면 너비의 1/7, 높이는 그 1/1.5. */
export const FURNITURE_CELL = { w: 360 / 7, h: 360 / 7 / 1.5 };

type Box = { w: number; h: number };

/** 상자 안에 그림 비율의 프레임을 contain 으로 가운데 놓은 자리. */
export function containRect(box: Box, img: Box): { x: number; y: number; w: number; h: number } {
  const scale = Math.min(box.w / img.w, box.h / img.h);
  const w = img.w * scale;
  const h = img.h * scale;
  return { x: (box.w - w) / 2, y: (box.h - h) / 2, w, h };
}

type Size = { width: number; height: number };

/** 사진 가구 그림 경고. 바닥 그림 크기를 모르면 아무것도 비교하지 않는다. */
export function photoWarnings(input: {
  base: Size | null;
  representative?: Size | null;
  overlay?: Size | null;
  importedFor?: Size | null;
}): string[] {
  const { base, representative, overlay, importedFor } = input;
  if (!base) return [];
  const warnings: string[] = [];
  if (representative && ratioDiff(representative, base) > 0.01) {
    warnings.push('대표 그림과 바닥 그림의 비율이 다릅니다. 토글을 켜고 끌 때 가구 모양이 바뀝니다.');
  }
  if (overlay && (overlay.width !== base.width || overlay.height !== base.height)) {
    warnings.push(
      `덮개 그림 크기(${overlay.width}×${overlay.height})가 바닥 그림(${base.width}×${base.height})과 다릅니다.`,
    );
  }
  if (importedFor && ratioDiff(importedFor, base) > 0.01) {
    warnings.push('바닥 그림 비율이 바뀌었습니다. 칸 SVG 를 다시 불러오세요.');
  }
  return warnings;
}
