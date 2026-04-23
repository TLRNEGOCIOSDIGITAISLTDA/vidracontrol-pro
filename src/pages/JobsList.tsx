import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Briefcase, LayoutGrid, List, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/app/AppHeader";
import { useData } from "@/lib/DataContext";
import { JobStatus, JOB_STATUS_LABELS, JOB_STATUS_COLORS } from "@/lib/types";
import { motion } from "framer-motion";
import { JobStepDots } from "@/components/app/JobStepDots";

const ALL_JOB_STATUSES: JobStatus[] = ['em_andamento', 'aguardando_pagamento', 'finalizado'];
const JOB_STATUS_HEX: Record<JobStatus, string> = {
  em_andamento: 'hsl(215,80%,55%)',
  aguardando_pagamento: '#f59e0b',
  finalizado: '#22c55e',
};
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

type Period = 'mes' | 'ano' | 'escolher_mes';

const JobsList = () => {
  const { jobs } = useData();

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // ── View toggle ──────────────────────────────────────────────
  const [view, setView] = useState<"kanban" | "list">(
    () => (localStorage.getItem("jobsListView") as "kanban" | "list") || "list"
  );
  const setViewAndStore = (v: "kanban" | "list") => {
    setView(v);
    localStorage.setItem("jobsListView", v);
  };

  // ── Filtro de período ────────────────────────────────────────
  const [period, setPeriod] = useState<Period>(
    () => (localStorage.getItem("jobsListPeriod") as Period) || "mes"
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return localStorage.getItem("jobsListSelectedMonth") || `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
  });

  const changePeriod = (p: Period) => {
    setPeriod(p);
    localStorage.setItem("jobsListPeriod", p);
  };

  const { periodStart, periodEnd } = useMemo(() => {
    const now = new Date();
    if (period === 'mes') return {
      periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
      periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
    if (period === 'escolher_mes') {
      const [y, m] = selectedMonth.split('-').map(Number);
      return {
        periodStart: new Date(y, m, 1),
        periodEnd: new Date(y, m + 1, 0, 23, 59, 59),
      };
    }
    return {
      periodStart: new Date(now.getFullYear(), 0, 1),
      periodEnd: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
    };
  }, [period, selectedMonth]);

  const filteredJobs = useMemo(() =>
    jobs.filter(j => {
      const d = new Date(j.createdAt);
      return d >= periodStart && d <= periodEnd;
    }),
    [jobs, periodStart, periodEnd]
  );

  const availableMonths = useMemo(() => {
    const keys = new Set<string>();
    jobs.forEach(j => {
      const d = new Date(j.createdAt);
      keys.add(`${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`);
    });
    return Array.from(keys).sort();
  }, [jobs]);

  const monthKeyToLabel = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    return `${MONTH_NAMES[m]} ${y}`;
  };

  const PERIOD_LABELS: Record<Period, string> = {
    mes: 'Este Mês',
    ano: 'Ano Todo',
    escolher_mes: monthKeyToLabel(selectedMonth),
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Minhas Obras" backTo="/app" />

      <div className="container py-6 space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Minhas Obras</h2>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setViewAndStore("kanban")}
                title="Kanban"
                className={`p-1.5 rounded-md transition-colors ${view === "kanban" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewAndStore("list")}
                title="Lista"
                className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Link to="/app/nova-obra">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Nova
              </Button>
            </Link>
          </div>
        </div>

        {/* Filtro de período */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
            {(['mes', 'ano'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => changePeriod(p)}
                className={`flex-1 text-xs font-medium py-1.5 px-1 rounded-lg transition-colors ${
                  period === p ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
            <button
              onClick={() => changePeriod('escolher_mes')}
              className={`flex-1 text-xs font-medium py-1.5 px-1 rounded-lg transition-colors flex items-center justify-center gap-1 ${
                period === 'escolher_mes' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CalendarDays className="h-3 w-3 shrink-0" />
              <span className="truncate">{period === 'escolher_mes' ? monthKeyToLabel(selectedMonth) : 'Mês'}</span>
            </button>
          </div>

          {period === 'escolher_mes' && (
            <div className="overflow-x-auto pb-1 -mx-1 px-1">
              {availableMonths.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Nenhum dado disponível</p>
              ) : (
                <div className="flex gap-1.5 w-max">
                  {availableMonths.map(key => (
                    <button
                      key={key}
                      onClick={() => { setSelectedMonth(key); localStorage.setItem("jobsListSelectedMonth", key); }}
                      className={`text-xs py-1 px-2.5 rounded-full whitespace-nowrap transition-colors ${
                        selectedMonth === key ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted text-muted-foreground hover:text-foreground'
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

        {/* Contador */}
        <p className="text-[11px] text-muted-foreground">
          {PERIOD_LABELS[period]} · {filteredJobs.length} registro(s)
        </p>

        {/* Empty state */}
        {filteredJobs.length === 0 && (
          <div className="text-center py-16">
            <Briefcase className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma obra no período.</p>
          </div>
        )}

        {/* ── KANBAN VIEW ── */}
        {filteredJobs.length > 0 && view === "kanban" && (
          <div className="overflow-x-auto pb-4 -mx-4 px-4">
            <div className="flex gap-3" style={{ minWidth: "max-content" }}>
              {ALL_JOB_STATUSES.map(status => {
                const colJobs = filteredJobs
                  .filter(j => ((j.status as JobStatus) || 'em_andamento') === status)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                const colTotal = colJobs.reduce((s, j) => s + j.saleValue, 0);
                return (
                  <div key={status} className="flex flex-col w-[220px] flex-shrink-0">
                    <div className="flex items-center gap-1.5 mb-2 px-1">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: JOB_STATUS_HEX[status] }} />
                      <p className="text-xs font-bold text-foreground leading-tight flex-1 min-w-0 truncate">
                        {JOB_STATUS_LABELS[status]} ({colJobs.length}){colJobs.length > 0 ? ` — ${fmt(colTotal)}` : ""}
                      </p>
                    </div>
                    <div className="rounded-xl p-2 space-y-2 min-h-[140px] bg-muted/40">
                      {colJobs.map(job => {
                        const expenses = job.expenses.reduce((s, e) => s + e.value, 0);
                        const profit = job.saleValue - expenses;
                        const received = job.totalReceived ?? 0;
                        const pending = Math.max(0, job.saleValue - received);
                        return (
                          <Link key={job.id} to={`/app/obra/${job.id}`}>
                            <div className="bg-card rounded-xl border border-border/50 shadow-card hover:shadow-elevated transition-shadow p-3 mb-2">
                              <h3 className="font-bold text-foreground text-sm leading-tight truncate">{job.clientName}</h3>
                              {job.description && <p className="text-[11px] text-muted-foreground truncate mb-1">{job.description}</p>}
                              <JobStepDots status={job.status} etapaMedicao={job.etapaMedicao} etapaPedirVidro={job.etapaPedirVidro} etapaFabricacao={job.etapaFabricacao} etapaInstalacao={job.etapaInstalacao} />
                              <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1.5">
                                <div>
                                  <div className="text-[9px] text-muted-foreground leading-tight">Total</div>
                                  <div className="text-[11px] font-bold text-foreground leading-tight">{fmt(job.saleValue)}</div>
                                </div>
                                <div>
                                  <div className="text-[9px] text-muted-foreground leading-tight">Recebido</div>
                                  <div className="text-[11px] font-bold text-success leading-tight">{fmt(received)}</div>
                                </div>
                                <div>
                                  <div className="text-[9px] text-muted-foreground leading-tight">A Receber</div>
                                  <div className={`text-[11px] font-bold leading-tight ${pending > 0 ? "text-[hsl(45,95%,40%)]" : "text-success"}`}>{fmt(pending)}</div>
                                </div>
                                <div>
                                  <div className="text-[9px] text-muted-foreground leading-tight">Lucro</div>
                                  <div className={`text-[11px] font-bold leading-tight ${profit >= 0 ? "text-success" : "text-destructive"}`}>{fmt(profit)}</div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                      {colJobs.length === 0 && (
                        <div className="flex items-center justify-center h-20 text-[11px] text-muted-foreground/40">Sem obras</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {filteredJobs.length > 0 && view === "list" && (
          <div className="space-y-5">
            {ALL_JOB_STATUSES.map(status => {
              const groupJobs = filteredJobs
                .filter(j => ((j.status as JobStatus) || 'em_andamento') === status)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              if (groupJobs.length === 0) return null;
              const groupTotal = groupJobs.reduce((s, j) => s + j.saleValue, 0);
              return (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: JOB_STATUS_HEX[status] }} />
                    <span className="text-sm font-bold text-foreground">{JOB_STATUS_LABELS[status]}</span>
                    <span className="text-xs text-muted-foreground">({groupJobs.length}) — {fmt(groupTotal)}</span>
                  </div>
                  <div className="space-y-2">
                    {groupJobs.map((job, i) => {
                      const expenses = job.expenses.reduce((s, e) => s + e.value, 0);
                      const profit = job.saleValue - expenses;
                      return (
                        <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                          <Link to={`/app/obra/${job.id}`}>
                            <div className="bg-card rounded-xl p-4 shadow-card hover:shadow-elevated transition-shadow">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-foreground truncate">{job.clientName}</h3>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ml-2 ${JOB_STATUS_COLORS[status]}`}>
                                  {JOB_STATUS_LABELS[status]}
                                </span>
                              </div>
                              {job.description && <p className="text-sm text-muted-foreground truncate mb-1">{job.description}</p>}
                              <JobStepDots status={job.status} etapaMedicao={job.etapaMedicao} etapaPedirVidro={job.etapaPedirVidro} etapaFabricacao={job.etapaFabricacao} etapaInstalacao={job.etapaInstalacao} />
                              <div className="flex items-center gap-4 text-sm mt-2">
                                <span className="text-muted-foreground">Venda: <strong className="text-foreground">{fmt(job.saleValue)}</strong></span>
                                <span className="text-muted-foreground">Lucro: <strong className={profit >= 0 ? "text-success" : "text-destructive"}>{fmt(profit)}</strong></span>
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobsList;
