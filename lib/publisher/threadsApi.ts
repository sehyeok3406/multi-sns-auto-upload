export const THREADS_GRAPH_BASE_URL = "https://graph.threads.net/v1.0";

export type ThreadsApiError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
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
  if (typeof response === "string") {
    return `Threads API request failed (${status}): ${response}`;
  }

  const error = response.error;
  const detail = error?.message ?? error?.type;

  return `Threads API request failed (${status})${
    detail ? `: ${detail}` : "."
  }`;
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
