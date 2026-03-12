import { getTenantBySlug } from "@/lib/tenant";
import { notFound } from "next/navigation";
import { CheckoutClient } from "./_components/CheckoutClient";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);
  if (!tenant || tenant.status !== "ACTIVE") notFound();

  const serialized = JSON.parse(JSON.stringify(tenant));

  return <CheckoutClient tenant={serialized} />;
}
