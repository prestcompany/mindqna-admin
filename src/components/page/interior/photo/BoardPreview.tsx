import type { BoardSlot } from '@/client/types';
import { useState } from 'react';
import { LINE_HEIGHT } from './board-rules';
import { exampleText, fitText } from './board-text';
import { containRect, FURNITURE_CELL } from './preview-math';
import { useMeasure } from './useMeasure';

type BoardPreviewProps = {
  /** 템플릿의 가구 칸 수(width × height). */
  cells: { width: number; height: number };
  imgWidth: number;
  imgHeight: number;
  baseUri: string;
  overlayUri?: string | null;
  slots: BoardSlot[];
};

/**
 * 앱과 같은 순서·규칙으로 그린다: 가구 칸 상자 → 바닥 그림 비율의 프레임(contain) → 바닥 그림 → 글 → 덮개 그림.
 * 글은 칸마다 "가나다라마바사" 를 최대 글자·줄까지 채운 예시다. 줄 높이 ×1.25, 세로 가운데, 넘치면 줄이고 0.5 배에서도 넘치면 칸 높이에 들어가는 줄에서 "…", 칸 밖은 자른다.
 */
function BoardPreview({ cells, imgWidth, imgHeight, baseUri, overlayUri, slots }: BoardPreviewProps) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const measure = useMeasure(root, 700);
  const box = { w: cells.width * FURNITURE_CELL.w, h: cells.height * FURNITURE_CELL.h };
  const frame = containRect(box, { w: imgWidth, h: imgHeight });
  const scale = frame.w / imgWidth;

  return (
    <div className='space-y-2'>
      <div
        ref={setRoot}
        // 테두리는 outline 으로 그려 상자 크기(360px 기준)에 더해지지 않게 한다.
        className='relative rounded-md bg-canvas outline-dashed outline-1 outline-border'
        style={{ width: box.w, height: box.h }}
        aria-label='가구 미리보기'
        role='img'
      >
        <div className='absolute' style={{ left: frame.x, top: frame.y, width: frame.w, height: frame.h }}>
          <img src={baseUri} alt='' className='absolute inset-0 h-full w-full' />
          {measure
            ? slots.map((slot) => {
                const w = slot.width * frame.w;
                const h = slot.height * frame.h;
                const fit = fitText({
                  text: exampleText(slot.maxLength, slot.maxLines),
                  fontSize: slot.fontSize * scale,
                  width: w,
                  height: h,
                  maxLines: slot.maxLines,
                  measure,
                });
                return (
                  <div
                    key={slot.key}
                    className='absolute flex flex-col justify-center overflow-hidden whitespace-pre font-bold'
                    style={{
                      left: slot.x * frame.w,
                      top: slot.y * frame.h,
                      width: w,
                      height: h,
                      transform: `rotate(${slot.rotation ?? 0}deg)`,
                      color: slot.color,
                      fontSize: fit.fontSize,
                      lineHeight: `${fit.fontSize * LINE_HEIGHT}px`,
                      textAlign: slot.align ?? 'center',
                    }}
                  >
                    {fit.lines.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                );
              })
            : null}
          {overlayUri ? <img src={overlayUri} alt='' className='absolute inset-0 h-full w-full' /> : null}
        </div>
      </div>
      <p className='text-xs text-muted-foreground'>
        앱 화면 너비 360px 기준 크기입니다. 넘치는 글은 앱처럼 줄여 그립니다.
      </p>
    </div>
  );
}

export default BoardPreview;
