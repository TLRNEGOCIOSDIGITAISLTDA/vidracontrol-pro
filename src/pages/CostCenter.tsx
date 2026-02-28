import { useState, useEffect } from "react";
import { DollarSign, TrendingDown, TrendingUp, Percent, Plus, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/app/AppHeader";
import { getQuotes, addQuoteCost, deleteQuoteCost, saveQuotes } from "@/lib/storage";
import { Quote, QuoteCost, QuoteCostCategory, QUOTE_COST_CATEGORY_LABELS } from "@/lib/types";
import { motion } from "framer-motion";
import { toast } from "sonner";

const COST_CATEGORIES: QuoteCostCategory[] = ['material', 'mao_de_obra', 'frete', 'outros'];

const CostCenter = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState<string | null>(null);

  // Form state
  const [costDesc, setCostDesc] = useState("");
  const [costCategory, setCostCategory] = useState<QuoteCostCategory>("material");
  const [costValue, setCostValue] = useState("");
  const [costDate, setCostDate] = useState(() => new Date().toISOString().slice(0, 10));

  const reload = () => {
    const all = getQuotes().filter(q => q.status === "fechado");
    setQuotes(all);
  };

  useEffect(() => { reload(); }, []);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Totals
  const totalSales = quotes.reduce((s, q) => s + q.total, 0);
  const totalCosts = quotes.reduce((s, q) => s + (q.costs || []).reduce((cs, c) => cs + c.value, 0), 0);
  const totalProfit = totalSales - totalCosts;
  const avgMargin = totalSales > 0 ? ((totalProfit / totalSales) * 100) : 0;

  const handleSaveCost = (quoteId: string) => {
    const val = parseFloat(costValue.replace(",", "."));
    if (!costDesc.trim() || isNaN(val) || val <= 0) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }
    addQuoteCost(quoteId, {
      description: costDesc.trim(),
      category: costCategory,
      value: val,
      date: costDate,
    });
    toast.success("Custo adicionado!");
    setCostDesc("");
    setCostValue("");
    setCostCategory("material");
    setCostDate(new Date().toISOString().slice(0, 10));
    setFormOpen(null);
    reload();
  };

  const handleDeleteCost = (quoteId: string, costId: string) => {
    deleteQuoteCost(quoteId, costId);
    toast.success("Custo removido.");
    reload();
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
    setFormOpen(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Centro de Custo" backTo="/app" />

      <div className="container py-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl p-4 shadow-card">
            <DollarSign className="h-4 w-4 text-muted-foreground mb-1" />
            <div className="text-xs text-muted-foreground">Vendas Fechadas</div>
            <div className="text-sm font-bold text-foreground truncate">{fmt(totalSales)}</div>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card">
            <TrendingDown className="h-4 w-4 text-secondary mb-1" />
            <div className="text-xs text-muted-foreground">Total de Custos</div>
            <div className="text-sm font-bold text-secondary truncate">{fmt(totalCosts)}</div>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card">
            <TrendingUp className="h-4 w-4 text-success mb-1" />
            <div className="text-xs text-muted-foreground">Lucro Real</div>
            <div className={`text-sm font-bold truncate ${totalProfit >= 0 ? "text-success" : "text-destructive"}`}>
              {fmt(totalProfit)}
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card">
            <Percent className="h-4 w-4 text-primary mb-1" />
            <div className="text-xs text-muted-foreground">Margem Média</div>
            <div className="text-sm font-bold text-primary truncate">{avgMargin.toFixed(1)}%</div>
          </div>
        </div>

        {/* List */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-3">Orçamentos Fechados</h2>

          {quotes.length === 0 ? (
            <div className="text-center py-16">
              <DollarSign className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum orçamento fechado ainda.</p>
              <p className="text-muted-foreground text-sm">Feche um orçamento para gerenciar seus custos aqui.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {quotes.map((quote, i) => {
                const costs = quote.costs || [];
                const totalQuoteCosts = costs.reduce((s, c) => s + c.value, 0);
                const profit = quote.total - totalQuoteCosts;
                const margin = quote.total > 0 ? ((profit / quote.total) * 100) : 0;
                const isExpanded = expandedId === quote.id;
                const isFormVisible = formOpen === quote.id;
                const hasCosts = costs.length > 0;

                return (
                  <motion.div
                    key={quote.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="bg-card rounded-xl shadow-card overflow-hidden">
                      {/* Header */}
                      <button
                        onClick={() => toggleExpand(quote.id)}
                        className="w-full px-4 pt-4 pb-3 text-left hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-foreground truncate">{quote.clientName}</h3>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              hasCosts ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                            }`}>
                              {hasCosts ? "Com custo" : "Sem custo"}
                            </span>
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Venda</span>
                            <div className="font-bold text-foreground">{fmt(quote.total)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Custos</span>
                            <div className="font-bold text-secondary">{fmt(totalQuoteCosts)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Lucro</span>
                            <div className={`font-bold ${profit >= 0 ? "text-success" : "text-destructive"}`}>
                              {fmt(profit)}
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Expanded content */}
                      <div
                        className="overflow-hidden transition-all duration-300 ease-out"
                        style={{
                          maxHeight: isExpanded ? "2000px" : "0px",
                          opacity: isExpanded ? 1 : 0,
                        }}
                      >
                        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                          {/* Margin bar */}
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Margem:</span>
                            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${margin >= 0 ? "bg-success" : "bg-destructive"}`}
                                style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }}
                              />
                            </div>
                            <span className={`font-bold ${margin >= 0 ? "text-success" : "text-destructive"}`}>
                              {margin.toFixed(1)}%
                            </span>
                          </div>

                          {/* Existing costs */}
                          {hasCosts && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Custos inseridos</h4>
                              {costs.map((cost) => (
                                <div key={cost.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-foreground truncate">{cost.description}</div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {QUOTE_COST_CATEGORY_LABELS[cost.category]} · {new Date(cost.date).toLocaleDateString("pt-BR")}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 ml-2">
                                    <span className="text-sm font-bold text-secondary">{fmt(cost.value)}</span>
                                    <button
                                      onClick={() => handleDeleteCost(quote.id, cost.id)}
                                      className="text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add cost button / form */}
                          {!isFormVisible ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full gap-1"
                              onClick={() => setFormOpen(quote.id)}
                            >
                              <Plus className="h-4 w-4" /> Inserir Custo
                            </Button>
                          ) : (
                            <div className="bg-muted/30 rounded-lg p-3 space-y-3 border border-border">
                              <h4 className="text-xs font-bold text-foreground">Novo Custo</h4>
                              <input
                                type="text"
                                placeholder="Descrição do custo"
                                value={costDesc}
                                onChange={(e) => setCostDesc(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                              />
                              <select
                                value={costCategory}
                                onChange={(e) => setCostCategory(e.target.value as QuoteCostCategory)}
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                              >
                                {COST_CATEGORIES.map((cat) => (
                                  <option key={cat} value={cat}>{QUOTE_COST_CATEGORY_LABELS[cat]}</option>
                                ))}
                              </select>
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="Valor (R$)"
                                  value={costValue}
                                  onChange={(e) => setCostValue(e.target.value)}
                                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                                <input
                                  type="date"
                                  value={costDate}
                                  onChange={(e) => setCostDate(e.target.value)}
                                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" className="flex-1" onClick={() => handleSaveCost(quote.id)}>
                                  Salvar
                                </Button>
                                <Button size="sm" variant="outline" className="flex-1" onClick={() => setFormOpen(null)}>
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Summary */}
                          <div className="bg-muted/30 rounded-lg p-3 border border-border">
                            <div className="grid grid-cols-3 gap-2 text-xs text-center">
                              <div>
                                <div className="text-muted-foreground">Total Custos</div>
                                <div className="font-bold text-secondary">{fmt(totalQuoteCosts)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Lucro Real</div>
                                <div className={`font-bold ${profit >= 0 ? "text-success" : "text-destructive"}`}>{fmt(profit)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Margem</div>
                                <div className={`font-bold ${margin >= 0 ? "text-success" : "text-destructive"}`}>{margin.toFixed(1)}%</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CostCenter;
