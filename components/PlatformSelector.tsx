"use client";

import { Check, MessageCircle } from "lucide-react";
import type { Platform } from "@/lib/types";

const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
  { value: "x", label: "X" },
  { value: "threads", label: "Threads" },
];

export function PlatformSelector({
  selected,
  onChange,
}: {
  selected: Platform[];
  onChange: (platforms: Platform[]) => void;
}) {
  function togglePlatform(platform: Platform) {
    if (selected.includes(platform)) {
      onChange(selected.filter((item) => item !== platform));
      return;
    }

    onChange([...selected, platform]);
  }

  return (
    <div className="grid grid-cols-2 gap-3" role="group" aria-label="플랫폼 선택">
      {PLATFORM_OPTIONS.map((option) => {
        const active = selected.includes(option.value);

        return (
          <button
            key={option.value}
            className={`flex min-h-14 items-center justify-between gap-3 rounded-md border px-3 text-sm font-semibold shadow-sm transition ${
              active
                ? "border-teal-700 bg-teal-50 text-teal-900"
                : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
            }`}
            type="button"
            aria-pressed={active}
            onClick={() => togglePlatform(option.value)}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                  active ? "bg-white text-teal-800" : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {option.value === "x" ? (
                  <span className="text-sm font-bold">X</span>
                ) : (
                  <MessageCircle aria-hidden="true" className="h-4 w-4" />
                )}
              </span>
              <span className="truncate">{option.label}</span>
            </span>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-current">
              {active ? (
                <Check aria-hidden="true" className="h-3.5 w-3.5" />
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
