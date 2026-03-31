import { Ruler, ShoppingCart, Wrench, HardHat, CheckCircle2 } from "lucide-react";
import { Job } from "@/lib/types";
import { updateJob } from "@/lib/storage";
import { toast } from "sonner";

// Todas as constantes declaradas no topo do módulo, antes do componente
type StepKey = 'etapaMedicao' | 'etapaPedirVidro' | 'etapaFabricacao' | 'etapaInstalacao';

type StepDef = {
  key: StepKey;
  label: string;
  Icon: React.ElementType;
};

const STEPS: StepDef[] = [
  { key: 'etapaMedicao',    label: 'Medição',                Icon: Ruler        },
  { key: 'etapaPedirVidro', label: 'Pedido do Vidro',        Icon: ShoppingCart },
  { key: 'etapaFabricacao', label: 'Fabricação do Alumínio', Icon: Wrench       },
  { key: 'etapaInstalacao', label: 'Instalação',             Icon: HardHat      },
];

interface JobStagesProps {
  job: Job;
  onReload: () => Promise<void>;
}

export function JobStages({ job, onReload }: JobStagesProps) {
  const done = STEPS.filter(s => !!job[s.key]).length;
  const allDone = done === STEPS.length;
  const nextStep = STEPS.find(s => !job[s.key]);

  const handleToggle = async (key: StepKey) => {
    const next = !job[key];
    await updateJob(job.id, { [key]: next });
    await onReload();
    const stepLabel = STEPS.find(s => s.key === key)!.label;
    toast.success(next ? `${stepLabel}: concluída!` : 'Etapa desmarcada');
  };

  return (
    <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Etapas da Obra</h3>
        <span className="text-xs font-medium text-muted-foreground">{done}/4 concluídas</span>
      </div>

      {/* Barra de progresso */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${(done / 4) * 100}%`,
            backgroundColor: allDone ? 'hsl(var(--success))' : 'hsl(var(--primary))',
          }}
        />
      </div>

      {/* Cards de etapa — 2 colunas no mobile para texto legível */}
      <div className="grid grid-cols-2 gap-2">
        {STEPS.map((step, idx) => {
          const isDone = !!job[step.key];
          const isCurrent = !isDone && STEPS.slice(0, idx).every(s => !!job[s.key]);
          const { Icon } = step;

          return (
            <button
              key={step.key}
              type="button"
              onClick={() => handleToggle(step.key)}
              className={`
                flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left
                transition-all duration-200 border
                ${isDone
                  ? 'bg-success/10 border-success/30 text-success'
                  : isCurrent
                  ? 'bg-primary/10 border-primary/40 text-primary ring-1 ring-primary/20'
                  : 'bg-muted/40 border-border/30 text-muted-foreground'
                }
              `}
            >
              {/* Ícone ou check */}
              <span className="shrink-0">
                {isDone
                  ? <CheckCircle2 className="h-4 w-4" />
                  : <Icon className="h-4 w-4" />
                }
              </span>

              {/* Texto */}
              <span className="text-[11px] font-semibold leading-tight">{step.label}</span>
            </button>
          );
        })}
      </div>

      {/* Texto auxiliar */}
      <p className={`text-[11px] font-medium text-center transition-colors ${allDone ? 'text-success' : 'text-muted-foreground'}`}>
        {allDone
          ? 'Etapas concluídas. Obra pronta para entrega.'
          : nextStep
          ? `Próxima etapa: ${nextStep.label}`
          : null
        }
      </p>
    </div>
  );
}
