import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, X, Search } from "lucide-react";
import { maskWhatsApp, isValidWhatsApp } from "@/lib/whatsappMask";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppHeader from "@/components/app/AppHeader";
import { addQuote, getCompanyInfo, saveCompanyInfo, getProducts } from "@/lib/storage";
import { QuoteItem, QuoteItemType, QUOTE_ITEM_LABELS, CompanyInfo, Product } from "@/lib/types";
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

// Componente de busca de produto para autocompletar
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

  // Fecha ao clicar fora
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

// Extende QuoteItem com unidade do catálogo (não salva no banco)
type ItemLocal = QuoteItem & { _catalogUnit?: string };

const calcItemTotal = (item: ItemLocal): number => {
  if (item._catalogUnit === 'm²' && item.width && item.height) {
    const area = (item.width * item.height / 1_000_000) * item.quantity;
    return area * item.unitPrice;
  }
  return item.quantity * item.unitPrice;
};

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
  const [nfRequired, setNfRequired] = useState(false);
  const [nfPercent, setNfPercent] = useState<number>(0);
  const [showCompany, setShowCompany] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);

  // Load company info e catálogo
  useEffect(() => {
    getCompanyInfo().then(setCompany);
    getProducts().then(setCatalogProducts);
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
    });
    toast.success("Orçamento criado!");
    navigate(`/app/orcamento/${quote.id}`);
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
              <Label className="text-xs">Comissão (%)</Label>
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
                    : "nenhuma comissão"}
                </span>
              </div>
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
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="bg-card rounded-xl p-4 shadow-card mb-3 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">Item {idx + 1}</span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-destructive h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {catalogProducts.length > 0 && (
                    <ProductSearch
                      products={catalogProducts}
                      onSelect={p => applyProduct(item.id, p)}
                    />
                  )}

                  {/* Tipo — só exibe se não vier do catálogo */}
                  {!item._catalogUnit && (
                    <Select value={item.type} onValueChange={(v: QuoteItemType) => updateItem(item.id, { type: v })}>
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

                  {/* Descrição: editável quando personalizado ou produto do catálogo */}
                  {(item.type === "personalizado" || item._catalogUnit) && (
                    <Input
                      placeholder="Descreva o item..."
                      value={item.description}
                      onChange={e => updateItem(item.id, { description: e.target.value })}
                    />
                  )}

                  <div>
                    <Label className="text-xs">Local / Ambiente</Label>
                    <Input
                      className="mt-1"
                      value={item.location || ""}
                      onChange={e => updateItem(item.id, { location: e.target.value })}
                      placeholder="Ex: Porta da cozinha, Janela da lavanderia..."
                    />
                  </div>

                  {/* Campos de dimensão: m² do catálogo OU item livre */}
                  {(item._catalogUnit === 'm²' || !item._catalogUnit) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Largura (mm)</Label>
                        <Input
                          className="mt-1"
                          type="number"
                          min={0}
                          step="1"
                          value={item.width || ""}
                          onChange={e => updateItem(item.id, { width: parseFloat(e.target.value) || undefined })}
                          inputMode="numeric"
                          placeholder="1200"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Altura (mm)</Label>
                        <Input
                          className="mt-1"
                          type="number"
                          min={0}
                          step="1"
                          value={item.height || ""}
                          onChange={e => updateItem(item.id, { height: parseFloat(e.target.value) || undefined })}
                          inputMode="numeric"
                          placeholder="800"
                        />
                      </div>
                    </div>
                  )}

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
                        onChange={e => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                        inputMode="numeric"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">
                        {item._catalogUnit ? `Preço / ${item._catalogUnit} (R$)` : 'Valor Unitário (R$)'}
                      </Label>
                      <Input
                        className="mt-1"
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.unitPrice || ""}
                        onChange={e => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                        inputMode="decimal"
                      />
                    </div>
                  </div>

                  {/* Preview de cálculo em tempo real */}
                  {item._catalogUnit === 'm²' && item.width && item.height ? (
                    <div className="rounded-lg bg-primary/5 px-3 py-2 space-y-0.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Área</span>
                        <span className="font-medium text-foreground">
                          {(item.width * item.height / 1_000_000 * item.quantity).toFixed(4)} m²
                          {item.quantity > 1 && (
                            <span className="text-muted-foreground font-normal">
                              {' '}({item.quantity} × {(item.width * item.height / 1_000_000).toFixed(4)} m²)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Cálculo</span>
                        <span>
                          {(item.width * item.height / 1_000_000 * item.quantity).toFixed(4)} m² × {fmt(item.unitPrice)}/m²
                        </span>
                      </div>
                    </div>
                  ) : (item.width && item.height && !item._catalogUnit) ? (
                    <div className="text-xs text-muted-foreground">
                      Área: {(item.width * item.height / 1_000_000 * item.quantity).toFixed(4)} m²
                    </div>
                  ) : null}

                  <div className="text-right text-sm font-bold text-primary">
                    Subtotal: {fmt(item.total)}
                  </div>
                </motion.div>
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
              {(commission > 0 || (nfRequired && nfPercent > 0)) && (
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
