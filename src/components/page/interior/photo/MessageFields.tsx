import { DefinitionRow } from '@/components/shared/ui/definition-row';
import { Button } from '@/components/ui/button';
import { parseMessageNumber } from './message-rules';
import { ImageWarnings, Thumb } from './PhotoImagesField';
import SlotNumberInput from './SlotNumberInput';
import type { MessageDraft } from './useMessageDraft';

/** 편지지 그림(필수)과 최대 글자·줄. */
function MessageFields({ draft, onPick }: { draft: MessageDraft; onPick: () => void }) {
  const { paper, paperSize, sizeError, warnings } = draft;
  return (
    <>
      <DefinitionRow label='편지지 그림' required hint='쪽지를 열었을 때 글 뒤에 깔리는 그림입니다. 300×356 비율로 그립니다.'>
        <div className='flex flex-col items-start gap-2'>
          <Thumb uri={paper?.uri} alt='편지지 그림' />
          {paper && paper.uri === null ? <p className='text-sm text-destructive'>편지지 그림을 다시 고르세요.</p> : null}
          {sizeError ? <p className='text-sm text-destructive'>그림 크기를 읽지 못했습니다.</p> : null}
          {paperSize ? (
            <p className='text-xs text-muted-foreground tabular-nums'>
              원본 {paperSize.width}×{paperSize.height}px
            </p>
          ) : null}
          <Button type='button' variant='outline' size='sm' onClick={onPick}>
            {paper ? '편지지 그림 바꾸기' : '편지지 그림 고르기'}
          </Button>
        </div>
      </DefinitionRow>
      <ImageWarnings warnings={warnings} />
      <DefinitionRow label='글 제한' required hint='최대 글자 수 1–200(줄바꿈은 세지 않음), 최대 줄 수 1–20.'>
        <div className='grid grid-cols-2 gap-3 sm:max-w-[320px]'>
          <div className='space-y-1'>
            <label htmlFor='message-max-length' className='text-xs text-muted-foreground'>
              최대 글자 수
            </label>
            <SlotNumberInput
              id='message-max-length'
              value={draft.maxLength}
              parse={(raw) => parseMessageNumber(raw, 1, 200)}
              onCommit={draft.setMaxLength}
            />
          </div>
          <div className='space-y-1'>
            <label htmlFor='message-max-lines' className='text-xs text-muted-foreground'>
              최대 줄 수
            </label>
            <SlotNumberInput
              id='message-max-lines'
              value={draft.maxLines}
              parse={(raw) => parseMessageNumber(raw, 1, 20)}
              onCommit={draft.setMaxLines}
            />
          </div>
        </div>
      </DefinitionRow>
    </>
  );
}

export default MessageFields;
