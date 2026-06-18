import { ResumeDraftEditPageClient } from "@/components/pages/ResumeDraftEditPageClient";

type ResumeDraftEditPageProps = {
  params: Promise<{ draftId: string }>;
};

export default async function ResumeDraftEditPage({ params }: ResumeDraftEditPageProps) {
  const { draftId } = await params;
  return <ResumeDraftEditPageClient draftId={draftId} />;
}
