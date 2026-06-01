import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Native CORS middleware configuration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper function to extract text or fall back to mock
function getMockPayload(fileName: string, mimeType?: string): any {
  const normName = (fileName || "").toLowerCase();
  
  if (normName.includes('janeiro') || normName.includes('ana') || normName.includes('intermitente')) {
    return {
      trabalhador: {
        nome: "Ana Silva",
        tipo: "intermitente"
      },
      empresa: {
        nome: "Tech Solutions S.A.",
        cnpj: "12.345.678/0001-99"
      },
      competencia: {
        mes: "Janeiro",
        ano: "2024"
      },
      valores: {
        salario_bruto: 4500.00,
        salario_liquido: 3390.00,
        total_descontos: 630.00,
        total_adicionais: 820.00,
        inss: 480.00,
        fgts: 360.00,
        horas_extras_valor: 320.00,
        adicional_noturno_valor: 0.00,
        bonus: 500.00
      },
      trabalho: {
        dias_trabalhados: 22,
        horas_trabalhadas: 176,
        horas_extras: 14.5,
        horas_noturnas: null,
        media_por_dia: 185.50,
        media_por_hora: 23.18
      },
      itens: [
        { nome: "Salário Base (CLT 160h)", tipo: "provento", valor: 3200.00, referencia: "160h" },
        { nome: "Horas Extras 50% (14.5h)", tipo: "provento", valor: 320.00, referencia: "14.5h" },
        { nome: "Bônus de Performance Q1", tipo: "provento", valor: 500.00, referencia: "Metas" },
        { nome: "Inposto de Renda Retido", tipo: "desconto", valor: 480.00, referencia: "Estimativa" },
        { nome: "Seguro de Saúde Coletivo", tipo: "desconto", valor: 150.00, referencia: "Plano" }
      ],
      alertas: [
        {
          tipo: "info",
          mensagem: "MoM Growth positivo! Crescimento de +R$ 450,00 em relação ao mês anterior motivado por bônus de performance."
        },
        {
          tipo: "atenção",
          mensagem: "Desconto de Seguro de Saúde estável. Desconto por imposto de renda retido na fonte proporcional ao bônus."
        }
      ],
      resumo_ia: "A análise de Janeiro de 2024 aponta uma excelente evolução de rendimentos para Ana Silva. Com um salário base bruto de R$ 3.200,00 acrescido de horas extras e um bônus de metas de R$ 500,00, o salário líquido atingiu R$ 3.390,00. As retenções do INSS e IRPF estão em conformidade legal.",
      campos_ausentes: []
    };
  }

  // Fallback or October Outubro 2023 (Screenshot matching)
  return {
    trabalhador: {
      nome: "João Silva",
      tipo: "mensalista"
    },
    empresa: {
      nome: "Tech Solutions S.A.",
      cnpj: "12.345.678/0001-90"
    },
    competencia: {
      mes: "Outubro",
      ano: "2023"
    },
    valores: {
      salario_bruto: 4500.00,
      salario_liquido: 3820.50,
      total_descontos: 679.50,
      total_adicionais: 150.00,
      inss: 420.00,
      fgts: 360.00,
      horas_extras_valor: 150.00,
      adicional_noturno_valor: 0.00,
      bonus: 0.00
    },
    trabalho: {
      dias_trabalhados: 22,
      horas_trabalhadas: 176,
      horas_extras: 10.0,
      horas_noturnas: null,
      media_por_dia: 283.63,
      media_por_hora: 35.45
    },
    itens: [
      { nome: "Salário Base Base", tipo: "provento", valor: 4500.00, referencia: null },
      { nome: "Horas Extras 50% (10h)", tipo: "provento", valor: 150.00, referencia: "10h" },
      { nome: "INSS", tipo: "desconto", valor: 420.00, referencia: null },
      { nome: "Dedução Vale Transporte", tipo: "desconto", valor: 120.00, referencia: "6%" },
      { nome: "Desconto Assistência Médica", tipo: "desconto", valor: 250.00, referencia: null }
    ],
    alertas: [
      {
        tipo: "atenção",
        mensagem: "Desconto Assistência Médica Elevado: O valor descontado para assistência médica (R$ 250,00) está 15% acima da média dos meses anteriores. Verifique com o RH se houve reajuste no plano."
      },
      {
        tipo: "info",
        mensagem: "Dedução Vale Transporte: O desconto de 6% sobre o salário base foi aplicado corretamente, mas note que houve dias de falta injustificada que podem ter impactado o cálculo proporcional."
      }
    ],
    resumo_ia: "O salário bruto do João Silva referente à competência Outubro/2023 foi de R$ 4.500,00. Foram identificados adicionais de R$ 150,00 (10 horas extras). Houve descontos totalizando R$ 679,50, resultando em um excelente salário líquido de R$ 3.820,50.",
    campos_ausentes: []
  };
}

function parseFilenameCompetencia(filename: string) {
  const norm = (filename || "").toLowerCase();
  
  // Try pattern MMYYYY (e.g. 062025 L.pdf or 072025 001.pdf)
  const mmyyyyRegex = /(0[1-9]|1[0-2])(20\d{2})/;
  const match = norm.match(mmyyyyRegex);
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  if (match) {
    const mesIndex = parseInt(match[1], 10) - 1;
    const ano = match[2];
    return {
      mes: meses[mesIndex],
      ano: ano
    };
  }

  // Try pattern YYYY-MM
  const yyyymmRegex = /(20\d{2})[-_]?(0[1-9]|1[0-2])/;
  const match2 = norm.match(yyyymmRegex);
  if (match2) {
    const ano = match2[1];
    const mesIndex = parseInt(match2[2], 10) - 1;
    return {
      mes: meses[mesIndex],
      ano: ano
    };
  }

  // Check for Portuguese month names in raw filename
  for (let i = 0; i < meses.length; i++) {
    if (norm.includes(meses[i].toLowerCase())) {
      const yearMatch = norm.match(/\b(20\d{2})\b/);
      return {
        mes: meses[i],
        ano: yearMatch ? yearMatch[1] : new Date().getFullYear().toString()
      };
    }
  }

  // Try parsing single digit month + 4 digit year e.g. 62025 -> 062025
  const singleDigitRegex = /\b([1-9])(20\d{2})\b/;
  const match3 = norm.match(singleDigitRegex);
  if (match3) {
    const mesIndex = parseInt(match3[1], 10) - 1;
    const ano = match3[2];
    return {
      mes: meses[mesIndex],
      ano: ano
    };
  }

  // Default to current mes/ano
  const now = new Date();
  return {
    mes: meses[now.getMonth()],
    ano: now.getFullYear().toString()
  };
}

const IS_DEVELOPMENT_SIMULATION = false;

function parseBrazilianNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (!str) return null;
  
  // Replace currency symbols and spaces
  let normalized = str.replace(/[R$\s]/g, "");
  
  if (normalized.includes(',') && normalized.includes('.')) {
    if (normalized.indexOf('.') < normalized.indexOf(',')) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(",", ".");
  }
  
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? null : parsed;
}

