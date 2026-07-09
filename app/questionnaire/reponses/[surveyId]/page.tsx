import { notFound } from "next/navigation";
import SurveyAdminGuard from "../../../../components/survey/responses/SurveyAdminGuard";
import SurveyResponsesWorkspace from "../../../../components/survey/responses/SurveyResponsesWorkspace";
import { getSurveyRegistryEntry } from "../../../../lib/survey/surveyRegistry";

type PageProps = {
  params: Promise<{ surveyId: string }>;
};

export default async function SurveyResponsesDetailPage({ params }: PageProps) {
  const { surveyId } = await params;
  if (!getSurveyRegistryEntry(surveyId)) notFound();

  return (
    <SurveyAdminGuard>
      <SurveyResponsesWorkspace surveyId={surveyId} />
    </SurveyAdminGuard>
  );
}
