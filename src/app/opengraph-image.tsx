import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const alt =
  "Reaksan Unpad - Sistem Manajemen Laboratorium Terpadu Kimia";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#FAF7F2",
        padding: "60px 80px",
        fontFamily: "sans-serif",
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "#F9B129",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: "bold",
              color: "#212121",
            }}
          >
            R
          </div>
          <div
            style={{
              fontSize: "36px",
              fontWeight: "900",
              color: "#212121",
              letterSpacing: "-1px",
            }}
          >
            REAKSAN
          </div>
        </div>
        <div
          style={{
            fontSize: "18px",
            fontWeight: "700",
            color: "#8D6500",
            letterSpacing: "2px",
            textTransform: "uppercase",
          }}
        >
          FMIPA Universitas Padjadjaran
        </div>
      </div>

      {/* Center Main Copy */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "20px",
            fontWeight: "700",
            color: "#8D6500",
            textTransform: "uppercase",
            letterSpacing: "2px",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "4px",
              backgroundColor: "#F9B129",
              borderRadius: "2px",
            }}
          />
          Departemen Kimia Unpad
        </div>
        <div
          style={{
            fontSize: "52px",
            fontWeight: "900",
            color: "#212121",
            lineHeight: 1.15,
            letterSpacing: "-1px",
            maxWidth: "1000px",
          }}
        >
          Sistem Manajemen Laboratorium Terpadu Kimia
        </div>
        <div
          style={{
            fontSize: "24px",
            color: "#6B6B6B",
            lineHeight: 1.4,
            maxWidth: "950px",
          }}
        >
          Koordinasi reservasi laboratorium riset, instrumen analitik canggih,
          dan pengelolaan bahan kimia digital.
        </div>
      </div>

      {/* Bottom Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "2px solid #E1E1E1",
          paddingTop: "24px",
          fontSize: "18px",
          color: "#8D6500",
          fontWeight: "600",
        }}
      >
        <div>reaksan.vercel.app</div>
        <div style={{ color: "#6B6B6B" }}>
          Jatinangor • Sumedang • Jawa Barat
        </div>
      </div>
    </div>,
    {
      ...size,
    },
  );
}
