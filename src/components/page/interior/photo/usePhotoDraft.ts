import type { ImgItem, InteriorTemplate, PhotoAssetRef, PhotoFeatureConfig, PhotoSlot } from '@/client/types';
import { readImageSize } from '@/lib/image-size';
import { useEffect, useMemo, useState } from 'react';
import { photoWarnings } from './preview-math';

type Size = { width: number; height: number };

/**
 * 사진 가구 편집 상태. InteriorForm 이 들고 자식 컴포넌트는 props 로만 받는다.
 * 폼은 그림 고르기 화면으로 바뀔 때 본문을 통째로 내리므로, 자식에 둔 상태는 사라진다.
 */
export function usePhotoDraft(init: InteriorTemplate | undefined, representativeUri: string | undefined) {
  const saved = init?.feature === 'photo' ? (init.featureConfig ?? null) : null;

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
  const [overlaySize, setOverlaySize] = useState<Size | null>(null);
  const [representativeSize, setRepresentativeSize] = useState<Size | null>(null);
  const [slots, setSlots] = useState<PhotoSlot[]>(saved?.slots ?? []);
  const [selectedKey, setSelectedKey] = useState<string | null>(saved?.slots[0]?.key ?? null);
  /** 칸 SVG 를 불러온 때의 바닥 그림 크기. 그 뒤 비율이 바뀌면 다시 불러오라고 알린다. */
  const [importedFor, setImportedFor] = useState<Size | null>(null);

  const savedKeys = useMemo(() => saved?.slots.map((s) => s.key) ?? [], [saved]);
  const purchasedCount = init?.purchasedCount ?? 0;

  useEffect(() => {
    let alive = true;
    if (!representativeUri) return;
    readImageSize(representativeUri)
      .then((size) => alive && setRepresentativeSize(size))
      .catch(() => alive && setRepresentativeSize(null));
    return () => {
      alive = false;
    };
  }, [representativeUri]);

  useEffect(() => {
    let alive = true;
    if (!overlay?.uri) return;
    readImageSize(overlay.uri)
      .then((size) => alive && setOverlaySize(size))
      .catch(() => alive && setOverlaySize(null));
    return () => {
      alive = false;
    };
  }, [overlay?.uri]);

  const pickBase = (img: ImgItem) => {
    setBaseRef({ id: img.id, uri: img.uri });
    setBaseSize(null);
    setBaseSizeError(false);
    readImageSize(img.uri)
      .then(setBaseSize)
      .catch(() => setBaseSizeError(true));
  };

  const pickOverlay = (img: ImgItem | null) => {
    setOverlayRef(img ? { id: img.id, uri: img.uri } : null);
    if (!img) setOverlaySize(null);
  };

  const importSlots = (next: PhotoSlot[]) => {
    setSlots(next);
    setSelectedKey(next[0]?.key ?? null);
    setImportedFor(baseSize);
  };

  const warnings = photoWarnings({
    base: baseSize,
    representative: representativeSize,
    overlay: overlay ? overlaySize : null,
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
