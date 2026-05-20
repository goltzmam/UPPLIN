export function getCheckInErrorMessage(error: unknown) {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  if (/not_authenticated/i.test(raw)) return "Faça login para validar ingressos.";
  if (/empty_ticket_code/i.test(raw)) return "Informe ou escaneie o código do ingresso.";
  if (/ticket_not_found/i.test(raw)) return "Ingresso não encontrado.";
  if (/wrong_event/i.test(raw)) return "Este ingresso pertence a outro evento.";
  if (/invalid_qr_token/i.test(raw)) return "QR Code inválido ou adulterado.";
  if (/not_allowed/i.test(raw)) return "Você não tem permissão para validar este ingresso.";
  if (/already_used/i.test(raw)) return "Este ingresso já foi utilizado.";
  if (/ticket_cancelled/i.test(raw)) return "Este ingresso foi cancelado.";
  if (/invalid_ticket_status/i.test(raw)) return "Este ingresso não está ativo para entrada.";

  return raw || "Não foi possível validar o ingresso.";
}
