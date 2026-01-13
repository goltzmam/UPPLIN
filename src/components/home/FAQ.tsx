import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Como compro um ingresso?",
    answer: "É muito simples! Encontre o evento desejado, selecione os ingressos e finalize a compra com seu cartão de crédito, débito ou PIX. Você receberá a confirmação por e-mail imediatamente.",
  },
  {
    question: "Posso transferir meu ingresso para outra pessoa?",
    answer: "Sim! Você pode transferir seu ingresso para outra pessoa diretamente pela plataforma. Basta acessar 'Meus Ingressos', selecionar o ingresso e clicar em 'Transferir'.",
  },
  {
    question: "Como funciona o reembolso?",
    answer: "A política de reembolso varia de acordo com cada evento. Geralmente, você pode solicitar reembolso até 7 dias antes do evento. Consulte as condições específicas na página do evento.",
  },
  {
    question: "Como crio um evento na plataforma?",
    answer: "Criar um evento é gratuito! Basta fazer login, acessar a área do organizador e clicar em 'Criar Evento'. Configure as informações, tipos de ingresso e publique. Seu evento estará no ar em minutos.",
  },
  {
    question: "Quais são as taxas para organizadores?",
    answer: "Cobramos apenas uma pequena taxa sobre cada ingresso vendido. Não há custos fixos mensais ou taxas de setup. Você só paga quando vende. Entre em contato para conhecer nossas condições especiais.",
  },
];

export function FAQ() {
  return (
    <section className="py-16">
      <div className="container max-w-3xl">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
            Tire suas dúvidas aqui
          </h2>
          <p className="text-muted-foreground">
            Respostas para as perguntas mais frequentes
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-card border border-border rounded-xl px-6 data-[state=open]:shadow-lg transition-shadow"
            >
              <AccordionTrigger className="text-left font-medium hover:no-underline py-5">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
