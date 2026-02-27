import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Briefcase, TrendingUp, TrendingDown, DollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/app/AppHeader";
import { getJobs } from "@/lib/storage";
import { Job } from "@/lib/types";
import { motion } from "framer-motion";

const AppDashboard = () => {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    setJobs(getJobs());
  }, []);

  const totalSales = jobs.reduce((s, j) => s + j.saleValue, 0);
  const totalExpenses = jobs.reduce((s, j) => s + j.expenses.reduce((es, e) => es + e.value, 0), 0);
  const totalProfit = totalSales - totalExpenses;

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="container py-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl p-4 shadow-card">
            <DollarSign className="h-4 w-4 text-muted-foreground mb-1" />
            <div className="text-xs text-muted-foreground">Vendas</div>
            <div className="text-sm font-bold text-foreground truncate">{fmt(totalSales)}</div>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card">
            <TrendingDown className="h-4 w-4 text-secondary mb-1" />
            <div className="text-xs text-muted-foreground">Custos</div>
            <div className="text-sm font-bold text-secondary truncate">{fmt(totalExpenses)}</div>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card">
            <TrendingUp className="h-4 w-4 text-success mb-1" />
            <div className="text-xs text-muted-foreground">Lucro</div>
            <div className={`text-sm font-bold truncate ${totalProfit >= 0 ? "text-success" : "text-destructive"}`}>
              {fmt(totalProfit)}
            </div>
          </div>
        </div>

        {/* Job list */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Minhas Obras</h2>
          <Link to="/app/nova-obra">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Nova Obra
            </Button>
          </Link>
        </div>

        {/* Quotes shortcut */}
        <Link to="/app/orcamentos">
          <div className="bg-card rounded-xl p-4 shadow-card hover:shadow-elevated transition-shadow flex items-center gap-3">
            <div className="bg-primary/10 rounded-lg p-2">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground text-sm">Orçamentos</h3>
              <p className="text-xs text-muted-foreground">Crie e envie orçamentos para seus clientes</p>
            </div>
          </div>
        </Link>

        {jobs.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma obra ainda.</p>
            <p className="text-muted-foreground text-sm">Clique em "Nova Obra" para começar!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job, i) => {
              const expenses = job.expenses.reduce((s, e) => s + e.value, 0);
              const profit = job.saleValue - expenses;
              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link to={`/app/obra/${job.id}`}>
                    <div className="bg-card rounded-xl p-4 shadow-card hover:shadow-elevated transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-foreground truncate">{job.clientName}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          job.status === 'concluido' 
                            ? 'bg-success/10 text-success' 
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {job.status === 'concluido' ? 'Concluído' : 'Em andamento'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mb-3">{job.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">Venda: <strong className="text-foreground">{fmt(job.saleValue)}</strong></span>
                        <span className="text-muted-foreground">Lucro: <strong className={profit >= 0 ? "text-success" : "text-destructive"}>{fmt(profit)}</strong></span>
                      </div>
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

export default AppDashboard;
