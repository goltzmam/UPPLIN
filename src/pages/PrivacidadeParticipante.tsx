import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";

export default function PrivacidadeParticipante() {
  return (
    <LegalLayout
      title="Política de Privacidade — Participante"
      metaTitle="Política de Privacidade do Participante — Upplin"
      metaDescription="Como a Upplin trata os dados de participantes que compram ingressos e usam o feed social."
      canonical="https://www.upplin.com/privacidade/participante"
      badge="LGPD · Participante"
      updatedAt="30 de outubro de 2026"
      backTo="/privacidade"
    >
      <LegalSection title="1. Quem somos">
        <p>
          A <strong className="text-foreground">Upplin</strong> é uma plataforma social de
          descoberta e compra de ingressos. Esta Política descreve como tratamos seus dados
          quando você usa o app como <strong className="text-foreground">participante</strong>{" "}
          (compra ingressos, segue organizadores, publica conteúdo).
        </p>
      </LegalSection>

      <LegalSection title="2. Dados que coletamos de você">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="text-foreground">Cadastro:</strong> nome, e-mail, telefone, foto, data de nascimento, senha (hash).</li>
          <li><strong className="text-foreground">CPF:</strong> obrigatório para emissão de ingresso nominal.</li>
          <li><strong className="text-foreground">Pagamento:</strong> processado pelo Mercado Pago; não armazenamos cartão completo.</li>
          <li><strong className="text-foreground">Localização aproximada:</strong> com sua permissão, para mostrar eventos por perto.</li>
          <li><strong className="text-foreground">Conteúdo social:</strong> vídeos, fotos, curtidas, comentários, avaliações, RSVPs e mensagens.</li>
          <li><strong className="text-foreground">Dispositivo:</strong> IP, sessão, sistema operacional, navegador.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Para que usamos">
        <ul className="list-disc space-y-2 pl-5">
          <li>Emitir e validar seu ingresso, fazer check-in no evento.</li>
          <li>Personalizar o feed e recomendar eventos relevantes.</li>
          <li>Permitir interações sociais (seguir, curtir, comentar, mensagens).</li>
          <li>Enviar e-mails transacionais (compra, alteração de evento).</li>
          <li>Prevenir fraude e proteger a conta.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Com quem compartilhamos">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Organizadores</strong> recebem seu nome, CPF e
            e-mail para emissão e validação do ingresso comprado.
          </li>
          <li><strong className="text-foreground">Mercado Pago</strong> — gateway de pagamento.</li>
          <li><strong className="text-foreground">Provedor de e-mail transacional</strong> — envio de confirmações e notificações.</li>
          <li><strong className="text-foreground">Provedores de infraestrutura em nuvem</strong> — hospedagem e banco de dados, sob contrato de confidencialidade.</li>
        </ul>
        <p>Não vendemos seus dados.</p>
      </LegalSection>

      <LegalSection title="5. Seus direitos (LGPD)">
        <p>Você pode solicitar acesso, correção, anonimização, portabilidade, eliminação e revogação de consentimento.</p>
        <p>
          Contato:{" "}
          <a href="mailto:suporte@upplin.com" className="text-foreground underline underline-offset-4 hover:text-primary">
            suporte@upplin.com
          </a>
        </p>
      </LegalSection>

      <LegalSection title="6. Conteúdo público e exclusão">
        <p>
          Curtidas, avaliações e comentários podem permanecer visíveis de forma anonimizada
          após a exclusão da conta, pois fazem parte do histórico público dos eventos.
        </p>
      </LegalSection>

      <LegalSection title="7. Segurança">
        <p>
          HTTPS/TLS, Row-Level Security no banco, verificação de senhas vazadas (HIBP) e
          isolamento de sessões. Incidentes serão comunicados conforme ANPD.
        </p>
      </LegalSection>

      <LegalSection title="8. Menores de 18 anos">
        <p>O app é destinado a maiores de 18 anos. Contas de menores serão removidas.</p>
      </LegalSection>
      <LegalSection title="Exclusão de conta e retenção legal">
        <p>Solicite em Perfil → Configurações → Excluir conta ou pelo email suporte@upplin.com, com o assunto “Excluir minha conta”. Respondemos em até 2 dias úteis e concluímos em até 30 dias corridos.</p>
        <p>Dados pessoais e conteúdo são apagados. Registros financeiros mínimos, incluindo o CPF do comprador, são retidos por 5 anos; registros de acesso, por 6 meses. Cópias de segurança seguem o ciclo de retenção, em até 90 dias após a exclusão, exceto a guarda legal financeira.</p>
        <p><a href="/excluir-conta" className="text-primary underline">Veja o passo a passo e a lista completa de dados e prazos.</a></p>
      </LegalSection>
    </LegalLayout>
  );
}
