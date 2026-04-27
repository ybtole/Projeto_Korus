export function calcularMeta(valor_real, configuracao_meta) {
  const { tipo_calculo, peso, direcao, config_booleano, config_categorico, ranges } = configuracao_meta;
  
  let percentual_atingido = 0;
  let status = 'Não Atingido';

  if (!valor_real && valor_real !== 0) {
    return {
      percentual_atingido: 0,
      valor_ponderado: 0,
      status: 'Não Lançado'
    };
  }

  // 1. BOOLEANO
  if (tipo_calculo === 'BOOLEANO') {
    // config_booleano esperado: { valor_sucesso: 'Concluído', valor_falha: 'Não Concluído' }
    const { valor_sucesso } = config_booleano || {};
    
    if (String(valor_real).trim().toLowerCase() === String(valor_sucesso).trim().toLowerCase()) {
      percentual_atingido = 100;
      status = 'Atingido';
    } else {
      percentual_atingido = 0;
      status = 'Não Atingido';
    }
  } 
  
  // 2. CATEGÓRICO
  else if (tipo_calculo === 'CATEGORICO') {
    // config_categorico esperado: [{ categoria: 'A', percentual: 100 }, ...]
    const catConfigs = config_categorico || [];
    const match = catConfigs.find(
      c => String(c.categoria).trim().toLowerCase() === String(valor_real).trim().toLowerCase()
    );

    if (match) {
      percentual_atingido = Number(match.percentual) || 0;
    } else {
      percentual_atingido = 0;
    }

    if (percentual_atingido >= 100) status = 'Atingido';
    else if (percentual_atingido > 0) status = 'Parcial';
    else status = 'Não Atingido';
  } 
  
  // 3. MARGINAL (FAIXAS)
  else {
    // Assume MARGINAL (default)
    const val = Number(valor_real);
    const numRanges = ranges || [];

    if (isNaN(val) || numRanges.length === 0) {
      percentual_atingido = 0;
    } else {
      if (direcao === 'MINIMIZAR') {
        // Encontra a primeira faixa onde o valor <= ate
        const sortedRanges = [...numRanges].sort((a, b) => Number(a.ate) - Number(b.ate));
        let match = null;
        for (const r of sortedRanges) {
          if (val <= Number(r.ate)) {
            match = r;
            break;
          }
        }
        if (match) {
          percentual_atingido = Number(match.percentual);
        } else {
          // Se for maior que todos os 'ate', percentual é da última faixa (ou zero)
          percentual_atingido = 0;
        }
      } else {
        // MAXIMIZAR
        // Encontra a faixa mais alta onde o valor >= de
        const sortedRanges = [...numRanges].sort((a, b) => Number(b.de) - Number(a.de));
        let match = null;
        for (const r of sortedRanges) {
          if (val >= Number(r.de)) {
            match = r;
            break;
          }
        }
        if (match) {
          percentual_atingido = Number(match.percentual);
        } else {
          percentual_atingido = 0;
        }
      }
    }

    if (percentual_atingido >= 100) status = 'Atingido';
    else if (percentual_atingido > 0) status = 'Parcial';
    else status = 'Não Atingido';
  }

  // percentual_atingido não pode exceder 100 (a menos que seja especificado pelo negócio, mas mantemos limit a 100 por padrão)
  percentual_atingido = Math.min(Math.max(percentual_atingido, 0), 100);

  const pesoNum = Number(peso) || 0;
  const valor_ponderado = (percentual_atingido / 100) * pesoNum;

  return {
    percentual_atingido,
    valor_ponderado,
    status
  };
}
