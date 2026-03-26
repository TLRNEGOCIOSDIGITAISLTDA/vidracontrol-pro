import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Trash2, Send, CheckCircle2, XCircle, Loader2, Circle, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppHeader from "@/components/app/AppHeader";
import { getQuote, getProfile } from "@/lib/storage";
import { useData } from "@/lib/DataContext";
import { Quote, QuoteItem, QuoteItemType, QuoteStatus, QUOTE_ITEM_LABELS, QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from "@/lib/types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateQuotePdf } from "@/lib/generateQuotePdf";
import { maskWhatsApp } from "@/lib/whatsappMask";
import { motion, AnimatePresence } from "framer-motion";

const JOB_TYPES = ["Residencial", "Comercial", "Industrial", "Reforma", "Obra Nova", "Outro"];

const FLOW_STEPS: { status: QuoteStatus; label: string }[] = [
  { status: 'orcado', label: 'Orçado' },
  { status: 'enviado', label: 'Enviado' },
  { status: 'aprovado', label: 'Aprovado' },
];

function getFlowIndex(status: QuoteStatus): number {
  if (status === 'perdido') return -1;
  if (status === 'aguardando') return 1; // trata como enviado no fluxo visual
  return FLOW_STEPS.findIndex(s => s.status === status);
}

// Calcula o total do item: usa m² se tiver dimensões, senão qtd × unitPrice
// width e height são SEMPRE em mm no banco → divisor 1_000_000 para converter em m²
function calcItemTotal(item: QuoteItem): number {
  if (item.width && item.height) {
    return (item.width * item.height / 1_000_000) * item.quantity * item.unitPrice;
  }
  return item.quantity * item.unitPrice;
}

interface EditData {
  clientName: string;
  clientPhone: string;
  jobType: string;
  notes: string;
  items: QuoteItem[];
}

const QuoteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { changeQuoteStatus, removeQuote, updateQuote } = useData();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<EditData | null>(null);
  const [saving, setSaving] = useState(false);
  const [editUnit, setEditUnit] = useState<'cm' | 'mm'>('mm');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    getQuote(id).then(q => {
      if (!q) {
        toast.error("Orçamento não encontrado.");
        navigate("/app/orcamentos");
        return;
      }
      setQuote(q);
    });
    getProfile().then(p => {
      if (p?.defaultUnit) setEditUnit(p.defaultUnit);
    });
  }, [id, navigate]);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleDelete = async () => {
    if (!id) return;
    if (confirm("Excluir este orçamento?")) {
      await removeQuote(id);
      toast.success("Orçamento excluído.");
      navigate("/app/orcamentos");
    }
  };

  const currentStatus = (quote?.status || 'orcado') as QuoteStatus;
  const flowIndex = getFlowIndex(currentStatus);
  const isPerdido = currentStatus === 'perdido';

  const handleSendWhatsApp = async () => {
    if (!quote || !id) return;

    const clientPhone = quote.clientPhone?.replace(/\D/g, '');
    if (!clientPhone || clientPhone.length !== 11) {
      toast.error("Telefone do cliente não cadastrado. Edite o orçamento e adicione.");
      return;
    }

    setSending(true);
    try {
      const profile = await getProfile();
      const userName = profile?.fullName || quote.companyInfo.name || 'Empresa';

      const doc = await generateQuotePdf(quote, profile?.whatsapp ? maskWhatsApp(profile.whatsapp) : '');
      const pdfBlob = doc.output('blob');
      const fileName = `orcamento-${quote.clientName.replace(/\s+/g, '-').toLowerCase()}-${id.slice(0, 8)}.pdf`;

      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('quote-pdfs')
          .upload(fileName, pdfBlob, { contentType: 'application/pdf', upsert: true });

        if (!uploadError && uploadData) {
          supabase.storage.from('quote-pdfs').getPublicUrl(fileName);
        }
      } catch { /* fallback */ }

      const appUrl = `${window.location.origin}/orcamento-publico/${id}`;
      const message = `Olá ${quote.clientName}! Segue o orçamento conforme solicitado: ${appUrl}\n\nQualquer dúvida estou à disposição!\nAtt, ${userName}`;
      window.open(`https://wa.me/55${clientPhone}?text=${encodeURIComponent(message)}`, '_blank');

      await changeQuoteStatus(id, 'enviado');
      toast.success('Orçamento enviado! Status alterado para "Enviado".');
      navigate('/app/orcamentos');
    } catch {
      toast.error("Erro ao enviar orçamento.");
    } finally {
      setSending(false);
    }
  };

  const handleApprove = async () => {
    if (!quote || !id) return;
    await changeQuoteStatus(id, 'aprovado');
    setQuote({ ...quote, status: 'aprovado' });
    toast.success("Obra criada com sucesso!");
  };

  const handleLost = async () => {
    if (!quote || !id) return;
    await changeQuoteStatus(id, 'perdido');
    setQuote({ ...quote, status: 'perdido' });
    toast("Orçamento marcado como Perdido.");
  };

  // ===== EDIT MODE =====

  const startEdit = () => {
    if (!quote) return;
    setEditData({
      clientName: quote.clientName,
      clientPhone: quote.clientPhone || '',
      jobType: quote.jobType || '',
      notes: quote.notes || '',
      items: quote.items.map(i => ({ ...i })),
    });
    setEditing(true);
  };

  const updateEditItem = (itemId: string, field: Partial<QuoteItem>) => {
    if (!editData) return;
    setEditData({
      ...editData,
      items: editData.items.map(item => {
        if (item.id !== itemId) return item;
        const updated = { ...item, ...field };
        updated.total = calcItemTotal(updated);
        return updated;
      }),
    });
  };

  const addEditItem = () => {
    if (!editData) return;
    setEditData({
      ...editData,
      items: [
        ...editData.items,
        {
          id: crypto.randomUUID(),
          type: 'vidro_comum' as QuoteItemType,
          description: QUOTE_ITEM_LABELS['vidro_comum'],
          quantity: 1,
          unitPrice: 0,
          total: 0,
        },
      ],
    });
  };

  const removeEditItem = (itemId: string) => {
    if (!editData) return;
    setEditData({ ...editData, items: editData.items.filter(i => i.id !== itemId) });
  };

  const saveEdit = async () => {
    if (!editData || !quote || !id) return;
    if (!editData.clientName.trim()) {
      toast.error("Preencha o nome do cliente.");
      return;
    }
    if (editData.items.length === 0) {
      toast.error("Adicione pelo menos um item.");
      return;
    }
    setSaving(true);
    try {
      const items = editData.items.map(i => ({ ...i, total: calcItemTotal(i) }));
      const total = items.reduce((s, i) => s + i.total, 0);
      const updated: Quote = {
        ...quote,
        clientName: editData.clientName.trim(),
        clientPhone: editData.clientPhone.replace(/\D/g, ''),
        jobType: editData.jobType,
        notes: editData.notes.trim() || undefined,
        items,
        total,
      };
      await updateQuote(updated);
      toast.success("Orçamento atualizado!");
      navigate('/app/orcamentos');
    } catch {
      toast.error("Erro ao salvar orçamento.");
    } finally {
      setSaving(false);
    }
  };

  if (!quote) return null;

  const date = new Date(quote.createdAt).toLocaleDateString("pt-BR");
  const co = quote.companyInfo;

  const editTotal = editData
    ? editData.items.reduce((s, i) => s + calcItemTotal(i), 0)
    : 0;

  return (
    <div className="min-h-screen bg-muted">
      <AppHeader title="Orçamento" backTo="/app/orcamentos" />

      <div className="container py-6 max-w-2xl space-y-4">

        {/* ===== KANBAN FLOW ===== */}
        <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Fluxo do Orçamento
            </div>
            {quote.quoteNumber && (
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                #{quote.quoteNumber}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {FLOW_STEPS.map((step, i) => {
              const isDone = !isPerdido && flowIndex > i;
              const isCurrent = !isPerdido && flowIndex === i;
              return (
                <div key={step.status} className="flex items-center gap-1.5 flex-shrink-0">
                  <div className={`flex flex-col items-center gap-1.5 rounded-xl px-3 py-2.5 min-w-[68px] text-center border transition-colors ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : isDone
                        ? 'bg-success/10 text-success border-success/40'
                        : 'bg-muted/50 text-muted-foreground border-border'
                  }`}>
                    {isDone
                      ? <CheckCircle2 className="h-4 w-4 mx-auto" />
                      : isCurrent
                        ? <div className="w-4 h-4 rounded-full bg-current mx-auto" style={{ opacity: 0.9 }} />
                        : <Circle className="h-4 w-4 mx-auto opacity-30" />
                    }
                    <span className="text-[10px] font-bold leading-tight">{step.label}</span>
                  </div>
                  {i < FLOW_STEPS.length - 1 && (
                    <div className={`w-3 h-0.5 flex-shrink-0 rounded ${isDone ? 'bg-success' : 'bg-border'}`} />
                  )}
                </div>
              );
            })}
            <div className="w-3 h-0.5 flex-shrink-0 rounded bg-border" />
            <div className={`flex flex-col items-center gap-1.5 rounded-xl px-3 py-2.5 min-w-[68px] text-center border flex-shrink-0 transition-colors ${
              isPerdido
                ? 'bg-destructive text-white border-destructive shadow-sm'
                : 'bg-muted/50 text-muted-foreground border-border'
            }`}>
              {isPerdido
                ? <XCircle className="h-4 w-4 mx-auto" />
                : <Circle className="h-4 w-4 mx-auto opacity-30" />
              }
              <span className="text-[10px] font-bold leading-tight">Perdido</span>
            </div>
          </div>
        </div>

        {/* ===== ACTION BUTTONS ===== */}
        {!editing && (
          <div className="flex gap-2 flex-wrap">
            {currentStatus === 'orcado' && (
              <Button className="flex-1 gap-2" onClick={handleSendWhatsApp} disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar para Cliente (WhatsApp)
              </Button>
            )}

            {(currentStatus === 'enviado' || currentStatus === 'aguardando') && (
              <>
                <Button className="flex-1 gap-2 bg-success hover:bg-success/90 text-white" onClick={handleApprove}>
                  <CheckCircle2 className="h-4 w-4" /> Aprovar Orçamento
                </Button>
                <Button variant="destructive" className="flex-1 gap-2" onClick={handleLost}>
                  <XCircle className="h-4 w-4" /> Perdido
                </Button>
              </>
            )}

            {currentStatus === 'aprovado' && (
              <div className="flex-1 bg-success/10 text-success rounded-lg px-4 py-3 text-sm font-bold text-center">
                ✅ Orçamento aprovado — Obra criada em Minhas Obras
              </div>
            )}

            {isPerdido && (
              <div className="flex-1 bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm font-bold text-center">
                ❌ Orçamento perdido
              </div>
            )}

            <Button variant="outline" className="gap-2" onClick={startEdit}>
              <Pencil className="h-4 w-4" /> Editar
            </Button>
            <Button variant="outline" size="icon" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* ===== EDIT FORM ===== */}
        {editing && editData && (
          <div className="space-y-4">
            {/* Dados do cliente */}
            <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
              <h3 className="font-bold text-sm text-foreground">Dados do Cliente</h3>
              <div>
                <Label className="text-xs">Nome do Cliente</Label>
                <Input
                  className="mt-1"
                  value={editData.clientName}
                  onChange={e => setEditData({ ...editData, clientName: e.target.value })}
                  placeholder="Ex: Maria da Silva"
                />
              </div>
              <div>
                <Label className="text-xs">Telefone (WhatsApp)</Label>
                <Input
                  className="mt-1"
                  value={maskWhatsApp(editData.clientPhone)}
                  onChange={e => setEditData({ ...editData, clientPhone: maskWhatsApp(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  inputMode="tel"
                />
              </div>
              <div>
                <Label className="text-xs">Tipo da Obra</Label>
                <Select value={editData.jobType} onValueChange={v => setEditData({ ...editData, jobType: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Itens */}
            <div className="space-y-3">
              <Label className="font-bold text-base">Itens do Orçamento</Label>
              <AnimatePresence>
                {editData.items.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    className="bg-card rounded-xl p-4 shadow-card space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">Item {idx + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive h-8 w-8"
                        onClick={() => removeEditItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Tipo */}
                    <Select
                      value={item.type}
                      onValueChange={(v: QuoteItemType) => updateEditItem(item.id, {
                        type: v,
                        description: v !== 'personalizado' ? QUOTE_ITEM_LABELS[v] : item.description,
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(QUOTE_ITEM_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Descrição */}
                    <Input
                      placeholder="Descrição do item..."
                      value={item.description}
                      onChange={e => updateEditItem(item.id, { description: e.target.value })}
                    />

                    {/* Local */}
                    <div>
                      <Label className="text-xs">Local / Ambiente</Label>
                      <Input
                        className="mt-1"
                        value={item.location || ''}
                        onChange={e => updateEditItem(item.id, { location: e.target.value })}
                        placeholder="Ex: Porta da cozinha..."
                      />
                    </div>

                    {/* Dimensões com toggle cm/mm */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Dimensões</span>
                        <div className="flex rounded-md border border-border overflow-hidden text-xs">
                          {(['mm', 'cm'] as const).map(u => (
                            <button key={u} type="button" onClick={() => setEditUnit(u)}
                              className={`px-2.5 py-0.5 font-medium transition-colors ${editUnit === u ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                              {u}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Largura ({editUnit})</Label>
                          <Input
                            className="mt-1"
                            type="number"
                            min={0}
                            step={editUnit === 'cm' ? '0.1' : '1'}
                            value={item.width !== undefined ? (editUnit === 'cm' ? item.width / 10 : item.width) : ''}
                            onChange={e => {
                              const v = parseFloat(e.target.value);
                              updateEditItem(item.id, { width: isNaN(v) ? undefined : (editUnit === 'cm' ? v * 10 : v) });
                            }}
                            inputMode="decimal"
                            placeholder={editUnit === 'cm' ? '120' : '1200'}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Altura ({editUnit})</Label>
                          <Input
                            className="mt-1"
                            type="number"
                            min={0}
                            step={editUnit === 'cm' ? '0.1' : '1'}
                            value={item.height !== undefined ? (editUnit === 'cm' ? item.height / 10 : item.height) : ''}
                            onChange={e => {
                              const v = parseFloat(e.target.value);
                              updateEditItem(item.id, { height: isNaN(v) ? undefined : (editUnit === 'cm' ? v * 10 : v) });
                            }}
                            inputMode="decimal"
                            placeholder={editUnit === 'cm' ? '80' : '800'}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quantidade e Preço */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Quantidade</Label>
                        <Input
                          className="mt-1"
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={e => updateEditItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                          inputMode="numeric"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">
                          {item.width && item.height ? 'Preço / m² (R$)' : 'Valor Unitário (R$)'}
                        </Label>
                        <Input
                          className="mt-1"
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitPrice || ''}
                          onChange={e => updateEditItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                          inputMode="decimal"
                        />
                      </div>
                    </div>

                    {/* Info m² — width/height em mm → / 1_000_000 */}
                    {item.width && item.height && (
                      <div className="rounded-lg bg-primary/5 px-3 py-2 text-xs text-muted-foreground flex justify-between">
                        <span>Metragem</span>
                        <span className="font-medium text-foreground">
                          {(item.width * item.height / 1_000_000 * item.quantity).toFixed(4)} m²
                        </span>
                      </div>
                    )}

                    <div className="text-right text-sm font-bold text-primary">
                      Subtotal: {fmt(calcItemTotal(item))}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              <Button type="button" variant="outline" className="w-full gap-1" onClick={addEditItem}>
                <Plus className="h-4 w-4" /> Adicionar Item
              </Button>
            </div>

            {/* Total resumo */}
            <div className="bg-primary/10 rounded-xl p-4 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Valor Total</span>
              <span className="text-xl font-bold text-primary">{fmt(editTotal)}</span>
            </div>

            {/* Observações */}
            <div>
              <Label>Observações (opcional)</Label>
              <Textarea
                className="mt-1"
                rows={3}
                value={editData.notes}
                onChange={e => setEditData({ ...editData, notes: e.target.value })}
                placeholder="Condições de pagamento, prazo de entrega..."
              />
            </div>

            {/* Botões salvar/cancelar */}
            <div className="flex gap-2">
              <Button className="flex-1 gap-2" onClick={saveEdit} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar Orçamento
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* ===== DOCUMENT VIEW ===== */}
        {!editing && (
          <div ref={printRef} className="bg-white text-[hsl(215,25%,15%)] rounded-sm shadow-elevated" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

            {co.name && (
              <div className="bg-[hsl(215,25%,15%)] text-white px-6 py-5 text-center">
                <h1 className="text-2xl font-extrabold tracking-widest uppercase">{co.name}</h1>
              </div>
            )}

            <div className="px-6 py-2">
              {(co.address || co.cnpjCpf || co.phone) && (
                <div className="text-center text-xs text-[hsl(215,10%,45%)] border-b border-[hsl(214,20%,88%)] pb-3 mb-4">
                  {co.address && <p>{co.address}</p>}
                  <p>
                    {co.cnpjCpf && <span>CNPJ/CPF: {co.cnpjCpf}</span>}
                    {co.cnpjCpf && co.phone && <span> &nbsp;|&nbsp; </span>}
                    {co.phone && <span>Fone: {co.phone}</span>}
                  </p>
                  {co.email && <p>{co.email}</p>}
                </div>
              )}

              <div className="border border-[hsl(214,20%,88%)] rounded-sm mb-4">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-[hsl(214,20%,88%)]">
                      <td className="px-3 py-2 font-bold text-[hsl(215,10%,45%)] w-24">Cliente:</td>
                      <td className="px-3 py-2 font-bold">{quote.clientName}</td>
                      <td className="px-3 py-2 font-bold text-[hsl(215,10%,45%)] w-20 text-right">Data:</td>
                      <td className="px-3 py-2 text-right w-28">{date}</td>
                    </tr>
                    {quote.clientPhone && (
                      <tr className="border-b border-[hsl(214,20%,88%)]">
                        <td className="px-3 py-2 font-bold text-[hsl(215,10%,45%)]">Telefone:</td>
                        <td className="px-3 py-2" colSpan={3}>{maskWhatsApp(quote.clientPhone)}</td>
                      </tr>
                    )}
                    {quote.jobType && (
                      <tr>
                        <td className="px-3 py-2 font-bold text-[hsl(215,10%,45%)]">Tipo:</td>
                        <td className="px-3 py-2" colSpan={3}>{quote.jobType}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="text-center mb-4">
                <h2 className="text-xl font-extrabold tracking-wide uppercase">ORÇAMENTO</h2>
              </div>

              <div className="border border-[hsl(214,20%,88%)] rounded-sm mb-4 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[hsl(210,15%,93%)] text-[hsl(215,10%,45%)] font-bold text-xs uppercase">
                      <th className="text-left px-3 py-2 w-10">#</th>
                      <th className="text-left px-3 py-2">Descrição</th>
                      <th className="text-center px-3 py-2 w-16">Qtd.</th>
                      <th className="text-right px-3 py-2 w-24">Unit.</th>
                      <th className="text-right px-3 py-2 w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.items.map((item, i) => (
                      <tr key={item.id} className="border-t border-[hsl(214,20%,88%)]">
                        <td className="px-3 py-2 text-[hsl(215,10%,45%)] font-bold">{i + 1}</td>
                        <td className="px-3 py-2">
                          <div className="font-bold">{item.description}</div>
                          {(item.width || item.height) && (
                            <div className="text-xs text-[hsl(215,10%,45%)]">
                              {item.width ? `${item.width}mm` : '—'} × {item.height ? `${item.height}mm` : '—'}
                              {item.width && item.height && (
                                <span className="ml-1">({(item.width * item.height / 1_000_000).toFixed(4)}m²)</span>
                              )}
                            </div>
                          )}
                          {item.location && (
                            <div className="text-xs text-[hsl(215,80%,45%)]">📍 {item.location}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-[hsl(215,10%,45%)]">{fmt(item.unitPrice)}</td>
                        <td className="px-3 py-2 text-right font-bold">{fmt(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border border-[hsl(214,20%,88%)] rounded-sm mb-6 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="bg-[hsl(215,25%,15%)] text-white">
                      <td className="px-3 py-3 font-extrabold uppercase tracking-wide">VALOR TOTAL:</td>
                      <td className="px-3 py-3 text-right font-extrabold text-lg">{fmt(quote.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mb-8 text-sm text-[hsl(215,10%,45%)] space-y-1">
                <p className="font-bold">- PROPOSTA VÁLIDA POR 7 (SETE) DIAS ÚTEIS;</p>
                <p className="font-bold">- CONDIÇÕES DE PAGAMENTO A COMBINAR;</p>
                {quote.notes && (
                  <div className="mt-3 whitespace-pre-wrap text-[hsl(215,25%,15%)]">
                    <span className="font-bold">Obs: </span>{quote.notes}
                  </div>
                )}
              </div>

              <div className="flex justify-between px-4 pb-8 pt-8">
                <div className="text-center">
                  <div className="border-t border-[hsl(215,25%,15%)] w-48 mx-auto mb-1" />
                  <span className="text-sm font-bold text-[hsl(215,10%,45%)]">Cliente</span>
                </div>
                <div className="text-center">
                  <div className="border-t border-[hsl(215,25%,15%)] w-48 mx-auto mb-1" />
                  <span className="text-sm font-bold text-[hsl(215,10%,45%)]">Consultor(a) de vendas</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteDetail;
