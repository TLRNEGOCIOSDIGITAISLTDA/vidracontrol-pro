import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Trash2, Camera, PieChart, Upload, Loader2, Wallet, Pencil, Package, FileEdit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AppHeader from "@/components/app/AppHeader";
import { JobStages } from "@/components/app/JobStages";
import { JobNotes } from "@/components/app/JobNotes";
import { getJob, addExpense, deleteExpense, updateExpense, updateJob, getJobPayments, addJobPayment, deleteJobPayment, updateJobPayment, getJobNotes } from "@/lib/storage";
import { CurrencyInput, parseCurrency, numericToDisplay } from "@/components/app/CurrencyInput";
import { useData } from "@/lib/DataContext";
import { Job, JobNote, JobPayment, PaymentMethod, PAYMENT_METHODS, JobStatus, JOB_STATUS_LABELS, JOB_STATUS_COLORS, ExpenseCategory, CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/types";
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

const ALL_JOB_STATUSES: JobStatus[] = ['em_andamento', 'aguardando_pagamento', 'finalizado'];

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { removeJob } = useData();

  const [job, setJob] = useState<Job | null>(null);
  const [payments, setPayments] = useState<JobPayment[]>([]);
  const [notes, setNotes] = useState<JobNote[]>([]);
  const [activeTab, setActiveTab] = useState<'custos' | 'recebimentos' | 'anotacoes'>('custos');

  // Expense dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expDesc, setExpDesc] = useState("");
  const [expValue, setExpValue] = useState("");
  const [expCategory, setExpCategory] = useState<ExpenseCategory>("material");
  const [expDate, setExpDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Payment dialog (adicionar)
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState<PaymentMethod>("Pix");
  const [payNotes, setPayNotes] = useState("");

  // Expense dialog (editar)
  const [editExpDialogOpen, setEditExpDialogOpen] = useState(false);
  const [editExpId, setEditExpId] = useState("");
  const [editExpDesc, setEditExpDesc] = useState("");
  const [editExpValue, setEditExpValue] = useState("");
  const [editExpCategory, setEditExpCategory] = useState<ExpenseCategory>("material");
  const [editExpDate, setEditExpDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Payment dialog (editar)
  const [editPayDialogOpen, setEditPayDialogOpen] = useState(false);
  const [editPayId, setEditPayId] = useState("");
  const [editPayAmount, setEditPayAmount] = useState("");
  const [editPayDate, setEditPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [editPayMethod, setEditPayMethod] = useState<PaymentMethod>("Pix");
  const [editPayNotes, setEditPayNotes] = useState("");

  // AI scan state
  const [scanning, setScanning] = useState(false);
  const [scannedPreview, setScannedPreview] = useState<string | null>(null);
  const [aiConfirm, setAiConfirm] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const reload = async () => {
    if (!id) return;
    const [j, pays, ns] = await Promise.all([getJob(id), getJobPayments(id), getJobNotes(id)]);
    setJob(j || null);
    setPayments(pays);
    setNotes(ns);
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

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const totalExpenses = job.expenses.reduce((s, e) => s + e.value, 0);
  const profit = job.saleValue - totalExpenses;
  const profitPercent = job.saleValue > 0 ? ((profit / job.saleValue) * 100).toFixed(1) : "0";

  const totalReceived = payments.reduce((s, p) => s + p.amount, 0);
  const balance = job.saleValue - totalReceived;

  const byCategory = job.expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.value;
    return acc;
  }, {});

  // ===== Expense handlers =====

  const resetExpForm = () => {
    setExpDesc("");
    setExpValue("");
    setExpCategory("material");
    setExpDate(new Date().toISOString().slice(0, 10));
    setScannedPreview(null);
    setAiConfirm(false);
  };

  const handleAddExpense = async () => {
    if (!expDesc.trim()) { toast.error("Preencha a descrição."); return; }
    const val = parseCurrency(expValue);
    if (!val || val <= 0) { toast.error("Informe um valor válido."); return; }
    await addExpense(job.id, { description: expDesc.trim(), value: val, category: expCategory });
    resetExpForm();
    setDialogOpen(false);
    await reload();
    toast.success("Gasto adicionado!");
  };

  const handleDeleteExpense = async (expenseId: string) => {
    await deleteExpense(job.id, expenseId);
    await reload();
    toast.success("Gasto removido.");
  };

  const openEditExpense = (exp: { id: string; description: string; value: number; category: ExpenseCategory; date?: string }) => {
    setEditExpId(exp.id);
    setEditExpDesc(exp.description);
    setEditExpValue(numericToDisplay(exp.value));
    setEditExpCategory(exp.category);
    setEditExpDate(exp.date || new Date().toISOString().slice(0, 10));
    setEditExpDialogOpen(true);
  };

  const handleEditExpense = async () => {
    if (!editExpDesc.trim()) { toast.error("Preencha a descrição."); return; }
    const val = parseCurrency(editExpValue);
    if (!val || val <= 0) { toast.error("Informe um valor válido."); return; }
    await updateExpense(editExpId, {
      description: editExpDesc.trim(),
      value: val,
      category: editExpCategory,
      date: editExpDate,
    });
    setEditExpDialogOpen(false);
    await reload();
    toast.success("Gasto atualizado!");
  };

  const handleFileSelected = async (file: File) => {
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];
    if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.heic')) {
      toast.error("Formato não suportado. Use JPG, PNG, PDF ou HEIC."); return;
    }
    if (file.size > 10 * 1024 * 1024) { toast.error("Arquivo muito grande. Máximo 10MB."); return; }

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
        if (d.valor_total) setExpValue(numericToDisplay(d.valor_total));
        setExpDate(parseDate(d.data));
        setAiConfirm(true);
        toast.success("Nota fiscal lida com sucesso!");
      } else {
        toast.error("Não foi possível ler a nota. Preencha os campos manualmente.");
      }
    } catch {
      toast.error("Erro ao analisar o documento. Preencha manualmente.");
    } finally {
      setScanning(false);
    }
  };

  // ===== Payment handlers =====

  const resetPayForm = () => {
    setPayAmount("");
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayMethod("Pix");
    setPayNotes("");
  };

  const handleAddPayment = async () => {
    const val = parseCurrency(payAmount);
    if (!val || val <= 0) { toast.error("Informe um valor válido."); return; }
    await addJobPayment(job.id, {
      amount: val,
      paymentDate: payDate,
      paymentMethod: payMethod,
      notes: payNotes.trim() || undefined,
    });
    resetPayForm();
    setPayDialogOpen(false);
    const currentTotal = payments.reduce((s, p) => s + p.amount, 0);
    const newTotal = currentTotal + val;
    if (job.saleValue > 0 && newTotal >= job.saleValue && job.status !== 'finalizado') {
      await updateJob(job.id, { status: 'finalizado' });
      toast.success("Recebimento registrado! Obra finalizada 🎉");
    } else {
      toast.success("Recebimento registrado!");
    }
    await reload();
  };

  const handleDeletePayment = async (paymentId: string) => {
    await deleteJobPayment(paymentId);
    await reload();
    toast.success("Recebimento removido.");
  };

  const openEditPayment = (pay: JobPayment) => {
    setEditPayId(pay.id);
    setEditPayAmount(numericToDisplay(pay.amount));
    setEditPayDate(pay.paymentDate);
    setEditPayMethod(pay.paymentMethod);
    setEditPayNotes(pay.notes || "");
    setEditPayDialogOpen(true);
  };

  const handleEditPayment = async () => {
    const val = parseCurrency(editPayAmount);
    if (!val || val <= 0) { toast.error("Informe um valor válido."); return; }
    await updateJobPayment(editPayId, {
      amount: val,
      paymentDate: editPayDate,
      paymentMethod: editPayMethod,
      notes: editPayNotes.trim() || undefined,
    });
    setEditPayDialogOpen(false);
    const oldAmount = payments.find(p => p.id === editPayId)?.amount || 0;
    const currentTotal = payments.reduce((s, p) => s + p.amount, 0);
    const newTotal = currentTotal - oldAmount + val;
    if (job.saleValue > 0 && newTotal >= job.saleValue && job.status !== 'finalizado') {
      await updateJob(job.id, { status: 'finalizado' });
      toast.success("Recebimento atualizado! Obra finalizada 🎉");
    } else {
      toast.success("Recebimento atualizado!");
    }
    await reload();
  };

  // ===== Job actions =====

  const handleStatusChange = async (newStatus: JobStatus) => {
    await updateJob(job.id, { status: newStatus });
    await reload();
    toast.success(`Status: ${JOB_STATUS_LABELS[newStatus]}`);
  };

  const handleDelete = async () => {
    if (confirm("Tem certeza que deseja excluir esta obra?")) {
      await removeJob(job.id);
      navigate("/app");
      toast.success("Obra excluída.");
    }
  };

  const currentStatus = (job.status || 'em_andamento') as JobStatus;

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader title={job.clientName} backTo="/app" />

      <div className="container py-6 space-y-6 max-w-lg">

        {/* Summary card */}
        <div className="bg-card rounded-xl p-5 shadow-card space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground truncate">{job.description || "Sem descrição"}</p>
            </div>
            {/* Tag de status */}
            <span className={`h-7 text-xs font-bold px-3 rounded-full inline-flex items-center shrink-0 ${JOB_STATUS_COLORS[currentStatus]}`}>
              {JOB_STATUS_LABELS[currentStatus]}
            </span>
          </div>

          {/* Botão "Marcar como Entregue" — visível apenas quando em_andamento */}
          {currentStatus === 'em_andamento' && (
            <div className="pt-1">
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5 border-[hsl(45,95%,50%)] text-[hsl(45,95%,40%)] hover:bg-[hsl(45,95%,50%)]/10"
                onClick={async () => {
                  await handleStatusChange('aguardando_pagamento');
                }}
              >
                <Package className="h-4 w-4" />
                Marcar como Entregue
              </Button>
            </div>
          )}

          {/* Botão "Editar Orçamento" — visível quando a obra tem orçamento vinculado */}
          {job.quoteId && (
            <div className="pt-1">
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => navigate(`/app/orcamento/${job.quoteId}`, { state: { fromJobId: job.id } })}
              >
                <FileEdit className="h-4 w-4" />
                Editar Orçamento desta Obra
              </Button>
            </div>
          )}

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

          {/* Recebimentos — linha divisória + 2 colunas + barra */}
          <div className="border-t border-border/50 pt-3 space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Recebido</div>
                <div className={`font-bold ${
                  totalReceived >= job.saleValue && job.saleValue > 0
                    ? "text-success"
                    : totalReceived > 0
                    ? "text-[hsl(45,95%,40%)]"
                    : "text-muted-foreground"
                }`}>{fmt(totalReceived)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">A Receber</div>
                <div className={`font-bold ${balance > 0 ? "text-destructive" : "text-success"}`}>
                  {fmt(Math.max(0, balance))}
                </div>
              </div>
            </div>
            {job.saleValue > 0 && (
              <>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      totalReceived >= job.saleValue ? "bg-success" : "bg-[hsl(45,95%,50%)]"
                    }`}
                    style={{ width: `${Math.min(100, (totalReceived / job.saleValue) * 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground text-right">
                  {Math.min(100, ((totalReceived / job.saleValue) * 100)).toFixed(0)}% recebido
                </div>
              </>
            )}
          </div>
        </div>

        {/* Etapas da Obra */}
        <JobStages job={job} onReload={reload} />

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          <button
            onClick={() => setActiveTab('custos')}
            className={`flex-1 text-sm font-bold py-2 rounded-lg transition-colors ${
              activeTab === 'custos' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Custos
          </button>
          <button
            onClick={() => setActiveTab('recebimentos')}
            className={`flex-1 text-sm font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'recebimentos' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Wallet className="h-3.5 w-3.5" /> Pgto
          </button>
          <button
            onClick={() => setActiveTab('anotacoes')}
            className={`flex-1 text-sm font-bold py-2 rounded-lg transition-colors ${
              activeTab === 'anotacoes' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Anotações{notes.length > 0 ? ` (${notes.length})` : ''}
          </button>
        </div>

        {/* ===== ABA CUSTOS ===== */}
        {activeTab === 'custos' && (
          <>
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
                <Button size="sm" onClick={() => { resetExpForm(); setDialogOpen(true); }} className="gap-1">
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
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-sm font-bold text-foreground">{fmt(exp.value)}</span>
                        <button onClick={() => openEditExpense(exp)} className="text-muted-foreground hover:text-primary transition-colors p-1">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDeleteExpense(exp.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== ABA RECEBIMENTOS ===== */}
        {activeTab === 'recebimentos' && (
          <>
            {/* Resumo financeiro */}
            <div className="bg-card rounded-xl p-5 shadow-card space-y-3">
              <h3 className="font-bold text-sm text-foreground mb-1">Resumo de Recebimentos</h3>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor Total da Obra</span>
                <span className="font-bold text-foreground">{fmt(job.saleValue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Recebido</span>
                <span className="font-bold text-success">{fmt(totalReceived)}</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between text-sm">
                <span className="font-bold text-foreground">Saldo a Receber</span>
                <span className={`font-bold text-lg ${balance > 0 ? 'text-destructive' : 'text-success'}`}>
                  {fmt(balance)}
                </span>
              </div>
              {job.saleValue > 0 && (
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full transition-all"
                    style={{ width: `${Math.min(100, (totalReceived / job.saleValue) * 100)}%` }}
                  />
                </div>
              )}
              {job.saleValue > 0 && (
                <p className="text-xs text-muted-foreground text-right">
                  {Math.min(100, ((totalReceived / job.saleValue) * 100)).toFixed(0)}% recebido
                </p>
              )}
            </div>

            {/* Adicionar recebimento */}
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">Recebimentos ({payments.length})</h3>
              <Button size="sm" onClick={() => { resetPayForm(); setPayDialogOpen(true); }} className="gap-1">
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </div>

            {/* Lista de recebimentos */}
            {payments.length === 0 ? (
              <div className="text-center py-10 bg-card rounded-xl shadow-card">
                <Wallet className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Nenhum recebimento ainda.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((pay, i) => (
                  <motion.div
                    key={pay.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-card rounded-lg p-3 shadow-card flex items-start gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-foreground">{fmt(pay.amount)}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{pay.paymentMethod}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(pay.paymentDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                      {pay.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{pay.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                      <button onClick={() => openEditPayment(pay)} className="text-muted-foreground hover:text-primary transition-colors p-1">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDeletePayment(pay.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===== ABA ANOTAÇÕES ===== */}
        {activeTab === 'anotacoes' && (
          <JobNotes jobId={job.id} notes={notes} onReload={reload} />
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="destructive" onClick={handleDelete} className="w-full">
            <Trash2 className="h-4 w-4 mr-1" /> Excluir Obra
          </Button>
        </div>
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetExpForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Gasto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
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
            {scanning && (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-primary">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-sm font-medium">Lendo nota fiscal com IA...</span>
              </div>
            )}
            {aiConfirm && (
              <div className="bg-success/10 border border-success/30 rounded-lg px-3 py-2 text-xs text-success font-medium">
                ✅ Dados extraídos pela IA — confira e salve
              </div>
            )}
            {scannedPreview && (
              <img src={scannedPreview} alt="Nota escaneada"
                className="w-full max-h-28 object-cover rounded-lg border border-border cursor-pointer"
                onClick={() => window.open(scannedPreview, '_blank')} />
            )}
            {!scanning && (
              <div className="space-y-3">
                <div>
                  <Label>Descrição</Label>
                  <Input className="mt-1" placeholder="Ex: Silicone, mão de obra, frete..." value={expDesc} onChange={e => setExpDesc(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Valor (R$)</Label>
                    <CurrencyInput className="mt-1" value={expValue} onChange={(display) => setExpValue(display)} />
                  </div>
                  <div>
                    <Label>Data</Label>
                    <Input className="mt-1" type="date" value={expDate} onChange={e => setExpDate(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={expCategory} onValueChange={(v) => setExpCategory(v as ExpenseCategory)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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

      {/* Edit Expense Dialog */}
      <Dialog open={editExpDialogOpen} onOpenChange={setEditExpDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Gasto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label>Descrição</Label>
              <Input className="mt-1" placeholder="Ex: Silicone, mão de obra, frete..." value={editExpDesc} onChange={e => setEditExpDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor (R$)</Label>
                <CurrencyInput className="mt-1" value={editExpValue} onChange={(display) => setEditExpValue(display)} />
              </div>
              <div>
                <Label>Data</Label>
                <Input className="mt-1" type="date" value={editExpDate} onChange={e => setEditExpDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={editExpCategory} onValueChange={(v) => setEditExpCategory(v as ExpenseCategory)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleEditExpense} className="w-full">Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog open={editPayDialogOpen} onOpenChange={setEditPayDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Recebimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Valor Recebido (R$)</Label>
              <CurrencyInput
                className="mt-1"
                value={editPayAmount}
                onChange={(display) => setEditPayAmount(display)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data</Label>
                <Input className="mt-1" type="date" value={editPayDate} onChange={e => setEditPayDate(e.target.value)} />
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={editPayMethod} onValueChange={(v) => setEditPayMethod(v as PaymentMethod)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Observação (opcional)</Label>
              <Textarea
                className="mt-1"
                rows={2}
                placeholder='Ex: "Entrada 50%", "Parcela final"...'
                value={editPayNotes}
                onChange={e => setEditPayNotes(e.target.value)}
              />
            </div>
            <Button onClick={handleEditPayment} className="w-full">Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={(open) => { setPayDialogOpen(open); if (!open) resetPayForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Recebimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Valor Recebido (R$)</Label>
              <CurrencyInput
                className="mt-1"
                value={payAmount}
                onChange={(display) => setPayAmount(display)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data</Label>
                <Input className="mt-1" type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={payMethod} onValueChange={(v) => setPayMethod(v as PaymentMethod)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Observação (opcional)</Label>
              <Textarea
                className="mt-1"
                rows={2}
                placeholder='Ex: "Entrada 50%", "Parcela final"...'
                value={payNotes}
                onChange={e => setPayNotes(e.target.value)}
              />
            </div>
            <Button onClick={handleAddPayment} className="w-full">Salvar Recebimento</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobDetail;
