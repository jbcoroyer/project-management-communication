import GdpProjectDetailPage from "../../../../../components/v3/gdp/GdpProjectDetailPage";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <GdpProjectDetailPage projectId={id} />;
}
