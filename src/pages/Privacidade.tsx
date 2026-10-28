import { RoleSelector } from "@/components/legal/RoleSelector";

export default function Privacidade() {
  return (
    <RoleSelector
      title="Política de Privacidade"
      subtitle="Selecione o seu perfil para ver a política aplicável."
      metaTitle="Política de Privacidade — Upplin"
      metaDescription="Escolha seu perfil (participante ou organizador) para ver a Política de Privacidade aplicável."
      canonical="https://www.upplin.com/privacidade"
      participantHref="/privacidade/participante"
      organizerHref="/privacidade/organizador"
    />
  );
}
