import { useEffect, useState } from 'react';
import type { Measure } from './board-text';

/**
 * el 의 글꼴(weight 굵기)로 글 너비를 잰다. 글꼴을 다 받은 뒤에 만들어 받기 전 글꼴로 잘못 재지 않는다.
 * 칠판은 Bold(700), 쪽지 편지지는 보통(400).
 */
export function useMeasure(el: HTMLElement | null, weight: number): Measure | null {
  const [measure, setMeasure] = useState<Measure | null>(null);
  useEffect(() => {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!el || !ctx) return;
    let alive = true;
    const family = getComputedStyle(el).fontFamily;
    // 이 굵기를 아직 아무도 쓰지 않았으면 ready 가 받기 전에 끝난다. 잴 글꼴을 먼저 받는다.
    void document.fonts.load(`${weight} 16px ${family}`, '가A').then(() => {
      if (!alive) return;
      setMeasure(() => (text: string, size: number) => {
        ctx.font = `${weight} ${size}px ${family}`;
        return ctx.measureText(text).width;
      });
    });
    return () => {
      alive = false;
    };
  }, [el, weight]);
  return measure;
}
