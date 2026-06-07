import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";

export default function TermosOrganizador() {
  return (
    <LegalLayout
      title="Termos de Uso — Organizador"
      metaTitle="Termos de Uso do Organizador — Upplin"
      metaDescription="Regras, comissões, repasses e obrigações para organizadores que publicam eventos na Upplin."
      canonical="https://upplin.com/termos/organizador"
      badge="Termos · Organizador"
      updatedAt="07 de junho de 2026"
      backTo="/termos"
    >
      <LegalSection title="1. Objeto">
        <p>
          A Upplin disponibiliza ao organizador uma plataforma para publicar eventos, vender
          ingressos, gerenciar compradores e realizar check-in. Estes Termos regulam essa
          relação e devem ser lidos em conjunto com a{" "}
          <a href="/privacidade/organizador" className="text-foreground underline underline-offset-4 hover:text-primary">
            Política de Privacidade do Organizador
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Cadastro e verificação">
        <ul className="list-disc space-y-2 pl-5">
          <li>CPF (PF) ou CNPJ (PJ) válidos, endereço completo via ViaCEP.</li>
          <li>Conta no <strong className="text-foreground">Mercado Pago ativa</strong> conectada via OAuth.</li>
          <li>Documento fiscal é <strong className="text-foreground">bloqueado</strong> após preenchimento — alteração apenas com aprovação do admin Upplin mediante comprovante.</li>
          <li>A Upplin pode recusar ou suspender cadastros suspeitos sem aviso prévio.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Publicação de eventos">
        <ul className="list-disc space-y-2 pl-5">
          <li>Todo evento passa por <strong className="text-foreground">moderação manual</strong> antes de ficar público.</li>
          <li>Mídia mínima obrigatória (fotos/vídeo) conforme exigido no formulário.</li>
          <li>Informações verdadeiras: data, local, faixa etária, lineup, política de meia-entrada.</li>
          <li>Proibido publicar eventos ilegais, sem alvará, sem ECAD quando exigido, ou que infrinjam direitos de terceiros.</li>
          <li>Vagas de destaque ("Featured") são limitadas e atribuídas conforme regras internas.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Comissão, repasses e cupons">
        <ul className="list-disc space-y-2 pl-5">
          <li>A comissão da Upplin sobre cada venda é calculada <strong className="text-foreground">no servidor</strong> conforme seu plano vigente e descontada automaticamente no split do Mercado Pago.</li>
          <li>Repasse ocorre conforme prazos do Mercado Pago para sua conta vinculada.</li>
          <li>Cupons promocionais criados por você são de sua responsabilidade — eventual diferença é descontada da sua parte, não da comissão.</li>
          <li>Chargebacks confirmados são debitados do organizador.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Obrigações em relação aos compradores">
        <ul className="list-disc space-y-2 pl-5">
          <li>Realizar o evento conforme anunciado ou oferecer reembolso integral em caso de cancelamento ou alteração relevante.</li>
          <li>Cumprir o Código de Defesa do Consumidor e a meia-entrada (Lei 12.933/2013) quando aplicável.</li>
          <li>Responder dúvidas pelo chat 3-way (organizador / comprador / admin) em prazo razoável.</li>
          <li>Tratar dados pessoais dos compradores apenas para finalidades do evento (ver Política de Privacidade do Organizador).</li>
          <li>Garantir segurança, alvarás e estrutura mínima no local.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Check-in e colaboradores">
        <p>
          Você pode adicionar colaboradores de check-in. As ações deles são registradas e
          atribuídas à sua conta — você é o responsável final pelo controle de acesso ao evento.
        </p>
      </LegalSection>

      <LegalSection title="7. Conduta na plataforma">
        <p>
          Proibido: criar contas falsas, manipular avaliações, contatar compradores fora do
          escopo do evento para fins de marketing sem consentimento, evadir comissão por
          transação fora da plataforma após contato gerado pela Upplin.
        </p>
      </LegalSection>

      <LegalSection title="8. Suspensão e encerramento">
        <p>
          A Upplin pode suspender eventos, remover conteúdos, congelar repasses ou encerrar a
          conta em caso de violação destes Termos, denúncias graves, fraude ou risco a
          consumidores. Repasses devidos serão liberados após análise.
        </p>
      </LegalSection>

      <LegalSection title="9. Propriedade intelectual">
        <p>
          Você mantém os direitos sobre marca, logos e conteúdo do evento. Concede à Upplin
          licença para exibir esse conteúdo no app, em previews de compartilhamento e em
          materiais promocionais relacionados ao evento enquanto este estiver publicado.
        </p>
      </LegalSection>

      <LegalSection title="10. Planos e cobrança">
        <p>
          Planos pagos são cobrados conforme periodicidade contratada. Cancelamento mantém o
          plano até o fim do período já pago. A comissão por venda é cobrada
          independentemente do plano.
        </p>
      </LegalSection>

      <LegalSection title="11. Limitação de responsabilidade">
        <p>
          A Upplin é intermediadora tecnológica. Não responde pela realização, segurança ou
          qualidade do evento, nem por obrigações trabalhistas, fiscais ou regulatórias do
          organizador.
        </p>
      </LegalSection>

      <LegalSection title="12. Foro">
        <p>Lei brasileira. Foro da comarca de domicílio da Upplin, salvo norma cogente.</p>
      </LegalSection>
    </LegalLayout>
  );
}
