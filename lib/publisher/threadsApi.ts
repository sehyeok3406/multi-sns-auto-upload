import type { PublishErrorDetail } from "@/lib/types";

export const THREADS_GRAPH_BASE_URL = "https://graph.threads.net/v1.0";

export type ThreadsApiError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  error_user_title?: string;
  error_user_msg?: string;
  fbtrace_id?: string;
};

export type ThreadsApiResponse<T> =
  | (T & {
      error?: ThreadsApiError;
    })
  | string;

type ThreadsContainerStatusResponse = {
  status_code?: string;
  error_message?: string;
};

type ThreadsRequestResult<T> = {
  ok: boolean;
  status: number;
  body: ThreadsApiResponse<T>;
};

type ThreadsContainerReadinessResult = {
  ok: boolean;
  attempts: number;
  statusCode?: string;
  errorDetail?: PublishErrorDetail;
};

type ThreadsContainerPublishResult<T> = ThreadsRequestResult<T> & {
  attempts: number;
  readiness: ThreadsContainerReadinessResult;
  readinessErrorDetail?: PublishErrorDetail;
};

const THREADS_CONTAINER_STATUS_DELAYS_MS = [
  1000, 1500, 2500, 4000, 6000, 8000,
];
const THREADS_CONTAINER_PUBLISH_RETRY_DELAYS_MS = [1500, 2500, 4000, 6000];

export function getRequiredEnv(key: string) {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`${key} is not configured.`);
  }

  return value;
}

export function getThreadsCredentials() {
  return {
    userId: getRequiredEnv("THREADS_USER_ID"),
    accessToken: getRequiredEnv("THREADS_ACCESS_TOKEN"),
  };
}

export async function readThreadsResponse<T>(
  response: Response,
): Promise<ThreadsApiResponse<T>> {
  const text = await response.text();

  if (!text) {
    return "" as ThreadsApiResponse<T>;
  }

  try {
    return JSON.parse(text) as ThreadsApiResponse<T>;
  } catch {
    return text;
  }
}

