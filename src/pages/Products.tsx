import { useState, useEffect } from "react";
import { Plus, Pencil, Power, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import AppHeader from "@/components/app/AppHeader";
import { getProducts, addProduct, updateProduct, deleteProduct } from "@/lib/storage";
import {
  Product,
  ProductCategory,
  PRODUCT_CATEGORIES,
  PRODUCT_UNITS,
  PRODUCT_CATEGORY_COLORS,
} from "@/lib/types";
import { toast } from "sonner";

type FormState = {
  name: string;
  category: ProductCategory;
  unit: string;
  unitPrice: string;
};

const emptyForm: FormState = {
  name: "",
  category: "Vidro",
  unit: "m²",
  unitPrice: "",
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await getProducts(showInactive);
    setProducts(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [showInactive]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      category: p.category,
      unit: p.unit,
      unitPrice: String(p.unitPrice),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Informe o nome do produto.");
      return;
    }
    const price = parseFloat(form.unitPrice.replace(",", ".")) || 0;
    setSaving(true);
    try {
      if (editing) {
        await updateProduct(editing.id, {
          name: form.name.trim(),
          category: form.category,
          unit: form.unit,
          unitPrice: price,
        });
        toast.success("Produto atualizado!");
      } else {
        await addProduct({
          name: form.name.trim(),
          category: form.category,
          unit: form.unit,
          unitPrice: price,
          active: true,
        });
        toast.success("Produto cadastrado!");
      }
      setDialogOpen(false);
      await load();
    } catch {
      toast.error("Erro ao salvar produto.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (p: Product) => {
    await updateProduct(p.id, { active: !p.active });
    toast.success(p.active ? "Produto desativado." : "Produto ativado.");
    await load();
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`Excluir "${p.name}"? Esta ação não pode ser desfeita.`)) return;
    await deleteProduct(p.id);
    toast.success("Produto excluído.");
    await load();
  };

  // Agrupa por categoria
  const grouped = PRODUCT_CATEGORIES.map(cat => ({
    category: cat,
    items: products.filter(p => p.category === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader title="Meus Produtos" backTo="/app" />
      <div className="container py-6 max-w-lg space-y-5">
        {/* Header actions */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowInactive(!showInactive)}
            className="text-xs text-muted-foreground underline"
          >
            {showInactive ? "Ocultar inativos" : "Exibir inativos"}
          </button>
          <Button onClick={openNew} size="sm" className="gap-1">
            <Plus className="h-4 w-4" /> Novo Produto
          </Button>
        </div>

        {/* Empty state */}
        {!loading && products.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Package className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">
              Nenhum produto cadastrado ainda.
            </p>
            <Button onClick={openNew} variant="outline" size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> Cadastrar primeiro produto
            </Button>
          </div>
        )}

        {/* Grouped list */}
        {grouped.map(({ category, items }) => (
          <div key={category}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRODUCT_CATEGORY_COLORS[category]}`}>
                {category}
              </span>
              <span className="text-xs text-muted-foreground">{items.length} produto{items.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="space-y-2">
              {items.map(p => (
                <div
                  key={p.id}
                  className={`bg-card rounded-xl p-4 shadow-card flex items-center gap-3 ${!p.active ? "opacity-50" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmt(p.unitPrice)} / {p.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(p)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${p.active ? "text-muted-foreground" : "text-success"}`}
                      onClick={() => handleToggleActive(p)}
                      title={p.active ? "Desativar" : "Ativar"}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(p)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Dialog: Novo / Editar produto */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome do produto / serviço</Label>
              <Input
                className="mt-1"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Vidro Temperado 8mm"
                autoFocus
              />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as ProductCategory }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unidade</Label>
              <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_UNITS.map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preço unitário (R$)</Label>
              <Input
                className="mt-1"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={form.unitPrice}
                onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))}
                placeholder="0,00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
