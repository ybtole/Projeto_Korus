/**
 * controllers/ciclos.js
 * Refatorado para usar dbAdapter.
 *
 * ⚠️  `ativar()` faz dois UPDATEs sequenciais (desativar todos → ativar um).
 * Sem transação nativa no Supabase client. Alternativa segura: RPC.
 * Veja comentário em `ativar()`.
 */

const db = require('../lib/dbAdapter')

async function listar(req, res) {
  try {
    const ciclos = await db.select('ciclos', {
      ordem: { coluna: 'data_inicio', ascendente: false },
    })
    res.json(ciclos)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao listar ciclos' })
  }
}

async function buscarAtivo(req, res) {
  try {
    const ciclo = await db.select('ciclos', {
      filtros: [{ coluna: 'ativo', valor: true }],
      limite: 1,
      unico: true,
    })
    res.json(ciclo || null)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao buscar ciclo ativo' })
  }
}

async function criar(req, res) {
  try {
    const { nome, data_inicio, data_fim } = req.body
    const [ciclo] = await db.insert('ciclos', { nome, data_inicio, data_fim })
    res.status(201).json(ciclo)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao criar ciclo' })
  }
}

// ─── Ativar ───────────────────────────────────────────────────────────────────
//
// Dois UPDATEs sequenciais sem transação. A janela de inconsistência é
// mínima (milissegundos), aceitável para este caso de uso.
//
// Se necessitar atomicidade total, use a RPC abaixo no Supabase:
//
//   CREATE OR REPLACE FUNCTION ativar_ciclo(ciclo_id_param INT)
//   RETURNS ciclos AS $$
//   DECLARE resultado ciclos;
//   BEGIN
//     UPDATE ciclos SET ativo = FALSE;
//     UPDATE ciclos SET ativo = TRUE WHERE id = ciclo_id_param
//       RETURNING * INTO resultado;
//     RETURN resultado;
//   END;
//   $$ LANGUAGE plpgsql;
//
//   Uso: await db.rpc('ativar_ciclo', { ciclo_id_param: id })
//
// ─────────────────────────────────────────────────────────────────────────────

async function ativar(req, res) {
  try {
    // Busca todos os ciclos ativos (normalmente apenas 1)
    const ativos = await db.select('ciclos', {
      colunas: 'id',
      filtros: [{ coluna: 'ativo', valor: true }],
    })

    // Desativa todos sequencialmente (IDs conhecidos = seguro)
    for (const c of ativos) {
      await db.update('ciclos', { ativo: false }, [{ coluna: 'id', valor: c.id }], false)
    }

    const [ciclo] = await db.update(
      'ciclos',
      { ativo: true },
      [{ coluna: 'id', valor: req.params.id }]
    )

    if (!ciclo) return res.status(404).json({ erro: 'Ciclo não encontrado' })
    res.json(ciclo)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao ativar ciclo' })
  }
}

async function atualizar(req, res) {
  try {
    const { nome, data_inicio, data_fim } = req.body

    const [ciclo] = await db.update(
      'ciclos',
      { nome, data_inicio, data_fim },
      [{ coluna: 'id', valor: req.params.id }]
    )

    if (!ciclo) return res.status(404).json({ erro: 'Ciclo não encontrado' })
    res.json(ciclo)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao atualizar ciclo' })
  }
}

module.exports = { listar, buscarAtivo, criar, ativar, atualizar }