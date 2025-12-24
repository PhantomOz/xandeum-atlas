import { HistoryCard } from "@/components/embed/HistoryCard";
import { fetchHistory } from "@/lib/export-fetch";

interface PageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function HistoryEmbedPage({ searchParams }: PageProps) {
  const token = typeof searchParams.token === "string" ? searchParams.token : undefined;
  const interval = typeof searchParams.interval === "string" ? searchParams.interval : undefined;
  const points = typeof searchParams.points === "string" ? Number(searchParams.points) : undefined;
  const history = await fetchHistory({ token, interval, points });
  return <HistoryCard history={history} />;
}
