import { NextResponse } from 'next/server';
import { getStoredLeads, saveLead, LeadItem } from '@/lib/server-db';

export async function GET() {
  const leads = getStoredLeads();
  return NextResponse.json({
    success: true,
    count: leads.length,
    data: leads
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name || !body.email || !body.projectType) {
      return NextResponse.json(
        { success: false, error: 'İsim, e-posta ve proje tipi zorunludur.' },
        { status: 400 }
      );
    }

    const newLead: LeadItem = {
      id: body.id || 'lead-' + Date.now(),
      name: body.name,
      email: body.email,
      phone: body.phone || '',
      company: body.company || '',
      budget: body.budget || 'Belirtilmedi',
      projectType: body.projectType,
      message: body.message || '',
      source: body.source || 'Website API',
      createdAt: body.createdAt || new Date().toISOString(),
      status: body.status || 'new'
    };

    saveLead(newLead);

    return NextResponse.json({
      success: true,
      message: 'Talebiniz başarıyla alındı. Çözüm mimarımız 15 dakika içinde iletişime geçecektir.',
      lead: newLead
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'İşlem sırasında bir hata oluştu.' },
      { status: 500 }
    );
  }
}
