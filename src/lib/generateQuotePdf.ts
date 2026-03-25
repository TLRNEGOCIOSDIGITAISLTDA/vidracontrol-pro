import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quote } from './types';

// ── Encoding ────────────────────────────────────────────────────────────────
// jsPDF v4 com Helvetica suporta Latin-1 (U+0000–U+00FF).
// O maior risco é o Unicode vir em forma decomposta (NFD), onde "ã" é a+tilde
// como dois code-points. normalize('NFC') recompõe em um único char, que fica
// dentro do range Latin-1 e é renderizado corretamente pelo Helvetica.
function t(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFC')                        // recompõe chars acentuados
    .replace(/[\u2013\u2014]/g, '-')         // em-dash / en-dash → hífen
    .replace(/[\u2018\u2019\u02BC]/g, "'")   // aspas simples curvas → '
    .replace(/[\u201C\u201D]/g, '"')         // aspas duplas curvas → "
    .replace(/\u2026/g, '...')               // reticências → ...
    .replace(/[^\x00-\xFF]/g, '?');          // demais chars fora Latin-1 → ?
}

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

const NAVY   = [30, 41, 59]    as [number, number, number];
const ACCENT = [51, 102, 204]  as [number, number, number];
const LIGHT  = [241, 245, 249] as [number, number, number];
const WHITE  = [255, 255, 255] as [number, number, number];

