import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { maskWhatsApp, isValidWhatsApp } from "@/lib/whatsappMask";

// --- Funções de máscara ---

function maskCPF(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function isValidCPF(v: string): boolean {
  return v.replace(/\D/g, '').length === 11;
}

function maskCNPJ(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 10);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
}

function maskCEP(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

// --- Componente ---

const Signup = () => {
  const [step, setStep] = useState<1 | 2>(1);

  // Etapa 1
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);

  // Etapa 2
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [cep, setCep] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordValid =
    password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password);

  // Avança da etapa 1 para a 2
  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { toast.error('Informe seu nome completo.'); return; }
    if (!isValidCPF(cpf)) { toast.error('Informe um CPF válido (11 dígitos).'); return; }
    if (!email.trim()) { toast.error('Informe seu email.'); return; }
    if (!isValidWhatsApp(whatsapp)) { toast.error('Informe um WhatsApp válido.'); return; }
    if (!passwordValid) {
      toast.error('A senha deve ter no mínimo 8 caracteres, com letras e números.');
      return;
    }
    if (password !== confirmPw) { toast.error('As senhas não conferem.'); return; }
    setStep(2);
  };

  // Cria conta e salva dados
  const handleFinish = async (skipCompany: boolean) => {
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: 'https://vidro-lucro-control.vercel.app/login' },
    });

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    const userId = data.user?.id;

    if (userId) {
      // Salva perfil
      await supabase.from('profiles' as any).insert({
        user_id: userId,
        full_name: fullName.trim(),
        cpf: cpf.replace(/\D/g, ''),
        whatsapp: whatsapp.replace(/\D/g, ''),
      } as any);

      // Salva dados da empresa se preenchidos
      if (!skipCompany && (companyName.trim() || cnpj || companyPhone || address.trim())) {
        await supabase.from('company_info' as any).insert({
          user_id: userId,
          name: companyName.trim(),
          cnpj_cpf: cnpj.replace(/\D/g, ''),
          phone: companyPhone.replace(/\D/g, ''),
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          cep: cep.replace(/\D/g, ''),
        } as any);
      }
    }

    setLoading(false);
    setSuccess(true);
  };

  // --- Tela de sucesso ---
  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-success mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Conta criada!</h1>
          <p className="text-muted-foreground text-sm">
            Enviamos um email de confirmação para <strong>{email}</strong>. Verifique sua
            caixa de entrada e clique no link para ativar sua conta.
          </p>
          <Link to="/login">
            <Button variant="outline" className="mt-4">Voltar ao Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  // --- Etapa 1 ---
  if (step === 1) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-elevated">
              <Calculator className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Criar Conta</h1>
            <p className="text-sm text-muted-foreground">Etapa 1 de 2 — Dados pessoais</p>
          </div>

          <form onSubmit={handleStep1} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo *</Label>
              <Input
                id="fullName"
                placeholder="Seu nome completo"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={e => setCpf(maskCPF(e.target.value))}
                inputMode="numeric"
                required
              />
              {cpf && !isValidCPF(cpf) && (
                <p className="text-xs text-destructive">CPF incompleto</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp *</Label>
              <Input
                id="whatsapp"
                placeholder="(41) 99999-9999"
                value={whatsapp}
                onChange={e => setWhatsapp(maskWhatsApp(e.target.value))}
                inputMode="tel"
                required
              />
              {whatsapp && !isValidWhatsApp(whatsapp) && (
                <p className="text-xs text-destructive">Número incompleto</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPw(!showPw)}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="text-xs space-y-0.5">
                <p className={password.length >= 8 ? 'text-success' : 'text-muted-foreground'}>✓ Mínimo 8 caracteres</p>
                <p className={/[a-zA-Z]/.test(password) ? 'text-success' : 'text-muted-foreground'}>✓ Contém letras</p>
                <p className={/\d/.test(password) ? 'text-success' : 'text-muted-foreground'}>✓ Contém números</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPw">Confirmar Senha *</Label>
              <Input
                id="confirmPw"
                type="password"
                placeholder="Repita a senha"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={!passwordValid || !isValidWhatsApp(whatsapp) || !isValidCPF(cpf)}
            >
              Continuar
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">Entrar</Link>
          </p>
        </div>
      </div>
    );
  }

  // --- Etapa 2 ---
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-elevated">
            <Calculator className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Dados da Empresa</h1>
          <p className="text-sm text-muted-foreground">
            Complete seus dados para gerar orçamentos profissionais
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Nome da empresa</Label>
            <Input
              id="companyName"
              placeholder="Vidraçaria Exemplo"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              placeholder="00.000.000/0000-00"
              value={cnpj}
              onChange={e => setCnpj(maskCNPJ(e.target.value))}
              inputMode="numeric"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyPhone">Telefone / WhatsApp</Label>
            <Input
              id="companyPhone"
              placeholder="(41) 99999-9999"
              value={companyPhone}
              onChange={e => setCompanyPhone(maskPhone(e.target.value))}
              inputMode="tel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              placeholder="Rua Exemplo, 123"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                placeholder="Curitiba"
                value={city}
                onChange={e => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                placeholder="PR"
                maxLength={2}
                value={state}
                onChange={e => setState(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cep">CEP</Label>
            <Input
              id="cep"
              placeholder="00000-000"
              value={cep}
              onChange={e => setCep(maskCEP(e.target.value))}
              inputMode="numeric"
            />
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={loading}
            onClick={() => handleFinish(false)}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Finalizar cadastro
          </Button>

          <Button
            variant="ghost"
            className="w-full"
            disabled={loading}
            onClick={() => handleFinish(true)}
          >
            Preencher depois
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Etapa 2 de 2 — Todos os campos são opcionais
        </p>
      </div>
    </div>
  );
};

export default Signup;
