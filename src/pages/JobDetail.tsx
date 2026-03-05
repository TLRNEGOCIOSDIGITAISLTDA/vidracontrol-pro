import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Trash2, Camera, PieChart, CheckCircle, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AppHeader from "@/components/app/AppHeader";
import { getJob, addExpense, deleteExpense, updateJob } from "@/lib/storage";
import { useData } from "@/lib/DataContext";
import { Job, ExpenseCategory, CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/types";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const EXPENSE_CATEGORY_MAP: Record<string, ExpenseCategory> = {
  material: 'material',
  mao_de_obra: 'mao_de_obra',
  'mão de obra': 'mao_de_obra',
  mao: 'mao_de_obra',
  trabalho: 'mao_de_obra',
  servico: 'mao_de_obra',
  serviço: 'mao_de_obra',
  transporte: 'transporte',
  frete: 'transporte',
  entrega: 'transporte',
  alimentacao: 'outros',
  alimentação: 'outros',
  ferramenta: 'outros',
  ajudante: 'mao_de_obra',
  outros: 'outros',
};

function mapExpenseCategory(raw: string | null): ExpenseCategory {
  if (!raw) return 'outros';
  const key = raw.toLowerCase().trim();
  return EXPENSE_CATEGORY_MAP[key] || 'outros';
}

