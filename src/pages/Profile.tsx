import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppHeader from "@/components/app/AppHeader";
import { getProfile, saveProfile, getCompanyInfo, saveCompanyInfo, uploadCompanyLogo } from "@/lib/storage";
import { maskWhatsApp, isValidWhatsApp } from "@/lib/whatsappMask";
import { toast } from "sonner";
import { Loader2, User, Building2, ImagePlus, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { CompanyInfo, AddressFields } from "@/lib/types";

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC",
  "SP","SE","TO",
];

const Profile = () => {
  const { user } = useAuth();

  // ---- Perfil pessoal ----
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // ---- Dados da empresa ----
  const [company, setCompany] = useState<CompanyInfo>({
    name: "", cnpjCpf: "", phone: "", email: "", address: "", website: "", logoUrl: "",
  });
  const [addrFields, setAddrFields] = useState<AddressFields>({
    street: "", number: "", neighborhood: "", city: "", state: "", cep: "",
  });
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProfile().then(p => {
      if (p) {
        setFullName(p.fullName);
        setWhatsapp(maskWhatsApp(p.whatsapp));
      }
      setLoadingProfile(false);
    });
  }, []);

  useEffect(() => {
    getCompanyInfo().then(info => {
      setCompany(info);
      if (info.addressFields) {
        setAddrFields(info.addressFields);
      }
      if (info.logoUrl) setLogoPreview(info.logoUrl);
      setLoadingCompany(false);
    });
  }, []);

  const handleSaveProfile = async () => {
    if (!isValidWhatsApp(whatsapp)) {
      toast.error("Número de WhatsApp inválido.");
      return;
    }
    setSavingProfile(true);
    await saveProfile({ fullName, whatsapp: whatsapp.replace(/\D/g, "") });
    setSavingProfile(false);
    toast.success("Perfil atualizado!");
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
    setCompany(c => ({ ...c, logoUrl: "" }));
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const handleSaveCompany = async () => {
    setSavingCompany(true);
    try {
      let logoUrl = company.logoUrl || "";
      if (logoFile) {
        const uploaded = await uploadCompanyLogo(logoFile);
        if (uploaded) {
          logoUrl = uploaded;
        } else {
          toast.error("Erro ao fazer upload do logo. Salvando demais dados.");
        }
      }
      const infoToSave: CompanyInfo = {
        ...company,
        logoUrl,
        addressFields: addrFields,
      };
      await saveCompanyInfo(infoToSave);
      setLogoFile(null);
      toast.success("Dados da empresa salvos!");
    } catch {
      toast.error("Erro ao salvar dados da empresa.");
    } finally {
      setSavingCompany(false);
    }
  };

  const setAddr = (key: keyof AddressFields, value: string) =>
    setAddrFields(prev => ({ ...prev, [key]: value }));

  const setCo = (key: keyof CompanyInfo, value: string) =>
    setCompany(prev => ({ ...prev, [key]: value }));

  const maskCep = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 8);
    if (d.length <= 5) return d;
    return `${d.slice(0, 5)}-${d.slice(5)}`;
  };

  if (loadingProfile || loadingCompany) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Perfil e Empresa" backTo="/app" />
      <div className="container py-6 max-w-lg space-y-8">

        {/* ===== PERFIL PESSOAL ===== */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Meu Perfil</h2>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome Completo</Label>
              <Input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">WhatsApp</Label>
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
          </div>

          <Button className="w-full" onClick={handleSaveProfile} disabled={savingProfile}>
            {savingProfile && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar Perfil
          </Button>
        </div>

        {/* ===== DADOS DA EMPRESA ===== */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Dados da Empresa</h2>
              <p className="text-xs text-muted-foreground">Aparecem no PDF dos orçamentos</p>
            </div>
          </div>

          {/* Logo */}
          <div className="space-y-1.5">
            <Label className="text-xs">Logo da Empresa</Label>
            <div className="flex items-center gap-3">
              {logoPreview ? (
                <div className="relative">
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="w-20 h-20 object-contain rounded-lg border border-border bg-muted"
                  />
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                >
                  <ImagePlus className="h-6 w-6 text-muted-foreground mb-0.5" />
                  <span className="text-[10px] text-muted-foreground">Adicionar</span>
                </div>
              )}
              <div className="flex-1 text-xs text-muted-foreground space-y-0.5">
                <p>PNG, JPG ou SVG</p>
                <p>Recomendado: 200×200px</p>
                {!logoPreview && (
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="text-primary font-medium hover:underline"
                  >
                    Selecionar arquivo
                  </button>
                )}
              </div>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
            />
          </div>

          {/* Identificação */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Nome da Empresa *</Label>
              <Input
                value={company.name}
                onChange={e => setCo("name", e.target.value)}
                placeholder="Vidraçaria Exemplo"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">CNPJ / CPF</Label>
              <Input
                value={company.cnpjCpf}
                onChange={e => setCo("cnpjCpf", e.target.value)}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Telefone</Label>
              <Input
                value={company.phone}
                onChange={e => setCo("phone", e.target.value)}
                placeholder="(00) 0000-0000"
                inputMode="tel"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                value={company.email}
                onChange={e => setCo("email", e.target.value)}
                placeholder="contato@empresa.com"
                type="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Site (opcional)</Label>
              <Input
                value={company.website || ""}
                onChange={e => setCo("website", e.target.value)}
                placeholder="www.empresa.com.br"
              />
            </div>
          </div>

          {/* Endereço */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              Endereço
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Rua / Avenida</Label>
                <Input
                  value={addrFields.street}
                  onChange={e => setAddr("street", e.target.value)}
                  placeholder="Rua das Flores"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Número</Label>
                <Input
                  value={addrFields.number}
                  onChange={e => setAddr("number", e.target.value)}
                  placeholder="123"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bairro</Label>
                <Input
                  value={addrFields.neighborhood}
                  onChange={e => setAddr("neighborhood", e.target.value)}
                  placeholder="Centro"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cidade</Label>
                <Input
                  value={addrFields.city}
                  onChange={e => setAddr("city", e.target.value)}
                  placeholder="São Paulo"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Estado</Label>
                <select
                  value={addrFields.state}
                  onChange={e => setAddr("state", e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">UF</option>
                  {ESTADOS_BR.map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CEP</Label>
                <Input
                  value={addrFields.cep}
                  onChange={e => setAddr("cep", maskCep(e.target.value))}
                  placeholder="00000-000"
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>

          <Button className="w-full" onClick={handleSaveCompany} disabled={savingCompany}>
            {savingCompany && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar Dados da Empresa
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
