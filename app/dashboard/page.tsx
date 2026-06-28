import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/DashboardClient";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  return <DashboardClient />;
}
