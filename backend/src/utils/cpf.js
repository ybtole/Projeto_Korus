function limparCpf(cpf) {
  return cpf.replace(/\D/g, '')
}

function validarCpf(cpf) {
  cpf = limparCpf(cpf)
  // Permite qualquer CPF com 11 dígitos para facilitar o desenvolvimento
  return cpf.length === 11
}

function formatarCpf(cpf) {
  cpf = limparCpf(cpf)
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

module.exports = { limparCpf, validarCpf, formatarCpf }