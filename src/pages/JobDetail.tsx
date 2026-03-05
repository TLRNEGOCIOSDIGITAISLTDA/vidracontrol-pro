import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Trash2, Camera, PieChart, CheckCircle, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AppHeader from "@/components/app/AppHeader";
import { getJob, addExpense, deleteExpense, updateJob } from "@/lib/storage";
import { useData } from "@/lib/DataContext";
import { Job, ExpenseCategory, CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/types";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const EXPENSE_CATEGORY_MAP: Record<string, ExpenseCategory> = {
  material: 'material',
  transporte: 'transporte',
  alimentacao: 'alimentacao',
  alimentação: 'alimentacao',
  ferramenta: 'ferramenta',
  ajudante: 'ajudante',
  'mao_de_obra': 'ajudante',
  'mão de obra': 'ajudante',
  frete: 'transporte',
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
  const [expPhoto, setExpPhoto] = useState<string | undefined>();

  // AI scan state
  const [scanning, setScanning] = useState(false);
  const [scannedPreview, setScannedPreview] = useState<string | null>(null);
  const [aiConfirm, setAiConfirm] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
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
    setExpPhoto(undefined);
    setScannedPreview(null);
    setAiConfirm(false);
  };

  const handleAddExpense = async () => {
    if (!expDesc.trim() || !expValue.trim()) {
      toast.error("Preencha a descrição e o valor.");
      return;
    }
    const val = parseFloat(expValue.replace(/[^\d.,]/g, "").replace(",", "."));
    if (isNaN(val) || val <= 0) {
      toast.error("Valor inválido.");
      return;
    }
    await addExpense(job.id, { description: expDesc.trim(), value: val, category: expCategory, photoUrl: expPhoto });
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

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setExpPhoto(reader.result as string);
    reader.readAsDataURL(file);
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
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      const mimeType = file.type || 'image/jpeg';

      if (mimeType.startsWith('image/')) {
        setScannedPreview(URL.createObjectURL(file));
      }

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
    <div className="min-h-screen bg-background pb-24">
      <AppHeader title={job.clientName} backTo="/app" />

      <div className="container py-6 space-y-6 max-w-lg">
        {/* Summary */}
        <div className="bg-card rounded-xl p-5 shadow-card space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">{job.description || "Sem descrição"}</p>
              <span className={`text-xs px-2 py-1 rounded-full font-medium mt-2 inline-block ${
                job.status === 'concluido' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
              }`}>
                {job.status === 'concluido' ? 'Concluído' : 'Em andamento'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
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
              <div className={`font-bold ${profit >= 0 ? "text-success" : "text-destructive"}`}>
                {fmt(profit)}
              </div>
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
              {Object.entries(byCategory).sort(([,a],[,b]) => b - a).map(([cat, val]) => {
                const pct = totalExpenses > 0 ? (val / totalExpenses * 100).toFixed(1) : "0";
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{CATEGORY_LABELS[cat as ExpenseCategory]}</span>
                      <span className="text-muted-foreground">{fmt(val)} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[cat as ExpenseCategory] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Expenses list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-foreground">Gastos ({job.expenses.length})</h3>
          </div>

          {job.expenses.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Nenhum gasto registrado ainda.</p>
          ) : (
            <div className="space-y-2">
              {job.expenses.map((exp, i) => (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-card rounded-lg p-3 shadow-card flex items-start gap-3"
                >
                  {exp.photoUrl && (
                    <img src={exp.photoUrl} alt="NF" className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground truncate">{exp.description}</p>
                        <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[exp.category]}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground whitespace-nowrap">{fmt(exp.value)}</span>
                        <button onClick={() => handleDeleteExpense(exp.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
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
            {job.status === 'concluido' ? 'Reabrir' : 'Concluir'}
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Floating add expense button */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogTrigger asChild>
          <button className="fixed bottom-6 right-6 w-14 h-14 rounded-full gradient-accent shadow-elevated flex items-center justify-center text-secondary-foreground z-50 active:scale-95 transition-transform">
            <Plus className="h-7 w-7" />
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Gasto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">

            {/* AI Scan buttons */}
            {!aiConfirm && !scanning && (
              <div className="flex gap-2">
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                />
                <input
                  ref={uploadRef}
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
                  onClick={() => cameraRef.current?.click()}
                >
                  <Camera className="h-4 w-4" /> Tirar Foto da NF
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1 text-xs"
                  onClick={() => uploadRef.current?.click()}
                >
                  <Upload className="h-4 w-4" /> Upload NF
                </Button>
              </div>
            )}

            {/* Scanning indicator */}
            {scanning && (
              <div className="flex items-center justify-center gap-2 py-4 text-primary">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">Analisando documento...</span>
              </div>
            )}

            {/* AI confirmation banner */}
            {aiConfirm && (
              <div className="bg-success/10 border border-success/30 rounded-lg px-3 py-2 text-xs text-success font-medium">
                ✅ Dados extraídos pela IA — confirme antes de salvar:
              </div>
            )}

            {/* Scanned image preview */}
            {scannedPreview && (
              <img
                src={scannedPreview}
                alt="Nota escaneada"
                className="w-full max-h-32 object-cover rounded-lg border border-border cursor-pointer"
                onClick={() => window.open(scannedPreview, '_blank')}
              />
            )}

            {!scanning && (
              <>
                <div>
                  <Label>Descrição</Label>
                  <Input placeholder="Ex: Vidro temperado 8mm" value={expDesc} onChange={e => setExpDesc(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Valor (R$)</Label>
                  <Input placeholder="Ex: 350" value={expValue} onChange={e => setExpValue(e.target.value)} className="mt-1" inputMode="decimal" />
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
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} className="mt-1" />
                </div>
                {!aiConfirm && (
                  <div>
                    <Label>Foto da Nota (opcional)</Label>
                    <div className="mt-1 flex items-center gap-3">
                      <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                        <Camera className="h-4 w-4 mr-1" /> {expPhoto ? "Trocar foto" : "Anexar foto"}
                      </Button>
                      {expPhoto && <img src={expPhoto} alt="preview" className="w-10 h-10 rounded object-cover" />}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
                  </div>
                )}
                <Button onClick={handleAddExpense} className="w-full">
                  {aiConfirm ? "✅ Confirmar e Salvar" : "Adicionar Gasto"}
                </Button>
                {aiConfirm && (
                  <Button variant="outline" className="w-full" onClick={() => setAiConfirm(false)}>
                    ✏️ Editar Manualmente
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobDetail;
