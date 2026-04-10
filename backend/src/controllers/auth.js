/**
 * controllers/auth.js
 * Refatorado para usar dbAdapter — sem pg, sem SQL raw
 */

const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const db = require('../lib/dbAdapter')
const { validarCpf, limparCpf } = require('../utils/cpf')

async function login(req, res) {
  try {
    const { cpf, senha } = req.body
    const cpfLimpo = limparCpf(cpf || '')

    if (!validarCpf(cpfLimpo)) {
      return res.status(400).json({ erro: 'CPF inválido' })
    }

    const usuario = await db.select('usuarios', {
      filtros: [
        { coluna: 'cpf', valor: cpfLimpo },
        { coluna: 'ativo', valor: true },
      ],
      unico: true,
    })

    console.log('[Auth Debug] CPF buscado:', cpfLimpo);
    console.log('[Auth Debug] Usuário encontrado:', usuario ? 'SIM' : 'NÃO');

    if (!usuario) {
      console.log('[Auth Debug] Usuário não encontrado no banco.');
      return res.status(401).json({ erro: 'CPF ou senha incorretos' })
    }

    const senhaLimpa = senha.trim()
    const hashBanco = usuario.senha.trim()

    console.log('[Auth Debug] Senha recebida (tamanho):', senhaLimpa.length);
    console.log('[Auth Debug] Prefixo do Hash no Banco:', hashBanco.substring(0, 10));

    const senhaOk = await bcrypt.compare(senhaLimpa, hashBanco)
    console.log('[Auth Debug] Senha bate?:', senhaOk ? 'SIM' : 'NÃO');

    if (!senhaOk) return res.status(401).json({ erro: 'CPF ou senha incorretos' })

    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, role: usuario.role, setor_id: usuario.setor_id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        role: usuario.role,
        setor_id: usuario.setor_id,
        email: usuario.email,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro no login' })
  }
}

async function me(req, res) {
  try {
    const usuario = await db.select('usuarios', {
      colunas: 'id, nome, cpf, role, setor_id, email, created_at',
      filtros: [{ coluna: 'id', valor: req.usuario.id }],
      unico: true,
    })
    res.json(usuario)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao buscar usuário' })
  }
}

async function salvarEmail(req, res) {
  try {
    const { email } = req.body
    if (!email || !email.includes('@')) {
      return res.status(400).json({ erro: 'Email inválido' })
    }

    await db.update(
      'usuarios',
      { email },
      [{ coluna: 'id', valor: req.usuario.id }],
      false
    )

    res.json({ mensagem: 'Email salvo com sucesso' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao salvar email' })
  }
}

module.exports = { login, me, salvarEmail }