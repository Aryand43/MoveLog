import PackClient from "./PackClient";

export const dynamic = "force-dynamic";

export default async function Pack({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PackClient token={token} />;
}
