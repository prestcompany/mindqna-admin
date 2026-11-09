import type { SvgData, SvgNode } from './slots-from-svg';

const MAX_BYTES = 1_048_576;
const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';
const NOT_SVG = 'SVG 파일이 아닙니다';
/** 이 안의 요소는 그 자리에 그려지지 않는다. 중첩 svg 는 좌표계가 따로라 같이 거절한다. */
const NON_RENDERED = ['defs', 'symbol', 'mask', 'clipPath', 'pattern', 'marker', 'svg'];

/** 추출 전 파일 확인. 거절 메시지, 아니면 null. */
export function checkSvgText(size: number, text: string): string | null {
  if (size > MAX_BYTES) return '칸 레이어만 켜고 다시 내보내 주세요';
  if (/<!(DOCTYPE|ENTITY)/i.test(text))
    return 'DOCTYPE·ENTITY 가 든 SVG 는 읽지 않습니다. 피그마에서 다시 내보내 주세요';
  return null;
}

type Walk = { transforms: string[]; nonRendered: boolean; styleTransform: boolean; ids: string[] };

/**
 * 브라우저 전용. DOMParser 로 읽기만 하고 화면에 넣지 않는다.
 * id 가 slot 으로 시작하는 요소를 모아 slotsFromSvg 가 Node 에서 계산하게 넘긴다.
 */
export function extractSvg(text: string): SvgData | { error: string } {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  if (doc.getElementsByTagName('parsererror').length) return { error: NOT_SVG };
  const root = doc.documentElement;
  if (root.namespaceURI !== SVG_NS || root.localName !== 'svg') return { error: NOT_SVG };

  const used: Record<string, true> = {};
  const uses = doc.getElementsByTagNameNS(SVG_NS, 'use');
  for (let i = 0; i < uses.length; i++) {
    const href = uses[i].getAttribute('href') ?? uses[i].getAttributeNS(XLINK_NS, 'href') ?? '';
    if (href.charAt(0) === '#') used[href.slice(1)] = true;
  }

  const nodes: SvgNode[] = [];
  const visit = (el: Element, walk: Walk) => {
    for (let i = 0; i < el.children.length; i++) {
      const child = el.children[i];
      const isSvg = child.namespaceURI === SVG_NS;
      const tag = isSvg ? child.localName : `${child.namespaceURI}:${child.localName}`;
      const transform = child.getAttribute('transform');
      const id = child.getAttribute('id') ?? '';
      const here: Walk = {
        transforms: transform ? walk.transforms.concat(transform) : walk.transforms,
        nonRendered: walk.nonRendered,
        styleTransform: walk.styleTransform,
        ids: id ? walk.ids.concat(id) : walk.ids,
      };

      if (/^slot/i.test(id)) {
        const attrs: Record<string, string> = {};
        for (let j = 0; j < child.attributes.length; j++) attrs[child.attributes[j].name] = child.attributes[j].value;
        nodes.push({
          id,
          tag,
          attrs,
          ancestorTransforms: here.transforms,
          ancestorStyleTransform: walk.styleTransform,
          inNonRendered: walk.nonRendered,
          // 칸을 품은 조상을 <use> 가 가리켜도 칸이 두 번 그려진다.
          usedByUse: here.ids.some((x) => used[x]),
        });
      }

      visit(child, {
        ...here,
        nonRendered: walk.nonRendered || (isSvg && NON_RENDERED.indexOf(child.localName) >= 0),
        styleTransform:
          walk.styleTransform ||
          /transform/i.test(child.getAttribute('style') ?? '') ||
          child.hasAttribute('transform-origin'),
      });
    }
  };
  visit(root, { transforms: [], nonRendered: false, styleTransform: false, ids: [] });

  return {
    root: {
      viewBox: root.getAttribute('viewBox'),
      width: root.getAttribute('width'),
      height: root.getAttribute('height'),
    },
    nodes,
  };
}
