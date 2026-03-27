import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { maskWhatsApp, isValidWhatsApp } from "@/lib/whatsappMask";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppHeader from "@/components/app/AppHeader";
import { ItemLocal, calcItemTotal, QuoteItemCard } from "@/components/app/QuoteItemCard";
import { addQuote, getCompanyInfo, saveCompanyInfo, getProducts, getProfile, getRTs } from "@/lib/storage";
import { QuoteItemType, QUOTE_ITEM_LABELS, CompanyInfo, Product, RT } from "@/lib/types";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const JOB_TYPES = [
  "Residencial",
  "Comercial",
  "Industrial",
  "Reforma",
  "Obra Nova",
  "Outro",
];


const NewQuote = () => {
  const navigate = useNavigate();
  const [company, setCompany] = useState<CompanyInfo>({ name: '', cnpjCpf: '', phone: '', email: '', address: '' });
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [jobType, setJobType] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemLocal[]>([
    {
      id: crypto.randomUUID(),
      type: "vidro_comum",
      description: QUOTE_ITEM_LABELS["vidro_comum"],
      quantity: 1,
      unitPrice: 0,
      total: 0,
    },
  ]);
  const [commission, setCommission] = useState<number>(0);
  const [rtName, setRtName] = useState('');
  const [nfRequired, setNfRequired] = useState(false);
  const [nfPercent, setNfPercent] = useState<number>(0);
  const [showCompany, setShowCompany] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [defaultUnit, setDefaultUnit] = useState<'cm' | 'mm'>('mm');
  const [rts, setRts] = useState<RT[]>([]);
  const [rtQuery, setRtQuery] = useState('');
  const [showRtSuggestions, setShowRtSuggestions] = useState(false);

  // Load company info, catálogo, perfil e RTs
  useEffect(() => {
    getCompanyInfo().then(setCompany);
    getProducts().then(setCatalogProducts);
    getProfile().then(p => {
      if (p?.defaultUnit) setDefaultUnit(p.defaultUnit);
    });
    getRTs().then(list => setRts(list.filter(r => r.active)));
  }, []);

  const addItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "vidro_comum",
        description: QUOTE_ITEM_LABELS["vidro_comum"],
        quantity: 1,
        unitPrice: 0,
        total: 0,
        _unit: defaultUnit,
      },
    ]);
  };

  const updateItem = (id: string, field: Partial<ItemLocal>) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const updated: ItemLocal = { ...item, ...field };
        if (field.type && field.type !== "personalizado") {
          updated.description = QUOTE_ITEM_LABELS[field.type];
        }
        updated.total = calcItemTotal(updated);
        return updated;
      })
    );
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const applyProduct = (itemId: string, product: Product) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== itemId) return item;
        const updated: ItemLocal = {
          ...item,
          _catalogUnit: product.unit,
          type: "personalizado" as QuoteItemType,
          description: product.name,
          unitPrice: product.unitPrice,
          ...(product.unit !== 'm²' ? { width: undefined, height: undefined } : {}),
        };
        updated.total = calcItemTotal(updated);
        return updated;
      })
    );
  };

  const total = items.reduce((s, i) => s + i.total, 0);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      toast.error("Preencha o nome do cliente.");
      return;
    }
    if (!isValidWhatsApp(clientPhone)) {
      toast.error("Preencha o telefone do cliente para poder enviar pelo WhatsApp.");
      return;
    }
    if (items.length === 0) {
      toast.error("Adicione pelo menos um item.");
      return;
    }
    await saveCompanyInfo(company);
    const quote = await addQuote({
      clientName: clientName.trim(),
      clientPhone: clientPhone.replace(/\D/g, ''),
      jobType,
      items,
      total,
      companyInfo: company,
      notes: notes.trim() || undefined,
      commission: commission > 0 ? commission : undefined,
      nfPercent: nfRequired && nfPercent > 0 ? nfPercent : undefined,
      rtName: rtName.trim() || undefined,
    });
    toast.success("Orçamento criado!");
    navigate(`/app/orcamentos?novo=${quote.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Novo Orçamento" backTo="/app/orcamentos" />
      <div className="container py-6 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowCompany(!showCompany)}
              className="text-sm font-medium text-primary underline"
            >
              {showCompany ? "Ocultar dados da empresa" : "Dados da empresa (cabeçalho)"}
            </button>
            {showCompany && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="mt-3 space-y-3 bg-card rounded-xl p-4 shadow-card"
              >
                <div>
                  <Label>Nome da Empresa</Label>
                  <Input className="mt-1" value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} placeholder="Vidraçaria Silva" />
                </div>
                <div>
                  <Label>CNPJ / CPF</Label>
                  <Input className="mt-1" value={company.cnpjCpf} onChange={e => setCompany({ ...company, cnpjCpf: e.target.value })} placeholder="00.000.000/0001-00" />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input className="mt-1" value={company.phone} onChange={e => setCompany({ ...company, phone: e.target.value })} placeholder="(11) 99999-9999" />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input className="mt-1" value={company.email} onChange={e => setCompany({ ...company, email: e.target.value })} placeholder="contato@vidracaria.com" />
                </div>
                <div>
                  <Label>Endereço</Label>
                  <Input className="mt-1" value={company.address} onChange={e => setCompany({ ...company, address: e.target.value })} placeholder="Rua..." />
                </div>
              </motion.div>
            )}
          </div>

          {/* Client & job type */}
          <div>
            <Label>Nome do Cliente</Label>
            <Input className="mt-1" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ex: Maria da Silva" />
          </div>
          <div>
            <Label>Telefone do Cliente (WhatsApp)</Label>
            <Input
              className="mt-1"
              value={clientPhone}
              onChange={e => setClientPhone(maskWhatsApp(e.target.value))}
              placeholder="(00) 00000-0000"
              inputMode="tel"
            />
            {clientPhone && !isValidWhatsApp(clientPhone) && (
              <p className="text-xs text-destructive mt-1">Número incompleto</p>
            )}
          </div>
          <div>
            <Label>Tipo da Obra</Label>
            <Select value={jobType} onValueChange={setJobType}>
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

          {/* Comissão & NF */}
          <div className="bg-card rounded-xl p-4 shadow-card space-y-4">
            <Label className="text-base font-bold">Custos do Contrato</Label>

            <div>
              <Label className="text-xs">RT (Responsável Técnico) (%)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={commission || ""}
                  onChange={e => setCommission(parseFloat(e.target.value) || 0)}
                  inputMode="decimal"
                  placeholder="0"
                  className="w-28"
                />
                <span className="text-sm text-muted-foreground">
                  {commission > 0 && total > 0
                    ? `= ${(total * commission / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
                    : "sem RT"}
                </span>
              </div>
              <div className="relative mt-2">
                <Input
                  placeholder="Ex: Escritório Silva Arquitetura"
                  value={rtName}
                  onChange={e => {
                    setRtName(e.target.value);
                    setRtQuery(e.target.value);
                    setShowRtSuggestions(true);
                  }}
                  onFocus={() => setShowRtSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowRtSuggestions(false), 150)}
                  autoComplete="off"
                />
                {showRtSuggestions && rtQuery.trim() && (() => {
                  const filtered = rts.filter(r =>
                    r.name.toLowerCase().includes(rtQuery.toLowerCase())
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
                            setRtName(r.name);
                            setRtQuery(r.name);
                            if (r.defaultPercentage > 0) setCommission(r.defaultPercentage);
                            setShowRtSuggestions(false);
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
              <p className="text-xs text-muted-foreground mt-1">Nome do RT / Escritório (opcional — busca dos RTs cadastrados)</p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <Label className="text-xs">NF necessária?</Label>
                <button
                  type="button"
                  onClick={() => setNfRequired(!nfRequired)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${nfRequired ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${nfRequired ? 'translate-x-4' : 'translate-x-1'}`} />
                </button>
                <span className="text-xs text-muted-foreground">{nfRequired ? "Sim" : "Não"}</span>
              </div>
              {nfRequired && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    value={nfPercent || ""}
                    onChange={e => setNfPercent(parseFloat(e.target.value) || 0)}
                    inputMode="decimal"
                    placeholder="0"
                    className="w-28"
                  />
                  <span className="text-xs text-muted-foreground">% NF</span>
                  {nfPercent > 0 && total > 0 && (
                    <span className="text-sm text-muted-foreground">
                      = {(total * nfPercent / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-bold">Itens do Orçamento</Label>
            </div>

            <AnimatePresence>
              {items.map((item, idx) => (
                <QuoteItemCard
                  key={item.id}
                  item={item}
                  index={idx}
                  defaultUnit={defaultUnit}
                  catalogProducts={catalogProducts}
                  onUpdate={updateItem}
                  onRemove={removeItem}
                  onApplyProduct={applyProduct}
                />
              ))}
            </AnimatePresence>

            <Button type="button" variant="outline" className="w-full gap-1" onClick={addItem}>
              <Plus className="h-4 w-4" /> Adicionar Item
            </Button>
          </div>

          {/* Summary footer */}
          {items.length > 0 && (
            <div className="bg-primary/10 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Total de m²</span>
                <span className="font-bold text-foreground">
                  {items.reduce((s, i) => s + ((i.width || 0) * (i.height || 0) / 1_000_000 * i.quantity), 0).toFixed(4)} m²
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Valor Total</span>
                <span className="text-xl font-bold text-primary">{fmt(total)}</span>
              </div>
              {(commission > 0 || (nfRequired && nfPercent > 0)) && total > 0 && (
                <div className="border-t border-primary/20 pt-2 space-y-1">
                  {commission > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Comissão ({commission}%)</span>
                      <span className="font-semibold text-destructive">− {fmt(total * commission / 100)}</span>
                    </div>
                  )}
                  {nfRequired && nfPercent > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Nota Fiscal ({nfPercent}%)</span>
                      <span className="font-semibold text-destructive">− {fmt(total * nfPercent / 100)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold border-t border-primary/20 pt-1">
                    <span className="text-muted-foreground">Lucro estimado</span>
                    <span className="text-success">
                      {fmt(total - (total * commission / 100) - (nfRequired ? total * nfPercent / 100 : 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <Label>Observações (opcional)</Label>
            <Textarea className="mt-1" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Condições de pagamento, prazo de entrega..." />
          </div>

          <Button type="submit" className="w-full" size="lg">Criar Orçamento</Button>
        </form>
      </div>
    </div>
  );
};

export default NewQuote;
