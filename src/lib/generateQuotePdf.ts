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

// Remove caracteres fora do Latin-1 para evitar encoding corrompido no jsPDF
function safe(str: string): string {
  return str
    .replace(/[\u2013\u2014]/g, '-')   // em-dash, en-dash
    .replace(/[\u2018\u2019]/g, "'")   // aspas curvas simples
    .replace(/[\u201C\u201D]/g, '"')   // aspas curvas duplas
    .replace(/[^\x00-\xFF]/g, '?');    // demais chars fora Latin-1
}

const NAVY   = [30, 41, 59]    as const;
const ACCENT = [51, 102, 204]  as const;
const LIGHT  = [241, 245, 249] as const;
const WHITE  = [255, 255, 255] as const;

export async function generateQuotePdf(quote: Quote, userWhatsapp?: string): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const co = quote.companyInfo;
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const date = new Date(quote.createdAt).toLocaleDateString('pt-BR');
  const quoteNum = quote.quoteNumber || quote.id.slice(0, 8).toUpperCase();
  const hasCompanyData = !!(co.name || co.phone || co.email);

  const PW = 210;
  const ML = 14;
  const MR = 14;
  const CW = PW - ML - MR; // 182mm

  // =====================================================
  // CABECALHO — fundo navy, altura generosa
  // =====================================================
  const HEADER_H = 50;
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PW, HEADER_H, 'F');

  // Logo
  let logoBase64: string | null = null;
  if (co.logoUrl) logoBase64 = await loadImageBase64(co.logoUrl);

  const LOGO_W = 36;
  const LOGO_H = 30;
  const LOGO_X = ML;
  const LOGO_Y = (HEADER_H - LOGO_H) / 2;  // centralizado verticalmente

  let textX = ML;
  if (logoBase64) {
    try {
      // Fundo branco arredondado para o logo
      doc.setFillColor(...WHITE);
      doc.roundedRect(LOGO_X - 1, LOGO_Y - 1, LOGO_W + 2, LOGO_H + 2, 2, 2, 'F');
      doc.addImage(logoBase64, 'JPEG', LOGO_X, LOGO_Y, LOGO_W, LOGO_H);
      textX = LOGO_X + LOGO_W + 7;
    } catch {
      textX = ML;
    }
  }

  // Nome da empresa — fonte grande
  doc.setTextColor(...WHITE);
  const nameX = textX;
  const nameY = 17;
  if (co.name) {
    doc.setFontSize(17);
    doc.setFont('helvetica', 'bold');
    doc.text(safe(co.name.toUpperCase()), nameX, nameY);
  }

  // Dados da empresa abaixo do nome
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 220, 255);
  let cy = nameY + 6;
  const hline = (txt: string) => {
    if (!txt.trim()) return;
    doc.text(safe(txt), nameX, cy);
    cy += 4.8;
  };

  if (co.address) hline(co.address);
  const cnpjPhone = [
    co.cnpjCpf ? `CNPJ/CPF: ${co.cnpjCpf}` : '',
    co.phone   ? `Tel: ${co.phone}`          : '',
  ].filter(Boolean).join('   |   ');
  hline(cnpjPhone);
  const emailSite = [co.email, (co as any).website].filter(Boolean).join('   |   ');
  hline(emailSite);

  // Numero do orcamento e data — canto superior direito do cabecalho
  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Orcamento N: ${quoteNum}`, PW - MR, 13, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Data: ${date}`, PW - MR, 19, { align: 'right' });

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
    y += 14;
  }

  // =====================================================
  // BLOCO DO CLIENTE — 2 colunas
  // =====================================================
  const CLIENT_H = 32;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(ML, y - 3, CW, CLIENT_H, 2, 2, 'F');

  // Titulo
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ACCENT);
  doc.text('DADOS DO CLIENTE', ML + 4, y + 3);
  doc.text('DADOS DO ORCAMENTO', ML + CW / 2 + 4, y + 3);

  // Linha divisoria vertical
  doc.setDrawColor(200, 210, 230);
  doc.setLineWidth(0.3);
  doc.line(ML + CW / 2, y, ML + CW / 2, y + CLIENT_H - 4);

  // Coluna esquerda
  doc.setFontSize(9.5);
  doc.setTextColor(30, 30, 30);
  let ly = y + 10;
  const clientRows: [string, string][] = [
    ['Cliente:', safe(quote.clientName)],
    ...(quote.clientPhone ? [['Telefone:', safe(quote.clientPhone)] as [string, string]] : []),
  ];
  clientRows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, ML + 4, ly);
    doc.setFont('helvetica', 'normal');
    doc.text(val, ML + 22, ly);
    ly += 6;
  });

  // Coluna direita
  const RX = ML + CW / 2 + 4;
  let ry = y + 10;
  const rightRows: [string, string][] = [
    ['N do Orcamento:', quoteNum],
    ['Data:', date],
    ...(quote.jobType ? [['Tipo:', safe(quote.jobType)] as [string, string]] : []),
  ];
  rightRows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, RX, ry);
    doc.setFont('helvetica', 'normal');
    const labelW = doc.getTextWidth(label);
    doc.text(val, RX + labelW + 2, ry);
    ry += 6;
  });

  y += CLIENT_H + 6;

  // =====================================================
  // TABELA DE ITENS
  // =====================================================
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('DESCRICAO DOS ITENS', ML, y);
  y += 3;
  doc.setTextColor(0, 0, 0);

  const tableBody = quote.items.map((item, i) => {
    const hasDims = item.width && item.height;
    const area = hasDims ? (item.width! * item.height! / 1_000_000) : null;
    // Sem emoji — encoding-safe
    const dimStr = hasDims
      ? `${item.width}mm x ${item.height}mm\n(${area!.toFixed(4)} m2)`
      : '-';
    const loc = item.location ? `\nLocal: ${safe(item.location)}` : '';
    const desc = safe(item.description) + loc;
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
    head: [['#', 'Descricao', 'Dimensoes', 'Qtd.', 'Valor Unit.', 'Total']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [...NAVY] as [number, number, number],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
    },
    bodyStyles: { fontSize: 9, valign: 'middle' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 9,  halign: 'center' },
      2: { cellWidth: 30, halign: 'center', fontSize: 8 },
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
  doc.roundedRect(ML, y, CW, 12, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('VALOR TOTAL:', ML + 5, y + 8);
  doc.text(fmt(quote.total), PW - MR - 3, y + 8, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 18;

  // =====================================================
  // CONDICOES / OBSERVACOES
  // =====================================================
  const condLines: string[] = [
    '* Proposta valida por 7 (sete) dias uteis.',
    '* Condicoes de pagamento: a combinar.',
  ];
  if (userWhatsapp) condLines.push(`* WhatsApp para contato: ${safe(userWhatsapp)}`);
  if (quote.notes)  condLines.push(`* Obs.: ${safe(quote.notes)}`);

  const condH = condLines.length * 5.5 + 12;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(ML, y - 3, CW, condH, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ACCENT);
  doc.text('CONDICOES GERAIS', ML + 4, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  condLines.forEach((line, idx) => {
    doc.text(safe(line), ML + 4, y + 9 + idx * 5.5);
  });
  y += condH + 8;

  // =====================================================
  // ASSINATURAS
  // =====================================================
  if (y > 258) { doc.addPage(); y = 20; }
  else y = Math.max(y, 258);

  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(ML + 5,      y, ML + 75,          y);
  doc.line(PW - MR - 75, y, PW - MR - 5,     y);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Cliente', ML + 40, y + 5, { align: 'center' });
  doc.text(safe(co.name || 'Empresa'), PW - MR - 40, y + 5, { align: 'center' });

  // Rodape
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text(
    `Gerado em ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    PW / 2, 292, { align: 'center' },
  );

  return doc;
}
