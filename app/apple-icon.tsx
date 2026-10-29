import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#080b10",
      backgroundImage: "radial-gradient(circle at 50% 20%, #1d3324, #080b10 68%)",
      borderRadius: 40
    }}>
      <div style={{
        width: 116, height: 116, display: "flex", alignItems: "center",
        justifyContent: "center", borderRadius: 32,
        background: "linear-gradient(145deg, #d0ff72, #8fe52e)",
        color: "#10160b", fontSize: 92, fontWeight: 900, letterSpacing: -8
      }}>V</div>
    </div>,
    { ...size }
  );
}
