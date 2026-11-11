import type {
  CreateInteriorTemplateParams,
  InteriorFeature,
  InteriorTemplateType,
  PhotoFeatureConfig,
} from '@/client/types';

export const FEATURE_LABEL: Record<InteriorFeature, string> = {
  none: '없음',
  photo: '사진',
  board: '칠판',
  message: '쪽지',
};

/** 지금 고를 수 있는 기능. 칠판·쪽지는 보이되 고르지 못한다. */
export const OPEN_FEATURES: InteriorFeature[] = ['none', 'photo'];

/** 가구 목록 탭. 고를 수 있는 기능마다 하나씩, 주소의 ?feature= 로 남는다. */
export type FeatureTab = 'all' | 'none' | 'photo';
export const FEATURE_TABS: { value: FeatureTab; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'none', label: '일반 가구' },
  { value: 'photo', label: '사진 가구' },
];

export function featureTabFromQuery(value: unknown): FeatureTab {
  return value === 'none' || value === 'photo' ? value : 'all';
}

export function featureFilterOf(tab: FeatureTab): InteriorFeature[] | undefined {
  return tab === 'all' ? undefined : [tab];
}

/**
 * 기능 가구는 늘 소유가 있어야 내용을 저장할 수 있다(앱은 가격 0 인 item 을 사지 않고 놓는다).
 * 서버 checkFeatureTemplate 과 같은 규칙.
 */
export function featureTemplateProblems(input: {
  feature: InteriorFeature;
  type: InteriorTemplateType;
  price: number;
}): string[] {
  if (input.feature === 'none') return [];
  if (input.type !== 'item' && input.type !== 'event') return ['기능 가구는 아이템 또는 이벤트여야 합니다.'];
  if (input.type === 'item' && !(input.price > 0)) return ['기능 가구 아이템은 가격이 0 보다 커야 합니다.'];
  return [];
}

/**
 * 생성·수정 body 의 기능 필드.
 * 수정에서는 feature 를 보내지 않는다(서버가 바뀌면 400). 기능 없는 가구는 설정을 보내지 않아 서버가 그대로 둔다.
 */
export function toTemplateBody(input: {
  mode: 'create' | 'update';
  feature: InteriorFeature;
  config: PhotoFeatureConfig | null;
}): Pick<CreateInteriorTemplateParams, 'feature' | 'featureConfig'> {
  const body: Pick<CreateInteriorTemplateParams, 'feature' | 'featureConfig'> = {};
  if (input.mode === 'create') body.feature = input.feature;
  if (input.feature !== 'none' && input.config) body.featureConfig = input.config;
  return body;
}

type Size = { width: number; height: number };

/** 두 그림의 비율 차이. |(a.w/a.h) ÷ (b.w/b.h) − 1| */
export function ratioDiff(a: Size, b: Size): number {
  return Math.abs(a.width / a.height / (b.width / b.height) - 1);
}
