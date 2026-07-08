"use client";

import { useState } from "react";
import { Layers3 } from "lucide-react";
import { AccountStatus } from "@/components/AccountStatus";
import { LogoutButton } from "@/components/LogoutButton";
import { PostComposer } from "@/components/PostComposer";
import { PostHistoryList } from "@/components/PostHistoryList";
import { ThreadsInbox } from "@/components/ThreadsInbox";

export function DashboardClient() {
  const [historyVersion, setHistoryVersion] = useState(0);

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-zinc-950 text-white">
              <Layers3 aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-teal-700">
                SNS auto upload
              </p>
              <h1 className="truncate text-lg font-semibold tracking-normal text-zinc-950 sm:text-xl">
                팀 SNS 통합 업로드
              </h1>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-zinc-500">Dashboard</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
              오늘 올릴 게시물을 정리해요
            </h2>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Active workflow
            </p>
            <p className="mt-2 text-sm font-medium leading-6 text-zinc-700">
              작성자 프리셋, 플랫폼 선택, 게시 결과를 한 화면에서 관리합니다.
            </p>
          </div>
        </section>

        <AccountStatus />

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <PostComposer
            onPublished={() => setHistoryVersion((version) => version + 1)}
          />
          <PostHistoryList refreshToken={historyVersion} />
        </section>

        <ThreadsInbox refreshToken={historyVersion} />
      </div>
    </main>
  );
}
