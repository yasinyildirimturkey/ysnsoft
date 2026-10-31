import { NextResponse } from 'next/server';

export interface LeadPayload {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  budget?: string;
  projectType: string;
  message?: string;
  source?: string;
}

// In-memory fallback if no DB connection
const leadsStore: LeadPayload[] = [
  {
    id: 'lead-1',
    name: 'Av. Mehmet Yılmaz',
    email: 'mehmet@yilmazhukuk.com',
    phone: '+90 532 100 2030',
    company: 'Yılmaz Hukuk & Danışmanlık',
    budget: '₺100.000 - ₺250.000',
    projectType: 'LegalTech (KGLEX Benzeri)',
    message: 'UYAP entegrasyonu ve icra dosyası otomatik sorgulama altyapısı talep ediyoruz.',
    source: 'Hero Form'
  },
  {
    id: 'lead-2',
    name: 'Harita Müh. Selin Aktaş',
    email: 'selin@aktasharita.com',
    phone: '+90 544 200 4050',
    company: 'Aktaş Harita Planlama',
    budget: '₺250.000 - ₺500.000',
    projectType: '3D Harita / GIS (HaritaPlan)',
    message: '3194 sayılı kanun madde 18 parselasyon hesaplama motorunu belediyemiz için özelleştirmek istiyoruz.',
    source: 'Scope Calculator'
  }
];

export async function GET() {
  return NextResponse.json({
    success: true,
    count: leadsStore.length,
    data: leadsStore
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

    const newLead: LeadPayload = {
      id: 'lead-' + Date.now(),
      name: body.name,
      email: body.email,
      phone: body.phone || '',
      company: body.company || '',
      budget: body.budget || 'Belirtilmedi',
      projectType: body.projectType,
      message: body.message || '',
      source: body.source || 'Website API'
    };

    leadsStore.unshift(newLead);

    return NextResponse.json({
      success: true,
      message: 'Talebiniz başarıyla alındı. Çözüm mimarımız 15 dakika içinde iletişime geçecektir.',
      lead: newLead
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'İşlem sırasında bir hata oluştu.' },
      { status: 500 }
    );
  }
}
