import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Threads deauthorization callback endpoint is active.",
  });
}

export async function POST() {
  return NextResponse.json({
    ok: true,
    message: "Threads app deauthorization received. No user data is stored.",
  });
}
