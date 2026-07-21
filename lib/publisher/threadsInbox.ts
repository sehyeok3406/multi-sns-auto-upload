import { getThreadsAccountStatus } from "@/lib/accounts";
import {
  THREADS_GRAPH_BASE_URL,
  createThreadsContainerWithRetry,
  createThreadsErrorDetail,
  createThreadsErrorMessage,
  getThreadsCredentials,
  getThreadsJson,
  publishThreadsContainerWithRetry,
} from "@/lib/publisher/threadsApi";
import { createPublishErrorDetail } from "@/lib/publisher/errorDetails";
import type {
  ThreadsMediaSummary,
  ThreadsReply,
  ThreadsReplyPublishResult,
} from "@/lib/types";

const MEDIA_FIELDS = [
  "id",
  "permalink",
  "username",
  "timestamp",
  "text",
  "media_type",
  "media_url",
  "thumbnail_url",
  "shortcode",
].join(",");

type ThreadsMediaApiItem = {
  id?: string;
  permalink?: string;
  username?: string;
  timestamp?: string;
  text?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  shortcode?: string;
};

type ThreadsListResponse<T> = {
  data?: T[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    previous?: string;
    next?: string;
  };
};

type ThreadsPublishContainerResponse = {
  id?: string;
};

function assertThreadsConnected() {
  const status = getThreadsAccountStatus();

  if (!status.connected) {
    throw new Error(status.message);
  }
}

function normalizeThreadsMedia(item: ThreadsMediaApiItem): ThreadsMediaSummary | null {
  if (!item.id) {
    return null;
  }

  return {
    id: item.id,
    text: item.text,
    username: item.username,
    timestamp: item.timestamp,
    permalink: item.permalink,
    mediaType: item.media_type,
    mediaUrl: item.media_url,
    thumbnailUrl: item.thumbnail_url,
    shortcode: item.shortcode,
  };
}

function normalizeLimit(value: number | undefined, fallback: number, max: number) {
  if (!value || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.floor(value), 1), max);
}

export async function getThreadsPosts(options: { limit?: number } = {}) {
  assertThreadsConnected();

  const { userId, accessToken } = getThreadsCredentials();
  const response = await getThreadsJson<ThreadsListResponse<ThreadsMediaApiItem>>(
    `${THREADS_GRAPH_BASE_URL}/${encodeURIComponent(userId)}/threads`,
    {
      fields: MEDIA_FIELDS,
      limit: String(normalizeLimit(options.limit, 15, 50)),
      access_token: accessToken,
    },
  );

  if (!response.ok) {
    throw new Error(createThreadsErrorMessage(response.status, response.body));
  }

  if (typeof response.body === "string") {
    return [];
  }

  return (response.body.data ?? [])
    .map(normalizeThreadsMedia)
    .filter((item): item is ThreadsMediaSummary => Boolean(item));
}

export async function getThreadsConversation(
  mediaId: string,
  options: { limit?: number } = {},
) {
  assertThreadsConnected();

  const { accessToken } = getThreadsCredentials();
  const response = await getThreadsJson<ThreadsListResponse<ThreadsMediaApiItem>>(
    `${THREADS_GRAPH_BASE_URL}/${encodeURIComponent(mediaId)}/conversation`,
    {
      fields: MEDIA_FIELDS,
      limit: String(normalizeLimit(options.limit, 30, 100)),
      access_token: accessToken,
    },
  );

  if (!response.ok) {
    throw new Error(createThreadsErrorMessage(response.status, response.body));
  }

  if (typeof response.body === "string") {
    return [];
  }

  return (response.body.data ?? [])
    .map(normalizeThreadsMedia)
    .filter((item): item is ThreadsReply => Boolean(item));
}

export async function replyToThreadsMedia(
  replyToId: string,
  content: string,
): Promise<ThreadsReplyPublishResult> {
  assertThreadsConnected();

  const postedAt = new Date().toISOString();
  const { userId, accessToken } = getThreadsCredentials();
  const containerResponse =
    await createThreadsContainerWithRetry<ThreadsPublishContainerResponse>(
      `${THREADS_GRAPH_BASE_URL}/${encodeURIComponent(userId)}/threads`,
      {
        media_type: "TEXT",
        text: content,
        reply_to_id: replyToId,
        access_token: accessToken,
      },
    );

  if (!containerResponse.ok) {
    const errorDetail = createThreadsErrorDetail(
      containerResponse.status,
      containerResponse.body,
      {
        stage: "container",
        stageLabel: "답글 컨테이너 생성",
        itemLabel: "답글",
        attempts: containerResponse.attempts,
      },
    );

    return {
      success: false,
      message: errorDetail.userMessage ?? errorDetail.message ?? "Threads 답글 컨테이너 생성에 실패했습니다.",
      errorDetail,
      postedAt,
    };
  }

  const creationId =
    typeof containerResponse.body === "string" ? undefined : containerResponse.body.id;

  if (!creationId) {
    return {
      success: false,
      message: "Threads API did not return a reply creation id.",
      errorDetail: createPublishErrorDetail({
        source: "Threads API",
        stage: "container",
        stageLabel: "답글 컨테이너 생성",
        itemLabel: "답글",
        attempts: containerResponse.attempts,
        message: "Threads API가 답글 컨테이너 ID를 반환하지 않았습니다.",
        retryHint: "같은 답글을 다시 시도하고, 반복되면 Meta API 응답 로그를 확인하세요.",
      }),
      postedAt,
    };
  }

  const publishResponse =
    await publishThreadsContainerWithRetry<ThreadsPublishContainerResponse>(
      `${THREADS_GRAPH_BASE_URL}/${encodeURIComponent(userId)}/threads_publish`,
      {
        creation_id: creationId,
        access_token: accessToken,
      },
      {
        stage: "publish",
        stageLabel: "답글 발행",
      },
      { checkReadiness: false },
    );

  if (!publishResponse.ok) {
    const errorDetail =
      publishResponse.readinessErrorDetail ??
      createThreadsErrorDetail(publishResponse.status, publishResponse.body, {
        stage: "publish",
        stageLabel: "답글 발행",
        itemLabel: "답글",
        attempts: publishResponse.attempts,
      });

    return {
      success: false,
      message: errorDetail.userMessage ?? errorDetail.message ?? "Threads 답글 발행에 실패했습니다.",
      errorDetail,
      postedAt,
    };
  }

  const postId =
    typeof publishResponse.body === "string" ? undefined : publishResponse.body.id;

  if (!postId) {
    return {
      success: false,
      message: "Threads API가 발행된 답글 ID를 반환하지 않았습니다.",
      errorDetail: createPublishErrorDetail({
        source: "Threads API",
        stage: "publish",
        stageLabel: "답글 발행",
        itemLabel: "답글",
        attempts: publishResponse.attempts,
        message: "Threads API가 발행된 답글 ID를 반환하지 않았습니다.",
        retryHint:
          "Threads에서 실제 답글 등록 여부를 먼저 확인하세요. 답글이 없다면 다시 시도하고, 반복되면 Meta API 응답 로그를 확인하세요.",
      }),
      postedAt,
    };
  }

  return {
    success: true,
    message: `Threads reply published successfully. Post ID: ${postId}`,
    postedAt,
    postId,
    postUrl: `https://www.threads.net/t/${postId}`,
  };
}
