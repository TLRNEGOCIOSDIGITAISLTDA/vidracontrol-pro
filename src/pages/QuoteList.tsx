import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/app/AppHeader";
import { getQuotes } from "@/lib/storage";
import { Quote } from "@/lib/types";
import { motion } from "framer-motion";

const QuoteList = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    setQuotes(getQuotes());
  }, []);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Orçamentos" backTo="/app" />

      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Meus Orçamentos</h2>
          <Link to="/app/novo-orcamento">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Novo
            </Button>
          </Link>
        </div>

        {quotes.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum orçamento ainda.</p>
            <p className="text-muted-foreground text-sm">Crie seu primeiro orçamento!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {quotes.map((q, i) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/app/orcamento/${q.id}`}>
                  <div className="bg-card rounded-xl p-4 shadow-card hover:shadow-elevated transition-shadow">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-foreground truncate">{q.clientName}</h3>
                      <span className="text-xs text-muted-foreground">
                        {new Date(q.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    {q.jobType && <p className="text-sm text-muted-foreground mb-2">{q.jobType}</p>}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{q.items.length} {q.items.length === 1 ? "item" : "itens"}</span>
                      <span className="font-bold text-primary">{fmt(q.total)}</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteList;
