import SurveyAdminGuard from "../../../components/survey/responses/SurveyAdminGuard";
import SurveyListWorkspace from "../../../components/survey/responses/SurveyListWorkspace";

export const dynamic = "force-dynamic";

export default function SurveyResponsesPage() {
  return (
    <SurveyAdminGuard>
      <SurveyListWorkspace />
    </SurveyAdminGuard>
  );
}
