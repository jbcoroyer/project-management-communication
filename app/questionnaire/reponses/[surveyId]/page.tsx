import { notFound } from "next/navigation";
import SurveyAdminGuard from "../../../../components/survey/responses/SurveyAdminGuard";
import SurveyHubWorkspace from "../../../../components/survey/responses/SurveyHubWorkspace";
import { getSurveyRegistryEntry } from "../../../../lib/survey/surveyRegistry";
import { createServerSupabase } from "../../../../lib/server/supabaseServer";

type PageProps = {
  params: Promise<{ surveyId: string }>;
};

export default async function SurveyHubPage({ params }: PageProps) {
  const { surveyId } = await params;
  const entry = getSurveyRegistryEntry(surveyId);
  if (!entry) notFound();

  const supabase = await createServerSupabase();
  const { count } = await supabase
    .from("survey_responses")
    .select("*", { count: "exact", head: true })
    .eq("survey_version", entry.version);

  return (
    <SurveyAdminGuard>
      <SurveyHubWorkspace surveyId={surveyId} responseCount={count ?? 0} />
    </SurveyAdminGuard>
  );
}
