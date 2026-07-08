# SNS auto upload

팀에서 X와 Threads 게시 흐름을 한 화면에서 확인하기 위한 Next.js MVP입니다. 현재 버전은 Threads 게시, 이미지 첨부, Topic Tag, 댓글함 흐름을 실제 Threads API 기준으로 연결합니다. X 게시 기능은 코드에는 남아 있지만 운영 UI에서는 보류 상태입니다.

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

GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=

BLOB_STORE_ID=
BLOB_WEBHOOK_PUBLIC_KEY=
BLOB_READ_WRITE_TOKEN=
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
- `/api/author-presets` Google Sheets 기반 작성자 프리셋 저장/조회
- 게시글 작성 textarea
- 작성자 프리셋 선택 및 헤드라인 자동 삽입
- 주제 선택 및 Threads Topic Tag 게시
- Threads 이미지 첨부 및 Vercel Blob 업로드
- Threads 댓글함: 내 게시물 조회, 댓글/대화 조회, 답글 게시
- 실시간 글자 수 표시
- X / Threads 업로드 대상 선택
- 게시글 미리보기
- `/api/posts/publish` 게시 API
- X는 환경 변수가 있으면 실제 X API `POST /2/tweets` 호출
- Threads는 환경 변수가 있으면 실제 Threads API 게시 호출
- 플랫폼별 성공 / 실패 결과 표시
- `/api/posts/history` 메모리 기반 게시 기록
- `lib/publisher/xPublisher.ts`, `lib/publisher/threadsPublisher.ts` 게시 로직 분리

## 실제 API 연동 위치

X API 연동은 `lib/publisher/xPublisher.ts`의 `publishToX`에서 처리합니다. OAuth 1.0a 소비자 키, 액세스 토큰, Bearer Token을 Vercel Environment Variables에 등록해야 합니다.

Threads API 연동은 `lib/publisher/threadsPublisher.ts`의 `publishToThreads`에서 처리합니다. 텍스트 게시 또는 단일 이미지 게시 기준으로 컨테이너 생성 후 publish를 호출합니다. 이미지 첨부 시 Vercel Blob에 업로드된 공개 URL을 Threads API의 `image_url`로 전달합니다. 주제 선택 시 Threads API의 `topic_tag` 파라미터로 함께 전달합니다.

Threads 댓글함은 `lib/publisher/threadsInbox.ts`에서 처리합니다. 내 게시물 조회는 `/{threads-user-id}/threads`, 댓글/대화 조회는 `/{media-id}/conversation`, 답글 작성은 `reply_to_id`가 포함된 컨테이너 생성 후 `threads_publish` 호출 구조를 사용합니다. 댓글함을 쓰려면 Threads 토큰에 `threads_read_replies`, `threads_manage_replies` 권한이 포함되어 있어야 합니다.

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

## 작성자 프리셋 저장소

작성자 프리셋은 Google Sheets에 저장합니다. 시트에는 `author_presets` 탭을 만들고 첫 행을 아래처럼 구성합니다.

```txt
id | name | headline | createdAt | updatedAt
```

Vercel에는 아래 환경 변수가 필요합니다.

```env
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
```

Google Sheets는 서비스 계정 이메일에 편집자 권한으로 공유되어 있어야 합니다. `GOOGLE_PRIVATE_KEY`는 줄바꿈이 포함된 private key이며, Vercel 환경 변수에 입력할 때 `\n` 문자열 형태로 저장해도 앱에서 자동으로 실제 줄바꿈으로 변환합니다.

## 이미지 첨부 저장소

Threads 이미지 게시에는 공개 이미지 URL이 필요합니다. 이 프로젝트는 Vercel Blob Public Store에 이미지를 업로드한 뒤 반환된 URL을 Threads API에 전달합니다.

Vercel Storage에서 Blob Store를 만들고 프로젝트에 연결하면 보통 아래 환경 변수가 자동으로 추가됩니다.

```env
BLOB_STORE_ID=
BLOB_WEBHOOK_PUBLIC_KEY=
```

Vercel 배포 환경에서는 OIDC 기반 인증으로 Blob 업로드가 동작합니다. 로컬에서 Blob 업로드까지 테스트하려면 `BLOB_READ_WRITE_TOKEN`을 추가로 설정하는 것이 편합니다.

## Threads Topic Tag

게시글 작성 화면에서 주제를 선택하면 Threads 게시 요청에 Topic Tag를 함께 전달합니다. 기본 주제 외에 직접 입력도 가능하며, 앱에서는 50자 이하와 일부 특수문자 제한을 검증합니다. Topic Tag는 게시글당 1개만 사용합니다.

## Threads 댓글함

대시보드의 댓글함은 Threads API에서 최근 게시물을 불러오고, 선택한 게시물의 대화를 조회한 뒤 원글 또는 특정 댓글에 답글을 게시합니다. Meta 앱에 `threads_read_replies`, `threads_manage_replies` 권한을 추가한 뒤 새로 발급한 long-lived token을 `THREADS_ACCESS_TOKEN`에 반영해야 합니다.

## 게시 기록 저장 방식

MVP의 게시 기록은 `lib/postHistory.ts`의 메모리 배열에 저장됩니다. Vercel 서버리스 환경에서는 인스턴스 재시작, 스케일아웃, 콜드 스타트 시 메모리 데이터가 유지되지 않습니다. 운영 단계에서는 Supabase, Neon, PlanetScale 같은 외부 DB로 교체하는 것이 좋습니다.

## 다음 작업 후보

- 다중 이미지 첨부 및 캐러셀 게시
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
- `components/ThreadsInbox.tsx`
- `lib/accounts.ts`
- `lib/postHistory.ts`
- `lib/publisher/xPublisher.ts`
- `lib/publisher/threadsPublisher.ts`
- `lib/publisher/threadsInbox.ts`
