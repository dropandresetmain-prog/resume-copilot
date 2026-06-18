import { ResumePreviewPageClient } from "@/components/pages/ResumePreviewPageClient";

type ResumePreviewPageProps = {
  params: Promise<{ draftId: string }>;
};

export default async function ResumePreviewPage({ params }: ResumePreviewPageProps) {
  const { draftId } = await params;
  return <ResumePreviewPageClient draftId={draftId} />;
}
