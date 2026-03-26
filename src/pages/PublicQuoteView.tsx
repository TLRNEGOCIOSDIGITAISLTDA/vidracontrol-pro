import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Quote, CompanyInfo, QuoteItem } from "@/lib/types";
import { generateQuotePdf } from "@/lib/generateQuotePdf";
import { Button } from "@/components/ui/button";
import { Download, AlertTriangle, FileX } from "lucide-react";

const PublicQuoteView = () => {
  const { id } = useParams();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }

    (async () => {
      const { data: row, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !row) { setNotFound(true); setLoading(false); return; }

      const { data: items } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', id);

      const q: Quote = {
        id: row.id,
        quoteNumber: (row as any).quote_number || undefined,
        clientName: row.client_name,
        clientPhone: (row as any).client_phone || '',
        jobType: row.job_type || '',
        total: Number(row.total),
        companyInfo: (row.company_info as unknown as CompanyInfo) || { name: '', cnpjCpf: '', phone: '', email: '', address: '' },
        createdAt: row.created_at,
        notes: row.notes || undefined,
        status: (row.status as any) || 'orcado',
        items: (items || []).map((i: any) => ({
          id: i.id,
          type: i.type,
          description: i.description,
          location: i.location || undefined,
          width: i.width ? Number(i.width) : undefined,
          height: i.height ? Number(i.height) : undefined,
          quantity: i.quantity,
          unitPrice: Number(i.unit_price),
          total: Number(i.total),
        })),
      };
      setQuote(q);
      setLoading(false);
    })();
  }, [id]);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleDownloadPdf = async () => {
    if (!quote) return;
    const doc = await generateQuotePdf(quote);
    doc.save(`orcamento-${quote.clientName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  };

  // Check if expired (7 business days ≈ 10 calendar days)
  const isExpired = quote
    ? (Date.now() - new Date(quote.createdAt).getTime()) > 10 * 24 * 60 * 60 * 1000
    : false;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(210,20%,98%)]">
        <div className="animate-pulse text-[hsl(215,10%,45%)] text-lg">Carregando orçamento...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(210,20%,98%)] px-4">
        <FileX className="h-16 w-16 text-[hsl(0,72%,55%)] mb-4" />
        <h1 className="text-2xl font-bold text-[hsl(215,25%,15%)] mb-2">Orçamento não encontrado</h1>
        <p className="text-[hsl(215,10%,45%)]">O link pode estar incorreto ou o orçamento foi removido.</p>
      </div>
    );
  }

  if (!quote) return null;

  const co = quote.companyInfo;
  const date = new Date(quote.createdAt).toLocaleDateString("pt-BR");

  return (
    <div className="min-h-screen bg-[hsl(210,20%,98%)] py-4 px-2 sm:py-8 sm:px-4">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Expiry alert */}
        {isExpired && (
          <div className="flex items-center gap-3 bg-[hsl(35,95%,55%)]/10 border border-[hsl(35,95%,55%)]/30 rounded-lg px-4 py-3 text-sm text-[hsl(25,90%,35%)]">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span className="font-semibold">Este orçamento está expirado. Entre em contato para renovação.</span>
          </div>
        )}

        {/* Download button */}
        <div className="flex justify-end">
          <Button onClick={handleDownloadPdf} className="gap-2 bg-[hsl(215,80%,45%)] hover:bg-[hsl(215,80%,40%)] text-white">
            <Download className="h-4 w-4" /> Baixar PDF
          </Button>
        </div>

        {/* Document */}
        <div className="bg-white text-[hsl(215,25%,15%)] rounded-sm shadow-[0_4px_16px_hsl(215_25%_15%/0.12)]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          
          {co.name && (
            <div className="bg-[hsl(215,25%,15%)] text-white px-6 py-5 text-center">
              <h1 className="text-2xl font-extrabold tracking-widest uppercase">{co.name}</h1>
            </div>
          )}

          <div className="px-4 sm:px-6 py-2">
            {(co.address || co.cnpjCpf || co.phone) && (
              <div className="text-center text-xs text-[hsl(215,10%,45%)] border-b border-[hsl(214,20%,88%)] pb-3 mb-4">
                {co.address && <p>{co.address}</p>}
                <p>
                  {co.cnpjCpf && <span>CNPJ/CPF: {co.cnpjCpf}</span>}
                  {co.cnpjCpf && co.phone && <span> &nbsp;|&nbsp; </span>}
                  {co.phone && <span>Fone: {co.phone}</span>}
                </p>
                {co.email && <p>{co.email}</p>}
              </div>
            )}

            <div className="border border-[hsl(214,20%,88%)] rounded-sm mb-4">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-[hsl(214,20%,88%)]">
                    <td className="px-3 py-2 font-bold text-[hsl(215,10%,45%)] w-24">Cliente:</td>
                    <td className="px-3 py-2 font-bold">{quote.clientName}</td>
                    <td className="px-3 py-2 font-bold text-[hsl(215,10%,45%)] w-20 text-right">Data:</td>
                    <td className="px-3 py-2 text-right w-28">{date}</td>
                  </tr>
                  {quote.jobType && (
                    <tr>
                      <td className="px-3 py-2 font-bold text-[hsl(215,10%,45%)]">Tipo:</td>
                      <td className="px-3 py-2" colSpan={3}>{quote.jobType}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="text-center mb-4">
              <h2 className="text-xl font-extrabold tracking-wide uppercase">ORÇAMENTO</h2>
            </div>

            <div className="border border-[hsl(214,20%,88%)] rounded-sm mb-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[hsl(210,15%,93%)] text-[hsl(215,10%,45%)] font-bold text-xs uppercase">
                    <th className="text-left px-3 py-2 w-10">#</th>
                    <th className="text-left px-3 py-2">Descrição</th>
                    <th className="text-center px-3 py-2 w-16">Qtd.</th>
                    <th className="text-right px-3 py-2 w-24">Unit.</th>
                    <th className="text-right px-3 py-2 w-28">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item, i) => (
                    <tr key={item.id} className="border-t border-[hsl(214,20%,88%)]">
                      <td className="px-3 py-2 text-[hsl(215,10%,45%)] font-bold">{i + 1}</td>
                      <td className="px-3 py-2">
                        <div className="font-bold">{item.description}</div>
                        {(item.width || item.height) && (
                          <div className="text-xs text-[hsl(215,10%,45%)]">
                            {item.width ? `${item.width}mm` : '—'} × {item.height ? `${item.height}mm` : '—'}
                            {item.width && item.height && (
                              <span className="ml-1">({(item.width * item.height / 1_000_000).toFixed(4)}m²)</span>
                            )}
                          </div>
                        )}
                        {item.location && (
                          <div className="text-xs text-[hsl(215,80%,45%)]">📍 {item.location}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-[hsl(215,10%,45%)]">{fmt(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-bold">{fmt(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border border-[hsl(214,20%,88%)] rounded-sm mb-6 overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="bg-[hsl(215,25%,15%)] text-white">
                    <td className="px-3 py-3 font-extrabold uppercase tracking-wide">VALOR TOTAL:</td>
                    <td className="px-3 py-3 text-right font-extrabold text-lg">{fmt(quote.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mb-8 text-sm text-[hsl(215,10%,45%)] space-y-1">
              <p className="font-bold">- PROPOSTA VÁLIDA POR 7 (SETE) DIAS ÚTEIS;</p>
              <p className="font-bold">- CONDIÇÕES DE PAGAMENTO A COMBINAR;</p>
              {quote.notes && (
                <div className="mt-3 whitespace-pre-wrap text-[hsl(215,25%,15%)]">
                  <span className="font-bold">Obs: </span>{quote.notes}
                </div>
              )}
            </div>

            <div className="flex justify-between px-4 pb-8 pt-8">
              <div className="text-center">
                <div className="border-t border-[hsl(215,25%,15%)] w-36 sm:w-48 mx-auto mb-1" />
                <span className="text-sm font-bold text-[hsl(215,10%,45%)]">Cliente</span>
              </div>
              <div className="text-center">
                <div className="border-t border-[hsl(215,25%,15%)] w-36 sm:w-48 mx-auto mb-1" />
                <span className="text-sm font-bold text-[hsl(215,10%,45%)]">Consultor(a) de vendas</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-[hsl(215,10%,45%)] py-4">
          Documento gerado digitalmente
        </div>
      </div>
    </div>
  );
};

export default PublicQuoteView;
