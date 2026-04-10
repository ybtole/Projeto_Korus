/**
 * controllers/aprovacoes.js
 * Refatorado para usar dbAdapter.
 *
 * avaliar() faz insert em aprovacoes + update em lancamentos em sequência.
 * Para atomicidade total, use a RPC comentada abaixo.
 */

const db = require('../lib/dbAdapter')
const { notificarReprovacao, notificarAprovacao } = require('../utils/notificacoes')

async function listar(req, res) {
  try {
    const aprovacoes = await db.select('aprovacoes', {
      colunas: `
        *,
        lancamentos(
          meta_id, valor, mes_referencia, percentual_calculado,
          metas(nome)
        ),
        aprovado_por_usuario:usuarios!aprovacoes_aprovado_por_fkey(nome)
      `,
      ordem: { coluna: 'data_avaliacao', ascendente: false },
    })

    const resultado = (aprovacoes || []).map(a => ({
      ...a,
      meta_id: a.lancamentos?.meta_id ?? null,
      valor: a.lancamentos?.valor ?? null,
      mes_referencia: a.lancamentos?.mes_referencia ?? null,
      percentual_calculado: a.lancamentos?.percentual_calculado ?? null,
      meta_nome: a.lancamentos?.metas?.nome ?? null,
      aprovado_por_nome: a.aprovado_por_usuario?.nome ?? null,
      lancamentos: undefined,
      aprovado_por_usuario: undefined,
    }))

    res.json(resultado)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao listar aprovações' })
  }
}

// ─── Avaliar ──────────────────────────────────────────────────────────────────
//
// Execução sequencial (sem transação):
//   1. INSERT em aprovacoes
//   2. UPDATE em lancamentos
//
// Para atomicidade, crie uma RPC no Supabase:
//
//   CREATE OR REPLACE FUNCTION avaliar_lancamento(
//     p_lancamento_id INT, p_aprovado_por INT,
//     p_status TEXT, p_motivo TEXT
//   ) RETURNS VOID AS $$
//   BEGIN
//     INSERT INTO aprovacoes (lancamento_id, aprovado_por, status, motivo_reprovacao)
//       VALUES (p_lancamento_id, p_aprovado_por, p_status, p_motivo);
//     UPDATE lancamentos SET status = p_status WHERE id = p_lancamento_id;
//   END;
//   $$ LANGUAGE plpgsql;
//
//   Uso: await db.rpc('avaliar_lancamento', { p_lancamento_id, p_aprovado_por, p_status, p_motivo })
//
// ─────────────────────────────────────────────────────────────────────────────

async function avaliar(req, res) {
  try {
    const { lancamento_id, status, motivo_reprovacao } = req.body

    if (!['APROVADO', 'REPROVADO'].includes(status)) {
      return res.status(400).json({ erro: 'Status inválido' })
    }
    if (status === 'REPROVADO' && !motivo_reprovacao) {
      return res.status(400).json({ erro: 'Motivo é obrigatório na reprovação' })
    }

    const lanc = await db.select('lancamentos', {
      colunas: `*, metas!inner(responsavel_id, nome)`,
      filtros: [{ coluna: 'id', valor: lancamento_id }],
      unico: true,
    })

    if (!lanc) return res.status(404).json({ erro: 'Lançamento não encontrado' })
    if (lanc.status !== 'PENDENTE') {
      return res.status(400).json({ erro: 'Lançamento já foi avaliado' })
    }

    // 1. Registrar aprovação
    await db.insert('aprovacoes', {
      lancamento_id,
      aprovado_por: req.usuario.id,
      status,
      motivo_reprovacao: motivo_reprovacao || null,
    }, false)

    // 2. Atualizar status do lançamento
    await db.update(
      'lancamentos',
      { status },
      [{ coluna: 'id', valor: lancamento_id }],
      false
    )

    // Notificar responsável — utils/notificacoes.js inalterado
    const responsavelId = lanc.metas?.responsavel_id
    if (responsavelId) {
      if (status === 'REPROVADO') {
        await notificarReprovacao(lancamento_id, responsavelId, motivo_reprovacao)
      } else {
        await notificarAprovacao(lancamento_id, responsavelId)
      }
    }

    res.json({ mensagem: `Lançamento ${status.toLowerCase()} com sucesso` })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao avaliar lançamento' })
  }
}

module.exports = { listar, avaliar }