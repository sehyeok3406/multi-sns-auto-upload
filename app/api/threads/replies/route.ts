import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { replyToThreadsMedia } from "@/lib/publisher/threadsInbox";

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
        },
      },
      { status: 502 },
    );
  }
}
