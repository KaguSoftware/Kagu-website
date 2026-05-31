import { PageHeader } from "../../_components/ui";
import { StackTokenForm } from "../StackTokenForm";
import { createStackToken } from "../../_actions/stack-tokens";

export default async function NewStackTokenPage({
  searchParams,
}: {
  searchParams: Promise<{ placement?: string }>;
}) {
  const { placement } = await searchParams;
  return (
    <div className="space-y-8">
      <PageHeader title="New marquee item" />
      <StackTokenForm action={createStackToken} defaultPlacement={placement} />
    </div>
  );
}
