/**
 * controllers/lancamentos.js
 * Refatorado para usar dbAdapter.
 * Lógica de negócio (calcularPercentualRange) e regras de validação: inalteradas.
 */

const db = require('../lib/dbAdapter')
const { calcularPercentualRange } = require('../utils/calculos')
const { criarNotificacao } = require('../utils/notificacoes')

// ─── Listar ──────────────────────────────────────────────────────────────────

async function listar(req, res) {
  try {
    const { meta_id, status, mes_referencia } = req.query

    // Filtros dinâmicos
    const filtros = []
    if (meta_id) filtros.push({ coluna: 'meta_id', valor: meta_id })
    if (status) filtros.push({ coluna: 'status', valor: status })
    if (mes_referencia) filtros.push({ coluna: 'mes_referencia', valor: mes_referencia })

    const lancamentos = await db.select('lancamentos', {
      colunas: `
        *,
        metas(nome),
        criado_por_usuario:usuarios!lancamentos_criado_por_fkey(nome)
      `,
      filtros,
      ordem: { coluna: 'created_at', ascendente: false },
    })

    const resultado = (lancamentos || []).map(l => ({
      ...l,
      meta_nome: l.metas?.nome ?? null,
      criado_por_nome: l.criado_por_usuario?.nome ?? null,
      metas: undefined,
      criado_por_usuario: undefined,
    }))

    res.json(resultado)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao listar lançamentos' })
  }
}

// ─── Buscar por ID ────────────────────────────────────────────────────────────

async function buscarPorId(req, res) {
  try {
    const lancamento = await db.select('lancamentos', {
      colunas: `
        *,
        metas(nome),
        criado_por_usuario:usuarios!lancamentos_criado_por_fkey(nome)
      `,
      filtros: [{ coluna: 'id', valor: req.params.id }],
      unico: true,
    })

    if (!lancamento) return res.status(404).json({ erro: 'Lançamento não encontrado' })

    const anexos = await db.select('lancamento_anexos', {
      filtros: [{ coluna: 'lancamento_id', valor: req.params.id }],
    })

    res.json({
      ...lancamento,
      meta_nome: lancamento.metas?.nome ?? null,
      criado_por_nome: lancamento.criado_por_usuario?.nome ?? null,
      metas: undefined,
      criado_por_usuario: undefined,
      anexos: anexos || [],
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao buscar lançamento' })
  }
}

// ─── Criar ────────────────────────────────────────────────────────────────────

async function criar(req, res) {
  try {
    const { meta_id, valor, mes_referencia, observacao } = req.body

    const meta = await db.select('metas', {
      filtros: [{ coluna: 'id', valor: meta_id }],
      unico: true,
    })
    if (!meta) return res.status(404).json({ erro: 'Meta não encontrada' })

    // Validar período — lógica de negócio inalterada
    const [ano, mes] = mes_referencia.split('-').map(Number)
    const mesRef = new Date(ano, mes - 1, 1)
    const inicioMeta = new Date(meta.data_inicio)
    const fimMeta = new Date(meta.data_fim)

    if (mesRef < inicioMeta || mesRef > fimMeta) {
      return res.status(400).json({ erro: 'Mês de referência fora do período da meta' })
    }

    // Verificar duplicidade
    const existente = await db.select('lancamentos', {
      colunas: 'id',
      filtros: [
        { coluna: 'meta_id', valor: meta_id },
        { coluna: 'mes_referencia', valor: mes_referencia },
      ],
      unico: true,
    })
    if (existente) {
      return res.status(409).json({ erro: 'Já existe lançamento para este mês nesta meta' })
    }

    // Calcular percentual — utils/calculos.js inalterado
    const ranges = await db.select('meta_ranges', {
      filtros: [{ coluna: 'meta_id', valor: meta_id }],
      ordem: { coluna: 'ordem', ascendente: true },
    })
    const percentual = calcularPercentualRange(valor, ranges || [])

    const [lancamento] = await db.insert('lancamentos', {
      meta_id,
      valor,
      mes_referencia,
      status: 'PENDENTE',
      criado_por: req.usuario.id,
      observacao,
      percentual_calculado: percentual,
    })

    // Notificar especialistas de custo
    const especialistas = await db.select('usuarios', {
      colunas: 'id',
      filtros: [
        { coluna: 'role', valor: 'ESPECIALISTA_CUSTO' },
        { coluna: 'ativo', valor: true },
      ],
    })
    for (const esp of especialistas || []) {
      await criarNotificacao(
        esp.id,
        'Novo lançamento pendente',
        `Meta "${meta.nome}" — Mês ${mes_referencia} — Valor: ${valor}`,
        'INFO'
      )
    }

    res.status(201).json(lancamento)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao criar lançamento' })
  }
}

// ─── Atualizar ────────────────────────────────────────────────────────────────

async function atualizar(req, res) {
  try {
    const { valor, observacao } = req.body

    const lanc = await db.select('lancamentos', {
      filtros: [{ coluna: 'id', valor: req.params.id }],
      unico: true,
    })
    if (!lanc) return res.status(404).json({ erro: 'Lançamento não encontrado' })
    if (lanc.status !== 'PENDENTE') {
      return res.status(400).json({ erro: 'Só é possível editar lançamentos pendentes' })
    }

    let percentual = lanc.percentual_calculado
    if (valor !== undefined) {
      const ranges = await db.select('meta_ranges', {
        filtros: [{ coluna: 'meta_id', valor: lanc.meta_id }],
        ordem: { coluna: 'ordem', ascendente: true },
      })
      percentual = calcularPercentualRange(valor, ranges || [])
    }

    const campos = { percentual_calculado: percentual }
    if (valor !== undefined) campos.valor = valor
    if (observacao !== undefined) campos.observacao = observacao

    const [atualizado] = await db.update(
      'lancamentos',
      campos,
      [{ coluna: 'id', valor: req.params.id }]
    )

    res.json(atualizado)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao atualizar lançamento' })
  }
}

module.exports = { listar, buscarPorId, criar, atualizar }