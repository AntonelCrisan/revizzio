import { ImageResponse } from "next/og";

export const alt =
  "Reviss - rezumate AI, flashcard-uri și quiz-uri pentru studenți";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "#f7f1e8",
          color: "#1f2b24",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "64px",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              color: "#405544",
              fontSize: 46,
              fontWeight: 800,
              letterSpacing: 0,
            }}
          >
            Reviss
          </div>
          <div
            style={{
              background: "#405544",
              borderRadius: 999,
              color: "#f7f1e8",
              fontSize: 26,
              fontWeight: 700,
              padding: "14px 24px",
            }}
          >
            Învață activ
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 78,
              fontWeight: 800,
              letterSpacing: 0,
              lineHeight: 1.02,
              maxWidth: 920,
            }}
          >
            Rezumate AI, flashcard-uri și quiz-uri pentru studenți.
          </div>
          <div
            style={{
              color: "#66756b",
              fontSize: 32,
              lineHeight: 1.35,
              maxWidth: 820,
            }}
          >
            Transformă cursurile, PDF-urile și prezentările în sesiuni clare de
            studiu pentru examen.
          </div>
        </div>

        <div style={{ display: "flex", gap: 18 }}>
          {["PDF-uri", "Rezumate", "Flashcard-uri", "Quiz-uri"].map((item) => (
            <div
              key={item}
              style={{
                background: "#ffffff",
                border: "2px solid #e2d8c9",
                borderRadius: 18,
                color: "#405544",
                fontSize: 25,
                fontWeight: 800,
                padding: "16px 22px",
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
