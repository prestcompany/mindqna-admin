# 쪽지 가구(기능 가구 3단계) 어드민 작업 계획

**목표:** 가구 템플릿 폼에서 쪽지 가구를 만들고 고칠 수 있게 한다. 쪽지 가구는 대표 그림 + 편지지 그림 + 글 제한(최대 글자·줄)이고 칸 편집기는 없다.

**요청서:** MindBridge `docs/requests/2026-11-13-functional-furniture-message-admin.md`, 서버 형식은 같은 폴더 `…-message-server.md` 1·8절.

**브랜치:** `feat/functional-furniture-message`(작업 폴더 `../mindqna-admin-message`), 칠판 브랜치 `feat/functional-furniture-board` 위에서 시작한다. 칠판이 develop 에 들어간 뒤 이 브랜치를 올린다.

## 지킬 것

- 서버 설정(message version 1): `paperImgId`, `paperWidth`, `paperHeight`(원본 px, > 0), `maxLength` 정수 1–200(기본 80), `maxLines` 정수 1–20(기본 7).
- 쪽지는 `type: 'item'` 만, `price > 0`. `feature` 는 만들 때만 고른다(지금과 같음).
- 편지지 글 영역: 가로 = 편지지 너비 × 0.83, 세로 = 편지지 높이 × 0.674, 자리는 x 0.085·y 0.112(4절).
- 편지지 비율 경고: 300:356 에서 5% 넘게 벗어나면.
- 서버 응답의 `kind` 는 읽기만 하고 보내지 않는다(칠판과 같음).
- 서버에 없는 검사를 어드민에 더하지 않는다. 어드민 검사는 서버 규칙과 같은 메시지를 먼저 보여 주는 용도다.

## 작업

### 1. 타입과 규칙 (테스트 먼저)

- `src/client/types.ts`: `MessageFeatureConfig = { version: 1; paperImgId; paperWidth; paperHeight; maxLength; maxLines }`, `FeatureConfig` 유니언에 더한다. 응답의 편지지 주소 칸(`paperUri`)은 서버 3단계 어드민 응답 모양을 보고 맞춘다(사진의 `baseUri` 처럼 템플릿 최상위인지 확인).
  사진·칠판이 `featureConfig.slots` 를 읽는 곳(폼의 키 잠금, `usePhotoDraft`)은 `feature` 로 좁혀 쪽지 설정을 칸 설정으로 읽지 않게 한다.
- `photo/template-rules.ts`:
  - `OPEN_FEATURES` 에 `message`, 목록 탭 `{ value: 'message', label: '쪽지 가구' }`, `featureTabFromQuery` 가 `message` 를 받는다.
  - `featureTemplateProblems`: 쪽지면 `type !== 'item'` → "쪽지 가구는 아이템이어야 합니다.", 가격 0 이하 → 기존 메시지.
- 새 `photo/message-rules.ts`:
  - `MESSAGE_DEFAULT = { maxLength: 80, maxLines: 7 }`, `PAPER_RATIO = { width: 300, height: 356 }`, `PAPER_TEXT_AREA = { width: 0.83, height: 0.674 }`.
  - `messageConfigProblems(draft)`: 편지지 없음 / 다시 고르기 필요 / 크기 모름, `maxLength` 1–200 정수, `maxLines` 1–20 정수.
  - `paperWarnings(size)`: `ratioDiff(size, PAPER_RATIO) > 0.05` 면 경고 한 줄.
  - `exampleMessage(maxLength, maxLines)`: "가나다라마" 를 이어 최대 글자 수만큼, 최대 줄 수로 고르게 나눈다(칠판 `exampleText` 와 같은 나눔).
- 테스트: `template-rules.test.ts` 에 쪽지 탭·`event` 거절, 새 `message-rules.test.ts` 에 위 함수의 경계값(0·1·200·201, 20.5, 비율 4.9%·5.1%).

### 2. 편집 상태

- 새 `photo/useMessageDraft.ts`: 편지지 그림(`{ id, uri }`)과 원본 크기(새로 고르면 `readImageSize` 로 읽고, 수정 화면은 저장된 크기), `maxLength`·`maxLines`, `toConfig()`.
  사진·칠판 훅(`usePhotoDraft`)과 나누는 이유: 쪽지에는 바닥·덮개·칸이 없어 같은 훅에 넣으면 분기만 늘어난다.
