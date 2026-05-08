import { supabase } from "@/integrations/supabase/client";
import { isValidCPF } from "@/lib/validation";

export type CpfValidationResult =
  | { ok: true; digits: string }
  | { ok: false; title: string; description: string };

/**
 * Valida CPF antes de salvar:
 * 1. Formato (11 dígitos + dígitos verificadores)
 * 2. Conexão de rede
 * 3. Duplicidade no banco (pré-checagem)
 *
 * Mensagens sempre em pt-BR.
 */
export async function validateCpfBeforeSave(
  cpf: string,
  options: { ignoreUserId?: string } = {}
): Promise<CpfValidationResult> {
  const digits = (cpf || "").replace(/\D/g, "");

  // 1. Formato
  if (digits.length === 0) {
    return {
      ok: false,
      title: "CPF obrigatório",
      description: "Informe o seu CPF para continuar.",
    };
  }
  if (digits.length !== 11) {
    return {
      ok: false,
      title: "CPF incompleto",
      description: "O CPF deve ter 11 dígitos. Verifique e tente novamente.",
    };
  }
  if (!isValidCPF(digits)) {
    return {
      ok: false,
      title: "CPF inválido",
      description: "O número informado não é um CPF válido. Confira os dígitos.",
    };
  }

  // 2. Rede
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return {
      ok: false,
      title: "Sem conexão",
      description: "Você está offline. Conecte-se à internet e tente novamente.",
    };
  }

  // 3. Duplicidade (pré-checagem)
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("cpf", digits)
      .maybeSingle();

    if (error) {
      // Falha de rede/permissão — não bloqueia, deixa o save tentar e tratar.
      if (/network|fetch|failed/i.test(error.message || "")) {
        return {
          ok: false,
          title: "Falha de conexão",
          description: "Não foi possível verificar o CPF agora. Tente novamente.",
        };
      }
    } else if (data && data.id && data.id !== options.ignoreUserId) {
      return {
        ok: false,
        title: "CPF já cadastrado",
        description:
          "Este CPF já está vinculado a outra conta. Verifique o número digitado ou entre em contato com o suporte.",
      };
    }
  } catch (e: any) {
    return {
      ok: false,
      title: "Falha de conexão",
      description: "Não foi possível verificar o CPF agora. Tente novamente.",
    };
  }

  return { ok: true, digits };
}
