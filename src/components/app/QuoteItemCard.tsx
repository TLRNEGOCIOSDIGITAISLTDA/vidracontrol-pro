import { useEffect, useRef, useState } from "react";
import { Trash2, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuoteItem, QuoteItemType, QUOTE_ITEM_LABELS, Product } from "@/lib/types";
import { motion } from "framer-motion";

// ── Tipos exportados ────────────────────────────────────────────────────────
// width/height são SEMPRE em mm internamente; _catalogUnit e _unit NÃO são salvos no banco
export type ItemLocal = QuoteItem & { _catalogUnit?: string; _unit?: 'cm' | 'mm' };

// ── Cálculo de total (única fonte de verdade para criação e edição) ─────────
export function calcItemTotal(item: ItemLocal): number {
  if (item.width && item.height) {
    return (item.width * item.height / 1_000_000) * item.quantity * item.unitPrice;
  }
  return item.quantity * item.unitPrice;
}

// ── Busca de produto no catálogo ────────────────────────────────────────────
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
    ? products
        .filter(
          p =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.category.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 8)
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
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
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
                {p.unitPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} /{" "}
                {p.unit}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Componente de card de item (reutilizável em criação e edição) ───────────
interface QuoteItemCardProps {
  item: ItemLocal;
  index: number;
  defaultUnit: 'cm' | 'mm';
  catalogProducts: Product[];
  onUpdate: (id: string, field: Partial<ItemLocal>) => void;
  onRemove: (id: string) => void;
  onApplyProduct: (id: string, product: Product) => void;
}

export const QuoteItemCard = ({
  item,
  index,
  defaultUnit,
  catalogProducts,
  onUpdate,
  onRemove,
  onApplyProduct,
}: QuoteItemCardProps) => {
  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const unit = item._unit ?? defaultUnit;
  const toDisplay = (mm: number | undefined) =>
    mm !== undefined ? (unit === 'cm' ? mm / 10 : mm) : undefined;
  const toMm = (v: number) => (unit === 'cm' ? v * 10 : v);

  const areaPorPeca =
    item.width && item.height ? item.width * item.height / 1_000_000 : null;
  const areaTotal = areaPorPeca !== null ? areaPorPeca * item.quantity : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="bg-card rounded-xl p-4 shadow-card mb-3 space-y-3"
    >
      {/* Cabeçalho do item */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-foreground">Item {index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(item.id)}
          className="text-destructive h-8 w-8"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Busca no catálogo */}
      {catalogProducts.length > 0 && (
        <ProductSearch
          products={catalogProducts}
          onSelect={p => onApplyProduct(item.id, p)}
        />
      )}

      {/* Tipo — só exibe se não vier do catálogo */}
      {!item._catalogUnit && (
        <Select
          value={item.type}
          onValueChange={(v: QuoteItemType) => onUpdate(item.id, { type: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(QUOTE_ITEM_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Descrição: editável apenas para personalizado ou catálogo */}
      {(item.type === "personalizado" || item._catalogUnit) && (
        <Input
          placeholder="Descreva o item..."
          value={item.description}
          onChange={e => onUpdate(item.id, { description: e.target.value })}
        />
      )}

      {/* Local / Ambiente */}
      <div>
        <Label className="text-xs">Local / Ambiente</Label>
        <Input
          className="mt-1"
          value={item.location || ""}
          onChange={e => onUpdate(item.id, { location: e.target.value })}
          placeholder="Ex: Porta da cozinha, Janela da lavanderia..."
        />
      </div>

      {/* Dimensões com toggle cm/mm */}
      {(item._catalogUnit === 'm²' || !item._catalogUnit) && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Dimensões</span>
            <div className="flex rounded-md border border-border overflow-hidden text-xs">
              {(['mm', 'cm'] as const).map(u => (
                <button
                  key={u}
                  type="button"
                  onClick={() => onUpdate(item.id, { _unit: u })}
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
                  onUpdate(item.id, { width: isNaN(v) ? undefined : toMm(v) });
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
                  onUpdate(item.id, { height: isNaN(v) ? undefined : toMm(v) });
                }}
                inputMode="decimal"
                placeholder={unit === 'cm' ? "80" : "800"}
              />
            </div>
          </div>
        </div>
      )}

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
            onChange={e => onUpdate(item.id, { quantity: parseInt(e.target.value) || 1 })}
            inputMode="numeric"
          />
        </div>
        <div>
          <Label className="text-xs">
            {areaPorPeca !== null
              ? 'Preço / m² (R$)'
              : item._catalogUnit
              ? `Preço / ${item._catalogUnit} (R$)`
              : 'Valor Unitário (R$)'}
          </Label>
          <Input
            className="mt-1"
            type="number"
            min={0}
            step="0.01"
            value={item.unitPrice || ""}
            onChange={e =>
              onUpdate(item.id, { unitPrice: parseFloat(e.target.value) || 0 })
            }
            inputMode="decimal"
          />
        </div>
      </div>

      {/* Resumo de metragem — idêntico em criação e edição */}
      {areaTotal !== null && areaPorPeca !== null && (
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
              <span>
                {areaTotal.toFixed(4)} m² × {fmt(item.unitPrice)}/m²
              </span>
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
      )}

      {/* Subtotal */}
      <div className="text-right text-sm font-bold text-primary">
        Subtotal: {fmt(item.total)}
      </div>
    </motion.div>
  );
};
