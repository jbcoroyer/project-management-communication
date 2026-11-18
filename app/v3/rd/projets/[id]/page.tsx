import RdProjectDetailPage from "../../../../../components/v3/rd/RdProjectDetailPage";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <RdProjectDetailPage projectId={id} />;
}
