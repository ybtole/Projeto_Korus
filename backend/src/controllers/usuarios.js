/**
 * controllers/usuarios.js
 * Refatorado para usar dbAdapter — sem pg, sem SQL raw
 */

const bcrypt = require('bcrypt')
const db = require('../lib/dbAdapter')
const { validarCpf, limparCpf } = require('../utils/cpf')

// ─── Listar ──────────────────────────────────────────────────────────────────

async function listar(req, res) {
  try {
    // Supabase suporta joins via select string no formato PostgREST
    const usuarios = await db.select('usuarios', {
      colunas: 'id, nome, cpf, role, ativo, setor_id, setores(nome)',
      ordem: { coluna: 'nome', ascendente: true },
    })

    // Normaliza o join aninhado para manter a mesma interface que o frontend já consome
    const resultado = (usuarios || []).map(u => ({
      ...u,
      setor_nome: u.setores?.nome ?? null,
      setores: undefined,
    }))

    res.json(resultado)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao listar usuários' })
  }
}

// ─── Buscar por ID ────────────────────────────────────────────────────────────

async function buscarPorId(req, res) {
  try {
    const usuario = await db.select('usuarios', {
      colunas: 'id, nome, cpf, role, ativo, setor_id, email, setores(nome)',
      filtros: [{ coluna: 'id', valor: req.params.id }],
      unico: true,
    })

    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' })

    res.json({
      ...usuario,
      setor_nome: usuario.setores?.nome ?? null,
      setores: undefined,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao buscar usuário' })
  }
}

// ─── Criar ────────────────────────────────────────────────────────────────────

async function criar(req, res) {
  try {
    const { nome, cpf, senha, role, setor_id } = req.body
    const cpfLimpo = limparCpf(cpf || '')

    if (!validarCpf(cpfLimpo)) {
      return res.status(400).json({ erro: 'CPF inválido' })
    }

    const rolesValidas = ['ADMIN', 'ESPECIALISTA_CUSTO', 'GESTOR', 'OPERADOR']
    if (!rolesValidas.includes(role)) {
      return res.status(400).json({ erro: 'Role inválida' })
    }

    // Verificar duplicata
    const existente = await db.select('usuarios', {
      colunas: 'id',
      filtros: [{ coluna: 'cpf', valor: cpfLimpo }],
      unico: true,
    })
    if (existente) return res.status(409).json({ erro: 'CPF já cadastrado' })

    const hash = await bcrypt.hash(senha, 10)

    const [novoUsuario] = await db.insert('usuarios', {
      nome,
      cpf: cpfLimpo,
      senha: hash,
      role,
      setor_id: setor_id || null,
    })

    // Nunca retornar a senha
    const { senha: _, ...semSenha } = novoUsuario
    res.status(201).json(semSenha)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao criar usuário' })
  }
}

// ─── Atualizar ────────────────────────────────────────────────────────────────

async function atualizar(req, res) {
  try {
    const { nome, role, setor_id, ativo } = req.body

    // Monta apenas os campos enviados (equivalente ao COALESCE do SQL original)
    const campos = {}
    if (nome !== undefined) campos.nome = nome
    if (role !== undefined) campos.role = role
    if (setor_id !== undefined) campos.setor_id = setor_id
    if (ativo !== undefined) campos.ativo = ativo

    if (!Object.keys(campos).length) {
      return res.status(400).json({ erro: 'Nenhum campo enviado para atualização' })
    }

    const [atualizado] = await db.update(
      'usuarios',
      campos,
      [{ coluna: 'id', valor: req.params.id }]
    )

    if (!atualizado) return res.status(404).json({ erro: 'Usuário não encontrado' })

    const { senha: _, ...semSenha } = atualizado
    res.json(semSenha)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao atualizar usuário' })
  }
}

// ─── Alterar senha ────────────────────────────────────────────────────────────

async function alterarSenha(req, res) {
  try {
    const { senha_atual, nova_senha } = req.body

    // Busca apenas o hash — não expõe outros campos
    const usuario = await db.select('usuarios', {
      colunas: 'id, senha',
      filtros: [{ coluna: 'id', valor: req.usuario.id }],
      unico: true,
    })

    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' })

    const senhaOk = await bcrypt.compare(senha_atual, usuario.senha)
    if (!senhaOk) return res.status(401).json({ erro: 'Senha atual incorreta' })

    const hash = await bcrypt.hash(nova_senha, 10)

    await db.update(
      'usuarios',
      { senha: hash },
      [{ coluna: 'id', valor: req.usuario.id }],
      false // não precisa retornar o registro
    )

    res.json({ mensagem: 'Senha alterada com sucesso' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: 'Erro ao alterar senha' })
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, alterarSenha }