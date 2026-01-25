import { v4 as uuidv4 } from 'uuid';
import { put, list } from '@vercel/blob';

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

// Almacenamiento en memoria - fuente principal de verdad
// En Vercel serverless, esto se mantiene mientras la función esté activa
let memoryStore: Map<string, any> = new Map();

// Flag para saber si ya cargamos desde Blob Storage
let initializedFromBlob = false;

// Función para cargar datos desde Blob Storage a memoria (solo una vez al inicio)
async function loadFromBlobIfNeeded() {
  if (initializedFromBlob || !process.env.BLOB_READ_WRITE_TOKEN) {
    return;
  }

  try {
    // Cargar asientos desde Blob
    const seatsBlobs = await list({
      prefix: SEATS_KEY,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      limit: 1,
    });
    
    const seatsBlob = seatsBlobs.blobs.find(b => b.pathname === SEATS_KEY);
    if (seatsBlob) {
      const response = await fetch(seatsBlob.url, { cache: 'no-store' });
      if (response.ok) {
        const seats = await response.json();
        memoryStore.set(SEATS_KEY, seats);
      }
    }

    // Cargar lista de espera desde Blob
    const listBlobs = await list({
      prefix: WAITING_LIST_KEY,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      limit: 1,
    });
    
    const listBlob = listBlobs.blobs.find(b => b.pathname === WAITING_LIST_KEY);
    if (listBlob) {
      const response = await fetch(listBlob.url, { cache: 'no-store' });
      if (response.ok) {
        const waitingList = await response.json();
        memoryStore.set(WAITING_LIST_KEY, waitingList);
      }
    }
  } catch (error) {
    console.error('Error cargando desde Blob Storage:', error);
  } finally {
    initializedFromBlob = true;
  }
}

// Función para guardar en Blob Storage (async, no bloquea)
async function saveToBlob(key: string, value: any) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return;
  }

  try {
    const jsonString = JSON.stringify(value);
    await put(key, jsonString, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } catch (error) {
    // No lanzar error, solo loguear - la memoria es la fuente principal
    console.error(`Error guardando ${key} en Blob Storage:`, error);
  }
}

// Función helper para obtener el cliente de almacenamiento
async function getStorage() {
  // Cargar desde Blob Storage una vez al inicio si existe
  await loadFromBlobIfNeeded();

  return {
    get: async <T>(key: string): Promise<T | null> => {
      // Siempre leer desde memoria (fuente principal)
      const value = memoryStore.get(key);
      return value ? (value as T) : null;
    },
    set: async (key: string, value: any): Promise<void> => {
      // Escribir inmediatamente en memoria (fuente principal)
      memoryStore.set(key, value);
      
      // Guardar en Blob Storage de forma asíncrona (no bloquea)
      // No esperamos a que termine para no ralentizar las operaciones
      saveToBlob(key, value).catch(() => {
        // Ignorar errores silenciosamente
      });
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
  const seats = await storage.get<Seat[]>(SEATS_KEY) || await initializeSeats();
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
  
  // Guardar inmediatamente en memoria y async en Blob
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
