import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quote } from './types';

async function loadImageBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const NAVY = [30, 41, 59] as const;   // cabeçalho escuro
const ACCENT = [51, 102, 204] as const; // azul médio
const LIGHT = [241, 245, 249] as const; // cinza muito claro

export async function generateQuotePdf(quote: Quote, userWhatsapp?: string): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const co = quote.companyInfo;
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const date = new Date(quote.createdAt).toLocaleDateString('pt-BR');
  const quoteNum = quote.id.slice(0, 8).toUpperCase();
  const hasCompanyData = !!(co.name || co.phone || co.email);

  const PW = 210;
  const ML = 14;
  const MR = 14;
  const CW = PW - ML - MR; // largura útil = 182mm

  // =====================================================
  // CABEÇALHO — fundo navy
  // =====================================================
  const HEADER_H = 38;
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PW, HEADER_H, 'F');

  let logoBase64: string | null = null;
  if (co.logoUrl) {
    logoBase64 = await loadImageBase64(co.logoUrl);
  }

  let textX = ML;
  const LOGO_W = 28;
  const LOGO_H = 28;
  const LOGO_Y = (HEADER_H - LOGO_H) / 2;

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'JPEG', ML, LOGO_Y, LOGO_W, LOGO_H);
      textX = ML + LOGO_W + 5;
    } catch {
      textX = ML;
    }
  }

  // Nome da empresa
  doc.setTextColor(255, 255, 255);
  if (co.name) {
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(co.name.toUpperCase(), textX, 11);
  }

  // Info da empresa (CNPJ, endereço, contato)
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  let cy = 16.5;
  const addHeaderLine = (txt: string) => {
    if (!txt) return;
    doc.text(txt, textX, cy);
    cy += 4;
  };
  if (co.address) addHeaderLine(co.address);
  const cnpjPhone = [
    co.cnpjCpf ? `CNPJ/CPF: ${co.cnpjCpf}` : '',
    co.phone ? `Tel: ${co.phone}` : '',
  ].filter(Boolean).join('  |  ');
  addHeaderLine(cnpjPhone);
  const emailSite = [co.email, co.website].filter(Boolean).join('  |  ');
  addHeaderLine(emailSite);

  // =====================================================
  // NÚMERO E DATA DO ORÇAMENTO (direita do cabeçalho)
  // =====================================================
  doc.setTextColor(200, 220, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Orçamento Nº: ${quoteNum}`, PW - MR, 10, { align: 'right' });
  doc.text(`Data: ${date}`, PW - MR, 15, { align: 'right' });

  doc.setTextColor(0, 0, 0);

  // =====================================================
  // AVISO SE SEM DADOS DA EMPRESA
  // =====================================================
  let y = HEADER_H + 7;

  if (!hasCompanyData) {
    doc.setFillColor(255, 245, 200);
    doc.setDrawColor(220, 180, 0);
    doc.roundedRect(ML, y - 4, CW, 10, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(160, 110, 0);
    doc.text('Complete seus dados na aba Perfil para gerar o PDF completo.', ML + 4, y + 2);
    doc.setTextColor(0, 0, 0);
    y += 13;
  }

  // =====================================================
  // BLOCO DO CLIENTE
  // =====================================================
  doc.setFillColor(...LIGHT);
  doc.roundedRect(ML, y - 3, CW, 22, 2, 2, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ACCENT);
  doc.text('DADOS DO CLIENTE', ML + 4, y + 2);

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Cliente: ${quote.clientName}`, ML + 4, y + 8);
  const clientInfo2 = [
    quote.clientPhone ? `Telefone: ${quote.clientPhone}` : '',
    quote.jobType ? `Tipo: ${quote.jobType}` : '',
  ].filter(Boolean).join('    ');
  if (clientInfo2) doc.text(clientInfo2, ML + 4, y + 14);

  y += 27;

  // =====================================================
  // TÍTULO ORÇAMENTO
  // =====================================================
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('DESCRIÇÃO DOS ITENS', ML, y);
  y += 4;
  doc.setTextColor(0, 0, 0);

  // =====================================================
  // TABELA DE ITENS
  // =====================================================
  const tableBody = quote.items.map((item, i) => {
    const hasDims = item.width && item.height;
    const area = hasDims ? (item.width! * item.height! / 1_000_000) : null;
    const dimStr = hasDims
      ? `${item.width}mm × ${item.height}mm\n(${area!.toFixed(4)} m²)`
      : '-';
    const desc = item.location ? `${item.description}\n📍 ${item.location}` : item.description;
    return [
      String(i + 1),
      desc,
      dimStr,
      String(item.quantity),
      fmt(item.unitPrice),
      fmt(item.total),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['#', 'Descrição', 'Dimensões', 'Qtd.', 'Valor Unit.', 'Total']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [...NAVY] as [number, number, number],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    bodyStyles: { fontSize: 8.5, valign: 'middle' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      2: { cellWidth: 28, halign: 'center', fontSize: 7.5 },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: ML, right: MR },
  });

  y = (doc as any).lastAutoTable.finalY + 4;

  // =====================================================
  // TOTAL
  // =====================================================
  doc.setFillColor(...NAVY);
  doc.roundedRect(ML, y, CW, 11, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('VALOR TOTAL:', ML + 5, y + 7.5);
  doc.text(fmt(quote.total), PW - MR - 3, y + 7.5, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 17;

  // =====================================================
  // CONDIÇÕES / OBSERVAÇÕES
  // =====================================================
  const condLines: string[] = [
    '• Proposta válida por 7 (sete) dias úteis.',
    '• Condições de pagamento: a combinar.',
  ];
  if (userWhatsapp) condLines.push(`• WhatsApp para contato: ${userWhatsapp}`);
  if (quote.notes) condLines.push(`• Obs.: ${quote.notes}`);

  const condH = condLines.length * 5 + 10;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(ML, y - 3, CW, condH, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ACCENT);
  doc.text('CONDIÇÕES GERAIS', ML + 4, y + 2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  condLines.forEach((line, idx) => {
    doc.text(line, ML + 4, y + 7 + idx * 5);
  });
  y += condH + 8;

  // =====================================================
  // ASSINATURAS
  // =====================================================
  if (y > 255) {
    doc.addPage();
    y = 20;
  } else {
    y = Math.max(y, 255);
  }
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(ML + 5, y, ML + 75, y);
  doc.line(PW - MR - 75, y, PW - MR - 5, y);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Cliente', ML + 40, y + 5, { align: 'center' });
  doc.text(co.name || 'Empresa', PW - MR - 40, y + 5, { align: 'center' });

  // Rodapé
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    PW / 2, 292, { align: 'center' }
  );

  return doc;
}
