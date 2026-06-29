import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

function getBaseUrl(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function createConfirmationCode(request: Request) {
  return createHash("sha256")
    .update(`${Date.now()}-${request.headers.get("user-agent") ?? ""}-${randomUUID()}`)
    .digest("hex")
    .slice(0, 16);
}

export async function GET(request: Request) {
  const confirmationCode = createConfirmationCode(request);

  return NextResponse.json({
    url: `${getBaseUrl(request)}/data-deletion?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
}

export async function POST(request: Request) {
  const confirmationCode = createConfirmationCode(request);

  return NextResponse.json({
    url: `${getBaseUrl(request)}/data-deletion?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
}
