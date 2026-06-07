import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";

export default function PrivacidadeOrganizador() {
  return (
    <LegalLayout
      title="Política de Privacidade — Organizador"
      metaTitle="Política de Privacidade do Organizador — Upplin"
      metaDescription="Como a Upplin trata os dados de organizadores que publicam eventos e vendem ingressos."
      canonical="https://upplin.com/privacidade/organizador"
      badge="LGPD · Organizador"
      updatedAt="07 de junho de 2026"
      backTo="/privacidade"
    >
      <LegalSection title="1. Sua condição de Controlador e Operador">
        <p>
          Como organizador, você é <strong className="text-foreground">controlador</strong> dos
          dados pessoais coletados de seus compradores (lista de ingressos, check-in,
          comunicações). A Upplin atua como <strong className="text-foreground">operadora</strong>{" "}
          desses dados, processando-os exclusivamente conforme suas instruções e nossos termos.
        </p>
        <p>
          Em relação à sua própria conta (cadastro, financeiro, contrato), a Upplin é
          controladora.
        </p>
      </LegalSection>

      <LegalSection title="2. Dados que coletamos de você (Organizador)">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="text-foreground">Cadastro:</strong> nome, e-mail corporativo, telefone, foto/logo, senha (hash).</li>
          <li><strong className="text-foreground">Documentos fiscais:</strong> CPF (PF) ou CNPJ (PJ), razão social, endereço completo via ViaCEP.</li>
          <li><strong className="text-foreground">Dados bancários:</strong> conta Mercado Pago vinculada via OAuth para repasse de vendas.</li>
          <li><strong className="text-foreground">Conteúdo:</strong> eventos publicados, fotos, vídeos, descrições, cupons, configurações.</li>
          <li><strong className="text-foreground">Analytics:</strong> métricas de venda, check-in, audiência (uso interno e exposto a você).</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Suas obrigações como Controlador">
        <p>
          Ao acessar dados de compradores via painel, exportação CSV/PDF ou check-in, você se
          compromete a:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Usar os dados <strong className="text-foreground">somente</strong> para fins ligados ao evento (validação de ingresso, comunicação obrigatória, obrigações fiscais).</li>
          <li>Não enviar comunicação de marketing sem consentimento específico do comprador.</li>
          <li>Garantir segurança adequada na sua infraestrutura (planilhas, e-mails, dispositivos).</li>
          <li>Atender solicitações da LGPD encaminhadas pela Upplin em até 10 dias.</li>
          <li>Excluir os dados quando não houver mais base legal (ex.: 5 anos após o evento, para fins fiscais).</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Para que usamos seus dados de Organizador">
        <ul className="list-disc space-y-2 pl-5">
          <li>Autenticar sua conta e proteger o painel.</li>
          <li>Processar pagamentos via Mercado Pago e calcular comissão da plataforma.</li>
          <li>Emitir notas, repassar valores, prestar contas.</li>
          <li>Moderar eventos (aprovação manual, destaque, denúncias).</li>
          <li>Comunicações operacionais (saque, problemas, atualizações de plano).</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Compartilhamento">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="text-foreground">Mercado Pago</strong> — autorização OAuth e repasse.</li>
          <li><strong className="text-foreground">Receita Federal / autoridades</strong> — quando exigido por lei.</li>
          <li><strong className="text-foreground">Resend</strong> — e-mails transacionais e de notificação.</li>
          <li><strong className="text-foreground">Lovable Cloud / Supabase</strong> — hospedagem.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Verificação de identidade e CPF/CNPJ">
        <p>
          O CPF/CNPJ é <strong className="text-foreground">bloqueado</strong> após o
          preenchimento. Para correção, abra solicitação em Suporte com documento comprobatório —
          aprovação manual pelo admin Upplin.
        </p>
      </LegalSection>

      <LegalSection title="7. Retenção e exclusão">
        <p>
          Dados de venda e fiscais são mantidos por 5 anos. Dados de eventos passados podem ser
          mantidos para histórico público dos compradores (avaliações, fotos). A exclusão de
          conta organizadora não exclui retroativamente registros fiscais obrigatórios.
        </p>
      </LegalSection>

      <LegalSection title="8. Direitos e contato (DPO)">
        <p>
          <a href="mailto:suporte@upplin.com" className="text-foreground underline underline-offset-4 hover:text-primary">
            suporte@upplin.com
          </a>{" "}
          — resposta em até 15 dias.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
