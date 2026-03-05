import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quote } from './types';

export function generateQuotePdf(quote: Quote, userWhatsapp?: string): jsPDF {
  const doc = new jsPDF();
  const co = quote.companyInfo;
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const date = new Date(quote.createdAt).toLocaleDateString('pt-BR');
  let y = 15;

  // Header
  if (co.name) {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(co.name.toUpperCase(), 105, y, { align: 'center' });
    y += 8;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const headerLines: string[] = [];
  if (co.address) headerLines.push(co.address);
  const cnpjPhone = [co.cnpjCpf ? `CNPJ/CPF: ${co.cnpjCpf}` : '', co.phone ? `Fone: ${co.phone}` : ''].filter(Boolean).join(' | ');
  if (cnpjPhone) headerLines.push(cnpjPhone);
  if (co.email) headerLines.push(co.email);
  headerLines.forEach(line => {
    doc.text(line, 105, y, { align: 'center' });
    y += 4;
  });

  y += 4;
  doc.setDrawColor(200);
  doc.line(15, y, 195, y);
  y += 8;

  // Client info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Cliente: ${quote.clientName}`, 15, y);
  doc.text(`Data: ${date}`, 195, y, { align: 'right' });
  y += 6;
  if (quote.jobType) {
    doc.setFont('helvetica', 'normal');
    doc.text(`Tipo: ${quote.jobType}`, 15, y);
    y += 6;
  }

  y += 4;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ORÇAMENTO', 105, y, { align: 'center' });
  y += 8;

  // Items table
  const tableBody = quote.items.map((item, i) => {
    const dims = item.width && item.height
      ? `${item.width}mm × ${item.height}mm (${(item.width * item.height / 1_000_000).toFixed(4)}m²)`
      : '';
    const desc = item.location
      ? `${item.description}\n${dims}\n📍 ${item.location}`
      : dims
        ? `${item.description}\n${dims}`
        : item.description;
    return [
      String(i + 1),
      desc,
      String(item.quantity),
      fmt(item.unitPrice),
      fmt(item.total),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['#', 'Descrição', 'Qtd.', 'Valor Unit.', 'Total']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [50, 60, 80], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: 15, right: 15 },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // Total
  doc.setFillColor(50, 60, 80);
  doc.rect(15, y, 180, 10, 'F');
  doc.setTextColor(255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('VALOR TOTAL:', 20, y + 7);
  doc.text(fmt(quote.total), 190, y + 7, { align: 'right' });
  doc.setTextColor(0);
  y += 18;

  // Terms
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('- PROPOSTA VÁLIDA POR 7 (SETE) DIAS ÚTEIS;', 15, y);
  y += 5;
  doc.text('- CONDIÇÕES DE PAGAMENTO A COMBINAR;', 15, y);
  y += 5;

  if (userWhatsapp) {
    doc.setFont('helvetica', 'normal');
    doc.text(`WhatsApp para contato: ${userWhatsapp}`, 15, y);
    y += 5;
  }

  if (quote.notes) {
    y += 3;
    doc.setFont('helvetica', 'normal');
    doc.text(`Obs: ${quote.notes}`, 15, y, { maxWidth: 170 });
    y += 10;
  }

  // Signature lines
  y = Math.max(y + 15, 250);
  doc.setDrawColor(0);
  doc.line(25, y, 95, y);
  doc.line(115, y, 185, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Cliente', 60, y, { align: 'center' });
  doc.text('Consultor(a) de vendas', 150, y, { align: 'center' });

  return doc;
}
