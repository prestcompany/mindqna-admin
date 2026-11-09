import type { ImgItem, InteriorTemplate, PhotoAssetRef, PhotoFeatureConfig, PhotoSlot } from '@/client/types';
import { readImageSize } from '@/lib/image-size';
import { useEffect, useMemo, useRef, useState } from 'react';
import { photoWarnings } from './preview-math';

type Size = { width: number; height: number };

/** 그림 원본 크기. uri 가 바뀌면 새로 읽고, 다 읽기 전이나 못 읽으면 null 이다. */
function useImageSize(uri: string | null | undefined): Size | null {
  const [read, setRead] = useState<{ uri: string; size: Size | null } | null>(null);
  useEffect(() => {
    if (!uri) return;
    let alive = true;
    readImageSize(uri)
      .then((size) => alive && setRead({ uri, size }))
      .catch(() => alive && setRead({ uri, size: null }));
    return () => {
      alive = false;
    };
  }, [uri]);
  return uri && read?.uri === uri ? read.size : null;
}

/**
 * 사진 가구 편집 상태. InteriorForm 이 들고 자식 컴포넌트는 props 로만 받는다.
 * 폼은 그림 고르기 화면으로 바뀔 때 본문을 통째로 내리므로, 자식에 둔 상태는 사라진다.
 */
export function usePhotoDraft(init: InteriorTemplate | undefined, representativeUri: string | undefined) {
  // 손으로 고친 설정(slots 가 배열이 아님)은 서버도 baseUri 를 null 로 준다. 저장된 값이 없는 것처럼 다룬다.
  const config = init?.feature === 'photo' ? init.featureConfig : null;
  const saved = config && Array.isArray(config.slots) ? config : null;

  const [base, setBaseRef] = useState<PhotoAssetRef | null>(
    saved ? { id: saved.baseImgId, uri: init?.baseUri ?? null } : null,
  );
  const [overlay, setOverlayRef] = useState<PhotoAssetRef | null>(
    saved?.overlayImgId !== undefined ? { id: saved.overlayImgId, uri: init?.overlayUri ?? null } : null,
  );
  // 수정 화면은 저장된 크기를 쓴다. 바닥 그림을 새로 고를 때만 다시 읽는다.
  const [baseSize, setBaseSize] = useState<Size | null>(
    saved ? { width: saved.imgWidth, height: saved.imgHeight } : null,
  );
  const [baseSizeError, setBaseSizeError] = useState(false);
  const [slots, setSlots] = useState<PhotoSlot[]>(saved?.slots ?? []);
  const [selectedKey, setSelectedKey] = useState<string | null>(saved?.slots[0]?.key ?? null);
  /**
   * 칸이 맞춰진 바닥 그림 크기. 칸 SVG 를 불러오면 그때 크기, 수정 화면이면 저장된 크기다.
   * 그 뒤 바닥을 바꿔 비율이 달라지면 다시 불러오라고 알린다.
   */
  const [importedFor, setImportedFor] = useState<Size | null>(
    saved?.slots.length ? { width: saved.imgWidth, height: saved.imgHeight } : null,
  );
  /** 바닥 그림을 연달아 고르면 늦게 끝난 앞 그림의 크기가 덮어쓰지 않게 마지막 요청만 받는다. */
  const baseRequest = useRef(0);

  const savedKeys = useMemo(() => saved?.slots.map((s) => s.key) ?? [], [saved]);
  const purchasedCount = init?.purchasedCount ?? 0;

  const representativeSize = useImageSize(representativeUri);
  const overlaySize = useImageSize(overlay?.uri);

  const pickBase = (img: ImgItem) => {
    const request = ++baseRequest.current;
    setBaseRef({ id: img.id, uri: img.uri });
    setBaseSize(null);
    setBaseSizeError(false);
    readImageSize(img.uri)
      .then((size) => request === baseRequest.current && setBaseSize(size))
      .catch(() => request === baseRequest.current && setBaseSizeError(true));
  };

  const pickOverlay = (img: ImgItem | null) => {
    setOverlayRef(img ? { id: img.id, uri: img.uri } : null);
  };

  const importSlots = (next: PhotoSlot[]) => {
    setSlots(next);
    setSelectedKey(next[0]?.key ?? null);
    setImportedFor(baseSize);
  };

  const warnings = photoWarnings({
    base: baseSize,
    representative: representativeSize,
    overlay: overlaySize,
    importedFor,
  });

  /** 저장할 설정. 바닥 그림이나 그 크기가 없으면 null(저장 전 photoConfigProblems 가 막는다). */
  const toConfig = (): PhotoFeatureConfig | null => {
    if (!base || !baseSize) return null;
    return {
      version: 1,
      baseImgId: base.id,
      imgWidth: baseSize.width,
      imgHeight: baseSize.height,
      ...(overlay ? { overlayImgId: overlay.id } : {}),
      slots,
    };
  };

  return {
    base,
    overlay,
    imgWidth: baseSize?.width ?? 0,
    imgHeight: baseSize?.height ?? 0,
    baseSizeError,
    slots,
    setSlots,
    selectedKey,
    setSelectedKey,
    savedKeys,
    purchasedCount,
    warnings,
    pickBase,
    pickOverlay,
    importSlots,
    toConfig,
  };
}

export type PhotoDraft = ReturnType<typeof usePhotoDraft>;