export async function generateQuotePdf(quote: Quote, userWhatsapp?: string, displayUnit: 'cm' | 'mm' = 'mm'): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', putOnlyUsedFonts: true });

  // Garante que o font padrão é Helvetica com encoding Latin-1 desde o início
  doc.setFont('helvetica', 'normal');

  const co = quote.companyInfo;
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const date = new Date(quote.createdAt).toLocaleDateString('pt-BR');

  // Bug 1 fix: usa quoteNumber (preenchido via backfill em storage se necessário)
  const quoteNum = quote.quoteNumber ?? quote.id.slice(0, 8).toUpperCase();

  const hasCompanyData = !!(co.name || co.phone || co.email);

  const PW = 210, ML = 14, MR = 14, CW = PW - ML - MR;

  // ══════════════════════════════════════════════════════════════
  // CABEÇALHO — fundo navy, altura generosa
  // ══════════════════════════════════════════════════════════════
  const HEADER_H = 50;
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PW, HEADER_H, 'F');

  let logoBase64: string | null = null;
  if (co.logoUrl) logoBase64 = await loadImageBase64(co.logoUrl);

  const LOGO_W = 36, LOGO_H = 30;
  const LOGO_X = ML, LOGO_Y = (HEADER_H - LOGO_H) / 2;

  let textX = ML;
  if (logoBase64) {
    try {
      doc.setFillColor(...WHITE);
      doc.roundedRect(LOGO_X - 1, LOGO_Y - 1, LOGO_W + 2, LOGO_H + 2, 2, 2, 'F');
      doc.addImage(logoBase64, 'JPEG', LOGO_X, LOGO_Y, LOGO_W, LOGO_H);
      textX = LOGO_X + LOGO_W + 7;
    } catch { textX = ML; }
  }

  // Nome da empresa
  doc.setTextColor(...WHITE);
  if (co.name) {
    doc.setFontSize(17);
    doc.setFont('helvetica', 'bold');
    doc.text(t(co.name.toUpperCase()), textX, 17);
  }

  // Dados da empresa
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 220, 255);
  let cy = 24;
  const hline = (txt: string) => {
    if (!txt.trim()) return;
    doc.text(t(txt), textX, cy);
    cy += 4.8;
  };
  if (co.address) hline(co.address);
  hline([co.cnpjCpf ? `CNPJ/CPF: ${co.cnpjCpf}` : '', co.phone ? `Tel: ${co.phone}` : ''].filter(Boolean).join('   |   '));
  hline([co.email, (co as any).website].filter(Boolean).join('   |   '));

  // Número e data — canto direito do cabeçalho
  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Orcamento N: ${t(quoteNum)}`, PW - MR, 13, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Data: ${date}`, PW - MR, 19, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  // ══════════════════════════════════════════════════════════════
  // AVISO: empresa sem cadastro
  // ══════════════════════════════════════════════════════════════
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
    doc.setFont('helvetica', 'normal');
    y += 14;
  }

  // ══════════════════════════════════════════════════════════════
  // BLOCO DO CLIENTE — 2 colunas
  // ══════════════════════════════════════════════════════════════
  const CLIENT_H = quote.rtName ? 38 : 32;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(ML, y - 3, CW, CLIENT_H, 2, 2, 'F');

  // Títulos
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ACCENT);
  doc.text('DADOS DO CLIENTE', ML + 4, y + 3);
  doc.text('DADOS DO ORCAMENTO', ML + CW / 2 + 4, y + 3);

  // Divisória
  doc.setDrawColor(200, 210, 230);
  doc.setLineWidth(0.3);
  doc.line(ML + CW / 2, y, ML + CW / 2, y + CLIENT_H - 4);

  // Coluna esquerda
  doc.setTextColor(30, 30, 30);
  let ly = y + 10;
  ([
    ['Cliente:', t(quote.clientName)],
    ...(quote.clientPhone ? [['Telefone:', t(quote.clientPhone)]] : []),
    ...(quote.rtName ? [['Resp. Tecnico:', t(quote.rtName)]] : []),
  ] as [string, string][]).forEach(([label, val]) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(label, ML + 4, ly);
    doc.setFont('helvetica', 'normal');
    doc.text(val, ML + 4 + doc.getTextWidth(label) + 2, ly);
    ly += 6;
  });

  // Coluna direita
  const RX = ML + CW / 2 + 4;
  let ry = y + 10;
  ([
    ['N do Orcamento:', t(quoteNum)],
    ['Data:', date],
    ...(quote.jobType ? [['Tipo:', t(quote.jobType)]] : []),
  ] as [string, string][]).forEach(([label, val]) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(label, RX, ry);
    doc.setFont('helvetica', 'normal');
    doc.text(val, RX + doc.getTextWidth(label) + 2, ry);
    ry += 6;
  });

  y += CLIENT_H + 6;

  // ══════════════════════════════════════════════════════════════
  // TABELA DE ITENS
  // ══════════════════════════════════════════════════════════════
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('DESCRICAO DOS ITENS', ML, y);
  y += 3;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  const tableBody = quote.items.map((item, i) => {
    const hasDims = item.width && item.height;
    const area = hasDims ? (item.width! * item.height! / 1_000_000) : null;
    // Converte mm armazenado para a unidade de exibição escolhida
    const dw = hasDims ? (displayUnit === 'cm' ? item.width! / 10 : item.width!) : 0;
    const dh = hasDims ? (displayUnit === 'cm' ? item.height! / 10 : item.height!) : 0;
    const dimStr = hasDims ? `${dw}${displayUnit} x ${dh}${displayUnit}\n(${area!.toFixed(4)} m2)` : '-';
    const loc = item.location ? `\nLocal: ${t(item.location)}` : '';
    const desc = t(item.description) + loc;
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
    // Bug 2 fix: font explícito em todas as seções do autoTable
    styles: {
      font: 'helvetica',
      fontStyle: 'normal',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: NAVY,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
      font: 'helvetica',
    },
    bodyStyles: {
      fontSize: 9,
      valign: 'middle',
      font: 'helvetica',
      fontStyle: 'normal',
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 9,  halign: 'center' },
      2: { cellWidth: 30, halign: 'center', fontSize: 8 },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    // Bug 2 fix: garante que o font é resetado para Helvetica em cada célula
    didParseCell: (data) => {
      data.cell.styles.font = 'helvetica';
    },
    margin: { left: ML, right: MR },
  });

  y = (doc as any).lastAutoTable.finalY + 4;

  // ══════════════════════════════════════════════════════════════
  // TOTAL
  // ══════════════════════════════════════════════════════════════
  doc.setFillColor(...NAVY);
  doc.roundedRect(ML, y, CW, 12, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('VALOR TOTAL:', ML + 5, y + 8);
  doc.text(fmt(quote.total), PW - MR - 3, y + 8, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  y += 18;

  // ══════════════════════════════════════════════════════════════
  // CONDIÇÕES
  // ══════════════════════════════════════════════════════════════
  const condLines = [
    '* Proposta valida por 7 (sete) dias uteis.',
    '* Condicoes de pagamento: a combinar.',
    ...(userWhatsapp ? [`* WhatsApp para contato: ${t(userWhatsapp)}`] : []),
    ...(quote.notes ? [`* Obs.: ${t(quote.notes)}`] : []),
  ];

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
    doc.text(line, ML + 4, y + 9 + idx * 5.5);
  });
  y += condH + 8;

  // ══════════════════════════════════════════════════════════════
  // ASSINATURAS
  // ══════════════════════════════════════════════════════════════
  if (y > 258) { doc.addPage(); y = 20; }
  else y = Math.max(y, 258);

  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(ML + 5, y, ML + 75, y);
  doc.line(PW - MR - 75, y, PW - MR - 5, y);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Cliente', ML + 40, y + 5, { align: 'center' });
  doc.text(t(co.name || 'Empresa'), PW - MR - 40, y + 5, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text(
    `Gerado em ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    PW / 2, 292, { align: 'center' },
  );

  return doc;
}