function computeAnalysisModeAndConfidence(data: any) {
  if (data.analysis_mode === "manual_assistido") {
    data.extraction_confidence = 0;
    data.campos_extraidos = [];
    data.campos_ausentes = ["dados_do_contracheque"];
    return data;
  }
  let score = 0;
  const campos_extraidos: string[] = [];
  const campos_ausentes: string[] = [];
  
  if (data.trabalhador?.nome) {
    score += 10;
    campos_extraidos.push("trabalhador.nome");
  } else {
    campos_ausentes.push("trabalhador.nome");
  }
  
  if (data.empresa?.nome) {
    score += 15;
    campos_extraidos.push("empresa.nome");
  } else {
    campos_ausentes.push("empresa.nome");
  }
  
  if (data.empresa?.cnpj) {
    score += 10;
    campos_extraidos.push("empresa.cnpj");
  } else {
    campos_ausentes.push("empresa.cnpj");
  }
  
  if (data.competencia?.mes) {
    score += 10;
    campos_extraidos.push("competencia.mes");
  } else {
    campos_ausentes.push("competencia.mes");
  }
  
  if (data.competencia?.ano) {
    score += 10;
    campos_extraidos.push("competencia.ano");
  } else {
    campos_ausentes.push("competencia.ano");
  }
  
  if (data.valores?.salario_bruto !== null && data.valores?.salario_bruto !== undefined && data.valores?.salario_bruto > 0) {
    score += 10;
    campos_extraidos.push("valores.salario_bruto");
  } else {
    campos_ausentes.push("valores.salario_bruto");
  }
  
  if (data.valores?.salario_liquido !== null && data.valores?.salario_liquido !== undefined && data.valores?.salario_liquido > 0) {
    score += 15;
    campos_extraidos.push("valores.salario_liquido");
  } else {
    campos_ausentes.push("valores.salario_liquido");
  }
  
  if (data.valores?.total_proventos !== null && data.valores?.total_proventos !== undefined && data.valores?.total_proventos > 0) {
    score += 5;
    campos_extraidos.push("valores.total_proventos");
  } else {
    campos_ausentes.push("valores.total_proventos");
  }
  
  if (data.valores?.total_descontos !== null && data.valores?.total_descontos !== undefined) {
    score += 5;
    campos_extraidos.push("valores.total_descontos");
  } else {
    campos_ausentes.push("valores.total_descontos");
  }
  
  if (data.itens && data.itens.length > 0) {
    score += 10;
    campos_extraidos.push("itens");
  } else {
    campos_ausentes.push("itens");
  }

  data.campos_extraidos = campos_extraidos;
  data.campos_ausentes = campos_ausentes;
  data.extraction_confidence = score;

  const hasLiquido = data.valores?.salario_liquido !== null && data.valores?.salario_liquido !== undefined && data.valores?.salario_liquido > 0;
  const hasEmpresa = !!data.empresa?.nome;
  const hasCompetencia = !!(data.competencia?.mes && data.competencia?.ano);
  const hasItens = data.itens && data.itens.length > 0;
  const hasTotals = (data.valores?.total_proventos !== null && data.valores?.total_proventos !== undefined) && 
                      (data.valores?.total_descontos !== null && data.valores?.total_descontos !== undefined);
  
  if (hasLiquido && hasEmpresa && hasCompetencia && hasItens && hasTotals) {
    data.analysis_mode = "ia_real";
  } else if (hasLiquido || hasItens || score > 30) {
    data.analysis_mode = "ia_parcial";
  } else {
    data.analysis_mode = "manual_assistido";
  }

  return data;
}

