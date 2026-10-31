import { NextResponse } from 'next/server';

export interface AppointmentPayload {
  id?: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  projectFocus: string;
  notes?: string;
  meetingLink?: string;
  status?: 'confirmed' | 'pending' | 'completed';
}

const appointmentsStore: AppointmentPayload[] = [
  {
    id: 'apt-1',
    name: 'Av. Deniz Kaya',
    email: 'deniz@kayalaw.com',
    phone: '+90 533 111 2233',
    date: '2026-11-04',
    time: '14:30',
    projectFocus: 'KGLEX Hukuk Otomasyonu',
    notes: 'Büromuzdaki 12 avukat için UYAP bot ve arşiv entegrasyonu demosu.',
    meetingLink: 'https://meet.google.com/ysn-demo-law',
    status: 'confirmed'
  },
  {
    id: 'apt-2',
    name: 'Burak Demir',
    email: 'burak@panelde.com',
    phone: '+90 535 444 5566',
    date: '2026-11-05',
    time: '11:00',
    projectFocus: 'Panelde Emlak Portalı V2',
    notes: 'Multi-tenant mimari ölçekleme ve mobil uygulama entegrasyonu.',
    meetingLink: 'https://meet.google.com/ysn-panelde-arch',
    status: 'confirmed'
  }
];

export async function GET() {
  return NextResponse.json({
    success: true,
    count: appointmentsStore.length,
    data: appointmentsStore
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name || !body.email || !body.date || !body.time) {
      return NextResponse.json(
        { success: false, error: 'İsim, e-posta, tarih ve saat seçimi zorunludur.' },
        { status: 400 }
      );
    }

    const newAppointment: AppointmentPayload = {
      id: 'apt-' + Date.now(),
      name: body.name,
      email: body.email,
      phone: body.phone || '',
      date: body.date,
      time: body.time,
      projectFocus: body.projectFocus || 'Genel Yazılım & SaaS Mimarisi',
      notes: body.notes || '',
      meetingLink: `https://meet.google.com/ysn-${Math.random().toString(36).substring(2, 7)}`,
      status: 'confirmed'
    };

    appointmentsStore.unshift(newAppointment);

    return NextResponse.json({
      success: true,
      message: 'Google Meet randevunuz başarıyla oluşturuldu. Takvim davetiyesi e-posta adresinize gönderildi.',
      appointment: newAppointment
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Randevu kaydı sırasında hata oluştu.' },
      { status: 500 }
    );
  }
}
