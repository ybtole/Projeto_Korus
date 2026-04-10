/**
 * controllers/setores.js
 * Refatorado para usar dbAdapter.
 *
 * ⚠️  A query recursiva (WITH RECURSIVE) para descendentes não tem equivalente
 * direto no cliente Supabase. Solução: função RPC no banco.
 * Veja o comentário em `descendentes()` e o arquivo supabase/functions.sql.
 */

const db = require('../lib/dbAdapter')

// ─── Listar (estrutura de árvore) ─────────────────────────────────────────────

async function listar(req, res) {
  try {
    const setores = await db.select('setores', {
      ordem: { coluna: 'nome', ascendente: true },
    })

    // Montar árvore em memória — lógica inalterada
    const mapa = {}
    setores.forEach(s => { mapa[s.id] = { ...s, filhos: [] } })

    const raizes = []
    setores.forEach(s => {
      if (s.parent_id && mapa[s.parent_id]) {
        mapa[s.parent_id].filhos.push(mapa[s.id])
      } else {
        raizes.push(mapa[s.id])
      }
    })

    res.json(raizes)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao listar setores' })
  }
}

// ─── Lista plana (para selects) ───────────────────────────────────────────────

async function listarPlano(req, res) {
  try {
    const setores = await db.select('setores', {
      ordem: { coluna: 'nome', ascendente: true },
    })
    res.json(setores)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao listar setores' })
  }
}

// ─── Criar ────────────────────────────────────────────────────────────────────

async function criar(req, res) {
  try {
    const { nome, parent_id } = req.body
    if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório' })

    const [setor] = await db.insert('setores', {
      nome,
      parent_id: parent_id || null,
    })

    res.status(201).json(setor)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao criar setor' })
  }
}

// ─── Atualizar ────────────────────────────────────────────────────────────────

async function atualizar(req, res) {
  try {
    const { nome, parent_id } = req.body

    const [atualizado] = await db.update(
      'setores',
      { nome, parent_id: parent_id || null },
      [{ coluna: 'id', valor: req.params.id }]
    )

    if (!atualizado) return res.status(404).json({ erro: 'Setor não encontrado' })
    res.json(atualizado)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao atualizar setor' })
  }
}

// ─── Remover ──────────────────────────────────────────────────────────────────

async function remover(req, res) {
  try {
    await db.remove('setores', [{ coluna: 'id', valor: req.params.id }])
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao remover setor' })
  }
}

// ─── Descendentes ────────────────────────────────────────────────────────────
//
// A query WITH RECURSIVE não é suportada diretamente pelo Supabase JS client.
// Solução: criar uma PostgreSQL Function no Supabase e chamá-la via RPC.
//
// SQL para criar no Supabase (SQL Editor):
//
//   CREATE OR REPLACE FUNCTION get_descendentes(setor_id_param INT)
//   RETURNS TABLE(id INT) AS $$
//     WITH RECURSIVE arvore AS (
//       SELECT id FROM setores WHERE id = setor_id_param
//       UNION ALL
//       SELECT s.id FROM setores s
//       INNER JOIN arvore a ON s.parent_id = a.id
//     )
//     SELECT id FROM arvore;
//   $$ LANGUAGE sql STABLE;
//
// ─────────────────────────────────────────────────────────────────────────────

async function descendentes(req, res) {
  try {
    const resultado = await db.rpc('get_descendentes', {
      setor_id_param: parseInt(req.params.id),
    })
    res.json((resultado || []).map(r => r.id))
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao buscar descendentes' })
  }
}

// Exportada também para uso interno em outros controllers (ex: metas.js)
async function getDescendentes(setorId) {
  const resultado = await db.rpc('get_descendentes', {
    setor_id_param: parseInt(setorId),
  })
  return (resultado || []).map(r => r.id)
}

module.exports = { listar, listarPlano, criar, atualizar, remover, descendentes, getDescendentes }