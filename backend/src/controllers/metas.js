/**
 * controllers/metas.js
 * Refatorado para usar dbAdapter.
 *
 * `criar()` e `atualizar()` inserem ranges em sequência após a meta.
 * Não há transação — em caso de falha parcial, a meta fica sem ranges.
 * Se isso for crítico, encapsule em uma RPC (veja comentário inline).
 */

const db = require('../lib/dbAdapter')
const { getDescendentes } = require('./setores')

// ─── Listar ──────────────────────────────────────────────────────────────────

async function listar(req, res) {
  try {
    const { ciclo_id } = req.query
    const { role, setor_id } = req.usuario

    let setoresVisiveis = []
    if (role === 'ADMIN' || role === 'ESPECIALISTA_CUSTO') {
      const todos = await db.select('setores', { colunas: 'id' })
      setoresVisiveis = todos.map(s => s.id)
    } else {
      setoresVisiveis = await getDescendentes(setor_id)
    }

    const filtros = []

    // Filtro de ciclo opcional
    if (ciclo_id) {
      filtros.push({ coluna: 'ciclo_id', operador: 'eq', valor: ciclo_id })
    }

    // Busca metas do setor visível OU globais
    // Supabase não tem OR direto entre colunas distintas pelo adapter genérico.
    // Usamos o cliente bruto pontualmente para este caso específico.
    const client = db.getClient()
    let query = client
      .from('metas')
      .select(`
        *,
        setores(nome),
        responsavel:usuarios!metas_responsavel_id_fkey(nome),
        lancador:usuarios!metas_lancador_id_fkey(nome),
        ciclos(nome)
      `)
      .or(`setor_id.in.(${setoresVisiveis.join(',')}),global.eq.true`)
      .order('nome', { ascending: true })

    if (ciclo_id) query = query.eq('ciclo_id', ciclo_id)

    const { data, error } = await query
    if (error) throw error

    const resultado = (data || []).map(m => ({
      ...m,
      setor_nome: m.setores?.nome ?? null,
      responsavel_nome: m.responsavel?.nome ?? null,
      lancador_nome: m.lancador?.nome ?? null,
      ciclo_nome: m.ciclos?.nome ?? null,
      setores: undefined,
      responsavel: undefined,
      lancador: undefined,
      ciclos: undefined,
    }))

    res.json(resultado)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao listar metas' })
  }
}

// ─── Buscar por ID ────────────────────────────────────────────────────────────

async function buscarPorId(req, res) {
  try {
    const meta = await db.select('metas', {
      colunas: `
        *,
        setores(nome),
        responsavel:usuarios!metas_responsavel_id_fkey(nome),
        lancador:usuarios!metas_lancador_id_fkey(nome)
      `,
      filtros: [{ coluna: 'id', valor: req.params.id }],
      unico: true,
    })

    if (!meta) return res.status(404).json({ erro: 'Meta não encontrada' })

    const ranges = await db.select('meta_ranges', {
      filtros: [{ coluna: 'meta_id', valor: req.params.id }],
      ordem: { coluna: 'ordem', ascendente: true },
    })

    res.json({
      ...meta,
      setor_nome: meta.setores?.nome ?? null,
      responsavel_nome: meta.responsavel?.nome ?? null,
      lancador_nome: meta.lancador?.nome ?? null,
      setores: undefined,
      responsavel: undefined,
      lancador: undefined,
      ranges: ranges || [],
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao buscar meta' })
  }
}

// ─── Criar ────────────────────────────────────────────────────────────────────
//
// Execução sequencial: insert meta → insert ranges.
// Em caso de falha nos ranges, a meta já foi criada (sem atomicidade).
// Para atomicidade total, crie uma RPC no Supabase:
//   CREATE OR REPLACE FUNCTION criar_meta_com_ranges(meta jsonb, ranges jsonb[]) ...
//
// ─────────────────────────────────────────────────────────────────────────────

async function criar(req, res) {
  try {
    const {
      ciclo_id, nome, descricao, tipo, setor_id, responsavel_id,
      lancador_id, tipo_regra, peso, dia_limite_lancamento,
      data_inicio, data_fim, global, ranges,
    } = req.body

    const [meta] = await db.insert('metas', {
      ciclo_id,
      nome,
      descricao,
      tipo,
      setor_id,
      responsavel_id,
      lancador_id,
      tipo_regra,
      peso: peso || 1,
      dia_limite_lancamento,
      data_inicio,
      data_fim,
      global: global || false,
    })

    if (ranges && ranges.length) {
      const rangesPayload = ranges.map((r, i) => ({
        meta_id: meta.id,
        valor_minimo: r.valor_minimo,
        operador: r.operador,
        percentual_resultado: r.percentual_resultado,
        ordem: i,
      }))
      await db.insert('meta_ranges', rangesPayload, false)
    }

    res.status(201).json(meta)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao criar meta' })
  }
}

// ─── Atualizar ────────────────────────────────────────────────────────────────

async function atualizar(req, res) {
  try {
    const {
      nome, descricao, tipo, setor_id, responsavel_id, lancador_id,
      tipo_regra, peso, dia_limite_lancamento, data_inicio, data_fim, global, ranges,
    } = req.body

    const [meta] = await db.update(
      'metas',
      {
        nome, descricao, tipo, setor_id, responsavel_id, lancador_id,
        tipo_regra, peso, dia_limite_lancamento, data_inicio, data_fim, global,
      },
      [{ coluna: 'id', valor: req.params.id }]
    )

    if (!meta) return res.status(404).json({ erro: 'Meta não encontrada' })

    if (ranges) {
      // Remove ranges antigos e insere os novos
      await db.remove('meta_ranges', [{ coluna: 'meta_id', valor: req.params.id }])
      if (ranges.length) {
        const rangesPayload = ranges.map((r, i) => ({
          meta_id: req.params.id,
          valor_minimo: r.valor_minimo,
          operador: r.operador,
          percentual_resultado: r.percentual_resultado,
          ordem: i,
        }))
        await db.insert('meta_ranges', rangesPayload, false)
      }
    }

    res.json(meta)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao atualizar meta' })
  }
}

// ─── Remover ──────────────────────────────────────────────────────────────────

async function remover(req, res) {
  try {
    await db.remove('metas', [{ coluna: 'id', valor: req.params.id }])
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao remover meta' })
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, remover }