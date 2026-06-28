"use client";

export function PostPreview({ content }: { content: string }) {
  return (
    <div className="min-h-28 border-t border-zinc-200 pt-4">
      <p className="text-sm font-semibold text-zinc-800">미리보기</p>
      <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-800">
        {content.trim() ? (
          content
        ) : (
          <span className="text-zinc-500">작성 중인 게시글이 표시됩니다.</span>
        )}
      </div>
    </div>
  );
}