export function createThreadsErrorMessage<T>(
  status: number,
  response: ThreadsApiResponse<T>,
) {
  const detail = createThreadsErrorDetail(status, response);
  const codeLabel = detail.code
    ? `, code ${detail.code}${detail.subcode ? `/${detail.subcode}` : ""}`
    : "";
  const message = detail.userMessage ?? detail.message ?? detail.type;

  return `Threads API request failed (${status}${codeLabel})${
    message ? `: ${message}` : "."
  }`;
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function getThreadsApiError<T>(response: ThreadsApiResponse<T>) {
  return typeof response === "string" ? undefined : response.error;
}

export function isThreadsContainerNotReadyError<T>(
  response: ThreadsApiResponse<T>,
) {
  const error = getThreadsApiError(response);
  const message =
    (typeof response === "string" ? response : error?.message ?? "")
      .toLowerCase();

  return (
    error?.error_subcode === 4279009 ||
    (error?.code === 24 && message.includes("cannot be found")) ||
    message.includes("media with id") ||
    message.includes("media id is not available")
  );
}

function isRetryableContainerStatusError<T>(
  status: number,
  response: ThreadsApiResponse<T>,
) {
  const error = getThreadsApiError(response);

  return (
    status === 429 ||
    status >= 500 ||
    isThreadsContainerNotReadyError(response) ||
    error?.error_subcode === 33
  );
}

function getRetryHint(detail: PublishErrorDetail) {
  if (detail.httpStatus === 401 || detail.code === 190) {
    return "Threads access token이 만료되었거나 잘못되었습니다. long-lived token을 다시 발급해 Vercel 환경 변수에 반영하세요.";
  }

  if (detail.code === 10 || detail.code === 200) {
    return "Meta 앱 권한 또는 테스트 사용자 권한을 확인하세요. 권한을 추가했다면 token도 다시 발급해야 합니다.";
  }

  if (detail.code === 24) {
    return "요청한 게시물/컨테이너 ID를 찾지 못했습니다. reply_to_id, 토큰 소유 계정, 게시 직후 대기 시간을 확인하세요.";
  }

  if (detail.code === 100 || detail.httpStatus === 400) {
    return "요청 파라미터가 올바른지 확인하세요. 글자 수, topic tag, spoiler 범위, 이미지 URL이 주요 원인입니다.";
  }

  if (detail.httpStatus === 429) {
    return "API 호출 제한에 걸렸을 수 있습니다. 잠시 후 다시 시도하세요.";
  }

  return undefined;
}

function createThreadsContainerStatusError(
  statusCode: string,
  context: Partial<PublishErrorDetail>,
): PublishErrorDetail {
  const detail: PublishErrorDetail = {
    source: "Threads API",
    stage: "container-status",
    stageLabel: "컨테이너 준비 확인",
    message: `Threads 컨테이너 상태가 ${statusCode}입니다.`,
    retryHint:
      statusCode === "ERROR"
        ? "이미지 URL이 공개 접근 가능한지, 파일 형식과 용량이 Threads 조건에 맞는지 확인하세요."
        : "컨테이너가 만료되었습니다. 같은 게시글로 다시 게시를 시도하세요.",
    ...context,
  };

  return detail;
}

export function createThreadsErrorDetail<T>(
  status: number,
  response: ThreadsApiResponse<T>,
  context: Partial<PublishErrorDetail> = {},
): PublishErrorDetail {
  if (typeof response === "string") {
    const detail: PublishErrorDetail = {
      source: "Threads API",
      httpStatus: status,
      message: response || "Empty response body",
      ...context,
    };

    return {
      ...detail,
      retryHint: detail.retryHint ?? getRetryHint(detail),
    };
  }

  const error = response.error;
  const detail: PublishErrorDetail = {
    source: "Threads API",
    httpStatus: status,
    code: error?.code,
    subcode: error?.error_subcode,
    type: error?.type,
    traceId: error?.fbtrace_id,
    title: error?.error_user_title,
    message: error?.message ?? error?.type,
    userMessage: error?.error_user_msg,
    ...context,
  };

  return {
    ...detail,
    retryHint: detail.retryHint ?? getRetryHint(detail),
  };
}

export async function postThreadsForm<T>(
  url: string,
  params: Record<string, string>,
): Promise<{ ok: boolean; status: number; body: ThreadsApiResponse<T> }> {
  const body = new URLSearchParams(params);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  return {
    ok: response.ok,
    status: response.status,
    body: await readThreadsResponse<T>(response),
  };
}

export async function getThreadsJson<T>(
  url: string,
  params: Record<string, string>,
): Promise<{ ok: boolean; status: number; body: ThreadsApiResponse<T> }> {
  const requestUrl = new URL(url);

  for (const [key, value] of Object.entries(params)) {
    requestUrl.searchParams.set(key, value);
  }

  const response = await fetch(requestUrl, {
    method: "GET",
    cache: "no-store",
  });

  return {
    ok: response.ok,
    status: response.status,
    body: await readThreadsResponse<T>(response),
  };
}

export async function waitForThreadsContainer(
  creationId: string,
  accessToken: string,
  context: Partial<PublishErrorDetail> = {},
): Promise<ThreadsContainerReadinessResult> {
  let lastStatusCode: string | undefined;

  for (
    let attemptIndex = 0;
    attemptIndex < THREADS_CONTAINER_STATUS_DELAYS_MS.length;
    attemptIndex += 1
  ) {
    const response = await getThreadsJson<ThreadsContainerStatusResponse>(
      `${THREADS_GRAPH_BASE_URL}/${encodeURIComponent(creationId)}`,
      {
        fields: "status_code",
        access_token: accessToken,
      },
    );

    if (response.ok && typeof response.body !== "string") {
      const statusCode = response.body.status_code?.toUpperCase();
      lastStatusCode = statusCode;

      if (statusCode === "FINISHED" || statusCode === "PUBLISHED") {
        return {
          ok: true,
          attempts: attemptIndex + 1,
          statusCode,
        };
      }

      if (statusCode === "ERROR" || statusCode === "EXPIRED") {
        return {
          ok: false,
          attempts: attemptIndex + 1,
          statusCode,
          errorDetail: createThreadsContainerStatusError(statusCode, context),
        };
      }
    } else if (
      !response.ok &&
      !isRetryableContainerStatusError(response.status, response.body)
    ) {
      return {
        ok: false,
        attempts: attemptIndex + 1,
        errorDetail: createThreadsErrorDetail(response.status, response.body, {
          stage: "container-status",
          stageLabel: "컨테이너 준비 확인",
          retryHint:
            "Threads 컨테이너 상태 조회 권한과 creation_id 값을 확인하세요.",
          ...context,
        }),
      };
    }

    await sleep(THREADS_CONTAINER_STATUS_DELAYS_MS[attemptIndex]);
  }

  return {
    ok: true,
    attempts: THREADS_CONTAINER_STATUS_DELAYS_MS.length,
    statusCode: lastStatusCode,
  };
}

export async function publishThreadsContainerWithRetry<T>(
  publishUrl: string,
  params: {
    access_token: string;
    creation_id: string;
  },
  context: Partial<PublishErrorDetail> = {},
  options: { checkReadiness?: boolean } = {},
): Promise<ThreadsContainerPublishResult<T>> {
  const readiness =
    options.checkReadiness === false
      ? { ok: true, attempts: 0 }
      : await waitForThreadsContainer(
          params.creation_id,
          params.access_token,
          context,
        );

  if (!readiness.ok) {
    return {
      ok: false,
      status: 0,
      body: "" as ThreadsApiResponse<T>,
      attempts: 0,
      readiness,
      readinessErrorDetail: readiness.errorDetail,
    };
  }

  let lastResponse: ThreadsRequestResult<T> | null = null;

  for (
    let attemptIndex = 0;
    attemptIndex <= THREADS_CONTAINER_PUBLISH_RETRY_DELAYS_MS.length;
    attemptIndex += 1
  ) {
    const response = await postThreadsForm<T>(publishUrl, params);
    lastResponse = response;

    if (response.ok || !isThreadsContainerNotReadyError(response.body)) {
      return {
        ...response,
        attempts: attemptIndex + 1,
        readiness,
      };
    }

    const delay = THREADS_CONTAINER_PUBLISH_RETRY_DELAYS_MS[attemptIndex];

    if (delay) {
      await sleep(delay);
    }
  }

  return {
    ...(lastResponse ?? {
      ok: false,
      status: 0,
      body: "" as ThreadsApiResponse<T>,
    }),
    attempts: THREADS_CONTAINER_PUBLISH_RETRY_DELAYS_MS.length + 1,
    readiness,
  };
}
