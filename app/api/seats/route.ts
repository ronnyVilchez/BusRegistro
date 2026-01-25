import { NextRequest, NextResponse } from 'next/server';
import { getSeats, updateSeat, countAvailableSeats } from '@/lib/kv';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const isAuthenticated = await getSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const seats = await getSeats();
    const available = await countAvailableSeats(seats); // Pasar seats para evitar GET duplicado
    
    return NextResponse.json({ 
      seats,
      available,
      total: 60 
    });
  } catch (error) {
    console.error('Error obteniendo asientos:', error);
    return NextResponse.json(
      { error: 'Error al obtener asientos' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const isAuthenticated = await getSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { seat, ...data } = body;

    if (!seat || seat < 1 || seat > 60) {
      return NextResponse.json(
        { error: 'Número de asiento inválido' },
        { status: 400 }
      );
    }

    // Validar datos
    if (data.status === 'occupied') {
      if (!data.name || !data.lastname) {
        return NextResponse.json(
          { error: 'Nombre y apellido son requeridos' },
          { status: 400 }
        );
      }
    }

    const seats = await updateSeat(seat, data);
    const available = await countAvailableSeats(seats); // Pasar seats para evitar GET duplicado

    return NextResponse.json({ 
      seats,
      available,
      total: 60 
    });
  } catch (error) {
    console.error('Error actualizando asiento:', error);
    return NextResponse.json(
      { error: 'Error al actualizar asiento' },
      { status: 500 }
    );
  }
}

