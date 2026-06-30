"use client";

import { AlertCircle } from "lucide-react";

export function Toast({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return (
    <div className="w-full rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700 sm:flex-1">
      <div className="flex items-start gap-2">
        <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{message}</p>
      </div>
    </div>
  );
}
