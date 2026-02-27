import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const FinalCTA = () => {
  return (
    <section className="py-20 gradient-hero">
      <div className="container text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
          Comece a controlar seus gastos agora
        </h2>
        <p className="text-primary-foreground/70 mb-8 max-w-xl mx-auto">
          Chega de terminar a obra sem saber se deu lucro. Em menos de 1 minuto você já está usando.
        </p>
        <Link to="/app">
          <Button size="lg" className="gradient-accent border-0 text-secondary-foreground font-bold text-base px-10">
            Acessar o App <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    </section>
  );
};

export default FinalCTA;
