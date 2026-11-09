# 기능 가구(사진 가구) 어드민 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 운영자가 가구 템플릿 폼에서 사진 가구를 만든다. 다음 네 가지가 들어간다.
- 기능 선택
- 바닥·덮개 그림
- 칸 편집과 SVG 불러오기
- 미리보기

산 공간이 있는 템플릿을 보호하고, 공간 상세에서 칸별 사진을 본다.

**Architecture:** 계산은 모두 순수 모듈에 두고 node:test 로 검증한다. 대상은 칸 규칙, 끌기·크기 계산, `transform` 행렬, SVG → 칸 변환이다. 순수 모듈은 `src/components/page/interior/photo/` 아래에 둔다. 화면은 그 모듈을 부르는 컴포넌트 네 개(그림 고르기, 칸 편집기, SVG 불러오기, 미리보기)로 나눈다. `InteriorForm` 은 이 네 개를 사진 가구일 때만 붙인다. SVG 에서 DOM 이 필요한 부분은 `extractSvg` 하나만 브라우저에서 돈다. 그 밖의 계산은 `slotsFromSvg` 가 Node 에서 한다.

**Tech Stack:** Next.js 16 pages router, React 18, react-hook-form + zod 3, shadcn/ui, sonner, node:test(tsx).

**Spec:**
- `~/Documents/frontend/MindBridge/docs/requests/2026-11-09-functional-furniture-admin.md` (MindBridge PR #150). 이하 "요청".
- 서버 형식은 `~/Documents/frontend/MindBridge/docs/requests/2026-11-09-functional-furniture-server.md` 1·2·5절.
- 실제 서버 계약은 mindqna-server 브랜치 `feat/functional-furniture` `f293462` 의 `src/space/interior-feature.ts`, `src/admin/interior/*` 이다.

## Global Constraints

**서버 계약(요청 아님, 서버 코드 기준)**
- 템플릿 응답 `GET admin/interior` 에 다음 필드가 더해진다.
  - `feature: 'none'|'photo'|'board'|'message'`
  - `featureConfig: PhotoFeatureConfig | null`
  - `purchasedCount: number`
  - `baseUri: string|null`, `overlayUri: string|null`
  - 목록 query 에 `feature?: InteriorFeature[]`
- 생성·수정 body 에 `feature?`, `featureConfig?` 가 더해진다.
  - 수정에서 `feature` 가 바뀌면 400 이다.
  - 수정에서 `featureConfig` 를 빼면 서버가 옛 값을 그대로 둔다.
- `PhotoFeatureConfig` 형식: `{ version: 1; baseImgId; imgWidth; imgHeight; overlayImgId?; slots: { key; x; y; width; height; rotation?; radius? }[] }`
- 칸 규칙(서버 `checkPhotoConfig` 와 같게)
  - 칸 1–10개
  - key 는 `^[a-z0-9]{1,8}$` 이고 가구 안에서 고유
  - `x,y ≥ 0`, `width,height > 0`, `x+width ≤ 1`, `y+height ≤ 1`
  - rotation −45–45, radius 0–0.5
  - 범위는 돌리기 전 네모 기준으로 잰다.
- 템플릿 규칙
  - 기능 가구는 `type ∈ {item, event}` 여야 한다.
  - `item` 이면 `price > 0` 이어야 한다.
  - `board`·`message` 는 화면에 보이지만 고를 수 없다.
- 산 공간 보호: `purchasedCount > 0` 인 템플릿은 옛 칸 키가 새 설정에 모두 있어야 한다. 키 추가는 된다.
- 서버 400 메시지는 `response.data.message` 에 온다. 에셋 삭제가 거절되면 메시지는 `가구 템플릿 N, M 이 쓰는 에셋입니다` 다.
- 공간 상세 `GET admin/space/:id/pet-interior` 의 `interiorItems[]` 에 `contents: { slotKey; updatedByProfileId; updatedAt; img: { uri } | null }[]` 가 더해진다.

**화면·문구**
- 기능 이름: `none` → `없음`, `photo` → `사진`, `board` → `칠판`, `message` → `쪽지`.
- 비율 경고
  - 대표 그림과 바닥 그림의 비율 차이가 1% 를 넘으면 경고한다.
  - 덮개 그림의 px 크기가 바닥 그림과 다르면 경고한다.
- SVG 메시지는 요청 2절의 문구를 그대로 쓴다.
  - `칸 레이어만 켜고 다시 내보내 주세요`
  - `SVG 파일이 아닙니다`
  - `바닥 그림과 같은 프레임에서 내보내 주세요`
  - `칸 이름은 소문자 slot-<영숫자 1–8>, 중복 금지`
  - `칸은 네모만 됩니다`
  - 범위 거절에는 "돌리기 전 네모 기준"을 적는다.
- 미리보기 가구 상자: 칸 하나는 기준 화면 너비 360px 의 1/7 이고, 높이는 그 1/1.5 이다. 상자는 `width × height` 칸이고, 그림은 그 안에 `contain` 으로 놓는다.

**작업 원칙**
- SVG 는 화면에 넣지 않는다(DOMParser 로 읽기만 한다). 저장하지도 않는다.
- 이모지는 쓰지 않는다. DESIGN.md 토큰과 기존 컴포넌트만 쓴다.
- 검증 명령: `npx tsc --noEmit`, `pnpm lint`(바뀐 파일 경고 0), `pnpm test`, `pnpm build`.

## Review Focus

- 수정 화면에서 `feature` 를 다시 보내 400 이 나면 안 된다. 수정 body 에는 `feature` 를 넣지 않는다. Task 1 테스트 `toTemplateBody` 로 확인한다.
- 사진 가구가 아닌 템플릿을 고칠 때 `featureConfig` 가 `null` 로 덮이면 안 된다. 기능 없는 템플릿의 수정 body 에는 `featureConfig` 가 없어야 한다. Task 1 테스트로 확인한다.
- 칸을 끌어 그림 밖으로 내보내거나 너비를 0 으로 줄이면 서버가 400 을 낸다. 끌기·크기 계산이 `[0,1]` 안, 최소 크기 0.01 로 막아야 한다. Task 2 테스트로 확인한다.
- SVG 를 불러오다 일부 칸에서 거절이 나면 편집기가 일부만 바뀌면 안 된다. 결과는 성공 아니면 실패 하나뿐이다. Task 4 테스트로 확인한다.
- 산 템플릿에서 칸을 지우는 경로는 둘이다. 하나는 편집기의 삭제 버튼, 다른 하나는 SVG 덮어쓰기다. 둘 다 같은 `missingSlotKeys` 로 막는다. Task 2·Task 4 테스트로 확인한다.

---

### Task 1: 타입·클라이언트·템플릿 규칙

**Files:**
- Modify: `src/client/types.ts:116-145`
  - `InteriorFeature`, `PhotoSlot`, `PhotoFeatureConfig` 를 추가한다.
  - `InteriorTemplate` 에 `feature`, `featureConfig`, `purchasedCount`, `baseUri`, `overlayUri` 를 추가한다.
  - `CreateInteriorTemplateParams` 에 `feature?`, `featureConfig?` 를 추가한다.
- Modify: `src/client/types.ts` `SpacePetInteriorResult.interiorItems[]` 에 `contents` 를 추가한다. 형식은 Global Constraints 를 따른다.
- Modify: `src/client/interior.ts`: `GetInteriorTemplatesParams.feature?: InteriorFeature[]` 를 query 로 넘긴다.
- Create: `src/lib/error-message.ts`
  - `toErrorMessage(err: unknown): string` 를 둔다.
  - `feature-flag-form.ts` 의 같은 함수를 여기로 옮기고, 거기서는 다시 export 한다.
- Create: `src/components/page/interior/photo/template-rules.ts`
- Test: `src/components/page/interior/photo/template-rules.test.ts`

**Interfaces:**
- Produces:
  - `FEATURE_LABEL: Record<InteriorFeature, string>`
  - `OPEN_FEATURES: InteriorFeature[] = ['none','photo']`
  - `featureTemplateProblems(input: { feature: InteriorFeature; type: InteriorTemplateType; price: number }): string[]`
  - `toTemplateBody(input: { mode: 'create' | 'update'; feature: InteriorFeature; config: PhotoFeatureConfig | null }): Pick<CreateInteriorTemplateParams, 'feature' | 'featureConfig'>`
  - `ratioDiff(a: { width: number; height: number }, b: { width: number; height: number }): number`. 값은 `|(a.w/a.h) ÷ (b.w/b.h) − 1|` 이다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
test('feature furniture must be a paid item or an event', () => {
  assert.deepEqual(featureTemplateProblems({ feature: 'none', type: 'wall', price: 0 }), []);
  assert.deepEqual(featureTemplateProblems({ feature: 'photo', type: 'item', price: 10 }), []);
  assert.deepEqual(featureTemplateProblems({ feature: 'photo', type: 'event', price: 0 }), []);
  assert.equal(featureTemplateProblems({ feature: 'photo', type: 'item', price: 0 }).length, 1);
  assert.equal(featureTemplateProblems({ feature: 'photo', type: 'wall', price: 10 }).length, 1);
});
test('create sends feature and config; update never sends feature, and none never sends config', () => {
  const config = { version: 1, baseImgId: 1, imgWidth: 420, imgHeight: 200, slots: [] } as const;
  assert.deepEqual(toTemplateBody({ mode: 'create', feature: 'photo', config }), { feature: 'photo', featureConfig: config });
  assert.deepEqual(toTemplateBody({ mode: 'create', feature: 'none', config: null }), { feature: 'none' });
  assert.deepEqual(toTemplateBody({ mode: 'update', feature: 'photo', config }), { featureConfig: config });
  assert.deepEqual(toTemplateBody({ mode: 'update', feature: 'none', config: null }), {});
});
test('ratioDiff', () => {
  assert.equal(ratioDiff({ width: 420, height: 200 }, { width: 840, height: 400 }), 0);
  assert.ok(ratioDiff({ width: 420, height: 200 }, { width: 400, height: 200 }) > 0.01);
});
```

- [ ] **Step 2:** `npx tsx --test src/components/page/interior/photo/template-rules.test.ts` 를 돌린다. 모듈이 없어서 FAIL 해야 한다.
- [ ] **Step 3:** 위 타입·클라이언트·`toErrorMessage`·`template-rules.ts` 를 만든다. 그다음 `AssetsList.tsx:45` 의 `` toast.error(`${err}`) `` 를 `toast.error(toErrorMessage(err))` 로 바꾼다. 요청 3절의 "에셋 화면에서 그 오류를 보여 준다"가 이것이다.
- [ ] **Step 4:** `pnpm test` 를 돌린다. 기존 테스트까지 PASS 해야 한다. `npx tsc --noEmit` 도 통과해야 한다.
- [ ] **Step 5:** 커밋한다. 메시지는 `feat(interior): feature furniture types, template rules and asset delete error`.

### Task 2: 칸 규칙과 편집 계산

**Files:**
- Create: `src/components/page/interior/photo/slot-rules.ts`
- Test: `src/components/page/interior/photo/slot-rules.test.ts`

**Interfaces:**
- Produces:
  - `slotProblems(slots: PhotoSlot[]): string[]`
    - 서버 규칙과 같다. 칸마다 `칸 <key>: …` 로 적는다.
    - 개수 규칙 위반은 `칸은 1–10개여야 합니다` 다.
  - `nextSlotKey(slots: PhotoSlot[]): string`
    - `a`…`z` 중 쓰지 않은 첫 글자를 쓴다.
    - 다 쓰였으면 `s1`, `s2`, … 를 쓴다.
  - `newSlot(slots: PhotoSlot[]): PhotoSlot`
    - `{ key: nextSlotKey, x: 0.35, y: 0.35, width: 0.3, height: 0.3, rotation: 0, radius: 0 }`
  - `moveSlot(slot, dx, dy): PhotoSlot`
    - 0–1 단위다.
    - `x ∈ [0, 1−width]`, `y ∈ [0, 1−height]` 로 자른다.
  - `resizeSlot(slot, corner: 'nw'|'ne'|'sw'|'se', dx, dy): PhotoSlot`
    - 반대 모서리는 고정한다.
    - 최소 크기 0.01, `[0,1]` 안으로 자른다.
  - `missingSlotKeys(prev: PhotoSlot[], next: PhotoSlot[]): string[]`
  - `round5(n: number): number`

- [ ] **Step 1: 실패하는 테스트를 쓴다**
  - `slotProblems`
    - 0칸, 11칸
    - `x+width = 1.0000001`, rotation 46, radius 0.6
    - key `'A'`, `'abcdefghi'`
    - 중복 키
    - 경계값 `x+width = 1`, rotation −45, radius 0.5 는 통과
  - `nextSlotKey`: `[a,b,d]` → `c`. `a`–`z` 다 쓰면 `s1`.
  - `moveSlot`: `(x 0.9, w 0.2)` 를 오른쪽으로 끌면 `x = 0.8`. 음수 이동은 0 에서 멈춘다.
  - `resizeSlot`
    - `se` 를 `(-1,-1)` 로 끌면 크기 `0.01`, 왼쪽 위는 그대로.
    - `nw` 를 바깥으로 끌면 `x = 0`, 오른쪽 아래는 그대로.
  - `missingSlotKeys([a,b],[a,c])` → `['b']`
- [ ] **Step 2:** 테스트를 돌린다. FAIL 해야 한다.
- [ ] **Step 3:** 구현한다. 끌기·크기 계산 결과는 `round5` 로 반올림한다.
- [ ] **Step 4:** `pnpm test` 를 돌린다. PASS 해야 한다.
- [ ] **Step 5:** 커밋한다. 메시지는 `feat(interior): photo slot rules and drag math`.

### Task 3: SVG `transform` 행렬

**Files:**
- Create: `src/components/page/interior/photo/svg-matrix.ts`
- Test: `src/components/page/interior/photo/svg-matrix.test.ts`

**Interfaces:**
- Produces:
  - `type Matrix = [a, b, c, d, e, f]`
  - `IDENTITY`
  - `multiply(m1: Matrix, m2: Matrix): Matrix`
  - `parseTransform(value: string): Matrix | null`
    - 받는 함수: `matrix`, `translate`(ty 생략 0), `scale`(sy 생략 sx), `rotate(θ [cx cy])`, `skewX`, `skewY`
    - 구분자는 쉼표와 공백, 여러 함수를 이어 쓰면 왼쪽부터 곱한다.
    - 문법이 틀리면 null 이다.
  - `apply(m: Matrix, x: number, y: number): [number, number]`

- [ ] **Step 1: 실패하는 테스트를 쓴다**
  - `translate(10)` → e=10, f=0
  - `rotate(90 50 50)` 를 `(100,50)` 에 적용 → `(50,100)`. 허용 오차는 1e-9.
  - `matrix(1 0 0 1 5 6)`
  - `translate(10,0) scale(2)` 를 `(1,1)` 에 적용 → `(12,2)`
  - `skewX(30)` 의 c → `tan 30°`
  - `'rotate('` → null
- [ ] **Step 2–4:** FAIL 을 확인하고, 구현한 뒤, PASS 를 확인한다.
- [ ] **Step 5:** 커밋한다. 메시지는 `feat(interior): svg transform parser`.

### Task 4: `slotsFromSvg` 순수 변환과 덮어쓰기 차이

**Files:**
- Create: `src/components/page/interior/photo/slots-from-svg.ts`
- Test: `src/components/page/interior/photo/slots-from-svg.test.ts`

**Interfaces:**
- Consumes: Task 2 의 `slotProblems`, `missingSlotKeys`, `round5`. Task 3 의 `parseTransform`, `multiply`.
- Produces:
  - `type SvgNode = { id: string; tag: string; attrs: Record<string, string>; ancestorTransforms: string[]; inNonRendered: boolean; usedByUse: boolean }`
  - `type SvgData = { root: { viewBox: string | null; width: string | null; height: string | null }; nodes: SvgNode[] }`
  - `slotsFromSvg(data: SvgData, image: { imgWidth: number; imgHeight: number }, existingKeys: string[], purchasedCount: number): { ok: true; slots: PhotoSlot[]; warnings: string[] } | { ok: false; errors: string[] }`
  - `slotChanges(prev: PhotoSlot[], next: PhotoSlot[]): { key: string; kind: 'moved' | 'resized' | 'aspect' | 'added' | 'removed' }[]`
    - `aspect` 는 너비/높이 비율이 10% 넘게 바뀐 경우다.

- [ ] **Step 1: 실패하는 테스트를 쓴다.** 요청 2절 "테스트" 목록을 그대로 쓴다. 노드를 손으로 만든 `SvgData` 를 입력으로 쓴다. 기준은 `viewBox '0 0 420 200'`, `imgWidth 420`, `imgHeight 200` 이다.
  - **받는 경우**
    - 평범한 네모 `slot-a (21,40,105,120)` → `{key:'a', x:0.05, y:0.2, width:0.25, height:0.6, rotation:0, radius:0}`
    - `rotate(-6 cx cy)` → rotation −6, 크기는 그대로
    - `matrix(...)`
    - 뒤집기 행렬(행렬식 < 0): 받는다.
    - 조상 `g` 의 `translate`
    - 늘린 뒤 돌림: 받는다.
    - 90°: W·H 를 바꾸고 0° 로 만든다.
    - 180°: 0° 가 된다.
    - −174°: 6° 가 된다.
    - viewBox 시작이 `10 20 420 200` 인 경우
    - 정사각형이 아닌 viewBox 에서 30° 칸: 각도 30 이 그대로 나와야 한다.
    - `rx` 만 있으면 `ry` 도 같은 값으로 친다.
    - `rx > w/2` 이면 `w/2` 로 자른다.
    - `radius = min(rx', ry')/W`. 둘이 다르면 경고를 낸다.
    - 경계 소수 오차 1e-7 은 경계값으로 맞춘다.
    - 산 템플릿(`purchasedCount 3`, `existingKeys [a]`)에 `slot-a`·`slot-b`: 받는다.
  - **거절**
    - skew
    - viewBox 없음 + `width="100%"`
    - viewBox·width·height 모두 없음
    - 비율 차이 > 1%
    - `<path id="slot-a">`
    - `slot-a_2`, `slot-A`
    - 같은 키 둘
    - `inNonRendered` 칸, `usedByUse` 칸
    - `style` 에 `transform`, `transform-origin` 속성
    - 0칸, 11칸
    - 범위 밖 칸: 메시지에 `돌리기 전 네모 기준` 이 들어가야 한다.
    - 산 템플릿에 `slot-b` 만 있음: `a` 가 빠졌으므로 거절한다.
  - **무시**: `slot_a`(밑줄)는 `slot` 으로 시작하지만 `slot-` 규칙에 안 맞는다. 요청대로 거절한다. `frame-1` 처럼 `slot` 으로 시작하지 않는 요소는 무시한다.
  - **경고**: 배율 `imgWidth/vbW = 2.5` 이면 경고한다. `stroke="#000"` 이면 경고한다.
  - **결과 형태**: 거절이 하나라도 있으면 `ok:false` 이고 `errors` 에 칸별 이유를 담는다. 칸은 돌려주지 않는다.
  - **`slotChanges`**: x 가 바뀌면 `moved`, 너비가 바뀌면 `resized`, 비율이 10% 넘게 바뀌면 `aspect`, 새 키는 `added` 다.
- [ ] **Step 2:** 테스트를 돌린다. FAIL 해야 한다.
- [ ] **Step 3:** 요청 2절 "자리 계산" 1–5 단계를 그대로 구현한다. 계산은 viewBox 단위에서 하고, 마지막에만 0–1 로 나눈다. 그다음 범위를 확인하고 `slotProblems` 를 돌린다.
- [ ] **Step 4:** `pnpm test` 를 돌린다. PASS 해야 한다.
- [ ] **Step 5:** 커밋한다. 메시지는 `feat(interior): read photo slots from a figma svg`.

### Task 5: 브라우저 SVG 추출과 파일 확인

**Files:**
- Create: `src/components/page/interior/photo/extract-svg.ts`
- Test: `src/components/page/interior/photo/extract-svg.test.ts`. 순수 함수 `checkSvgText` 만 테스트한다.

**Interfaces:**
- Produces:
  - `checkSvgText(size: number, text: string): string | null`. 거절 메시지 아니면 null 이다.
    - 1MB(1_048_576) 넘으면 거절한다.
    - `<!DOCTYPE`·`<!ENTITY` 가 있으면 거절한다.
  - `extractSvg(text: string): SvgData | { error: string }`
    - 브라우저 전용이다. `DOMParser('image/svg+xml')` 로 읽는다.
    - `parsererror` 가 있거나, 뿌리가 SVG 네임스페이스의 `svg` 가 아니면 `SVG 파일이 아닙니다` 다.
    - id 가 `slot` 으로 시작하는 요소만 노드로 모은다(대소문자 무시).
    - `ancestorTransforms` 는 뿌리 바로 아래부터 그 요소까지의 `transform` 이다. 자기 것도 넣는다.
    - `inNonRendered`: `defs`·`symbol`·`mask`·`clipPath`·`pattern`·`marker`·중첩 `svg` 조상이 있으면 true.
    - `usedByUse`: 어떤 `<use>` 의 `href`/`xlink:href` 가 `#id` 를 가리키면 true.

- [ ] **Step 1:** `checkSvgText` 테스트를 쓴다.
  - 1_048_577 바이트 → `칸 레이어만 켜고 다시 내보내 주세요`
  - `<!DOCTYPE svg>` → 거절
  - 평범한 SVG → null
- [ ] **Step 2–4:** FAIL 을 확인하고, 구현한 뒤, PASS 를 확인한다.
- [ ] **Step 5:** `extractSvg` 는 Task 7 의 브라우저 확인에서 검증한다. 대상은 `parsererror`, DOCTYPE, 네임스페이스다.
- [ ] **Step 6:** 커밋한다. 메시지는 `feat(interior): svg file checks and browser extraction`.

### Task 6: 그림 고르기·칸 편집기·미리보기 컴포넌트

**Files:**
- Create: `src/components/page/interior/photo/preview-math.ts`
  - `containRect(box: {w,h}, img: {w,h}): { x, y, w, h }`
  - `FURNITURE_CELL = { w: 360 / 7, h: 360 / 7 / 1.5 }`
- Test: `src/components/page/interior/photo/preview-math.test.ts`. 확인 사례: 가로로 긴 그림, 세로로 긴 그림, 같은 비율.
- Create: `src/lib/image-size.ts`. `readImageSize(uri: string): Promise<{ width: number; height: number }>` 는 `new Image()` 의 `naturalWidth` 를 읽는다.
- Create: `src/components/page/interior/photo/PhotoImagesField.tsx`
  - 바닥·덮개 그림을 `AssetsPickerPanel` 로 고른다.
  - 바닥을 고르면 `readImageSize` 로 `imgWidth`·`imgHeight` 를 채운다.
  - 경고 두 가지를 보인다.
    - 대표 그림과 바닥의 `ratioDiff > 0.01`
    - 덮개와 바닥의 px 크기 다름
  - 불러온 칸이 있는데 바닥을 바꿔 비율이 1% 넘게 달라지면 `칸 다시 불러오기` 경고를 낸다.
  - 그림 고르기는 기존 대표 그림과 같은 "시트 안 단계" 방식을 쓴다. 폼 상태에 `picking: 'img' | 'base' | 'overlay' | null` 을 둔다.
- Create: `src/components/page/interior/photo/SlotEditor.tsx`
  - 바닥 그림 위에 칸 네모를 그린다.
  - pointer 이벤트로 끌면 `moveSlot`, 모서리 손잡이로 끌면 `resizeSlot` 을 부른다. 픽셀 이동량은 그림의 화면 크기로 나눠 0–1 단위로 바꾼다.
  - 고른 칸은 숫자 입력으로도 고친다. 대상은 x, y, 너비, 높이, 기울기, 모서리다.
  - `칸 추가` 버튼은 10개가 되면 끈다.
  - 칸 삭제: `purchasedCount > 0` 이고 그 키가 저장된 설정에 있으면 버튼을 끄고 `산 공간 N곳의 사진이 끊깁니다` 를 툴팁에 보인다.
  - 칸 키 칩은 키보드로 고를 수 있게 한다(Tab, 화살표로 1% 이동).
- Create: `src/components/page/interior/photo/PhotoPreview.tsx`
  - 앱 렌더링 규칙과 같게 그린다. 출처는 MindBridge `src/features/space/bases/FurniturePicture.tsx`, `utils/photoFeature.ts` 이고, 앱 세션이 2026-11-09 에 알려 줬다.
  - **프레임**: 가구 칸 상자(`width × height` 칸) 안에 바닥 그림 비율(`imgWidth/imgHeight`)의 프레임을 `contain`, 가운데로 놓는다(`containRect`).
  - **그림**: 바닥 그림과 덮개 그림은 프레임을 그대로 채운다(늘림). 덮개는 같은 크기로 위에 놓는다.
  - **칸 자리**: `left = x·프레임너비`, `top = y·프레임높이`, 크기는 `width·프레임너비 × height·프레임높이`.
  - **칸 모양**: 칸 가운데 기준 `rotate(rotation deg)`, 모서리 `radius × 칸 너비(px)`, `overflow: hidden`.
  - **칸 안**: 사진은 `cover`. 칸 배경은 늘 `#46382533`(앱 text20).
  - **빈 칸**: 가운데에 사진 아이콘을 놓는다. 크기는 `max(8, min(칸너비, 칸높이) × 16/40)` px, 색은 앱 text40 이다. 아이콘은 lucide `Image` 로 대신한다.
  - **토글** `예시 사진`/`빈 칸`: 예시 사진은 회색 그라데이션을 `cover` 로 채운다.
  - **앱이 버리는 칸**: 키 형식 위반, 범위 밖, 중복 키(뒤의 것)는 앱이 그 칸만 버린다. 칸 0개·11개 이상이거나 version ≠ 1 이면 대표 그림으로 돌아간다. 저장 전 `slotProblems` 가 이걸 모두 막으므로 미리보기는 따로 처리하지 않는다.

- [ ] **Step 1:** `containRect` 테스트를 쓴다.
  - 상자 `154×69`, 그림 `420×200`
  - 결과 `w = 144.9`(높이가 맞춰짐), `x` 는 가운데
- [ ] **Step 2–4:** FAIL 을 확인하고, 구현한 뒤, PASS 를 확인한다.
- [ ] **Step 5:** 컴포넌트 넷을 만든다. `npx tsc --noEmit` 와 `pnpm lint` 를 바뀐 파일에 돌린다.
- [ ] **Step 6:** 커밋한다. 메시지는 `feat(interior): photo images, slot editor and preview`.

### Task 7: SVG 불러오기 화면

**Files:**
- Create: `src/components/page/interior/photo/SvgSlotImport.tsx`
  - 버튼 `칸 SVG 불러오기` 를 둔다. 바닥 그림이 없으면 끄고 이유를 툴팁으로 보인다.
  - `<input type="file" accept=".svg,image/svg+xml">` 로 받아 `file.text()` 로 읽는다.
  - 처리 순서: `checkSvgText` → `extractSvg` → `slotsFromSvg`.
  - 실패하면 이유 목록을 대화상자로 보이고, 편집기는 그대로 둔다.
  - 성공했는데 칸이 이미 있으면 덮어쓰기 확인 창을 띄운다. 창에는 `slotChanges` 표와 경고를 보인다.
  - 확인하면 `onImport(slots)` 를 부른다.
  - 밖으로 내보내는 상태: `importedFor: { imgWidth, imgHeight } | null`. Task 6 의 다시 불러오기 경고에 쓴다.

- [ ] **Step 1:** 컴포넌트를 만든다. 순수 로직은 Task 4·5 에 이미 테스트가 있다.
- [ ] **Step 2: 브라우저에서 손으로 확인한다.** `pnpm dev` 를 띄우고 어드민 계정으로 로그인한 뒤 확인한다.
  - (a) 피그마식 SVG(칸 2개) → 칸이 채워짐
  - (b) DOCTYPE 이 든 SVG → 거절
  - (c) 텍스트 파일 → `SVG 파일이 아닙니다`
  - (d) 네임스페이스 없는 `<svg>` → 거절
  - (e) 칸이 있는 상태에서 불러오기 → 덮어쓰기 표
- [ ] **Step 3:** 커밋한다. 메시지는 `feat(interior): import photo slots from svg`.

### Task 8: 폼·목록 연결과 산 템플릿 보호

**Files:**
- Modify: `src/components/page/interior/InteriorForm.tsx`
  - **기능 선택**: `기능` 라디오를 둔다. `board`·`message` 는 비활성이다. 만들 때만 고를 수 있고, 수정 화면에서는 읽기 전용 배지로 보인다.
  - **사진 가구 묶음**: `photo` 일 때만 `PhotoImagesField`, `SlotEditor`, `SvgSlotImport`, `PhotoPreview` 를 보인다.
  - **저장 순서**
    1. `featureTemplateProblems` 와 `slotProblems` 를 확인한다. 문제가 있으면 toast 로 보이고 저장을 막는다.
    2. `toTemplateBody` 를 body 에 펼친다.
    3. 수정 화면에서 산 템플릿이면 `missingSlotKeys(init.featureConfig.slots, slots)` 가 비어야 한다.
    4. 에러는 `toErrorMessage` 로 보인다.
  - **수정 화면 초기값**: `init.featureConfig` 의 슬롯을 쓴다. 바닥·덮개 그림은 `{ id: baseImgId, uri: init.baseUri }` 로 채운다.
- Modify: `src/components/page/interior/InteriorList.tsx`
  - `기능` 칸을 둔다. 배지는 `FEATURE_LABEL` 이고 `none` 이면 `-` 다.
  - `기능` 필터를 두고 `feature` query 로 보낸다.
  - 삭제 확인 창에 `purchasedCount > 0` 이면 `산 공간 N곳의 소유와 사진이 함께 지워집니다` 를 보인다.

- [ ] **Step 1:** 연결한다. `npx tsc --noEmit`, `pnpm lint`, `pnpm test` 를 돌린다.
- [ ] **Step 2:** 커밋한다. 메시지는 `feat(interior): photo furniture in the template form and list`.

### Task 9: 공간 상세 칸별 사진

**Files:**
- Modify: `src/components/page/space/components/tabs/SpacePetInteriorTab.tsx`
  - `item.contents.length` 이면 소유 가구 행 아래에 칸 키, 사진 썸네일 40px, 바꾼 프로필 id, 시각(`YYYY-MM-DD HH:mm`)을 줄로 보인다.
  - `img` 가 null 이면 `빈 칸` 이다.

- [ ] **Step 1:** 구현한다. 서버가 `contents` 를 아직 안 주는 경우에도 깨지지 않게 `item.contents ?? []` 로 받는다.
- [ ] **Step 2:** tsc 와 lint 를 돌리고 커밋한다. 메시지는 `feat(space): show photo furniture contents per slot`.

### Task 10: 서버 dev 연동 확인과 토글

서버 어드민 API(요청 5절)가 dev 에 배포된 뒤에 한다.

- [ ] **Step 1:** `pnpm dev`(dev API)로 다음 흐름을 확인한다.
  - 사진 가구 만들기: 바닥, 덮개, 칸 3개
  - 목록의 `기능` 칸과 필터
  - 수정해서 칸 옮기기
  - 산 템플릿에서 칸 삭제 거절
  - `price 0 item` 저장 거절
  - 바닥 그림 에셋 삭제 시 서버 메시지 표시
  - 공간 상세 칸별 사진
- [ ] **Step 2:** `앱 기능 관리` 화면에 `공간 > 기능 가구` 가 `공간` 묶음의 `기능 가구` 로 자동으로 보이는지 확인한다. 서버 키 라벨 `공간 > 기능 가구` 는 `splitLabel` 로 이름 `기능 가구`, 보조 줄 `공간` 이 된다. 코드 변경은 없을 것이다.
- [ ] **Step 3:** 계약이 서버 코드와 다르면 Task 1 타입을 고쳐 커밋한다. `pnpm build` 를 돌리고 PR 을 연다.
