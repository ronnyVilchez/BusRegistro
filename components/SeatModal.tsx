'use client';

import { useState, useEffect } from 'react';
import type { Seat } from '@/lib/kv';
import ConfirmDialog from './ConfirmDialog';

interface SeatModalProps {
  seat: Seat;
  onClose: () => void;
  onUpdate: () => void;
}

export default function SeatModal({ seat, onClose, onUpdate }: SeatModalProps) {
  const [name, setName] = useState(seat.name || '');
  const [lastname, setLastname] = useState(seat.lastname || '');
  const [age, setAge] = useState(seat.age?.toString() || '');
  const [paid, setPaid] = useState(seat.paid);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    setName(seat.name || '');
    setLastname(seat.lastname || '');
    setAge(seat.age?.toString() || '');
    setPaid(seat.paid);
  }, [seat]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/seats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seat: seat.seat,
          status: 'occupied',
          name,
          lastname,
          age: age ? parseInt(age) : null,
          paid,
        }),
      });

      if (res.ok) {
        onUpdate();
      } else {
        const data = await res.json();
        setError(data.error || 'Error al guardar');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleFreeConfirm = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const res = await fetch('/api/seats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seat: seat.seat,
          status: 'free',
        }),
      });

      if (res.ok) {
        onUpdate();
      } else {
        const data = await res.json();
        setError(data.error || 'Error al liberar asiento');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePaid = async () => {
    if (seat.status !== 'occupied') return;

    setLoading(true);
    try {
      const res = await fetch('/api/seats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seat: seat.seat,
          paid: !paid,
        }),
      });

      if (res.ok) {
        setPaid(!paid);
        onUpdate();
      } else {
        const data = await res.json();
        setError(data.error || 'Error al actualizar');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
              Asiento {seat.seat}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl transition"
            >
              ×
            </button>
          </div>

          {seat.status === 'free' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Nombre"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Apellido *
                </label>
                <input
                  type="text"
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Apellido"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Edad
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min="1"
                  max="120"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Edad"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="paid"
                  checked={paid}
                  onChange={(e) => setPaid(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
                />
                <label htmlFor="paid" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Pagado
                </label>
              </div>
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {loading ? 'Guardando...' : 'Asignar Asiento'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                <div className="text-sm text-gray-600 dark:text-gray-400">Nombre</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{seat.name}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                <div className="text-sm text-gray-600 dark:text-gray-400">Apellido</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{seat.lastname}</div>
              </div>
              {seat.age && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Edad</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">{seat.age}</div>
                </div>
              )}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                <div className="text-sm text-gray-600 dark:text-gray-400">Estado de Pago</div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-semibold ${seat.paid ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                    {seat.paid ? 'Pagado' : 'Pendiente'}
                  </span>
                  <button
                    onClick={handleTogglePaid}
                    disabled={loading}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline disabled:opacity-50 transition"
                  >
                    {seat.paid ? 'Marcar como pendiente' : 'Marcar como pagado'}
                  </button>
                </div>
              </div>
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={loading}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 transition"
                >
                  {loading ? 'Liberando...' : 'Liberar Asiento'}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Liberar Asiento"
        message="¿Está seguro de liberar este asiento? Esta acción no se puede deshacer."
        confirmText="Liberar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={handleFreeConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
