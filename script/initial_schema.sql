-- =============================================================================
-- PCM Águia — Sistema de Gestão de Metas PPR
-- Schema completo para Supabase (PostgreSQL)
-- =============================================================================
-- Convenções:
--   • IDs: uuid gerado via gen_random_uuid()
--   • Timestamps: timestamptz com default now()
--   • Soft-delete: coluna "ativa" (boolean) onde aplicável
--   • RLS habilitado em todas as tabelas (políticas a definir por papel)
-- =============================================================================


-- ---------------------------------------------------------------------------
-- EXTENSÕES
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- busca textual futura


-- ---------------------------------------------------------------------------
-- TIPOS ENUMERADOS
-- ---------------------------------------------------------------------------

-- Tipos de nó na árvore organizacional
create type tipo_setor as enum (
  'CORPORATIVO',
  'DIVISÃO',
  'SETOR',
  'EQUIPE',
  'CÉLULA'
);

-- Papéis de usuário dentro do sistema
create type papel_usuario as enum (
  'ADMIN',   -- acesso global
  'AC',      -- Analista de Custos
  'RA',      -- Responsável pela Área (gestor)
  'RM',      -- Responsável pelas Metas
  'LM'       -- Lançador de Metas
);

-- Direção de otimização da meta
create type direcao_meta as enum (
  'MAXIMIZAR',
  'MINIMIZAR'
);

-- Frequência de lançamento
create type frequencia_meta as enum (
  'MENSAL',
  'BIMESTRAL',
  'SEMESTRAL'
);

-- Tipo de avaliação da meta (define como o valor será classificado)
create type tipo_avaliacao_meta as enum (
  'RANGE',      -- faixas numéricas (ex: >= 100 = 100%, >= 80 = 80%, etc.)
  'BOOLEANO',   -- sim/não → 100% ou 0%
  'CATEGORICO'  -- categorias A/B/C/D/E com percentuais definidos
);

-- Ciclo semestral de referência
create type ciclo_semestre as enum (
  'FEV_SET',   -- Fevereiro → Setembro
  'SET_MAR'    -- Setembro → Março (ano seguinte)
);

-- Status do lançamento no fluxo kanban
create type status_lancamento as enum (
  'PENDENTE',
  'EM_ANDAMENTO',
  'AGUARDANDO_APROVACAO',
  'APROVADO',
  'REPROVADO'
);


