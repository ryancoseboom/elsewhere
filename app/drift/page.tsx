import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Artifact = {
  slug: string;
  drift_weight: number | null;
};

function weightedPick(items: Artifact[]) {
  const weightedItems = items.map((item) => ({
    ...item,
    weight: item.drift_weight ?? 100,
  }));

  const totalWeight = weightedItems.reduce(
    (sum, item) => sum + Math.max(item.weight, 1),
    0
  );

  let random = Math.random() * totalWeight;

  for (const item of weightedItems) {
    random -= Math.max(item.weight, 1);

    if (random <= 0) {
      return item;
    }
  }

  return weightedItems[0];
}

export default async function DriftPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("artifacts")
    .select("slug, drift_weight")
    .eq("is_public", true);

  if (error) {
    throw new Error(error.message);
  }

  const artifacts = (data || []) as Artifact[];

  if (artifacts.length === 0) {
    redirect("/");
  }

  const artifact = weightedPick(artifacts);

  redirect(`/artifact/${artifact.slug}`);
}