import { CoverLetterPreviewPageClient } from "@/components/pages/CoverLetterPreviewPageClient";

type CoverLetterPreviewPageProps = {
  params: Promise<{ draftId: string }>;
};

export default async function CoverLetterPreviewPage({ params }: CoverLetterPreviewPageProps) {
  const { draftId } = await params;
  return <CoverLetterPreviewPageClient draftId={draftId} />;
}
