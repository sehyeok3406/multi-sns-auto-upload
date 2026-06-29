# SNS auto upload

팀에서 X와 Threads 게시 흐름을 한 화면에서 확인하기 위한 Next.js MVP입니다. 현재 버전은 실제 SNS API 호출 대신 환경 변수 기반 연결 상태와 mock 게시 결과를 사용합니다.

## 기술 스택

- Next.js App Router
- TypeScript
- React Client Component
- Next.js Route Handler
- Tailwind CSS
- Vercel 배포 기준 구조

## 로컬 실행

```bash
npm install
npm run dev
```

이 Codex 작업 환경에서는 번들 런타임에 npm이 없어 `pnpm`으로 설치와 검증을 수행했습니다. 일반 Node.js 환경에서는 위 명령으로 실행할 수 있습니다.

브라우저에서 [http://localhost:3000/login](http://localhost:3000/login)으로 접속합니다.

임시 접근 비밀번호:

```txt
temp-sns-password
```

## 환경 변수

`.env.example`을 기준으로 `.env.local` 또는 Vercel Environment Variables에 값을 설정합니다.

```env
APP_PASSWORD=temp-sns-password

X_API_KEY=
X_API_SECRET=
X_ACCESS_TOKEN=
X_ACCESS_TOKEN_SECRET=
X_BEARER_TOKEN=

THREADS_ACCESS_TOKEN=
THREADS_USER_ID=
META_APP_ID=
META_APP_SECRET=
```

X는 X Developer 계정의 API 토큰 기반 연결을 전제로 합니다. Threads는 아이디와 비밀번호 직접 로그인이 아니라 Instagram/Meta 계정 인증 기반 연결을 전제로 합니다.

## 구현된 MVP

- `/login` 팀 접근 비밀번호 로그인
- `auth=true` httpOnly 쿠키 저장
- `/dashboard` 인증 보호
- 로그아웃
- `/api/accounts/status` 환경 변수 기반 X / Threads 연결 상태 확인
- `/api/auth/threads/deauthorize` Threads 제거 콜백
- `/api/auth/threads/delete-data` Threads 데이터 삭제 콜백
- `/data-deletion` 데이터 삭제 요청 상태 페이지
- 게시글 작성 textarea
- 실시간 글자 수 표시
- X / Threads 업로드 대상 선택
- 게시글 미리보기
- `/api/posts/publish` 게시 API
- X는 환경 변수가 있으면 실제 X API `POST /2/tweets` 호출
- Threads는 아직 mock 게시 유지
- 플랫폼별 성공 / 실패 결과 표시
- `/api/posts/history` 메모리 기반 게시 기록
- `lib/publisher/xPublisher.ts`, `lib/publisher/threadsPublisher.ts` 게시 로직 분리

## 실제 API 연동 위치

X API 연동은 `lib/publisher/xPublisher.ts`의 `publishToX`에서 처리합니다. OAuth 1.0a 소비자 키, 액세스 토큰, Bearer Token을 Vercel Environment Variables에 등록해야 합니다.

실제 Threads API 연동은 `lib/publisher/threadsPublisher.ts`의 `publishToThreads`를 교체하면 됩니다.

환경 변수 검증 기준은 `lib/accounts.ts`에 분리되어 있습니다.

## Vercel 배포

1. GitHub 저장소에 프로젝트를 푸시합니다.
2. Vercel에서 새 프로젝트를 생성하고 저장소를 연결합니다.
3. Environment Variables에 `.env.example`의 키를 등록합니다.
4. `APP_PASSWORD`는 팀에서 사용할 실제 비밀번호로 변경합니다.
5. 초기 MVP에서는 X / Threads 토큰이 없으면 대시보드에 "연결 필요"로 표시됩니다.
6. 배포 후 `/login`에서 팀 비밀번호로 접속합니다.

## Meta Threads 앱 설정 URL

Threads 앱 설정에서 아래 URL을 사용할 수 있습니다.

```txt
리디렉션 콜백 URL:
https://multi-sns-auto-upload.vercel.app/api/auth/threads/callback

제거 콜백 URL:
https://multi-sns-auto-upload.vercel.app/api/auth/threads/deauthorize

삭제 콜백 URL:
https://multi-sns-auto-upload.vercel.app/api/auth/threads/delete-data
```

## 게시 기록 저장 방식

MVP의 게시 기록은 `lib/postHistory.ts`의 메모리 배열에 저장됩니다. Vercel 서버리스 환경에서는 인스턴스 재시작, 스케일아웃, 콜드 스타트 시 메모리 데이터가 유지되지 않습니다. 운영 단계에서는 Supabase, Neon, PlanetScale 같은 외부 DB로 교체하는 것이 좋습니다.

## 다음 작업 후보

- 이미지 첨부 UI와 mock 처리
- 플랫폼별 글자 수 제한 정책
- 게시 전 확인 모달
- 실패한 게시글 재시도
- 자주 쓰는 해시태그 입력 보조
- 게시글 템플릿 저장
- 예약 게시 구조
- 실제 X OAuth / API 게시 연동
- 실제 Meta / Instagram 기반 Threads 인증 연동

## 주요 파일

- `app/login/page.tsx`
- `app/dashboard/page.tsx`
- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/accounts/status/route.ts`
- `app/api/posts/publish/route.ts`
- `app/api/posts/history/route.ts`
- `components/PostComposer.tsx`
- `components/PostHistoryList.tsx`
- `lib/accounts.ts`
- `lib/postHistory.ts`
- `lib/publisher/xPublisher.ts`
- `lib/publisher/threadsPublisher.ts`
