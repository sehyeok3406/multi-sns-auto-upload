import { getThreadsAccountStatus } from "@/lib/accounts";
import {
  THREADS_GRAPH_BASE_URL,
  createThreadsErrorMessage,
  getThreadsCredentials,
  postThreadsForm,
} from "@/lib/publisher/threadsApi";
import { createSpoilerTextEntities } from "@/lib/threadsSpoilers";
import type { PublishResult, ThreadsSpoilerRange } from "@/lib/types";

type ThreadsApiResponse = {
  id?: string;
};

export async function publishToThreads(
  content: string,
  options: {
    imageUrl?: string;
    isImageSpoiler?: boolean;
    spoilerRanges?: ThreadsSpoilerRange[][];
    threadItems?: string[];
    topicTag?: string;
  } = {},
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
    const publishedIds: string[] = [];
    const threadParts = [content, ...(options.threadItems ?? [])];

    for (let index = 0; index < threadParts.length; index += 1) {
      const isFirstPost = index === 0;
      const containerParams: Record<string, string> = {
        media_type: isFirstPost && options.imageUrl ? "IMAGE" : "TEXT",
        text: threadParts[index],
        access_token: accessToken,
      };

      if (isFirstPost && options.imageUrl) {
        containerParams.image_url = options.imageUrl;
      }

      if (isFirstPost && options.imageUrl && options.isImageSpoiler) {
        containerParams.is_spoiler_media = "true";
      }

      if (isFirstPost && options.topicTag) {
        containerParams.topic_tag = options.topicTag;
      }

      const spoilerEntities = createSpoilerTextEntities(
        threadParts[index],
        options.spoilerRanges?.[index] ?? [],
      );

      if (spoilerEntities.length > 0) {
        containerParams.text_entities = JSON.stringify(spoilerEntities);
      }

      if (!isFirstPost) {
        const previousPostId = publishedIds[publishedIds.length - 1];

        if (!previousPostId) {
          return {
            platform: "threads",
            success: false,
            message: "Threads thread publishing stopped because the previous post id is missing.",
            postedAt,
            threadPostIds: publishedIds,
          };
        }

        containerParams.reply_to_id = previousPostId;
      }

      const containerResponse = await postThreadsForm<ThreadsApiResponse>(
        `${THREADS_GRAPH_BASE_URL}/${encodeURIComponent(userId)}/threads`,
        containerParams,
      );

      if (!containerResponse.ok) {
        return {
          platform: "threads",
          success: false,
          message: `Threads thread item ${index + 1} failed: ${createThreadsErrorMessage(
            containerResponse.status,
            containerResponse.body,
          )}`,
          postedAt,
          threadPostIds: publishedIds,
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
          message: `Threads API did not return a creation id for thread item ${
            index + 1
          }.`,
          postedAt,
          threadPostIds: publishedIds,
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
          message: `Threads thread item ${index + 1} failed: ${createThreadsErrorMessage(
            publishResponse.status,
            publishResponse.body,
          )}`,
          postedAt,
          threadPostIds: publishedIds,
        };
      }

      const publishedPostId =
        typeof publishResponse.body === "string"
          ? undefined
          : publishResponse.body.id;

      if (publishedPostId) {
        publishedIds.push(publishedPostId);
      }
    }

    const postId = publishedIds[0];
    const itemLabel =
      threadParts.length > 1 ? `${threadParts.length} thread posts` : "post";

    return {
      platform: "threads",
      success: true,
      message: postId
        ? `Threads ${options.imageUrl ? "image " : ""}${itemLabel} published successfully. Post ID: ${postId}`
        : `Threads ${options.imageUrl ? "image " : ""}${itemLabel} published successfully.`,
      postedAt,
      postId,
      threadPostIds: publishedIds,
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
