/**
 * utils/notificacoes.js
 * Refatorado para usar dbAdapter em vez de pool direto.
 * Lógica e assinatura das funções: inalteradas.
 */

const db = require('../lib/dbAdapter')

async function criarNotificacao(usuarioId, titulo, mensagem, tipo = 'INFO') {
  try {
    await db.insert('notificacoes', {
      usuario_id: usuarioId,
      titulo,
      mensagem,
      tipo,
    }, false)
  } catch (err) {
    // Notificações não devem quebrar o fluxo principal
    console.error('Erro ao criar notificação:', err)
  }
}

async function notificarReprovacao(lancamentoId, responsavelId, motivo) {
  await criarNotificacao(
    responsavelId,
    'Lançamento reprovado',
    `O lançamento #${lancamentoId} foi reprovado. Motivo: ${motivo}`,
    'REPROVACAO'
  )
}

async function notificarAprovacao(lancamentoId, responsavelId) {
  await criarNotificacao(
    responsavelId,
    'Lançamento aprovado',
    `O lançamento #${lancamentoId} foi aprovado pelo especialista de custo.`,
    'APROVACAO'
  )
}

async function notificarMetaAtrasada(metaId, metaNome, responsavelId) {
  await criarNotificacao(
    responsavelId,
    'Meta com lançamento atrasado',
    `A meta "${metaNome}" (ID ${metaId}) está com lançamento em atraso.`,
    'ALERTA'
  )
}

module.exports = { criarNotificacao, notificarReprovacao, notificarAprovacao, notificarMetaAtrasada }