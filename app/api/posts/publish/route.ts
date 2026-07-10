import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { addPostHistory } from "@/lib/postHistory";
import { publishToThreads } from "@/lib/publisher/threadsPublisher";
import { publishToX } from "@/lib/publisher/xPublisher";
import { validateTopicTag } from "@/lib/topicTags";
import {
  THREADS_TEXT_SPOILER_LIMIT,
  normalizeSpoilerRanges,
} from "@/lib/threadsSpoilers";
import { THREADS_TEXT_LIMIT, validateThreadsText } from "@/lib/threadsLimits";
import type {
  Platform,
  PublishResult,
  ThreadsPostMedia,
  ThreadsSpoilerRange,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function isPlatform(value: unknown): value is Platform {
  return value === "x" || value === "threads";
}

function parseSpoilerRange(value: unknown): ThreadsSpoilerRange | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const range = value as { end?: unknown; start?: unknown };

  if (
    typeof range.start !== "number" ||
    typeof range.end !== "number" ||
    !Number.isInteger(range.start) ||
    !Number.isInteger(range.end)
  ) {
    return null;
  }

  return {
    start: range.start,
    end: range.end,
  };
}

function parseSpoilerRanges(value: unknown, postParts: string[]) {
  if (value === undefined) {
    return {
      ok: true as const,
      ranges: postParts.map(() => [] as ThreadsSpoilerRange[]),
    };
  }

  if (!Array.isArray(value)) {
    return {
      ok: false as const,
      message: "스포일러 범위 형식이 올바르지 않습니다.",
    };
  }

  const ranges: ThreadsSpoilerRange[][] = [];

  for (let index = 0; index < postParts.length; index += 1) {
    const partRanges = value[index] ?? [];

    if (!Array.isArray(partRanges)) {
      return {
        ok: false as const,
        message: "스포일러 범위 형식이 올바르지 않습니다.",
      };
    }

    const parsedRanges = partRanges.map(parseSpoilerRange);

    if (parsedRanges.some((range) => range === null)) {
      return {
        ok: false as const,
        message: "스포일러 범위 형식이 올바르지 않습니다.",
      };
    }

    const normalizedRanges = normalizeSpoilerRanges(
      postParts[index],
      parsedRanges as ThreadsSpoilerRange[],
    );

    if (normalizedRanges.length > THREADS_TEXT_SPOILER_LIMIT) {
      return {
        ok: false as const,
        message: `${index + 1}번 글의 스포일러는 최대 ${THREADS_TEXT_SPOILER_LIMIT}개까지 지정할 수 있습니다.`,
      };
    }

    ranges.push(normalizedRanges);
  }

  return {
    ok: true as const,
    ranges,
  };
}

function parseThreadMediaItem(value: unknown): ThreadsPostMedia {
  if (!value || typeof value !== "object") {
    return {};
  }

  const media = value as {
    imageName?: unknown;
    imageUrl?: unknown;
    isImageSpoiler?: unknown;
  };
  const imageUrl =
    typeof media.imageUrl === "string" ? media.imageUrl.trim() : "";

  return {
    imageUrl: imageUrl || undefined,
    imageName:
      typeof media.imageName === "string" ? media.imageName.trim() : undefined,
    isImageSpoiler: media.isImageSpoiler === true || undefined,
  };
}

