import type { PhotoSlot } from '@/client/types';
import { Button } from '@/components/ui/button';
import { ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { containRect, FURNITURE_CELL } from './preview-math';

// 앱 색(MindBridge text20·text40). 칸 배경은 사진이 있어도 늘 깐다.
const SLOT_BACKGROUND = '#46382533';
const EMPTY_ICON_COLOR = '#46382566';
const EXAMPLE_PHOTO = 'linear-gradient(135deg, #d6d3d1 0%, #a8a29e 55%, #78716c 100%)';

type PhotoPreviewProps = {
  /** 템플릿의 가구 칸 수(width × height). */
  cells: { width: number; height: number };
  imgWidth: number;
  imgHeight: number;
  baseUri: string;
  overlayUri?: string | null;
  slots: PhotoSlot[];
};

/**
 * 앱과 같은 순서로 그린다(MindBridge FurniturePicture.tsx):
 * 가구 칸 상자 → 바닥 그림 비율의 프레임(contain) → 바닥 그림 → 칸 → 덮개 그림.
 */
function PhotoPreview({ cells, imgWidth, imgHeight, baseUri, overlayUri, slots }: PhotoPreviewProps) {
  const [example, setExample] = useState(true);
  const box = { w: cells.width * FURNITURE_CELL.w, h: cells.height * FURNITURE_CELL.h };
  const frame = containRect(box, { w: imgWidth, h: imgHeight });

  return (
    <div className='space-y-2'>
      <div className='flex gap-2' role='group' aria-label='미리보기 칸 내용'>
        <Button type='button' size='sm' variant={example ? 'default' : 'outline'} onClick={() => setExample(true)}>
          예시 사진
        </Button>
        <Button type='button' size='sm' variant={example ? 'outline' : 'default'} onClick={() => setExample(false)}>
          빈 칸
        </Button>
      </div>
      <div
        // 테두리는 outline 으로 그려 상자 크기(360px 기준)에 더해지지 않게 한다.
        className='relative rounded-md bg-canvas outline-dashed outline-1 outline-border'
        style={{ width: box.w, height: box.h }}
        aria-label='가구 미리보기'
        role='img'
      >
        <div className='absolute' style={{ left: frame.x, top: frame.y, width: frame.w, height: frame.h }}>
          <img src={baseUri} alt='' className='absolute inset-0 h-full w-full' />
          {slots.map((slot) => {
            const w = slot.width * frame.w;
            const h = slot.height * frame.h;
            const icon = Math.max(8, (Math.min(w, h) * 16) / 40);
            return (
              <div
                key={slot.key}
                className='absolute flex items-center justify-center overflow-hidden'
                style={{
                  left: slot.x * frame.w,
                  top: slot.y * frame.h,
                  width: w,
                  height: h,
                  transform: `rotate(${slot.rotation ?? 0}deg)`,
                  borderRadius: (slot.radius ?? 0) * w,
                  background: SLOT_BACKGROUND,
                }}
              >
                {example ? (
                  <div className='absolute inset-0' style={{ background: EXAMPLE_PHOTO, backgroundSize: 'cover' }} />
                ) : (
                  <ImageIcon style={{ width: icon, height: icon, color: EMPTY_ICON_COLOR }} aria-hidden='true' />
                )}
              </div>
            );
          })}
          {overlayUri ? <img src={overlayUri} alt='' className='absolute inset-0 h-full w-full' /> : null}
        </div>
      </div>
      <p className='text-xs text-muted-foreground'>앱 화면 너비 360px 기준 크기입니다.</p>
    </div>
  );
}

export default PhotoPreview;
