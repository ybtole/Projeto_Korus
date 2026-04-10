/**
 * dbAdapter.js
 * Camada de abstração de banco de dados — provider: Supabase
 *
 * Expõe métodos genéricos (select, insert, update, delete, rpc)
 * que encapsulam o cliente Supabase. Para migrar para outro provider
 * basta trocar a implementação interna sem alterar nenhum controller.
 */

const { createClient } = require('@supabase/supabase-js')

// ─── Inicialização do cliente ────────────────────────────────────────────────

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL e SUPABASE_KEY são obrigatórias no .env')
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ─── Tratamento de erro padrão ───────────────────────────────────────────────

/**
 * Lança um Error padronizado a partir da resposta do Supabase.
 * Inclui o código original para facilitar tratamento upstream.
 */
function handleError(error, contexto = '') {
  if (!error) return
  const msg = contexto ? `[${contexto}] ${error.message}` : error.message
  const err = new Error(msg)
  err.code = error.code
  err.details = error.details
  err.hint = error.hint
  throw err
}

// ─── API pública do adapter ──────────────────────────────────────────────────

/**
 * SELECT
 *
 * @param {string} tabela
 * @param {object} [opcoes]
 * @param {string}   [opcoes.colunas='*']           - Colunas/joins ex: '*, setores(nome)'
 * @param {Array}    [opcoes.filtros=[]]             - [{ coluna, operador, valor }]
 *   operadores suportados: eq, neq, gt, gte, lt, lte, like, ilike, in, is
 * @param {object}   [opcoes.ordem]                 - { coluna, ascendente: true }
 * @param {number}   [opcoes.limite]                - LIMIT
 * @param {boolean}  [opcoes.unico=false]           - retorna objeto único (maybeSingle)
 * @returns {Promise<Array|object|null>}
 */
async function select(tabela, opcoes = {}) {
  const {
    colunas = '*',
    filtros = [],
    ordem,
    limite,
    unico = false,
  } = opcoes

  let query = supabase.from(tabela).select(colunas)

  for (const f of filtros) {
    const { coluna, operador = 'eq', valor } = f
    if (operador === 'in') {
      query = query.in(coluna, valor)
    } else if (operador === 'is') {
      query = query.is(coluna, valor)
    } else {
      query = query[operador](coluna, valor)
    }
  }

  if (ordem) {
    query = query.order(ordem.coluna, { ascending: ordem.ascendente ?? true })
  }

  if (limite) {
    query = query.limit(limite)
  }

  if (unico) {
    const { data, error } = await query.maybeSingle()
    handleError(error, `select.unico:${tabela}`)
    return data
  }

  const { data, error } = await query
  handleError(error, `select:${tabela}`)
  return data
}

/**
 * INSERT
 *
 * @param {string}        tabela
 * @param {object|Array}  payload   - objeto ou array de objetos
 * @param {boolean}       [retornar=true] - se true, retorna os registros inseridos
 * @returns {Promise<Array>}
 */
async function insert(tabela, payload, retornar = true) {
  let query = supabase.from(tabela).insert(payload)
  if (retornar) query = query.select()
  const { data, error } = await query
  handleError(error, `insert:${tabela}`)
  return data
}

/**
 * UPDATE
 *
 * @param {string}  tabela
 * @param {object}  dados     - campos a atualizar
 * @param {Array}   filtros   - obrigatório; mesmo formato de select()
 * @param {boolean} [retornar=true]
 * @returns {Promise<Array>}
 */
async function update(tabela, dados, filtros = [], retornar = true) {
  if (!filtros.length) {
    throw new Error(`[update:${tabela}] Filtros obrigatórios para UPDATE sem cláusula WHERE`)
  }

  let query = supabase.from(tabela).update(dados)

  for (const f of filtros) {
    const { coluna, operador = 'eq', valor } = f
    if (operador === 'in') {
      query = query.in(coluna, valor)
    } else if (operador === 'is') {
      query = query.is(coluna, valor)
    } else {
      query = query[operador](coluna, valor)
    }
  }

  if (retornar) query = query.select()
  const { data, error } = await query
  handleError(error, `update:${tabela}`)
  return data
}

/**
 * DELETE
 *
 * @param {string} tabela
 * @param {Array}  filtros - obrigatório; mesmo formato de select()
 * @returns {Promise<void>}
 */
async function remove(tabela, filtros = []) {
  if (!filtros.length) {
    throw new Error(`[delete:${tabela}] Filtros obrigatórios para DELETE sem cláusula WHERE`)
  }

  let query = supabase.from(tabela).delete()

  for (const f of filtros) {
    const { coluna, operador = 'eq', valor } = f
    if (operador === 'in') {
      query = query.in(coluna, valor)
    } else {
      query = query[operador](coluna, valor)
    }
  }

  const { error } = await query
  handleError(error, `delete:${tabela}`)
}

/**
 * RPC — chama uma PostgreSQL Function no Supabase.
 * Usar como substituto de transações complexas.
 *
 * @param {string} nomeFuncao
 * @param {object} [params={}]
 * @returns {Promise<any>}
 */
async function rpc(nomeFuncao, params = {}) {
  const { data, error } = await supabase.rpc(nomeFuncao, params)
  handleError(error, `rpc:${nomeFuncao}`)
  return data
}

/**
 * Expõe o cliente Supabase bruto para casos não cobertos pelo adapter
 * (ex: queries de Storage, Auth, realtime).
 * Use com parcimônia — preferir sempre os métodos acima.
 */
function getClient() {
  return supabase
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = { select, insert, update, remove, rpc, getClient }