function parseThreadMedia(
  value: unknown,
  postPartsLength: number,
  fallbackFirstMedia: ThreadsPostMedia,
) {
  if (value !== undefined && !Array.isArray(value)) {
    return {
      ok: false as const,
      message: "타래 이미지 형식이 올바르지 않습니다.",
    };
  }

  const input = Array.isArray(value) ? value : [];
  const mediaItems = Array.from({ length: postPartsLength }, (_, index) =>
    parseThreadMediaItem(input[index]),
  );

  if (!mediaItems[0]?.imageUrl && fallbackFirstMedia.imageUrl) {
    mediaItems[0] = fallbackFirstMedia;
  }

  return {
    ok: true as const,
    mediaItems,
  };
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  let body: {
    content?: unknown;
    platforms?: unknown;
    createdAt?: unknown;
    imageUrl?: unknown;
    isImageSpoiler?: unknown;
    spoilerRanges?: unknown;
    threadMedia?: unknown;
    threadItems?: unknown;
    topicTag?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const content = typeof body.content === "string" ? body.content.trim() : "";
  const platforms = Array.isArray(body.platforms)
    ? Array.from(new Set(body.platforms.filter(isPlatform)))
    : [];
  const createdAt =
    typeof body.createdAt === "string" && !Number.isNaN(Date.parse(body.createdAt))
      ? body.createdAt
      : new Date().toISOString();
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  const hasThreadItems = body.threadItems !== undefined;
  const threadItemsInput = Array.isArray(body.threadItems)
    ? body.threadItems
    : [];
  const threadItems = threadItemsInput.map((item) =>
    typeof item === "string" ? item.trim() : "",
  );
  const isImageSpoiler = body.isImageSpoiler === true;
  const topicTagInput =
    typeof body.topicTag === "string" ? body.topicTag.trim() : "";
  const topicTagResult = validateTopicTag(topicTagInput);

  if (!topicTagResult.ok) {
    return NextResponse.json(
      { message: topicTagResult.message },
      { status: 400 },
    );
  }

  const topicTag = topicTagResult.value;

  if (platforms.length === 0) {
    return NextResponse.json(
      { message: "업로드할 플랫폼을 최소 1개 선택해 주세요." },
      { status: 400 },
    );
  }

  if (hasThreadItems && !Array.isArray(body.threadItems)) {
    return NextResponse.json(
      { message: "타래 글 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  if (threadItems.length > 0 && !platforms.includes("threads")) {
    return NextResponse.json(
      { message: "타래 작성은 Threads 게시에서만 사용할 수 있습니다." },
      { status: 400 },
    );
  }

  const postParts = [content, ...threadItems];
  const threadMediaResult = parseThreadMedia(body.threadMedia, postParts.length, {
    imageUrl: imageUrl || undefined,
    isImageSpoiler: isImageSpoiler || undefined,
  });

  if (!threadMediaResult.ok) {
    return NextResponse.json(
      { message: threadMediaResult.message },
      { status: 400 },
    );
  }

  const threadMedia = threadMediaResult.mediaItems;
  const hasImageMedia = threadMedia.some((media) => media.imageUrl);

  if (!content && !threadMedia[0]?.imageUrl) {
    return NextResponse.json(
      { message: "게시글 내용 또는 이미지를 입력해 주세요." },
      { status: 400 },
    );
  }

  const emptyThreadItemIndex = threadItems.findIndex(
    (item, index) => !item && !threadMedia[index + 1]?.imageUrl,
  );

  if (emptyThreadItemIndex >= 0) {
    return NextResponse.json(
      {
        message: `${emptyThreadItemIndex + 2}번 타래 내용을 입력하거나 삭제해 주세요.`,
      },
      { status: 400 },
    );
  }

  if (platforms.includes("threads")) {
    const threadTextResults = postParts.map(validateThreadsText);
    const invalidThreadIndex = threadTextResults.findIndex(
      (result) => !result.ok,
    );

    if (invalidThreadIndex >= 0) {
      return NextResponse.json(
        {
          message:
            invalidThreadIndex === 0
              ? threadTextResults[invalidThreadIndex].message
              : `${invalidThreadIndex + 1}번 타래 글은 ${THREADS_TEXT_LIMIT}자를 초과할 수 없습니다.`,
        },
        { status: 400 },
      );
    }
  }

  const spoilerRangesResult = parseSpoilerRanges(body.spoilerRanges, postParts);

  if (!spoilerRangesResult.ok) {
    return NextResponse.json(
      { message: spoilerRangesResult.message },
      { status: 400 },
    );
  }

  for (let index = 0; index < threadMedia.length; index += 1) {
    const media = threadMedia[index];

    if (!media.imageUrl) {
      continue;
    }

    try {
      const parsedUrl = new URL(media.imageUrl);

      if (parsedUrl.protocol !== "https:") {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json(
        { message: `${index + 1}번 글의 첨부 이미지 URL이 올바르지 않습니다.` },
        { status: 400 },
      );
    }
  }

  const invalidImageSpoilerIndex = threadMedia.findIndex(
    (media) => media.isImageSpoiler && !media.imageUrl,
  );

  if (invalidImageSpoilerIndex >= 0) {
    return NextResponse.json(
      {
        message: `${invalidImageSpoilerIndex + 1}번 글의 이미지 스포일러는 이미지 첨부 게시에서만 사용할 수 있습니다.`,
      },
      { status: 400 },
    );
  }

  const spoilerRanges = spoilerRangesResult.ranges;
  const hasTextSpoiler = spoilerRanges.some((ranges) => ranges.length > 0);

  if ((hasTextSpoiler || hasImageMedia) && !platforms.includes("threads")) {
    return NextResponse.json(
      { message: "이미지와 스포일러는 Threads 게시에서만 사용할 수 있습니다." },
      { status: 400 },
    );
  }

  if (hasImageMedia && platforms.includes("x")) {
    return NextResponse.json(
      { message: "이미지 첨부 게시를 하려면 X 선택을 해제해 주세요." },
      { status: 400 },
    );
  }

  const requestedAt = new Date().toISOString();
  const results: PublishResult[] = await Promise.all(
    platforms.map((platform) =>
      platform === "x"
        ? publishToX(content)
        : publishToThreads(content, {
            imageUrl: imageUrl || undefined,
            isImageSpoiler,
            mediaItems: threadMedia,
            spoilerRanges: hasTextSpoiler ? spoilerRanges : undefined,
            threadItems: threadItems.length > 0 ? threadItems : undefined,
            topicTag: topicTag || undefined,
          }),
    ),
  );
  const failedMessages = results
    .filter((result) => !result.success)
    .map((result) => `${result.platform}: ${result.message}`);
  const historyEntry = addPostHistory({
    content,
    platforms,
    imageUrl: imageUrl || undefined,
    isImageSpoiler: isImageSpoiler || undefined,
    threadMedia: hasImageMedia ? threadMedia : undefined,
    spoilerRanges: hasTextSpoiler ? spoilerRanges : undefined,
    threadItems: threadItems.length > 0 ? threadItems : undefined,
    topicTag: topicTag || undefined,
    results,
    createdAt,
    requestedAt,
    errorMessage: failedMessages.length > 0 ? failedMessages.join(" / ") : undefined,
  });

  return NextResponse.json({
    ok: true,
    results,
    history: historyEntry,
  });
}
