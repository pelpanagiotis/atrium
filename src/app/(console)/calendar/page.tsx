import { redirect } from "next/navigation";

/** Legacy route — Schedule replaced Calendar. */
export default async function CalendarRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.month) query.set("month", params.month);
  if (params.view) query.set("view", params.view);
  const suffix = query.toString();
  redirect(suffix ? `/schedule?${suffix}` : "/schedule");
}
