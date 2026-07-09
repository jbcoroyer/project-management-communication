import SurveyAdminGuard from "../../../components/survey/responses/SurveyAdminGuard";
import SurveyListWorkspace from "../../../components/survey/responses/SurveyListWorkspace";

export default function SurveyResponsesPage() {
  return (
    <SurveyAdminGuard>
      <SurveyListWorkspace />
    </SurveyAdminGuard>
  );
}
