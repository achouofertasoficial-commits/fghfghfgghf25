import { ContrachequeAnalise } from '../types';

// Simple temporary memory fallbacks as INITIAL_ANALYSED_LIST can be used when history is empty
const STORAGE_KEY = 'contracheque_ai_list';

/**
 * Returns a consistent user_id based on email.
 */
export function getUserIdFromEmail(email: string): string {
  const normalized = (email || 'anonymous').trim().toLowerCase();
  return `local-user-${normalized}`;
}

/**
 * Normalizes strings to help with safe, duplicate comparison.
 */
function normalizeString(val: string | null | undefined): string {
  if (!val) return '';
  return val
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Retrieves all analyses from local storage.
 */
function getAllAnalysesSync(): any[] {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (!cached) return [];
  try {
    return JSON.parse(cached);
  } catch (err) {
    console.error('Error parsing analyses from localStorage:', err);
    return [];
  }
}

/**
 * Saves the entire list back to local storage.
 */
function saveAllAnalysesSync(list: any[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/**
 * Safely performs calculations using valid values to prevent falsy/Zero fallbacks or division by zero.
 */
export function calculateSafeMetrics(analysis: any) {
  const salBruto = analysis.valores?.salario_bruto ?? null;
  const salLiq = analysis.valores?.salario_liquido ?? null;
  const totDescontos = analysis.valores?.total_descontos ?? null;
  const totAdicionais = analysis.valores?.total_adicionais ?? null;
  
  const dias = analysis.trabalho?.dias_trabalhados ?? null;
  const horas = analysis.trabalho?.horas_trabalhadas ?? null;
  
  const noturnasValor = analysis.valores?.adicional_noturno_valor ?? null;
  const horasNoturnas = analysis.trabalho?.horas_noturnas ?? null;
  
  const extrasValor = analysis.valores?.horas_extras_valor ?? null;
  const extrasQtd = analysis.trabalho?.horas_extras ?? null;

  // Find DSR Proventos
  const dsrItems = analysis.itens?.filter((item: any) => {
    const name = (item.nome || "").toLowerCase();
    return name.includes("dsr") || name.includes("descanso") || name.includes("r.s.d.") || name.includes("rsd");
  }) || [];
  
  const valor_dsr = dsrItems.reduce((acc: number, item: any) => {
    if (item.tipo === "provento") {
      return acc + (item.valor || 0);
    }
    return acc;
  }, 0);
  
  const horasDsr = analysis.trabalho?.horas_dsr_intermitente ?? null;

  // Calculated metrics
  const ganho_por_dia = (salLiq !== null && dias !== null && dias > 0) ? (salLiq / dias) : null;
  const ganho_por_hora = (salLiq !== null && horas !== null && horas > 0) ? (salLiq / horas) : null;
  const desconto_por_dia = (totDescontos !== null && dias !== null && dias > 0) ? (totDescontos / dias) : null;
  const adicional_por_dia = (totAdicionais !== null && dias !== null && dias > 0) ? (totAdicionais / dias) : null;
  
  const adicional_noturno_por_hora = (noturnasValor !== null && horasNoturnas !== null && horasNoturnas > 0) ? (noturnasValor / horasNoturnas) : null;
  const horas_extras_por_hora = (extrasValor !== null && extrasQtd !== null && extrasQtd > 0) ? (extrasValor / extrasQtd) : null;
  const dsr_por_hora = (valor_dsr > 0 && horasDsr !== null && horasDsr > 0) ? (valor_dsr / horasDsr) : null;

  analysis.metricas_calculadas = {
    ganho_por_dia,
    ganho_por_hora,
    desconto_por_dia,
    adicional_por_dia,
    adicional_noturno_por_hora,
    horas_extras_por_hora,
    dsr_por_hora
  };

  if (!analysis.trabalho) analysis.trabalho = {};
  analysis.trabalho.media_por_dia = ganho_por_dia;
  analysis.trabalho.media_por_hora = ganho_por_hora;

  return analysis;
}

/**
 * Gets a clean, fully-formed list elements schema matched for storage.
 */
function formatAnalysisForStorage(analysis: any, userId?: string): any {
  // Deep clone
  const formatted = JSON.parse(JSON.stringify(analysis));
  
  // Make sure it contains required historical attributes
  formatted.user_id = userId || formatted.user_id || 'local-user-anonymous';
  formatted.created_at = formatted.created_at || formatted.uploadedAt || new Date().toISOString();
  
  // Clean calculations safely
  return calculateSafeMetrics(formatted);
}

// CAMADA DE SERVIÇO - PREPARAÇÃO PARA SUPABASE

export async function saveAnalysis(analysis: any, userId?: string): Promise<any> {
  const formatted = formatAnalysisForStorage(analysis, userId);
  const list = getAllAnalysesSync();
  
  // Push at beginning
  list.unshift(formatted);
  saveAllAnalysesSync(list);
  return formatted;
}

export async function getAnalysesByUser(userId: string): Promise<any[]> {
  const list = getAllAnalysesSync();
  const currentUserId = userId || 'local-user-anonymous';
  
  // Filters by user
  return list.filter((item: any) => item.user_id === currentUserId);
}

export async function updateAnalysis(id: string, updatedPayload: any): Promise<any> {
  const list = getAllAnalysesSync();
  const idx = list.findIndex((item: any) => item.id === id);
  if (idx !== -1) {
    const formatted = formatAnalysisForStorage({ ...list[idx], ...updatedPayload });
    list[idx] = formatted;
    saveAllAnalysesSync(list);
    return formatted;
  }
  throw new Error(`Analysis with id ${id} not found.`);
}

export async function deleteAnalysis(id: string): Promise<boolean> {
  const list = getAllAnalysesSync();
  const filtered = list.filter((item: any) => item.id !== id);
  const changed = filtered.length !== list.length;
  if (changed) {
    saveAllAnalysesSync(filtered);
  }
  return changed;
}

/**
 * Finds if a duplicate already exists in the saved history for the same month, year, company name/cnpj and worker.
 */
export async function findDuplicateAnalysis(analysis: any, userId?: string): Promise<any | null> {
  const currentUserId = userId || analysis.user_id || 'local-user-anonymous';
  const list = await getAnalysesByUser(currentUserId);
  
  const month = normalizeString(analysis.competencia?.mes);
  const year = normalizeString(analysis.competencia?.ano);
  const workerName = normalizeString(analysis.trabalhador?.nome);
  const companyName = normalizeString(analysis.empresa?.nome);
  const companyCnpj = (analysis.empresa?.cnpj || '').replace(/\D/g, '');

  return list.find((item: any) => {
    const itemMonth = normalizeString(item.competencia?.mes);
    const itemYear = normalizeString(item.competencia?.ano);
    const itemWorker = normalizeString(item.trabalhador?.nome);
    const itemCompany = normalizeString(item.empresa?.nome);
    const itemCnpj = (item.empresa?.cnpj || '').replace(/\D/g, '');

    const samePeriod = itemMonth === month && itemYear === year;
    const sameWorker = itemWorker === workerName || itemWorker.includes(workerName) || workerName.includes(itemWorker);
    
    let sameCompany = false;
    if (companyCnpj && itemCnpj) {
      sameCompany = companyCnpj === itemCnpj;
    } else {
      sameCompany = itemCompany === companyName || itemCompany.includes(companyName) || companyName.includes(itemCompany);
    }

    return samePeriod && sameWorker && sameCompany;
  }) || null;
}

/**
 * Compare two monthly analyses and returns the detailed variance breakdown.
 */
export function compareMonthlyAnalyses(analysisA: any, analysisB: any) {
  if (!analysisA || !analysisB) return null;

  const liqA = analysisA.valores?.salario_liquido || 0;
  const liqB = analysisB.valores?.salario_liquido || 0;
  const diffLiq = liqA - liqB;

  const diaA = analysisA.metricas_calculadas?.ganho_por_dia || analysisA.trabalho?.media_por_dia || 0;
  const diaB = analysisB.metricas_calculadas?.ganho_por_dia || analysisB.trabalho?.media_por_dia || 0;
  const diffDia = diaA - diaB;

  const workDaysA = analysisA.trabalho?.dias_trabalhados || 0;
  const workDaysB = analysisB.trabalho?.dias_trabalhados || 0;
  const diffDays = workDaysA - workDaysB;

  const descA = analysisA.valores?.total_descontos || 0;
  const descB = analysisB.valores?.total_descontos || 0;
  const diffDesc = descA - descB;

  const addA = analysisA.valores?.total_adicionais || 0;
  const addB = analysisB.valores?.total_adicionais || 0;
  const diffAdd = addA - addB;

  const matchAStr = `${analysisA.competencia?.mes || ''}/${analysisA.competencia?.ano || ''}`;
  const matchBStr = `${analysisB.competencia?.mes || ''}/${analysisB.competencia?.ano || ''}`;

  // Build variance narrative
  let motivo = '';
  if (Math.abs(diffLiq) < 5) {
    motivo = `Seus holerites de ${matchAStr} e ${matchBStr} são financeiramente equivalentes, sem alterações expressivas.`;
  } else {
    const higherMonth = diffLiq > 0 ? matchAStr : matchBStr;
    const absDiff = Math.abs(diffLiq);
    const absDia = Math.abs(diffDia);

    let parts = [];
    if (Math.abs(diffDesc) > 50) {
      parts.push(diffDesc < 0 ? 'menor desconto descontado' : 'maior desconto total retido');
    }
    if (Math.abs(diffAdd) > 50) {
      parts.push(diffAdd > 0 ? 'maior recebimento de adicionais e proventos extras' : 'menor recebimento de adicionais');
    }
    if (Math.abs(diffDays) > 0) {
      parts.push(diffDays > 0 ? 'maior quantidade de dias úteis trabalhados' : 'menor quantidade de dias úteis trabalhados no período');
    }

    if (parts.length === 0) {
      parts.push('pequenas variações nos impostos retidos na fonte e horas extras associadas');
    }

    motivo = `Em ${higherMonth}, você obteve um rendimento líquido de R$ ${absDiff.toFixed(2)} a mais ${absDia > 0 ? `(ganhando de fato R$ ${absDia.toFixed(2)} extra por dia trabalhado)` : ''}. A principal causa foi: ${parts.join(', ')}.`;
  }

  return {
    diffSalarioLiquido: diffLiq,
    diffGanhoPorDia: diffDia,
    diffDiasTrabalhados: diffDays,
    diffDescontos: diffDesc,
    diffAdicionais: diffAdd,
    
    diffLiq,
    diffDia,
    diffDays,
    diffDesc,
    diffAdd,
    
    motivo
  };
}

/**
 * Removes all analyses from storage for the specified user and sets a history cleared flag.
 */
export function clearAnalysesByUser(userId: string): void {
  const list = getAllAnalysesSync();
  const currentUserId = userId || 'local-user-anonymous';
  const remaining = list.filter((item: any) => item.user_id !== currentUserId);
  saveAllAnalysesSync(remaining);
  localStorage.setItem(`contracheque_ai_history_cleared_${currentUserId}`, "true");
}

/**
 * Checks if the user has explicitly cleared their history.
 */
export function hasUserClearedHistory(userId: string): boolean {
  const currentUserId = userId || 'local-user-anonymous';
  return localStorage.getItem(`contracheque_ai_history_cleared_${currentUserId}`) === "true";
}

/**
 * Returns a unique numeric value representing the chronological competence of an analysis.
 * Format month index from 0 (Janeiro) to 11 (Dezembro).
 * Dezembro/2025 -> 2025 * 12 + 11 = 24311
 * Janeiro/2026 -> 2026 * 12 + 0 = 24312
 */
export function getCompetenceValue(analysis: any): number {
  if (!analysis || !analysis.competencia) return 0;
  const mes = analysis.competencia.mes;
  const ano = Number(analysis.competencia.ano) || 0;
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const idx = meses.indexOf(mes || "");
  const monthNum = idx === -1 ? 0 : idx;
  return ano * 12 + monthNum;
}
