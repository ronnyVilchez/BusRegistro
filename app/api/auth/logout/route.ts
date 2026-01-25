import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await deleteSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en logout:', error);
    return NextResponse.json(
      { error: 'Error al cerrar sesión' },
      { status: 500 }
    );
  }
}

