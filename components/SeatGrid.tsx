'use client';

import type { Seat } from '@/lib/kv';

interface SeatGridProps {
  seats: Seat[];
  onSeatClick: (seat: Seat) => void;
}

export default function SeatGrid({ seats, onSeatClick }: SeatGridProps) {
  // Distribución del bus: 2 columnas principales con pasillo en medio
  // 30 filas x 2 columnas = 60 asientos
  const rows = 15;
  const colsPerSide = 2;

  const getSeatColor = (seat: Seat) => {
    if (seat.status === 'free') {
      return 'bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700';
    }
    if (seat.paid) {
      return 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700';
    }
    return 'bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700';
  };

  const getSeatLabel = (seat: Seat) => {
    if (seat.status === 'free') {
      return seat.seat.toString();
    }
    return `${seat.seat}\n${seat.name?.charAt(0) || ''}${seat.lastname?.charAt(0) || ''}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg">
      <div className="mb-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 sm:w-6 sm:h-6 bg-green-500 rounded"></div>
          <span className="text-gray-700 dark:text-gray-300">Libre</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 sm:w-6 sm:h-6 bg-red-500 rounded"></div>
          <span className="text-gray-700 dark:text-gray-300">Ocupado - Pagado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 sm:w-6 sm:h-6 bg-yellow-500 rounded"></div>
          <span className="text-gray-700 dark:text-gray-300">Ocupado - Pendiente</span>
        </div>
      </div>

      <div className="flex gap-4 sm:gap-8 justify-center overflow-x-auto">
        {/* Lado izquierdo */}
        <div className="flex flex-col gap-1 sm:gap-2">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={`left-${rowIndex}`} className="flex gap-1 sm:gap-2">
              {Array.from({ length: colsPerSide }).map((_, colIndex) => {
                // Fila 0: asientos 1-2, Fila 1: asientos 5-6, etc.
                const seatNumber = rowIndex * 4 + colIndex + 1;
                const seat = seats[seatNumber - 1];
                if (!seat) return null;
                return (
                  <button
                    key={seat.seat}
                    onClick={() => onSeatClick(seat)}
                    className={`w-10 h-10 sm:w-12 sm:h-12 ${getSeatColor(seat)} text-white font-semibold rounded transition transform hover:scale-105 active:scale-95 text-[10px] sm:text-xs whitespace-pre-line`}
                    title={seat.status === 'occupied' ? `${seat.name} ${seat.lastname}` : `Asiento ${seat.seat}`}
                  >
                    {getSeatLabel(seat)}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Pasillo */}
        <div className="w-4 sm:w-8 flex items-center justify-center">
          <div className="h-full w-0.5 sm:w-1 bg-gray-300 dark:bg-gray-600"></div>
        </div>

        {/* Lado derecho */}
        <div className="flex flex-col gap-1 sm:gap-2">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={`right-${rowIndex}`} className="flex gap-1 sm:gap-2">
              {Array.from({ length: colsPerSide }).map((_, colIndex) => {
                // Fila 0: asientos 3-4, Fila 1: asientos 7-8, etc.
                const seatNumber = rowIndex * 4 + colIndex + 3;
                const seat = seats[seatNumber - 1];
                if (!seat) return null;
                return (
                  <button
                    key={seat.seat}
                    onClick={() => onSeatClick(seat)}
                    className={`w-10 h-10 sm:w-12 sm:h-12 ${getSeatColor(seat)} text-white font-semibold rounded transition transform hover:scale-105 active:scale-95 text-[10px] sm:text-xs whitespace-pre-line`}
                    title={seat.status === 'occupied' ? `${seat.name} ${seat.lastname}` : `Asiento ${seat.seat}`}
                  >
                    {getSeatLabel(seat)}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
