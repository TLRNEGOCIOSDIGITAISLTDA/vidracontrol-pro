import { useState, useRef } from "react";
import { DollarSign, TrendingDown, TrendingUp, Percent, Plus, ChevronDown, Trash2, Camera, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/app/AppHeader";
import { useData } from "@/lib/DataContext";
import { QuoteCostCategory, QUOTE_COST_CATEGORY_LABELS } from "@/lib/types";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const COST_CATEGORIES: QuoteCostCategory[] = ['material', 'mao_de_obra', 'frete', 'outros'];

const CATEGORY_MAP: Record<string, QuoteCostCategory> = {
  material: 'material',
  'mao_de_obra': 'mao_de_obra',
  'mão de obra': 'mao_de_obra',
  frete: 'frete',
  outros: 'outros',
};

function mapCategory(raw: string | null): QuoteCostCategory {
  if (!raw) return 'outros';
  const key = raw.toLowerCase().trim();
  return CATEGORY_MAP[key] || 'outros';
}

function parseDate(raw: string | null): string {
  if (!raw) return new Date().toISOString().slice(0, 10);
  // Try DD/MM/YYYY
  const m = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return new Date().toISOString().slice(0, 10);
}

const CostCenter = () => {
  const { quotes, addCost, removeCost } = useData();
  const closedQuotes = quotes.filter(q => q.status === "fechado");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState<string | null>(null);

  // Form state
  const [costDesc, setCostDesc] = useState("");
  const [costCategory, setCostCategory] = useState<QuoteCostCategory>("material");
  const [costValue, setCostValue] = useState("");
  const [costDate, setCostDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [costFornecedor, setCostFornecedor] = useState("");

  // AI scanning state
  const [scanning, setScanning] = useState(false);
  const [scannedPreview, setScannedPreview] = useState<string | null>(null);
  const [aiConfirm, setAiConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Totals
  const totalSales = closedQuotes.reduce((s, q) => s + q.total, 0);
  const totalCosts = closedQuotes.reduce((s, q) => s + (q.costs || []).reduce((cs, c) => cs + c.value, 0), 0);
  const totalProfit = totalSales - totalCosts;
  const avgMargin = totalSales > 0 ? ((totalProfit / totalSales) * 100) : 0;

  const resetForm = () => {
    setCostDesc("");
    setCostValue("");
    setCostCategory("material");
    setCostDate(new Date().toISOString().slice(0, 10));
    setCostFornecedor("");
    setScannedPreview(null);
    setAiConfirm(false);
    setFormOpen(null);
  };

  const handleSaveCost = (quoteId: string) => {
    const val = parseFloat(costValue.replace(",", "."));
    if (!costDesc.trim() || isNaN(val) || val <= 0) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }
    const desc = costFornecedor.trim()
      ? `${costDesc.trim()} — ${costFornecedor.trim()}`
      : costDesc.trim();
    addCost(quoteId, {
      description: desc,
      category: costCategory,
      value: val,
      date: costDate,
    });
    toast.success("Custo adicionado!");
    resetForm();
  };

  const handleDeleteCost = (quoteId: string, costId: string) => {
    removeCost(quoteId, costId);
    toast.success("Custo removido.");
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
    setFormOpen(null);
    setAiConfirm(false);
    setScannedPreview(null);
  };

  const handleFileSelected = async (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];
    if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.heic')) {
      toast.error("Formato não suportado. Use JPG, PNG, PDF ou HEIC.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    setScanning(true);

    try {
      // Convert to base64
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      const mimeType = file.type || 'image/jpeg';

      // Preview
      if (mimeType.startsWith('image/')) {
        setScannedPreview(URL.createObjectURL(file));
      }

      // Call edge function
      const { data, error } = await supabase.functions.invoke('analyze-document', {
        body: { imageBase64: base64, mimeType },
      });

      if (error) throw error;

      if (data?.data) {
        const d = data.data;
        if (d.descricao) setCostDesc(d.descricao);
        setCostCategory(mapCategory(d.categoria));
        if (d.valor_total) setCostValue(String(d.valor_total).replace('.', ','));
        setCostDate(parseDate(d.data));
        if (d.fornecedor) setCostFornecedor(d.fornecedor);
        setAiConfirm(true);
        toast.success("Documento analisado com sucesso!");
      } else {
        toast.error("Não foi possível ler o documento automaticamente. Preencha os campos manualmente.");
      }
    } catch (err) {
      console.error("Scan error:", err);
      toast.error("Erro ao analisar documento. Preencha os campos manualmente.");
    } finally {
      setScanning(false);
    }
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

          {closedQuotes.length === 0 ? (
            <div className="text-center py-16">
              <DollarSign className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum orçamento fechado ainda.</p>
              <p className="text-muted-foreground text-sm">Feche um orçamento para gerenciar seus custos aqui.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {closedQuotes.map((quote, i) => {
                const costs = quote.costs || [];
                const totalQuoteCosts = costs.reduce((s, c) => s + c.value, 0);
                const profit = quote.total - totalQuoteCosts;
                const margin = quote.total > 0 ? ((profit / quote.total) * 100) : 0;
                const isExpanded = expandedId === quote.id;
                const isFormVisible = formOpen === quote.id;
                const hasCosts = costs.length > 0;

                return (
                  <motion.div key={quote.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <div className="bg-card rounded-xl shadow-card overflow-hidden">
                      <button onClick={() => toggleExpand(quote.id)} className="w-full px-4 pt-4 pb-3 text-left hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-foreground truncate">{quote.clientName}</h3>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${hasCosts ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
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
                            <div className={`font-bold ${profit >= 0 ? "text-success" : "text-destructive"}`}>{fmt(profit)}</div>
                          </div>
                        </div>
                      </button>

                      <div className="overflow-hidden transition-all duration-300 ease-out" style={{ maxHeight: isExpanded ? "3000px" : "0px", opacity: isExpanded ? 1 : 0 }}>
                        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Margem:</span>
                            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${margin >= 0 ? "bg-success" : "bg-destructive"}`} style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }} />
                            </div>
                            <span className={`font-bold ${margin >= 0 ? "text-success" : "text-destructive"}`}>{margin.toFixed(1)}%</span>
                          </div>

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
                                    <button onClick={() => handleDeleteCost(quote.id, cost.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {!isFormVisible ? (
                            <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => { setFormOpen(quote.id); setAiConfirm(false); setScannedPreview(null); }}>
                              <Plus className="h-4 w-4" /> Inserir Custo
                            </Button>
                          ) : (
                            <div className="bg-muted/30 rounded-lg p-3 space-y-3 border border-border">
                              <h4 className="text-xs font-bold text-foreground">Novo Custo</h4>

                              {/* AI Scan Buttons */}
                              {!aiConfirm && !scanning && (
                                <div className="flex gap-2">
                                  <input
                                    ref={cameraInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                                  />
                                  <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/heic,application/pdf"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 gap-1 text-xs"
                                    onClick={() => cameraInputRef.current?.click()}
                                  >
                                    <Camera className="h-4 w-4" /> 📷 Tirar Foto
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 gap-1 text-xs"
                                    onClick={() => fileInputRef.current?.click()}
                                  >
                                    <Upload className="h-4 w-4" /> 📁 Upload
                                  </Button>
                                </div>
                              )}

                              {/* Scanning indicator */}
                              {scanning && (
                                <div className="flex items-center justify-center gap-2 py-6 text-primary">
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                  <span className="text-sm font-medium">🔍 Analisando documento...</span>
                                </div>
                              )}

                              {/* AI Confirmation banner */}
                              {aiConfirm && (
                                <div className="bg-success/10 border border-success/30 rounded-lg px-3 py-2 text-xs text-success font-medium">
                                  ✅ Confira as informações extraídas antes de salvar:
                                </div>
                              )}

                              {/* Scanned image preview */}
                              {scannedPreview && (
                                <div className="relative">
                                  <img
                                    src={scannedPreview}
                                    alt="Documento escaneado"
                                    className="w-full max-h-32 object-cover rounded-lg border border-border cursor-pointer"
                                    onClick={() => window.open(scannedPreview, '_blank')}
                                  />
                                </div>
                              )}

                              {/* Form fields */}
                              {!scanning && (
                                <>
                                  <input type="text" placeholder="Descrição do custo" value={costDesc} onChange={(e) => setCostDesc(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />

                                  <input type="text" placeholder="Fornecedor (opcional)" value={costFornecedor} onChange={(e) => setCostFornecedor(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />

                                  <select value={costCategory} onChange={(e) => setCostCategory(e.target.value as QuoteCostCategory)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                                    {COST_CATEGORIES.map((cat) => (<option key={cat} value={cat}>{QUOTE_COST_CATEGORY_LABELS[cat]}</option>))}
                                  </select>

                                  <div className="grid grid-cols-2 gap-2">
                                    <input type="text" inputMode="decimal" placeholder="Valor (R$)" value={costValue} onChange={(e) => setCostValue(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                    <input type="date" value={costDate} onChange={(e) => setCostDate(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                  </div>

                                  <div className="flex gap-2">
                                    <Button size="sm" className="flex-1 gap-1" onClick={() => handleSaveCost(quote.id)}>
                                      {aiConfirm ? "✅ Confirmar e Salvar" : "Salvar"}
                                    </Button>
                                    <Button size="sm" variant="outline" className="flex-1" onClick={resetForm}>
                                      {aiConfirm ? "✏️ Editar Manualmente" : "Cancelar"}
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}

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
