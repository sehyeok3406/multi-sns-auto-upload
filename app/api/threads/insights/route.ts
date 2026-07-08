import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getThreadsPostInsights } from "@/lib/publisher/threadsInsights";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "20");

  try {
    const insights = await getThreadsPostInsights({ limit });

    return NextResponse.json(insights);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Threads 게시 성과를 불러오지 못했습니다.";

    return NextResponse.json({ message }, { status: 502 });
  }
}
