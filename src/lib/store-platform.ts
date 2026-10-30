// Native capabilities are detected at runtime; application IDs are not changed.
export function canPurchaseOrganizerPlans(native: boolean) { return !native; }
export function isOrganizerPlanPath(path: string) {
  return /^\/(?:precos|organizadores|politica(?:\/.*)?|planos(?:\/.*)?|organizador\/painel\/assinaturas)\/?$/.test(path);
}
