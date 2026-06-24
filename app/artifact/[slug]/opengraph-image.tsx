import { ImageResponse } from "next/og";
import {
  artifactShareDescription,
  artifactShareImageSize,
  artifactShareType,
  artifactShareVisualUrl,
  getArtifactShareData,
} from "@/lib/artifact-share";

export const alt = "Elsewhere archive preview";
export const size = artifactShareImageSize;
export const contentType = "image/png";
export const dynamic = "force-dynamic";

function threadColor(slug: string) {
  const colors = ["#7f1d1d", "#4c1d95", "#0f766e", "#854d0e", "#1d4ed8"];
  const index =
    Array.from(slug).reduce((total, char) => total + char.charCodeAt(0), 0) %
    colors.length;

  return colors[index];
}

export default async function ArtifactOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artifact = await getArtifactShareData(slug);
  const title = artifact?.title || "Elsewhere";
  const type = artifact ? artifactShareType(artifact) : "Archive fragment";
  const description = artifact
    ? artifactShareDescription(artifact)
    : "An unstable archive of recordings, images, and incomplete transmissions.";
  const visualUrl = artifact ? artifactShareVisualUrl(artifact) : "";
  const accent = threadColor(slug);

  return new ImageResponse(
    (
      <div
        style={{
          background: "#090807",
          color: "#f5f5f4",
          display: "flex",
          height: "100%",
          overflow: "hidden",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background: `radial-gradient(circle at 18% 20%, ${accent}66, transparent 34%), radial-gradient(circle at 92% 86%, rgba(68, 64, 60, 0.55), transparent 42%)`,
            display: "flex",
            inset: 0,
            position: "absolute",
          }}
        />

        <div
          style={{
            border: "1px solid rgba(231, 229, 228, 0.12)",
            display: "flex",
            height: 548,
            left: 40,
            overflow: "hidden",
            position: "absolute",
            top: 40,
            width: 500,
          }}
        >
          {visualUrl ? (
            <img
              src={visualUrl}
              alt=""
              style={{
                filter: "saturate(0.82) contrast(1.08)",
                height: "100%",
                objectFit: "cover",
                width: "100%",
              }}
            />
          ) : (
            <div
              style={{
                background: `linear-gradient(135deg, ${accent}55, rgba(12, 10, 9, 0.95)), repeating-linear-gradient(0deg, rgba(245, 245, 244, 0.08) 0, rgba(245, 245, 244, 0.08) 1px, transparent 1px, transparent 18px), repeating-linear-gradient(90deg, rgba(245, 245, 244, 0.05) 0, rgba(245, 245, 244, 0.05) 1px, transparent 1px, transparent 24px)`,
                display: "flex",
                height: "100%",
                width: "100%",
              }}
            />
          )}
        </div>

        <div
          style={{
            background:
              "linear-gradient(90deg, rgba(9, 8, 7, 0.72), #090807 28%)",
            display: "flex",
            inset: "0 0 0 420px",
            position: "absolute",
          }}
        />

        <div
          style={{
            borderLeft: "1px solid rgba(231, 229, 228, 0.14)",
            display: "flex",
            flexDirection: "column",
            height: 548,
            justifyContent: "space-between",
            left: 610,
            padding: "8px 0 4px 58px",
            position: "absolute",
            top: 40,
            width: 520,
          }}
        >
          <div
            style={{
              color: "#a8a29e",
              display: "flex",
              fontSize: 15,
              letterSpacing: "0.42em",
              textTransform: "uppercase",
            }}
          >
            Elsewhere / Halou
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                color: accent,
                display: "flex",
                fontSize: 14,
                letterSpacing: "0.4em",
                textTransform: "uppercase",
              }}
            >
              {type}
            </div>
            <div
              style={{
                color: "#fafaf9",
                display: "flex",
                fontFamily: "serif",
                fontSize: title.length > 32 ? 66 : title.length > 20 ? 78 : 92,
                lineHeight: 0.94,
                marginTop: 22,
                maxWidth: 500,
              }}
            >
              {title}
            </div>
            <div
              style={{
                color: "#a8a29e",
                display: "flex",
                fontSize: 22,
                lineHeight: 1.4,
                marginTop: 28,
                maxWidth: 460,
              }}
            >
              {description}
            </div>
          </div>

          <div
            style={{
              color: "#57534e",
              display: "flex",
              fontSize: 13,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
            }}
          >
            Archive transmission / elsewhere
          </div>
        </div>
      </div>
    ),
    size
  );
}
