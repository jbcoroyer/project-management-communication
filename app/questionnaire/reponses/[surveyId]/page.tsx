import { notFound } from "next/navigation";
import SurveyAdminGuard from "../../../../components/survey/responses/SurveyAdminGuard";
import SurveyHubWorkspace from "../../../../components/survey/responses/SurveyHubWorkspace";
import { getSurveyMeta } from "../../../../app/actions/survey";
import { createServerSupabase } from "../../../../lib/server/supabaseServer";

type PageProps = {
  params: Promise<{ surveyId: string }>;
};

export default async function SurveyHubPage({ params }: PageProps) {
  const { surveyId } = await params;
  const meta = await getSurveyMeta(surveyId);
  if (!meta) notFound();

  const supabase = await createServerSupabase();
  const { count } = await supabase
    .from("survey_responses")
    .select("*", { count: "exact", head: true })
    .eq("survey_version", meta.version);

  return (
    <SurveyAdminGuard>
      <SurveyHubWorkspace meta={meta} responseCount={count ?? 0} />
    </SurveyAdminGuard>
  );
}