- 그림 고르기 화면은 지금 바닥 그림을 고르는 흐름(`onPick`)에 `'paper'` 를 더해 그대로 쓴다.

### 3. 폼

- "기능" 에서 쪽지를 고르면 타입을 `item` 으로 두고 다른 타입 버튼을 막는다(이미 다른 타입이면 바꾸고 알린다).
- 쪽지일 때 보이는 것:
  - 대표 그림 안내 문구: "방에 놓일 때도 이 그림을 써요(글 없는 그림)".
  - PanelBand "쪽지 가구": 편지지 그림(필수, 원본 크기 표시, 비율 경고), 최대 글자 수, 최대 줄 수(칠판의 `SlotNumberInput` 재사용).
  - 미리보기(아래 4).
- 바닥·덮개 그림과 칸 편집기는 숨긴다(쪽지 영역에는 그리지 않는다).
- 저장: `featureTemplateProblems` + `messageConfigProblems` 를 지금처럼 한 토스트로 보여 주고, 통과하면 `toTemplateBody` 에 쪽지 설정을 넣는다. 7개 언어 이름은 지금 흐름 그대로.

### 4. 미리보기

앱 값(mindbridge-89, 피그마 `6107:65763` 편지지 300×356 기준, 편지지 원본 px 에서는 `paperWidth / 300` 을 곱한다):

- 본문 상자: x 0.085, y 0.112, w 0.83, h 0.674(편지지 비율). 글은 가로·세로 가운데. 어드민은 기본 글꼴 25px·줄 높이 130%(300 기준).
- 넘칠 때: 칠판과 같은 규칙 — 배율 max(0.5, 0.9ⁿ), 허용치 0.5px, 0.5 에서도 넘치면 상자 높이에 들어가는 줄까지 남기고 "…". 칠판 `fitText` 를 그대로 쓰되 줄 높이 배수를 인자로 받게 한다(칠판 1.25, 쪽지 1.3).
- 서명 "- 이름 -": 본문 상자와 같은 x·너비, y 0.820, h 0.090, 본문과 같은 크기, 줄이지 않음, 가운데 한 줄, 넘치면 끝을 "…".

- 새 `photo/MessagePreview.tsx`: 위 값으로 편지지 그림 위에 예시 글과 서명을 그린다. 칠판 미리보기의 글꼴 측정(`useMeasure`)을 같이 쓴다.
- 아래에 "앱에서는 손글씨체로 보여요. 줄바꿈 위치가 다를 수 있어요." 한 줄.
- 테스트: `fitText` 줄 높이 인자(1.3 에서 줄 수가 바뀌는 경계), `MESSAGE_LAYOUT` 값이 피그마 수치(25.5/300, 40/356 …)와 같은지.

### 5. 목록

- 탭·필터에 "쪽지 가구", "기능" 칸에 "쪽지"(라벨은 이미 있음). 구매 수는 서버 값 그대로.
- 삭제: 쪽지 템플릿 삭제가 실패하면 서버 메시지에 "재고나 놓인 쪽지가 있으면 지울 수 없어요. 판매 중지(비활성)를 쓰세요." 설명을 붙인다.

### 6. 확인

- `pnpm test`, `npx tsc --noEmit -p .`, `pnpm lint`.
- 코드 리뷰 한 번(새 맥락의 리뷰어).

## 서버가 dev 에 나온 뒤

1. 생성·수정·삭제(400)를 dev 에서 확인한다.
2. 첫 쪽지 가구를 피그마 `6082:73415` 에서 뽑아 dev 에 등록한다. 어떤 종류를 먼저 낼지는 디자이너가 정한다(PRD 질문 10) — 정해지면 등록한다.
3. develop 에 머지해 admin-dev 에서 화면을 확인하고 mindbridge-89 에 알린다.
4. 앱에서 보려면 dev 기능 플래그 `space.messageFurniture` 를 켜야 한다(사용자).

## 하지 않는 것

- 쪽지 내용(남긴 글)·재고를 보거나 지우는 운영 화면. 요청서에 없다.
- 미리보기의 글자 줄이기·손글씨체 재현.
