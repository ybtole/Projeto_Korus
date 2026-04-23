


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;




ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."calcular_percentual_range"("p_valor" numeric, "p_ranges" "jsonb", "p_direcao" "text") RETURNS numeric
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
declare
  r jsonb;
  v_de numeric;
  v_ate numeric;
  v_pct numeric;
begin
  if p_ranges is null or jsonb_array_length(p_ranges) = 0 then
    return 0;
  end if;

  for r in select * from jsonb_array_elements(p_ranges) loop
    v_de  := (r->>'de')::numeric;
    v_ate := case when r->>'ate' is not null and r->>'ate' != ''
                  then (r->>'ate')::numeric
                  else null end;
    v_pct := (r->>'percentual')::numeric;

    if p_direcao = 'MAXIMIZAR' then
      if p_valor >= v_de and (v_ate is null or p_valor <= v_ate) then
        return v_pct;
      end if;
    else -- MINIMIZAR
      if p_valor <= v_de and (v_ate is null or p_valor >= v_ate) then
        return v_pct;
      end if;
    end if;
  end loop;

  return 0;
end;
$$;


ALTER FUNCTION "public"."calcular_percentual_range"("p_valor" numeric, "p_ranges" "jsonb", "p_direcao" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calcular_ppr_setor"("p_setor_id" "uuid", "p_ano" integer) RETURNS TABLE("meta_id" "uuid", "meta_nome" "text", "peso" numeric, "media_score" numeric, "contribuicao" numeric)
    LANGUAGE "sql" STABLE
    AS $$
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


ALTER FUNCTION "public"."calcular_ppr_setor"("p_setor_id" "uuid", "p_ano" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_notificar_lancamento"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_responsavel uuid;
  v_meta_nome text;
  v_tipo text;
  v_titulo text;
  v_msg text;
begin
  -- Só dispara na mudança de status para APROVADO ou REPROVADO
  if (TG_OP = 'UPDATE' and NEW.status in ('APROVADO', 'REPROVADO')
      and OLD.status is distinct from NEW.status) then

    select m.nome, p.user_id
    into v_meta_nome, v_responsavel
    from metas m
    left join papeis p on p.setor_id = m.setor_id and p.papel = 'R.M'
    where m.id = NEW.meta_id
    limit 1;

    v_tipo   := NEW.status;
    v_titulo := case NEW.status
      when 'APROVADO'  then '✓ Lançamento aprovado'
      when 'REPROVADO' then '✕ Lançamento reprovado'
    end;
    v_msg := format('%s — %s', v_meta_nome, NEW.mes_referencia);
    if NEW.status = 'REPROVADO' and NEW.observacoes is not null then
      v_msg := v_msg || ' · Motivo: ' || NEW.observacoes;
    end if;

    if v_responsavel is not null then
      insert into notificacoes (user_id, tipo, titulo, mensagem, lancamento_id, meta_id)
      values (v_responsavel, v_tipo, v_titulo, v_msg, NEW.id, NEW.meta_id);
    end if;
  end if;

  return NEW;
end;
$$;


ALTER FUNCTION "public"."fn_notificar_lancamento"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_email_by_cpf"("p_cpf" "text") RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select email
  from public.usuarios
  where cpf = p_cpf
  limit 1;
$$;


ALTER FUNCTION "public"."get_email_by_cpf"("p_cpf" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.usuarios (id, email)
  values (new.id, new.email);
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."meu_papel"("p_setor_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select papel from public.papeis
  where user_id = auth.uid() and setor_id = p_setor_id
  limit 1;
$$;


ALTER FUNCTION "public"."meu_papel"("p_setor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sou_ac"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1 from public.papeis where user_id = auth.uid() and papel = 'A.C'
  );
$$;


ALTER FUNCTION "public"."sou_ac"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."anexos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lancamento_id" "uuid",
    "storage_path" "text" NOT NULL,
    "nome_arquivo" "text",
    "criado_por" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."anexos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."atribuicoes_lancamento" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "meta_id" "uuid" NOT NULL,
    "mes_referencia" "text" NOT NULL,
    "responsavel_id" "uuid",
    "lancador_id" "uuid",
    "criado_em" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."atribuicoes_lancamento" OWNER TO "postgres";


COMMENT ON TABLE "public"."atribuicoes_lancamento" IS 'Quem é responsável e quem faz o lançamento por meta/mês';



CREATE TABLE IF NOT EXISTS "public"."ciclos_ppr" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "semestre" "text" NOT NULL,
    "ano_inicio" integer NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date" NOT NULL,
    "ativo" boolean DEFAULT false NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ciclos_ppr_semestre_check" CHECK (("semestre" = ANY (ARRAY['FEV_SET'::"text", 'SET_MAR'::"text"])))
);


ALTER TABLE "public"."ciclos_ppr" OWNER TO "postgres";


COMMENT ON TABLE "public"."ciclos_ppr" IS 'Ciclos semestrais PPR (Fev-Set e Set-Mar)';



CREATE TABLE IF NOT EXISTS "public"."lancamentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "meta_id" "uuid",
    "mes_referencia" "text" NOT NULL,
    "valor" numeric,
    "status" "text" DEFAULT 'PENDENTE'::"text" NOT NULL,
    "observacoes" "text",
    "criado_por" "text",
    "aprovado_por" "text",
    "data_aprovacao" timestamp with time zone,
    "data_criacao" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "lancamentos_status_check" CHECK (("status" = ANY (ARRAY['PENDENTE'::"text", 'EM_ANDAMENTO'::"text", 'AGUARDANDO_APROVACAO'::"text", 'APROVADO'::"text", 'REPROVADO'::"text"])))
);


ALTER TABLE "public"."lancamentos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."metas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "setor_id" "uuid",
    "nome" "text" NOT NULL,
    "descricao" "text",
    "unidade" "text",
    "peso" numeric(5,2) DEFAULT 100,
    "direcao" "text" DEFAULT 'MAXIMIZAR'::"text" NOT NULL,
    "tipo_calculo" "text" DEFAULT 'range'::"text" NOT NULL,
    "meta_minima" numeric,
    "meta_maxima" numeric,
    "periodicidade" "text" DEFAULT 'mensal'::"text" NOT NULL,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "frequencia" "text" DEFAULT 'MENSAL'::"text" NOT NULL,
    "dia_lancamento" integer DEFAULT 28 NOT NULL,
    "semestre" "text" DEFAULT 'FEV_SET'::"text" NOT NULL,
    "ativa" boolean DEFAULT true NOT NULL,
    "ranges" "jsonb" DEFAULT '[]'::"jsonb",
    "ano" integer,
    CONSTRAINT "metas_direcao_check" CHECK (("direcao" = ANY (ARRAY['MAXIMIZAR'::"text", 'MINIMIZAR'::"text"]))),
    CONSTRAINT "metas_frequencia_check" CHECK (("frequencia" = ANY (ARRAY['MENSAL'::"text", 'BIMESTRAL'::"text", 'SEMESTRAL'::"text"]))),
    CONSTRAINT "metas_periodicidade_check" CHECK (("periodicidade" = ANY (ARRAY['mensal'::"text", 'semestral'::"text"]))),
    CONSTRAINT "metas_semestre_check" CHECK (("semestre" = ANY (ARRAY['FEV_SET'::"text", 'SET_MAR'::"text"]))),
    CONSTRAINT "metas_tipo_calculo_check" CHECK (("tipo_calculo" = ANY (ARRAY['range'::"text", 'booleano'::"text", 'categorico'::"text"])))
);


ALTER TABLE "public"."metas" OWNER TO "postgres";


COMMENT ON COLUMN "public"."metas"."frequencia" IS 'Frequência de lançamento: MENSAL, BIMESTRAL, SEMESTRAL';



COMMENT ON COLUMN "public"."metas"."dia_lancamento" IS 'Dia do mês limite para lançamento (ex: 28)';



COMMENT ON COLUMN "public"."metas"."semestre" IS 'Ciclo semestral: FEV_SET ou SET_MAR';



COMMENT ON COLUMN "public"."metas"."ativa" IS 'Se false, meta não participa do cálculo PPR';



COMMENT ON COLUMN "public"."metas"."ranges" IS 'Faixas de percentual: [{de, ate, percentual}]';



CREATE TABLE IF NOT EXISTS "public"."notificacoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "tipo" "text" NOT NULL,
    "titulo" "text" NOT NULL,
    "mensagem" "text",
    "lancamento_id" "uuid",
    "meta_id" "uuid",
    "lida" boolean DEFAULT false NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notificacoes_tipo_check" CHECK (("tipo" = ANY (ARRAY['APROVACAO'::"text", 'REPROVACAO'::"text", 'ATRASO'::"text", 'SISTEMA'::"text"])))
);


