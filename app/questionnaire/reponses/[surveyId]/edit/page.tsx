import { notFound } from "next/navigation";
import SurveyAdminGuard from "../../../../../components/survey/responses/SurveyAdminGuard";
import SurveyEditorWorkspace from "../../../../../components/survey/responses/SurveyEditorWorkspace";
import { fetchSurveyDefinition, getSurveyMeta } from "../../../../../app/actions/survey";
import { getDefaultSurveyDefinition } from "../../../../../lib/survey/surveyRegistry";

type PageProps = {
  params: Promise<{ surveyId: string }>;
};

export default async function SurveyEditorPage({ params }: PageProps) {
  const { surveyId } = await params;
  const meta = await getSurveyMeta(surveyId);
  if (!meta) notFound();

  const result = await fetchSurveyDefinition(surveyId);
  const initialDefinition =
    (result.ok ? result.definition : null) ?? getDefaultSurveyDefinition(surveyId);
  if (!initialDefinition) notFound();

  return (
    <SurveyAdminGuard>
      <SurveyEditorWorkspace
        surveyId={surveyId}
        title={meta.title}
        initialDefinition={initialDefinition}
      />
    </SurveyAdminGuard>
  );
}
