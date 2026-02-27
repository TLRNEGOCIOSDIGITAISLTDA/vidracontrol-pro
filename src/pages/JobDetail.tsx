import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Plus, Trash2, Camera, PieChart, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AppHeader from "@/components/app/AppHeader";
import { getJob, addExpense, deleteExpense, updateJob, deleteJob } from "@/lib/storage";
import { Job, ExpenseCategory, CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/types";
import { toast } from "sonner";
import { motion } from "framer-motion";

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isCostCenter = location.pathname.includes("/centro-de-custo/");
  const backTo = isCostCenter ? "/app/centro-de-custo" : "/app";
  const [job, setJob] = useState<Job | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expDesc, setExpDesc] = useState("");
  const [expValue, setExpValue] = useState("");
  const [expCategory, setExpCategory] = useState<ExpenseCategory>("material");
  const [expPhoto, setExpPhoto] = useState<string | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = () => {
    if (id) setJob(getJob(id) || null);
  };

  useEffect(reload, [id]);

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Obra não encontrada" backTo={backTo} />
        <div className="container py-16 text-center text-muted-foreground">Obra não encontrada.</div>
      </div>
    );
  }

  const totalExpenses = job.expenses.reduce((s, e) => s + e.value, 0);
  const profit = job.saleValue - totalExpenses;
  const profitPercent = job.saleValue > 0 ? ((profit / job.saleValue) * 100).toFixed(1) : "0";

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Group expenses by category
  const byCategory = job.expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.value;
    return acc;
  }, {});

  const handleAddExpense = () => {
    if (!expDesc.trim() || !expValue.trim()) {
      toast.error("Preencha a descrição e o valor.");
      return;
    }
    const val = parseFloat(expValue.replace(/[^\d.,]/g, "").replace(",", "."));
    if (isNaN(val) || val <= 0) {
      toast.error("Valor inválido.");
      return;
    }
    addExpense(job.id, { description: expDesc.trim(), value: val, category: expCategory, photoUrl: expPhoto });
    setExpDesc(""); setExpValue(""); setExpCategory("material"); setExpPhoto(undefined);
    setDialogOpen(false);
    reload();
    toast.success("Gasto adicionado!");
  };

  const handleDeleteExpense = (expenseId: string) => {
    deleteExpense(job.id, expenseId);
    reload();
    toast.success("Gasto removido.");
  };

  const handleComplete = () => {
    updateJob(job.id, { status: job.status === 'concluido' ? 'em_andamento' : 'concluido' });
    reload();
  };

  const handleDelete = () => {
    if (confirm("Tem certeza que deseja excluir esta obra?")) {
      deleteJob(job.id);
      navigate(backTo);
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

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader title={job.clientName} backTo={backTo} />

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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
              <Label>Foto da Nota (opcional)</Label>
              <div className="mt-1 flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Camera className="h-4 w-4 mr-1" /> {expPhoto ? "Trocar foto" : "Tirar foto / Anexar"}
                </Button>
                {expPhoto && <img src={expPhoto} alt="preview" className="w-10 h-10 rounded object-cover" />}
              </div>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
            </div>
            <Button onClick={handleAddExpense} className="w-full">Adicionar Gasto</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobDetail;
