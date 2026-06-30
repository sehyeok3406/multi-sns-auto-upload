import { redirect } from "next/navigation";
import { Layers3, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/LoginForm";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAuthenticated()) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1fr)]">
        <div className="hidden lg:block">
          <div className="inline-flex h-11 items-center gap-2 rounded-md border border-teal-200 bg-white px-3 text-sm font-semibold text-teal-800 shadow-sm">
            <Layers3 aria-hidden="true" className="h-4 w-4" />
            SNS auto upload
          </div>
          <h1 className="mt-6 max-w-xl text-4xl font-semibold leading-tight tracking-normal text-zinc-950">
            팀 SNS 게시 작업을
            <br />
            차분하게 관리하는 콘솔
          </h1>
          <div className="mt-8 grid max-w-lg grid-cols-2 gap-3">
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Access
              </p>
              <p className="mt-2 text-lg font-semibold text-zinc-950">
                Team only
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Channels
              </p>
              <p className="mt-2 text-lg font-semibold text-zinc-950">
                X / Threads
              </p>
            </div>
          </div>
        </div>

        <section className="w-full rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-7 flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-teal-700 text-white">
              <ShieldCheck aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-teal-700">
                SNS auto upload
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal">
                팀 접근 로그인
              </h2>
            </div>
          </div>
          <LoginForm />
        </section>
      </section>
    </main>
  );
}
