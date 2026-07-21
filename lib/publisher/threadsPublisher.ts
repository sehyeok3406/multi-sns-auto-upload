import { getThreadsAccountStatus } from "@/lib/accounts";
import {
  THREADS_GRAPH_BASE_URL,
  createThreadsContainerWithRetry,
  createThreadsErrorDetail,
  getThreadsCredentials,
  publishThreadsContainerWithRetry,
} from "@/lib/publisher/threadsApi";
import { createSpoilerTextEntities } from "@/lib/threadsSpoilers";
import { createPublishErrorDetail } from "@/lib/publisher/errorDetails";
import type {
  PublishErrorDetail,
  PublishResult,
  ThreadsPostMedia,
  ThreadsPollAttachment,
  ThreadsSpoilerRange,
  ThreadsTextAttachment,
} from "@/lib/types";

type ThreadsApiResponse = {
  id?: string;
};

function getPublishEndpoint(path: "threads" | "threads_publish") {
  return `${THREADS_GRAPH_BASE_URL}/me/${path}`;
}

function getThreadItemLabel(index: number, total: number) {
  return total > 1 ? `${index + 1}번 타래` : "게시글";
}

function createLocalErrorDetail(
  overrides: Partial<PublishErrorDetail>,
): PublishErrorDetail {
  return createPublishErrorDetail({
    source: "SNS auto upload",
    ...overrides,
  });
}

