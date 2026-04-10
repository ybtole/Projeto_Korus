import React from 'react';

export default function ArvoreSetores({ setores }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
      <h4 className="text-sm font-semibold mb-2">Hierarquia de Setores</h4>
      <ul className="text-sm text-gray-600">
        {(setores || []).length > 0 ? (
          setores.map(setor => <li key={setor.id}>{setor.nome}</li>)
        ) : (
          <li>Nenhum setor cadastrado.</li>
        )}
      </ul>
    </div>
  );
}