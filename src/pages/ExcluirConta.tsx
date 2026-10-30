import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
export default function ExcluirConta() {
  const [status, setStatus] = useState<string | null>(null);
  useEffect(() => {
    let active = true;let timer: ReturnType<typeof setTimeout>;
    let receipt: { job_id: string; receipt: string };
    try { receipt = JSON.parse(sessionStorage.getItem("upplin:deletion-receipt") || "null"); } catch { return; }
    if (!receipt?.job_id) return;
    const poll = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, { method: "POST", headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ action: "status", ...receipt }) });
        const value = await response.json();
        if (active && response.ok) { setStatus(value.status);if (value.status !== "completed") timer = setTimeout(poll, 5000); }
      } catch { if (active) timer = setTimeout(poll, 10000); }
    };
    void poll();return () => { active = false;clearTimeout(timer); };
  }, []);
  return <main className="min-h-[100dvh] bg-background text-foreground px-5 py-12"><Helmet><title>Excluir sua conta no UPPLIN</title><meta name="description" content="Como excluir sua conta UPPLIN pelo aplicativo ou por email. Saiba quais dados são apagados e quais registros têm retenção legal." /><link rel="canonical" href="https://www.upplin.com/excluir-conta" /></Helmet>
    <article className="max-w-3xl mx-auto space-y-7 leading-relaxed">
      <Link to="/" className="text-primary font-bold text-2xl">UPPLIN</Link><h1 className="text-3xl font-bold">Excluir sua conta no UPPLIN</h1><p>Esta página é do app UPPLIN, da UPPLIN LTDA.</p>
      {status && <section role="status" className="rounded-xl border border-primary/40 p-5"><h2 className="font-semibold text-xl">{status === "completed" ? "Sua conta foi excluída" : "Solicitação de exclusão recebida"}</h2><p>{status === "completed" ? "O acesso à conta e os dados pessoais associados foram excluídos. Os registros com retenção legal seguem os prazos descritos nesta página." : "Estamos processando a exclusão. A conclusão ocorre em até 30 dias corridos, e avisaremos por email."}</p></section>}
      <section className="space-y-3"><h2 className="font-semibold text-xl">Como pedir</h2><p><strong>No app:</strong> Perfil → Configurações → Excluir conta, e confirme. No painel do organizador, acesse Configurações → Excluir conta.</p><p><strong>Sem o app:</strong> mande um email para <a className="text-primary underline" href="mailto:suporte@upplin.com?subject=Excluir%20minha%20conta">suporte@upplin.com</a>, a partir do email da sua conta, com o assunto “Excluir minha conta”. Respondemos em até <strong>2 dias úteis</strong>, concluímos a exclusão em até <strong>30 dias corridos</strong> e avisamos por email quando terminar. Podemos pedir uma confirmação de identidade para proteger sua conta.</p></section>
      <section className="space-y-3"><h2 className="font-semibold text-xl">O que apagamos</h2><p>Perfil (nome, foto, capa e cidade), email e senha de acesso, CPF do perfil, posts, fotos e vídeos enviados, comentários, curtidas, seguidores, eventos salvos, presenças, avaliações, suas mensagens do chat e notificações. Na conta de organizador, também os dados de cadastro e a ligação com o Mercado Pago na UPPLIN.</p><p>O acesso Apple vinculado à UPPLIN é revogado antes da conclusão. Assinaturas recorrentes ativas são canceladas. A exclusão não cria automaticamente um reembolso de compras anteriores.</p></section>
      <section className="space-y-3"><h2 className="font-semibold text-xl">O que guardamos e por quanto tempo</h2><ul className="list-disc pl-6 space-y-3"><li><strong>Pedidos, ingressos e pagamentos:</strong> valores, datas, CPF do comprador e código do pagamento no Mercado Pago, por 5 anos, para obrigações fiscais e de defesa do consumidor. A contagem considera a última movimentação relacionada e a realização do evento. Esses dados ficam desvinculados do perfil excluído, com acesso restrito.</li><li><strong>Registros de acesso:</strong> IP, data e hora, por 6 meses, conforme o Marco Civil da Internet (Lei 12.965/2014, art. 15).</li><li><strong>Cópias de segurança:</strong> saem no ciclo normal de retenção da infraestrutura, em até 90 dias corridos após a exclusão, exceto os registros financeiros mantidos por obrigação legal.</li></ul><p>Quando um organizador exclui a conta, os registros de eventos necessários para atender quem já comprou permanecem desvinculados dos seus dados pessoais. A exclusão do organizador não apaga os pedidos e ingressos de outras pessoas.</p></section>
      <p>Dados que o Mercado Pago já recebeu seguem a política de privacidade dele.</p>
      <div className="flex gap-3 flex-wrap"><Button asChild><Link to="/perfil?tab=config">Acessar configurações</Link></Button><Button asChild variant="outline"><a href="mailto:suporte@upplin.com?subject=Excluir%20minha%20conta">Pedir exclusão por email</a></Button><Button asChild variant="ghost"><Link to="/privacidade">Política de privacidade</Link></Button></div>
    </article>
  </main>;
}
