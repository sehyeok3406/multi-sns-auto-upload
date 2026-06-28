import { getXAccountStatus } from "@/lib/accounts";
import type { PublishResult } from "@/lib/types";

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

  return {
    platform: "x",
    success: true,
    message: "X mock 게시가 완료되었습니다.",
    postedAt,
    mockPostId: `mock-x-${postedAt}-${content.length}`,
  };
}
