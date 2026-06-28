"use client";

import { Send } from "lucide-react";
import { useMemo, useState } from "react";
import { PlatformSelector } from "@/components/PlatformSelector";
import { PostPreview } from "@/components/PostPreview";
import { PublishResult } from "@/components/PublishResult";
import { Toast } from "@/components/Toast";
import type { Platform, PublishResult as PublishResultType } from "@/lib/types";

export function PostComposer({ onPublished }: { onPublished: () => void }) {
  const [content, setContent] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>(["x", "threads"]);
  const [createdAt, setCreatedAt] = useState(() => new Date().toISOString());
  const [error, setError] = useState("");
  const [results, setResults] = useState<PublishResultType[] | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const trimmedContent = content.trim();
  const characterCount = useMemo(() => content.length, [content]);

  async function handlePublish() {
    setError("");
    setResults(null);

    if (!trimmedContent) {
      setError("게시글 내용을 입력해 주세요.");
      return;
    }

    if (platforms.length === 0) {
      setError("업로드할 플랫폼을 최소 1개 선택해 주세요.");
      return;
    }

    setIsPublishing(true);

    try {
      const response = await fetch("/api/posts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmedContent,
          platforms,
          createdAt,
        }),
      });
      const data = (await response.json()) as {
        message?: string;
        results?: PublishResultType[];
      };

      if (!response.ok || !data.results) {
        setError(data.message ?? "게시 요청에 실패했습니다.");
        return;
      }

      setResults(data.results);
      onPublished();

      if (data.results.every((result) => result.success)) {
        setContent("");
        setCreatedAt(new Date().toISOString());
      }
    } catch {
      setError("게시 요청 중 문제가 발생했습니다.");
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">게시글 작성</h2>
          <span className="text-sm font-medium text-zinc-600">
            {characterCount.toLocaleString("ko-KR")}자
          </span>
        </div>

        <label className="mt-4 block">
          <span className="sr-only">게시글 내용</span>
          <textarea
            className="min-h-44 w-full resize-y rounded-md border border-zinc-300 bg-white p-3 text-base leading-7 text-zinc-950 shadow-sm transition placeholder:text-zinc-400 focus:border-teal-700"
            value={content}
            onChange={(event) => {
              if (!content) {
                setCreatedAt(new Date().toISOString());
              }
              setContent(event.target.value);
            }}
            placeholder="팀 계정에 업로드할 게시글을 작성하세요."
          />
        </label>

        <div className="mt-4 space-y-3">
          <p className="text-sm font-semibold text-zinc-800">업로드 대상</p>
          <PlatformSelector selected={platforms} onChange={setPlatforms} />
        </div>

        <div className="mt-4">
          <PostPreview content={content} />
        </div>

        <div className="mt-4 space-y-3">
          <Toast message={error} />
          <button
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-zinc-400 sm:w-auto"
            type="button"
            onClick={handlePublish}
            disabled={isPublishing}
            title="게시"
          >
            <Send aria-hidden="true" className="h-4 w-4" />
            {isPublishing ? "게시 중" : "게시"}
          </button>
        </div>
      </div>

      <PublishResult results={results} />
    </section>
  );
}
