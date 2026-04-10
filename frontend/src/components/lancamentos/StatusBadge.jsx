import React from 'react';

export default function StatusBadge({ status }) {
  const getColors = () => {
    switch (status) {
      case 'APROVADO': return 'bg-green-100 text-green-800';
      case 'REPROVADO': return 'bg-red-100 text-red-800';
      case 'PENDENTE': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full flex w-fit ${getColors()}`}>
      {status || 'Desconhecido'}
    </span>
  );
}