"use client";

import { AppShell } from "@/components/AppShell";
import { ThreadsInbox } from "@/components/ThreadsInbox";

export function RepliesClient() {
  return (
    <AppShell
      title="댓글 작성"
      subtitle="내 Threads 게시물을 고르고, 달린 댓글을 확인한 뒤 원글이나 특정 댓글에 답글을 남깁니다."
    >
      <ThreadsInbox />
    </AppShell>
  );
}
