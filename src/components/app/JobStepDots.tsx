// Componente puramente presentacional — sem imports de lib/types ou lib/storage
// para evitar qualquer risco de dependência circular ou TDZ.

interface JobStepDotsProps {
  status: string;
  etapaMedicao?: boolean;
  etapaPedirVidro?: boolean;
  etapaFabricacao?: boolean;
  etapaInstalacao?: boolean;
}

export function JobStepDots({
  status,
  etapaMedicao,
  etapaPedirVidro,
  etapaFabricacao,
  etapaInstalacao,
}: JobStepDotsProps) {
  if (status === 'finalizado') return null;

  const steps = [etapaMedicao, etapaPedirVidro, etapaFabricacao, etapaInstalacao];
  const done = steps.filter(Boolean).length;

  return (
    <div className="flex items-center gap-1 mt-1">
      {steps.map((s, i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${s ? 'bg-success' : 'bg-muted-foreground/25'}`}
        />
      ))}
      <span className="text-[9px] text-muted-foreground ml-0.5">{done}/4</span>
    </div>
  );
}
