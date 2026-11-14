import type { ImgItem, InteriorTemplate, MessageFeatureConfig, PhotoAssetRef } from '@/client/types';
import { readImageSize } from '@/lib/image-size';
import { useRef, useState } from 'react';
import { MESSAGE_DEFAULT, messageConfigProblems, paperWarnings, readMessageConfig } from './message-rules';

type Size = { width: number; height: number };

/**
 * 쪽지 가구 편집 상태: 편지지 그림과 원본 크기, 최대 글자·줄. InteriorForm 이 든다(그림 고르기 화면으로 바뀌어도 남게).
 * 사진·칠판과 달리 바닥·덮개·칸이 없어 따로 둔다.
 */
export function useMessageDraft(init: InteriorTemplate | undefined) {
  const saved = readMessageConfig(init?.feature, init?.featureConfig);
  const [paper, setPaper] = useState<PhotoAssetRef | null>(
    saved ? { id: saved.paperImgId, uri: init?.paperUri ?? null } : null,
  );
  // 수정 화면은 저장된 크기를 쓴다. 편지지를 새로 고를 때만 다시 읽는다.
  const [paperSize, setPaperSize] = useState<Size | null>(
    saved ? { width: saved.paperWidth, height: saved.paperHeight } : null,
  );
  const [sizeError, setSizeError] = useState(false);
  const [maxLength, setMaxLength] = useState<number>(saved?.maxLength ?? MESSAGE_DEFAULT.maxLength);
  const [maxLines, setMaxLines] = useState<number>(saved?.maxLines ?? MESSAGE_DEFAULT.maxLines);
  // 빨리 두 번 고르면 먼저 고른 그림의 크기가 늦게 와도 덮지 않게 한다.
  const lastPick = useRef(0);

  const pickPaper = (img: ImgItem) => {
    const pick = ++lastPick.current;
    setPaper({ id: img.id, uri: img.uri });
    setPaperSize(null);
    setSizeError(false);
    readImageSize(img.uri)
      .then((size) => pick === lastPick.current && setPaperSize(size))
      .catch(() => pick === lastPick.current && setSizeError(true));
  };

  const problems = () =>
    messageConfigProblems({
      paper,
      paperWidth: paperSize?.width ?? 0,
      paperHeight: paperSize?.height ?? 0,
      maxLength,
      maxLines,
    });

  const toConfig = (): MessageFeatureConfig | null =>
    paper && paperSize
      ? {
          version: 1,
          paperImgId: paper.id,
          paperWidth: paperSize.width,
          paperHeight: paperSize.height,
          maxLength,
          maxLines,
        }
      : null;

  return {
    paper,
    paperSize,
    sizeError,
    maxLength,
    maxLines,
    warnings: paperWarnings(paperSize),
    pickPaper,
    setMaxLength,
    setMaxLines,
    problems,
    toConfig,
  };
}

export type MessageDraft = ReturnType<typeof useMessageDraft>;
