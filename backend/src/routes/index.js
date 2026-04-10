const express = require('express')
const router = express.Router()
const { autenticar, autorizar } = require('../middleware/auth')

const auth = require('../controllers/auth')
const usuarios = require('../controllers/usuarios')
const setores = require('../controllers/setores')
const ciclos = require('../controllers/ciclos')
const metas = require('../controllers/metas')
const lancamentos = require('../controllers/lancamentos')
const aprovacoes = require('../controllers/aprovacoes')
const dashboard = require('../controllers/dashboard')
const notificacoes = require('../controllers/notificacoes')
const { upload, uploadAnexo } = require('../controllers/upload')

// Auth
router.post('/auth/login', auth.login)
router.get('/auth/me', autenticar, auth.me)
router.put('/auth/email', autenticar, auth.salvarEmail)

// Usuários (apenas admin)
router.get('/usuarios', autenticar, autorizar('ADMIN'), usuarios.listar)
router.get('/usuarios/:id', autenticar, autorizar('ADMIN'), usuarios.buscarPorId)
router.post('/usuarios', autenticar, autorizar('ADMIN'), usuarios.criar)
router.put('/usuarios/:id', autenticar, autorizar('ADMIN'), usuarios.atualizar)
router.put('/usuarios/senha', autenticar, usuarios.alterarSenha)

// Setores
router.get('/setores', autenticar, setores.listar)
router.get('/setores/plano', autenticar, setores.listarPlano)
router.get('/setores/:id/descendentes', autenticar, setores.descendentes)
router.post('/setores', autenticar, autorizar('ADMIN'), setores.criar)
router.put('/setores/:id', autenticar, autorizar('ADMIN'), setores.atualizar)
router.delete('/setores/:id', autenticar, autorizar('ADMIN'), setores.remover)

// Ciclos
router.get('/ciclos', autenticar, ciclos.listar)
router.get('/ciclos/ativo', autenticar, ciclos.buscarAtivo)
router.post('/ciclos', autenticar, autorizar('ADMIN'), ciclos.criar)
router.put('/ciclos/:id/ativar', autenticar, autorizar('ADMIN'), ciclos.ativar)
router.put('/ciclos/:id', autenticar, autorizar('ADMIN'), ciclos.atualizar)

// Metas
router.get('/metas', autenticar, metas.listar)
router.get('/metas/:id', autenticar, metas.buscarPorId)
router.post('/metas', autenticar, autorizar('ADMIN', 'GESTOR'), metas.criar)
router.put('/metas/:id', autenticar, autorizar('ADMIN', 'GESTOR'), metas.atualizar)
router.delete('/metas/:id', autenticar, autorizar('ADMIN'), metas.remover)

// Lançamentos
router.get('/lancamentos', autenticar, lancamentos.listar)
router.get('/lancamentos/:id', autenticar, lancamentos.buscarPorId)
router.post('/lancamentos', autenticar, lancamentos.criar)
router.put('/lancamentos/:id', autenticar, lancamentos.atualizar)

// Upload de anexos
router.post('/lancamentos/:lancamento_id/anexos', autenticar, upload, uploadAnexo)

// Aprovações (somente especialista de custo)
router.get('/aprovacoes', autenticar, autorizar('ESPECIALISTA_CUSTO', 'ADMIN'), aprovacoes.listar)
router.post('/aprovacoes', autenticar, autorizar('ESPECIALISTA_CUSTO', 'ADMIN'), aprovacoes.avaliar)

// Dashboard
router.get('/dashboard/resumo', autenticar, dashboard.resumo)
router.get('/dashboard/resultado-ppr', autenticar, dashboard.resultadoPPR)

// Notificações
router.get('/notificacoes', autenticar, notificacoes.listar)
router.put('/notificacoes/:id/lida', autenticar, notificacoes.marcarLida)
router.put('/notificacoes/todas-lidas', autenticar, notificacoes.marcarTodasLidas)

module.exports = router