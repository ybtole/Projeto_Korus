-- ============================================================
-- PCM Águia — Schema SQL completo
-- Execute no SQL Editor do Supabase
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. SETORES
-- ─────────────────────────────────────────────────────────────
create table if not exists public.setores (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  tipo       text not null default 'SETOR',
  parent_id  uuid references public.setores(id) on delete restrict,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- 2. PAPÉIS (roles por usuário/setor)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.papeis (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid references auth.users(id) on delete cascade,
  setor_id  uuid references public.setores(id) on delete cascade,
  papel     text not null check (papel in ('R.A','R.M','L.M','A.C')),
  unique (user_id, setor_id, papel)
);

-- ─────────────────────────────────────────────────────────────
-- 3. METAS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.metas (
  id            uuid primary key default gen_random_uuid(),
  setor_id      uuid references public.setores(id) on delete cascade,
  nome          text not null,
  descricao     text,
  unidade       text,
  peso          numeric(5,2) default 100,
  direcao       text not null default 'MAXIMIZAR' check (direcao in ('MAXIMIZAR','MINIMIZAR')),
  tipo_calculo  text not null default 'range' check (tipo_calculo in ('range','booleano','categorico')),
  meta_minima   numeric,
  meta_maxima   numeric,
  periodicidade text not null default 'mensal' check (periodicidade in ('mensal','semestral')),
  ativo         boolean default true,
  created_at    timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- 4. LANÇAMENTOS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.lancamentos (
  id               uuid primary key default gen_random_uuid(),
  meta_id          uuid references public.metas(id) on delete cascade,
  mes_referencia   text not null,   -- formato: '2025-01'
  valor            numeric,
  status           text not null default 'PENDENTE'
                     check (status in ('PENDENTE','EM_ANDAMENTO','AGUARDANDO_APROVACAO','APROVADO','REPROVADO')),
  observacoes      text,
  criado_por       text,            -- email do usuário
  aprovado_por     text,
  data_aprovacao   timestamptz,
  data_criacao     timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- 5. ANEXOS (Storage reference)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.anexos (
  id              uuid primary key default gen_random_uuid(),
  lancamento_id   uuid references public.lancamentos(id) on delete cascade,
  storage_path    text not null,
  nome_arquivo    text,
  criado_por      text,
  created_at      timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- 6. TRIGGER: updated_at automático
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lancamentos_updated_at on public.lancamentos;
create trigger lancamentos_updated_at
  before update on public.lancamentos
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 7. RPC: calcular_ppr_setor
-- Retorna % PPR acumulado do semestre para um setor
-- ─────────────────────────────────────────────────────────────
create or replace function public.calcular_ppr_setor(p_setor_id uuid, p_ano int)
returns table (
  meta_id       uuid,
  meta_nome     text,
  peso          numeric,
  media_score   numeric,
  contribuicao  numeric
)
language sql stable as $$
  with scores as (
    select
      m.id                             as meta_id,
      m.nome                           as meta_nome,
      m.peso                           as peso,
      m.meta_minima,
      m.meta_maxima,
      m.direcao,
      l.valor,
      l.mes_referencia,
      case
        when m.tipo_calculo = 'booleano' then
          case when l.valor = 1 then 100.0 else 0.0 end
        when m.tipo_calculo = 'range' and m.meta_maxima is not null and m.meta_minima is not null then
          case m.direcao
            when 'MAXIMIZAR' then
              least(120, greatest(0,
                (l.valor - m.meta_minima) / nullif(m.meta_maxima - m.meta_minima, 0) * 100
              ))
            when 'MINIMIZAR' then
              least(120, greatest(0,
                (m.meta_maxima - l.valor) / nullif(m.meta_maxima - m.meta_minima, 0) * 100
              ))
          end
        else 0.0
      end                              as score
    from public.metas m
    join public.lancamentos l on l.meta_id = m.id
    where m.setor_id = p_setor_id
      and l.status = 'APROVADO'
      and l.mes_referencia like (p_ano::text || '-%')
  )
  select
    meta_id,
    meta_nome,
    peso,
    round(avg(score), 2)                              as media_score,
    round(avg(score) * peso / 100.0, 2)               as contribuicao
  from scores
  group by meta_id, meta_nome, peso
  order by contribuicao desc;
$$;

-- ─────────────────────────────────────────────────────────────
-- 8. VIEW: vw_ppr_resumo
-- Resumo PPR por setor, ano corrente
-- ─────────────────────────────────────────────────────────────
create or replace view public.vw_ppr_resumo as
select
  s.id                                    as setor_id,
  s.nome                                  as setor_nome,
  extract(year from now())::int           as ano,
  round(coalesce(sum(
    case
      when m.tipo_calculo = 'range' and m.meta_maxima is not null then
        least(120, greatest(0,
          case m.direcao
            when 'MAXIMIZAR' then
              (avg(l.valor) - m.meta_minima) / nullif(m.meta_maxima - m.meta_minima, 0) * 100
            when 'MINIMIZAR' then
              (m.meta_maxima - avg(l.valor)) / nullif(m.meta_maxima - m.meta_minima, 0) * 100
          end
        )) * m.peso / 100
      when m.tipo_calculo = 'booleano' then
        case when avg(l.valor) >= 0.5 then 100 else 0 end * m.peso / 100
      else 0
    end
  ), 0), 2)                               as ppr_percentual
from public.setores s
left join public.metas m on m.setor_id = s.id and m.ativo = true
left join public.lancamentos l
  on l.meta_id = m.id
  and l.status = 'APROVADO'
  and l.mes_referencia like (extract(year from now())::text || '-%')
group by s.id, s.nome;

-- ─────────────────────────────────────────────────────────────
-- 9. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

-- Habilitar RLS
alter table public.setores     enable row level security;
alter table public.metas       enable row level security;
alter table public.lancamentos enable row level security;
alter table public.papeis      enable row level security;
alter table public.anexos      enable row level security;

-- Helpers
create or replace function public.meu_papel(p_setor_id uuid)
returns text language sql stable security definer as $$
  select papel from public.papeis
  where user_id = auth.uid() and setor_id = p_setor_id
  limit 1;
$$;

create or replace function public.sou_ac()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.papeis where user_id = auth.uid() and papel = 'A.C'
  );
$$;

-- SETORES: todos autenticados leem; apenas A.C escreve
create policy "setores_select" on public.setores
  for select to authenticated using (true);

create policy "setores_insert" on public.setores
  for insert to authenticated with check (public.sou_ac());

create policy "setores_update" on public.setores
  for update to authenticated using (public.sou_ac());

create policy "setores_delete" on public.setores
  for delete to authenticated using (public.sou_ac());

-- METAS: todos autenticados leem; R.M e A.C escrevem
create policy "metas_select" on public.metas
  for select to authenticated using (true);

create policy "metas_write" on public.metas
  for all to authenticated using (
    public.meu_papel(setor_id) in ('R.M','A.C') or public.sou_ac()
  );

-- LANÇAMENTOS: L.M cria; A.C aprova/vê tudo; R.M vê do setor
create policy "lancamentos_select" on public.lancamentos
  for select to authenticated using (
    public.sou_ac()
    or exists (
      select 1 from public.metas m
      join public.papeis p on p.setor_id = m.setor_id and p.user_id = auth.uid()
      where m.id = lancamentos.meta_id
    )
  );

create policy "lancamentos_insert" on public.lancamentos
  for insert to authenticated with check (
    exists (
      select 1 from public.metas m
      join public.papeis p on p.setor_id = m.setor_id
        and p.user_id = auth.uid()
        and p.papel in ('L.M','R.M','A.C')
      where m.id = lancamentos.meta_id
    )
  );

create policy "lancamentos_update" on public.lancamentos
  for update to authenticated using (
    public.sou_ac()
    or exists (
      select 1 from public.metas m
      join public.papeis p on p.setor_id = m.setor_id
        and p.user_id = auth.uid()
        and p.papel in ('L.M','R.M')
      where m.id = lancamentos.meta_id
    )
  );

-- PAPÉIS: apenas A.C gerencia
create policy "papeis_select" on public.papeis
  for select to authenticated using (user_id = auth.uid() or public.sou_ac());

create policy "papeis_write" on public.papeis
  for all to authenticated using (public.sou_ac());

-- ANEXOS: segue o lançamento
create policy "anexos_select" on public.anexos
  for select to authenticated using (
    public.sou_ac()
    or exists (
      select 1 from public.lancamentos l
      join public.metas m on m.id = l.meta_id
      join public.papeis p on p.setor_id = m.setor_id and p.user_id = auth.uid()
      where l.id = anexos.lancamento_id
    )
  );

create policy "anexos_insert" on public.anexos
  for insert to authenticated with check (true);

-- ─────────────────────────────────────────────────────────────
-- 10. STORAGE BUCKET: comprovantes
-- ─────────────────────────────────────────────────────────────
-- Execute via Dashboard > Storage > New bucket > "comprovantes"
-- Ou via SQL:
-- insert into storage.buckets (id, name, public) values ('comprovantes', 'comprovantes', false);

-- ─────────────────────────────────────────────────────────────
-- 11. DADOS DE EXEMPLO (opcional)
-- ─────────────────────────────────────────────────────────────
insert into public.setores (id, nome, tipo, parent_id) values
  ('00000000-0000-0000-0000-000000000001', 'Águia Florestal S.A.', 'CORPORATIVO', null),
  ('00000000-0000-0000-0000-000000000002', 'Operações Florestais', 'DIVISÃO',     '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000003', 'Colheita Mecânica',    'SETOR',       '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000004', 'Silvicultura',         'SETOR',       '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000005', 'Reflorestamento',      'EQUIPE',      '00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000006', 'Administrativo',       'DIVISÃO',     '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000007', 'RH & Talentos',        'SETOR',       '00000000-0000-0000-0000-000000000006'),
  ('00000000-0000-0000-0000-000000000008', 'TI & Sistemas',        'SETOR',       '00000000-0000-0000-0000-000000000006')
on conflict (id) do nothing;
