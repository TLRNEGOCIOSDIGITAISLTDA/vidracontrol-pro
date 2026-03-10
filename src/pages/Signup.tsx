import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { maskWhatsApp, isValidWhatsApp } from "@/lib/whatsappMask";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordValid = password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !fullName.trim()) return;

    if (!isValidWhatsApp(whatsapp)) {
      toast.error("Informe um número de WhatsApp válido.");
      return;
    }
    if (!passwordValid) {
      toast.error("A senha deve ter no mínimo 8 caracteres, com letras e números.");
      return;
    }
    if (password !== confirmPw) {
      toast.error("As senhas não conferem.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: "https://vidro-lucro-control.vercel.app/login" },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    // Save profile with WhatsApp
    if (data.user) {
      await supabase.from('profiles' as any).insert({
        user_id: data.user.id,
        whatsapp: whatsapp.replace(/\D/g, ''),
        full_name: fullName.trim(),
      } as any);
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-success mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Conta criada!</h1>
          <p className="text-muted-foreground text-sm">
            Enviamos um email de confirmação para <strong>{email}</strong>. Verifique sua caixa de entrada e clique no link para ativar sua conta.
          </p>
          <Link to="/login">
            <Button variant="outline" className="mt-4">Voltar ao Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-elevated">
            <Calculator className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Criar Conta</h1>
          <p className="text-sm text-muted-foreground">Cadastre-se no VidraControl</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input id="fullName" placeholder="Seu nome" value={fullName} onChange={e => setFullName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              placeholder="(00) 00000-0000"
              value={whatsapp}
              onChange={e => setWhatsapp(maskWhatsApp(e.target.value))}
              required
              inputMode="tel"
            />
            {whatsapp && !isValidWhatsApp(whatsapp) && (
              <p className="text-xs text-destructive">Número incompleto</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input id="password" type={showPw ? "text" : "password"} placeholder="Mínimo 8 caracteres" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="text-xs space-y-0.5">
              <p className={password.length >= 8 ? "text-success" : "text-muted-foreground"}>✓ Mínimo 8 caracteres</p>
              <p className={/[a-zA-Z]/.test(password) ? "text-success" : "text-muted-foreground"}>✓ Contém letras</p>
              <p className={/\d/.test(password) ? "text-success" : "text-muted-foreground"}>✓ Contém números</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPw">Confirmar Senha</Label>
            <Input id="confirmPw" type="password" placeholder="Repita a senha" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required autoComplete="new-password" />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading || !passwordValid || !isValidWhatsApp(whatsapp)}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Criar Conta
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">Entrar</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
