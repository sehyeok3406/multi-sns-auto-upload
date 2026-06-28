import { NextResponse } from "next/server";
import { getAccountStatuses } from "@/lib/accounts";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  return NextResponse.json(getAccountStatuses());
}