-- =============================================================================
-- TABELA: setores
-- Árvore organizacional da empresa. Suporta hierarquia N níveis via parent_id.
-- =============================================================================
create table setores (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  tipo        tipo_setor not null default 'SETOR',
  parent_id   uuid references setores(id) on delete restrict,  -- impede exclusão com filhos

  -- Metadados
  descricao   text,                          -- descrição livre do setor
  codigo      text unique,                   -- código alfanumérico opcional (ex: "TI-INFRA")
  ativa       boolean not null default true, -- soft-delete / desativar setor sem excluir

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table setores is
  'Árvore organizacional. Nós podem ter qualquer profundidade via self-join em parent_id.';

create index idx_setores_parent   on setores(parent_id);
create index idx_setores_nome     on setores using gin(nome gin_trgm_ops);


-- =============================================================================
-- TABELA: perfis
-- Estende auth.users do Supabase com dados de negócio.
-- A coluna "id" espelha auth.users.id (uuid).
-- =============================================================================
create table perfis (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text,                          -- nome completo
  cpf         text unique,                   -- CPF somente dígitos (11 chars)
  email       text,
  papel       papel_usuario not null default 'LM',
  ativa       boolean not null default true,

  -- Setor "home" do usuário — pode atuar em múltiplos via perfis_setores
  setor_id    uuid references setores(id) on delete set null,

  -- Metadados extras (ex: telefone, cargo formal, foto_url)
  metadata    jsonb not null default '{}',

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table perfis is
  'Perfil de negócio de cada usuário autenticado. 1:1 com auth.users.';

create index idx_perfis_setor  on perfis(setor_id);
create index idx_perfis_papel  on perfis(papel);
create index idx_perfis_cpf    on perfis(cpf);


-- =============================================================================
-- TABELA: perfis_setores
-- Relacionamento N:N entre perfis e setores, com papel específico por setor.
-- Permite que um RM do setor TI também seja LM no setor Segurança, por ex.
-- =============================================================================
create table perfis_setores (
  id          uuid primary key default gen_random_uuid(),
  perfil_id   uuid not null references perfis(id) on delete cascade,
  setor_id    uuid not null references setores(id) on delete cascade,
  papel       papel_usuario not null default 'LM',  -- papel dentro deste setor específico
  ativa       boolean not null default true,

  created_at  timestamptz not null default now(),

  unique(perfil_id, setor_id)  -- um usuário tem apenas um papel por setor
);

comment on table perfis_setores is
  'Vínculos N:N entre usuários e setores, com papel por contexto.';

create index idx_perfis_setores_perfil on perfis_setores(perfil_id);
create index idx_perfis_setores_setor  on perfis_setores(setor_id);


-- =============================================================================
-- TABELA: metas
-- Definição de cada meta. Uma meta pertence a um setor "dono" (setor_id)
-- mas pode ser atribuída a outros setores via metas_setores_atribuidos.
-- =============================================================================
create table metas (
  id              uuid primary key default gen_random_uuid(),

  nome            text not null,
  descricao       text,                                -- descrição detalhada/instrução

  -- Setor criador / responsável principal
  setor_id        uuid not null references setores(id) on delete restrict,

  -- Configuração de cálculo
  direcao         direcao_meta not null default 'MAXIMIZAR',
  tipo_avaliacao  tipo_avaliacao_meta not null default 'RANGE',
  unidade         text,                                -- ex: "toras", "R$", "%"
  peso            numeric(6,2),                        -- peso % dentro do mês (ex: 3.571)

  -- Frequência e ciclo
  frequencia      frequencia_meta not null default 'MENSAL',
  dia_lancamento  smallint not null default 28 check (dia_lancamento between 1 and 31),
  semestre        ciclo_semestre not null default 'FEV_SET',
  ano             smallint not null default extract(year from now())::smallint,

  -- Faixas de percentual PPR (JSONB — flexível para RANGE, BOOLEANO e CATEGORICO)
  -- Estrutura esperada para RANGE:
  --   [{"de": "80", "ate": "100", "percentual": 100}, ...]
  -- Para BOOLEANO:
  --   [{"de": "1", "percentual": 100}, {"de": "0", "percentual": 0}]
  -- Para CATEGORICO:
  --   [{"categoria": "A", "percentual": 100}, {"categoria": "B", "percentual": 80}, ...]
  ranges          jsonb not null default '[]',

  -- Controle
  ativa           boolean not null default true,
  criado_por      uuid references perfis(id) on delete set null,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table metas is
  'Definição de cada meta PPR. Faixas de avaliação armazenadas em JSONB (ranges).';

create index idx_metas_setor     on metas(setor_id);
create index idx_metas_semestre  on metas(semestre, ano);
create index idx_metas_ativa     on metas(ativa);
create index idx_metas_nome      on metas using gin(nome gin_trgm_ops);


-- =============================================================================
-- TABELA: metas_setores_atribuidos
-- Permite que uma meta seja compartilhada / atribuída a outros setores.
-- Ex: "Uso de kit ergonomia" é meta do Comercial E da Segurança.
-- =============================================================================
create table metas_setores_atribuidos (
  id          uuid primary key default gen_random_uuid(),
  meta_id     uuid not null references metas(id) on delete cascade,
  setor_id    uuid not null references setores(id) on delete cascade,

  -- Peso específico desta atribuição para o setor (pode diferir do peso original)
  peso_override  numeric(6,2),

  -- O setor atribuído pode ter seu próprio RM responsável por esta meta
  rm_responsavel_id  uuid references perfis(id) on delete set null,

  created_at  timestamptz not null default now(),

  unique(meta_id, setor_id)
);

comment on table metas_setores_atribuidos is
  'Atribuição de uma meta a setores além do setor criador (metas compartilhadas).';

create index idx_msa_meta   on metas_setores_atribuidos(meta_id);
create index idx_msa_setor  on metas_setores_atribuidos(setor_id);


-- =============================================================================
-- TABELA: metas_lm
-- Define quais Lançadores de Meta (LM) são responsáveis por cada meta.
-- Um RM pode delegar o lançamento de uma meta específica a um ou mais LMs.
-- =============================================================================
create table metas_lm (
  id          uuid primary key default gen_random_uuid(),
  meta_id     uuid not null references metas(id) on delete cascade,
  perfil_id   uuid not null references perfis(id) on delete cascade,  -- deve ser LM

  -- Escopo: se informado, este LM só lança para este setor específico
  setor_id    uuid references setores(id) on delete cascade,

  ativa       boolean not null default true,
  created_at  timestamptz not null default now(),

  unique(meta_id, perfil_id, setor_id)
);

comment on table metas_lm is
  'Delegação: quais LMs podem lançar cada meta (e para qual setor).';

create index idx_metas_lm_meta   on metas_lm(meta_id);
create index idx_metas_lm_perfil on metas_lm(perfil_id);


-- =============================================================================
-- TABELA: ciclos_ppr
-- Registra cada ciclo semestral oficial de PPR por setor.
-- Permite que o A.C ajuste o percentual máximo real do PPR (pode ser < 120%).
-- =============================================================================
create table ciclos_ppr (
  id              uuid primary key default gen_random_uuid(),
  setor_id        uuid not null references setores(id) on delete cascade,
  semestre        ciclo_semestre not null,
  ano             smallint not null,

  -- Percentual máximo atingível neste ciclo (padrão 120%, AC pode ajustar)
  ppr_maximo      numeric(6,2) not null default 120,

  -- Fatores de ajuste considerados pelo A.C (documentação)
  -- Ex: {"horas_extras": -5, "compensacoes": -3, "faltas": -2}
  fatores_ajuste  jsonb not null default '{}',

  -- Notas livres do A.C
  observacoes     text,

  -- Status do ciclo
  encerrado       boolean not null default false,
  encerrado_em    timestamptz,
  encerrado_por   uuid references perfis(id) on delete set null,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique(setor_id, semestre, ano)
);

comment on table ciclos_ppr is
  'Ciclos semestrais de PPR por setor. O AC pode ajustar o % máximo e registrar fatores externos.';

create index idx_ciclos_setor    on ciclos_ppr(setor_id);
create index idx_ciclos_periodo  on ciclos_ppr(semestre, ano);


-- =============================================================================
-- TABELA: lancamentos
-- Lançamento mensal (ou semestral) de valor para uma meta.
-- É o coração do fluxo kanban: PENDENTE → EM_ANDAMENTO → AGUARDANDO → APROVADO/REPROVADO
-- =============================================================================
create table lancamentos (
  id              uuid primary key default gen_random_uuid(),
  meta_id         uuid not null references metas(id) on delete restrict,

  -- Período
  mes_referencia  text not null,  -- formato 'YYYY-MM' (ex: '2025-03')

  -- Valor lançado (armazenado como text para suportar categorias e booleanos)
  valor           text,

  -- Percentual PPR calculado automaticamente após aprovação (0–100)
  percentual_ppr  numeric(5,2),

  -- Fluxo de aprovação
  status          status_lancamento not null default 'PENDENTE',

  -- Rastreabilidade
  criado_por      text,          -- email do usuário (compatível com código existente)
  criado_por_id   uuid references perfis(id) on delete set null,
  aprovado_por    uuid references perfis(id) on delete set null,
  aprovado_em     timestamptz,
  reprovado_por   uuid references perfis(id) on delete set null,
  reprovado_em    timestamptz,
  motivo_reprovacao text,

  observacoes     text,
  data_criacao    timestamptz not null default now(),  -- mantido igual ao código original
  updated_at      timestamptz not null default now(),

  -- Garante unicidade: um lançamento por meta por mês
  unique(meta_id, mes_referencia)
);

comment on table lancamentos is
  'Lançamentos de valor para cada meta em cada período. Fluxo kanban completo.';

create index idx_lancamentos_meta     on lancamentos(meta_id);
create index idx_lancamentos_mes      on lancamentos(mes_referencia);
create index idx_lancamentos_status   on lancamentos(status);
create index idx_lancamentos_criacao  on lancamentos(data_criacao desc);
create index idx_lancamentos_meta_mes on lancamentos(meta_id, mes_referencia);


-- =============================================================================
-- TABELA: lancamento_historico
-- Log imutável de cada mudança de status em um lançamento.
-- Útil para auditoria e rastreamento do fluxo de aprovação.
-- =============================================================================
create table lancamento_historico (
  id              uuid primary key default gen_random_uuid(),
  lancamento_id   uuid not null references lancamentos(id) on delete cascade,

  status_anterior status_lancamento,
  status_novo     status_lancamento not null,

  valor_anterior  text,
  valor_novo      text,

  alterado_por    uuid references perfis(id) on delete set null,
  alterado_por_email text,   -- fallback texto, igual ao padrão do sistema
  observacao      text,

  created_at      timestamptz not null default now()
);

comment on table lancamento_historico is
  'Log imutável de cada transição de status e alteração de valor em lançamentos.';

create index idx_hist_lancamento on lancamento_historico(lancamento_id);
create index idx_hist_criacao    on lancamento_historico(created_at desc);


-- =============================================================================
-- TABELA: comprovantes
-- Metadados dos arquivos enviados ao Supabase Storage para um lançamento.
-- O arquivo físico fica em storage bucket "comprovantes".
-- =============================================================================
create table comprovantes (
  id              uuid primary key default gen_random_uuid(),
  lancamento_id   uuid not null references lancamentos(id) on delete cascade,

  nome_arquivo    text not null,       -- nome original do arquivo
  storage_path    text not null,       -- path dentro do bucket (ex: lancamentos/{id}/arquivo.pdf)
  mime_type       text,
  tamanho_bytes   bigint,

  enviado_por     uuid references perfis(id) on delete set null,
  enviado_por_email text,

  created_at      timestamptz not null default now()
);

comment on table comprovantes is
  'Metadados de arquivos comprobatórios vinculados a lançamentos (físico no Storage).';

create index idx_comprovantes_lancamento on comprovantes(lancamento_id);


-- =============================================================================
-- TABELA: resultados_mensais
-- Cache calculado do resultado PPR de cada setor a cada mês.
-- Atualizado via trigger ou função RPC após aprovação/reprovação de lançamento.
-- =============================================================================
create table resultados_mensais (
  id              uuid primary key default gen_random_uuid(),
  setor_id        uuid not null references setores(id) on delete cascade,
  mes_referencia  text not null,              -- 'YYYY-MM'
  semestre        ciclo_semestre not null,
  ano             smallint not null,

  -- Totais calculados
  total_metas     integer not null default 0,
  metas_aprovadas integer not null default 0,
  metas_reprovadas integer not null default 0,
  metas_pendentes integer not null default 0,

  -- Resultado PPR do mês (0–20, pois cada mês vale até 20% do semestre)
  percentual_mes  numeric(6,2) not null default 0,

  -- Soma ponderada dos percentuais PPR das metas aprovadas neste mês
  percentual_ppr_acumulado numeric(6,2) not null default 0,

  calculado_em    timestamptz not null default now(),

  unique(setor_id, mes_referencia)
);

comment on table resultados_mensais is
  'Cache do resultado PPR mensal por setor. Recalculado a cada aprovação/reprovação.';

create index idx_resultados_setor  on resultados_mensais(setor_id);
create index idx_resultados_mes    on resultados_mensais(mes_referencia);


-- =============================================================================
-- TABELA: resultados_semestrais
-- Consolidação do PPR final do semestre por setor (após todos os meses).
-- Inclui os ajustes do A.C registrados em ciclos_ppr.
-- =============================================================================
create table resultados_semestrais (
  id              uuid primary key default gen_random_uuid(),
  ciclo_id        uuid not null references ciclos_ppr(id) on delete cascade,
  setor_id        uuid not null references setores(id) on delete cascade,

  -- % bruto calculado pelas metas (max 120)
  percentual_bruto   numeric(6,2) not null default 0,

  -- % final após fatores de ajuste do A.C
  percentual_final   numeric(6,2) not null default 0,

  -- Detalhamento mês a mês (snapshot)
  detalhe_meses      jsonb not null default '[]',

  -- Status de homologação pelo A.C
  homologado          boolean not null default false,
  homologado_por      uuid references perfis(id) on delete set null,
  homologado_em       timestamptz,
  observacoes_ac      text,

  calculado_em    timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique(ciclo_id, setor_id)
);

comment on table resultados_semestrais is
  'PPR semestral consolidado por setor, com ajustes do AC e homologação.';

create index idx_res_sem_ciclo  on resultados_semestrais(ciclo_id);
create index idx_res_sem_setor  on resultados_semestrais(setor_id);


-- =============================================================================
-- TABELA: notificacoes
-- Central de notificações in-app para avisos de prazo, reprovações, etc.
-- =============================================================================
create table notificacoes (
  id              uuid primary key default gen_random_uuid(),
  perfil_id       uuid not null references perfis(id) on delete cascade,

  tipo            text not null,   -- ex: 'LANCAMENTO_ATRASADO', 'REPROVADO', 'APROVADO', 'ALERTA_PRAZO'
  titulo          text not null,
  mensagem        text,

  -- Referência ao objeto relacionado (opcional)
  ref_tabela      text,            -- ex: 'lancamentos', 'metas'
  ref_id          uuid,

  lida            boolean not null default false,
  lida_em         timestamptz,

  created_at      timestamptz not null default now()
);

comment on table notificacoes is
  'Notificações in-app por usuário. Suporta tipos variados com referência ao objeto de origem.';

create index idx_notif_perfil  on notificacoes(perfil_id, lida, created_at desc);
create index idx_notif_tipo    on notificacoes(tipo);


-- =============================================================================
-- TRIGGERS — atualização automática de updated_at
-- =============================================================================

create or replace function fn_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_setores_updated_at
  before update on setores
  for each row execute function fn_set_updated_at();

create trigger trg_perfis_updated_at
  before update on perfis
  for each row execute function fn_set_updated_at();

create trigger trg_metas_updated_at
  before update on metas
  for each row execute function fn_set_updated_at();

create trigger trg_lancamentos_updated_at
  before update on lancamentos
  for each row execute function fn_set_updated_at();

create trigger trg_ciclos_updated_at
  before update on ciclos_ppr
  for each row execute function fn_set_updated_at();

create trigger trg_res_sem_updated_at
  before update on resultados_semestrais
  for each row execute function fn_set_updated_at();


-- =============================================================================
-- TRIGGER — log automático de histórico de lançamentos
-- Toda alteração de status ou valor em lancamentos é registrada no histórico.
-- =============================================================================

create or replace function fn_log_lancamento_historico()
returns trigger language plpgsql as $$
begin
  if (old.status is distinct from new.status)
  or (old.valor  is distinct from new.valor)
  then
    insert into lancamento_historico (
      lancamento_id,
      status_anterior,
      status_novo,
      valor_anterior,
      valor_novo,
      alterado_por_email
    ) values (
      new.id,
      old.status,
      new.status,
      old.valor,
      new.valor,
      new.criado_por   -- fallback: usa o email armazenado
    );
  end if;
  return new;
end;
$$;

create trigger trg_lancamento_historico
  after update on lancamentos
  for each row execute function fn_log_lancamento_historico();


-- =============================================================================
-- TRIGGER — criação automática de perfil ao registrar usuário no Auth
-- =============================================================================

create or replace function fn_handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into perfis (id, email, cpf, papel, metadata)
  values (
    new.id,
    new.email,
    replace(replace(split_part(new.email, '@', 1), '.', ''), '-', ''),  -- extrai CPF do email
    coalesce((new.raw_user_meta_data->>'papel')::papel_usuario, 'LM'),
    coalesce(new.raw_user_meta_data, '{}')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_new_auth_user
  after insert on auth.users
  for each row execute function fn_handle_new_user();


-- =============================================================================
-- FUNÇÃO: calcular_percentual_meta
-- Retorna o percentual PPR (0–100) para um valor lançado em uma meta,
-- levando em conta o tipo de avaliação e a direção.
-- =============================================================================

create or replace function calcular_percentual_meta(
  p_meta_id   uuid,
  p_valor     text
)
returns numeric language plpgsql as $$
declare
  v_meta        metas%rowtype;
  v_valor_num   numeric;
  v_range       jsonb;
  v_de          numeric;
  v_ate         numeric;
  v_percentual  numeric := 0;
begin
  select * into v_meta from metas where id = p_meta_id;
  if not found then return 0; end if;

  -- BOOLEANO
  if v_meta.tipo_avaliacao = 'BOOLEANO' then
    return case when lower(p_valor) in ('true','1','sim','s','yes') then 100 else 0 end;
  end if;

  -- CATEGORICO
  if v_meta.tipo_avaliacao = 'CATEGORICO' then
    select (r->>'percentual')::numeric into v_percentual
    from jsonb_array_elements(v_meta.ranges) r
    where upper(r->>'categoria') = upper(p_valor)
    limit 1;
    return coalesce(v_percentual, 0);
  end if;

  -- RANGE (padrão)
  v_valor_num := p_valor::numeric;

  if v_meta.direcao = 'MAXIMIZAR' then
    -- Ordena pelas faixas de maior para menor e pega a primeira que encaixa
    for v_range in
      select r from jsonb_array_elements(v_meta.ranges) r
      order by (r->>'de')::numeric desc
    loop
      v_de  := (v_range->>'de')::numeric;
      v_ate := coalesce(nullif(v_range->>'ate',''), 'Infinity')::numeric;
      if v_valor_num >= v_de and v_valor_num <= v_ate then
        return least((v_range->>'percentual')::numeric, 100);
      end if;
    end loop;
  else -- MINIMIZAR
    for v_range in
      select r from jsonb_array_elements(v_meta.ranges) r
      order by (r->>'de')::numeric asc
    loop
      v_de  := (v_range->>'de')::numeric;
      v_ate := coalesce(nullif(v_range->>'ate',''), 'Infinity')::numeric;
      if v_valor_num <= v_de then
        return least((v_range->>'percentual')::numeric, 100);
      end if;
    end loop;
  end if;

  return 0;
end;
$$;

comment on function calcular_percentual_meta is
  'Calcula o % PPR (0–100) de um lançamento com base nas faixas da meta.';


-- =============================================================================
-- FUNÇÃO: recalcular_resultado_mensal
-- Recalcula resultados_mensais para um setor + mês após qualquer mudança.
-- Chamada por trigger ou manualmente após aprovação em lote.
-- =============================================================================

create or replace function recalcular_resultado_mensal(
  p_setor_id      uuid,
  p_mes_referencia text
)
returns void language plpgsql as $$
declare
  v_total       integer := 0;
  v_aprovadas   integer := 0;
  v_reprovadas  integer := 0;
  v_pendentes   integer := 0;
  v_ppr_acum    numeric := 0;
  v_semestre    ciclo_semestre;
  v_ano         smallint;
begin
  -- Identifica semestre e ano a partir do mês
  v_ano := split_part(p_mes_referencia, '-', 1)::smallint;
  declare
    v_mes smallint := split_part(p_mes_referencia, '-', 2)::smallint;
  begin
    v_semestre := case
      when v_mes between 2 and 9 then 'FEV_SET'::ciclo_semestre
      else 'SET_MAR'::ciclo_semestre
    end;
  end;

  -- Agrega lançamentos aprovados/reprovados/pendentes para as metas do setor
  select
    count(*)                                                    into v_total
  from lancamentos l
  join metas m on m.id = l.meta_id
  where m.setor_id = p_setor_id
    and l.mes_referencia = p_mes_referencia;

  select
    count(*) filter (where l.status = 'APROVADO'),
    count(*) filter (where l.status = 'REPROVADO'),
    count(*) filter (where l.status = 'PENDENTE'),
    coalesce(sum(l.percentual_ppr * coalesce(m.peso,0) / 100), 0)
  into v_aprovadas, v_reprovadas, v_pendentes, v_ppr_acum
  from lancamentos l
  join metas m on m.id = l.meta_id
  where m.setor_id = p_setor_id
    and l.mes_referencia = p_mes_referencia;

  insert into resultados_mensais (
    setor_id, mes_referencia, semestre, ano,
    total_metas, metas_aprovadas, metas_reprovadas, metas_pendentes,
    percentual_mes, percentual_ppr_acumulado, calculado_em
  ) values (
    p_setor_id, p_mes_referencia, v_semestre, v_ano,
    v_total, v_aprovadas, v_reprovadas, v_pendentes,
    least(v_ppr_acum / 5, 20),  -- cada mês vale no máx 20% (= 100% / 5 meses base)
    v_ppr_acum, now()
  )
  on conflict (setor_id, mes_referencia) do update set
    total_metas             = excluded.total_metas,
    metas_aprovadas         = excluded.metas_aprovadas,
    metas_reprovadas        = excluded.metas_reprovadas,
    metas_pendentes         = excluded.metas_pendentes,
    percentual_mes          = excluded.percentual_mes,
    percentual_ppr_acumulado = excluded.percentual_ppr_acumulado,
    calculado_em            = now();
end;
$$;

comment on function recalcular_resultado_mensal is
  'Recalcula e faz upsert em resultados_mensais para setor + mês informados.';


-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Habilita RLS em todas as tabelas. Políticas devem ser criadas por papel.
-- Por ora, políticas permissivas para authenticated (ajustar por projeto).
-- =============================================================================

alter table setores                  enable row level security;
alter table perfis                   enable row level security;
alter table perfis_setores           enable row level security;
alter table metas                    enable row level security;
alter table metas_setores_atribuidos enable row level security;
alter table metas_lm                 enable row level security;
alter table ciclos_ppr               enable row level security;
alter table lancamentos              enable row level security;
alter table lancamento_historico     enable row level security;
alter table comprovantes             enable row level security;
alter table resultados_mensais       enable row level security;
alter table resultados_semestrais    enable row level security;
alter table notificacoes             enable row level security;

-- Políticas base: usuários autenticados lêem tudo (refinar por papel depois)
-- Setores
create policy "setores_select" on setores for select to authenticated using (true);
create policy "setores_insert" on setores for insert to authenticated with check (true);
create policy "setores_update" on setores for update to authenticated using (true);
create policy "setores_delete" on setores for delete to authenticated using (true);

-- Perfis: cada usuário vê/edita o próprio; ADMIN e AC vêem todos
create policy "perfis_select_own" on perfis
  for select to authenticated
  using (id = auth.uid() or exists (
    select 1 from perfis p where p.id = auth.uid() and p.papel in ('ADMIN','AC')
  ));
create policy "perfis_update_own" on perfis
  for update to authenticated
  using (id = auth.uid() or exists (
    select 1 from perfis p where p.id = auth.uid() and p.papel in ('ADMIN','AC')
  ));
create policy "perfis_insert_admin" on perfis
  for insert to authenticated
  with check (exists (
    select 1 from perfis p where p.id = auth.uid() and p.papel in ('ADMIN','AC')
  ));

-- Metas
create policy "metas_select"  on metas for select  to authenticated using (true);
create policy "metas_insert"  on metas for insert  to authenticated with check (true);
create policy "metas_update"  on metas for update  to authenticated using (true);
create policy "metas_delete"  on metas for delete  to authenticated using (true);

-- Lançamentos
create policy "lancamentos_select" on lancamentos for select to authenticated using (true);
create policy "lancamentos_insert" on lancamentos for insert to authenticated with check (true);
create policy "lancamentos_update" on lancamentos for update to authenticated using (true);
create policy "lancamentos_delete" on lancamentos for delete to authenticated using (true);

-- Histórico — somente leitura para autenticados
create policy "historico_select" on lancamento_historico
  for select to authenticated using (true);

-- Comprovantes
create policy "comprovantes_select" on comprovantes for select to authenticated using (true);
create policy "comprovantes_insert" on comprovantes for insert to authenticated with check (true);

-- Resultados
create policy "resultados_mensais_select"    on resultados_mensais    for select to authenticated using (true);
create policy "resultados_semestrais_select" on resultados_semestrais for select to authenticated using (true);

-- Notificações — cada usuário vê apenas as suas
create policy "notif_select_own" on notificacoes
  for select to authenticated using (perfil_id = auth.uid());
create policy "notif_update_own" on notificacoes
  for update to authenticated using (perfil_id = auth.uid());

-- Tabelas auxiliares
create policy "perfis_setores_select"           on perfis_setores           for select to authenticated using (true);
create policy "perfis_setores_insert"           on perfis_setores           for insert to authenticated with check (true);
create policy "perfis_setores_update"           on perfis_setores           for update to authenticated using (true);
create policy "metas_setores_atribuidos_select" on metas_setores_atribuidos for select to authenticated using (true);
create policy "metas_setores_atribuidos_insert" on metas_setores_atribuidos for insert to authenticated with check (true);
create policy "metas_lm_select"                 on metas_lm                 for select to authenticated using (true);
create policy "metas_lm_insert"                 on metas_lm                 for insert to authenticated with check (true);
create policy "ciclos_ppr_select"               on ciclos_ppr               for select to authenticated using (true);
create policy "ciclos_ppr_insert"               on ciclos_ppr               for insert to authenticated with check (true);
create policy "ciclos_ppr_update"               on ciclos_ppr               for update to authenticated using (true);


-- =============================================================================
-- STORAGE BUCKET: comprovantes
-- Bucket público com pasta por lançamento: lancamentos/{lancamento_id}/
-- =============================================================================
-- (executar via Supabase Dashboard ou SQL Editor com extensão storage)
-- insert into storage.buckets (id, name, public)
-- values ('comprovantes', 'comprovantes', false)
-- on conflict do nothing;


-- =============================================================================
-- DADOS INICIAIS — Papel ADMIN para primeiro usuário
-- (substituir o uuid pelo id real do primeiro usuário após criação)
-- =============================================================================
-- update perfis set papel = 'ADMIN' where cpf = '00000000000';


-- =============================================================================
-- FIM DO SCHEMA
-- =============================================================================
