import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero-vidraceiro.webp";

const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center pt-16 overflow-hidden">
      <div className="absolute inset-0 gradient-hero opacity-95" />
      <img src={heroImg} alt="Vidraceiro trabalhando" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40" />
      
      <div className="container relative z-10 grid md:grid-cols-2 gap-12 items-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary-foreground text-sm font-medium mb-6">
            <TrendingUp className="h-4 w-4" />
            Controle total dos seus gastos
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary-foreground leading-tight mb-6">
            Saiba exatamente quanto <span className="text-secondary">você lucra</span> em cada obra
          </h1>
          <p className="text-lg text-primary-foreground/80 mb-8 max-w-lg">
            O app feito para vidraceiros autônomos que não têm tempo a perder. 
            Registre custos na hora, tire foto da nota e veja seu lucro real em segundos.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/app">
              <Button size="lg" className="gradient-accent border-0 text-secondary-foreground font-bold text-base px-8">
                Começar Grátis <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="#funcionalidades">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                Ver Funcionalidades
              </Button>
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="hidden md:block"
        >
          <div className="bg-card/10 backdrop-blur-md border border-primary-foreground/10 rounded-2xl p-6 space-y-4">
            <div className="text-primary-foreground/60 text-sm font-medium">Resumo da Obra</div>
            <div className="text-primary-foreground text-3xl font-bold">Box Banheiro - João</div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-primary-foreground/10 rounded-xl p-4">
                <div className="text-primary-foreground/60 text-xs">Valor de Venda</div>
                <div className="text-success font-bold text-xl">R$ 2.800</div>
              </div>
              <div className="bg-primary-foreground/10 rounded-xl p-4">
                <div className="text-primary-foreground/60 text-xs">Total de Custos</div>
                <div className="text-secondary font-bold text-xl">R$ 1.150</div>
              </div>
              <div className="bg-primary-foreground/10 rounded-xl p-4 col-span-2">
                <div className="text-primary-foreground/60 text-xs">Seu Lucro</div>
                <div className="text-success font-bold text-2xl">R$ 1.650 <span className="text-sm font-normal text-primary-foreground/60">(58.9%)</span></div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
