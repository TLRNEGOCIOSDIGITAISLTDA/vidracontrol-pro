import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import InstallBanner from "@/components/app/InstallBanner";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  // Redireciona se já tem sessão ativa
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/app", { replace: true });
    });
  }, [navigate]);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);

    if (error) {
      if (error.message.includes("Invalid login")) {
        toast.error("Email ou senha incorretos.");
      } else if (error.message.includes("Email not confirmed")) {
        toast.error("Confirme seu email antes de entrar.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    navigate("/app");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-elevated">
            <Calculator className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">VidraControl</h1>
          <p className="text-sm text-muted-foreground">Faça login para acessar o sistema</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPw(!showPw)}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Entrar
          </Button>
        </form>

        <div className="text-center space-y-2 text-sm">
          <Link to="/esqueci-senha" className="text-primary hover:underline block">
            Esqueci minha senha
          </Link>
          <p className="text-muted-foreground">
            Não tem conta?{" "}
            <Link to="/cadastro" className="text-primary hover:underline font-medium">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
      <InstallBanner />
    </div>
  );
};

export default Login;
