export default function DataDeletionPage({
  searchParams,
}: {
  searchParams: { code?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-xl rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-teal-700">SNS auto upload</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal">
          데이터 삭제 요청
        </h1>
        <p className="mt-4 text-sm leading-6 text-zinc-700">
          현재 SNS auto upload는 Threads OAuth 사용자 데이터를 별도 데이터베이스에
          저장하지 않습니다. 삭제 요청이 접수되면 저장된 사용자 데이터가 없는
          상태로 완료 처리됩니다.
        </p>
        {searchParams.code ? (
          <p className="mt-4 rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
            확인 코드: {searchParams.code}
          </p>
        ) : null}
      </section>
    </main>
  );
}
