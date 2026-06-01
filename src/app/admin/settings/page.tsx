import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "../_components/ui";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("site_settings")
    .select("*")
    .eq("singleton", true)
    .single();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Site settings"
        description="Studio facts and world clocks used across the site footer and About page."
      />
      {settings ? (
        <SettingsForm settings={settings} />
      ) : (
        <EmptyState>
          No settings row found. Re-run the seed SQL (the site_settings insert).
        </EmptyState>
      )}
    </div>
  );
}
