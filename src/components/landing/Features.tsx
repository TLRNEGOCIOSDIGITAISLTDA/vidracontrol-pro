import { Camera, PieChart, Clock, Smartphone, Receipt, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Camera,
    title: "Foto da Nota Fiscal",
    desc: "Tire uma foto da NF direto do celular e registre o gasto em segundos.",
  },
  {
    icon: Receipt,
    title: "Registro Rápido",
    desc: "Não tem nota? Descreva o gasto e o valor. Simples assim.",
  },
  {
    icon: PieChart,
    title: "Relatório por Obra",
    desc: "Veja quanto gastou em material, transporte, alimentação e mais.",
  },
  {
    icon: TrendingUp,
    title: "Lucro Real",
    desc: "Descubra quanto sobrou de verdade depois de todos os custos.",
  },
  {
    icon: Smartphone,
    title: "Feito para o Celular",
    desc: "Interface rápida e simples, perfeita pra usar na correria do dia a dia.",
  },
  {
    icon: Clock,
    title: "Em 10 Segundos",
    desc: "Registre qualquer gasto em menos de 10 segundos. Sem complicação.",
  },
];

const Features = () => {
  return (
    <section id="funcionalidades" className="py-20 bg-background">
      <div className="container">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Funcionalidades</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">
            Tudo que você precisa, nada que não precisa
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            Criado por quem entende a rotina do vidraceiro autônomo.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-xl p-6 shadow-card hover:shadow-elevated transition-shadow group"
            >
              <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <f.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
