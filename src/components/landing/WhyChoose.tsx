import { CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const reasons = [
  "Sem planilha, sem caderninho, sem dor de cabeça",
  "Veja o lucro real de cada obra instantaneamente",
  "Organize seus gastos por categoria automaticamente",
  "Funciona 100% no celular, mesmo offline",
  "Interface simples — é só abrir e usar",
  "Grátis para começar, sem cartão de crédito",
];

const WhyChoose = () => {
  return (
    <section id="vantagens" className="py-20 bg-muted/50">
      <div className="container grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Por que usar</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-6">
            Pare de perder dinheiro sem saber
          </h2>
          <p className="text-muted-foreground mb-8">
            Muitos vidraceiros trabalham o mês inteiro e no final não sabem quanto lucraram. 
            Com o VidraControl, cada real é rastreado.
          </p>
          <div className="space-y-4">
            {reasons.map((r) => (
              <div key={r} className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                <span className="text-foreground">{r}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="bg-card rounded-2xl shadow-elevated p-8"
        >
          <div className="text-sm text-muted-foreground mb-2">Exemplo real</div>
          <div className="text-2xl font-bold text-foreground mb-6">Obra: Sacada em Vidro Temperado</div>
          <div className="space-y-3">
            {[
              { label: "Vidro temperado 10mm", value: "R$ 850", cat: "Material" },
              { label: "Ferragens e perfis", value: "R$ 320", cat: "Material" },
              { label: "Gasolina ida e volta", value: "R$ 80", cat: "Transporte" },
              { label: "Almoço + lanche", value: "R$ 45", cat: "Alimentação" },
              { label: "Ajudante (diária)", value: "R$ 150", cat: "Ajudante" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <span className="text-foreground text-sm">{item.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">({item.cat})</span>
                </div>
                <span className="text-foreground font-semibold text-sm">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 rounded-lg bg-muted">
            <div className="flex justify-between mb-1">
              <span className="text-muted-foreground text-sm">Valor de Venda</span>
              <span className="text-foreground font-bold">R$ 3.200</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-muted-foreground text-sm">Total de Custos</span>
              <span className="text-secondary font-bold">- R$ 1.445</span>
            </div>
            <div className="border-t border-border pt-2 mt-2 flex justify-between">
              <span className="text-foreground font-bold">Seu Lucro</span>
              <span className="text-success font-bold text-lg">R$ 1.755</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default WhyChoose;
