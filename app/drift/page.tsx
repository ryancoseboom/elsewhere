import { redirect } from "next/navigation";
import { artifacts } from "@/data/artifacts";

export default function DriftPage() {
  const randomArtifact =
    artifacts[Math.floor(Math.random() * artifacts.length)];

  redirect(`/artifact/${randomArtifact.slug}`);
}