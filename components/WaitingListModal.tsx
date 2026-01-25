'use client';

import { useState } from 'react';
import type { WaitingListEntry } from '@/lib/kv';
import ConfirmDialog from './ConfirmDialog';

interface WaitingListModalProps {
  waitingList: WaitingListEntry[];
  nextEligible: WaitingListEntry | null;
  available: number;
  onClose: () => void;
  onUpdate: () => void;
}

export default function WaitingListModal({
  waitingList,
  nextEligible,
  available,
  onClose,
  onUpdate,
}: WaitingListModalProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [lastname, setLastname] = useState('');
  const [requestedSeats, setRequestedSeats] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/waiting-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          lastname,
          requestedSeats: parseInt(requestedSeats),
        }),
      });

      if (res.ok) {
        setName('');
        setLastname('');
        setRequestedSeats('1');
        setShowAddForm(false);
        onUpdate();
      } else {
        const data = await res.json();
        setError(data.error || 'Error al agregar');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setShowConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    
    setShowConfirm(false);
    try {
      const res = await fetch(`/api/waiting-list?id=${deleteId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        onUpdate();
      }
    } catch (err) {
      console.error('Error eliminando:', err);
    } finally {
      setDeleteId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">Lista de Espera</h2>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl transition"
            >
              ×
            </button>
          </div>

          <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Asientos disponibles:</strong> {available}
            </div>
            {nextEligible ? (
              <div className="mt-2 text-sm text-blue-800 dark:text-blue-300">
                <strong>Siguiente elegible:</strong> {nextEligible.name} {nextEligible.lastname} 
                {' '}(requiere {nextEligible.requestedSeats} asiento{nextEligible.requestedSeats > 1 ? 's' : ''})
              </div>
            ) : (
              <div className="mt-2 text-sm text-blue-800 dark:text-blue-300">
                No hay personas elegibles con los asientos disponibles actualmente.
              </div>
            )}
          </div>

          <div className="mb-4">
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition w-full sm:w-auto"
              >
                + Agregar a Lista de Espera
              </button>
            ) : (
              <form onSubmit={handleAdd} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Asientos Requeridos *
                  </label>
                  <input
                    type="number"
                    value={requestedSeats}
                    onChange={(e) => setRequestedSeats(e.target.value)}
                    required
                    min="1"
                    max="60"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
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
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 transition"
                  >
                    {loading ? 'Agregando...' : 'Agregar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setError('');
                    }}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>

          {waitingList.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No hay personas en la lista de espera
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="border border-gray-300 dark:border-gray-600 px-2 sm:px-4 py-2 text-left text-xs sm:text-sm text-gray-700 dark:text-gray-300">Posición</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-2 sm:px-4 py-2 text-left text-xs sm:text-sm text-gray-700 dark:text-gray-300">Nombre</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-2 sm:px-4 py-2 text-left text-xs sm:text-sm text-gray-700 dark:text-gray-300">Apellido</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-2 sm:px-4 py-2 text-left text-xs sm:text-sm text-gray-700 dark:text-gray-300">Asientos</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-2 sm:px-4 py-2 text-left text-xs sm:text-sm text-gray-700 dark:text-gray-300 hidden sm:table-cell">Fecha</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-2 sm:px-4 py-2 text-left text-xs sm:text-sm text-gray-700 dark:text-gray-300">Estado</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-2 sm:px-4 py-2 text-left text-xs sm:text-sm text-gray-700 dark:text-gray-300">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {waitingList.map((entry, index) => {
                    const isEligible = nextEligible?.id === entry.id;
                    return (
                      <tr
                        key={entry.id}
                        className={isEligible ? 'bg-green-50 dark:bg-green-900/20' : ''}
                      >
                        <td className="border border-gray-300 dark:border-gray-600 px-2 sm:px-4 py-2 text-gray-900 dark:text-white">{index + 1}</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-2 sm:px-4 py-2 text-gray-900 dark:text-white">{entry.name}</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-2 sm:px-4 py-2 text-gray-900 dark:text-white">{entry.lastname}</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-2 sm:px-4 py-2 text-gray-900 dark:text-white">{entry.requestedSeats}</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-2 sm:px-4 py-2 text-gray-900 dark:text-white hidden sm:table-cell">{formatDate(entry.createdAt)}</td>
                        <td className="border border-gray-300 dark:border-gray-600 px-2 sm:px-4 py-2">
                          {isEligible ? (
                            <span className="text-green-600 dark:text-green-400 font-semibold">✓ Elegible</span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">En espera</span>
                          )}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-2 sm:px-4 py-2">
                          <button
                            onClick={() => handleDeleteClick(entry.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs sm:text-sm underline transition"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Eliminar Registro"
        message="¿Está seguro de eliminar este registro de la lista de espera?"
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setShowConfirm(false);
          setDeleteId(null);
        }}
      />
    </>
  );
}
