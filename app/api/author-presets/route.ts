import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  createAuthorPreset,
  getAuthorPresets,
  updateAuthorPreset,
} from "@/lib/googleSheets";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  try {
    return NextResponse.json({ presets: await getAuthorPresets() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { message: `작성자 프리셋을 불러오지 못했습니다: ${message}` },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  let body: { name?: unknown; headline?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const headline = typeof body.headline === "string" ? body.headline.trim() : "";

  if (!name || !headline) {
    return NextResponse.json(
      { message: "이름과 헤드라인을 모두 입력해 주세요." },
      { status: 400 },
    );
  }

  if (name.length > 40 || headline.length > 120) {
    return NextResponse.json(
      { message: "이름은 40자, 헤드라인은 120자 이하로 입력해 주세요." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({
      preset: await createAuthorPreset({ name, headline }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { message: `작성자 프리셋을 저장하지 못했습니다: ${message}` },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  let body: { id?: unknown; name?: unknown; headline?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const headline = typeof body.headline === "string" ? body.headline.trim() : "";

  if (!id) {
    return NextResponse.json(
      { message: "수정할 작성자 프리셋을 선택해 주세요." },
      { status: 400 },
    );
  }

  if (!name || !headline) {
    return NextResponse.json(
      { message: "이름과 헤드라인을 모두 입력해 주세요." },
      { status: 400 },
    );
  }

  if (name.length > 40 || headline.length > 120) {
    return NextResponse.json(
      { message: "이름은 40자, 헤드라인은 120자 이하로 입력해 주세요." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({
      preset: await updateAuthorPreset({ id, name, headline }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { message: `작성자 프리셋을 수정하지 못했습니다: ${message}` },
      { status: 500 },
    );
  }
}
