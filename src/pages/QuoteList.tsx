import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/app/AppHeader";
import { getQuotes } from "@/lib/storage";
import { Quote } from "@/lib/types";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = {
  orcado: "hsl(35, 95%, 55%)",
  fechado: "hsl(145, 60%, 42%)",
};

const QuoteList = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    setQuotes(getQuotes());
  }, []);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

  const hasData = quotes.length > 0;

  const renderLabel = ({ name, percent }: { name: string; percent: number }) =>
    percent > 0 ? `${(percent * 100).toFixed(0)}%` : "";

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

        {/* Charts */}
        {hasData && (
          <div className="grid grid-cols-2 gap-4">
            {/* Quantity chart */}
            <div className="bg-card rounded-xl p-4 shadow-card">
              <h3 className="text-xs font-bold text-muted-foreground text-center mb-2 uppercase tracking-wide">
                Quantidade
              </h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={qtyData}
                      cx="50%"
                      cy="50%"
                      outerRadius={55}
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
              <div className="flex justify-center gap-4 mt-2">
                {qtyData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">
                      {d.name} ({d.value})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Value chart */}
            <div className="bg-card rounded-xl p-4 shadow-card">
              <h3 className="text-xs font-bold text-muted-foreground text-center mb-2 uppercase tracking-wide">
                Valores (R$)
              </h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={valueData}
                      cx="50%"
                      cy="50%"
                      outerRadius={55}
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
              <div className="flex justify-center gap-4 mt-2">
                {valueData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">
                      {d.name} ({fmt(d.value)})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quote list */}
        {quotes.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum orçamento ainda.</p>
            <p className="text-muted-foreground text-sm">Crie seu primeiro orçamento!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {quotes.map((q, i) => {
              const status = q.status || "orcado";
              return (
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
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            status === "fechado"
                              ? "bg-success/10 text-success"
                              : "bg-warning/10 text-warning"
                          }`}
                        >
                          {status === "fechado" ? "Fechado" : "Orçado"}
                        </span>
                      </div>
                      {q.jobType && (
                        <p className="text-sm text-muted-foreground mb-2">{q.jobType}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {new Date(q.createdAt).toLocaleDateString("pt-BR")} · {q.items.length}{" "}
                          {q.items.length === 1 ? "item" : "itens"}
                        </span>
                        <span className="font-bold text-primary">{fmt(q.total)}</span>
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

export default QuoteList;
