import { useEffect, useState, useRef } from "react";
import { ShoppingBag } from "lucide-react";

const SPLASH_KEY = "smm_splash_seen_v1";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<
    "idle" | "bg" | "logo" | "rider" | "banner" | "slogan" | "fadeout"
  >("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const addTimer = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timerRef.current.push(t);
    return t;
  };

  useEffect(() => {
    // Start sequence after mount paint
    addTimer(() => setPhase("bg"), 50);
    addTimer(() => setPhase("logo"), 400);
    addTimer(() => setPhase("rider"), 900);
    addTimer(() => setPhase("banner"), 1100);
    addTimer(() => setPhase("slogan"), 1600);
    addTimer(() => setPhase("fadeout"), 3000);
    addTimer(() => {
      localStorage.setItem(SPLASH_KEY, "1");
      onComplete();
    }, 3600);

    return () => timerRef.current.forEach(clearTimeout);
  }, []);

  const active = (...phases: typeof phase[]) => phases.includes(phase);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        overflow: "hidden",
        background: "#0B2E2B",
        opacity: active("fadeout") ? 0 : 1,
        transition: active("fadeout") ? "opacity 0.55s ease" : "none",
        pointerEvents: "all",
        willChange: "opacity",
      }}
    >
      {/* Background image */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url(/praia-saubara.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center 60%",
          opacity: active("bg", "logo", "rider", "banner", "slogan", "fadeout") ? 1 : 0,
          transition: "opacity 0.6s ease",
          willChange: "opacity",
        }}
      />

      {/* Dark overlay for contrast */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(11,46,43,0.72) 0%, rgba(11,46,43,0.45) 50%, rgba(11,46,43,0.78) 100%)",
        }}
      />

      {/* ── LOGO ── */}
      <div
        style={{
          position: "absolute",
          top: "12%",
          left: "50%",
          transform: active("logo", "rider", "banner", "slogan", "fadeout")
            ? "translateX(-50%) scale(1)"
            : "translateX(-50%) scale(0.7)",
          opacity: active("logo", "rider", "banner", "slogan", "fadeout") ? 1 : 0,
          transition: "opacity 0.4s ease, transform 0.45s cubic-bezier(0.34,1.56,0.64,1)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          willChange: "transform, opacity",
        }}
      >
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: 30,
            backgroundColor: "#fff",
            boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src="/logo.png"
            alt="Saubara Meu Market"
            style={{
              width: 90,
              height: 90,
              objectFit: "contain",
            }}
          />
        </div>
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              color: "#fff",
              fontWeight: 800,
              fontSize: 26,
              letterSpacing: "-0.5px",
              lineHeight: 1.1,
              textShadow: "0 2px 12px rgba(0,0,0,0.4)",
              margin: 0,
            }}
          >
            Saubara
          </p>
          <p
            style={{
              color: "#A7DDD8",
              fontWeight: 600,
              fontSize: 15,
              letterSpacing: "0.5px",
              margin: 0,
              textShadow: "0 1px 8px rgba(0,0,0,0.3)",
            }}
          >
            Meu Market
          </p>
        </div>
      </div>

      {/* ── RIDER ANIMATION ── */}
      <div
        style={{
          position: "absolute",
          bottom: "28%",
          left: 0,
          width: "100%",
          height: 80,
          transform: active("rider", "banner", "slogan", "fadeout")
            ? "translateX(110%)"
            : "translateX(-20%)",
          transition: active("rider", "banner", "slogan", "fadeout")
            ? "transform 1.4s cubic-bezier(0.25,0.46,0.45,0.94)"
            : "none",
          display: "flex",
          alignItems: "center",
          willChange: "transform",
        }}
      >
        <RiderSVG />
      </div>

      {/* ── BANNER STRIP ── */}
      <div
        style={{
          position: "absolute",
          bottom: "22%",
          left: "50%",
          transform: active("banner", "slogan", "fadeout")
            ? "translateX(-50%) scaleX(1)"
            : "translateX(-50%) scaleX(0)",
          transformOrigin: "center",
          transition: "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",
          background: "linear-gradient(90deg, #0F9D8A, #0B7A6E)",
          borderRadius: 8,
          padding: "6px 28px",
          boxShadow: "0 4px 20px rgba(11,122,110,0.5)",
          whiteSpace: "nowrap",
          willChange: "transform",
        }}
      >
        <p
          style={{
            color: "#fff",
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: "0.5px",
            margin: 0,
            textShadow: "0 1px 6px rgba(0,0,0,0.25)",
          }}
        >
          Saubara Meu Market
        </p>
      </div>

      {/* ── SLOGAN ── */}
      <div
        style={{
          position: "absolute",
          bottom: "14%",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          width: "80%",
          maxWidth: 320,
          opacity: active("slogan", "fadeout") ? 1 : 0,
          transition: "opacity 0.5s ease",
          willChange: "opacity",
        }}
      >
        <p
          style={{
            color: "rgba(255,255,255,0.88)",
            fontWeight: 500,
            fontSize: 14,
            lineHeight: 1.5,
            margin: 0,
            textShadow: "0 1px 8px rgba(0,0,0,0.4)",
            fontStyle: "italic",
          }}
        >
          O mercado da nossa cidade na palma da sua mão.
        </p>
      </div>

      {/* Tap to skip */}
      <button
        onClick={() => {
          timerRef.current.forEach(clearTimeout);
          localStorage.setItem(SPLASH_KEY, "1");
          onComplete();
        }}
        style={{
          position: "absolute",
          bottom: 28,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: 20,
          color: "rgba(255,255,255,0.6)",
          fontSize: 11,
          padding: "5px 18px",
          cursor: "pointer",
          opacity: active("slogan", "fadeout") ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      >
        Toque para continuar
      </button>
    </div>
  );
}

