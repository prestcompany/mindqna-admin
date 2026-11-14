import type { PhotoSlot } from '@/client/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { FileUp } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { BOARD_MAX_SLOTS } from './board-rules';
import { checkSvgText, extractSvg } from './extract-svg';
import { type SlotChange, slotChanges, slotsFromSvg } from './slots-from-svg';
import type { PhotoDraft } from './usePhotoDraft';

const CHANGE_LABEL: Record<SlotChange['kind'], string> = {
  moved: '옮김',
  resized: '크기 바뀜',
  aspect: '비율이 10% 넘게 바뀜',
  added: '추가',
  removed: '빠짐',
};

type Pending = { slots: PhotoSlot[]; warnings: string[] };

type SvgSlotImportProps = { draft: PhotoDraft };

/**
 * 피그마에서 칸 자리를 네모로 그려 내보낸 SVG 를 읽어 칸을 채운다.
 * SVG 는 칸을 읽는 데만 쓴다. 화면에 넣지도, 저장하지도 않는다.
 */
function SvgSlotImport({ draft }: SvgSlotImportProps) {
  const input = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const ready = Boolean(draft.base?.uri) && draft.imgWidth > 0;

  const read = async (file: File) => {
    let text: string;
    try {
      text = await file.text();
    } catch {
      return setErrors(['SVG 파일이 아닙니다']);
    }
    const rejected = checkSvgText(file.size, text);
    if (rejected) return setErrors([rejected]);
    let data: ReturnType<typeof extractSvg>;
    try {
      data = extractSvg(text);
    } catch {
      return setErrors(['SVG 파일이 아닙니다']);
    }
    if ('error' in data) return setErrors([data.error]);
    // 산 공간 보호는 저장된 키 기준이다(서버가 비교하는 값). 편집 중에 더한 칸은 빠져도 된다.
    const result = slotsFromSvg(
      data,
      { imgWidth: draft.imgWidth, imgHeight: draft.imgHeight },
      draft.savedKeys,
      draft.purchasedCount,
      draft.kind === 'board' ? { maxSlots: BOARD_MAX_SLOTS, content: '글' } : undefined,
    );
    if (!result.ok) return setErrors(result.errors);
    if (draft.slots.length) setPending({ slots: result.slots, warnings: result.warnings });
    else apply({ slots: result.slots, warnings: result.warnings });
  };

  const apply = ({ slots, warnings }: Pending) => {
    draft.importSlots(slots);
    setPending(null);
    toast.success(`칸 ${slots.length}개를 불러왔습니다.`);
    for (const w of warnings) toast.warning(w);
  };

  const changes = pending ? slotChanges(draft.slots, pending.slots) : [];

  return (
    <div className='space-y-1'>
      <input
        ref={input}
        type='file'
        accept='.svg,image/svg+xml'
        className='sr-only'
        tabIndex={-1}
        aria-hidden='true'
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void read(file);
        }}
      />
      <Button type='button' size='sm' variant='outline' disabled={!ready} onClick={() => input.current?.click()}>
        <FileUp className='h-4 w-4' aria-hidden='true' />칸 SVG 불러오기
      </Button>
      {!ready ? <p className='text-xs text-muted-foreground'>바닥 그림을 먼저 고르세요.</p> : null}

      <AlertDialog open={errors !== null} onOpenChange={(open) => !open && setErrors(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>칸을 불러오지 못했습니다</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <ul className='max-h-64 space-y-1 overflow-y-auto text-sm text-foreground'>
                {(errors ?? []).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>지금 칸을 덮어쓸까요?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-3 text-sm text-foreground'>
                {changes.length ? (
                  <table className='w-full text-left'>
                    <thead>
                      <tr className='text-xs text-muted-foreground'>
                        <th className='py-1 font-medium'>칸</th>
                        <th className='py-1 font-medium'>변화</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changes.map((c) => (
                        <tr key={`${c.key}-${c.kind}`} className='border-t border-border'>
                          <td className='py-1'>{c.key}</td>
                          <td className='py-1'>{CHANGE_LABEL[c.kind]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>칸이 바뀌지 않습니다.</p>
                )}
                {pending?.warnings.length ? (
                  <ul className='space-y-0.5 text-warning-foreground'>
                    {pending.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => pending && apply(pending)}>덮어쓰기</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default SvgSlotImport;
