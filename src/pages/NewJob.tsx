import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AppHeader from "@/components/app/AppHeader";
import { addJob } from "@/lib/storage";
import { toast } from "sonner";

const NewJob = () => {
  const navigate = useNavigate();
  const [clientName, setClientName] = useState("");
  const [description, setDescription] = useState("");
  const [saleValue, setSaleValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !saleValue.trim()) {
      toast.error("Preencha o nome do cliente e o valor de venda.");
      return;
    }
    const val = parseFloat(saleValue.replace(/[^\d.,]/g, "").replace(",", "."));
    if (isNaN(val) || val <= 0) {
      toast.error("Valor de venda inválido.");
      return;
    }
    addJob({
      clientName: clientName.trim(),
      description: description.trim(),
      saleValue: val,
      status: "em_andamento",
    });
    toast.success("Obra criada com sucesso!");
    navigate("/app");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Nova Obra" backTo="/app" />
      <div className="container py-6 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="client">Nome do Cliente / Obra</Label>
            <Input id="client" placeholder="Ex: João - Box banheiro" value={clientName} onChange={e => setClientName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="desc">Descrição (opcional)</Label>
            <Textarea id="desc" placeholder="Detalhes da obra..." value={description} onChange={e => setDescription(e.target.value)} className="mt-1" rows={3} />
          </div>
          <div>
            <Label htmlFor="value">Valor de Venda (R$)</Label>
            <Input id="value" placeholder="Ex: 2800" value={saleValue} onChange={e => setSaleValue(e.target.value)} className="mt-1" inputMode="decimal" />
          </div>
          <Button type="submit" className="w-full" size="lg">Criar Obra</Button>
        </form>
      </div>
    </div>
  );
};

export default NewJob;
