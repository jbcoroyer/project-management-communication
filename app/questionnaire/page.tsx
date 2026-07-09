import type { Metadata } from "next";
import SurveyForm from "../../components/survey/SurveyForm";

export const metadata: Metadata = {
  title: "Questionnaire de satisfaction",
  description:
    "Donnez votre avis sur le service Communication IDENA. Questionnaire anonyme, environ 5 minutes.",
};

export default function QuestionnairePage() {
  return <SurveyForm surveyId="satisfaction-2026" />;
}
