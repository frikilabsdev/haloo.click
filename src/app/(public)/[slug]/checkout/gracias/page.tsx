import { GraciasClient } from "./_components/GraciasClient";

export default async function GraciasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <GraciasClient slug={slug} />;
}
