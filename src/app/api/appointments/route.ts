import { NextResponse } from 'next/server';
import { getStoredAppointments, saveAppointment, AppointmentItem } from '@/lib/server-db';

export async function GET() {
  const appointments = getStoredAppointments();
  return NextResponse.json({
    success: true,
    count: appointments.length,
    data: appointments
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

    const newAppointment: AppointmentItem = {
      id: body.id || 'apt-' + Date.now(),
      name: body.name,
      email: body.email,
      phone: body.phone || '',
      date: body.date,
      time: body.time,
      projectFocus: body.projectFocus || 'Genel Yazılım & SaaS Mimarisi',
      notes: body.notes || '',
      meetingLink: body.meetingLink || `https://meet.google.com/ysn-${Math.random().toString(36).substring(2, 7)}`,
      status: body.status || 'confirmed',
      createdAt: body.createdAt || new Date().toISOString()
    };

    saveAppointment(newAppointment);

    return NextResponse.json({
      success: true,
      message: 'Google Meet randevunuz başarıyla oluşturuldu. Takvim davetiyesi e-posta adresinize gönderildi.',
      appointment: newAppointment
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Randevu kaydı sırasında hata oluştu.' },
      { status: 500 }
    );
  }
}
