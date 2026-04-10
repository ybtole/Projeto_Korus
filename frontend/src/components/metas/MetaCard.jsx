import React from 'react';

export default function MetaCard({ meta }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-2">
      <h3 className="text-lg font-semibold text-gray-900">{meta?.nome || 'Nova Meta'}</h3>
      <p className="text-sm text-gray-500">{meta?.descricao || 'Sem descrição'}</p>
    </div>
  );
}