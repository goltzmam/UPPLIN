/**
 * Normaliza texto para comparação robusta:
 * - lowercase
 * - remove acentos/diacríticos
 * - remove caracteres especiais (mantém letras, números e espaço)
 * - colapsa espaços múltiplos
 *
 * Permite que buscas como "sao paulo" encontrem "São Paulo".
 */
export function normalizeText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9\s]/g, " ") // remove caracteres especiais
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normaliza categoria de evento (singular/plural, acentos, case).
 */
export function normalizeCategory(value: string | null | undefined): string {
  let v = normalizeText(value);
  if (!v) return "";

  // Converte plurais comuns para singular para garantir match
  if (v.endsWith("oes")) v = v.slice(0, -3) + "ao";
  else if (v.endsWith("es") && v.length > 3) v = v.slice(0, -2);
  else if (v.endsWith("s") && v.length > 2) v = v.slice(0, -1);

  return v;
}

/**
 * Compara duas categorias de forma tolerante.
 */
export function categoriesMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  return normalizeCategory(a) === normalizeCategory(b);
}

/**
 * Verifica se um texto contém um termo de busca, ignorando
 * acentos, case e caracteres especiais.
 */
export function textIncludes(
  haystack: string | null | undefined,
  needle: string | null | undefined
): boolean {
  const n = normalizeText(needle);
  if (!n) return true;
  return normalizeText(haystack).includes(n);
}
