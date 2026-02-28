import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppHeader from "@/components/app/AppHeader";
import { addJob } from "@/lib/storage";
import { useData } from "@/lib/DataContext";
import { QuoteItemType, QUOTE_ITEM_LABELS, JobItem } from "@/lib/types";
import { toast } from "sonner";
import { Plus, Trash2, Ruler } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ITEM_TYPES = Object.keys(QUOTE_ITEM_LABELS) as QuoteItemType[];

const NewJob = () => {
  const navigate = useNavigate();
  const { refreshJobs } = useData();
  const [clientName, setClientName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<JobItem[]>([]);

  // New item form state
  const [itemType, setItemType] = useState<QuoteItemType>("vidro_temperado");
  const [itemDesc, setItemDesc] = useState("");
  const [itemWidth, setItemWidth] = useState("");
  const [itemHeight, setItemHeight] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemPrice, setItemPrice] = useState("");

  const parseNum = (v: string) => parseFloat(v.replace(",", ".")) || 0;

  const calcArea = (w: string, h: string) => {
    const wm = parseNum(w) / 1000; // mm to m
    const hm = parseNum(h) / 1000;
    return wm > 0 && hm > 0 ? wm * hm : 0;
  };

  const handleAddItem = () => {
    const qty = parseInt(itemQty) || 0;
    const price = parseNum(itemPrice);
    if (qty <= 0 || price <= 0) {
      toast.error("Informe quantidade e valor unitário válidos.");
      return;
    }
    const area = calcArea(itemWidth, itemHeight);
    const total = price * qty;
    const newItem: JobItem = {
      id: crypto.randomUUID(),
      type: itemType,
      description: itemDesc.trim() || QUOTE_ITEM_LABELS[itemType],
      width: parseNum(itemWidth) || undefined,
      height: parseNum(itemHeight) || undefined,
      quantity: qty,
      unitPrice: price,
      total,
      area: area > 0 ? area * qty : undefined,
    };
    setItems([...items, newItem]);
    setItemDesc("");
    setItemWidth("");
    setItemHeight("");
    setItemQty("1");
    setItemPrice("");
    toast.success("Item adicionado!");
  };

  const removeItem = (id: string) => setItems(items.filter(i => i.id !== id));

  const totalArea = items.reduce((s, i) => s + (i.area || 0), 0);
  const totalValue = items.reduce((s, i) => s + i.total, 0);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      toast.error("Preencha o nome do cliente.");
      return;
    }
    if (items.length === 0 && !totalValue) {
      toast.error("Adicione pelo menos um item à obra.");
      return;
    }
    await addJob({
      clientName: clientName.trim(),
      description: description.trim(),
      saleValue: totalValue,
      status: "em_andamento",
      items,
    });
    await refreshJobs();
    toast.success("Obra criada com sucesso!");
    navigate("/app");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Nova Obra" backTo="/app" />
      <div className="container py-6 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="client">Nome do Cliente / Obra</Label>
              <Input id="client" placeholder="Ex: João - Box banheiro" value={clientName} onChange={e => setClientName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="desc">Descrição (opcional)</Label>
              <Textarea id="desc" placeholder="Detalhes da obra..." value={description} onChange={e => setDescription(e.target.value)} className="mt-1" rows={2} />
            </div>
          </div>

          {/* Items section */}
          <div className="bg-card rounded-xl p-4 shadow-card space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Ruler className="h-4 w-4 text-primary" />
              Itens da Obra
            </h3>

            {/* Add item form */}
            <div className="space-y-3 bg-muted/30 rounded-lg p-3 border border-border">
              <div>
                <Label className="text-xs">Tipo de Vidro / Produto</Label>
                <Select value={itemType} onValueChange={(v) => setItemType(v as QuoteItemType)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{QUOTE_ITEM_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Descrição (opcional)</Label>
                <Input placeholder="Ex: Box frontal banheiro suíte" value={itemDesc} onChange={e => setItemDesc(e.target.value)} className="mt-1" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Largura (mm)</Label>
                  <Input placeholder="Ex: 1200" value={itemWidth} onChange={e => setItemWidth(e.target.value)} className="mt-1" inputMode="decimal" />
                </div>
                <div>
                  <Label className="text-xs">Altura (mm)</Label>
                  <Input placeholder="Ex: 2100" value={itemHeight} onChange={e => setItemHeight(e.target.value)} className="mt-1" inputMode="decimal" />
                </div>
              </div>

              {parseNum(itemWidth) > 0 && parseNum(itemHeight) > 0 && (
                <div className="text-xs text-primary font-medium">
                  Área: {calcArea(itemWidth, itemHeight).toFixed(3)} m² por peça
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Quantidade</Label>
                  <Input placeholder="1" value={itemQty} onChange={e => setItemQty(e.target.value)} className="mt-1" inputMode="numeric" />
                </div>
                <div>
                  <Label className="text-xs">Valor Unitário (R$)</Label>
                  <Input placeholder="Ex: 450" value={itemPrice} onChange={e => setItemPrice(e.target.value)} className="mt-1" inputMode="decimal" />
                </div>
              </div>

              <Button type="button" size="sm" variant="outline" className="w-full gap-1" onClick={handleAddItem}>
                <Plus className="h-4 w-4" /> Adicionar Item
              </Button>
            </div>

            {/* Items list */}
            <AnimatePresence>
              {items.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{item.description}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {QUOTE_ITEM_LABELS[item.type]}
                      {item.width && item.height ? ` · ${item.width}×${item.height}mm` : ""}
                      {item.area ? ` · ${item.area.toFixed(2)} m²` : ""}
                      {` · ${item.quantity}× ${fmt(item.unitPrice)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-sm font-bold text-foreground whitespace-nowrap">{fmt(item.total)}</span>
                    <button type="button" onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Summary footer */}
          {items.length > 0 && (
            <div className="bg-card rounded-xl p-4 shadow-card">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Total m²</span>
                  <div className="font-bold text-foreground">{totalArea.toFixed(2)} m²</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor Total</span>
                  <div className="font-bold text-primary">{fmt(totalValue)}</div>
                </div>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={items.length === 0}>
            Salvar Obra
          </Button>
        </form>
      </div>
    </div>
  );
};

export default NewJob;
