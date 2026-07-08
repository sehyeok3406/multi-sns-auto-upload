import { getThreadsAccountStatus } from "@/lib/accounts";
import {
  THREADS_GRAPH_BASE_URL,
  createThreadsErrorMessage,
  getThreadsCredentials,
  postThreadsForm,
} from "@/lib/publisher/threadsApi";
import type { PublishResult } from "@/lib/types";

type ThreadsApiResponse = {
  id?: string;
};

export async function publishToThreads(
  content: string,
  options: { imageUrl?: string; topicTag?: string } = {},
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
    const { userId, accessToken } = getThreadsCredentials();
    const containerParams: Record<string, string> = {
      media_type: options.imageUrl ? "IMAGE" : "TEXT",
      text: content,
      access_token: accessToken,
    };

    if (options.imageUrl) {
      containerParams.image_url = options.imageUrl;
    }

    if (options.topicTag) {
      containerParams.topic_tag = options.topicTag;
    }

    const containerResponse = await postThreadsForm<ThreadsApiResponse>(
      `${THREADS_GRAPH_BASE_URL}/${encodeURIComponent(userId)}/threads`,
      containerParams,
    );

    if (!containerResponse.ok) {
      return {
        platform: "threads",
        success: false,
        message: createThreadsErrorMessage(
          containerResponse.status,
          containerResponse.body,
        ),
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

    const publishResponse = await postThreadsForm<ThreadsApiResponse>(
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
        message: createThreadsErrorMessage(
          publishResponse.status,
          publishResponse.body,
        ),
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
