"use client";

import { AppShell } from "@/components/AppShell";
import { ThreadsInsightsPanel } from "@/components/ThreadsInsightsPanel";

export function InsightsClient() {
  return (
    <AppShell
      title="게시 성과"
      subtitle="최근 Threads 게시물의 조회, 좋아요, 댓글, 리포스트, 인용, 공유 성과를 확인합니다."
    >
      <ThreadsInsightsPanel />
    </AppShell>
  );
}