ALTER TABLE "public"."notificacoes" OWNER TO "postgres";


COMMENT ON TABLE "public"."notificacoes" IS 'Notificações para responsáveis de metas';



CREATE TABLE IF NOT EXISTS "public"."papeis" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "setor_id" "uuid",
    "papel" "text" NOT NULL,
    CONSTRAINT "papeis_papel_check" CHECK (("papel" = ANY (ARRAY['R.A'::"text", 'R.M'::"text", 'L.M'::"text", 'A.C'::"text"])))
);


ALTER TABLE "public"."papeis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."setores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "tipo" "text" DEFAULT 'SETOR'::"text" NOT NULL,
    "parent_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."setores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usuarios" (
    "id" "uuid" NOT NULL,
    "nome" "text",
    "cpf" "text",
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "cpf_format" CHECK (("cpf" ~ '^[0-9]{11}$'::"text"))
);


ALTER TABLE "public"."usuarios" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_ppr_detalhado" AS
 SELECT "s"."id" AS "setor_id",
    "s"."nome" AS "setor_nome",
    "l"."mes_referencia",
    "m"."id" AS "meta_id",
    "m"."nome" AS "meta_nome",
    "m"."peso",
    "m"."direcao",
    "m"."frequencia",
    "l"."status",
    "l"."valor",
        CASE
            WHEN ("l"."status" = 'APROVADO'::"text") THEN (("public"."calcular_percentual_range"("l"."valor", "m"."ranges", "m"."direcao") * "m"."peso") / 100.0)
            ELSE (0)::numeric
        END AS "ppr_ganho",
    ("m"."peso" / 6.0) AS "ppr_possivel_mes"
   FROM (("public"."lancamentos" "l"
     JOIN "public"."metas" "m" ON (("m"."id" = "l"."meta_id")))
     JOIN "public"."setores" "s" ON (("s"."id" = "m"."setor_id")))
  WHERE ("m"."ativa" = true);


