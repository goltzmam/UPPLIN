import { RoleSelector } from "@/components/legal/RoleSelector";

export default function Termos() {
  return (
    <RoleSelector
      title="Termos de Uso"
      subtitle="Selecione o seu perfil para ver os termos aplicáveis."
      metaTitle="Termos de Uso — Upplin"
      metaDescription="Escolha seu perfil (participante ou organizador) para ver os Termos de Uso aplicáveis."
      canonical="https://upplin.com/termos"
      participantHref="/termos/participante"
      organizerHref="/termos/organizador"
    />
  );
}
