"use client";

import { ChartNoAxesColumn, Layers3, MessageCircle, PenLine } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/LogoutButton";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "게시물 작성",
    icon: PenLine,
  },
  {
    href: "/dashboard/replies",
    label: "댓글 작성",
    icon: MessageCircle,
  },
  {
    href: "/dashboard/insights",
    label: "게시 성과",
    icon: ChartNoAxesColumn,
  },
];

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
}) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center justify-between gap-4">
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

          <nav className="flex gap-2 overflow-x-auto" aria-label="주요 기능">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/dashboard"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold shadow-sm transition ${
                    isActive
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
                  }`}
                  href={item.href}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="border-b border-zinc-200 pb-5">
          <p className="text-sm font-semibold text-zinc-500">Dashboard</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            {subtitle}
          </p>
        </section>

        {children}
      </div>
    </main>
  );
}
