import { notFound } from "next/navigation";
import SurveyAdminGuard from "../../../../../components/survey/responses/SurveyAdminGuard";
import SurveyResponsesWorkspace from "../../../../../components/survey/responses/SurveyResponsesWorkspace";
import { getSurveyMeta } from "../../../../../app/actions/survey";

type PageProps = {
  params: Promise<{ surveyId: string }>;
};

export default async function SurveyResponsesDetailPage({ params }: PageProps) {
  const { surveyId } = await params;
  const meta = await getSurveyMeta(surveyId);
  if (!meta) notFound();

  return (
    <SurveyAdminGuard>
      <SurveyResponsesWorkspace surveyId={surveyId} title={meta.title} publicPath={meta.publicPath} />
    </SurveyAdminGuard>
  );
}
