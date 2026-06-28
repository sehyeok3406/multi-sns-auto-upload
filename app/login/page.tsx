import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAuthenticated()) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-8">
          <p className="text-sm font-medium text-teal-700">SNS auto upload</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal">
            팀 접근 로그인
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            설정된 팀 비밀번호로 대시보드에 접근합니다.
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
