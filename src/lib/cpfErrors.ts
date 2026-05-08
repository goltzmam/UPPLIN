// Traduz erros de Supabase/Postgres relacionados a perfis e CPF para pt-BR.
// Usado em qualquer tela que faz update/insert em `profiles` ou `cpf_change_requests`.

type PgErrorLike = {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
};

export type CpfErrorContext = "profile" | "cpf_request" | "generic";

export interface TranslatedError {
  title: string;
  description: string;
}

/**
 * Mapeia códigos PostgREST/Postgres + mensagens conhecidas para pt-BR.
 * Sempre retorna mensagem amigável, nunca expõe a string crua do backend.
 */
export function translateCpfError(
  raw: unknown,
  context: CpfErrorContext = "generic"
): TranslatedError {
  const err = (raw ?? {}) as PgErrorLike;
  const msg = String(err.message ?? (typeof raw === "string" ? raw : "") ?? "");
  const details = String(err.details ?? "");
  const hint = String(err.hint ?? "");
  const code = String(err.code ?? "");
  const haystack = `${msg}\n${details}\n${hint}`;

  // ---- Postgres / PostgREST codes ----

  // 23505 = unique_violation
  if (code === "23505" || /duplicate key|already exists|unique constraint/i.test(haystack)) {
    if (/profiles_cpf_key|profiles.*cpf|\bcpf\b/i.test(haystack) || context !== "generic") {
      return {
        title: "CPF já cadastrado",
        description:
          "Este CPF já está vinculado a outra conta. Verifique o número digitado ou entre em contato com o suporte.",
      };
    }
    if (/profiles_email_key|email/i.test(haystack)) {
      return {
        title: "E-mail já cadastrado",
        description: "Este e-mail já está em uso por outra conta.",
      };
    }
    return {
      title: "Registro duplicado",
      description: "Já existe um registro com esses dados.",
    };
  }

  // 23502 = not_null_violation
  if (code === "23502" || /null value in column|violates not-null/i.test(haystack)) {
    return {
      title: "Campos obrigatórios",
      description: "Preencha todos os campos obrigatórios e tente novamente.",
    };
  }

  // 23514 = check_violation
  if (code === "23514" || /check constraint|violates check/i.test(haystack)) {
    return {
      title: "Dados inválidos",
      description: "Algum campo não atende às regras de validação. Revise e tente novamente.",
    };
  }

  // 23503 = foreign_key_violation
  if (code === "23503" || /foreign key|violates foreign key/i.test(haystack)) {
    return {
      title: "Referência inválida",
      description: "Não foi possível concluir: registro relacionado não encontrado.",
    };
  }

  // 22001 = string_data_right_truncation (valor longo demais)
  if (code === "22001" || /value too long/i.test(haystack)) {
    return {
      title: "Valor muito longo",
      description: "Reduza o tamanho do texto e tente novamente.",
    };
  }

  // 22P02 = invalid_text_representation (formato/UUID/numérico inválido)
  if (code === "22P02" || /invalid input syntax/i.test(haystack)) {
    return {
      title: "Formato inválido",
      description: "Verifique os dados informados e tente novamente.",
    };
  }

  // 42501 = insufficient_privilege / RLS
  if (
    code === "42501" ||
    code === "PGRST301" ||
    /permission denied|not allowed|row-level security|rls|unauthorized|jwt/i.test(haystack)
  ) {
    return {
      title: "Permissão negada",
      description:
        context === "cpf_request"
          ? "Você não tem permissão para enviar essa solicitação."
          : "Você não tem permissão para realizar esta ação.",
    };
  }

  // PGRST116 = no rows returned (.single())
  if (code === "PGRST116" || /no rows|results contain 0 rows/i.test(haystack)) {
    return {
      title: "Registro não encontrado",
      description: "O registro buscado não existe ou foi removido.",
    };
  }

  // ---- Mensagens conhecidas (triggers/regra de negócio) ----

  // Trigger block_cpf_update
  if (/cpf cannot be modified|cpf.*locked|cpf_locked/i.test(haystack)) {
    return {
      title: "CPF bloqueado",
      description:
        "O CPF não pode ser alterado diretamente. Solicite a alteração pelo suporte.",
    };
  }

  if (/invalid.*cpf|cpf.*invalid|cpf inválido/i.test(haystack)) {
    return {
      title: "CPF inválido",
      description: "Verifique o número digitado e tente novamente.",
    };
  }

  // ---- Rede / timeout ----
  if (/network|fetch|timeout|failed to fetch|load failed/i.test(haystack)) {
    return {
      title: "Falha de conexão",
      description: "Verifique sua internet e tente novamente.",
    };
  }

  // ---- Fallback por contexto ----
  if (context === "cpf_request") {
    return {
      title: "Erro na solicitação de CPF",
      description: "Não foi possível registrar a solicitação agora. Tente novamente.",
    };
  }
  if (context === "profile") {
    return {
      title: "Erro ao salvar perfil",
      description: "Não foi possível salvar as alterações agora. Tente novamente.",
    };
  }
  return {
    title: "Erro ao salvar",
    description: "Não foi possível concluir a operação. Tente novamente em instantes.",
  };
}
