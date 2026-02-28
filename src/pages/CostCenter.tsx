import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Wallet, ChevronRight, Plus } from "lucide-react";
import AppHeader from "@/components/app/AppHeader";
import { getJobs } from "@/lib/storage";
import { Job } from "@/lib/types";
import { motion } from "framer-motion";

const CostCenter = () => {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    setJobs(getJobs());
  }, []);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Centro de Custo" backTo="/app" />

      <div className="container py-6 space-y-6">
        <p className="text-sm text-muted-foreground">
          Selecione uma obra para gerenciar o valor fechado e os gastos.
        </p>

        {jobs.length === 0 ? (
          <div className="text-center py-16">
            <Wallet className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma obra cadastrada.</p>
            <p className="text-muted-foreground text-sm">Crie uma obra primeiro na tela inicial.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job, i) => {
              const totalExpenses = job.expenses.reduce((s, e) => s + e.value, 0);
              const profit = job.saleValue - totalExpenses;
              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link to={`/app/centro-de-custo/obra/${job.id}`}>
                    <div className="bg-card rounded-xl p-4 shadow-card hover:shadow-elevated transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-foreground truncate">{job.clientName}</h3>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      <p className="text-sm text-muted-foreground truncate mb-3">{job.description}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Valor Fechado</span>
                          <div className="font-bold text-foreground">{fmt(job.saleValue)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Gastos</span>
                          <div className="font-bold text-secondary">{fmt(totalExpenses)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Lucro</span>
                          <div className={`font-bold ${profit >= 0 ? "text-success" : "text-destructive"}`}>
                            {fmt(profit)}
                          </div>
                        </div>
                      </div>
                      <Link
                        to={`/app/centro-de-custo/obra/${job.id}`}
                        className="mt-3 flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Plus className="h-4 w-4" />
                        Gerenciar Gastos
                      </Link>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CostCenter;