ALTER VIEW "public"."vw_ppr_detalhado" OWNER TO "postgres";


COMMENT ON VIEW "public"."vw_ppr_detalhado" IS 'PPR ganho por lançamento aprovado, calculado via ranges da meta';



CREATE OR REPLACE VIEW "public"."vw_ppr_resumo" AS
 WITH "base_mes" AS (
         SELECT "m"."id" AS "meta_id",
            "m"."setor_id",
            "m"."nome",
            "m"."peso",
            "m"."tipo_calculo",
            "m"."meta_minima",
            "m"."meta_maxima",
            "m"."direcao",
            "l"."mes_referencia",
            "avg"("l"."valor") AS "valor_medio"
           FROM ("public"."metas" "m"
             LEFT JOIN "public"."lancamentos" "l" ON ((("l"."meta_id" = "m"."id") AND ("l"."status" = 'APROVADO'::"text") AND ("l"."mes_referencia" ~~ ((EXTRACT(year FROM "now"()))::"text" || '-%'::"text")))))
          WHERE ("m"."ativo" = true)
          GROUP BY "m"."id", "m"."setor_id", "m"."nome", "m"."peso", "m"."tipo_calculo", "m"."meta_minima", "m"."meta_maxima", "m"."direcao", "l"."mes_referencia"
        ), "score_mes" AS (
         SELECT "base_mes"."meta_id",
            "base_mes"."setor_id",
            "base_mes"."nome",
            "base_mes"."peso",
            "base_mes"."tipo_calculo",
            "base_mes"."meta_minima",
            "base_mes"."meta_maxima",
            "base_mes"."direcao",
            "base_mes"."mes_referencia",
            "base_mes"."valor_medio",
                CASE
                    WHEN (("base_mes"."tipo_calculo" = 'range'::"text") AND ("base_mes"."meta_maxima" IS NOT NULL)) THEN LEAST((100)::numeric, GREATEST((0)::numeric,
                    CASE "base_mes"."direcao"
                        WHEN 'MAXIMIZAR'::"text" THEN ((("base_mes"."valor_medio" - "base_mes"."meta_minima") / NULLIF(("base_mes"."meta_maxima" - "base_mes"."meta_minima"), (0)::numeric)) * (100)::numeric)
                        WHEN 'MINIMIZAR'::"text" THEN ((("base_mes"."meta_maxima" - "base_mes"."valor_medio") / NULLIF(("base_mes"."meta_maxima" - "base_mes"."meta_minima"), (0)::numeric)) * (100)::numeric)
                        ELSE NULL::numeric
                    END))
                    WHEN ("base_mes"."tipo_calculo" = 'booleano'::"text") THEN (
                    CASE
                        WHEN ("base_mes"."valor_medio" >= 0.5) THEN 100
                        ELSE 0
                    END)::numeric
                    ELSE (0)::numeric
                END AS "score_meta_mes"
           FROM "base_mes"
        ), "mes_agregado" AS (
         SELECT "score_mes"."setor_id",
            "score_mes"."mes_referencia",
            LEAST((100)::numeric, "sum"((("score_mes"."score_meta_mes" * "score_mes"."peso") / (100)::numeric))) AS "score_mes"
           FROM "score_mes"
          GROUP BY "score_mes"."setor_id", "score_mes"."mes_referencia"
        ), "ppr_final" AS (
         SELECT "mes_agregado"."setor_id",
            "sum"(("mes_agregado"."score_mes" * 0.2)) AS "ppr_total"
           FROM "mes_agregado"
          GROUP BY "mes_agregado"."setor_id"
        )
 SELECT "s"."id" AS "setor_id",
    "s"."nome" AS "setor_nome",
    (EXTRACT(year FROM "now"()))::integer AS "ano",
    "round"(COALESCE("p"."ppr_total", (0)::numeric), 2) AS "ppr_percentual"
   FROM ("public"."setores" "s"
     LEFT JOIN "ppr_final" "p" ON (("p"."setor_id" = "s"."id")));


