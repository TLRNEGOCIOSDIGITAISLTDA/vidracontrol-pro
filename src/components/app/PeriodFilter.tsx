/**
 * PeriodFilter — componente reutilizável de filtro de período.
 * Exporta: MONTH_NAMES, Period, usePeriodFilter, PeriodFilter
 * Todas as constantes são declaradas antes de qualquer uso (sem TDZ).
 */

import { useState, useMemo } from "react";
import { CalendarDays } from "lucide-react";

// ── Constantes (declaradas antes de qualquer função que as usa) ──────────
export const MONTH_NAMES: readonly string[] = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export type Period = 'mes' | 'ano' | 'escolher_mes';

const PERIOD_BUTTON_LABELS: Record<Exclude<Period, 'escolher_mes'>, string> = {
  mes: 'Este Mês',
  ano: 'Ano Todo',
};

// ── Helpers puros (function declarations — sem risco de TDZ) ─────────────

/** Converte chave "YYYY-MM" para rótulo legível, ex: "Abril 2026" */
export function monthKeyToLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_NAMES[m]} ${y}`;
}

/** Calcula início e fim do período com base no period e mês selecionado */
export function computePeriodBounds(
  period: Period,
  selectedMonth: string,
): { periodStart: Date; periodEnd: Date } {
  const now = new Date();
  if (period === 'mes') {
    return {
      periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
      periodEnd:   new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
  }
  if (period === 'escolher_mes') {
    const [y, m] = selectedMonth.split('-').map(Number);
    return {
      periodStart: new Date(y, m, 1),
      periodEnd:   new Date(y, m + 1, 0, 23, 59, 59),
    };
  }
  // 'ano'
  return {
    periodStart: new Date(now.getFullYear(), 0, 1),
    periodEnd:   new Date(now.getFullYear(), 11, 31, 23, 59, 59),
  };
}

/** Rótulo humano do período atual */
function getPeriodLabel(period: Period, selectedMonth: string): string {
  if (period === 'mes') return 'Este Mês';
  if (period === 'ano') return 'Ano Todo';
  return monthKeyToLabel(selectedMonth);
}

/** Chave de mês padrão (mês corrente) */
function defaultMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
}

// ── Hook ─────────────────────────────────────────────────────────────────

export interface PeriodFilterState {
  period: Period;
  selectedMonth: string;
  periodStart: Date;
  periodEnd: Date;
  /** Rótulo legível do período atual, ex: "Este Mês", "Abril 2026" */
  periodLabel: string;
  changePeriod: (p: Period) => void;
  changeMonth: (key: string) => void;
}

/**
 * Hook que gerencia o estado do filtro de período.
 * @param storageKey prefixo único por tela (ex: "quoteList", "jobsList")
 */
export function usePeriodFilter(storageKey: string): PeriodFilterState {
  const [period, setPeriod] = useState<Period>(
    () => (localStorage.getItem(`${storageKey}Period`) as Period) || 'mes',
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    () => localStorage.getItem(`${storageKey}SelectedMonth`) || defaultMonthKey(),
  );

  const { periodStart, periodEnd } = useMemo(
    () => computePeriodBounds(period, selectedMonth),
    [period, selectedMonth],
  );

  const periodLabel = getPeriodLabel(period, selectedMonth);

  function changePeriod(p: Period): void {
    setPeriod(p);
    localStorage.setItem(`${storageKey}Period`, p);
  }

  function changeMonth(key: string): void {
    setSelectedMonth(key);
    localStorage.setItem(`${storageKey}SelectedMonth`, key);
  }

  return { period, selectedMonth, periodStart, periodEnd, periodLabel, changePeriod, changeMonth };
}

// ── Componente ───────────────────────────────────────────────────────────

interface PeriodFilterProps {
  state: PeriodFilterState;
  /** Lista de chaves "YYYY-MM" disponíveis nos dados da tela, em ordem cronológica */
  availableMonths: string[];
}

/**
 * Renderiza o seletor de período (Este Mês / Ano Todo / 📅 Mês).
 * Recebe o estado produzido por usePeriodFilter e a lista de meses disponíveis.
 */
export function PeriodFilter({ state, availableMonths }: PeriodFilterProps) {
  const { period, selectedMonth, changePeriod, changeMonth } = state;

  return (
    <div className="space-y-2">
      {/* Botões principais */}
      <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
        {(Object.keys(PERIOD_BUTTON_LABELS) as Exclude<Period, 'escolher_mes'>[]).map(p => (
          <button
            key={p}
            onClick={() => changePeriod(p)}
            className={`flex-1 text-xs font-medium py-1.5 px-1 rounded-lg transition-colors ${
              period === p
                ? 'bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {PERIOD_BUTTON_LABELS[p]}
          </button>
        ))}
        <button
          onClick={() => changePeriod('escolher_mes')}
          className={`flex-1 text-xs font-medium py-1.5 px-1 rounded-lg transition-colors flex items-center justify-center gap-1 ${
            period === 'escolher_mes'
              ? 'bg-card shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <CalendarDays className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {period === 'escolher_mes' ? monthKeyToLabel(selectedMonth) : 'Mês'}
          </span>
        </button>
      </div>

      {/* Pills de mês — visíveis apenas quando escolher_mes está ativo */}
      {period === 'escolher_mes' && (
        <div className="overflow-x-auto pb-1 -mx-1 px-1">
          {availableMonths.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">Nenhum dado disponível</p>
          ) : (
            <div className="flex gap-1.5 w-max">
              {availableMonths.map(key => (
                <button
                  key={key}
                  onClick={() => changeMonth(key)}
                  className={`text-xs py-1 px-2.5 rounded-full whitespace-nowrap transition-colors ${
                    selectedMonth === key
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {monthKeyToLabel(key)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
