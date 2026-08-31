# 공간 상세 추가 고도화 — 설계 문서

- 작성일: 2026-06-22
- 범위: 프론트 `mindqna-admin` + 백엔드 `mindqna-server`
- 전제: 공간 상세 8탭 + 카드 종합 오버뷰는 구현 완료. 본 문서는 그 위에 **개별 상세 drill-down**과 **Stats/집계**를 추가한다. 전부 read-only.

## 목표
지금은 도메인별 "목록 조회"는 되지만 (1) 멤버 1명을 축으로 한 횡단 조회와 (2) 공간 전체 집계/추세가 비어 있다. 네 가지를 추가해 어드민의 진단 시야를 넓힌다.

## 기능

### 1. 멤버 상세 drill-down
- 엔드포인트: `GET /admin/space/:id/members/:profileId`
- 응답: 이 공간에서의 활동 풋프린트
  - `replyCount` (Reply where profileId)
  - `diaryCount` (Diary where profileId)
  - `scheduleCount` (Schedule where profileId)
  - `cardCommentCount` (CardComment where profileId), `diaryCommentCount` (DiaryComment where profileId)
  - `coinGiven` / `coinUsed` (CoinMeta sum by profileId, isUse 분기)
  - `premiumTickets`: PremiumTicket[] (where profileId) — platform·productId·dueAt·isActive
- 카운트는 `profileId` 기준(프로필은 한 공간에 귀속 → 공간 스코프). Reply/Diary/Schedule/CoinMeta 모두 profileId 인덱스 존재.
- 프론트: 멤버 행 클릭 → 펼침(카드/일기 패턴 동일). 카운트 타일 + 프리미엄 티켓 목록.

### 2. 종합 활동성 요약 (Overview Stats)
- 엔드포인트: `GET /admin/space/:id/activity-summary`
- 응답: `{ access7d, diary30d, lastCard: { replyCount, activeMembers, rate } | null }`
  - `access7d`: UserAccessMeta count, createdAt ≥ now-7d
  - `diary30d`: Diary count, createdAt ≥ now-30d
  - `lastCard`: 최신 카드의 CardStat.replies ÷ 활성 멤버 수
- 프론트: Overview 상단(아이덴티티 아래) 3타일.

### 3. 일기 감정 분포 Stats
- 엔드포인트: `GET /admin/space/:id/diary-stats`
- 응답: `{ total, byEmotion: [{ emotion, count }] }` — `diary.groupBy({ by: ['emotion'], where: { spaceId }, _count })`
- 프론트: 일기 탭 상단 — emotion 바 히스토그램 + 총 작성수.

### 4. 일정 상세 drill-down
- 엔드포인트: `GET /admin/space/:id/schedules/:scheduleId`
- 응답: schedule 기본 + `items`(ScheduleItem date 목록) + `members`(ScheduleMemberMeta → profile nickname) + `memo` + 반복 설정(intervalType 등)
- 프론트: 일정 행 클릭 → 펼침: 반복 아이템 날짜·참여 멤버·memo.

## 공통 규약
- 전부 read-only, `databaseManager`/PrismaService 직접(어드민 SpaceService 패턴), `select` 명시.
- drill-down(멤버·일정)은 행 펼침(`expandedId`) + lazy `useQuery(enabled)` — 카드 답변/일기 본문과 동일 패턴.
- Stats(활동성·감정)는 타일/바, DESIGN.md 준수(slate 표면·의미색 절제·tabular-nums).
- 컨트롤러 라우트 순서: `:id/members/:profileId`, `:id/schedules/:scheduleId`는 기존 `:id/members`·`:id/schedules`보다 깊은 경로라 충돌 없음.

## 비범위
- 운영 데이터 변경(mutation) 없음.
- 유저 상세 페이지 대표 프로필 이미지(별도 백엔드 지원 필요)는 본 범위 밖.
- 카드 댓글(CardComment) 본문 표시, 일기 댓글/이미지 등 더 깊은 drill-down은 후속.

## 구현 순서(독립 배포 가능)
1. 일기 감정 분포 (가장 작음) → 2. 종합 활동성 요약 → 3. 멤버 상세 → 4. 일정 상세
