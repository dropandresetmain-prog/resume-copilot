import { NewApplicationPageClient } from "@/components/pages/NewApplicationPageClient";

type GeneratePageProps = {
  searchParams: Promise<{ jobId?: string }>;
};

export default async function GeneratePage({ searchParams }: GeneratePageProps) {
  const params = await searchParams;
  return <NewApplicationPageClient initialJobId={params.jobId} />;
}
