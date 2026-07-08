import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getThreadsPosts } from "@/lib/publisher/threadsInbox";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "15");

  try {
    const posts = await getThreadsPosts({ limit });

    return NextResponse.json({ posts });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Threads 게시물을 불러오지 못했습니다.";

    return NextResponse.json({ message }, { status: 502 });
  }
}
