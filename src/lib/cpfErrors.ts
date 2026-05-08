// Traduz mensagens de erro do backend relacionadas ao CPF para pt-BR.
export function translateCpfError(raw: unknown): { title: string; description: string } {
  const msg = String(
    (raw as any)?.message ?? (typeof raw === "string" ? raw : "") ?? ""
  );

  if (/duplicate key|profiles_cpf_key|already exists|unique constraint/i.test(msg)) {
    return {
      title: "CPF já cadastrado",
      description:
        "Este CPF já está vinculado a outra conta. Verifique o número digitado ou entre em contato com o suporte.",
    };
  }

  if (/invalid.*cpf|cpf.*invalid|cpf inválido/i.test(msg)) {
    return {
      title: "CPF inválido",
      description: "Verifique o número digitado e tente novamente.",
    };
  }

  if (/cpf.*locked|cpf_locked|cannot.*change.*cpf|locked/i.test(msg)) {
    return {
      title: "CPF bloqueado",
      description:
        "O CPF não pode ser alterado diretamente. Solicite a alteração ao suporte.",
    };
  }

  if (/permission denied|not allowed|rls|row-level security|unauthorized/i.test(msg)) {
    return {
      title: "Permissão negada",
      description: "Você não tem permissão para alterar o CPF.",
    };
  }

  if (/network|fetch|timeout|failed to fetch/i.test(msg)) {
    return {
      title: "Falha de conexão",
      description: "Verifique sua internet e tente novamente.",
    };
  }

  return {
    title: "Erro ao salvar CPF",
    description: "Não foi possível salvar seu CPF agora. Tente novamente em instantes.",
  };
}
