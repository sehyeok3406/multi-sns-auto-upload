import type {
  PublishErrorCategory,
  PublishErrorDetail,
} from "@/lib/types";

type ErrorPresentation = {
  errorKey: string;
  category: PublishErrorCategory;
  categoryLabel: string;
  displayTitle: string;
  summary: string;
  actions: string[];
  retryable: boolean;
};

function includesAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

function getSearchText(detail: PublishErrorDetail) {
  return [
    detail.source,
    detail.stage,
    detail.stageLabel,
    detail.title,
    detail.message,
    detail.userMessage,
    detail.type,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function classifyError(detail: PublishErrorDetail): ErrorPresentation {
  const text = getSearchText(detail);
  const code = String(detail.code ?? "");
  const subcode = String(detail.subcode ?? "");
  const isMediaContext =
    includesAny(text, [
      "image",
      "video",
      "media",
      "이미지",
      "영상",
      "미디어",
      "blob",
    ]) ||
    includesAny(detail.stage ?? "", ["upload"]) ||
    detail.stage === "container-status";

  if (
    includesAny(text, [
      "is not configured",
      "not configured",
      "missing environment",
      "환경 변수",
      "blob_read_write_token",
    ]) || detail.stage === "configuration"
  ) {
    return {
      errorKey: "SERVER_CONFIGURATION_MISSING",
      category: "configuration",
      categoryLabel: "서버 설정",
      displayTitle: "서버 설정값이 누락되었습니다",
      summary: "배포 환경에 필요한 토큰 또는 계정 정보가 없어 요청을 시작하지 못했습니다.",
      actions: [
        "Vercel Environment Variables에서 안내된 환경 변수가 있는지 확인합니다.",
        "값을 수정했다면 Production 환경에 적용한 뒤 Redeploy합니다.",
        "재배포 후 대시보드의 계정 연결 상태를 다시 확인합니다.",
      ],
      retryable: false,
    };
  }

  if (
    detail.httpStatus === 401 ||
    code === "190" ||
    includesAny(text, [
      "invalid oauth",
      "access token has expired",
      "invalid access token",
      "token expired",
      "토큰이 만료",
    ])
  ) {
    return {
      errorKey: "THREADS_TOKEN_INVALID",
      category: "authentication",
      categoryLabel: "인증",
      displayTitle: "Threads 인증 토큰을 사용할 수 없습니다",
      summary: "액세스 토큰이 만료되었거나 잘못되어 Threads가 요청을 인증하지 못했습니다.",
      actions: [
        "Threads long-lived access token을 새로 발급하거나 갱신합니다.",
        "Vercel의 THREADS_ACCESS_TOKEN 값을 새 토큰으로 교체합니다.",
        "Redeploy한 뒤 계정 연결 상태와 게시를 다시 확인합니다.",
      ],
      retryable: false,
    };
  }

  if (
    includesAny(text, [
      "nonexisting field",
      "tried accessing nonexisting",
      "unknown field",
      "does not exist on type",
    ])
  ) {
    return {
      errorKey: "THREADS_API_FIELD_MISMATCH",
      category: "service",
      categoryLabel: "API 호환성",
      displayTitle: "Threads API 요청 필드가 현재 API와 맞지 않습니다",
      summary: "앱 코드가 Threads API에 존재하지 않는 필드를 조회했습니다. 같은 요청을 반복해도 해결되지 않습니다.",
      actions: [
        "아래 기술정보를 복사해 개발 담당자에게 전달합니다.",
        "개발 담당자는 오류가 난 단계의 Graph API fields 또는 파라미터를 확인합니다.",
        "수정 버전이 배포된 뒤 다시 시도합니다.",
      ],
      retryable: false,
    };
  }

  if (
    code === "10" ||
    code === "200" ||
    detail.httpStatus === 403 ||
    includesAny(text, [
      "permission",
      "permissions error",
      "not authorized",
      "insufficient scope",
      "권한",
    ])
  ) {
    return {
      errorKey: "THREADS_PERMISSION_DENIED",
      category: "permission",
      categoryLabel: "권한",
      displayTitle: "Threads 앱 권한이 부족합니다",
      summary: "현재 토큰에 이 기능을 실행할 권한이 없거나 앱 테스트 사용자가 올바르게 연결되지 않았습니다.",
      actions: [
        "Meta for Developers에서 필요한 Threads 권한이 추가되어 있는지 확인합니다.",
        "사용 계정이 앱의 관리자·개발자·테스터로 등록되고 초대를 수락했는지 확인합니다.",
        "권한 변경 후 토큰을 다시 발급하고 Vercel에 반영한 뒤 Redeploy합니다.",
      ],
      retryable: false,
    };
  }

  if (
    detail.httpStatus === 429 ||
    ["4", "17", "32", "613"].includes(code) ||
    includesAny(text, ["rate limit", "too many requests", "quota", "호출 제한"])
  ) {
    return {
      errorKey: "THREADS_RATE_LIMITED",
      category: "rate-limit",
      categoryLabel: "사용량 제한",
      displayTitle: "Threads API 사용량 제한에 도달했습니다",
      summary: "짧은 시간에 요청이 많았거나 계정의 게시·답글 한도를 초과했습니다.",
      actions: [
        "반복 게시를 멈추고 잠시 후 다시 시도합니다.",
        "같은 게시물이 실제로 올라갔는지 Threads에서 먼저 확인합니다.",
        "오류가 계속되면 Threads publishing quota를 확인합니다.",
      ],
      retryable: true,
    };
  }

  if (
    code === "24" ||
    subcode === "4279009" ||
    includesAny(text, [
      "media with id",
      "cannot be found",
      "does not exist",
      "requested resource does not exist",
      "reply_to_id",
    ])
  ) {
    return {
      errorKey: "THREADS_RESOURCE_NOT_FOUND",
      category: "not-found",
      categoryLabel: "대상 없음",
      displayTitle: "Threads가 게시물 또는 미디어 대상을 찾지 못했습니다",
      summary: "게시 컨테이너가 아직 준비되지 않았거나 답글 대상 ID가 현재 계정에서 접근할 수 없는 상태입니다.",
      actions: [
        "Threads 앱에서 일부 게시물이 이미 올라갔는지 먼저 확인합니다.",
        "답글이라면 원글·이전 타래가 삭제되지 않았고 같은 계정 소유인지 확인합니다.",
        "잠시 기다린 뒤 한 번만 다시 시도하고, 반복되면 기술정보를 개발 담당자에게 전달합니다.",
      ],
      retryable: true,
    };
  }

  if (
    ["368", "389"].includes(code) ||
    includesAny(text, [
      "spam",
      "policy",
      "blocked",
      "restricted",
      "integrity",
      "정책",
      "제한되었습니다",
    ])
  ) {
    return {
      errorKey: "THREADS_POLICY_BLOCKED",
      category: "policy",
      categoryLabel: "정책 제한",
      displayTitle: "Threads 정책 또는 계정 제한으로 게시가 차단되었습니다",
      summary: "게시 내용, 반복 요청 또는 계정 상태 때문에 Threads가 작업을 허용하지 않았습니다.",
      actions: [
        "같은 내용을 반복 게시하지 말고 Threads 앱에서 계정 상태 알림을 확인합니다.",
        "문구·링크·해시태그·이미지를 바꿔 정책 위반 가능성을 줄입니다.",
        "계정 제한이 표시되면 해제된 뒤 다시 시도합니다.",
      ],
      retryable: false,
    };
  }

  if (
    includesAny(text, [
      "timeout",
      "timed out",
      "failed to fetch",
      "network",
      "econnreset",
      "fetch failed",
      "네트워크",
    ]) || detail.stage === "network"
  ) {
    return {
      errorKey: "NETWORK_REQUEST_FAILED",
      category: "network",
      categoryLabel: "네트워크",
      displayTitle: "외부 API 연결이 완료되지 않았습니다",
      summary: "Vercel과 Threads 또는 Blob 저장소 사이의 연결이 끊기거나 응답 시간이 초과되었습니다.",
      actions: [
        "Threads에 게시물이 실제로 생성되었는지 먼저 확인합니다.",
        "잠시 후 한 번만 다시 시도합니다.",
        "반복되면 발생 시각과 Trace 정보를 개발 담당자에게 전달합니다.",
      ],
      retryable: true,
    };
  }

  if (detail.httpStatus === 413) {
    return {
      errorKey: "MEDIA_FILE_TOO_LARGE",
      category: "media",
      categoryLabel: "미디어",
      displayTitle: "첨부 파일 용량이 너무 큽니다",
      summary: "업로드 서버 또는 Threads가 허용하는 파일 크기를 초과했습니다.",
      actions: [
        "이미지 용량을 8MB 이하로 줄입니다.",
        "JPG, PNG 또는 WebP 형식으로 다시 저장합니다.",
        "파일을 다시 선택해 업로드합니다.",
      ],
      retryable: false,
    };
  }

  if (isMediaContext) {
    return {
      errorKey: "MEDIA_PROCESSING_FAILED",
      category: "media",
      categoryLabel: "미디어",
      displayTitle: "이미지를 업로드하거나 처리하지 못했습니다",
      summary: "저장소 업로드, 공개 URL 접근 또는 Threads 미디어 처리 단계에서 실패했습니다.",
      actions: [
        "JPG, PNG, WebP 형식과 8MB 이하 용량인지 확인합니다.",
        "이미지를 삭제한 뒤 다시 첨부해 새 공개 URL을 생성합니다.",
        "반복되면 아래 단계와 API 메시지를 개발 담당자에게 전달합니다.",
      ],
      retryable: true,
    };
  }

  if (
    detail.httpStatus === 400 ||
    code === "100" ||
    includesAny(text, ["invalid parameter", "invalid request", "잘못된 요청"])
  ) {
    return {
      errorKey: "THREADS_REQUEST_INVALID",
      category: "validation",
      categoryLabel: "입력값",
      displayTitle: "Threads 요청값이 올바르지 않습니다",
      summary: "글, 주제, 설문, 스포일러 또는 답글 대상 중 하나가 API 조건에 맞지 않습니다.",
      actions: [
        "글자 수와 필수 입력값을 확인합니다.",
        "주제·설문·스포일러·첨부 기능을 하나씩 제외해 문제가 되는 항목을 확인합니다.",
        "API 메시지에 특정 파라미터가 표시되면 기술정보와 함께 개발 담당자에게 전달합니다.",
      ],
      retryable: false,
    };
  }

  if (
    (detail.httpStatus !== undefined && detail.httpStatus >= 500) ||
    ["1", "2"].includes(code) ||
    includesAny(text, [
      "did not return",
      "empty response",
      "반환하지 않았",
      "응답 본문이 비어",
    ])
  ) {
    return {
      errorKey: "EXTERNAL_SERVICE_UNAVAILABLE",
      category: "service",
      categoryLabel: "외부 서비스",
      displayTitle: "Threads 또는 저장소 서버가 일시적으로 응답하지 않습니다",
      summary: "외부 서비스의 일시적인 장애로 요청을 완료하지 못했습니다.",
      actions: [
        "Threads에 결과가 이미 반영되었는지 먼저 확인합니다.",
        "잠시 후 한 번만 다시 시도합니다.",
        "장시간 지속되면 Meta 또는 Vercel 서비스 상태를 확인합니다.",
      ],
      retryable: true,
    };
  }

  return {
    errorKey: "UNCLASSIFIED_ERROR",
    category: "unknown",
    categoryLabel: "확인 필요",
    displayTitle: "처리 중 예상하지 못한 오류가 발생했습니다",
    summary: "현재 정보만으로 원인을 자동 분류하지 못했습니다. 기술정보를 전달하면 추가 확인이 가능합니다.",
    actions: [
      "동일 작업을 반복하기 전에 실제 게시·댓글 결과를 먼저 확인합니다.",
      "아래 오류 정보를 복사해 개발 담당자에게 전달합니다.",
      "발생한 작업과 선택한 옵션도 함께 알려줍니다.",
    ],
    retryable: false,
  };
}

export function createPublishErrorDetail(
  detail: PublishErrorDetail,
): PublishErrorDetail {
  const presentation = classifyError(detail);
  const actions =
    detail.actions && detail.actions.length > 0
      ? detail.actions
      : detail.retryHint
        ? [
            detail.retryHint,
            ...presentation.actions.filter(
              (action) => action !== detail.retryHint,
            ),
          ].slice(0, 3)
        : presentation.actions;

  return {
    occurredAt: detail.occurredAt ?? new Date().toISOString(),
    ...detail,
    errorKey: detail.errorKey ?? presentation.errorKey,
    category: detail.category ?? presentation.category,
    categoryLabel: detail.categoryLabel ?? presentation.categoryLabel,
    displayTitle: detail.displayTitle ?? presentation.displayTitle,
    summary: detail.summary ?? presentation.summary,
    actions,
    retryable: detail.retryable ?? presentation.retryable,
    retryHint: detail.retryHint ?? presentation.actions[0],
  };
}

export function createErrorDetailFromUnknown(
  error: unknown,
  context: Partial<PublishErrorDetail> = {},
) {
  const message =
    error instanceof Error ? error.message : String(error || "Unknown error");
  const threadsErrorMatch = message.match(
    /Threads API request failed \((\d+)(?:,\s*code\s+([^/),]+)(?:\/([^)]+))?)?\)/i,
  );

  return createPublishErrorDetail({
    source: "SNS auto upload",
    message,
    ...context,
    httpStatus:
      context.httpStatus ??
      (threadsErrorMatch?.[1] ? Number(threadsErrorMatch[1]) : undefined),
    code: context.code ?? threadsErrorMatch?.[2]?.trim(),
    subcode: context.subcode ?? threadsErrorMatch?.[3]?.trim(),
  });
}

export function createAppSessionErrorDetail(
  context: Partial<PublishErrorDetail> = {},
) {
  return createPublishErrorDetail({
    source: "SNS auto upload",
    errorKey: "APP_SESSION_EXPIRED",
    category: "authentication",
    categoryLabel: "웹사이트 로그인",
    displayTitle: "웹사이트 로그인이 만료되었습니다",
    summary: "요청을 계속하려면 SNS auto upload에 다시 로그인해야 합니다.",
    actions: [
      "로그인 페이지에서 팀 비밀번호로 다시 로그인합니다.",
      "작업 화면으로 돌아와 요청을 다시 시도합니다.",
    ],
    retryHint: "로그인 페이지에서 팀 비밀번호로 다시 로그인합니다.",
    retryable: false,
    httpStatus: 401,
    message: "로그인 세션이 만료되었습니다.",
    ...context,
  });
}
