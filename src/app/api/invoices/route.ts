import { NextResponse } from 'next/server';

export interface InvoiceItem {
  id: string;
  invoiceNo: string;
  clientName: string;
  clientVknTckn: string;
  issueDate: string;
  dueDate: string;
  items: { description: string; qty: number; unitPrice: number; total: number }[];
  subtotal: number;
  kdvRate: number;
  kdvAmount: number;
  grandTotal: number;
  currency: string;
  status: 'paid' | 'pending' | 'overdue' | 'draft';
  gibStatus: 'GİB Onaylandı' | 'GİB İletildi' | 'Taslak';
  ettn: string;
}

const invoicesStore: InvoiceItem[] = [
  {
    id: 'inv-101',
    invoiceNo: 'YSN2026000000142',
    clientName: 'Açıkel Hukuk & Arabuluculuk Bürosu',
    clientVknTckn: '1230495861',
    issueDate: '2026-10-15',
    dueDate: '2026-11-15',
    items: [
      { description: 'KGLEX SaaS Yıllık Lisans & UYAP Bot Entegrasyonu', qty: 1, unitPrice: 120000, total: 120000 },
      { description: 'Cloud SLA & 7/24 Kesintisiz Bakım Desteği', qty: 1, unitPrice: 30000, total: 30000 }
    ],
    subtotal: 150000,
    kdvRate: 20,
    kdvAmount: 30000,
    grandTotal: 180000,
    currency: 'TRY',
    status: 'paid',
    gibStatus: 'GİB Onaylandı',
    ettn: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  },
  {
    id: 'inv-102',
    invoiceNo: 'YSN2026000000143',
    clientName: 'HaritaPlan CBS & Mühendislik Ltd. Şti.',
    clientVknTckn: '9870123456',
    issueDate: '2026-10-22',
    dueDate: '2026-11-22',
    items: [
      { description: '3194 Madde 18 DOP Hesaplama Motoru Modül Geliştirme (Sprint 3)', qty: 1, unitPrice: 200000, total: 200000 },
      { description: '3D WebGL Parselasyon Görselleştirme Motoru', qty: 1, unitPrice: 85000, total: 85000 }
    ],
    subtotal: 285000,
    kdvRate: 20,
    kdvAmount: 57000,
    grandTotal: 342000,
    currency: 'TRY',
    status: 'paid',
    gibStatus: 'GİB Onaylandı',
    ettn: '9a8b7c6d-1234-5678-9abc-def012345678'
  },
  {
    id: 'inv-103',
    invoiceNo: 'YSN2026000000144',
    clientName: 'Flamant Kozmetik & E-Ticaret A.Ş.',
    clientVknTckn: '5432109876',
    issueDate: '2026-10-28',
    dueDate: '2026-11-28',
    items: [
      { description: 'AI Destekli Cilt Analizi & Ürün Eşleştirme API Entegrasyonu', qty: 1, unitPrice: 95000, total: 95000 }
    ],
    subtotal: 95000,
    kdvRate: 20,
    kdvAmount: 19000,
    grandTotal: 114000,
    currency: 'TRY',
    status: 'pending',
    gibStatus: 'GİB İletildi',
    ettn: 'c1d2e3f4-a5b6-7890-abcd-ef1234567890'
  }
];

export async function GET() {
  const totalRevenue = invoicesStore.filter(i => i.status === 'paid').reduce((acc, i) => acc + i.grandTotal, 0);
  const pendingRevenue = invoicesStore.filter(i => i.status === 'pending').reduce((acc, i) => acc + i.grandTotal, 0);

  return NextResponse.json({
    success: true,
    stats: {
      totalRevenue,
      pendingRevenue,
      totalInvoices: invoicesStore.length
    },
    data: invoicesStore
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

    const subtotal = Number(body.subtotal) || Number(body.grandTotal) / 1.2;
    const kdvAmount = Number(body.kdvAmount) || (Number(body.grandTotal) - subtotal);
    const invoiceNo = 'YSN2026' + String(140 + invoicesStore.length + 1).padStart(8, '0');

    const newInvoice: InvoiceItem = {
      id: 'inv-' + Date.now(),
      invoiceNo,
      clientName: body.clientName,
      clientVknTckn: body.clientVknTckn || '1111111111',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      items: body.items || [{ description: body.description || 'Yazılım & SaaS Geliştirme Hizmeti', qty: 1, unitPrice: subtotal, total: subtotal }],
      subtotal: Math.round(subtotal),
      kdvRate: 20,
      kdvAmount: Math.round(kdvAmount),
      grandTotal: Number(body.grandTotal),
      currency: 'TRY',
      status: 'pending',
      gibStatus: 'GİB İletildi',
      ettn: 'e-' + Math.random().toString(36).substring(2, 10) + '-' + Math.random().toString(36).substring(2, 6)
    };

    invoicesStore.unshift(newInvoice);

    return NextResponse.json({
      success: true,
      message: `${invoiceNo} numaralı e-fatura başarıyla oluşturuldu ve GİB portalına iletildi.`,
      invoice: newInvoice
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Fatura oluşturma sırasında hata oluştu.' },
      { status: 500 }
    );
  }
}
