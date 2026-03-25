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

export type JobStatus = 'a_iniciar' | 'em_andamento' | 'aguardando_pagamento' | 'concluido';

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  a_iniciar: 'A Iniciar',
  em_andamento: 'Em Andamento',
  aguardando_pagamento: 'Aguard. Pagamento',
  concluido: 'Finalizada',
};

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  a_iniciar: 'bg-muted text-muted-foreground',
  em_andamento: 'bg-primary/10 text-primary',
  aguardando_pagamento: 'bg-[hsl(45,95%,50%)]/10 text-[hsl(45,95%,40%)]',
  concluido: 'bg-success/10 text-success',
};

export type PaymentMethod = 'Pix' | 'Dinheiro' | 'Cartão';

export const PAYMENT_METHODS: PaymentMethod[] = ['Pix', 'Dinheiro', 'Cartão'];

export interface JobPayment {
  id: string;
  jobId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: string;
}

export interface Job {
  id: string;
  clientName: string;
  description: string;
  saleValue: number;
  status: JobStatus;
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

export interface AddressFields {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
}

export interface CompanyInfo {
  name: string;
  cnpjCpf: string;
  phone: string;
  email: string;
  address: string; // string formatada para exibição/PDF
  website?: string;
  logoUrl?: string;
  addressFields?: AddressFields; // campos estruturados (salvo como JSON em address)
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
  /** Unidade de medida padrão: 'cm' ou 'mm' */
  defaultUnit: 'cm' | 'mm';
}

export interface RT {
  id: string;
  userId: string;
  name: string;
  whatsapp: string;
  email: string;
  defaultPercentage: number;
  active: boolean;
  createdAt: string;
}

export type ProductCategory = 'Vidro' | 'Espelho' | 'Esquadria' | 'Mão de Obra' | 'Outro';

export const PRODUCT_CATEGORIES: ProductCategory[] = ['Vidro', 'Espelho', 'Esquadria', 'Mão de Obra', 'Outro'];

export const PRODUCT_UNITS = ['m²', 'unidade', 'hora', 'metro', 'kit', 'par'];

export const PRODUCT_CATEGORY_COLORS: Record<ProductCategory, string> = {
  'Vidro': 'bg-blue-100 text-blue-700',
  'Espelho': 'bg-purple-100 text-purple-700',
  'Esquadria': 'bg-orange-100 text-orange-700',
  'Mão de Obra': 'bg-green-100 text-green-700',
  'Outro': 'bg-gray-100 text-gray-600',
};

export interface Product {
  id: string;
  userId: string;
  name: string;
  unit: string;
  unitPrice: number;
  category: ProductCategory;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  id: string;
  quoteNumber?: string; // ex: "001/26"
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
  /** Nome do Responsável Técnico / Escritório */
  rtName?: string;
}
