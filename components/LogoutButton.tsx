"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      className="inline-flex h-10 w-auto items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 disabled:text-zinc-400"
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      title="로그아웃"
    >
      <LogOut aria-hidden="true" className="h-4 w-4" />
      {isLoggingOut ? "로그아웃 중" : "로그아웃"}
    </button>
  );
}
