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
  | 'mao_de_obra'
  | 'transporte'
  | 'comissao'
  | 'nf'
  | 'outros';

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  material: 'Material',
  mao_de_obra: 'Mão de obra',
  transporte: 'Transporte',
  comissao: 'Comissão',
  nf: 'Nota Fiscal',
  outros: 'Outros',
};

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  material: 'hsl(215, 80%, 45%)',
  mao_de_obra: 'hsl(280, 60%, 50%)',
  transporte: 'hsl(35, 95%, 55%)',
  comissao: 'hsl(160, 60%, 40%)',
  nf: 'hsl(200, 70%, 45%)',
  outros: 'hsl(0, 0%, 50%)',
};

export interface JobItem {
  id: string;
  type: QuoteItemType;
  description: string;
  width?: number;
  height?: number;
  quantity: number;
  unitPrice: number;
  total: number;
  area?: number;
}

export interface Job {
  id: string;
  clientName: string;
  description: string;
  saleValue: number;
  status: 'em_andamento' | 'concluido';
  createdAt: string;
  expenses: Expense[];
  items?: JobItem[];
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

export type QuoteStatus = 'orcado' | 'enviado' | 'aguardando' | 'aprovado' | 'perdido';

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  orcado: 'Orçado',
  enviado: 'Enviado',
  aguardando: 'Aguardando',
  aprovado: 'Aprovado',
  perdido: 'Perdido',
};

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  orcado: 'hsl(45, 95%, 50%)',
  enviado: 'hsl(215, 80%, 55%)',
  aguardando: 'hsl(25, 90%, 55%)',
  aprovado: 'hsl(145, 60%, 42%)',
  perdido: 'hsl(0, 70%, 50%)',
};

export const QUOTE_STATUS_BG: Record<QuoteStatus, string> = {
  orcado: 'bg-[hsl(45,95%,50%)]/10 text-[hsl(45,95%,40%)]',
  enviado: 'bg-[hsl(215,80%,55%)]/10 text-[hsl(215,80%,45%)]',
  aguardando: 'bg-[hsl(25,90%,55%)]/10 text-[hsl(25,90%,45%)]',
  aprovado: 'bg-success/10 text-success',
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

export interface UserProfile {
  id: string;
  userId: string;
  whatsapp: string;
  fullName: string;
}

export interface Quote {
  id: string;
  clientName: string;
  clientPhone?: string;
  jobType: string;
  items: QuoteItem[];
  total: number;
  companyInfo: CompanyInfo;
  createdAt: string;
  notes?: string;
  status?: QuoteStatus;
  costs?: QuoteCost[];
  /** Comissão em % sobre o total da obra */
  commission?: number;
  /** % da Nota Fiscal sobre o total da obra */
  nfPercent?: number;
}
