import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

const UPDATED_AT = "07 de junho de 2026";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-xl font-semibold text-foreground">{title}</h2>
    <div className="text-sm leading-relaxed text-muted-foreground space-y-3">{children}</div>
  </section>
);

export default function Privacidade() {
  return (
    <>
      <Helmet>
        <title>Política de Privacidade — Upplin</title>
        <meta
          name="description"
          content="Saiba como a Upplin coleta, usa, compartilha e protege seus dados pessoais, em conformidade com a LGPD."
        />
        <link rel="canonical" href="https://upplin.com/privacidade" />
        <meta property="og:title" content="Política de Privacidade — Upplin" />
        <meta
          property="og:description"
          content="Como a Upplin trata seus dados pessoais, em conformidade com a LGPD."
        />
        <meta property="og:url" content="https://upplin.com/privacidade" />
        <meta property="og:type" content="website" />
      </Helmet>

      <main className="min-h-[100dvh] bg-background text-foreground lg:ml-[72px]">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-24 lg:py-12">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>

          <header className="mt-6 mb-10 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              LGPD · Lei 13.709/2018
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Política de Privacidade
            </h1>
            <p className="text-sm text-muted-foreground">
              Última atualização: {UPDATED_AT}
            </p>
          </header>

          <div className="space-y-10">
            <Section title="1. Quem somos">
              <p>
                A <strong className="text-foreground">Upplin</strong> é uma plataforma social
                de descoberta, venda e gestão de ingressos para eventos. Esta Política descreve
                como tratamos seus dados pessoais quando você usa nosso site, aplicativo e
                serviços relacionados.
              </p>
              <p>
                Atuamos como <strong className="text-foreground">controladora</strong> dos dados
                de participantes e organizadores cadastrados, e como{" "}
                <strong className="text-foreground">operadora</strong> quando processamos dados
                em nome de organizadores (ex.: lista de compradores de um evento).
              </p>
            </Section>

            <Section title="2. Dados que coletamos">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-foreground">Cadastro:</strong> nome, e-mail, telefone,
                  data de nascimento, foto de perfil, gênero (opcional) e senha (armazenada com hash).
                </li>
                <li>
                  <strong className="text-foreground">Documentos fiscais:</strong> CPF (obrigatório
                  para emissão de ingresso) e, para organizadores, CNPJ e endereço completo.
                </li>
                <li>
                  <strong className="text-foreground">Pagamento:</strong> dados de cobrança
                  processados diretamente pelo Mercado Pago. A Upplin não armazena número
                  completo de cartão.
                </li>
                <li>
                  <strong className="text-foreground">Localização:</strong> coordenadas
                  aproximadas (com sua permissão) para mostrar eventos por perto.
                </li>
                <li>
                  <strong className="text-foreground">Conteúdo:</strong> vídeos curtos, fotos,
                  comentários, curtidas, mensagens e avaliações que você publica.
                </li>
                <li>
                  <strong className="text-foreground">Uso e dispositivo:</strong> logs de acesso,
                  endereço IP, identificador de sessão, tipo de dispositivo, sistema operacional
                  e navegador.
                </li>
              </ul>
            </Section>

            <Section title="3. Para que usamos seus dados">
              <ul className="list-disc space-y-2 pl-5">
                <li>Criar e autenticar sua conta, prevenindo fraude e acessos indevidos.</li>
                <li>Emitir ingressos, processar pagamentos e fazer check-in em eventos.</li>
                <li>Personalizar o feed e recomendar eventos relevantes para você.</li>
                <li>Permitir interações sociais: seguir, curtir, comentar, mensagens diretas.</li>
                <li>Enviar comunicações transacionais (compra, alteração de evento, suporte).</li>
                <li>Cumprir obrigações legais, fiscais e regulatórias.</li>
              </ul>
            </Section>

            <Section title="4. Bases legais (LGPD, art. 7º e 11º)">
              <ul className="list-disc space-y-2 pl-5">
                <li><strong className="text-foreground">Execução de contrato:</strong> emissão de ingressos e prestação do serviço.</li>
                <li><strong className="text-foreground">Consentimento:</strong> localização, marketing, cookies não essenciais.</li>
                <li><strong className="text-foreground">Obrigação legal:</strong> retenção fiscal e documentos.</li>
                <li><strong className="text-foreground">Legítimo interesse:</strong> segurança, prevenção a fraude, melhoria do produto.</li>
              </ul>
            </Section>

            <Section title="5. Com quem compartilhamos">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-foreground">Organizadores</strong> recebem nome, CPF
                  e e-mail dos compradores de seus eventos para emissão e validação do ingresso.
                </li>
                <li>
                  <strong className="text-foreground">Mercado Pago</strong> — gateway de
                  pagamento (PCI-DSS).
                </li>
                <li>
                  <strong className="text-foreground">Resend</strong> — envio de e-mails transacionais.
                </li>
                <li>
                  <strong className="text-foreground">Lovable Cloud / Supabase</strong> —
                  hospedagem da aplicação, banco de dados e storage (servidores no Brasil/EUA).
                </li>
                <li>
                  <strong className="text-foreground">Autoridades públicas</strong> mediante
                  ordem judicial ou obrigação legal.
                </li>
              </ul>
              <p>Não vendemos seus dados a terceiros.</p>
            </Section>

            <Section title="6. Cookies e tecnologias semelhantes">
              <p>
                Utilizamos cookies essenciais (sessão e segurança) e analíticos (uso agregado
                para melhorar a experiência). Você pode gerenciar cookies pelo seu navegador.
                Bloquear cookies essenciais pode impedir o login.
              </p>
            </Section>

            <Section title="7. Retenção">
              <p>
                Mantemos seus dados enquanto sua conta estiver ativa e pelo prazo necessário
                para cumprir obrigações legais (ex.: 5 anos para registros fiscais). Conteúdo
                público (avaliações, comentários) pode permanecer anonimizado após a exclusão da conta.
              </p>
            </Section>

            <Section title="8. Seus direitos">
              <p>
                Nos termos da LGPD, você pode a qualquer momento solicitar:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Confirmação e acesso aos seus dados.</li>
                <li>Correção de dados incompletos ou desatualizados.</li>
                <li>Anonimização, bloqueio ou eliminação de dados desnecessários.</li>
                <li>Portabilidade para outro fornecedor.</li>
                <li>Revogação do consentimento.</li>
                <li>Informação sobre compartilhamentos.</li>
              </ul>
              <p>
                Para exercer seus direitos, envie e-mail para{" "}
                <a
                  href="mailto:suporte@upplin.com"
                  className="text-foreground underline underline-offset-4 hover:text-primary"
                >
                  suporte@upplin.com
                </a>
                . Responderemos em até 15 dias.
              </p>
            </Section>

            <Section title="9. Segurança">
              <p>
                Aplicamos criptografia em trânsito (HTTPS/TLS), controle de acesso por papéis,
                Row-Level Security no banco, verificação de senhas vazadas (HIBP) e isolamento
                de sessões. Apesar disso, nenhum sistema é 100% seguro — incidentes serão
                comunicados conforme exigência da ANPD.
              </p>
            </Section>

            <Section title="10. Crianças e adolescentes">
              <p>
                A Upplin é destinada a maiores de 18 anos. Não coletamos intencionalmente dados
                de menores. Caso identifiquemos cadastro de menor sem consentimento dos
                responsáveis, a conta será removida.
              </p>
            </Section>

            <Section title="11. Alterações desta Política">
              <p>
                Podemos atualizar esta Política periodicamente. Mudanças relevantes serão
                comunicadas pelo app ou e-mail. A data no topo indica a versão vigente.
              </p>
            </Section>

            <Section title="12. Contato e Encarregado (DPO)">
              <p>
                Encarregado de Proteção de Dados:{" "}
                <a
                  href="mailto:suporte@upplin.com"
                  className="text-foreground underline underline-offset-4 hover:text-primary"
                >
                  suporte@upplin.com
                </a>
                .
              </p>
              <p>
                Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD) em{" "}
                <a
                  href="https://www.gov.br/anpd"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-4 hover:text-primary"
                >
                  gov.br/anpd
                </a>
                .
              </p>
            </Section>
          </div>
        </div>
      </main>
    </>
  );
}
