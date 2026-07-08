import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getThreadsConversation } from "@/lib/publisher/threadsInbox";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ postId: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
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
    const message =
      error instanceof Error
        ? error.message
        : "Threads 댓글을 불러오지 못했습니다.";

    return NextResponse.json({ message }, { status: 502 });
  }
}
