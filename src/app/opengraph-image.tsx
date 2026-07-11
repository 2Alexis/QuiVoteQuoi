import { ImageResponse } from "next/og";

// Image de partage par défaut (Open Graph / Twitter) pour tout le site.
// Next l'attache automatiquement à chaque page (openGraph.images + twitter.images)
// via la convention de fichier `opengraph-image` — inutile de la déclarer ailleurs.
export const alt = "QuiVoteQuoi — les votes de l'Assemblée nationale";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
          padding: "80px",
          fontFamily: "sans-serif",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "104px",
              height: "104px",
              borderRadius: "26px",
              background: "#ffffff",
            }}
          >
            <svg width="66" height="66" viewBox="0 0 64 64" fill="#4f46e5">
              <path fillRule="evenodd" d="M32 6 58 25 6 25Z M32 13.5 49 23.5 15 23.5Z" />
              <rect x="9" y="27" width="46" height="6" rx="1" />
              <rect x="12.5" y="33" width="4" height="19" />
              <rect x="19.5" y="33" width="4" height="19" />
              <rect x="26.5" y="33" width="4" height="19" />
              <rect x="33.5" y="33" width="4" height="19" />
              <rect x="40.5" y="33" width="4" height="19" />
              <rect x="47.5" y="33" width="4" height="19" />
              <rect x="7" y="52" width="50" height="5.5" rx="1" />
              <rect x="5" y="59.5" width="54" height="3" rx="1.5" />
            </svg>
          </div>
          <div style={{ fontSize: "60px", fontWeight: 700 }}>QuiVoteQuoi</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ fontSize: "72px", fontWeight: 800, lineHeight: 1.05 }}>
            L&apos;Assemblée nationale, enfin lisible.
          </div>
          <div style={{ fontSize: "34px", opacity: 0.85, lineHeight: 1.3 }}>
            Scrutins, votes, députés et groupes — à partir de l&apos;open data officiel.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
