import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#080b10",
      backgroundImage: "radial-gradient(circle at 50% 20%, #1d3324, #080b10 68%)",
      borderRadius: 112
    }}>
      <div style={{
        width: 330, height: 330, display: "flex", alignItems: "center",
        justifyContent: "center", borderRadius: 92,
        background: "linear-gradient(145deg, #d0ff72, #8fe52e)",
        color: "#10160b", fontSize: 250, fontWeight: 900,
        letterSpacing: -22, boxShadow: "0 0 80px rgba(184,255,75,.25)"
      }}>V</div>
      <div style={{
        position: "absolute", right: 65, bottom: 65, width: 70, height: 70,
        borderRadius: 35, background: "#5be7e7", border: "12px solid #080b10"
      }} />
    </div>,
    { ...size }
  );
}
