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
