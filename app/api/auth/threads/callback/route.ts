import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error,
        error_description: errorDescription,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: code
      ? "Threads authorization code received. Copy the code from this response or the URL."
      : "Threads authorization callback endpoint is active.",
    code,
  });
}
