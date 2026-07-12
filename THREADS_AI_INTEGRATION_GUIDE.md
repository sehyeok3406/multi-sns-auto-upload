# Threads AI 자동 게시 연동 정리

이 문서는 프로그래머 팀원이 AI를 SNS auto upload 사이트에 연결해서 Threads에 자동 또는 반자동으로 게시물을 올릴 때 알아야 할 내용을 정리한 문서입니다.

현재 기준으로 X는 제외하고 Threads만 다룹니다.

## 확인해야 할 핵심 파일 5개

1. `app/api/posts/publish/route.ts`
   - AI가 최종적으로 호출할 게시 API입니다.
   - 텍스트, 타래, 이미지, 스포일러, Topic Tag 검증을 처리합니다.
   - Threads 게시 함수를 호출합니다.
   - 게시 기록을 저장합니다.

2. `app/api/uploads/images/route.ts`
   - 이미지 업로드 API입니다.
   - Vercel Blob에 이미지를 업로드합니다.
   - Threads API에 넘길 공개 이미지 URL을 반환합니다.

3. `lib/publisher/threadsPublisher.ts`
   - 실제 Threads 게시 로직입니다.
   - Threads 컨테이너를 생성합니다.
   - `threads_publish`를 호출합니다.
   - 타래는 `reply_to_id`로 이어 붙입니다.
   - 이미지, Topic Tag, 스포일러 처리를 담당합니다.

4. `lib/publisher/threadsInbox.ts`
   - Threads 댓글함 로직입니다.
   - 내 게시물 조회를 처리합니다.
   - 댓글/대화 조회를 처리합니다.
   - 답글 작성을 처리합니다.

5. `lib/publisher/threadsInsights.ts`
   - Threads 게시 성과 조회 로직입니다.
   - 조회수, 좋아요, 댓글, 리포스트, 인용, 공유 지표를 조회합니다.
   - 반응 합계와 반응률을 계산합니다.

## AI가 호출할 메인 API

```http
POST /api/posts/publish
Content-Type: application/json
Cookie: auth=true
```

현재는 쿠키 로그인 기반입니다.

서버 또는 AI 자동화에서 안정적으로 쓰려면 추후 `AI_API_KEY` 같은 서버용 인증 방식을 추가하는 것을 추천합니다.

## 게시 요청 예시

```json
{
  "content": "첫 번째 글입니다.",
  "platforms": ["threads"],
  "topicTag": "AI Threads",
  "pollAttachment": {
    "option_a": "첫 번째 선택지",
    "option_b": "두 번째 선택지",
    "option_c": "세 번째 선택지",
    "option_d": "네 번째 선택지"
  },
  "textAttachment": {
    "plaintext": "긴 글 첨부 내용입니다.",
    "link_attachment_url": "https://example.com"
  },
  "threadItems": [
    "두 번째 타래 글입니다.",
    "세 번째 타래 글입니다."
  ],
  "threadMedia": [
    {},
    {
      "imageUrl": "https://example.com/image-2.png",
      "imageName": "image-2.png",
      "isImageSpoiler": false
    },
    {
      "imageUrl": "https://example.com/image-3.png",
      "imageName": "image-3.png",
      "isImageSpoiler": true
    }
  ],
  "spoilerRanges": [
    [],
    [{ "start": 0, "end": 5 }],
    []
  ],
  "createdAt": "2026-07-11T00:00:00.000Z"
}
```

## 필드 설명

### `content`

1번 글 본문입니다.

Threads 기준 500자 이하입니다.

### `platforms`

현재는 `["threads"]`만 사용하면 됩니다.

X는 제외합니다.

### `topicTag`

Threads Topic Tag입니다.

선택값이며 게시글당 1개만 사용합니다.

### `pollAttachment`

Threads 설문 선택지입니다.

선택값이며 1번 글에 붙습니다.

선택지는 최소 2개, 최대 4개입니다.

각 선택지는 25자 이하입니다.

설문은 텍스트 게시 전용이므로 이미지 첨부와 함께 사용하지 않습니다.

필드:

- `option_a`
- `option_b`
- `option_c`
- `option_d`

`option_a`, `option_b`는 필수입니다.

`option_c`, `option_d`는 선택입니다.

### `textAttachment`

Threads 텍스트 첨부입니다.

선택값이며 1번 글에 붙습니다.

긴 글 본문은 최대 10,000자입니다.

선택적으로 링크 URL을 함께 넣을 수 있습니다.

설문 및 이미지 첨부와 함께 사용하지 않습니다.

필드:

- `plaintext`
- `link_attachment_url`

`plaintext`는 필수입니다.

`link_attachment_url`은 선택입니다.

### `threadItems`

2번 글부터 들어가는 타래 글 목록입니다.

각 항목도 500자 이하입니다.

### `threadMedia`

각 글 블록별 이미지 정보입니다.

배열 순서는 `[1번 글 이미지, 2번 글 이미지, 3번 글 이미지...]`입니다.

