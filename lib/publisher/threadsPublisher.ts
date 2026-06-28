import { getThreadsAccountStatus } from "@/lib/accounts";
import type { PublishResult } from "@/lib/types";

export async function publishToThreads(content: string): Promise<PublishResult> {
  const status = getThreadsAccountStatus();
  const postedAt = new Date().toISOString();

  if (!status.connected) {
    return {
      platform: "threads",
      success: false,
      message: status.message,
      postedAt,
    };
  }

  return {
    platform: "threads",
    success: true,
    message: "Threads mock 게시가 완료되었습니다.",
    postedAt,
    mockPostId: `mock-threads-${postedAt}-${content.length}`,
  };
}
