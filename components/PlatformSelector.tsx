"use client";

import { Check } from "lucide-react";
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
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="플랫폼 선택">
      {PLATFORM_OPTIONS.map((option) => {
        const active = selected.includes(option.value);

        return (
          <button
            key={option.value}
            className={`flex h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition ${
              active
                ? "border-teal-700 bg-teal-50 text-teal-800"
                : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
            type="button"
            aria-pressed={active}
            onClick={() => togglePlatform(option.value)}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-sm border border-current">
              {active ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : null}
            </span>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
