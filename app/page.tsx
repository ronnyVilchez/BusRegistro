'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SeatGrid from '@/components/SeatGrid';
import SeatModal from '@/components/SeatModal';
import WaitingListModal from '@/components/WaitingListModal';
import { useTheme } from '@/contexts/ThemeContext';
import type { Seat, WaitingListEntry } from '@/lib/kv';

export default function HomePage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [seats, setSeats] = useState<Seat[]>([]);
  const [available, setAvailable] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWaitingListOpen, setIsWaitingListOpen] = useState(false);
  const [waitingList, setWaitingList] = useState<WaitingListEntry[]>([]);
  const [nextEligible, setNextEligible] = useState<WaitingListEntry | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPageVisibleRef = useRef(true);

  const fetchSeats = async () => {
    try {
      const res = await fetch('/api/seats');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setSeats(data.seats);
      setAvailable(data.available);
    } catch (error) {
      console.error('Error cargando asientos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWaitingList = async () => {
    try {
      const res = await fetch('/api/waiting-list');
      if (res.ok) {
        const data = await res.json();
        setWaitingList(data.list);
        setNextEligible(data.nextEligible);
      }
    } catch (error) {
      console.error('Error cargando lista de espera:', error);
    }
  };

  // Optimización: Solo hacer polling cuando la página está visible y activa
  useEffect(() => {
    const handleVisibilityChange = () => {
      isPageVisibleRef.current = !document.hidden;
      
      if (document.hidden) {
        // Pausar polling cuando la pestaña está oculta
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        // Reanudar polling cuando la pestaña está visible
        if (!intervalRef.current) {
          fetchSeats();
          fetchWaitingList();
          intervalRef.current = setInterval(() => {
            if (isPageVisibleRef.current) {
              fetchSeats();
              fetchWaitingList();
              setLastUpdate(new Date());
            }
          }, 10000); // Aumentado a 10 segundos para reducir carga
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Polling inicial: cada 10 segundos (reducido de 5 para optimizar)
    fetchSeats();
    fetchWaitingList();
    
    intervalRef.current = setInterval(() => {
      if (isPageVisibleRef.current) {
        fetchSeats();
        fetchWaitingList();
        setLastUpdate(new Date());
      }
    }, 10000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleSeatClick = (seat: Seat) => {
    setSelectedSeat(seat);
    setIsModalOpen(true);
  };

  const handleSeatUpdate = async () => {
    await fetchSeats();
    await fetchWaitingList();
    setIsModalOpen(false);
    setSelectedSeat(null);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const handleRefresh = () => {
    fetchSeats();
    fetchWaitingList();
    setLastUpdate(new Date());
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-xl text-gray-800 dark:text-white">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
  <h1
    className="
      text-center
      text-3xl sm:text-4xl md:text-5xl
      font-black
      text-white
      tracking-wide
      leading-tight
      max-w-4xl
      drop-shadow-lg
    "
  >
    GRACIAS POR AYUDAR A LLEVARNOS A BORO
    <br className="hidden sm:block" />
    HASTA LA PRÓXIMA LIDERES :D
  </h1>
</div>
   /* <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
              Gestión de Asientos
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Última actualización: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={toggleTheme}
              className="px-3 sm:px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              onClick={handleRefresh}
              className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm"
            >
              Actualizar
            </button>
            <button
              onClick={handleLogout}
              className="px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition text-sm"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow w-full sm:w-auto">
            <div className="text-sm text-gray-600 dark:text-gray-400">Asientos Disponibles</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{available}</div>
            <div className="text-sm text-gray-500 dark:text-gray-500">de 60 totales</div>
          </div>
          <button
            onClick={() => setIsWaitingListOpen(true)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium w-full sm:w-auto"
          >
            Lista de Espera
            {waitingList.length > 0 && (
              <span className="ml-2 bg-purple-800 px-2 py-1 rounded-full text-xs">
                {waitingList.length}
              </span>
            )}
          </button>
        </div>

        <SeatGrid seats={seats} onSeatClick={handleSeatClick} />

        {isModalOpen && selectedSeat && (
          <SeatModal
            seat={selectedSeat}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedSeat(null);
            }}
            onUpdate={handleSeatUpdate}
          />
        )}

        {isWaitingListOpen && (
          <WaitingListModal
            waitingList={waitingList}
            nextEligible={nextEligible}
            available={available}
            onClose={() => setIsWaitingListOpen(false)}
            onUpdate={fetchWaitingList}
          />
        )}
      </main>
    </div>*/
  );
}