export async function publishToThreads(
  content: string,
  options: {
    imageUrl?: string;
    isImageSpoiler?: boolean;
    mediaItems?: ThreadsPostMedia[];
    pollAttachment?: ThreadsPollAttachment;
    spoilerRanges?: ThreadsSpoilerRange[][];
    textAttachment?: ThreadsTextAttachment;
    threadItems?: string[];
    topicTag?: string;
  } = {},
): Promise<PublishResult> {
  const status = getThreadsAccountStatus();
  const postedAt = new Date().toISOString();
  const publishedIds: string[] = [];
  const threadParts = [content, ...(options.threadItems ?? [])];
  let activeItemIndex = 0;
  let activeStage = "configuration";
  let activeStageLabel = "연결 정보 확인";

  if (!status.connected) {
    return {
      platform: "threads",
      success: false,
      message: status.message,
      errorDetail: createLocalErrorDetail({
        stage: "configuration",
        stageLabel: "연결 상태 확인",
        message: status.message,
        retryHint: "Vercel Environment Variables에 Threads 필수 값을 설정하고 재배포하세요.",
      }),
      postedAt,
    };
  }

  try {
    const { accessToken } = getThreadsCredentials();
    const legacyFirstMedia: ThreadsPostMedia = {
      imageUrl: options.imageUrl,
      isImageSpoiler: options.isImageSpoiler,
    };
    const mediaItems = threadParts.map((_, index) =>
      options.mediaItems?.[index] ?? (index === 0 ? legacyFirstMedia : {}),
    );

    for (let index = 0; index < threadParts.length; index += 1) {
      activeItemIndex = index;
      const media = mediaItems[index];
      const isFirstPost = index === 0;
      const isImagePost = Boolean(media?.imageUrl);
      const isTextPost = !isImagePost;
      const containerParams: Record<string, string> = {
        media_type: isTextPost ? "TEXT" : "IMAGE",
        text: threadParts[index],
        access_token: accessToken,
      };

      if (isTextPost) {
        containerParams.auto_publish_text = "true";
      }

      if (media?.imageUrl) {
        containerParams.image_url = media.imageUrl;
      }

      if (media?.imageUrl && media.isImageSpoiler) {
        containerParams.is_spoiler_media = "true";
      }

      if (isFirstPost && options.topicTag) {
        containerParams.topic_tag = options.topicTag;
      }

      if (isFirstPost && options.pollAttachment) {
        containerParams.poll_attachment = JSON.stringify(options.pollAttachment);
      }

      if (isFirstPost && options.textAttachment) {
        containerParams.text_attachment = JSON.stringify(options.textAttachment);
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
          const itemLabel = getThreadItemLabel(index, threadParts.length);

          return {
            platform: "threads",
            success: false,
            message: `${itemLabel} 게시 중단: 이전 게시물 ID가 없습니다.`,
            errorDetail: createLocalErrorDetail({
              stage: "reply-chain",
              stageLabel: "타래 연결",
              itemIndex: index + 1,
              itemLabel,
              message:
                "이전 게시물이 발행되지 않아 reply_to_id를 만들 수 없습니다.",
              retryHint:
                "첫 번째 글이 실제로 성공했는지 확인한 뒤 다시 시도하세요.",
            }),
            postedAt,
            threadPostIds: publishedIds,
          };
        }

        containerParams.reply_to_id = previousPostId;
      }

      activeStage = "container";
      activeStageLabel = "컨테이너 생성";
      const containerResponse =
        await createThreadsContainerWithRetry<ThreadsApiResponse>(
          getPublishEndpoint("threads"),
          containerParams,
        );

      if (!containerResponse.ok) {
        const itemLabel = getThreadItemLabel(index, threadParts.length);

        return {
          platform: "threads",
          success: false,
          message: `${itemLabel} 컨테이너 생성 실패`,
          errorDetail: createThreadsErrorDetail(
            containerResponse.status,
            containerResponse.body,
            {
              stage: "container",
              stageLabel: "컨테이너 생성",
              itemIndex: index + 1,
              itemLabel,
              attempts: containerResponse.attempts,
            },
          ),
          postedAt,
          threadPostIds: publishedIds,
        };
      }

      const creationId =
        typeof containerResponse.body === "string"
          ? undefined
          : containerResponse.body.id;

      if (!creationId) {
        const itemLabel = getThreadItemLabel(index, threadParts.length);

        return {
          platform: "threads",
          success: false,
          message: `${itemLabel} 컨테이너 ID 누락`,
          errorDetail: createLocalErrorDetail({
            stage: "container",
            stageLabel: "컨테이너 생성",
            itemIndex: index + 1,
            itemLabel,
            message: "Threads API가 컨테이너 ID를 반환하지 않았습니다.",
            retryHint:
              "동일한 게시글을 다시 시도하고, 반복되면 Meta API 응답 로그를 확인하세요.",
          }),
          postedAt,
          threadPostIds: publishedIds,
        };
      }

      if (isTextPost) {
        publishedIds.push(creationId);
        continue;
      }

      activeStage = "publish";
      activeStageLabel = "게시 발행";
      const publishResponse =
        await publishThreadsContainerWithRetry<ThreadsApiResponse>(
          getPublishEndpoint("threads_publish"),
          {
            creation_id: creationId,
            access_token: accessToken,
          },
          {
            stage: "publish",
            stageLabel: "게시 발행",
            itemIndex: index + 1,
            itemLabel: getThreadItemLabel(index, threadParts.length),
          },
        );

      if (!publishResponse.ok) {
        const itemLabel = getThreadItemLabel(index, threadParts.length);

        return {
          platform: "threads",
          success: false,
          message: `${itemLabel} 발행 실패`,
          errorDetail:
            publishResponse.readinessErrorDetail ??
            createThreadsErrorDetail(
              publishResponse.status,
              publishResponse.body,
              {
                stage: "publish",
                stageLabel: "게시 발행",
                itemIndex: index + 1,
                itemLabel,
                attempts: publishResponse.attempts,
              },
            ),
          postedAt,
          threadPostIds: publishedIds,
        };
      }

      const publishedPostId =
        typeof publishResponse.body === "string"
          ? undefined
          : publishResponse.body.id;

      if (!publishedPostId) {
        const itemLabel = getThreadItemLabel(index, threadParts.length);

        return {
          platform: "threads",
          success: false,
          message: `${itemLabel} 게시물 ID 누락`,
          errorDetail: createLocalErrorDetail({
            stage: "publish",
            stageLabel: "게시 발행",
            itemIndex: index + 1,
            itemLabel,
            attempts: publishResponse.attempts,
            message: "Threads API가 발행된 게시물 ID를 반환하지 않았습니다.",
            retryHint:
              "Threads 계정에서 실제 게시 여부를 먼저 확인하세요. 게시물이 없다면 다시 시도하고, 반복되면 Meta API 응답 로그를 확인하세요.",
          }),
          postedAt,
          threadPostIds: publishedIds,
        };
      }

      publishedIds.push(publishedPostId);

    }

    const postId = publishedIds[0];
    const itemLabel =
      threadParts.length > 1 ? `${threadParts.length} thread posts` : "post";
    const imageLabel = mediaItems.some((media) => media.imageUrl) ? "media " : "";
    const pollLabel = options.pollAttachment ? "poll " : "";
    const textAttachmentLabel = options.textAttachment ? "text attachment " : "";

    return {
      platform: "threads",
      success: true,
      message: postId
        ? `Threads ${pollLabel}${textAttachmentLabel}${imageLabel}${itemLabel} published successfully. Post ID: ${postId}`
        : `Threads ${pollLabel}${textAttachmentLabel}${imageLabel}${itemLabel} published successfully.`,
      postedAt,
      postId,
      threadPostIds: publishedIds,
      postUrl: postId ? `https://www.threads.net/t/${postId}` : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const itemLabel = getThreadItemLabel(activeItemIndex, threadParts.length);

    return {
      platform: "threads",
      success: false,
      message: `${itemLabel} 요청 실행 실패: ${message}`,
      errorDetail: createLocalErrorDetail({
        stage: activeStage,
        stageLabel: activeStageLabel,
        itemIndex: activeItemIndex + 1,
        itemLabel,
        message,
        retryHint:
          error instanceof Error && error.name === "TimeoutError"
            ? "Threads API 응답 시간이 초과되었습니다. 잠시 후 다시 시도하세요. 일부 타래가 이미 게시됐는지 먼저 확인하는 것이 좋습니다."
            : "네트워크 오류, 서버 런타임 오류, 환경 변수 값을 확인하세요. 일부 타래가 이미 게시됐는지도 확인해 주세요.",
      }),
      postedAt,
      threadPostIds: publishedIds,
    };
  }
}
