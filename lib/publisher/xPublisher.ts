import { createHmac, randomBytes } from "node:crypto";
import { getXAccountStatus } from "@/lib/accounts";
import type { PublishErrorDetail, PublishResult } from "@/lib/types";

const X_CREATE_POST_URL = "https://api.x.com/2/tweets";

type XCreatePostResponse = {
  data?: {
    id?: string;
    text?: string;
  };
  detail?: string;
  title?: string;
  status?: number;
  type?: string;
  errors?: Array<{
    code?: string | number;
    detail?: string;
    message?: string;
    parameter?: string;
    resource_id?: string;
    resource_type?: string;
    title?: string;
    type?: string;
  }>;
};

function getRequiredEnv(key: string) {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`${key} is not configured.`);
  }

  return value;
}

function percentEncode(value: string) {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    );
}

function createOAuthHeader(method: string, url: string) {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: getRequiredEnv("X_API_KEY"),
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: getRequiredEnv("X_ACCESS_TOKEN"),
    oauth_version: "1.0",
  };

  const signatureParams = Object.entries(oauthParams)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return leftValue.localeCompare(rightValue);
      }

      return leftKey.localeCompare(rightKey);
    })
    .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`)
    .join("&");
  const signatureBaseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(signatureParams),
  ].join("&");
  const signingKey = `${percentEncode(getRequiredEnv("X_API_SECRET"))}&${percentEncode(
    getRequiredEnv("X_ACCESS_TOKEN_SECRET"),
  )}`;
  const oauthSignature = createHmac("sha1", signingKey)
    .update(signatureBaseString)
    .digest("base64");
  const authorizationParams = {
    ...oauthParams,
    oauth_signature: oauthSignature,
  };

  return `OAuth ${Object.entries(authorizationParams)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
    .join(", ")}`;
}

function createErrorMessage(status: number, response: XCreatePostResponse | string) {
  const detail = createXErrorDetail(status, response);
  const codeLabel = detail.code ? `, code ${detail.code}` : "";
  const message = detail.message ?? detail.title ?? detail.type;

  return `X API request failed (${status}${codeLabel})${
    message ? `: ${message}` : "."
  }`;
}

function createXErrorDetail(
  status: number,
  response: XCreatePostResponse | string,
): PublishErrorDetail {
  if (typeof response === "string") {
    return {
      source: "X API",
      stage: "publish",
      stageLabel: "게시 발행",
      httpStatus: status,
      message: response || "Empty response body",
    };
  }

  const firstError = response.errors?.[0];
  const message =
    response.errors
      ?.map((error) => error.detail ?? error.message ?? error.title)
      .filter(Boolean)
      .join(" / ") ??
    response.detail ??
    response.title;

  return {
    source: "X API",
    stage: "publish",
    stageLabel: "게시 발행",
    httpStatus: status,
    code: firstError?.code,
    type: firstError?.type ?? response.type,
    title: firstError?.title ?? response.title,
    message,
    retryHint:
      status === 401 || status === 403
        ? "X API 키, Access Token 권한, 앱 권한을 확인하세요."
        : undefined,
  };
}

async function readXResponse(response: Response): Promise<XCreatePostResponse | string> {
  const text = await response.text();

  if (!text) {
    return "";
  }

  try {
    return JSON.parse(text) as XCreatePostResponse;
  } catch {
    return text;
  }
}

export async function publishToX(content: string): Promise<PublishResult> {
  const status = getXAccountStatus();
  const postedAt = new Date().toISOString();

  if (!status.connected) {
    return {
      platform: "x",
      success: false,
      message: status.message,
      errorDetail: {
        source: "SNS auto upload",
        stage: "configuration",
        stageLabel: "연결 상태 확인",
        message: status.message,
        retryHint: "Vercel Environment Variables에 X 필수 값을 설정하고 재배포하세요.",
      },
      postedAt,
    };
  }

  try {
    const response = await fetch(X_CREATE_POST_URL, {
      method: "POST",
      headers: {
        Authorization: createOAuthHeader("POST", X_CREATE_POST_URL),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: content }),
    });
    const responseBody = await readXResponse(response);

    if (!response.ok) {
      return {
        platform: "x",
        success: false,
        message: createErrorMessage(response.status, responseBody),
        errorDetail: createXErrorDetail(response.status, responseBody),
        postedAt,
      };
    }

    const postId =
      typeof responseBody === "string" ? undefined : responseBody.data?.id;

    return {
      platform: "x",
      success: true,
      message: postId
        ? `X post published successfully. Post ID: ${postId}`
        : "X post published successfully.",
      postedAt,
      postId,
      postUrl: postId ? `https://x.com/i/web/status/${postId}` : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return {
      platform: "x",
      success: false,
      message: `X API request failed: ${message}`,
      errorDetail: {
        source: "X API",
        stage: "network",
        stageLabel: "요청 실행",
        message,
        retryHint: "네트워크 오류, 서버 런타임 오류, 환경 변수 값을 확인하세요.",
      },
      postedAt,
    };
  }
}
