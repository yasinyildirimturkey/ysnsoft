import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';
import {
  audit,
  changeOwnPassword,
  createUser,
  deleteUser,
  issueInvite,
  loadUsers,
  readAudit,
  toPublic,
  updateUser,
} from '@/lib/admin-users';
import { can } from '@/lib/roles';

const noStore = { 'Cache-Control': 'no-store' };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: noStore });

/** Kullanıcı listesi: Roller & Yetkiler okuma yetkisi (Süper Admin, Admin, İK). */
export async function GET(request: Request) {
  const session = getAdminSession(request);
  if (!session) return json({ success: false, error: 'Bu işlem için yönetici girişi gereklidir.' }, 401);
  const canList = can(session.role, 'roller', 'read');
  const canManage = can(session.role, 'roller', 'write');
  const users = canList ? loadUsers().map(toPublic) : [];
  return json({
    success: true,
    me: { id: session.id, email: session.email, name: session.name, role: session.role },
    canManage,
    users,
    audit: canManage ? readAudit(100) : [],
  });
}

/**
 * İşlemler:
 *   change-password  (herkes, kendi hesabı)   { current, next }
 *   create           (Süper Admin)            { email, name, role }   → davet belirteci döner
 *   invite           (Süper Admin)            { id }                  → yeni davet belirteci
 *   update           (Süper Admin)            { id, name?, role?, status? }
 *   delete           (Süper Admin)            { id }
 * Davet belirteci yalnızca bu yanıtta bir kez görünür; sunucuda özeti saklanır.
 */
export async function POST(request: Request) {
  const session = getAdminSession(request);
  if (!session) return json({ success: false, error: 'Bu işlem için yönetici girişi gereklidir.' }, 401);

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) ?? {};
  } catch {
    return json({ success: false, error: 'Geçersiz istek.' }, 400);
  }
  const action = body.action;

  if (action === 'change-password') {
    const error = changeOwnPassword(session.id, String(body.current ?? ''), String(body.next ?? ''));
    if (error) return json({ success: false, error }, 400);
    audit(session.email, 'password-change');
    // Şifre değişince oturum sürümü artar; kullanıcı yeniden giriş yapar
    return json({ success: true, relogin: true });
  }

  if (!can(session.role, 'roller', 'write')) return json({ success: false, error: 'Bu işlem için yetkiniz yok.' }, 403);
  const id = typeof body.id === 'string' ? body.id : '';

  try {
    if (action === 'create') {
      const result = createUser({ email: body.email, name: body.name, role: body.role });
      if (typeof result === 'string') return json({ success: false, error: result }, 400);
      const token = issueInvite(result.id);
      audit(session.email, 'user-create', { target: result.email, role: result.role });
      return json({ success: true, user: toPublic(loadUsers().find((u) => u.id === result.id)!), inviteToken: token });
    }
    if (action === 'invite') {
      const target = loadUsers().find((u) => u.id === id);
      if (!target) return json({ success: false, error: 'Kullanıcı bulunamadı.' }, 404);
      if (target.status !== 'active') return json({ success: false, error: 'Pasif hesaba davet gönderilemez.' }, 400);
      const token = issueInvite(id);
      audit(session.email, 'invite', { target: target.email });
      return json({ success: true, inviteToken: token });
    }
    if (action === 'update') {
      const result = updateUser(session.id, id, { name: body.name, role: body.role, status: body.status });
      if (typeof result === 'string') return json({ success: false, error: result }, 400);
      audit(session.email, 'user-update', {
        target: result.email,
        ...(body.role !== undefined ? { role: result.role } : {}),
        ...(body.status !== undefined ? { status: result.status } : {}),
      });
      return json({ success: true, user: toPublic(result) });
    }
    if (action === 'delete') {
      const result = deleteUser(session.id, id);
      if (typeof result === 'string') return json({ success: false, error: result }, 400);
      audit(session.email, 'user-delete', { target: result.email });
      return json({ success: true });
    }
  } catch (err) {
    return json({ success: false, error: err instanceof Error ? err.message : 'İşlem başarısız.' }, 500);
  }
  return json({ success: false, error: 'Bilinmeyen işlem.' }, 400);
}
