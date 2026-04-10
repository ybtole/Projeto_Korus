#!/usr/bin/env fish

echo "=== KORUS — Setup do ambiente ==="

# Backend
echo ""
echo "→ Instalando dependências do backend..."
cd backend
npm install
cp -n .env.example .env
echo "✓ Backend pronto. Edite o arquivo backend/.env com suas credenciais do banco."

# Frontend
echo ""
echo "→ Instalando dependências do frontend..."
cd ../frontend
npm install
echo "✓ Frontend pronto."

# Electron
echo ""
echo "→ Instalando dependências do Electron..."
cd ../electron
npm install
echo "✓ Electron pronto."

cd ..
echo ""
echo "=== Setup concluído ==="
echo ""
echo "Próximos passos:"
echo "  1. Configure o projeto no Supabase e edite backend/.env com SUPABASE_URL e SUPABASE_KEY"
echo "  2. cd backend && npm run dev"
echo "  3. cd frontend && npm run dev"
echo "  4. Em outro terminal: cd electron && npm start"