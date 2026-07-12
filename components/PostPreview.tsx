"use client";

import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { normalizeSpoilerRanges } from "@/lib/threadsSpoilers";
import type {
  ThreadsPollAttachment,
  ThreadsPostMedia,
  ThreadsSpoilerRange,
  ThreadsTextAttachment,
} from "@/lib/types";

function PreviewText({
  emptyLabel,
  ranges,
  text,
}: {
  emptyLabel: string;
  ranges: ThreadsSpoilerRange[];
  text: string;
}) {
  if (!text.trim()) {
    return <span className="text-zinc-500">{emptyLabel}</span>;
  }

  const normalizedRanges = normalizeSpoilerRanges(text, ranges);
  const parts: ReactNode[] = [];
  let cursor = 0;

  normalizedRanges.forEach((range, index) => {
    if (range.start > cursor) {
      parts.push(text.slice(cursor, range.start));
    }

    parts.push(
      <span
        key={`spoiler-${range.start}-${range.end}-${index}`}
        className="rounded bg-zinc-900 px-1 text-transparent selection:bg-zinc-700"
      >
        {text.slice(range.start, range.end)}
      </span>,
    );
    cursor = range.end;
  });

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return <>{parts}</>;
}

function getPollOptions(pollAttachment: ThreadsPollAttachment) {
  return [
    pollAttachment.option_a,
    pollAttachment.option_b,
    pollAttachment.option_c,
    pollAttachment.option_d,
  ].filter(Boolean);
}

export function PostPreview({
  content,
  imageUrl,
  isImageSpoiler = false,
  pollAttachment,
  spoilerRanges = [],
  textAttachment,
  threadMedia = [],
  threadItems = [],
  topicTag,
}: {
  content: string;
  imageUrl?: string;
  isImageSpoiler?: boolean;
  pollAttachment?: ThreadsPollAttachment;
  spoilerRanges?: ThreadsSpoilerRange[][];
  textAttachment?: ThreadsTextAttachment;
  threadMedia?: ThreadsPostMedia[];
  threadItems?: string[];
  topicTag?: string;
}) {
  const totalItems = threadItems.length + 1;
  const mediaItems = [
    threadMedia[0] ?? { imageUrl, isImageSpoiler },
    ...threadItems.map((_, index) => threadMedia[index + 1] ?? {}),
  ];

  function renderPreviewImage(media: ThreadsPostMedia, label: string) {
    if (!media.imageUrl) {
      return null;
    }

    return (
      <div className="mt-3 overflow-hidden rounded-md border border-zinc-200 bg-white">
        <div className="relative h-80 w-full">
          <Image
            className={`object-contain ${media.isImageSpoiler ? "blur-md" : ""}`}
            src={media.imageUrl}
            alt={`${label} 이미지 미리보기`}
            fill
            sizes="(max-width: 768px) 100vw, 720px"
            unoptimized
          />
          {media.isImageSpoiler ? (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/40 text-white">
              <span className="inline-flex items-center gap-2 rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold">
                <EyeOff aria-hidden="true" className="h-4 w-4" />
                스포일러 이미지
              </span>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

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
              {topicTag ? (
                <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">
                  {topicTag}
                </span>
              ) : null}
            </div>
            <div className="mt-2 min-h-16 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-800">
              <PreviewText
                emptyLabel="작성 중인 게시글이 표시됩니다."
                ranges={spoilerRanges[0] ?? []}
                text={content}
              />
            </div>
            {pollAttachment ? (
              <div className="mt-3 space-y-2 rounded-md border border-zinc-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  설문
                </p>
                {getPollOptions(pollAttachment).map((option, index) => (
                  <div
                    key={`preview-poll-option-${index}`}
                    className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-800"
                  >
                    {option}
                  </div>
                ))}
              </div>
            ) : null}
            {textAttachment ? (
              <div className="mt-3 rounded-md border border-zinc-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    텍스트 첨부
                  </p>
                  <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-500">
                    {Array.from(textAttachment.plaintext).length.toLocaleString(
                      "ko-KR",
                    )}
                    자
                  </span>
                </div>
                <p className="max-h-40 overflow-hidden whitespace-pre-wrap break-words text-sm leading-6 text-zinc-800">
                  {textAttachment.plaintext}
                </p>
                {textAttachment.link_attachment_url ? (
                  <p className="mt-3 truncate text-xs font-semibold text-teal-700">
                    {textAttachment.link_attachment_url}
                  </p>
                ) : null}
              </div>
            ) : null}
            {renderPreviewImage(mediaItems[0] ?? {}, "1번 글")}

            {threadItems.length > 0 ? (
              <div className="mt-4 space-y-4 border-l border-zinc-200 pl-4">
                {threadItems.map((item, index) => (
                  <div key={`preview-thread-item-${index}`}>
                    <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-500">
                      {index + 2}/{totalItems}
                    </span>
                    <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-800">
                      <PreviewText
                        emptyLabel="추가 타래 글이 표시됩니다."
                        ranges={spoilerRanges[index + 1] ?? []}
                        text={item}
                      />
                    </div>
                    {renderPreviewImage(
                      mediaItems[index + 1] ?? {},
                      `${index + 2}번 글`,
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
