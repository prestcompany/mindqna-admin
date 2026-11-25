import { useState } from 'react';
import { fitText } from './board-text';
import { exampleMessage, MESSAGE_LINE_HEIGHT, messageLayout } from './message-rules';
import { useMeasure } from './useMeasure';

/** 피그마 편지지 너비. 이 크기로 그려 앱 읽기 화면과 같은 비율로 본다. */
const VIEW_WIDTH = 300;

type MessagePreviewProps = {
  paperUri: string;
  paperWidth: number;
  paperHeight: number;
  maxLength: number;
  maxLines: number;
};

/**
 * 앱 읽기 화면과 같은 자리에 그린다: 편지지 → 본문(가로·세로 가운데, 줄 높이 ×1.3, 넘치면 칠판처럼 줄이고 "…") → 서명 한 줄.
 * 글은 "가나다라마" 를 최대 글자·줄까지 채운 예시, 서명은 "- 이름 -".
 */
function MessagePreview({ paperUri, paperWidth, paperHeight, maxLength, maxLines }: MessagePreviewProps) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const measure = useMeasure(root, 400);
  const view = { width: VIEW_WIDTH, height: (VIEW_WIDTH * paperHeight) / paperWidth };
  const { text, sign, fontSize } = messageLayout(view);
  const fit = measure
    ? fitText({
        text: exampleMessage(maxLength, maxLines),
        fontSize,
        width: text.width,
        height: text.height,
        maxLines,
        measure,
        lineHeight: MESSAGE_LINE_HEIGHT,
      })
    : null;

  return (
    <div className='space-y-2'>
      <div
        ref={setRoot}
        className='relative rounded-md outline-dashed outline-1 outline-border'
        style={{ width: view.width, height: view.height }}
        aria-label='쪽지 미리보기'
        role='img'
      >
        <img src={paperUri} alt='' className='absolute inset-0 h-full w-full' />
        {fit ? (
          <div
            className='absolute flex flex-col justify-center overflow-hidden whitespace-pre text-center text-foreground'
            style={{
              left: text.x,
              top: text.y,
              width: text.width,
              height: text.height,
              fontSize: fit.fontSize,
              lineHeight: `${fit.fontSize * MESSAGE_LINE_HEIGHT}px`,
            }}
          >
            {fit.lines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        ) : null}
        <div
          className='absolute flex items-center justify-center text-foreground'
          style={{ left: sign.x, top: sign.y, width: sign.width, height: sign.height, fontSize }}
        >
          <span className='truncate'>- 이름 -</span>
        </div>
      </div>
      <p className='text-xs text-muted-foreground'>앱에서는 손글씨체로 보여요. 줄바꿈 위치가 다를 수 있어요.</p>
    </div>
  );
}

export default MessagePreview;
