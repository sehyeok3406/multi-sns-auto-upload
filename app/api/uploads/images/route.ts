import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createPublishErrorDetail } from "@/lib/publisher/errorDetails";
import type { PublishErrorDetail } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function uploadErrorResponse(
  status: number,
  message: string,
  detail: Partial<PublishErrorDetail> = {},
) {
  return NextResponse.json(
    {
      message,
      errorDetail: createPublishErrorDetail({
        source: "Vercel Blob",
        stage: "upload",
        stageLabel: "이미지 업로드",
        httpStatus: status,
        message,
        ...detail,
      }),
    },
    { status },
  );
}

function getFileExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension && /^[a-z0-9]+$/.test(extension)) {
    return extension;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "jpg";
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return uploadErrorResponse(401, "로그인 세션이 만료되었습니다.", {
      errorKey: "APP_SESSION_EXPIRED",
      category: "authentication",
      categoryLabel: "웹사이트 로그인",
      displayTitle: "웹사이트 로그인이 만료되었습니다",
      summary: "이미지 업로드 전에 SNS auto upload에 다시 로그인해야 합니다.",
      actions: [
        "로그인 페이지에서 팀 비밀번호로 다시 로그인합니다.",
        "작성 화면으로 돌아와 이미지를 다시 선택합니다.",
      ],
      retryable: false,
    });
  }

  let form: FormData;

  try {
    form = await request.formData();
  } catch {
    return uploadErrorResponse(
      400,
      "이미지 업로드 요청 형식이 올바르지 않습니다.",
      {
        errorKey: "IMAGE_UPLOAD_REQUEST_INVALID",
        category: "validation",
        categoryLabel: "업로드 요청",
        displayTitle: "이미지 업로드 요청을 읽지 못했습니다",
        summary: "브라우저에서 전달한 파일 요청이 손상되었거나 올바른 형식이 아닙니다.",
        actions: [
          "페이지를 새로고침한 뒤 이미지를 다시 선택합니다.",
          "반복되면 다른 브라우저에서 시도하고 오류 정보를 개발 담당자에게 전달합니다.",
        ],
        retryable: true,
      },
    );
  }

  const file = form.get("file");

  if (!(file instanceof File)) {
    return uploadErrorResponse(400, "업로드할 이미지를 선택해 주세요.", {
      errorKey: "IMAGE_FILE_MISSING",
      category: "validation",
      categoryLabel: "파일 선택",
      displayTitle: "선택된 이미지 파일이 없습니다",
      summary: "업로드 요청에 이미지 파일이 포함되지 않았습니다.",
      actions: ["이미지 버튼을 눌러 파일을 다시 선택합니다."],
      retryable: true,
    });
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return uploadErrorResponse(
      415,
      "JPG, PNG, WebP 이미지만 업로드할 수 있습니다.",
      {
        errorKey: "IMAGE_FORMAT_UNSUPPORTED",
        category: "media",
        categoryLabel: "파일 형식",
        displayTitle: "지원하지 않는 이미지 형식입니다",
        summary: `선택한 파일 형식은 ${file.type || "확인 불가"}입니다.`,
        actions: [
          "이미지를 JPG, PNG 또는 WebP로 변환합니다.",
          "변환한 파일을 다시 첨부합니다.",
        ],
        retryable: false,
      },
    );
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return uploadErrorResponse(413, "이미지는 8MB 이하로 업로드해 주세요.", {
      errorKey: "IMAGE_FILE_TOO_LARGE",
      category: "media",
      categoryLabel: "파일 용량",
      displayTitle: "이미지 파일 용량이 너무 큽니다",
      summary: `선택한 파일은 ${(file.size / 1024 / 1024).toFixed(1)}MB이며 최대 8MB까지 업로드할 수 있습니다.`,
      actions: [
        "이미지를 압축하거나 가로·세로 크기를 줄입니다.",
        "8MB 이하가 된 파일을 다시 첨부합니다.",
      ],
      retryable: false,
    });
  }

  try {
    const extension = getFileExtension(file);
    const blob = await put(
      `threads/${Date.now()}-${randomUUID()}.${extension}`,
      file,
      {
        access: "public",
        addRandomSuffix: true,
      },
    );

    return NextResponse.json({
      image: {
        url: blob.url,
        pathname: blob.pathname,
        contentType: blob.contentType,
        size: file.size,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return uploadErrorResponse(
      500,
      `이미지 저장소 업로드에 실패했습니다: ${message}`,
      {
        errorKey: "BLOB_UPLOAD_FAILED",
        displayTitle: "이미지를 Vercel Blob에 저장하지 못했습니다",
        summary: "게시 전 이미지 저장 단계에서 실패해 Threads 요청은 아직 시작되지 않았습니다.",
        actions: [
          "잠시 후 이미지를 다시 선택해 업로드합니다.",
          "반복되면 Vercel Blob 연결과 저장 용량을 확인합니다.",
          "아래 오류 정보를 개발 담당자에게 전달합니다.",
        ],
        retryable: true,
      },
    );
  }
}
