import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { addPostHistory } from "@/lib/postHistory";
import { publishToThreads } from "@/lib/publisher/threadsPublisher";
import { publishToX } from "@/lib/publisher/xPublisher";
import type { Platform, PublishResult } from "@/lib/types";

export const dynamic = "force-dynamic";

function isPlatform(value: unknown): value is Platform {
  return value === "x" || value === "threads";
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

  if (!content) {
    return NextResponse.json(
      { message: "게시글 내용을 입력해 주세요." },
      { status: 400 },
    );
  }

  if (platforms.length === 0) {
    return NextResponse.json(
      { message: "업로드할 플랫폼을 최소 1개 선택해 주세요." },
      { status: 400 },
    );
  }

  const requestedAt = new Date().toISOString();
  const results: PublishResult[] = await Promise.all(
    platforms.map((platform) =>
      platform === "x" ? publishToX(content) : publishToThreads(content),
    ),
  );
  const failedMessages = results
    .filter((result) => !result.success)
    .map((result) => `${result.platform}: ${result.message}`);
  const historyEntry = addPostHistory({
    content,
    platforms,
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
