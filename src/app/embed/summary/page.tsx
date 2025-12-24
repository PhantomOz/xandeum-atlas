import { SummaryCard } from "@/components/embed/SummaryCard";
import { fetchSummary } from "@/lib/export-fetch";

interface PageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function SummaryEmbedPage({ searchParams }: PageProps) {
  const token = typeof searchParams.token === "string" ? searchParams.token : undefined;
  const summary = await fetchSummary(token);
  return <SummaryCard summary={summary} />;
}
