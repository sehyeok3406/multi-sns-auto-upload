import { getThreadsAccountStatus } from "@/lib/accounts";
import type { PublishResult } from "@/lib/types";

const THREADS_GRAPH_BASE_URL = "https://graph.threads.net/v1.0";

type ThreadsApiResponse = {
  id?: string;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
};

function getRequiredEnv(key: string) {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`${key} is not configured.`);
  }

  return value;
}

async function readThreadsResponse(response: Response): Promise<ThreadsApiResponse | string> {
  const text = await response.text();

  if (!text) {
    return "";
  }

  try {
    return JSON.parse(text) as ThreadsApiResponse;
  } catch {
    return text;
  }
}

function createErrorMessage(status: number, response: ThreadsApiResponse | string) {
  if (typeof response === "string") {
    return `Threads API request failed (${status}): ${response}`;
  }

  const error = response.error;
  const detail = error?.message ?? error?.type;

  return `Threads API request failed (${status})${
    detail ? `: ${detail}` : "."
  }`;
}

async function postForm(
  url: string,
  params: Record<string, string>,
): Promise<{ ok: boolean; status: number; body: ThreadsApiResponse | string }> {
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
    body: await readThreadsResponse(response),
  };
}

export async function publishToThreads(
  content: string,
  options: { imageUrl?: string } = {},
): Promise<PublishResult> {
  const status = getThreadsAccountStatus();
  const postedAt = new Date().toISOString();

  if (!status.connected) {
    return {
      platform: "threads",
      success: false,
      message: status.message,
      postedAt,
    };
  }

  try {
    const userId = getRequiredEnv("THREADS_USER_ID");
    const accessToken = getRequiredEnv("THREADS_ACCESS_TOKEN");
    const containerParams: Record<string, string> = {
      media_type: options.imageUrl ? "IMAGE" : "TEXT",
      text: content,
      access_token: accessToken,
    };

    if (options.imageUrl) {
      containerParams.image_url = options.imageUrl;
    }

    const containerResponse = await postForm(
      `${THREADS_GRAPH_BASE_URL}/${encodeURIComponent(userId)}/threads`,
      containerParams,
    );

    if (!containerResponse.ok) {
      return {
        platform: "threads",
        success: false,
        message: createErrorMessage(containerResponse.status, containerResponse.body),
        postedAt,
      };
    }

    const creationId =
      typeof containerResponse.body === "string"
        ? undefined
        : containerResponse.body.id;

    if (!creationId) {
      return {
        platform: "threads",
        success: false,
        message: "Threads API did not return a creation id.",
        postedAt,
      };
    }

    const publishResponse = await postForm(
      `${THREADS_GRAPH_BASE_URL}/${encodeURIComponent(userId)}/threads_publish`,
      {
        creation_id: creationId,
        access_token: accessToken,
      },
    );

    if (!publishResponse.ok) {
      return {
        platform: "threads",
        success: false,
        message: createErrorMessage(publishResponse.status, publishResponse.body),
        postedAt,
      };
    }

    const postId =
      typeof publishResponse.body === "string" ? undefined : publishResponse.body.id;

    return {
      platform: "threads",
      success: true,
      message: postId
        ? `Threads ${options.imageUrl ? "image " : ""}post published successfully. Post ID: ${postId}`
        : `Threads ${options.imageUrl ? "image " : ""}post published successfully.`,
      postedAt,
      postId,
      postUrl: postId ? `https://www.threads.net/t/${postId}` : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return {
      platform: "threads",
      success: false,
      message: `Threads API request failed: ${message}`,
      postedAt,
    };
  }
}
