"use client";

import { useState } from "react";
import { AccountStatus } from "@/components/AccountStatus";
import { LogoutButton } from "@/components/LogoutButton";
import { PostComposer } from "@/components/PostComposer";
import { PostHistoryList } from "@/components/PostHistoryList";

export function DashboardClient() {
  const [historyVersion, setHistoryVersion] = useState(0);

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-zinc-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-teal-700">SNS auto upload</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal sm:text-3xl">
              팀 SNS 통합 업로드
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              X와 Threads 게시 흐름을 한 화면에서 확인하는 MVP 대시보드입니다.
            </p>
          </div>
          <LogoutButton />
        </header>

        <AccountStatus />

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <PostComposer
            onPublished={() => setHistoryVersion((version) => version + 1)}
          />
          <PostHistoryList refreshToken={historyVersion} />
        </section>
      </div>
    </main>
  );
}
