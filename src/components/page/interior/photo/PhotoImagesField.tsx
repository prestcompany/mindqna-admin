import { DefinitionRow } from '@/components/shared/ui/definition-row';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ImageIcon } from 'lucide-react';
import type { PhotoDraft } from './usePhotoDraft';

type PhotoImagesFieldProps = {
  draft: PhotoDraft;
  onPick: (kind: 'base' | 'overlay') => void;
};

function Thumb({ uri, alt }: { uri: string | null | undefined; alt: string }) {
  return (
    <div className='flex h-[120px] w-[200px] items-center justify-center rounded-md border border-dashed border-border bg-transparent p-2'>
      {uri ? (
        <img src={uri} alt={alt} className='h-full w-full object-contain' />
      ) : (
        <ImageIcon className='h-6 w-6 text-faint' aria-hidden='true' />
      )}
    </div>
  );
}

/** 바닥 그림(필수)·덮개 그림(선택)과 그림 경고. */
function PhotoImagesField({ draft, onPick }: PhotoImagesFieldProps) {
  const { base, overlay, imgWidth, imgHeight, baseSizeError, warnings } = draft;
  const baseMissing = base !== null && base.uri === null;

  return (
    <>
      <DefinitionRow label='바닥 그림' required hint='칸 자리를 비운 그림입니다. 칸 좌표의 기준이 됩니다.'>
        <div className='flex flex-col items-start gap-2'>
          <Thumb uri={base?.uri} alt='바닥 그림' />
          {baseMissing ? <p className='text-sm text-destructive'>바닥 그림을 다시 고르세요.</p> : null}
          {baseSizeError ? <p className='text-sm text-destructive'>그림 크기를 읽지 못했습니다.</p> : null}
          {imgWidth > 0 ? (
            <p className='text-xs text-muted-foreground tabular-nums'>
              원본 {imgWidth}×{imgHeight}px
            </p>
          ) : null}
          <Button type='button' variant='outline' size='sm' onClick={() => onPick('base')}>
            {base ? '바닥 그림 바꾸기' : '바닥 그림 고르기'}
          </Button>
        </div>
      </DefinitionRow>

      <DefinitionRow
        label='덮개 그림'
        hint='칸 위에 오는 테이프·집게만 그린 그림입니다. 바닥 그림과 같은 크기여야 합니다.'
      >
        <div className='flex flex-col items-start gap-2'>
          {overlay ? <Thumb uri={overlay.uri} alt='덮개 그림' /> : null}
          <div className='flex gap-2'>
            <Button type='button' variant='outline' size='sm' onClick={() => onPick('overlay')}>
              {overlay ? '덮개 그림 바꾸기' : '덮개 그림 고르기'}
            </Button>
            {overlay ? (
              <Button type='button' variant='ghost' size='sm' onClick={() => draft.pickOverlay(null)}>
                덮개 빼기
              </Button>
            ) : null}
          </div>
        </div>
      </DefinitionRow>

      {warnings.length ? (
        <div className='px-6'>
          <ul
            role='status'
            className='space-y-1 rounded-lg border border-warning/35 bg-warning/15 px-4 py-3 text-sm text-warning-foreground'
          >
            {warnings.map((w) => (
              <li key={w} className='flex gap-2'>
                <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' aria-hidden='true' />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

export default PhotoImagesField;
