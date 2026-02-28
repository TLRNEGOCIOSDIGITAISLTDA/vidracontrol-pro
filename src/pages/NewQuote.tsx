import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppHeader from "@/components/app/AppHeader";
import { addQuote, getCompanyInfo, saveCompanyInfo } from "@/lib/storage";
import { QuoteItem, QuoteItemType, QUOTE_ITEM_LABELS, CompanyInfo } from "@/lib/types";
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
  const [jobType, setJobType] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([
    {
      id: crypto.randomUUID(),
      type: "vidro_comum",
      description: QUOTE_ITEM_LABELS["vidro_comum"],
      quantity: 1,
      unitPrice: 0,
      total: 0,
    },
  ]);
  const [showCompany, setShowCompany] = useState(false);

  // Load company info async
  useEffect(() => {
    getCompanyInfo().then(setCompany);
  }, []);

  const addItem = () => {
    setItems([
      ...items,
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

  const updateItem = (id: string, field: Partial<QuoteItem>) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, ...field };
        if (field.type && field.type !== "personalizado") {
          updated.description = QUOTE_ITEM_LABELS[field.type];
        }
        updated.total = updated.quantity * updated.unitPrice;
        return updated;
      })
    );
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
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
    if (items.length === 0) {
      toast.error("Adicione pelo menos um item.");
      return;
    }
    await saveCompanyInfo(company);
    const quote = await addQuote({
      clientName: clientName.trim(),
      jobType,
      items,
      total,
      companyInfo: company,
      notes: notes.trim() || undefined,
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

                  {item.type === "personalizado" && (
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

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Largura (m)</Label>
                      <Input
                        className="mt-1"
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.width || ""}
                        onChange={e => updateItem(item.id, { width: parseFloat(e.target.value) || undefined })}
                        inputMode="decimal"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Altura (m)</Label>
                      <Input
                        className="mt-1"
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.height || ""}
                        onChange={e => updateItem(item.id, { height: parseFloat(e.target.value) || undefined })}
                        inputMode="decimal"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Quantidade</Label>
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
                      <Label className="text-xs">Valor Unitário (R$)</Label>
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

                  {item.width && item.height && (
                    <div className="text-xs text-muted-foreground">
                      Área: {(item.width * item.height * item.quantity).toFixed(2)} m²
                    </div>
                  )}

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
            <div className="bg-primary/10 rounded-xl p-4 space-y-1">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Total de m²</span>
                <span className="font-bold text-foreground">
                  {items.reduce((s, i) => s + ((i.width || 0) * (i.height || 0) * i.quantity), 0).toFixed(2)} m²
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Valor Total</span>
                <span className="text-xl font-bold text-primary">{fmt(total)}</span>
              </div>
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