ALTER VIEW "public"."vw_ppr_resumo" OWNER TO "postgres";


ALTER TABLE ONLY "public"."anexos"
    ADD CONSTRAINT "anexos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."atribuicoes_lancamento"
    ADD CONSTRAINT "atribuicoes_lancamento_meta_id_mes_referencia_key" UNIQUE ("meta_id", "mes_referencia");



ALTER TABLE ONLY "public"."atribuicoes_lancamento"
    ADD CONSTRAINT "atribuicoes_lancamento_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ciclos_ppr"
    ADD CONSTRAINT "ciclos_ppr_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lancamentos"
    ADD CONSTRAINT "lancamentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."metas"
    ADD CONSTRAINT "metas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notificacoes"
    ADD CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."papeis"
    ADD CONSTRAINT "papeis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."papeis"
    ADD CONSTRAINT "papeis_user_id_setor_id_papel_key" UNIQUE ("user_id", "setor_id", "papel");



ALTER TABLE ONLY "public"."setores"
    ADD CONSTRAINT "setores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_cpf_key" UNIQUE ("cpf");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "idx_ciclos_ativo_unico" ON "public"."ciclos_ppr" USING "btree" ("ativo") WHERE ("ativo" = true);



CREATE INDEX "idx_lancamentos_meta_mes" ON "public"."lancamentos" USING "btree" ("meta_id", "mes_referencia");



CREATE INDEX "idx_lancamentos_status" ON "public"."lancamentos" USING "btree" ("status");



