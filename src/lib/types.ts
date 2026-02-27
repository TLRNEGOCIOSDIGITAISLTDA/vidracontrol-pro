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

export interface Quote {
  id: string;
  clientName: string;
  jobType: string;
  items: QuoteItem[];
  total: number;
  companyInfo: CompanyInfo;
  createdAt: string;
  notes?: string;
}
