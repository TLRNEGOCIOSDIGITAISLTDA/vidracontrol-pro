import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Briefcase, TrendingUp, TrendingDown, DollarSign, FileText, ChevronDown, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/app/AppHeader";
import { getJobs, getQuotes } from "@/lib/storage";
import { Job, Quote } from "@/lib/types";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = {
  orcado: "hsl(35, 95%, 55%)",
  fechado: "hsl(145, 60%, 42%)",
};

const AppDashboard = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    setJobs(getJobs());
    setQuotes(getQuotes());
  }, []);

  const totalSales = jobs.reduce((s, j) => s + j.saleValue, 0);
  const totalExpenses = jobs.reduce((s, j) => s + j.expenses.reduce((es, e) => es + e.value, 0), 0);
  const totalProfit = totalSales - totalExpenses;

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Quote stats
  const orcados = quotes.filter((q) => (q.status || "orcado") === "orcado");
  const fechados = quotes.filter((q) => q.status === "fechado");

  const qtyData = [
    { name: "Orçados", value: orcados.length, color: COLORS.orcado },
    { name: "Fechados", value: fechados.length, color: COLORS.fechado },
  ];
  const valueData = [
    { name: "Orçados", value: orcados.reduce((s, q) => s + q.total, 0), color: COLORS.orcado },
    { name: "Fechados", value: fechados.reduce((s, q) => s + q.total, 0), color: COLORS.fechado },
  ];

  const hasQuotes = quotes.length > 0;
  const [quotesOpen, setQuotesOpen] = useState(false);
  const [costsOpen, setCostsOpen] = useState(false);
  const [jobsOpen, setJobsOpen] = useState(false);

  const renderLabel = ({ percent }: { percent: number }) =>
    percent > 0 ? `${(percent * 100).toFixed(0)}%` : "";

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

        {/* Gráficos de pizza — Seção independente */}
        {hasQuotes && (
          <div>
            <h2 className="text-lg font-bold text-foreground mb-3">Orçamentos — Visão Geral</h2>
            <div className="bg-card rounded-xl shadow-card p-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Quantity chart */}
                <div>
                  <h4 className="text-[10px] font-bold text-muted-foreground text-center mb-1 uppercase tracking-wide">
                    Quantidade
                  </h4>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={qtyData}
                          cx="50%"
                          cy="50%"
                          outerRadius={45}
                          dataKey="value"
                          label={renderLabel}
                          labelLine={false}
                          stroke="none"
                        >
                          {qtyData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => `${v} orçamento(s)`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-3 mt-1">
                    {qtyData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1 text-[10px]">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-muted-foreground">{d.name} ({d.value})</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Value chart */}
                <div>
                  <h4 className="text-[10px] font-bold text-muted-foreground text-center mb-1 uppercase tracking-wide">
                    Valores (R$)
                  </h4>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={valueData}
                          cx="50%"
                          cy="50%"
                          outerRadius={45}
                          dataKey="value"
                          label={renderLabel}
                          labelLine={false}
                          stroke="none"
                        >
                          {valueData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-3 mt-1">
                    {valueData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1 text-[10px]">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-muted-foreground">{d.name} ({fmt(d.value)})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Seção Orçamentos — collapsed/expandable */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Orçamentos</h2>
            <div className="flex items-center gap-2">
              <Link to="/app/novo-orcamento">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Novo Orçamento
                </Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setQuotesOpen(!quotesOpen)}
                className="gap-1"
              >
                Ver todos
                <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${quotesOpen ? "rotate-180" : ""}`} />
              </Button>
            </div>
          </div>

          <div
            className="overflow-hidden transition-all duration-300 ease-out"
            style={{
              maxHeight: quotesOpen ? `${quotes.length * 120 + 100}px` : "0px",
              opacity: quotesOpen ? 1 : 0,
            }}
          >
            <div className="pt-3 space-y-3">
              {quotes.length === 0 ? (
                <div className="text-center py-10">
                  <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum orçamento ainda.</p>
                  <p className="text-muted-foreground text-sm">Crie um orçamento para começar!</p>
                </div>
              ) : (
                quotes.map((quote, i) => (
                  <motion.div
                    key={quote.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link to={`/app/orcamento/${quote.id}`}>
                      <div className="bg-card rounded-xl p-4 shadow-card hover:shadow-elevated transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-foreground truncate">{quote.clientName}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            (quote.status || "orcado") === "fechado"
                              ? "bg-success/10 text-success"
                              : "bg-primary/10 text-primary"
                          }`}>
                            {(quote.status || "orcado") === "fechado" ? "Fechado" : "Orçado"}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">Total: <strong className="text-foreground">{fmt(quote.total)}</strong></span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Centro de Custo */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Centro de Custo</h2>
            <div className="flex items-center gap-2">
              <Link to="/app/centro-de-custo">
                <Button size="sm">
                  <Wallet className="h-4 w-4 mr-1" /> Gerenciar
                </Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCostsOpen(!costsOpen)}
                className="gap-1"
              >
                Ver todos
                <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${costsOpen ? "rotate-180" : ""}`} />
              </Button>
            </div>
          </div>

          <div
            className="overflow-hidden transition-all duration-300 ease-out"
            style={{
              maxHeight: costsOpen ? `${jobs.length * 140 + 100}px` : "0px",
              opacity: costsOpen ? 1 : 0,
            }}
          >
            <div className="pt-3 space-y-3">
              {jobs.length === 0 ? (
                <div className="text-center py-10">
                  <Wallet className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma obra no centro de custo.</p>
                </div>
              ) : (
                jobs.map((job, i) => {
                  const exp = job.expenses.reduce((s, e) => s + e.value, 0);
                  const profit = job.saleValue - exp;
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
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">Gastos: <strong className="text-secondary">{fmt(exp)}</strong></span>
                            <span className="text-muted-foreground">Lucro: <strong className={profit >= 0 ? "text-success" : "text-destructive"}>{fmt(profit)}</strong></span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Minhas Obras */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Minhas Obras</h2>
            <div className="flex items-center gap-2">
              <Link to="/app/nova-obra">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Nova Obra
                </Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setJobsOpen(!jobsOpen)}
                className="gap-1"
              >
                Ver todos
                <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${jobsOpen ? "rotate-180" : ""}`} />
              </Button>
            </div>
          </div>

          <div
            className="overflow-hidden transition-all duration-300 ease-out"
            style={{
              maxHeight: jobsOpen ? `${jobs.length * 140 + 100}px` : "0px",
              opacity: jobsOpen ? 1 : 0,
            }}
          >
            <div className="pt-3 space-y-3">
              {jobs.length === 0 ? (
                <div className="text-center py-10">
                  <Briefcase className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma obra ainda.</p>
                  <p className="text-muted-foreground text-sm">Clique em "Nova Obra" para começar!</p>
                </div>
              ) : (
                jobs.map((job, i) => {
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
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppDashboard;
