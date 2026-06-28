import type { AccountStatuses, PlatformAccountStatus } from "@/lib/types";

export const X_REQUIRED_ENV = [
  "X_API_KEY",
  "X_API_SECRET",
  "X_ACCESS_TOKEN",
  "X_ACCESS_TOKEN_SECRET",
  "X_BEARER_TOKEN",
] as const;

export const THREADS_REQUIRED_ENV = [
  "THREADS_ACCESS_TOKEN",
  "THREADS_USER_ID",
  "META_APP_ID",
  "META_APP_SECRET",
] as const;

function getMissingEnv(keys: readonly string[]) {
  return keys.filter((key) => !process.env[key]?.trim());
}

function createStatus(
  platformLabel: "X" | "Threads",
  requiredEnv: readonly string[],
): PlatformAccountStatus {
  const missingEnv = getMissingEnv(requiredEnv);

  if (missingEnv.length === 0) {
    return {
      connected: true,
      message: `${platformLabel} 게시에 필요한 환경 변수가 모두 설정되어 있습니다.`,
      requiredEnv: [...requiredEnv],
      missingEnv,
    };
  }

  return {
    connected: false,
    message: `${platformLabel} 연결에 필요한 환경 변수 설정이 필요합니다: ${missingEnv.join(", ")}`,
    requiredEnv: [...requiredEnv],
    missingEnv,
  };
}

export function getXAccountStatus() {
  return createStatus("X", X_REQUIRED_ENV);
}

export function getThreadsAccountStatus() {
  return createStatus("Threads", THREADS_REQUIRED_ENV);
}

export function getAccountStatuses(): AccountStatuses {
  return {
    x: getXAccountStatus(),
    threads: getThreadsAccountStatus(),
    checkedAt: new Date().toISOString(),
  };
}