function parseDate(raw: string | null): string {
  if (!raw) return new Date().toISOString().slice(0, 10);
  const m = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return new Date().toISOString().slice(0, 10);
}

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expDesc, setExpDesc] = useState("");
  const [expValue, setExpValue] = useState("");
  const [expCategory, setExpCategory] = useState<ExpenseCategory>("material");
  const [expDate, setExpDate] = useState(() => new Date().toISOString().slice(0, 10));

  // AI scan state
  const [scanning, setScanning] = useState(false);
  const [scannedPreview, setScannedPreview] = useState<string | null>(null);
  const [aiConfirm, setAiConfirm] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const reload = async () => {
    if (id) {
      const j = await getJob(id);
      setJob(j || null);
    }
  };

  useEffect(() => { reload(); }, [id]);

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Obra" backTo="/app" />
        <div className="container py-16 text-center text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  const totalExpenses = job.expenses.reduce((s, e) => s + e.value, 0);
  const profit = job.saleValue - totalExpenses;
  const profitPercent = job.saleValue > 0 ? ((profit / job.saleValue) * 100).toFixed(1) : "0";

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const byCategory = job.expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.value;
    return acc;
  }, {});

  const resetForm = () => {
    setExpDesc("");
    setExpValue("");
    setExpCategory("material");
    setExpDate(new Date().toISOString().slice(0, 10));
    setScannedPreview(null);
    setAiConfirm(false);
  };

  const openDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleAddExpense = async () => {
    if (!expDesc.trim()) {
      toast.error("Preencha a descrição.");
      return;
    }
    const val = parseFloat(expValue.replace(/[^\d.,]/g, "").replace(",", "."));
    if (isNaN(val) || val <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    await addExpense(job.id, { description: expDesc.trim(), value: val, category: expCategory });
    resetForm();
    setDialogOpen(false);
    await reload();
    toast.success("Gasto adicionado!");
  };

  const handleDeleteExpense = async (expenseId: string) => {
    await deleteExpense(job.id, expenseId);
    await reload();
    toast.success("Gasto removido.");
  };

  const handleComplete = async () => {
    await updateJob(job.id, { status: job.status === 'concluido' ? 'em_andamento' : 'concluido' });
    await reload();
  };

  const { removeJob } = useData();

  const handleDelete = async () => {
    if (confirm("Tem certeza que deseja excluir esta obra?")) {
      await removeJob(job.id);
      navigate("/app");
      toast.success("Obra excluída.");
    }
  };

  const handleFileSelected = async (file: File) => {
    if (!file) return;

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
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      const mimeType = file.type || 'image/jpeg';

      if (mimeType.startsWith('image/')) setScannedPreview(URL.createObjectURL(file));

      const { data, error } = await supabase.functions.invoke('analyze-document', {
        body: { imageBase64: base64, mimeType },
      });

      if (error) throw error;

      if (data?.data) {
        const d = data.data;
        if (d.descricao) setExpDesc(d.descricao);
        setExpCategory(mapExpenseCategory(d.categoria));
        if (d.valor_total) setExpValue(String(d.valor_total).replace('.', ','));
        setExpDate(parseDate(d.data));
        setAiConfirm(true);
        toast.success("Nota fiscal lida com sucesso!");
      } else {
        toast.error("Não foi possível ler a nota. Preencha os campos manualmente.");
      }
    } catch (err) {
      console.error("Scan error:", err);
      toast.error("Erro ao analisar o documento. Preencha manualmente.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader title={job.clientName} backTo="/app" />

      <div className="container py-6 space-y-6 max-w-lg">

        {/* Summary card */}
        <div className="bg-card rounded-xl p-5 shadow-card space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">{job.description || "Sem descrição"}</p>
            <span className={`text-xs px-2 py-1 rounded-full font-medium mt-2 inline-block ${
              job.status === 'concluido' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
            }`}>
              {job.status === 'concluido' ? 'Concluído' : 'Em andamento'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1">
            <div>
              <div className="text-xs text-muted-foreground">Venda</div>
              <div className="font-bold text-foreground">{fmt(job.saleValue)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Custos</div>
              <div className="font-bold text-secondary">{fmt(totalExpenses)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Lucro</div>
              <div className={`font-bold ${profit >= 0 ? "text-success" : "text-destructive"}`}>{fmt(profit)}</div>
              <div className="text-xs text-muted-foreground">{profitPercent}%</div>
            </div>
          </div>
        </div>

        {/* Category breakdown */}
        {Object.keys(byCategory).length > 0 && (
          <div className="bg-card rounded-xl p-5 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="h-4 w-4 text-primary" />
              <span className="font-bold text-foreground text-sm">Gastos por Categoria</span>
            </div>
            <div className="space-y-3">
              {Object.entries(byCategory).sort(([, a], [, b]) => b - a).map(([cat, val]) => {
                const pct = totalExpenses > 0 ? (val / totalExpenses * 100).toFixed(1) : "0";
                const label = CATEGORY_LABELS[cat as ExpenseCategory] ?? cat;
                const color = CATEGORY_COLORS[cat as ExpenseCategory] ?? 'hsl(0,0%,50%)';
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{label}</span>
                      <span className="text-muted-foreground">{fmt(val)} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Expenses section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-foreground">Gastos ({job.expenses.length})</h3>
            <Button size="sm" onClick={openDialog} className="gap-1">
              <Plus className="h-4 w-4" /> Adicionar Gasto
            </Button>
          </div>

          {job.expenses.length === 0 ? (
            <div className="text-center py-10 bg-card rounded-xl shadow-card">
              <p className="text-muted-foreground text-sm">Nenhum gasto registrado.</p>
              <p className="text-muted-foreground text-xs mt-1">Clique em "Adicionar Gasto" para registrar.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {job.expenses.map((exp, i) => (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-card rounded-lg p-3 shadow-card flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{exp.description}</p>
                    <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[exp.category] ?? exp.category}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-foreground">{fmt(exp.value)}</span>
                    <button onClick={() => handleDeleteExpense(exp.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleComplete} className="flex-1">
            <CheckCircle className="h-4 w-4 mr-1" />
            {job.status === 'concluido' ? 'Reabrir Obra' : 'Concluir Obra'}
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Gasto</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">

            {/* Scan NF buttons */}
            {!aiConfirm && !scanning && (
              <>
                <div className="flex gap-2">
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])} />
                  <input ref={uploadRef} type="file" accept="image/jpeg,image/png,image/heic,application/pdf" className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])} />
                  <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => cameraRef.current?.click()}>
                    <Camera className="h-4 w-4" /> 📷 Escanear NF
                  </Button>
                  <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => uploadRef.current?.click()}>
                    <Upload className="h-4 w-4" /> Upload NF
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex-1 h-px bg-border" />
                  <span>ou preencha manualmente</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              </>
            )}

            {/* Scanning */}
            {scanning && (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-primary">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-sm font-medium">Lendo nota fiscal com IA...</span>
              </div>
            )}

            {/* AI confirm banner */}
            {aiConfirm && (
              <div className="bg-success/10 border border-success/30 rounded-lg px-3 py-2 text-xs text-success font-medium">
                ✅ Dados extraídos pela IA — confira e salve
              </div>
            )}

            {/* Scanned preview */}
            {scannedPreview && (
              <img src={scannedPreview} alt="Nota escaneada"
                className="w-full max-h-28 object-cover rounded-lg border border-border cursor-pointer"
                onClick={() => window.open(scannedPreview, '_blank')} />
            )}

            {/* Form fields */}
            {!scanning && (
              <div className="space-y-3">
                <div>
                  <Label>Descrição</Label>
                  <Input className="mt-1" placeholder="Ex: Silicone, mão de obra, frete..." value={expDesc} onChange={e => setExpDesc(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Valor (R$)</Label>
                    <Input className="mt-1" placeholder="0,00" inputMode="decimal" value={expValue} onChange={e => setExpValue(e.target.value)} />
                  </div>
                  <div>
                    <Label>Data</Label>
                    <Input className="mt-1" type="date" value={expDate} onChange={e => setExpDate(e.target.value)} />
                  </div>
                </div>

                <div>
                  <Label>Categoria</Label>
                  <Select value={expCategory} onValueChange={(v) => setExpCategory(v as ExpenseCategory)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleAddExpense} className="w-full">
                  {aiConfirm ? "✅ Confirmar e Salvar" : "Salvar Gasto"}
                </Button>

                {aiConfirm && (
                  <Button variant="outline" className="w-full" onClick={() => { setAiConfirm(false); setScannedPreview(null); }}>
                    ✏️ Editar campos
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobDetail;
