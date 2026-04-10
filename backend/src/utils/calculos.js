/**
 * Dado um valor lançado e os ranges de uma meta,
 * retorna o percentual PPR correspondente.
 *
 * tipo_regra CRESCENTE: maior valor = melhor (usa >=)
 * tipo_regra DECRESCENTE: menor valor = melhor (usa <=)
 *
 * Os ranges devem vir ordenados por `ordem` ASC.
 * O sistema percorre do mais restritivo para o menos e retorna
 * o primeiro range que satisfaz a condição.
 */
function calcularPercentualRange(valor, ranges) {
  for (const range of ranges) {
    const v = parseFloat(valor)
    const min = parseFloat(range.valor_minimo)

    if (range.operador === '>=' && v >= min) return parseFloat(range.percentual_resultado)
    if (range.operador === '<=' && v <= min) return parseFloat(range.percentual_resultado)
  }
  return 0
}

/**
 * Calcula o resultado PPR de uma meta no ciclo.
 *
 * lancamentos: array de { percentual_calculado } (somente APROVADOS)
 * peso: peso da meta (ex: 1, 0.5, 2)
 * totalPeso: soma dos pesos de todas as metas do setor no ciclo
 *
 * Retorna o percentual ponderado desta meta no PPR total.
 */
function calcularResultadoMeta(lancamentos, peso, totalPeso) {
  if (!lancamentos.length) return 0

  const media = lancamentos.reduce((acc, l) => acc + parseFloat(l.percentual_calculado || 0), 0) / lancamentos.length
  const participacao = peso / totalPeso // fração desta meta no total
  return media * participacao
}

/**
 * Soma os resultados de todas as metas de um setor.
 * Resultado máximo: 100% (clampado).
 */
function calcularPPRSetor(resultadosMetas) {
  const total = resultadosMetas.reduce((acc, r) => acc + r, 0)
  return Math.min(total, 100)
}

module.exports = { calcularPercentualRange, calcularResultadoMeta, calcularPPRSetor }