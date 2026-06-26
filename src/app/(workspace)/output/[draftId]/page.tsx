import { OutputEditorPageClient } from "@/components/pages/OutputEditorPageClient";

type OutputEditorPageProps = {
  params: Promise<{ draftId: string }>;
};

export default async function OutputEditorPage({ params }: OutputEditorPageProps) {
  const { draftId } = await params;
  return <OutputEditorPageClient draftId={draftId} />;
}
