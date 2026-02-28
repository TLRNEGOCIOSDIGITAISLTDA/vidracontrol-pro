export interface Expense {
  id: string;
  jobId: string;
  description: string;
  category: ExpenseCategory;
  value: number;
  photoUrl?: string;
  createdAt: string;
}

export type ExpenseCategory = 
  | 'material'
  | 'transporte'
  | 'alimentacao'
  | 'ferramenta'
  | 'ajudante'
  | 'outros';

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  material: 'Material',
  transporte: 'Transporte',
  alimentacao: 'Alimentação',
  ferramenta: 'Ferramenta',
  ajudante: 'Ajudante',
  outros: 'Outros',
};

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  material: 'hsl(215, 80%, 45%)',
  transporte: 'hsl(35, 95%, 55%)',
  alimentacao: 'hsl(145, 60%, 42%)',
  ferramenta: 'hsl(280, 60%, 50%)',
  ajudante: 'hsl(170, 60%, 40%)',
  outros: 'hsl(0, 0%, 50%)',
};

export interface Job {
  id: string;
  clientName: string;
  description: string;
  saleValue: number;
  status: 'em_andamento' | 'concluido';
  createdAt: string;
  expenses: Expense[];
}

export type QuoteItemType =
  | 'vidro_comum'
  | 'vidro_temperado'
  | 'vidro_laminado'
  | 'esquadria_aluminio'
  | 'cobertura'
  | 'box'
  | 'espelho'
  | 'espelho_led'
  | 'personalizado';

export const QUOTE_ITEM_LABELS: Record<QuoteItemType, string> = {
  vidro_comum: 'Vidro Comum',
  vidro_temperado: 'Vidro Temperado',
  vidro_laminado: 'Vidro Laminado',
  esquadria_aluminio: 'Esquadria de Alumínio',
  cobertura: 'Cobertura',
  box: 'Box',
  espelho: 'Espelho',
  espelho_led: 'Espelho com LED',
  personalizado: 'Personalizado',
};

export interface QuoteItem {
  id: string;
  type: QuoteItemType;
  description: string;
  location?: string;
  width?: number;
  height?: number;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CompanyInfo {
  name: string;
  cnpjCpf: string;
  phone: string;
  email: string;
  address: string;
  logoUrl?: string;
}

export type QuoteStatus = 'orcado' | 'enviado' | 'aguardando' | 'fechado' | 'perdido';

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  orcado: 'Orçado',
  enviado: 'Enviado',
  aguardando: 'Aguardando Aprovação',
  fechado: 'Fechado',
  perdido: 'Perdido',
};

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  orcado: 'hsl(45, 95%, 50%)',
  enviado: 'hsl(215, 80%, 55%)',
  aguardando: 'hsl(25, 90%, 55%)',
  fechado: 'hsl(145, 60%, 42%)',
  perdido: 'hsl(0, 70%, 50%)',
};

export const QUOTE_STATUS_BG: Record<QuoteStatus, string> = {
  orcado: 'bg-[hsl(45,95%,50%)]/10 text-[hsl(45,95%,40%)]',
  enviado: 'bg-[hsl(215,80%,55%)]/10 text-[hsl(215,80%,45%)]',
  aguardando: 'bg-[hsl(25,90%,55%)]/10 text-[hsl(25,90%,45%)]',
  fechado: 'bg-success/10 text-success',
  perdido: 'bg-destructive/10 text-destructive',
};

export type QuoteCostCategory = 'material' | 'mao_de_obra' | 'frete' | 'outros';

export const QUOTE_COST_CATEGORY_LABELS: Record<QuoteCostCategory, string> = {
  material: 'Material',
  mao_de_obra: 'Mão de obra',
  frete: 'Frete',
  outros: 'Outros',
};

export interface QuoteCost {
  id: string;
  quoteId: string;
  description: string;
  category: QuoteCostCategory;
  value: number;
  date: string;
  createdAt: string;
}

export interface Quote {
  id: string;
  clientName: string;
  jobType: string;
  items: QuoteItem[];
  total: number;
  companyInfo: CompanyInfo;
  createdAt: string;
  notes?: string;
  status?: QuoteStatus;
  costs?: QuoteCost[];
}
