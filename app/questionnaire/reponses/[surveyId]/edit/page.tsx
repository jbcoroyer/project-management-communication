import { notFound } from "next/navigation";
import SurveyAdminGuard from "../../../../../components/survey/responses/SurveyAdminGuard";
import SurveyEditorWorkspace from "../../../../../components/survey/responses/SurveyEditorWorkspace";
import { fetchSurveyDefinition } from "../../../../../app/actions/survey";
import {
  getDefaultSurveyDefinition,
  getSurveyRegistryEntry,
} from "../../../../../lib/survey/surveyRegistry";

type PageProps = {
  params: Promise<{ surveyId: string }>;
};

export default async function SurveyEditorPage({ params }: PageProps) {
  const { surveyId } = await params;
  const entry = getSurveyRegistryEntry(surveyId);
  if (!entry) notFound();

  const result = await fetchSurveyDefinition(surveyId);
  const initialDefinition =
    (result.ok ? result.definition : null) ?? getDefaultSurveyDefinition(surveyId);
  if (!initialDefinition) notFound();

  return (
    <SurveyAdminGuard>
      <SurveyEditorWorkspace surveyId={surveyId} initialDefinition={initialDefinition} />
    </SurveyAdminGuard>
  );
}
