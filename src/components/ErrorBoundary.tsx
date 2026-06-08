import React from "react";

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary global — evita "tela em branco" em qualquer dispositivo
 * (especialmente importante para review da Apple App Store, onde qualquer
 * erro de runtime resulta em rejeição por "Guideline 2.1(a) - Completude").
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Mantém o log para debug, mas não quebra a UI.
    console.error("[UPPLIN ErrorBoundary]", error, info);
  }

  handleReload = () => {
    try {
      window.location.href = "/";
    } catch {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000",
          color: "#fff",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 360 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              background:
                "linear-gradient(135deg, #FF6A00 0%, #FF2D2D 50%, #FF007A 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: 16,
            }}
          >
            UPPLIN
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>
            Algo deu errado
          </h1>
          <p style={{ fontSize: 14, opacity: 0.7, margin: "0 0 24px" }}>
            Tivemos um problema ao carregar esta tela. Tente novamente.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              background:
                "linear-gradient(135deg, #FF6A00 0%, #FF2D2D 50%, #FF007A 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 999,
              padding: "12px 28px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }
}
