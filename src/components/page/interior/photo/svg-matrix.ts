/** SVG 행렬 [a, b, c, d, e, f]: x' = a·x + c·y + e, y' = b·x + d·y + f */
export type Matrix = [number, number, number, number, number, number];

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** m1·m2. 점에는 m2 가 먼저 적용된다. */
export function multiply(m1: Matrix, m2: Matrix): Matrix {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

export function apply(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const translate = (tx: number, ty: number): Matrix => [1, 0, 0, 1, tx, ty];

function toMatrix(name: string, n: number[]): Matrix | null {
  switch (name) {
    case 'matrix':
      return n.length === 6 ? [n[0], n[1], n[2], n[3], n[4], n[5]] : null;
    case 'translate':
      return n.length === 1 || n.length === 2 ? translate(n[0], n[1] ?? 0) : null;
    case 'scale':
      return n.length === 1 || n.length === 2 ? [n[0], 0, 0, n[1] ?? n[0], 0, 0] : null;
    case 'rotate': {
      if (n.length !== 1 && n.length !== 3) return null;
      const cos = Math.cos(rad(n[0]));
      const sin = Math.sin(rad(n[0]));
      const r: Matrix = [cos, sin, -sin, cos, 0, 0];
      if (n.length === 1) return r;
      return multiply(multiply(translate(n[1], n[2]), r), translate(-n[1], -n[2]));
    }
    case 'skewX':
      return n.length === 1 ? [1, 0, Math.tan(rad(n[0])), 1, 0, 0] : null;
    case 'skewY':
      return n.length === 1 ? [1, Math.tan(rad(n[0])), 0, 1, 0, 0] : null;
    default:
      return null;
  }
}

const FUNCTION = /^\s*(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^()]*)\)\s*,?/;
const NUMBER = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;

/** `transform` 속성 값. 여러 함수는 왼쪽부터 곱한다. 문법이 틀리면 null, 빈 값은 IDENTITY. */
export function parseTransform(value: string): Matrix | null {
  let rest = value;
  let m = IDENTITY;
  while (rest.trim()) {
    const found = FUNCTION.exec(rest);
    if (!found) return null;
    const args = found[2];
    // 숫자를 빼고 남는 것이 구분자(쉼표·공백)뿐이어야 한다.
    if (!/^[\s,]*$/.test(args.replace(NUMBER, ''))) return null;
    const next = toMatrix(found[1], (args.match(NUMBER) ?? []).map(Number));
    if (!next) return null;
    m = multiply(m, next);
    rest = rest.slice(found[0].length);
  }
  return m;
}
