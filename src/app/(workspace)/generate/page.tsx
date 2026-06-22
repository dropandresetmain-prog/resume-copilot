import { GeneratePageClient } from "@/components/pages/GeneratePageClient";

type GeneratePageProps = {
  searchParams: Promise<{ jobId?: string }>;
};

export default async function GeneratePage({ searchParams }: GeneratePageProps) {
  const params = await searchParams;
  return <GeneratePageClient initialJobId={params.jobId} />;
}
