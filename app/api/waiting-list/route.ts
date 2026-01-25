import { NextRequest, NextResponse } from 'next/server';
import { 
  getWaitingList, 
  addToWaitingList, 
  removeFromWaitingList,
  findNextEligible,
  countAvailableSeats 
} from '@/lib/kv';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const isAuthenticated = await getSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const list = await getWaitingList();
    const available = await countAvailableSeats();
    const nextEligible = await findNextEligible(available);

    return NextResponse.json({ 
      list,
      available,
      nextEligible 
    });
  } catch (error) {
    console.error('Error obteniendo lista de espera:', error);
    return NextResponse.json(
      { error: 'Error al obtener lista de espera' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAuthenticated = await getSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, lastname, requestedSeats } = body;

    if (!name || !lastname) {
      return NextResponse.json(
        { error: 'Nombre y apellido son requeridos' },
        { status: 400 }
      );
    }

    if (!requestedSeats || requestedSeats < 1) {
      return NextResponse.json(
        { error: 'Debe solicitar al menos 1 asiento' },
        { status: 400 }
      );
    }

    const list = await addToWaitingList({
      name,
      lastname,
      requestedSeats: Number(requestedSeats),
    });

    const available = await countAvailableSeats();
    const nextEligible = await findNextEligible(available);

    return NextResponse.json({ 
      list,
      available,
      nextEligible 
    });
  } catch (error) {
    console.error('Error agregando a lista de espera:', error);
    return NextResponse.json(
      { error: 'Error al agregar a lista de espera' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const isAuthenticated = await getSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID requerido' },
        { status: 400 }
      );
    }

    const list = await removeFromWaitingList(id);
    const available = await countAvailableSeats();
    const nextEligible = await findNextEligible(available);

    return NextResponse.json({ 
      list,
      available,
      nextEligible 
    });
  } catch (error) {
    console.error('Error eliminando de lista de espera:', error);
    return NextResponse.json(
      { error: 'Error al eliminar de lista de espera' },
      { status: 500 }
    );
  }
}

