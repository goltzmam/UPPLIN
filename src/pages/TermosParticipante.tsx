import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";

export default function TermosParticipante() {
  return (
    <LegalLayout
      title="Termos de Uso — Participante"
      metaTitle="Termos de Uso do Participante — Upplin"
      metaDescription="Regras de uso da plataforma Upplin para participantes que compram ingressos e interagem no feed."
      canonical="https://www.upplin.com/termos/participante"
      badge="Termos · Participante"
      updatedAt="31 de outubro de 2026"
      backTo="/termos"
    >
      <LegalSection title="1. Aceitação">
        <p>
          Ao criar uma conta de participante na Upplin, você concorda integralmente com estes
          Termos e com a{" "}
          <a href="/privacidade/participante" className="text-foreground underline underline-offset-4 hover:text-primary">
            Política de Privacidade
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Cadastro">
        <ul className="list-disc space-y-2 pl-5">
          <li>Você deve ter <strong className="text-foreground">18 anos ou mais</strong>.</li>
          <li>Informações reais e atualizadas, incluindo CPF válido.</li>
          <li>Senha pessoal e intransferível — você é responsável pela segurança.</li>
          <li>Uma única conta por pessoa.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Compra de ingressos">
        <ul className="list-disc space-y-2 pl-5">
          <li>O ingresso é <strong className="text-foreground">nominal e intransferível</strong>, vinculado ao CPF do comprador.</li>
          <li>Pagamento processado pelo Mercado Pago. Em caso de fraude, o ingresso pode ser cancelado.</li>
          <li>Cancelamento e reembolso seguem o <strong className="text-foreground">Código de Defesa do Consumidor</strong> (art. 49 — 7 dias de arrependimento) quando aplicável, e a política do organizador para os demais casos.</li>
          <li>A Upplin atua como <strong className="text-foreground">intermediadora</strong>; a realização e qualidade do evento são responsabilidade do organizador.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Conduta no feed e comunidade">
        <p>É proibido publicar, comentar ou enviar mensagens com:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Discurso de ódio, racismo, LGBTfobia, assédio, ameaça.</li>
          <li>Conteúdo sexual explícito, violência gráfica, exploração infantil.</li>
          <li>Spam, golpes, links maliciosos, venda de ingressos falsos.</li>
          <li>Conteúdo protegido por direitos autorais sem autorização.</li>
          <li>Personificação de outras pessoas ou marcas.</li>
        </ul>
        <p>
          Violações podem resultar em remoção do conteúdo, suspensão temporária ou banimento
          permanente, sem reembolso.
        </p>
      </LegalSection>

      <LegalSection title="5. Conteúdo que você publica">
        <p>
          Você mantém os direitos sobre fotos, vídeos e comentários publicados, mas concede à
          Upplin <strong className="text-foreground">licença mundial, gratuita e não exclusiva</strong>{" "}
          para exibir esse conteúdo no app, no feed do evento e em previews compartilhados
          (WhatsApp, Instagram Stories) enquanto sua conta estiver ativa.
        </p>
      </LegalSection>

      <LegalSection title="Segurança da comunidade">
        <p>Conteúdo impróprio é submetido a filtros e revisão. Fotos e vídeos aguardam aprovação antes de ficarem públicos. Publicações e perfis que violem as regras podem ser ocultados pelo suporte.</p>
        <p>Você pode denunciar publicações, comentários e perfis pelo menu de segurança e bloquear usuários. Os bloqueios podem ser desfeitos em Perfil → Configurações → Usuários bloqueados. Para ajuda, use os canais em <a href="/suporte" className="text-primary underline">Suporte UPPLIN</a>.</p>
      </LegalSection>
      <LegalSection title="6. Check-in no evento">
        <p>
          A validação ocorre por QR Code do ingresso conferido contra o CPF cadastrado.
          Documento oficial com foto pode ser exigido pelo organizador na entrada.
        </p>
      </LegalSection>

      <LegalSection title="7. Suspensão e encerramento">
        <p>
          A Upplin pode suspender ou encerrar a conta em caso de violação destes Termos,
          fraude, chargeback indevido ou inatividade prolongada. Você pode encerrar sua conta a
          qualquer momento pelo Perfil → Configurações.
        </p>
      </LegalSection>

      <LegalSection title="8. Limitação de responsabilidade">
        <p>
          A Upplin não se responsabiliza por cancelamento, adiamento ou má execução do evento
          pelo organizador, nem por danos indiretos decorrentes de indisponibilidade temporária
          do serviço.
        </p>
      </LegalSection>

      <LegalSection title="9. Alterações">
        <p>
          Estes Termos podem ser atualizados. Mudanças relevantes serão comunicadas por
          notificação no app ou e-mail com antecedência mínima de 15 dias.
        </p>
      </LegalSection>

      <LegalSection title="10. Foro">
        <p>
          Lei brasileira. Foro do domicílio do consumidor (CDC, art. 101, I) para conflitos
          com participantes pessoa física.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
