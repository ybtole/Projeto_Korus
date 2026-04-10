/**
 * controllers/upload.js
 * Upload migrado de multer/filesystem → Supabase Storage.
 *
 * Requisitos no Supabase:
 *   - Criar um bucket chamado "anexos" (pode ser privado)
 *   - Política de acesso: autenticados podem fazer upload
 *
 * O middleware `receberArquivo` usa multer em memória apenas como
 * parser do multipart — o arquivo não é gravado em disco.
 */

const multer = require('multer')
const db = require('../lib/dbAdapter')

// ─── Multer em memória (apenas parser, sem gravação em disco) ─────────────────

const TIPOS_PERMITIDOS = /jpeg|jpg|png|gif|pdf|xlsx|xls|csv/
const TAMANHO_MAX = 10 * 1024 * 1024 // 10MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAX },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase()
    if (TIPOS_PERMITIDOS.test(ext)) return cb(null, true)
    cb(new Error('Tipo de arquivo não permitido'))
  },
})

// Exportado para uso no router (igual ao anterior)
const receberArquivo = upload.single('arquivo')

// ─── Upload para Supabase Storage ─────────────────────────────────────────────

async function uploadAnexo(req, res) {
  try {
    const { lancamento_id } = req.params
    if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado' })

    const supabase = db.getClient()
    const ext = req.file.originalname.split('.').pop()
    const nomeArquivo = `${lancamento_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    // Faz upload para o bucket "anexos"
    const { error: uploadError } = await supabase.storage
      .from('anexos')
      .upload(nomeArquivo, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      })

    if (uploadError) throw uploadError

    // Gera URL pública (se bucket público) ou signed URL (se privado)
    // Ajuste conforme a política do seu bucket
    const { data: urlData } = supabase.storage
      .from('anexos')
      .getPublicUrl(nomeArquivo)

    // Persiste metadados no banco
    const [anexo] = await db.insert('lancamento_anexos', {
      lancamento_id: parseInt(lancamento_id),
      nome_arquivo: req.file.originalname,
      caminho: nomeArquivo,           // path relativo no bucket
      tipo_arquivo: req.file.mimetype,
      url: urlData?.publicUrl ?? null, // URL de acesso (adicionar coluna url se não existir)
    })

    res.status(201).json(anexo)
  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: err.message || 'Erro ao fazer upload' })
  }
}

module.exports = { upload: receberArquivo, uploadAnexo }