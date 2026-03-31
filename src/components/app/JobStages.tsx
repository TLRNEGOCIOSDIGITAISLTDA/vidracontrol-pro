import { Job } from "@/lib/types";
import { updateJob } from "@/lib/storage";
import { toast } from "sonner";

// Todas as constantes declaradas no topo do módulo, antes do componente
type StepKey = 'etapaMedicao' | 'etapaPedirVidro' | 'etapaFabricacao' | 'etapaInstalacao';

const STEPS: { key: StepKey; label: string; short: string }[] = [
  { key: 'etapaMedicao',    label: 'Medição',                short: 'Medição' },
  { key: 'etapaPedirVidro', label: 'Pedido do Vidro',        short: 'Pedido do Vidro' },
  { key: 'etapaFabricacao', label: 'Fabricação do Alumínio', short: 'Fabricação do Alumínio' },
  { key: 'etapaInstalacao', label: 'Instalação',             short: 'Instalação' },
];

interface JobStagesProps {
  job: Job;
  onReload: () => Promise<void>;
}

export function JobStages({ job, onReload }: JobStagesProps) {
  const done = STEPS.filter(s => !!job[s.key]).length;

  const handleToggle = async (key: StepKey) => {
    const next = !job[key];
    await updateJob(job.id, { [key]: next });
    await onReload();
    const stepLabel = STEPS.find(s => s.key === key)!.label;
    toast.success(next ? `${stepLabel}: concluída!` : 'Etapa desmarcada');
  };

  return (
    <div className="bg-card rounded-xl p-4 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground">Etapas da Obra</h3>
        <span className="text-xs text-muted-foreground">{done}/4 concluídas</span>
      </div>

      <div className="h-1.5 bg-muted rounded-full mb-3 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${(done / 4) * 100}%` }}
        />
      </div>

      <div className="grid grid-cols-4 gap-2">
        {STEPS.map((step, idx) => {
          const isDone = !!job[step.key];
          const isNext = !isDone && STEPS.slice(0, idx).every(s => !!job[s.key]);
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => handleToggle(step.key)}
              className={`flex flex-col items-center gap-1.5 rounded-lg px-1.5 py-2.5 text-center transition-colors border ${
                isDone
                  ? 'bg-success/10 border-success/30 text-success'
                  : isNext
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-muted/40 border-border/30 text-muted-foreground'
              }`}
            >
              <span className="text-sm font-bold leading-none">{isDone ? '✓' : String(idx + 1)}</span>
              <span className="text-[9px] font-semibold leading-tight break-words hyphens-auto w-full">{step.short}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
