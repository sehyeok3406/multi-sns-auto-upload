import { redirect } from "next/navigation";
import { RepliesClient } from "@/components/RepliesClient";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RepliesPage() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  return <RepliesClient />;
}
