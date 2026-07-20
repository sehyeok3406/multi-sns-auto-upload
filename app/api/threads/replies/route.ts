import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { replyToThreadsMedia } from "@/lib/publisher/threadsInbox";
import { THREADS_TEXT_LIMIT, validateThreadsText } from "@/lib/threadsLimits";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  let body: {
    replyToId?: unknown;
    content?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const replyToId =
    typeof body.replyToId === "string" ? body.replyToId.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";

  if (!replyToId) {
    return NextResponse.json(
      { message: "답글을 달 게시물 또는 댓글을 선택해 주세요." },
      { status: 400 },
    );
  }

  if (!content) {
    return NextResponse.json(
      { message: "답글 내용을 입력해 주세요." },
      { status: 400 },
    );
  }

  if (!validateThreadsText(content).ok) {
    return NextResponse.json(
      { message: `답글은 ${THREADS_TEXT_LIMIT}자를 초과할 수 없습니다.` },
      { status: 400 },
    );
  }

  try {
    const result = await replyToThreadsMedia(replyToId, content);

    return NextResponse.json({ result }, { status: result.success ? 200 : 502 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Threads 답글 게시 중 문제가 발생했습니다.";

    return NextResponse.json(
      {
        result: {
          success: false,
          message,
          postedAt: new Date().toISOString(),
          errorDetail: {
            source: "SNS auto upload",
            stage: "network",
            stageLabel: "답글 요청 실행",
            itemLabel: "답글",
            message,
            retryHint:
              "네트워크 오류 또는 Threads API 응답 지연일 수 있습니다. 실제 답글 등록 여부를 먼저 확인한 뒤 다시 시도하세요.",
          },
        },
      },
      { status: 502 },
    );
  }
}
