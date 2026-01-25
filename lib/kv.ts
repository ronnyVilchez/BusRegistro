import { v4 as uuidv4 } from 'uuid';
import { put, list, del } from '@vercel/blob';

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

const SEATS_KEY = 'bus_seats.json';
const WAITING_LIST_KEY = 'waiting_list.json';

// Almacenamiento en memoria para desarrollo local (fallback)
let memoryStore: Map<string, any> = new Map();

// Cache de URLs de blobs para evitar múltiples búsquedas
const blobUrlCache: Map<string, string> = new Map();

// Función helper para obtener el cliente de almacenamiento
// Usa Vercel Blob Storage (nativo) si está disponible
// Si no, usa almacenamiento en memoria (para desarrollo local)
async function getStorage() {
  // Vercel Blob Storage es nativo, se configura automáticamente en Vercel
  // En desarrollo local sin token, usa memoria como fallback
  
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    // Usar Vercel Blob Storage (nativo de Vercel, sin cuentas externas)
    return {
      get: async <T>(key: string): Promise<T | null> => {
        try {
          // Buscar el blob por nombre
          const blobs = await list({ 
            prefix: key,
            token: process.env.BLOB_READ_WRITE_TOKEN,
          });
          
          const blob = blobs.blobs.find(b => b.pathname === key);
          
          if (blob) {
            // Leer desde la URL del blob
            const response = await fetch(blob.url);
            if (response.ok) {
              const text = await response.text();
              blobUrlCache.set(key, blob.url);
              return JSON.parse(text) as T;
            }
          }
          
          return null;
        } catch (error) {
          console.error('Error leyendo desde Blob Storage:', error);
          // Fallback a memoria si falla
          const value = memoryStore.get(key);
          return value ? (value as T) : null;
        }
      },
      set: async (key: string, value: any): Promise<void> => {
        try {
          const jsonString = JSON.stringify(value);
          
          // Eliminar blob anterior si existe
          try {
            const blobs = await list({ 
              prefix: key,
              token: process.env.BLOB_READ_WRITE_TOKEN,
            });
            const existingBlob = blobs.blobs.find(b => b.pathname === key);
            if (existingBlob) {
              await del(existingBlob.url, { token: process.env.BLOB_READ_WRITE_TOKEN });
            }
          } catch (e) {
            // Ignorar si no existe
          }
          
          // Crear nuevo blob
          const blob = await put(key, jsonString, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
            contentType: 'application/json',
            addRandomSuffix: false,
          });
          
          blobUrlCache.set(key, blob.url);
        } catch (error) {
          console.error('Error escribiendo a Blob Storage:', error);
          // Fallback a memoria si falla
          memoryStore.set(key, value);
        }
      },
    };
  }
  
  // Almacenamiento en memoria (para desarrollo local sin Blob Storage)
  return {
    get: async <T>(key: string): Promise<T | null> => {
      const value = memoryStore.get(key);
      return value ? (value as T) : null;
    },
    set: async (key: string, value: any): Promise<void> => {
      memoryStore.set(key, value);
    },
  };
}

// Inicializar asientos si no existen
export async function initializeSeats(): Promise<Seat[]> {
  const storage = await getStorage();
  const existing = await storage.get<Seat[]>(SEATS_KEY);
  
  if (existing) {
    return existing;
  }

  const seats: Seat[] = Array.from({ length: 60 }, (_, i) => ({
    seat: i + 1,
    status: 'free',
    name: null,
    lastname: null,
    age: null,
    paid: false,
  }));

  await storage.set(SEATS_KEY, seats);
  return seats;
}

// Obtener todos los asientos
export async function getSeats(): Promise<Seat[]> {
  const storage = await getStorage();
  const seats = await storage.get<Seat[]>(SEATS_KEY);
  return seats || await initializeSeats();
}

// Actualizar un asiento
export async function updateSeat(seatNumber: number, data: Partial<Seat>): Promise<Seat[]> {
  const storage = await getStorage();
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

  seats[index] = updatedSeat;
  await storage.set(SEATS_KEY, seats);
  return seats;
}

// Obtener lista de espera
export async function getWaitingList(): Promise<WaitingListEntry[]> {
  const storage = await getStorage();
  const list = await storage.get<WaitingListEntry[]>(WAITING_LIST_KEY);
  return list || [];
}

// Agregar a lista de espera
export async function addToWaitingList(entry: Omit<WaitingListEntry, 'id' | 'createdAt'>): Promise<WaitingListEntry[]> {
  const storage = await getStorage();
  const list = await getWaitingList();
  
  const newEntry: WaitingListEntry = {
    id: uuidv4(),
    ...entry,
    createdAt: new Date().toISOString(),
  };

  list.push(newEntry);
  // Mantener ordenado por fecha (FIFO)
  list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  await storage.set(WAITING_LIST_KEY, list);
  return list;
}

// Eliminar de lista de espera
export async function removeFromWaitingList(id: string): Promise<WaitingListEntry[]> {
  const storage = await getStorage();
  const list = await getWaitingList();
  const filtered = list.filter(entry => entry.id !== id);
  await storage.set(WAITING_LIST_KEY, filtered);
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
