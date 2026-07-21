import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  createAppSessionErrorDetail,
  createErrorDetailFromUnknown,
} from "@/lib/publisher/errorDetails";
import { getThreadsPosts } from "@/lib/publisher/threadsInbox";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    const errorDetail = createAppSessionErrorDetail({
      stage: "posts-load",
      stageLabel: "내 게시물 불러오기",
      itemLabel: "게시물 목록",
    });

    return NextResponse.json(
      { message: "로그인이 필요합니다.", errorDetail },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "15");

  try {
    const posts = await getThreadsPosts({ limit });

    return NextResponse.json({ posts });
  } catch (error) {
    const errorDetail = createErrorDetailFromUnknown(error, {
      source: "Threads API",
      stage: "posts-load",
      stageLabel: "내 게시물 불러오기",
      itemLabel: "게시물 목록",
    });
    const message =
      errorDetail.userMessage ??
      errorDetail.message ??
      "Threads 게시물을 불러오지 못했습니다.";

    return NextResponse.json({ message, errorDetail }, { status: 502 });
  }
}