/** Check if splash should run */
export function shouldShowSplash(): boolean {
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(SPLASH_KEY);
}

/** Inline SVG delivery rider on motorbike — pure CSS no external asset */
function RiderSVG() {
  return (
    <svg
      viewBox="0 0 200 90"
      width="200"
      height="90"
      style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.35))" }}
      aria-hidden="true"
    >
      {/* Moto body */}
      <ellipse cx="100" cy="72" rx="60" ry="8" fill="rgba(0,0,0,0.2)" />
      {/* Rear wheel */}
      <circle cx="60" cy="68" r="16" fill="#1a1a2e" stroke="#0F9D8A" strokeWidth="3" />
      <circle cx="60" cy="68" r="7" fill="#0F9D8A" />
      {/* Front wheel */}
      <circle cx="148" cy="68" r="16" fill="#1a1a2e" stroke="#0F9D8A" strokeWidth="3" />
      <circle cx="148" cy="68" r="7" fill="#0F9D8A" />
      {/* Frame */}
      <path d="M68 55 L80 38 L120 36 L150 52 L148 56 L100 58 Z" fill="#0B7A6E" />
      <path d="M80 38 L90 56" stroke="#0F9D8A" strokeWidth="2.5" />
      <path d="M120 36 L148 52" stroke="#0d8a7a" strokeWidth="2" />
      {/* Engine block */}
      <rect x="85" y="52" width="32" height="14" rx="4" fill="#0a6055" />
      {/* Handlebar */}
      <line x1="148" y1="44" x2="156" y2="38" stroke="#0F9D8A" strokeWidth="3" strokeLinecap="round" />
      <line x1="156" y1="38" x2="160" y2="45" stroke="#0F9D8A" strokeWidth="2.5" strokeLinecap="round" />
      {/* Exhaust */}
      <path d="M68 60 Q55 65 42 62" stroke="#FF8A50" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Delivery box on back */}
      <rect x="54" y="36" width="26" height="20" rx="4" fill="#FF8A50" />
      <rect x="56" y="38" width="22" height="16" rx="3" fill="#ff7a3a" />
      <line x1="67" y1="38" x2="67" y2="54" stroke="#FF8A50" strokeWidth="1.5" />
      <line x1="56" y1="46" x2="78" y2="46" stroke="#FF8A50" strokeWidth="1.5" />
      {/* Rider body */}
      <ellipse cx="112" cy="46" rx="10" ry="14" fill="#1e3a5f" />
      {/* Helmet */}
      <circle cx="113" cy="30" r="12" fill="#0F9D8A" />
      <rect x="105" y="33" width="16" height="7" rx="3" fill="#1a1a2e" />
      <rect x="106" y="34" width="14" height="5" rx="2" fill="#0a2a4a" />
      {/* Visor shine */}
      <path d="M108 33 Q113 30 118 33" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none" />
      {/* Arms */}
      <path d="M118 46 Q132 42 148 44" stroke="#1e3a5f" strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* Legs */}
      <path d="M108 58 L96 62 L92 68" stroke="#1e3a5f" strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* Speed lines */}
      <line x1="10" y1="55" x2="40" y2="55" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" />
      <line x1="5" y1="62" x2="30" y2="62" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15" y1="48" x2="35" y2="48" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