function validateAndHealAnalysis(data: any): any {
  if (!data) return data;
  
  if (!data.trabalhador) data.trabalhador = { nome: null, tipo: null };
  if (!data.empresa) data.empresa = { nome: null, cnpj: null };
  if (!data.competencia) data.competencia = { mes: null, ano: null, data_credito: null, tipo_processamento: "Mensal" };
  if (!data.valores) data.valores = {
    salario_bruto: null,
    salario_liquido: null,
    total_descontos: null,
    total_proventos: null,
    total_adicionais: null,
    inss: null,
    fgts: null,
    horas_extras_valor: null,
    adicional_noturno_valor: null,
    bonus: null,
    dsr_valor: null,
    ferias_valor: null,
    terco_ferias_valor: null,
    decimo_terceiro_valor: null,
    vale_transporte_valor: null,
    seguro_vida_valor: null,
    saldo_devedor_valor: null,
    adiantamento_valor: null,
    provento_horas_trabalhadas: null,
    bruto_total_folha: null
  };
  if (data.valores.provento_horas_trabalhadas === undefined) data.valores.provento_horas_trabalhadas = null;
  if (data.valores.bruto_total_folha === undefined) data.valores.bruto_total_folha = null;
  if (!data.trabalho) data.trabalho = {
    dias_trabalhados: null,
    horas_trabalhadas: null,
    horas_extras: null,
    horas_noturnas: null,
    horas_dsr_intermitente: null,
    media_por_dia: null,
    media_por_hora: null
  };
  if (!data.itens) data.itens = [];
  if (!data.alertas) data.alertas = [];
  if (!data.campos_ausentes) data.campos_ausentes = [];

  const valKeys = [
    'salario_bruto', 'salario_liquido', 'total_descontos', 'total_proventos', 'total_adicionais', 
    'inss', 'fgts', 'horas_extras_valor', 'adicional_noturno_valor', 'bonus',
    'dsr_valor', 'ferias_valor', 'terco_ferias_valor', 
    'decimo_terceiro_valor', 'vale_transporte_valor', 'seguro_vida_valor', 
    'saldo_devedor_valor', 'adiantamento_valor', 'provento_horas_trabalhadas', 'bruto_total_folha'
  ];
  valKeys.forEach(k => {
    if (data.valores[k] !== undefined && data.valores[k] !== null) {
      data.valores[k] = parseBrazilianNumber(data.valores[k]);
    } else {
      data.valores[k] = null;
    }
  });

  const trabKeys = [
    'dias_trabalhados', 'horas_trabalhadas', 'horas_extras', 
    'horas_noturnas', 'horas_dsr_intermitente', 'media_por_dia', 'media_por_hora'
  ];
  trabKeys.forEach(k => {
    if (data.trabalho[k] !== undefined && data.trabalho[k] !== null) {
      data.trabalho[k] = parseBrazilianNumber(data.trabalho[k]);
    } else {
      data.trabalho[k] = null;
    }
  });

  data.itens = data.itens.map((it: any) => {
    return {
      nome: it?.nome ? String(it.nome).trim() : "",
      tipo: it?.tipo ? String(it.tipo).trim().toLowerCase() : "provento",
      valor: parseBrazilianNumber(it?.valor) || 0,
      referencia: it?.referencia ? String(it.referencia).trim() : null
    };
  });

  let extraProventosSum = 0;
  let extraDescontosSum = 0;

  data.itens.forEach((it: any) => {
    const name = it.nome.toLowerCase();
    const isDesconto = it.tipo === 'desconto';
    const isProvento = it.tipo === 'provento';
    
    let refNum: number | null = null;
    if (it.referencia) {
      const cleanRef = String(it.referencia).replace(':', ',');
      const match = cleanRef.match(/([\d.,]+)/);
      if (match) {
        refNum = parseBrazilianNumber(match[1]);
      }
    }

    if (isProvento) extraProventosSum += it.valor;
    if (isDesconto) extraDescontosSum += it.valor;

    if (name.includes('dsr') || name.includes('d.s.r') || name.includes('descanso semanal') || name.includes('rsd') || name.includes('r.s.d.')) {
      if (data.valores.dsr_valor === null) {
        data.valores.dsr_valor = it.valor;
      }
      if (data.trabalho.horas_dsr_intermitente === null && refNum !== null) {
        data.trabalho.horas_dsr_intermitente = refNum;
      }
    }

    if (name.includes('adicional noturno') || name.includes('adic. noturno') || name.includes('adic.noturno') || name.includes('noturno')) {
      if (data.valores.adicional_noturno_valor === null) {
        data.valores.adicional_noturno_valor = it.valor;
      }
      if (data.trabalho.horas_noturnas === null && refNum !== null) {
        data.trabalho.horas_noturnas = refNum;
      }
    }

    if (name.includes('liquido') || name.includes('liq.') || name.includes('líquido')) {
      if (data.valores.salario_liquido === null) {
        data.valores.salario_liquido = it.valor;
      }
    }

    if (name.includes('total de proventos') || name.includes('total proventos') || (name.includes('total') && isProvento && name.includes('provento'))) {
      if (data.valores.total_proventos === null) {
        data.valores.total_proventos = it.valor;
      }
    }
    if (name.includes('total de descontos') || name.includes('total descontos') || (name.includes('total') && isDesconto && name.includes('desconto'))) {
      if (data.valores.total_descontos === null) {
        data.valores.total_descontos = it.valor;
      }
    }

    if (isDesconto && (name.includes('inss') || name.includes('previdencia social')) && data.valores.inss === null) {
      data.valores.inss = it.valor;
    }
    if (name.includes('fgts') && data.valores.fgts === null) {
      data.valores.fgts = it.valor;
    }
    if (isDesconto && (name.includes('vale transporte') || name.includes('desc. vt') || name.includes('vt ')) && data.valores.vale_transporte_valor === null) {
      data.valores.vale_transporte_valor = it.valor;
    }
    if (isProvento && (name.includes('hora extra') || name.includes('horas extras') || name.includes('h.extra') || name.includes('h. extras'))) {
      if (data.trabalho.horas_extras === null && refNum !== null) {
        data.trabalho.horas_extras = refNum;
      }
      if (data.valores.horas_extras_valor === null) {
        data.valores.horas_extras_valor = it.valor;
      }
    }
    if (isProvento && (name.includes('salario base') || name.includes('salario contratual') || name.includes('vencimento') || name.includes('horas normais')) && data.valores.salario_bruto === null) {
      data.valores.salario_bruto = it.valor;
      if (data.trabalho.horas_trabalhadas === null && refNum !== null && refNum > 40) {
        data.trabalho.horas_trabalhadas = refNum;
      }
    }
    if (isProvento && (
      name === "horas trabalhadas" ||
      name === "horas trabalhadas - interm" ||
      name === "horas trabalhadas - interm." ||
      name === "horas trabalhadas - intermitente" ||
      name.includes("horas trab")
    )) {
      if (data.valores.provento_horas_trabalhadas === null) {
        data.valores.provento_horas_trabalhadas = it.valor;
      }
    }
    if (name.includes("totais") || name === "totais" || name.includes("total de proventos") || name.includes("total proventos") || (name.includes("total") && isProvento && name.includes("provento"))) {
      if (data.valores.bruto_total_folha === null) {
        data.valores.bruto_total_folha = it.valor;
      }
    }
  });

  if (data.valores.total_proventos === null || data.valores.total_proventos === 0) {
    data.valores.total_proventos = Number(extraProventosSum.toFixed(2));
  }
  if (data.valores.bruto_total_folha === null || data.valores.bruto_total_folha === 0) {
    data.valores.bruto_total_folha = data.valores.total_proventos;
  }
  if (data.valores.total_descontos === null || data.valores.total_descontos === 0) {
    data.valores.total_descontos = Number(extraDescontosSum.toFixed(2));
  }

  if (data.valores.salario_bruto === null || data.valores.salario_bruto === 0) {
    const baseProvento = data.itens.find((it: any) => 
      it.tipo === 'provento' && 
      (it.nome.toLowerCase().includes('salario') || it.nome.toLowerCase().includes('vencimento') || it.nome.toLowerCase().includes('base'))
    );
    data.valores.salario_bruto = baseProvento ? baseProvento.valor : Number(extraProventosSum.toFixed(2));
  }

  if (data.valores.salario_liquido === null || data.valores.salario_liquido === 0) {
    const computedLiquido = Number((data.valores.total_proventos - data.valores.total_descontos).toFixed(2));
    data.valores.salario_liquido = computedLiquido > 0 ? computedLiquido : null;
  }

  if (data.valores.total_adicionais === null || data.valores.total_adicionais === 0) {
    const adsSum = data.itens
      .filter((it: any) => it.tipo === 'provento' && !it.nome.toLowerCase().includes('salario base') && !it.nome.toLowerCase().includes('vencimento') && !it.nome.toLowerCase().includes('salário base'))
      .reduce((sum: number, it: any) => sum + it.valor, 0);
    data.valores.total_adicionais = Number(adsSum.toFixed(2));
  }

  if (data.trabalho.media_por_dia === null && data.valores.salario_liquido && data.trabalho.dias_trabalhados) {
    data.trabalho.media_por_dia = Number((data.valores.salario_liquido / data.trabalho.dias_trabalhados).toFixed(2));
  }
  if (data.trabalho.media_por_hora === null && data.valores.salario_liquido && data.trabalho.horas_trabalhadas) {
    data.trabalho.media_por_hora = Number((data.valores.salario_liquido / data.trabalho.horas_trabalhadas).toFixed(2));
  }

  computeAnalysisModeAndConfidence(data);

  console.log(`[Contracheque AI Server] [LOG EXTRAÇÃO] Sucesso: ${data.campos_extraidos.join(', ')}`);
  console.log(`[Contracheque AI Server] [LOG EXTRAÇÃO] Ausentes: ${data.campos_ausentes.join(', ')}`);

  return data;
}

function healAndValidatePaycheck(data: any): any {
  return validateAndHealAnalysis(data);
}

