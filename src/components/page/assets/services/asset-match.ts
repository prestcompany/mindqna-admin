type AssetLike = { id: number; uri: string };

/**
 * 고른 이미지가 라이브러리의 이 에셋인지.
 * 서버는 항목마다 에셋 uri 를 담은 자기 이미지 행을 따로 만든다(같은 에셋을 여러 곳에 써도 서로 빼앗지 않게).
 * 그래서 수정 화면의 현재 이미지는 id 가 라이브러리 행과 다를 수 있어, 같은 uri 면 같은 에셋으로 본다.
 */
export function isPickedAsset(selected: AssetLike | undefined, item: AssetLike): boolean {
  if (!selected) return false;
  return selected.id === item.id || (!!selected.uri && selected.uri === item.uri);
}
