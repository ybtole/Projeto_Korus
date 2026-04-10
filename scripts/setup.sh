#!/usr/bin/env bash

echo "=== KORUS — Setup do ambiente ==="

# Parar em caso de erro
set -e

# Backend
echo ""
echo "→ Instalando dependências do backend..."
cd backend || exit
npm install

# Copiar .env se não existir
if [ ! -f .env ]; then
  cp .env.example .env
fi

echo "✓ Backend pronto. Edite o arquivo backend/.env com suas credenciais do banco."

# Frontend
echo ""
echo "→ Instalando dependências do frontend..."
cd ../frontend || exit
npm install
echo "✓ Frontend pronto."

# Electron
echo ""
echo "→ Instalando dependências do Electron..."
cd ../electron || exit
npm install
echo "✓ Electron pronto."

# Voltar para raiz
cd ..

echo ""
echo "=== Setup concluído ==="
echo ""
echo "Próximos passos:"
echo "  1. Configure o PostgreSQL e edite backend/.env"
echo "  2. cd backend && npm run migrate"
echo "  3. cd backend && npm run seed"
echo "  4. cd backend && npm run dev"
echo "  5. cd frontend && npm run dev"