function getFallbackPayload(fileName: string): any {
  const comp = parseFilenameCompetencia(fileName);
  return {
    trabalhador: {
      nome: null,
      tipo: null
    },
    empresa: {
      nome: null,
      cnpj: null
    },
    competencia: {
      mes: comp.mes,
      ano: comp.ano,
      data_credito: null,
      tipo_processamento: "Mensal"
    },
    valores: {
      salario_bruto: null,
      salario_liquido: null,
      total_descontos: null,
      total_proventos: null,
      total_adicionais: null,
      inss: null,
      fgts: null,
      horas_extras_valor: null,
      adicional_noturno_valor: null,
      bonus: null,
      dsr_valor: null,
      ferias_valor: null,
      terco_ferias_valor: null,
      decimo_terceiro_valor: null,
      vale_transporte_valor: null,
      seguro_vida_valor: null,
      saldo_devedor_valor: null,
      adiantamento_valor: null,
      provento_horas_trabalhadas: null,
      bruto_total_folha: null
    },
    trabalho: {
      dias_trabalhados: null,
      horas_trabalhadas: null,
      horas_extras: null,
      horas_noturnas: null,
      horas_dsr_intermitente: null,
      media_por_dia: null,
      media_por_hora: null
    },
    itens: [],
    alertas: [
      {
        tipo: "info",
        mensagem: "A IA está temporariamente indisponível para leitura automática. Você pode preencher os dados manualmente e continuar a análise."
      }
    ],
    resumo_ia: "A IA está temporariamente indisponível para leitura automática. Você pode preencher os dados manualmente e continuar a análise.",
    analysis_mode: "manual_assistido",
    extraction_confidence: 0,
    campos_extraidos: [],
    campos_ausentes: ["dados_do_contracheque"],
    validacao_multipla: {
      status: "ok",
      motivo: "A IA está temporariamente indisponível para leitura automática. Você pode preencher os dados manualmente e continuar a análise.",
      mesma_competencia: true,
      mesma_empresa: true,
      mesmo_trabalhador: true,
      documentos_relacionados: true,
      deve_consolidar: true,
      tipo_consolidacao: "unica"
    }
  };
}

function normalizeItemName(name: string): string {
  if (!name) return "";
  let norm = name.toLowerCase();
  norm = norm.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  norm = norm.replace(/\[\d+\]/g, "");
  norm = norm.replace(/\(\d+\)/g, "");
  norm = norm.replace(/\b\d+\b/g, "");
  norm = norm.replace(/[-_.:/()\[\]]/g, " ");

  let words = norm.split(/\s+/).filter(Boolean);
  words = words.map(word => {
    if (word === "adto" || word === "adiant" || word.startsWith("adianta")) return "adiantamento";
    if (word === "desc" || word === "desconto" || word === "descontos") return "desconto";
    if (word === "sal" || word === "salario") return "salario";
    if (word === "ref" || word === "referencia") return "referencia";
    if (word === "intermit" || word.startsWith("intermite")) return "intermitente";
    if (word === "liq" || word === "liquido") return "liquido";
    if (word === "comp" || word === "complem" || word.startsWith("complemen")) return "complementar";
    if (word.startsWith("alimenta")) return "alimentacao";
    if (word.startsWith("refeic")) return "refeicao";
    if (word === "transp" || word.startsWith("transport")) return "transporte";
    if (word.startsWith("previd")) return "previdencia";
    return word;
  });

  return words.join(" ").trim();
}

function areItemsDuplicate(item1: any, item2: any): boolean {
  if (item1.tipo !== item2.tipo) return false;

  const norm1 = normalizeItemName(item1.nome);
  const norm2 = normalizeItemName(item2.nome);

  const namesSimilar = norm1 === norm2 ||
                       (norm1.length > 3 && norm2.length > 3 && (norm1.includes(norm2) || norm2.includes(norm1)));

  if (!namesSimilar) return false;

  const valDiff = Math.abs(item1.valor - item2.valor);
  const valClose = valDiff < 10 || (Math.min(item1.valor, item2.valor) > 0 && valDiff / Math.min(item1.valor, item2.valor) < 0.1);

  return valClose;
}

function deduplicatePaycheckItems(items: any[], isComp: boolean = false): any[] {
  const result: any[] = [];
  items.forEach(item => {
    const dupeIdx = result.findIndex(existing => areItemsDuplicate(existing, item));
    if (dupeIdx !== -1) {
      const existing = result[dupeIdx];
      if (isComp) {
        existing.valor = Number((existing.valor + item.valor).toFixed(2));
        if (item.nome.length > existing.nome.length && !item.nome.includes("...")) {
          existing.nome = item.nome;
        }
      } else {
        if (item.nome.length > existing.nome.length && !item.nome.includes("...")) {
          existing.nome = item.nome;
        }
        if (!existing.referencia && item.referencia) {
          existing.referencia = item.referencia;
        }
      }
    } else {
      result.push({ ...item });
    }
  });
  return result;
}

