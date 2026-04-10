/**
 * controllers/notificacoes.js
 * Refatorado para usar dbAdapter.
 */

const db = require('../lib/dbAdapter')

async function listar(req, res) {
  try {
    const notificacoes = await db.select('notificacoes', {
      filtros: [{ coluna: 'usuario_id', valor: req.usuario.id }],
      ordem: { coluna: 'created_at', ascendente: false },
      limite: 50,
    })
    res.json(notificacoes || [])
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao listar notificações' })
  }
}

async function marcarLida(req, res) {
  try {
    await db.update(
      'notificacoes',
      { lida: true },
      [
        { coluna: 'id', valor: req.params.id },
        { coluna: 'usuario_id', valor: req.usuario.id },
      ],
      false
    )
    res.json({ mensagem: 'Notificação marcada como lida' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao marcar notificação' })
  }
}

async function marcarTodasLidas(req, res) {
  try {
    await db.update(
      'notificacoes',
      { lida: true },
      [{ coluna: 'usuario_id', valor: req.usuario.id }],
      false
    )
    res.json({ mensagem: 'Todas notificações marcadas como lidas' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao marcar notificações' })
  }
}

module.exports = { listar, marcarLida, marcarTodasLidas }