CREATE INDEX "idx_metas_setor_ativa" ON "public"."metas" USING "btree" ("setor_id", "ativa");



CREATE INDEX "idx_notificacoes_user" ON "public"."notificacoes" USING "btree" ("user_id", "lida", "criado_em" DESC);



CREATE OR REPLACE TRIGGER "lancamentos_updated_at" BEFORE UPDATE ON "public"."lancamentos" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "tg_notificar_lancamento" AFTER UPDATE ON "public"."lancamentos" FOR EACH ROW EXECUTE FUNCTION "public"."fn_notificar_lancamento"();



ALTER TABLE ONLY "public"."anexos"
    ADD CONSTRAINT "anexos_lancamento_id_fkey" FOREIGN KEY ("lancamento_id") REFERENCES "public"."lancamentos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."atribuicoes_lancamento"
    ADD CONSTRAINT "atribuicoes_lancamento_lancador_id_fkey" FOREIGN KEY ("lancador_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."atribuicoes_lancamento"
    ADD CONSTRAINT "atribuicoes_lancamento_meta_id_fkey" FOREIGN KEY ("meta_id") REFERENCES "public"."metas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."atribuicoes_lancamento"
    ADD CONSTRAINT "atribuicoes_lancamento_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lancamentos"
    ADD CONSTRAINT "lancamentos_meta_id_fkey" FOREIGN KEY ("meta_id") REFERENCES "public"."metas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."metas"
    ADD CONSTRAINT "metas_setor_id_fkey" FOREIGN KEY ("setor_id") REFERENCES "public"."setores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notificacoes"
    ADD CONSTRAINT "notificacoes_lancamento_id_fkey" FOREIGN KEY ("lancamento_id") REFERENCES "public"."lancamentos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notificacoes"
    ADD CONSTRAINT "notificacoes_meta_id_fkey" FOREIGN KEY ("meta_id") REFERENCES "public"."metas"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notificacoes"
    ADD CONSTRAINT "notificacoes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."papeis"
    ADD CONSTRAINT "papeis_setor_id_fkey" FOREIGN KEY ("setor_id") REFERENCES "public"."setores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."papeis"
    ADD CONSTRAINT "papeis_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."setores"
    ADD CONSTRAINT "setores_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."setores"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "ac_full_access_lancamentos" ON "public"."lancamentos" TO "authenticated" USING ("public"."sou_ac"());



CREATE POLICY "ac_full_access_metas" ON "public"."metas" TO "authenticated" USING ("public"."sou_ac"());



CREATE POLICY "ac_full_access_papeis" ON "public"."papeis" TO "authenticated" USING ("public"."sou_ac"());



CREATE POLICY "ac_full_access_setores" ON "public"."setores" TO "authenticated" USING ("public"."sou_ac"());



ALTER TABLE "public"."anexos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anexos_insert" ON "public"."anexos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "anexos_select" ON "public"."anexos" FOR SELECT TO "authenticated" USING (("public"."sou_ac"() OR (EXISTS ( SELECT 1
   FROM (("public"."lancamentos" "l"
     JOIN "public"."metas" "m" ON (("m"."id" = "l"."meta_id")))
     JOIN "public"."papeis" "p" ON ((("p"."setor_id" = "m"."setor_id") AND ("p"."user_id" = "auth"."uid"()))))
  WHERE ("l"."id" = "anexos"."lancamento_id")))));



CREATE POLICY "atribuicoes_escrita" ON "public"."atribuicoes_lancamento" USING ((EXISTS ( SELECT 1
   FROM "public"."papeis"
  WHERE (("papeis"."user_id" = "auth"."uid"()) AND ("papeis"."papel" = ANY (ARRAY['R.M'::"text", 'A.C'::"text"]))))));



ALTER TABLE "public"."atribuicoes_lancamento" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "atribuicoes_leitura" ON "public"."atribuicoes_lancamento" FOR SELECT USING (true);



