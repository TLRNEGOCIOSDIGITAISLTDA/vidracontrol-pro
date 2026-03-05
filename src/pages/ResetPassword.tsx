import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { isRecovering } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Caso 1: token no hash (fluxo legado do Supabase)
    if (window.location.hash.includes("type=recovery")) {
      setReady(true);
      return;
    }

    // Caso 2: código PKCE na query string
    if (new URLSearchParams(window.location.search).has("code")) {
      setReady(true);
      return;
    }

    // Caso 3: AuthContext já capturou o evento PASSWORD_RECOVERY
    if (isRecovering) {
      setReady(true);
      return;
    }

    // Caso 4: ouvir o evento caso chegue depois da montagem
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, [isRecovering]);

  const passwordValid = password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordValid) {
      toast.error("A senha deve ter no mínimo 8 caracteres, com letras e números.");
      return;
    }
    if (password !== confirmPw) {
      toast.error("As senhas não conferem.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Senha redefinida com sucesso! Faça login com a nova senha.");
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Verificando link de redefinição...</p>
          <p className="text-sm text-muted-foreground">
            Se nada acontecer,{" "}
            <a href="/esqueci-senha" className="text-primary underline">
              solicite um novo link
            </a>
            .
          </p>
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
          <h1 className="text-2xl font-bold text-foreground">Nova Senha</h1>
          <p className="text-sm text-muted-foreground">Defina sua nova senha de acesso</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nova Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
              <p className={password.length >= 8 ? "text-success" : "text-muted-foreground"}>✓ Mínimo 8 caracteres</p>
              <p className={/[a-zA-Z]/.test(password) ? "text-success" : "text-muted-foreground"}>✓ Contém letras</p>
              <p className={/\d/.test(password) ? "text-success" : "text-muted-foreground"}>✓ Contém números</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPw">Confirmar Nova Senha</Label>
            <Input
              id="confirmPw"
              type="password"
              placeholder="Repita a senha"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !passwordValid}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Redefinir Senha
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
