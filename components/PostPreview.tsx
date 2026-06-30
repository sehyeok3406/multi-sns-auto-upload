"use client";

import { Eye } from "lucide-react";

export function PostPreview({ content }: { content: string }) {
  return (
    <div className="border-t border-zinc-200 pt-5">
      <div className="mb-3 flex items-center gap-2">
        <Eye aria-hidden="true" className="h-4 w-4 text-teal-700" />
        <p className="text-sm font-semibold text-zinc-800">미리보기</p>
      </div>
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-white">
            S
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-zinc-950">Team SNS</p>
              <span className="text-xs text-zinc-500">preview</span>
            </div>
            <div className="mt-2 min-h-16 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-800">
              {content.trim() ? (
                content
              ) : (
                <span className="text-zinc-500">
                  작성 중인 게시글이 표시됩니다.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
