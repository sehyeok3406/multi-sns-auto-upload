"use client";

import { useState } from "react";
import { AccountStatus } from "@/components/AccountStatus";
import { AppShell } from "@/components/AppShell";
import { PostComposer } from "@/components/PostComposer";
import { PostHistoryList } from "@/components/PostHistoryList";

export function DashboardClient() {
  const [historyVersion, setHistoryVersion] = useState(0);

  return (
    <AppShell
      title="게시물 작성"
      subtitle="작성자 프리셋, 주제 태그, 이미지 첨부를 정리해서 Threads 게시물을 올립니다."
    >
      <AccountStatus />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <PostComposer
          onPublished={() => setHistoryVersion((version) => version + 1)}
        />
        <PostHistoryList refreshToken={historyVersion} />
      </section>
    </AppShell>
  );
}
