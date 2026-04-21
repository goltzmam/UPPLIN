/**
 * Normaliza categoria de evento para comparação robusta:
 * - lowercase
 * - remove acentos
 * - converte plural ↔ singular comuns em PT-BR
 *
 * Permite que o filtro encontre eventos mesmo quando a categoria
 * foi salva em variações ("Festa" vs "festas", "Show" vs "shows").
 */
export function normalizeCategory(value: string | null | undefined): string {
  if (!value) return "";
  let v = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .trim();

  // Converte plurais comuns para singular para garantir match
  // (festas → festa, shows → show, etc.)
  if (v.endsWith("oes")) v = v.slice(0, -3) + "ao"; // conferencoes? edge case
  else if (v.endsWith("es") && v.length > 3) v = v.slice(0, -2);
  else if (v.endsWith("s") && v.length > 2) v = v.slice(0, -1);

  return v;
}

/**
 * Compara duas categorias de forma tolerante (singular/plural,
 * acentos, case). Retorna true quando representam a mesma categoria.
 */
export function categoriesMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  return normalizeCategory(a) === normalizeCategory(b);
}
