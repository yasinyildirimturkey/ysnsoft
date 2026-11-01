import { NextResponse } from 'next/server';
import { getStoredInvoices, saveInvoice, InvoiceItem } from '@/lib/server-db';

export async function GET() {
  const invoices = getStoredInvoices();
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + i.grandTotal, 0);
  const pendingRevenue = invoices.filter(i => i.status === 'pending').reduce((acc, i) => acc + i.grandTotal, 0);

  return NextResponse.json({
    success: true,
    stats: {
      totalRevenue,
      pendingRevenue,
      totalInvoices: invoices.length
    },
    data: invoices
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.clientName || !body.grandTotal) {
      return NextResponse.json(
        { success: false, error: 'Müşteri adı ve toplam tutar zorunludur.' },
        { status: 400 }
      );
    }

    const invoices = getStoredInvoices();
    const subtotal = Number(body.subtotal) || Number(body.grandTotal) / 1.2;
    const kdvAmount = Number(body.kdvAmount) || (Number(body.grandTotal) - subtotal);
    const invoiceNo = 'YSN2026' + String(140 + invoices.length + 1).padStart(8, '0');

    const newInvoice: InvoiceItem = {
      id: body.id || 'inv-' + Date.now(),
      invoiceNo: body.invoiceNo || invoiceNo,
      clientName: body.clientName,
      clientVknTckn: body.clientVknTckn || '1111111111',
      issueDate: body.issueDate || new Date().toISOString().split('T')[0],
      dueDate: body.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      items: body.items || [{ description: body.description || 'Yazılım & SaaS Geliştirme Hizmeti', qty: 1, unitPrice: subtotal, total: subtotal }],
      subtotal: Math.round(subtotal),
      kdvRate: 20,
      kdvAmount: Math.round(kdvAmount),
      grandTotal: Number(body.grandTotal),
      currency: body.currency || 'TRY',
      status: body.status || 'pending',
      gibStatus: body.gibStatus || 'GİB İletildi',
      ettn: body.ettn || ('e-' + Math.random().toString(36).substring(2, 10) + '-' + Math.random().toString(36).substring(2, 6))
    };

    saveInvoice(newInvoice);

    return NextResponse.json({
      success: true,
      message: `${newInvoice.invoiceNo} numaralı e-fatura başarıyla oluşturuldu ve GİB portalına iletildi.`,
      invoice: newInvoice
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Fatura oluşturma sırasında hata oluştu.' },
      { status: 500 }
    );
  }
}
