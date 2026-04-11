# PCM Águia — Sistema de Gestão de Metas (PPR)

Stack: React + Vite + TailwindCSS + Supabase

---

## Configuração rápida

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo de exemplo e preencha com os dados do seu projeto Supabase:

```bash
cp .env.example .env
```

Edite o `.env`:
```
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

Encontre essas chaves em: **Supabase Dashboard → Project Settings → API**

### 3. Criar o banco de dados

No **Supabase Dashboard → SQL Editor**, cole e execute o conteúdo completo de `supabase_schema.sql`.

Isso cria:
- Tabelas: `setores`, `metas`, `lancamentos`, `papeis`, `anexos`
- RLS com controle por papel (R.A, R.M, L.M, A.C)
- RPC `calcular_ppr_setor()` para cálculo PPR via SQL
- View `vw_ppr_resumo` para dashboard
- Dados de exemplo (estrutura Águia Florestal)

### 4. Criar bucket de Storage

No **Supabase Dashboard → Storage**, crie um bucket chamado `comprovantes` (private).

### 5. Criar usuário de teste

No **Supabase Dashboard → Authentication → Users → Add user**:
- Email: `00000000000@aguia.com` (CPF sem pontuação + @aguia.com)
- Senha: à sua escolha

### 6. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:5173

---

## Estrutura do projeto

```
src/
├── lib/
│   └── supabase.js          # cliente Supabase
├── hooks/
│   ├── useSetores.js         # CRUD + Realtime setores
│   └── useLancamentos.js     # CRUD + Realtime lançamentos
├── components/
│   ├── shared/
│   │   └── Modal.jsx
│   ├── tree/
│   │   ├── NeuralTree.jsx    # visualização SVG estilo rede neural
│   │   └── SetorModal.jsx
│   └── kanban/
│       ├── KanbanBoard.jsx
│       ├── KanbanColumn.jsx
│       ├── KanbanCard.jsx    # draggable (@dnd-kit)
│       └── CardModal.jsx     # detalhes + upload
├── pages/
│   ├── LoginPage.jsx         # auth com CPF
│   ├── MainLayout.jsx        # sidebar + roteamento
│   ├── OrgTreePage.jsx       # página da árvore
│   └── KanbanPage.jsx        # página do kanban
└── App.jsx                   # root com auth state
```

---

## Papéis de usuário

| Papel | Descrição |
|-------|-----------|
| **R.A** | Visão geral — lê tudo, não edita |
| **R.M** | Responsável da meta — edita metas do setor |
| **L.M** | Lançador — cria e edita lançamentos |
| **A.C** | Aprovador Chefe — acesso total |

Para atribuir papéis, insira na tabela `papeis`:
```sql
insert into papeis (user_id, setor_id, papel)
values ('uuid-do-user', 'uuid-do-setor', 'A.C');
```

---

## Cálculo PPR

O PPR é calculado via RPC no banco:

```js
const { data } = await supabase.rpc('calcular_ppr_setor', {
  p_setor_id: 'uuid-do-setor',
  p_ano: 2025
})
```

- Máximo: **120%**
- 6 meses × 20% cada
- Regras: range (linear), booleano, categórico

---

## Build para produção

```bash
npm run build
```

Os arquivos ficam em `dist/` — sirva com qualquer hosting estático (Vercel, Netlify, etc.).