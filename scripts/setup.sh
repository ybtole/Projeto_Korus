#!/bin/bash

# ==============================================================================
# KORUS - SCRIPT DE SETUP AUTOMATIZADO
# ==============================================================================

echo "🚀 Iniciando setup do Projeto Korus..."

# 1. Instalação de Dependências - Backend
echo "📦 Instalando dependências do Backend..."
cd backend
npm install
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠️ Arquivo .env criado no Backend. NÃO ESQUEÇA DE CONFIGURAR AS CHAVES DO SUPABASE!"
fi
cd ..

# 2. Instalação de Dependências - Frontend
echo "📦 Instalando dependências do Frontend..."
cd frontend
npm install
if [ ! -f .env ]; then
  echo "VITE_API_URL=http://localhost:3333/api" > .env
  echo "✓ Arquivo .env criado no Frontend."
fi
cd ..

# 3. Limpeza de portas (Prevenção de erro EADDRINUSE)
echo "🧹 Limpando porta 3333 (Backend)..."
fuser -k 3333/tcp 2>/dev/null

echo "------------------------------------------------------------------"
echo "✅ Setup concluído com sucesso!"
echo "------------------------------------------------------------------"
echo "📋 PRÓXIMOS PASSOS OBRIGATÓRIOS:"
echo "1. Configure o arquivo 'backend/.env' com as credenciais do Supabase."
echo "2. No SQL Editor do seu Supabase, execute os seguintes passos:"
echo "   a) Crie as tabelas (conforme o script SQL fornecido)."
echo "   b) Crie as funções RPC (get_descendentes, ativar_ciclo, etc)."
echo "   c) Rode o SQL de Reset de Senha do Admin para garantir o acesso:"
echo "      UPDATE usuarios SET senha = '\$2b\$10\$y/DrfacCOvnQXTMtRHjfueDNf81pim5ciA5LK/gfvcgqFxiBn.ijq' WHERE id = 1;"
echo ""
echo "🚀 Para rodar o projeto:"
echo "Terminal 1 (Backend): cd backend && npm run dev"
echo "Terminal 2 (Frontend): cd frontend && npm run dev"
echo "------------------------------------------------------------------"