이미지가 없으면 `{}`로 둡니다.

### `threadMedia[].imageUrl`

Threads API에 넘길 공개 HTTPS 이미지 URL입니다.

먼저 `/api/uploads/images`로 이미지를 업로드해서 받은 URL을 사용합니다.

### `threadMedia[].imageName`

표시용 이미지 파일명입니다.

### `threadMedia[].isImageSpoiler`

이미지 스포일러 여부입니다.

### `spoilerRanges`

각 글 블록별 텍스트 스포일러 범위입니다.

배열 순서는 글 순서와 동일합니다.

`{ start, end }`는 문자열 인덱스 기준입니다.

### `createdAt`

작성 시각입니다.

없으면 서버에서 현재 시각으로 처리됩니다.

## 이미지 업로드 API

```http
POST /api/uploads/images
Content-Type: multipart/form-data
Cookie: auth=true
```

FormData:

```txt
file=<이미지 파일>
```

응답 예시:

```json
{
  "image": {
    "url": "https://...",
    "pathname": "threads/...",
    "contentType": "image/png",
    "size": 123456
  }
}
```

제한:

- JPG, PNG, WebP만 허용
- 8MB 이하
- 반환된 `image.url`을 `/api/posts/publish`의 `threadMedia[].imageUrl`에 넣으면 됩니다.

## 현재 구현된 Threads 기능

- 텍스트 게시
- 블록별 이미지 첨부
- 타래 작성
- 추가 글을 `reply_to_id`로 이어 붙이기
- Topic Tag 게시
- 설문 게시
- 텍스트 첨부 게시
- Threads 500자 제한
- 450자 이상 경고
- 500자 초과 게시 차단
- 텍스트 스포일러
- 이미지 스포일러
- 게시 결과 표시
- 에러 상세 표시
- 게시 기록 저장
- 내 Threads 게시물 조회
- 댓글/대화 조회
- 댓글 답장 작성
- 게시 성과 조회
  - views
  - likes
  - replies
  - reposts
  - quotes
  - shares
  - engagement
  - engagementRate

## 현재 필요한 Threads 권한

게시 기능:

- `threads_basic`
- `threads_content_publish`

댓글함:

- `threads_read_replies`
- `threads_manage_replies`

인사이트:

- `threads_manage_insights`

## 필요한 환경 변수

```env
THREADS_ACCESS_TOKEN=
THREADS_USER_ID=
META_APP_ID=
META_APP_SECRET=

BLOB_READ_WRITE_TOKEN=
BLOB_STORE_ID=
BLOB_WEBHOOK_PUBLIC_KEY=
```

참고:

- `THREADS_ACCESS_TOKEN`은 long-lived token 사용을 권장합니다.
- long-lived token은 보통 60일 유효합니다.
- 권한을 추가하면 token을 다시 발급해야 합니다.
- 이미지 업로드는 Vercel Blob 공개 URL을 Threads API에 넘기는 구조입니다.

## Threads 공식 API 흐름

텍스트/이미지 게시 흐름:

1. `POST /{threads-user-id}/threads`
   - 미디어 컨테이너 생성
   - `media_type`: `TEXT` 또는 `IMAGE`
   - `text`
   - `image_url`
   - `topic_tag`
   - `poll_attachment`
   - `text_attachment`
   - `reply_to_id`
   - `text_entities`
   - `is_spoiler_media`

2. `POST /{threads-user-id}/threads_publish`
   - 컨테이너 발행
   - `creation_id` 전달

타래 흐름:

1. 1번 글 게시
2. 1번 글의 ID를 받음
3. 2번 글 컨테이너 생성 시 `reply_to_id`에 1번 글 ID 전달
4. 2번 글 발행
5. 이후 글도 바로 앞 글 ID를 `reply_to_id`로 전달

## AI 연동 추천 방식

추천 1차 구조:

1. AI가 게시글 초안 생성
2. 서버에서 금칙어/중복/글자 수 검사
3. 사람이 화면에서 확인
4. 사람이 게시 버튼 클릭

추천 2차 구조:

1. AI가 게시글 초안 생성
2. 위험도가 낮은 카테고리만 자동 게시
3. 민감 주제는 사람 승인 필요
4. 게시 로그 저장

추천 추가 구현:

- `AI_API_KEY` 기반 서버 인증
- `draftOnly` 옵션
- `requiresApproval` 옵션
- `scheduledAt` 예약 게시 필드
- 중복 게시 방지
- 하루 게시 수 제한
- 금칙어 필터
- 자동 게시 로그 저장
- 실패 재시도 큐

## 공식 문서 참고

- [Threads Publishing Reference](https://developers.facebook.com/docs/threads/reference/publishing)
- [Threads Posts](https://developers.facebook.com/documentation/threads/posts)
- [Threads Long-Lived Tokens](https://developers.facebook.com/documentation/threads/get-started/long-lived-tokens)
