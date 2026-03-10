import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppHeader from "@/components/app/AppHeader";
import { getProfile, saveProfile } from "@/lib/storage";
import { maskWhatsApp, isValidWhatsApp } from "@/lib/whatsappMask";
import { toast } from "sonner";
import { Loader2, User } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const Profile = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfile().then(p => {
      if (p) {
        setFullName(p.fullName);
        setWhatsapp(maskWhatsApp(p.whatsapp));
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!isValidWhatsApp(whatsapp)) {
      toast.error("Número de WhatsApp inválido.");
      return;
    }
    setSaving(true);
    await saveProfile({ fullName, whatsapp: whatsapp.replace(/\D/g, '') });
    setSaving(false);
    toast.success("Perfil atualizado!");
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Meu Perfil" backTo="/app" />
      <div className="container py-6 max-w-sm space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
            <User className="h-8 w-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Seu nome" />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp</Label>
            <Input
              value={whatsapp}
              onChange={e => setWhatsapp(maskWhatsApp(e.target.value))}
              placeholder="(00) 00000-0000"
              inputMode="tel"
            />
            {whatsapp && !isValidWhatsApp(whatsapp) && (
              <p className="text-xs text-destructive">Número incompleto</p>
            )}
          </div>
          <Button className="w-full" size="lg" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
