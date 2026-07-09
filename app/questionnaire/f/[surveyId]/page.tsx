import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SurveyForm from "../../../../components/survey/SurveyForm";
import { getSurveyMeta } from "../../../../app/actions/survey";

type PageProps = {
  params: Promise<{ surveyId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { surveyId } = await params;
  const meta = await getSurveyMeta(surveyId);
  return {
    title: meta?.title ?? "Questionnaire",
    description: meta?.description || "Donnez votre avis. Questionnaire anonyme.",
  };
}

export default async function PublicSurveyPage({ params }: PageProps) {
  const { surveyId } = await params;
  const meta = await getSurveyMeta(surveyId);
  if (!meta) notFound();

  return <SurveyForm surveyId={surveyId} />;
}
