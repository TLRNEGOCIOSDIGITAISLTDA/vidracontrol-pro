import { useRef } from "react";
import { Input } from "@/components/ui/input";

// ── Máscara de moeda brasileira ──────────────────────────────────────────────
// Regras:
//   - O usuário digita apenas dígitos; a máscara formata conforme a digitação
//   - Internamente armazena string de dígitos sem pontuação
//   - Exibe no padrão pt-BR: 1.000,00
//   - O valor numérico (float) é obtido via parseCurrency()
// ─────────────────────────────────────────────────────────────────────────────

export function formatCurrency(digits: string): string {
  // Remove tudo que não é dígito
  const raw = digits.replace(/\D/g, "");
  if (!raw || raw === "0" || raw === "00") return "";
  const cents = parseInt(raw, 10);
  // Converte para reais: últimos 2 dígitos = centavos
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseCurrency(display: string): number {
  // "1.250,75" → 1250.75
  const cleaned = display.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// Dado um valor numérico, retorna a string de exibição formatada
export function numericToDisplay(value: number | string | undefined): string {
  if (value === undefined || value === "") return "";
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(n) || n === 0) return "";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface CurrencyInputProps {
  value: string;           // string de exibição formatada ("1.250,75") ou vazia
  onChange: (display: string, numeric: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Componente controlado: recebe display string, chama onChange com (display, numeric)
export const CurrencyInput = ({ value, onChange, placeholder = "0,00", className, disabled }: CurrencyInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    const display = formatCurrency(raw);
    onChange(display, parseCurrency(display));
  };

  return (
    <Input
      ref={inputRef}
      inputMode="numeric"
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      disabled={disabled}
    />
  );
};
