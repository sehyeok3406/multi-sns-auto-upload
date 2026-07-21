import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  createAppSessionErrorDetail,
  createErrorDetailFromUnknown,
} from "@/lib/publisher/errorDetails";
import { getThreadsConversation } from "@/lib/publisher/threadsInbox";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ postId: string }> },
) {
  if (!(await isAuthenticated())) {
    const errorDetail = createAppSessionErrorDetail({
      stage: "replies-load",
      stageLabel: "댓글 불러오기",
      itemLabel: "댓글 목록",
    });

    return NextResponse.json(
      { message: "로그인이 필요합니다.", errorDetail },
      { status: 401 },
    );
  }

  const { postId } = await context.params;
  const mediaId = decodeURIComponent(postId ?? "").trim();

  if (!mediaId) {
    return NextResponse.json(
      { message: "게시물 ID가 필요합니다." },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "30");

  try {
    const replies = await getThreadsConversation(mediaId, { limit });

    return NextResponse.json({ replies });
  } catch (error) {
    const errorDetail = createErrorDetailFromUnknown(error, {
      source: "Threads API",
      stage: "replies-load",
      stageLabel: "댓글 불러오기",
      itemLabel: "댓글 목록",
    });
    const message =
      errorDetail.userMessage ??
      errorDetail.message ??
      "Threads 댓글을 불러오지 못했습니다.";

    return NextResponse.json({ message, errorDetail }, { status: 502 });
  }
}
