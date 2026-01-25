import { v4 as uuidv4 } from 'uuid';
import { Redis } from '@upstash/redis';

export interface Seat {
  seat: number;
  status: 'free' | 'occupied';
  name: string | null;
  lastname: string | null;
  age: number | null;
  paid: boolean;
}

export interface WaitingListEntry {
  id: string;
  name: string;
  lastname: string;
  requestedSeats: number;
  createdAt: string;
}

const SEATS_KEY = 'bus_seats';
const WAITING_LIST_KEY = 'waiting_list';

// Cliente Redis singleton
let redisClient: Redis | null = null;

// Obtener cliente Redis (singleton)
function getRedisClient(): Redis | null {
  // Vercel KV usa estas variables de entorno automáticamente
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis({
      url,
      token,
    });
  }

  return redisClient;
}

// Inicializar asientos si no existen
export async function initializeSeats(): Promise<Seat[]> {
  const redis = getRedisClient();
  
  if (!redis) {
    throw new Error('Vercel KV no está configurado. Por favor, agrega Vercel KV desde el dashboard.');
  }

  // Verificar si ya existen
  const existing = await redis.get<Seat[]>(SEATS_KEY);
  if (existing && Array.isArray(existing) && existing.length > 0) {
    return existing;
  }

  // Crear asientos iniciales
  const seats: Seat[] = Array.from({ length: 60 }, (_, i) => ({
    seat: i + 1,
    status: 'free',
    name: null,
    lastname: null,
    age: null,
    paid: false,
  }));

  // Guardar atómicamente
  await redis.set(SEATS_KEY, seats);
  return seats;
}

// Obtener todos los asientos
export async function getSeats(): Promise<Seat[]> {
  const redis = getRedisClient();
  
  if (!redis) {
    throw new Error('Vercel KV no está configurado. Por favor, agrega Vercel KV desde el dashboard.');
  }

  const seats = await redis.get<Seat[]>(SEATS_KEY);
  
  if (!seats || !Array.isArray(seats) || seats.length === 0) {
    return await initializeSeats();
  }

  return seats;
}

// Actualizar un asiento de forma atómica
export async function updateSeat(seatNumber: number, data: Partial<Seat>): Promise<Seat[]> {
  const redis = getRedisClient();
  
  if (!redis) {
    throw new Error('Vercel KV no está configurado. Por favor, agrega Vercel KV desde el dashboard.');
  }

  if (seatNumber < 1 || seatNumber > 60) {
    throw new Error('Asiento inválido');
  }

  // Usar transacción para asegurar atomicidad
  // Leer, modificar y escribir de forma atómica
  const seats = await getSeats();
  const index = seatNumber - 1;

  if (index < 0 || index >= seats.length) {
    throw new Error('Asiento inválido');
  }

  const updatedSeat: Seat = {
    ...seats[index],
    ...data,
    seat: seatNumber,
  };

  // Si se libera el asiento, limpiar todos los campos
  if (data.status === 'free') {
    updatedSeat.name = null;
    updatedSeat.lastname = null;
    updatedSeat.age = null;
    updatedSeat.paid = false;
  }

  // Crear nuevo array con el asiento actualizado
  const updatedSeats = [...seats];
  updatedSeats[index] = updatedSeat;

  // Guardar atómicamente
  await redis.set(SEATS_KEY, updatedSeats);

  return updatedSeats;
}

// Obtener lista de espera
export async function getWaitingList(): Promise<WaitingListEntry[]> {
  const redis = getRedisClient();
  
  if (!redis) {
    throw new Error('Vercel KV no está configurado. Por favor, agrega Vercel KV desde el dashboard.');
  }

  const list = await redis.get<WaitingListEntry[]>(WAITING_LIST_KEY);
  return list || [];
}

// Agregar a lista de espera de forma atómica
export async function addToWaitingList(entry: Omit<WaitingListEntry, 'id' | 'createdAt'>): Promise<WaitingListEntry[]> {
  const redis = getRedisClient();
  
  if (!redis) {
    throw new Error('Vercel KV no está configurado. Por favor, agrega Vercel KV desde el dashboard.');
  }

  const list = await getWaitingList();
  
  const newEntry: WaitingListEntry = {
    id: uuidv4(),
    ...entry,
    createdAt: new Date().toISOString(),
  };

  const updatedList = [...list, newEntry];
  // Mantener ordenado por fecha (FIFO)
  updatedList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  // Guardar atómicamente
  await redis.set(WAITING_LIST_KEY, updatedList);
  
  return updatedList;
}

// Eliminar de lista de espera de forma atómica
export async function removeFromWaitingList(id: string): Promise<WaitingListEntry[]> {
  const redis = getRedisClient();
  
  if (!redis) {
    throw new Error('Vercel KV no está configurado. Por favor, agrega Vercel KV desde el dashboard.');
  }

  const list = await getWaitingList();
  const filtered = list.filter(entry => entry.id !== id);
  
  // Guardar atómicamente
  await redis.set(WAITING_LIST_KEY, filtered);
  
  return filtered;
}

// Encontrar siguiente elegible en lista de espera
export async function findNextEligible(availableSeats: number): Promise<WaitingListEntry | null> {
  const list = await getWaitingList();
  
  for (const entry of list) {
    if (availableSeats >= entry.requestedSeats) {
      return entry;
    }
  }
  
  return null;
}

// Contar asientos disponibles
export async function countAvailableSeats(): Promise<number> {
  const seats = await getSeats();
  return seats.filter(s => s.status === 'free').length;
}
