import { createHmac, randomBytes } from "node:crypto";
import { getXAccountStatus } from "@/lib/accounts";
import type { PublishResult } from "@/lib/types";

const X_CREATE_POST_URL = "https://api.x.com/2/tweets";

type XCreatePostResponse = {
  data?: {
    id?: string;
    text?: string;
  };
  detail?: string;
  title?: string;
  errors?: Array<{
    detail?: string;
    message?: string;
    title?: string;
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
  if (typeof response === "string") {
    return `X API request failed (${status}): ${response}`;
  }

  const errorDetails =
    response.errors
      ?.map((error) => error.detail ?? error.message ?? error.title)
      .filter(Boolean)
      .join(" / ") ??
    response.detail ??
    response.title;

  return `X API request failed (${status})${
    errorDetails ? `: ${errorDetails}` : "."
  }`;
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
      postedAt,
    };
  }
}
