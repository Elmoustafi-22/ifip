import ApplicationsWorkspace from "./ApplicationsWorkspace";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const { view } = await searchParams;
  return <ApplicationsWorkspace view={view === "pending" ? "pending" : "paid"} />;
}
