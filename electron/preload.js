const { contextBridge } = require('electron')

// Expõe APIs seguras para o renderer se necessário no futuro
// Por ora mantém isolado — o frontend usa axios normal apontando para o backend
contextBridge.exposeInMainWorld('korus', {
  versao: '1.0.0',
})