// REST route for Analysis
app.post('/api/analisar-contracheque', async (req, res) => {
  const { fileData, fileName, mimeType, files } = req.body;
  const incomingFiles = files || [];

  if (incomingFiles.length === 0 && fileData) {
    incomingFiles.push({
      fileData,
      name: fileName,
      mimeType,
      simulated: fileData === "simulated-test-data"
    });
  }

  if (incomingFiles.length === 0) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  console.log(`[Contracheque AI Server] Recebida requisição de análise para ${incomingFiles.length} arquivos.`);

  const analyzedResults = [];

  const aiSchema = {
    type: Type.OBJECT,
    properties: {
      trabalhador: {
        type: Type.OBJECT,
        properties: {
          nome: { type: Type.STRING, description: "Nome do trabalhador" },
          tipo: { type: Type.STRING, description: "mensalista ou intermitente" }
        }
      },
      empresa: {
        type: Type.OBJECT,
        properties: {
          nome: { type: Type.STRING },
          cnpj: { type: Type.STRING }
        }
      },
      competencia: {
        type: Type.OBJECT,
        properties: {
          mes: { type: Type.STRING, description: "Mês por extenso, ej: Outubro" },
          ano: { type: Type.STRING },
          data_credito: { type: Type.STRING, description: "Data de crédito ou pagamento no formato DD/MM/AAAA se estiver visível" },
          tipo_processamento: { type: Type.STRING, description: "Tipo de processamento, ex: Mensal, Adiantamento, Férias, 13º Salário" }
        }
      },
      valores: {
        type: Type.OBJECT,
        properties: {
          salario_bruto: { type: Type.NUMBER },
          salario_liquido: { type: Type.NUMBER },
          total_descontos: { type: Type.NUMBER },
          total_adicionais: { type: Type.NUMBER },
          inss: { type: Type.NUMBER },
          fgts: { type: Type.NUMBER },
          horas_extras_valor: { type: Type.NUMBER },
          adicional_noturno_valor: { type: Type.NUMBER },
          bonus: { type: Type.NUMBER },
          total_proventos: { type: Type.NUMBER, description: "Cálculo ou soma total de todos os proventos/valores positivos" },
          dsr_valor: { type: Type.NUMBER, description: "Valor recebido referente a Descanso Semanal Remunerado (DSR)" },
          ferias_valor: { type: Type.NUMBER, description: "Valor de pagamento de férias" },
          terco_ferias_valor: { type: Type.NUMBER, description: "Valor adicional de 1/3 de férias" },
          decimo_terceiro_valor: { type: Type.NUMBER, description: "Valor recebido referente a 13º salário" },
          vale_transporte_valor: { type: Type.NUMBER, description: "Valor descontado referente a vale transporte" },
          seguro_vida_valor: { type: Type.NUMBER, description: "Valor descontado referente a seguro de vida" },
          saldo_devedor_valor: { type: Type.NUMBER, description: "Valor descontado de saldo devedor ou insuficiência de saldo anterior" },
          adiantamento_valor: { type: Type.NUMBER, description: "Valor de desconto de adiantamento salarial" },
          provento_horas_trabalhadas: { type: Type.NUMBER, description: "Valor total do provento referente apenas às horas normais trabalhadas" },
          bruto_total_folha: { type: Type.NUMBER, description: "Bruto total da folha antes de descontos. Geralmente vem da linha de totais de proventos" }
        }
      },
      trabalho: {
        type: Type.OBJECT,
        properties: {
          dias_trabalhados: { type: Type.NUMBER },
          horas_trabalhadas: { type: Type.NUMBER },
          horas_extras: { type: Type.NUMBER },
          horas_noturnas: { type: Type.NUMBER },
          horas_dsr_intermitente: { type: Type.NUMBER },
          media_por_dia: { type: Type.NUMBER },
          media_por_hora: { type: Type.NUMBER }
        }
      },
      itens: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            nome: { type: Type.STRING },
            tipo: { type: Type.STRING, description: "provento ou desconto" },
            valor: { type: Type.NUMBER },
            referencia: { type: Type.STRING }
          }
        }
      },
      alertas: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            tipo: { type: Type.STRING, description: "atenção, info, perigo" },
            mensagem: { type: Type.STRING }
          }
        }
      },
      resumo_ia: { type: Type.STRING },
      campos_ausentes: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Lista de campos ausentes identificados (ex: 'trabalhador.nome', 'trabalho.dias_trabalhados', etc.)"
      },
      validacao_multipla: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING },
          motivo: { type: Type.STRING },
          mesma_competencia: { type: Type.BOOLEAN },
          mesma_empresa: { type: Type.BOOLEAN },
          mesmo_trabalhador: { type: Type.BOOLEAN },
          documentos_relacionados: { type: Type.BOOLEAN },
          deve_consolidar: { type: Type.BOOLEAN },
          tipo_consolidacao: { type: Type.STRING }
        },
        required: ["status", "motivo", "mesma_competencia", "mesma_empresa", "mesmo_trabalhador", "documentos_relacionados", "deve_consolidar", "tipo_consolidacao"]
      }
    },
    required: ["trabalhador", "empresa", "competencia", "valores", "trabalho", "itens", "alertas", "resumo_ia"]
  };

  const modelPrompt = `Analise este arquivo de contracheque (pode ser imagem ou PDF) e extraia todas as informações financeiras reais contidas nele.
Retorne um objeto JSON estritamente compatível com o seguinte de acordo com o padrão CLT brasileiro:
- trabalhador (nome - nome completo real, tipo - 'mensalista' ou 'intermitente'. Deixe null se não identificado, NÃO invente!)
- empresa (nome - razão social ou fantasia real, cnpj - cnpj real. Deixe null se não identificado)
- competencia (mes - em extenso em português ex: 'Outubro', ano, data_credito - formato DD/MM/AAAA se visível, tipo_processamento - ex: 'Mensal Folha', 'Adiantamento', 'Férias', '13º Salário')
- valores:
  * salario_bruto (salário base/salário do contrato ou provento principal do cargo)
  * salario_liquido (salário líquido final, o valor que o funcionário efetivamente recebe em conta - geralmente escrito como 'Líquido' ou 'Valor Líquido')
  * total_proventos (a soma total dos proventos/ganhos positivos antes de deduções)
  * total_descontos (a soma total de todos os descontos aplicados)
  * total_adicionais (soma dos proventos além do salário bruto comum - ex: bônus, adicionais, horas extras)
  * inss (valor deduzido ou recolhido para INSS)
  * fgts (valor de base ou depósito calculado de FGTS)
  * horas_extras_valor (valor total recebido pelas horas extras executadas)
  * adicional_noturno_valor (valor recebido referente ao adicional noturno)
  * bonus (valor recebido como bônus ou gratificações de performance)
  * dsr_valor (valor recebido referente a Descanso Semanal Remunerado / DSR)
  * ferias_valor (valor referente a pagamento de férias)
  * terco_ferias_valor (valor de 1/3 extra de férias)
  * decimo_terceiro_valor (provento referente a 13º salário)
  * vale_transporte_valor (valor descontado pelo vale transporte)
  * seguro_vida_valor (valor descontado pelo seguro de vida de grupo)
  * saldo_devedor_valor (desconto de saldo devedor ou insuficiência de saldo anterior)
  * adiantamento_valor (valor descontado a título de adiantamento de salário anterior)
- trabalho:
  * dias_trabalhados (quantidade de dias trabalhados no mês, somente se especificado explicitamente, ex: 'DIAS: 30' ou 'DIAS: 22'. Se não indicado explicitamente, retorne null)
  * horas_trabalhadas (quantidade total de horas normais trabalhadas. Ex: se no recibo tiver 'Horas Trabalhadas' com referência ex: '160,00' ou '83,50', extraia essa quantidade como horas_trabalhadas)
  * horas_extras (quantidade de horas extras. Ex: se disser 'Horas Extras 50%' com referência '10,00', extraia 10.0)
  * horas_noturnas (quantidade de horas noturnas realizadas com adicional. Ex: se disser 'Adicional Noturno 20%' com referência '22,50', extraia 22.50)
  * horas_dsr_intermitente (quantidade de horas referentes a DSR, comumente demonstrado em contratos de intermitente como 'Horas D.S.R' com uma referência ex: '6,00')
  * media_por_dia (liquido dividido por dias_trabalhados se ambos estiverem disponíveis)
  * media_por_hora (liquido dividido por horas_trabalhadas se ambos estiverem disponíveis)
- itens (lista minuciosa de cada linha/rubrica de lançamento descrita no corpo principal do contracheque: { nome, tipo ('provento' ou 'desconto'), valor, referencia })
- alertas (lista de objetos { tipo ('atenção', 'info', 'perigo'), mensagem } alertando sobre descontos acentuados, imposto de renda, ou comparações)
- resumo_ia (uma explicação personalizada e extremamente humana para o trabalhador entender seus créditos e débitos)
- campos_ausentes (uma lista de strings indicando os campos que realmente não foram identificados visivelmente no documento)
- validacao_multipla (objeto de controle com status='ok', motivo='Apenas um holerite', mesma_competencia=true, mesma_empresa=true, mesmo_trabalhador=true, documentos_relacionados=true, deve_consolidar=true, tipo_consolidacao='unica')

REGRAS CRÍTICAS DE EXTRAÇÃO:
1. Extraia tudo exatamente conforme escrito no contracheque. NÃO invente dias trabalhados (mantenha null se não encontrar), NÃO invente horas trabalhadas (mantenha null se não encontrar), NÃO invente nomes de trabalhadores ou empresas. NÃO use valores padrão (como 22 dias ou 176 horas) se não estiverem presentes de forma textual.
2. Identifique os itens de proventos e descontos detalhadamente no vetor "itens".
3. Mantenha os valores coerentes com os valores de Totais do contracheque.`;

  for (const file of incomingFiles) {
    if (!file.fileData) continue;

    if (file.simulated) {
      if (IS_DEVELOPMENT_SIMULATION && process.env.NODE_ENV !== "production") {
        console.log(`[Contracheque AI Server] Processando arquivo simulado para Dev/Teste: ${file.name}`);
        const mockResult = getMockPayload(file.name, file.mimeType);
        mockResult.validacao_multipla = {
          status: "ok",
          motivo: "Apenas um arquivo processado.",
          mesma_competencia: true,
          mesma_empresa: true,
          mesmo_trabalhador: true,
          documentos_relacionados: true,
          deve_consolidar: true,
          tipo_consolidacao: "unica"
        };
        analyzedResults.push(healAndValidatePaycheck(mockResult));
      } else {
        console.log(`[Contracheque AI Server] Arquivo simulado em ambiente de produção. Retornando template limpo sem fakes.`);
        const fallbackObj = getFallbackPayload(file.name);
        fallbackObj.id = `pc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        analyzedResults.push(healAndValidatePaycheck(fallbackObj));
      }
    } else {
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        console.warn(`[Contracheque AI Server] Sem chave API configurada para analisar arquivo real: ${file.name}. Ativando fallback assistido.`);
        const fallbackObj = getFallbackPayload(file.name);
        fallbackObj.id = `pc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        analyzedResults.push(healAndValidatePaycheck(fallbackObj));
        continue;
      }

      let lastError: any = null;
      let success = false;
      let response: any = null;
      const GEMINI_MODELS = [
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash"
      ];
      const maxRetries = 3;
      let modelIndex = 0;
      let attempt = 1;

      while (attempt <= maxRetries) {
        let selectedModel = GEMINI_MODELS[modelIndex];
        try {
          console.log(`[Contracheque AI Server] Enviando ${file.name} ao Gemini API usando ${selectedModel} (Tentativa ${attempt}/${maxRetries})...`);
          
          let rawBase64 = file.fileData;
          if (file.fileData.includes('base64,')) {
            rawBase64 = file.fileData.split('base64,')[1];
          }

          const ai = new GoogleGenAI({
            apiKey: apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          });

          const parsedMime = file.mimeType || "image/png";

          response = await ai.models.generateContent({
            model: selectedModel,
            contents: [
              {
                inlineData: {
                  mimeType: parsedMime,
                  data: rawBase64
                }
              },
              modelPrompt
            ],
            config: {
              responseMimeType: "application/json",
              responseSchema: aiSchema
            }
          });

          success = true;
          break; // Success! Exit the retry loop.
        } catch (err: any) {
          lastError = err;
          
          const errStr = (err?.message || "") + " " + (err?.status || "") + " " + JSON.stringify(err);
          const errorMsg = errStr.toLowerCase();
          
          // Check for 404 Model Not Found
          const is404 = err?.status === 404 || err?.statusCode === 404 || errorMsg.includes("not found") || errorMsg.includes("404");
          
          if (is404) {
            console.warn(`[Contracheque AI Server] Modelo ${selectedModel} indisponível/não encontrado (404).`);
            modelIndex = (modelIndex + 1) % GEMINI_MODELS.length;
            attempt++;
            continue;
          }

          const isTransient = 
            err?.status === 503 || 
            err?.status === 429 ||
            err?.statusCode === 503 ||
            err?.statusCode === 429 ||
            errorMsg.includes("503") || 
            errorMsg.includes("429") || 
            errorMsg.includes("unavailable") || 
            errorMsg.includes("overloaded") || 
            errorMsg.includes("high demand") || 
            errorMsg.includes("rate limit") || 
            errorMsg.includes("exhausted");

          if (isTransient) {
            console.warn(`[Contracheque AI Server] Tentativa ${attempt} falhou para ${file.name} com o modelo ${selectedModel} devido a erro temporário (503/429).`);
          } else {
            console.warn(`[Contracheque AI Server] Tentativa ${attempt} falhou para ${file.name} com o modelo ${selectedModel}. Erro: ${err.message || err}`);
          }

          if (attempt < maxRetries) {
            const delays = [3000, 6000, 10000];
            const waitTimeMs = delays[attempt - 1] || 10000;
            
            console.log(`[Contracheque AI Server] Aguardando ${waitTimeMs / 1000}s antes de tentar próximo modelo...`);
            await new Promise(resolve => setTimeout(resolve, waitTimeMs));
            
            modelIndex = (modelIndex + 1) % GEMINI_MODELS.length;
            attempt++;
          } else {
            break;
          }
        }
      }

      if (success && response) {
        try {
          const parsedStr = response.text?.trim() || "";
          const resultObj = JSON.parse(parsedStr);
          resultObj.id = `pc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          if (!resultObj.validacao_multipla) {
            resultObj.validacao_multipla = {
              status: "ok",
              motivo: "Arquivo processado individualmente.",
              mesma_competencia: true,
              mesma_empresa: true,
              mesmo_trabalhador: true,
              documentos_relacionados: true,
              deve_consolidar: true,
              tipo_consolidacao: "unica"
            };
          }
          // Highlight extracted fields vs missing ones, heal values
          const healedObj = healAndValidatePaycheck(resultObj);
          
          console.log(`[Contracheque AI Server] Status Final: Sucesso (Extraído por IA)`);
          console.log(`[Contracheque AI Server] Modelo Usado: ${GEMINI_MODELS[modelIndex]}`);
          console.log(`[Contracheque AI Server] Tentativas Utilizadas: ${attempt}`);
          console.log(`[Contracheque AI Server] Modo Análise (analysis_mode): ${healedObj.analysis_mode}`);
          console.log(`[Contracheque AI Server] Campos Extraídos: ${JSON.stringify(healedObj.campos_extraidos)}`);
          console.log(`[Contracheque AI Server] Campos Ausentes: ${JSON.stringify(healedObj.campos_ausentes)}`);

          analyzedResults.push(healedObj);
        } catch (parseErr: any) {
          console.warn(`[Contracheque AI Server] Erro ao tratar parse de JSON retornado pelo Gemini para ${file.name}: ${parseErr.message || parseErr}`);
          console.log(`[Contracheque AI Server] Ativando preenchimento manual assistido em função de erro de parse.`);
          const fallbackObj = getFallbackPayload(file.name);
          fallbackObj.id = `pc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const healedObj = healAndValidatePaycheck(fallbackObj);
          
          console.log(`[Contracheque AI Server] Status Final: Falha (Parsing Error, Ativando Manual)`);
          console.log(`[Contracheque AI Server] Modelo Usado: ${GEMINI_MODELS[modelIndex]}`);
          console.log(`[Contracheque AI Server] Tentativas Utilizadas: ${attempt}`);
          console.log(`[Contracheque AI Server] Modo Análise (analysis_mode): ${healedObj.analysis_mode}`);
          console.log(`[Contracheque AI Server] Campos Extraídos: ${JSON.stringify(healedObj.campos_extraidos)}`);
          console.log(`[Contracheque AI Server] Campos Ausentes: ${JSON.stringify(healedObj.campos_ausentes)}`);

          analyzedResults.push(healedObj);
        }
      } else {
        const err = lastError || new Error("Unknown Gemini API error");
        console.warn(`[Contracheque AI Server] Erro persistente ou esgotamento de tentativas para ${file.name}: ${err.message || err}`);
        console.log(`[Contracheque AI Server] Ativando preenchimento manual assistido em função de erro persistente do Gemini.`);
        const fallbackObj = getFallbackPayload(file.name);
        fallbackObj.id = `pc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const healedObj = healAndValidatePaycheck(fallbackObj);

        console.log(`[Contracheque AI Server] Status Final: Falha Permanente (Modelos Esgotados, Ativando Manual)`);
        console.log(`[Contracheque AI Server] Último Modelo Usado: ${GEMINI_MODELS[modelIndex]}`);
        console.log(`[Contracheque AI Server] Tentativas Utilizadas: ${attempt}`);
        console.log(`[Contracheque AI Server] Modo Análise (analysis_mode): ${healedObj.analysis_mode}`);
        console.log(`[Contracheque AI Server] Campos Extraídos: ${JSON.stringify(healedObj.campos_extraidos)}`);
        console.log(`[Contracheque AI Server] Campos Ausentes: ${JSON.stringify(healedObj.campos_ausentes)}`);

        analyzedResults.push(healedObj);
      }
    }
  }

  // Ensure every payload has a valid ID and has been validated/healed
  analyzedResults.forEach((resItem, index) => {
    if (!resItem.id) {
      resItem.id = `pc-${Date.now()}-${index}`;
    }
  });

  // Perform rigid multi-file validation
  if (analyzedResults.length <= 1) {
    const singleResult = analyzedResults[0];
    return res.json({
      validacao_multipla: singleResult?.validacao_multipla || {
        status: "ok",
        motivo: "Apenas um arquivo processado.",
        mesma_competencia: true,
        mesma_empresa: true,
        mesmo_trabalhador: true,
        documentos_relacionados: true,
        deve_consolidar: true,
        tipo_consolidacao: "unica"
      },
      result: singleResult,
      results: analyzedResults
    });
  }

  const first = analyzedResults[0];

  // 1. Compare Competency (Month and Year)
  const competenciaMesFirst = String(first.competencia?.mes || "").toLowerCase().trim();
  const competenciaAnoFirst = String(first.competencia?.ano || "").toLowerCase().trim();
  const sameCompetencia = analyzedResults.every(r => 
    String(r.competencia?.mes || "").toLowerCase().trim() === competenciaMesFirst &&
    String(r.competencia?.ano || "").toLowerCase().trim() === competenciaAnoFirst
  );

  if (!sameCompetencia) {
    console.log(`[Contracheque AI Server] Validação falhou: Meses diferentes detetados.`);
    return res.json({
      validacao_multipla: {
        status: "erro",
        motivo: "Os holerites enviados pertencem a meses diferentes. Envie apenas holerites da mesma competência para gerar uma análise consolidada.",
        mesma_competencia: false,
        mesma_empresa: true,
        mesmo_trabalhador: true,
        documentos_relacionados: false,
        deve_consolidar: false,
        tipo_consolidacao: "nao_consolidar"
      },
      results: analyzedResults
    });
  }

  // 2. Compare Empresa (CNPJ or Name)
  const sameEmpresa = analyzedResults.every(r => {
    const cnpj1 = String(first.empresa?.cnpj || "").replace(/\D/g, "");
    const cnpj2 = String(r.empresa?.cnpj || "").replace(/\D/g, "");
    if (cnpj1 && cnpj2 && cnpj1.length >= 8 && cnpj2.length >= 8) {
      return cnpj1 === cnpj2;
    }
    const nome1 = String(first.empresa?.nome || "").toLowerCase().trim();
    const nome2 = String(r.empresa?.nome || "").toLowerCase().trim();
    return nome1 === nome2 || nome1.includes(nome2) || nome2.includes(nome1);
  });

  if (!sameEmpresa) {
    console.log(`[Contracheque AI Server] Validação falhou: Empresas diferentes detetadas.`);
    return res.json({
      validacao_multipla: {
        status: "erro",
        motivo: "Os holerites enviados pertencem a empresas diferentes. Para evitar cálculos incorretos, envie apenas holerites da mesma empresa e do mesmo mês.",
        mesma_competencia: true,
        mesma_empresa: false,
        mesmo_trabalhador: true,
        documentos_relacionados: false,
        deve_consolidar: false,
        tipo_consolidacao: "nao_consolidar"
      },
      results: analyzedResults
    });
  }

  // 3. Compare Trabalhador (Nome)
  const sameTrabalhador = analyzedResults.every(r => {
    const nome1 = String(first.trabalhador?.nome || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const nome2 = String(r.trabalhador?.nome || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    return nome1 === nome2 || nome1.includes(nome2) || nome2.includes(nome1);
  });

  if (!sameTrabalhador) {
    console.log(`[Contracheque AI Server] Validação falhou: Trabalhadores diferentes detetados.`);
    return res.json({
      validacao_multipla: {
        status: "erro",
        motivo: "Os holerites enviados pertencem a trabalhadores diferentes.",
        mesma_competencia: true,
        mesma_empresa: true,
        mesmo_trabalhador: false,
        documentos_relacionados: false,
        deve_consolidar: false,
        tipo_consolidacao: "nao_consolidar"
      },
      results: analyzedResults
    });
  }

  // 4. Detecção de Documentos Relacionados (Caso 1 de Adiantamento Folha) vs Pagamento Complementar (Caso 4)
  let adiantamentoFound = false;
  let matchesAmount = false;
  let exactAdiantamentoValue = 0;

  // Search if any item is "Adiantamento" or "Antecipação" matching corresponding liquid
  analyzedResults.forEach(r => {
    r.itens?.forEach((it: any) => {
      const name = String(it.nome).toLowerCase();
      if ((name.includes("adiantamento") || name.includes("antecipa") || name.includes("folha") || name.includes("via folha")) && it.tipo === "desconto") {
        adiantamentoFound = true;
        exactAdiantamentoValue = it.valor;
      }
    });
  });

  // Calculate if any other payslip's net salary (salario_liquido) matches that discount or if gross/net are highly close
  analyzedResults.forEach((r1, idx1) => {
    analyzedResults.forEach((r2, idx2) => {
      if (idx1 === idx2) return;
      const liq1 = r1.valores?.salario_liquido || 0;
      const gross1 = r1.valores?.salario_bruto || 0;
      const gross2 = r2.valores?.salario_bruto || 0;

      if (exactAdiantamentoValue > 0 && Math.abs(liq1 - exactAdiantamentoValue) < 10) {
        matchesAmount = true;
      }
      if (Math.abs(gross1 - gross2) < 5 && ((r1.valores?.salario_liquido === 0) || (r2.valores?.salario_liquido === 0))) {
        matchesAmount = true;
      }
    });
  });

  if (adiantamentoFound || matchesAmount) {
    console.log(`[Contracheque AI Server] CASO 1: Consolidando Adiantamento + Fechamento.`);
    let mainFechamento = analyzedResults.find(r => 
      r.itens?.some((it: any) => String(it.nome).toLowerCase().includes("adiantamento") && it.tipo === "desconto")
    ) || first;

    const resultObj = JSON.parse(JSON.stringify(mainFechamento));
    resultObj.id = `pc-consolidated-${Date.now()}`;
    
    const nonZeroLiquidDoc = analyzedResults.find(r => (r.valores?.salario_liquido || 0) > 0);
    if (nonZeroLiquidDoc) {
      resultObj.valores.salario_liquido = nonZeroLiquidDoc.valores.salario_liquido;
    }

    resultObj.validacao_multipla = {
      status: "ok",
      motivo: "Holerites de adiantamento e fechamento unificados eletronicamente com sucesso.",
      mesma_competencia: true,
      mesma_empresa: true,
      mesmo_trabalhador: true,
      documentos_relacionados: true,
      deve_consolidar: true,
      tipo_consolidacao: "adiantamento_fechamento"
    };

    let allCombinedItems: any[] = [];
    if (resultObj.itens && Array.isArray(resultObj.itens)) {
      allCombinedItems = [...resultObj.itens];
    }
    analyzedResults.forEach(r => {
      if (r === mainFechamento) return;
      if (r.itens && Array.isArray(r.itens)) {
        allCombinedItems.push(...r.itens);
      }
    });

    // Deduplicate items safely
    resultObj.itens = deduplicatePaycheckItems(allCombinedItems, false);

    // Filter and mark adiantamento so we don't treat it as a new loss (não somar descontos como se fossem nova perda)
    let adiantamentoValuePaid = 0;
    resultObj.itens.forEach((it: any) => {
      const lowerName = String(it.nome).toLowerCase();
      if ((lowerName.includes("adiantamento") || lowerName.includes("antecipa") || lowerName.includes("via folha")) && it.tipo === "desconto") {
        it.ja_recebido = true;
        adiantamentoValuePaid += it.valor;
      }
    });

    // Ensure we do not sum adiantamento into lost values (não somar descontos como se fossem nova perda)
    resultObj.valores.total_descontos = resultObj.itens
      .filter((it: any) => it.tipo === "desconto" && !it.ja_recebido)
      .reduce((sum: number, it: any) => sum + it.valor, 0);

    // Calculate total proventos/adicionais accurately without duplication
    resultObj.valores.total_adicionais = resultObj.itens
      .filter((it: any) => it.tipo === "provento" && !String(it.nome).toLowerCase().includes("salario base"))
      .reduce((sum: number, it: any) => sum + it.valor, 0);

    // Keep the maximum non-zero salary bruto we found to avoid duplication of bruto
    const maxGrossDoc = analyzedResults.reduce((max, r) => (r.valores?.salario_bruto || 0) > (max.valores?.salario_bruto || 0) ? r : max, first);
    resultObj.valores.salario_bruto = maxGrossDoc.valores.salario_bruto;

    resultObj.alertas = resultObj.alertas || [];
    if (!resultObj.alertas.some((a: any) => a.mensagem.includes("adiantamento"))) {
      resultObj.alertas.unshift({
        tipo: "info",
        mensagem: "Consolidação Inteligente: Identificamos holerites de Adiantamento e Fechamento. Os valores foram consolidados de forma correta, impedindo a duplicação indevida de salários."
      });
    }

    resultObj.resumo_ia = `Análise consolidada da competência de ${resultObj.competencia.mes}/${resultObj.competencia.ano} para ${resultObj.trabalhador?.nome || 'Trabalhador'}.\n` +
      `Identificamos que os documentos enviados referem-se ao mesmo período de pagamento (Adiantamento + Fechamento Mensal).\n` +
      `Por isso, os valores não foram duplicados para evitar erros.\n` +
      `Salário Bruto real: R$ ${resultObj.valores.salario_bruto?.toFixed(2) || '0.00'}.\n` +
      `Valor líquido real de fato recebido na conta: R$ ${resultObj.valores.salario_liquido?.toFixed(2) || '0.00'} (já descontado o adiantamento de forma legal).`;

    const finalHealedObj = healAndValidatePaycheck(resultObj);

    return res.json({
      validacao_multipla: finalHealedObj.validacao_multipla,
      result: finalHealedObj,
      results: analyzedResults
    });
  }

  // Check for duplicate identical file uploads
  const isDuplicateFiles = analyzedResults.every(r => 
    Math.abs((r.valores?.salario_bruto || 0) - (first.valores?.salario_bruto || 0)) < 1 &&
    Math.abs((r.valores?.salario_liquido || 0) - (first.valores?.salario_liquido || 0)) < 1
  );

  if (isDuplicateFiles) {
    console.log(`[Contracheque AI Server] Unificando arquivos de holerites idênticos.`);
    const resultObj = JSON.parse(JSON.stringify(first));
    resultObj.id = `pc-consolidated-${Date.now()}`;
    resultObj.validacao_multipla = {
      status: "ok",
      motivo: "Arquivos idênticos de holerite unificados para evitar duplicidade de salário.",
      mesma_competencia: true,
      mesma_empresa: true,
      mesmo_trabalhador: true,
      documentos_relacionados: true,
      deve_consolidar: true,
      tipo_consolidacao: "unica"
    };

    const finalHealedObj = healAndValidatePaycheck(resultObj);

    return res.json({
      validacao_multipla: finalHealedObj.validacao_multipla,
      result: finalHealedObj,
      results: analyzedResults
    });
  }

  // CASO 4: Mesmo mês, mesma empresa, mas valores diferentes. Pedir confirmação.
  console.log(`[Contracheque AI Server] CASO 4: Mesmo mês e mesma empresa, mas valores diferentes. Pedindo confirmação.`);
  return res.json({
    validacao_multipla: {
      status: "confirmacao_necessaria",
      motivo: "Encontramos holerites do mesmo mês e da mesma empresa, mas com valores diferentes. Deseja analisar como pagamento complementar?",
      mesma_competencia: true,
      mesma_empresa: true,
      mesmo_trabalhador: true,
      documentos_relacionados: false,
      deve_consolidar: false,
      tipo_consolidacao: "pagamento_complementar"
    },
    results: analyzedResults
  });
});

// Vite Middleware integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Contracheque AI Server] Executando em http://localhost:${PORT}`);
  });
}

startServer();