CREATE POLICY "ciclos_admin" ON "public"."ciclos_ppr" USING ((EXISTS ( SELECT 1
   FROM "public"."papeis"
  WHERE (("papeis"."user_id" = "auth"."uid"()) AND ("papeis"."papel" = 'A.C'::"text")))));



CREATE POLICY "ciclos_leitura" ON "public"."ciclos_ppr" FOR SELECT USING (true);



ALTER TABLE "public"."ciclos_ppr" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lancamentos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lancamentos_insert" ON "public"."lancamentos" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."metas" "m"
     JOIN "public"."papeis" "p" ON ((("p"."setor_id" = "m"."setor_id") AND ("p"."user_id" = "auth"."uid"()) AND ("p"."papel" = ANY (ARRAY['L.M'::"text", 'R.M'::"text", 'A.C'::"text"])))))
  WHERE ("m"."id" = "lancamentos"."meta_id"))));



CREATE POLICY "lancamentos_select" ON "public"."lancamentos" FOR SELECT TO "authenticated" USING (("public"."sou_ac"() OR (EXISTS ( SELECT 1
   FROM ("public"."metas" "m"
     JOIN "public"."papeis" "p" ON ((("p"."setor_id" = "m"."setor_id") AND ("p"."user_id" = "auth"."uid"()))))
  WHERE ("m"."id" = "lancamentos"."meta_id")))));



CREATE POLICY "lancamentos_update" ON "public"."lancamentos" FOR UPDATE TO "authenticated" USING (("public"."sou_ac"() OR (EXISTS ( SELECT 1
   FROM ("public"."metas" "m"
     JOIN "public"."papeis" "p" ON ((("p"."setor_id" = "m"."setor_id") AND ("p"."user_id" = "auth"."uid"()) AND ("p"."papel" = ANY (ARRAY['L.M'::"text", 'R.M'::"text"])))))
  WHERE ("m"."id" = "lancamentos"."meta_id")))));



ALTER TABLE "public"."metas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "metas_select" ON "public"."metas" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "metas_write" ON "public"."metas" TO "authenticated" USING ((("public"."meu_papel"("setor_id") = ANY (ARRAY['R.M'::"text", 'A.C'::"text"])) OR "public"."sou_ac"()));



ALTER TABLE "public"."notificacoes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notificacoes_proprias" ON "public"."notificacoes" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."papeis" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "papeis_select" ON "public"."papeis" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."sou_ac"()));



CREATE POLICY "papeis_write" ON "public"."papeis" TO "authenticated" USING ("public"."sou_ac"());



ALTER TABLE "public"."setores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "setores_delete" ON "public"."setores" FOR DELETE TO "authenticated" USING ("public"."sou_ac"());



CREATE POLICY "setores_insert" ON "public"."setores" FOR INSERT TO "authenticated" WITH CHECK ("public"."sou_ac"());



CREATE POLICY "setores_select" ON "public"."setores" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "setores_update" ON "public"."setores" FOR UPDATE TO "authenticated" USING ("public"."sou_ac"());



ALTER TABLE "public"."usuarios" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "usuarios_insert_self" ON "public"."usuarios" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "usuarios_lookup_cpf" ON "public"."usuarios" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "usuarios_select_self" ON "public"."usuarios" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."metas";



REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT ALL ON SCHEMA "public" TO "anon";
GRANT ALL ON SCHEMA "public" TO "authenticated";
GRANT ALL ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."calcular_ppr_setor"("p_setor_id" "uuid", "p_ano" integer) TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_email_by_cpf"("p_cpf" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."meu_papel"("p_setor_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."sou_ac"() TO "authenticated";


















GRANT ALL ON TABLE "public"."anexos" TO "authenticated";



GRANT ALL ON TABLE "public"."lancamentos" TO "authenticated";



GRANT ALL ON TABLE "public"."metas" TO "authenticated";



GRANT ALL ON TABLE "public"."papeis" TO "authenticated";



GRANT ALL ON TABLE "public"."setores" TO "authenticated";



GRANT ALL ON TABLE "public"."usuarios" TO "authenticated";



GRANT ALL ON TABLE "public"."vw_ppr_resumo" TO "authenticated";


































