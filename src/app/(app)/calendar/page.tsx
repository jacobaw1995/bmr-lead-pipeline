import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface CalendarRedirectProps {
  searchParams: { month?: string };
}

/** Legacy route — calendar lives in The Field as a view toggle. */
export default function CalendarRedirect({ searchParams }: CalendarRedirectProps) {
  const params = new URLSearchParams({ view: "calendar" });
  if (searchParams.month) params.set("month", searchParams.month);
  redirect(`/field?${params}`);
}