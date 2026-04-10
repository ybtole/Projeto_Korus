/**
 * controllers/dashboard.js
 * Refatorado para usar dbAdapter + cliente Supabase bruto onde necessário.
 *
 * As queries agregadas (COUNT com subquery, json_agg) são melhor
 * encapsuladas em RPCs. As funções estão documentadas abaixo.
 */

const db = require('../lib/dbAdapter')
const { calcularPPRSetor } = require('../utils/calculos')

// ─── Resumo ───────────────────────────────────────────────────────────────────
//
// Queries de COUNT com filtros complexos → RPCs recomendadas.
// Enquanto isso, usamos o cliente bruto com .select('*', { count: 'exact', head: true })
//
// ─────────────────────────────────────────────────────────────────────────────

async function resumo(req, res) {
  try {
    const { ciclo_id } = req.query
    const client = db.getClient()

    // Total de metas
    let qMetas = client.from('metas').select('*', { count: 'exact', head: true })
    if (ciclo_id) qMetas = qMetas.eq('ciclo_id', ciclo_id)
    const { count: totalMetas, error: e1 } = await qMetas
    if (e1) throw e1

    // Lançamentos aprovados
    const { count: aprovados, error: e2 } = await client
      .from('lancamentos')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'APROVADO')
    if (e2) throw e2

    // Lançamentos pendentes
    const { count: pendentes, error: e3 } = await client
      .from('lancamentos')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDENTE')
    if (e3) throw e3

    // Metas atrasadas: usa RPC para evitar subquery complexa
    // SQL da função (criar no Supabase):
    //
    //   CREATE OR REPLACE FUNCTION contar_metas_atrasadas(ciclo_id_param INT)
    //   RETURNS BIGINT AS $$
    //     SELECT COUNT(*) FROM metas m
    //     WHERE dia_limite_lancamento IS NOT NULL
    //     AND NOT EXISTS (
    //       SELECT 1 FROM lancamentos l
    //       WHERE l.meta_id = m.id
    //       AND l.mes_referencia = TO_CHAR(NOW(), 'YYYY-MM')
    //       AND l.status != 'REPROVADO'
    //     )
    //     AND EXTRACT(DAY FROM NOW()) > m.dia_limite_lancamento
    //     AND (ciclo_id_param IS NULL OR m.ciclo_id = ciclo_id_param);
    //   $$ LANGUAGE sql STABLE;
    //
    const atrasadas = await db.rpc('contar_metas_atrasadas', {
      ciclo_id_param: ciclo_id ? parseInt(ciclo_id) : null,
    })

    res.json({
      total_metas: totalMetas || 0,
      lancamentos_aprovados: aprovados || 0,
      lancamentos_pendentes: pendentes || 0,
      metas_atrasadas: atrasadas || 0,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao buscar resumo do dashboard' })
  }
}

// ─── Resultado PPR ────────────────────────────────────────────────────────────
//
// A agregação com json_agg é feita via RPC para evitar lógica SQL inline.
//
// SQL da função (criar no Supabase):
//
//   CREATE OR REPLACE FUNCTION resultado_ppr_ciclo(ciclo_id_param INT)
//   RETURNS TABLE (
//     id INT, nome TEXT, peso NUMERIC, setor_id INT, setor_nome TEXT,
//     lancamentos JSONB
//   ) AS $$
//     SELECT m.id, m.nome, m.peso, m.setor_id, s.nome,
//       COALESCE(
//         jsonb_agg(
//           jsonb_build_object('percentual_calculado', l.percentual_calculado)
//         ) FILTER (WHERE l.id IS NOT NULL AND l.status = 'APROVADO'),
//         '[]'::jsonb
//       )
//     FROM metas m
//     LEFT JOIN setores s ON s.id = m.setor_id
//     LEFT JOIN lancamentos l ON l.meta_id = m.id
//     WHERE m.ciclo_id = ciclo_id_param
//     GROUP BY m.id, m.nome, m.peso, m.setor_id, s.nome;
//   $$ LANGUAGE sql STABLE;
//
// ─────────────────────────────────────────────────────────────────────────────

async function resultadoPPR(req, res) {
  try {
    const { ciclo_id } = req.query
    if (!ciclo_id) return res.status(400).json({ erro: 'ciclo_id obrigatório' })

    const metas = await db.rpc('resultado_ppr_ciclo', {
      ciclo_id_param: parseInt(ciclo_id),
    })

    const totalPeso = (metas || []).reduce((acc, m) => acc + parseFloat(m.peso), 0) || 1

    // Lógica de cálculo: usa calcularPPRSetor de utils/calculos.js — inalterada
    const resultado = (metas || []).map(m => {
      const lancamentos = m.lancamentos || []
      const media = lancamentos.length
        ? lancamentos.reduce((acc, l) => acc + parseFloat(l.percentual_calculado || 0), 0) / lancamentos.length
        : 0
      const participacao = (parseFloat(m.peso) / totalPeso) * 100
      return {
        meta_id: m.id,
        meta_nome: m.nome,
        setor_nome: m.setor_nome,
        peso: m.peso,
        media_percentual: parseFloat(media.toFixed(2)),
        participacao_ppr: parseFloat(participacao.toFixed(2)),
        resultado_ppr: parseFloat((media * parseFloat(m.peso) / totalPeso).toFixed(2)),
      }
    })

    const ppr_total = Math.min(
      resultado.reduce((acc, r) => acc + r.resultado_ppr, 0),
      100
    )

    res.json({
      metas: resultado,
      ppr_total: parseFloat(ppr_total.toFixed(2)),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao calcular resultado PPR' })
  }
}

module.exports = { resumo, resultadoPPR }