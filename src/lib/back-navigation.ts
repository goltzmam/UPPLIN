// react-router v7 (BrowserRouter) grava `idx` em window.history.state: 0 é a
// primeira entrada da sessão do app. idx > 0 garante que há uma tela anterior
// DENTRO do app; history.length não serve, pois conta abas/sites anteriores.
export function hasInAppHistory(state: unknown): boolean {
  const idx = (state as { idx?: unknown } | null)?.idx;
  return typeof idx === "number" && idx > 0;
}
