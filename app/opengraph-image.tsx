import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/seo";

export const alt =
  "Fica Tostadores — Maquinaria industrial de tostado de café";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0c0e12",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "18px",
              background: "#e85d04",
              display: "flex",
            }}
          />
          <span style={{ color: "#ffffff", fontSize: "34px", fontWeight: 700 }}>
            {SITE_NAME}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <span
            style={{
              color: "#e85d04",
              fontSize: "26px",
              fontWeight: 600,
              letterSpacing: "4px",
            }}
          >
            MAQUINARIA DE TOSTADO
          </span>
          <span
            style={{
              color: "#ffffff",
              fontSize: "72px",
              fontWeight: 800,
              lineHeight: 1.05,
            }}
          >
            Tostadores de café industriales y comerciales
          </span>
        </div>

        <span style={{ color: "#9aa2ab", fontSize: "26px" }}>
          Fabricación chilena · IX Región · tostadoresfica.cl
        </span>
      </div>
    ),
    { ...size },
  );
}
