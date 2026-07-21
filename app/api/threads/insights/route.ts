import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  createAppSessionErrorDetail,
  createErrorDetailFromUnknown,
} from "@/lib/publisher/errorDetails";
import { getThreadsPostInsights } from "@/lib/publisher/threadsInsights";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    const errorDetail = createAppSessionErrorDetail({
      stage: "insights-load",
      stageLabel: "게시 성과 불러오기",
      itemLabel: "인사이트",
    });

    return NextResponse.json(
      { message: "로그인이 필요합니다.", errorDetail },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "20");

  try {
    const insights = await getThreadsPostInsights({ limit });

    return NextResponse.json(insights);
  } catch (error) {
    const errorDetail = createErrorDetailFromUnknown(error, {
      source: "Threads API",
      stage: "insights-load",
      stageLabel: "게시 성과 불러오기",
      itemLabel: "인사이트",
    });
    const message =
      errorDetail.userMessage ??
      errorDetail.message ??
      "Threads 게시 성과를 불러오지 못했습니다.";

    return NextResponse.json({ message, errorDetail }, { status: 502 });
  }
}
