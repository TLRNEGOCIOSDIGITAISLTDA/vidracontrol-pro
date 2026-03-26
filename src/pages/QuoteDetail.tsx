import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Trash2, Send, CheckCircle2, XCircle, Loader2, Circle, Pencil, Plus, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppHeader from "@/components/app/AppHeader";
import { getQuote, getProfile, getProducts, getRTs } from "@/lib/storage";
import { useData } from "@/lib/DataContext";
import { Quote, QuoteItem, QuoteItemType, QuoteStatus, QUOTE_ITEM_LABELS, Product, RT } from "@/lib/types";
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
  if (status === 'aguardando') return 1;
  return FLOW_STEPS.findIndex(s => s.status === status);
}

// width e height são SEMPRE em mm no banco → divisor 1_000_000 para converter em m²
function calcItemTotal(item: QuoteItem): number {
  if (item.width && item.height) {
    return (item.width * item.height / 1_000_000) * item.quantity * item.unitPrice;
  }
  return item.quantity * item.unitPrice;
}

// Extende QuoteItem com unidade do catálogo e unidade de exibição (não salva no banco)
type ItemLocal = QuoteItem & { _catalogUnit?: string; _unit?: 'cm' | 'mm' };

// Busca de produto no catálogo (idêntico ao NewQuote)
const ProductSearch = ({
  products,
  onSelect,
}: {
  products: Product[];
  onSelect: (p: Product) => void;
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (p: Product) => {
    onSelect(p);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-8 text-sm h-9"
          placeholder="Buscar produto do catálogo..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            onClick={() => { setQuery(""); setOpen(false); }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {filtered.map(p => (
            <button
              key={p.id}
              type="button"
              className="w-full text-left px-3 py-2.5 hover:bg-muted flex items-center justify-between gap-2"
              onMouseDown={() => select(p)}
            >
              <span className="text-sm font-medium truncate">{p.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {p.unitPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} / {p.unit}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface EditData {
  clientName: string;
  clientPhone: string;
  jobType: string;
  notes: string;
}

const QuoteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { changeQuoteStatus, removeQuote, updateQuote } = useData();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // ── Dados de edição ──────────────────────────────────────────
  const [editData, setEditData] = useState<EditData | null>(null);
  const [editItems, setEditItems] = useState<ItemLocal[]>([]);
  const [editUnit, setEditUnit] = useState<'cm' | 'mm'>('mm');
  const [editCommission, setEditCommission] = useState<number>(0);
  const [editNfRequired, setEditNfRequired] = useState(false);
  const [editNfPercent, setEditNfPercent] = useState<number>(0);
  const [editRtName, setEditRtName] = useState('');
  const [editRtQuery, setEditRtQuery] = useState('');
  const [showEditRtSuggestions, setShowEditRtSuggestions] = useState(false);
  const [rts, setRts] = useState<RT[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);

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
    getProducts().then(setCatalogProducts);
    getRTs().then(list => setRts(list.filter(r => r.active)));
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

  // ═══════════════════════════════════════════════════════════
  // EDIT MODE — idêntico ao formulário de criação (NewQuote)
  // ═══════════════════════════════════════════════════════════

  const startEdit = () => {
    if (!quote) return;
    setEditData({
      clientName: quote.clientName,
      clientPhone: quote.clientPhone || '',
      jobType: quote.jobType || '',
      notes: quote.notes || '',
    });
    // Converte QuoteItem[] → ItemLocal[] preservando todos os campos
    setEditItems(quote.items.map(i => ({ ...i, _unit: editUnit })));
    setEditCommission(quote.commission ?? 0);
    setEditNfRequired(!!(quote.nfPercent && quote.nfPercent > 0));
    setEditNfPercent(quote.nfPercent ?? 0);
    setEditRtName(quote.rtName ?? '');
    setEditRtQuery(quote.rtName ?? '');
    setEditing(true);
  };

  const updateEditItem = (itemId: string, field: Partial<ItemLocal>) => {
    setEditItems(prev =>
      prev.map(item => {
        if (item.id !== itemId) return item;
        const updated: ItemLocal = { ...item, ...field };
        if (field.type && field.type !== 'personalizado') {
          updated.description = QUOTE_ITEM_LABELS[field.type];
        }
        updated.total = calcItemTotal(updated);
        return updated;
      })
    );
  };

  const applyEditProduct = (itemId: string, product: Product) => {
    setEditItems(prev =>
      prev.map(item => {
        if (item.id !== itemId) return item;
        const updated: ItemLocal = {
          ...item,
          _catalogUnit: product.unit,
          type: 'personalizado' as QuoteItemType,
          description: product.name,
          unitPrice: product.unitPrice,
          ...(product.unit !== 'm²' ? { width: undefined, height: undefined } : {}),
        };
        updated.total = calcItemTotal(updated);
        return updated;
      })
    );
  };

  const addEditItem = () => {
    setEditItems(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: 'vidro_comum' as QuoteItemType,
        description: QUOTE_ITEM_LABELS['vidro_comum'],
        quantity: 1,
        unitPrice: 0,
        total: 0,
        _unit: editUnit,
      },
    ]);
  };

  const removeEditItem = (itemId: string) => {
    setEditItems(prev => prev.filter(i => i.id !== itemId));
  };

  const editTotal = editItems.reduce((s, i) => s + i.total, 0);

  const saveEdit = async () => {
    if (!editData || !quote || !id) return;
    if (!editData.clientName.trim()) {
      toast.error("Preencha o nome do cliente.");
      return;
    }
    if (editItems.length === 0) {
      toast.error("Adicione pelo menos um item.");
      return;
    }
    setSaving(true);
    try {
      // Recalcula totais com a fórmula correta antes de salvar
      const items = editItems.map(i => ({ ...i, total: calcItemTotal(i) }));
      const total = items.reduce((s, i) => s + i.total, 0);
      const updated: Quote = {
        ...quote,
        clientName: editData.clientName.trim(),
        clientPhone: editData.clientPhone.replace(/\D/g, ''),
        jobType: editData.jobType,
        notes: editData.notes.trim() || undefined,
        items,
        total,
        commission: editCommission > 0 ? editCommission : undefined,
        nfPercent: editNfRequired && editNfPercent > 0 ? editNfPercent : undefined,
        rtName: editRtName.trim() || undefined,
      };
      await updateQuote(updated);
      setQuote(updated);
      toast.success("Orçamento atualizado!");
      setEditing(false);
    } catch {
      toast.error("Erro ao salvar orçamento.");
    } finally {
      setSaving(false);
    }
  };

  if (!quote) return null;

  const date = new Date(quote.createdAt).toLocaleDateString("pt-BR");
  const co = quote.companyInfo;

  return (
    <div className="min-h-screen bg-muted">
      <AppHeader title="Orçamento" backTo="/app/orcamentos" />

      <div className="container py-6 max-w-2xl space-y-4">

        {/* ═══════════════ KANBAN FLOW ═══════════════ */}
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

        {/* ═══════════════ ACTION BUTTONS ═══════════════ */}
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

        {/* ═══════════════ EDIT FORM (idêntico ao NewQuote) ═══════════════ */}
        {editing && editData && (
          <div className="space-y-6">

            {/* Dados do cliente */}
            <div>
              <Label>Nome do Cliente</Label>
              <Input className="mt-1" value={editData.clientName}
                onChange={e => setEditData({ ...editData, clientName: e.target.value })}
                placeholder="Ex: Maria da Silva" />
            </div>
            <div>
              <Label>Telefone do Cliente (WhatsApp)</Label>
              <Input className="mt-1" value={maskWhatsApp(editData.clientPhone)}
                onChange={e => setEditData({ ...editData, clientPhone: maskWhatsApp(e.target.value) })}
                placeholder="(00) 00000-0000" inputMode="tel" />
            </div>
            <div>
              <Label>Tipo da Obra</Label>
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

            {/* Custos do Contrato (RT + NF) */}
            <div className="bg-card rounded-xl p-4 shadow-card space-y-4">
              <Label className="text-base font-bold">Custos do Contrato</Label>

              <div>
                <Label className="text-xs">RT (Responsável Técnico) (%)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number" min={0} max={100} step="0.5"
                    value={editCommission || ""}
                    onChange={e => setEditCommission(parseFloat(e.target.value) || 0)}
                    inputMode="decimal" placeholder="0" className="w-28"
                  />
                  <span className="text-sm text-muted-foreground">
                    {editCommission > 0 && editTotal > 0
                      ? `= ${(editTotal * editCommission / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
                      : "sem RT"}
                  </span>
                </div>
                <div className="relative mt-2">
                  <Input
                    placeholder="Ex: Escritório Silva Arquitetura"
                    value={editRtName}
                    onChange={e => {
                      setEditRtName(e.target.value);
                      setEditRtQuery(e.target.value);
                      setShowEditRtSuggestions(true);
                    }}
                    onFocus={() => setShowEditRtSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowEditRtSuggestions(false), 150)}
                    autoComplete="off"
                  />
                  {showEditRtSuggestions && editRtQuery.trim() && (() => {
                    const filtered = rts.filter(r =>
                      r.name.toLowerCase().includes(editRtQuery.toLowerCase())
                    );
                    if (!filtered.length) return null;
                    return (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-elevated py-1 max-h-48 overflow-y-auto">
                        {filtered.map(r => (
                          <button
                            key={r.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                            onMouseDown={() => {
                              setEditRtName(r.name);
                              setEditRtQuery(r.name);
                              if (r.defaultPercentage > 0) setEditCommission(r.defaultPercentage);
                              setShowEditRtSuggestions(false);
                            }}
                          >
                            <span className="font-medium">{r.name}</span>
                            {r.defaultPercentage > 0 && (
                              <span className="text-xs text-muted-foreground ml-2">{r.defaultPercentage}% RT</span>
                            )}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Nome do RT / Escritório (opcional)</p>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Label className="text-xs">NF necessária?</Label>
                  <button
                    type="button"
                    onClick={() => setEditNfRequired(!editNfRequired)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${editNfRequired ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${editNfRequired ? 'translate-x-4' : 'translate-x-1'}`} />
                  </button>
                  <span className="text-xs text-muted-foreground">{editNfRequired ? "Sim" : "Não"}</span>
                </div>
                {editNfRequired && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number" min={0} max={100} step="0.5"
                      value={editNfPercent || ""}
                      onChange={e => setEditNfPercent(parseFloat(e.target.value) || 0)}
                      inputMode="decimal" placeholder="0" className="w-28"
                    />
                    <span className="text-xs text-muted-foreground">% NF</span>
                    {editNfPercent > 0 && editTotal > 0 && (
                      <span className="text-sm text-muted-foreground">
                        = {(editTotal * editNfPercent / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Itens */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-bold">Itens do Orçamento</Label>
              </div>

              <AnimatePresence>
                {editItems.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="bg-card rounded-xl p-4 shadow-card mb-3 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">Item {idx + 1}</span>
                      <Button type="button" variant="ghost" size="icon"
                        onClick={() => removeEditItem(item.id)}
                        className="text-destructive h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Busca no catálogo */}
                    {catalogProducts.length > 0 && (
                      <ProductSearch
                        products={catalogProducts}
                        onSelect={p => applyEditProduct(item.id, p)}
                      />
                    )}

                    {/* Tipo — só exibe se não vier do catálogo */}
                    {!item._catalogUnit && (
                      <Select
                        value={item.type}
                        onValueChange={(v: QuoteItemType) => updateEditItem(item.id, { type: v })}
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
                    )}

                    {/* Descrição: editável apenas para personalizado ou catálogo */}
                    {(item.type === 'personalizado' || item._catalogUnit) && (
                      <Input
                        placeholder="Descreva o item..."
                        value={item.description}
                        onChange={e => updateEditItem(item.id, { description: e.target.value })}
                      />
                    )}

                    {/* Local / Ambiente */}
                    <div>
                      <Label className="text-xs">Local / Ambiente</Label>
                      <Input
                        className="mt-1"
                        value={item.location || ''}
                        onChange={e => updateEditItem(item.id, { location: e.target.value })}
                        placeholder="Ex: Porta da cozinha, Janela da lavanderia..."
                      />
                    </div>

                    {/* Dimensões com toggle cm/mm */}
                    {(item._catalogUnit === 'm²' || !item._catalogUnit) && (() => {
                      const unit = item._unit ?? editUnit;
                      const toDisplay = (mm: number | undefined) =>
                        mm !== undefined ? (unit === 'cm' ? mm / 10 : mm) : undefined;
                      const toMm = (v: number) => unit === 'cm' ? v * 10 : v;
                      return (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">Dimensões</span>
                            <div className="flex rounded-md border border-border overflow-hidden text-xs">
                              {(['mm', 'cm'] as const).map(u => (
                                <button
                                  key={u}
                                  type="button"
                                  onClick={() => updateEditItem(item.id, { _unit: u })}
                                  className={`px-2.5 py-0.5 font-medium transition-colors ${
                                    unit === u
                                      ? 'bg-primary text-primary-foreground'
                                      : 'text-muted-foreground hover:bg-muted'
                                  }`}
                                >
                                  {u}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Largura ({unit})</Label>
                              <Input
                                className="mt-1"
                                type="number"
                                min={0}
                                step={unit === 'cm' ? "0.1" : "1"}
                                value={toDisplay(item.width) ?? ""}
                                onChange={e => {
                                  const v = parseFloat(e.target.value);
                                  updateEditItem(item.id, { width: isNaN(v) ? undefined : toMm(v) });
                                }}
                                inputMode="decimal"
                                placeholder={unit === 'cm' ? "120" : "1200"}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Altura ({unit})</Label>
                              <Input
                                className="mt-1"
                                type="number"
                                min={0}
                                step={unit === 'cm' ? "0.1" : "1"}
                                value={toDisplay(item.height) ?? ""}
                                onChange={e => {
                                  const v = parseFloat(e.target.value);
                                  updateEditItem(item.id, { height: isNaN(v) ? undefined : toMm(v) });
                                }}
                                inputMode="decimal"
                                placeholder={unit === 'cm' ? "80" : "800"}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Quantidade e Preço */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">
                          {item._catalogUnit === 'm²' ? 'Peças' : 'Quantidade'}
                        </Label>
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
                          {(item.width && item.height) ? 'Preço / m² (R$)' : item._catalogUnit ? `Preço / ${item._catalogUnit} (R$)` : 'Valor Unitário (R$)'}
                        </Label>
                        <Input
                          className="mt-1"
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitPrice || ""}
                          onChange={e => updateEditItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                          inputMode="decimal"
                        />
                      </div>
                    </div>

                    {/* Metragem — aparece quando largura e altura estão preenchidas */}
                    {item.width && item.height ? (() => {
                      const areaPorPeca = item.width * item.height / 1_000_000;
                      const areaTotal = areaPorPeca * item.quantity;
                      return (
                        <div className="rounded-lg bg-primary/5 px-3 py-2 space-y-0.5">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Metragem</span>
                            <span className="font-medium text-foreground">
                              {areaTotal.toFixed(4)} m²
                              {item.quantity > 1 && (
                                <span className="text-muted-foreground font-normal">
                                  {' '}({item.quantity} × {areaPorPeca.toFixed(4)} m²)
                                </span>
                              )}
                            </span>
                          </div>
                          {item._catalogUnit === 'm²' && (
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Cálculo</span>
                              <span>{areaTotal.toFixed(4)} m² × {fmt(item.unitPrice)}/m²</span>
                            </div>
                          )}
                          {item._catalogUnit !== 'm²' && item.unitPrice > 0 && (
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Valor/m²</span>
                              <span className="font-medium text-foreground">
                                {fmt(item.unitPrice / areaPorPeca)}/m²
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })() : null}

                    <div className="text-right text-sm font-bold text-primary">
                      Subtotal: {fmt(item.total)}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              <Button type="button" variant="outline" className="w-full gap-1" onClick={addEditItem}>
                <Plus className="h-4 w-4" /> Adicionar Item
              </Button>
            </div>

            {/* Resumo total */}
            {editItems.length > 0 && (
              <div className="bg-primary/10 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Total de m²</span>
                  <span className="font-bold text-foreground">
                    {editItems.reduce((s, i) => s + ((i.width || 0) * (i.height || 0) / 1_000_000 * i.quantity), 0).toFixed(4)} m²
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Valor Total</span>
                  <span className="text-xl font-bold text-primary">{fmt(editTotal)}</span>
                </div>
                {(editCommission > 0 || (editNfRequired && editNfPercent > 0)) && editTotal > 0 && (
                  <div className="border-t border-primary/20 pt-2 space-y-1">
                    {editCommission > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Comissão ({editCommission}%)</span>
                        <span className="font-semibold text-destructive">− {fmt(editTotal * editCommission / 100)}</span>
                      </div>
                    )}
                    {editNfRequired && editNfPercent > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Nota Fiscal ({editNfPercent}%)</span>
                        <span className="font-semibold text-destructive">− {fmt(editTotal * editNfPercent / 100)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold border-t border-primary/20 pt-1">
                      <span className="text-muted-foreground">Lucro estimado</span>
                      <span className="text-success">
                        {fmt(editTotal - (editTotal * editCommission / 100) - (editNfRequired ? editTotal * editNfPercent / 100 : 0))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

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

        {/* ═══════════════ DOCUMENT VIEW ═══════════════ */}
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
