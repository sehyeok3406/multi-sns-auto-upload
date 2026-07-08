import { redirect } from "next/navigation";
import { InsightsClient } from "@/components/InsightsClient";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  return <InsightsClient />;
}
