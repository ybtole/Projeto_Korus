require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')

const routes = require('./routes')

const app = express()
const PORT = process.env.PORT || 3333

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')))
app.use('/api', routes)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ erro: err.message || 'Erro interno do servidor' })
})

app.listen(PORT, () => {
  console.log(`✓ KORUS backend rodando na porta ${PORT}`)
})