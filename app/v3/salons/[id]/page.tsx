import SalonDetailPage from "../../../../components/salons/SalonDetailPage";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <SalonDetailPage salonId={id} />;
}
