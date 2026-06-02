import { ImageResponse } from "next/og";

export const alt = "Elsewhere / Halou. An unstable archive.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const fragments = [
  { left: 44, top: 52, width: 240, height: 182, opacity: 0.24 },
  { left: 284, top: 52, width: 184, height: 182, opacity: 0.16 },
  { left: 44, top: 234, width: 168, height: 164, opacity: 0.12 },
  { left: 212, top: 234, width: 256, height: 164, opacity: 0.2 },
  { left: 44, top: 398, width: 272, height: 180, opacity: 0.18 },
  { left: 316, top: 398, width: 152, height: 180, opacity: 0.1 },
];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#090807",
          color: "#e7e5e4",
          display: "flex",
          height: "100%",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background:
              "radial-gradient(circle at 22% 36%, rgba(155, 27, 48, 0.25), transparent 35%), radial-gradient(circle at 82% 74%, rgba(74, 63, 115, 0.22), transparent 42%)",
            display: "flex",
            inset: 0,
            position: "absolute",
          }}
        />

        {fragments.map((fragment, index) => (
          <div
            key={index}
            style={{
              background:
                index % 2 === 0
                  ? "linear-gradient(135deg, #33231f, #161311)"
                  : "linear-gradient(135deg, #20231c, #12110f)",
              border: "1px solid rgba(231, 229, 228, 0.08)",
              display: "flex",
              ...fragment,
              position: "absolute",
            }}
          />
        ))}

        <div
          style={{
            borderLeft: "1px solid rgba(231, 229, 228, 0.12)",
            display: "flex",
            flexDirection: "column",
            height: 526,
            justifyContent: "space-between",
            left: 545,
            padding: "10px 0 8px 58px",
            position: "absolute",
            top: 52,
            width: 610,
          }}
        >
          <div
            style={{
              color: "#78716c",
              display: "flex",
              fontSize: 15,
              letterSpacing: "0.42em",
              textTransform: "uppercase",
            }}
          >
            Elsewhere / Halou
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                color: "#78716c",
                display: "flex",
                fontSize: 14,
                letterSpacing: "0.55em",
                textTransform: "uppercase",
              }}
            >
              An unstable archive
            </div>
            <div
              style={{
                color: "#f5f5f4",
                display: "flex",
                fontFamily: "serif",
                fontSize: 116,
                letterSpacing: "-0.07em",
                lineHeight: 1,
                marginTop: 18,
              }}
            >
              Elsewhere
            </div>
            <div
              style={{
                color: "#a8a29e",
                display: "flex",
                fontSize: 19,
                letterSpacing: "0.02em",
                lineHeight: 1.5,
                marginTop: 24,
                maxWidth: 480,
              }}
            >
              Recordings, images, and incomplete transmissions.
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
            Archive transmission / ongoing
          </div>
        </div>
      </div>
    ),
    size
  );
}
