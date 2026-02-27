import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    q: "Preciso pagar para usar?",
    a: "Não! O VidraControl é gratuito para começar. Você pode registrar suas obras e gastos sem pagar nada.",
  },
  {
    q: "Funciona sem internet?",
    a: "Sim! Os dados ficam salvos no seu celular. Você pode registrar gastos mesmo sem sinal.",
  },
  {
    q: "Como registro um gasto?",
    a: "É super simples: abra a obra, clique em 'Novo Gasto', escolha a categoria, coloque o valor e pronto. Também pode tirar foto da nota fiscal.",
  },
  {
    q: "Posso ver quanto lucrei no mês?",
    a: "Sim! O painel mostra o resumo de todas as suas obras, com total de vendas, custos e lucro.",
  },
  {
    q: "Meus dados ficam seguros?",
    a: "Sim. No momento os dados ficam salvos no seu aparelho. Em breve teremos sincronização na nuvem para mais segurança.",
  },
];

const FAQ = () => {
  return (
    <section id="faq" className="py-20 bg-background">
      <div className="container max-w-3xl">
        <div className="text-center mb-12">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Dúvidas</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">Perguntas Frequentes</h2>
        </div>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-card rounded-xl px-6 border border-border shadow-card">
              <AccordionTrigger className="text-foreground font-semibold text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQ;
