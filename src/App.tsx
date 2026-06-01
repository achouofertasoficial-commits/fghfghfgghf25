import React, { useState, useEffect } from 'react';
import { Screen, User, ContrachequeAnalise, ComplementaryAnalysisData } from './types';
import { INITIAL_ANALYSED_LIST } from './data';
import Navbar from './components/Navbar';
import WelcomeView from './components/WelcomeView';
import DashboardView from './components/DashboardView';
import UploadView from './components/UploadView';
import ComplementAnalysisView from './components/ComplementAnalysisView';
import AnalysisView from './components/AnalysisView';
import CalendarView from './components/CalendarView';
import HistoryView from './components/HistoryView';
import MonthDetailsView from './components/MonthDetailsView';
import SettingsView from './components/SettingsView';
import { 
  getUserIdFromEmail,
  saveAnalysis,
  getAnalysesByUser,
  updateAnalysis,
  deleteAnalysis,
  findDuplicateAnalysis,
  calculateSafeMetrics,
  clearAnalysesByUser,
  hasUserClearedHistory
} from './services/analysisStorage';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  
  // Cache user login details
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('contracheque_ai_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (err) {
        console.error(err);
      }
    }
    return null;
  });
  
  const [analysedList, setAnalysedList] = useState<ContrachequeAnalise[]>([]);
  
  // Duplicate Save Prompt State
  const [showDuplicateSaveDialog, setShowDuplicateSaveDialog] = useState(false);
  const [duplicateConflictItem, setDuplicateConflictItem] = useState<any | null>(null);
  const [pendingAnalysisToSave, setPendingAnalysisToSave] = useState<any | null>(null);

  // Keep ID of month currently focused under "Detalhes do mês" view
  const [selectedMonthId, setSelectedMonthId] = useState<string>("");

  // Store parsed but unconfirmed JSON extraction
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sync list based on active user
  useEffect(() => {
    const loadAnalysesForUser = async () => {
      const email = user?.email || "joao.silva@exemplo.com.br";
      const userId = getUserIdFromEmail(email);
      const list = await getAnalysesByUser(userId);
      
      if (list.length === 0) {
        if (hasUserClearedHistory(userId)) {
          setAnalysedList([]);
          setSelectedMonthId("");
          return;
        }
        // Seed database for this specific user to maintain visual design approval
        const workerNome = user?.nome || "João Silva";
        const seeded = INITIAL_ANALYSED_LIST.map(item => {
          const cloned = JSON.parse(JSON.stringify(item));
          cloned.user_id = userId;
          cloned.trabalhador.nome = workerNome;
          return calculateSafeMetrics(cloned);
        });
        
        for (const item of seeded) {
          await saveAnalysis(item, userId);
        }
        setAnalysedList(seeded);
        if (seeded.length > 0) {
          setSelectedMonthId(seeded[0].id);
        }
      } else {
        setAnalysedList(list);
        if (list.length > 0) {
          setSelectedMonthId(list[0].id);
        }
      }
    };
    loadAnalysesForUser();
  }, [user]);

  // Sync to localstorage current list for backup compatibility
  useEffect(() => {
    localStorage.setItem('contracheque_ai_list', JSON.stringify(analysedList));
    if (analysedList.length > 0 && !selectedMonthId) {
      setSelectedMonthId(analysedList[0].id);
    }
  }, [analysedList]);

  const handleLogin = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    localStorage.setItem('contracheque_ai_user', JSON.stringify(authenticatedUser));
    setCurrentScreen('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('contracheque_ai_user');
    setCurrentScreen('welcome');
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('contracheque_ai_user', JSON.stringify(updatedUser));
  };

  const handleClearAllAnalyses = () => {
    if (!user) return;
    const userId = getUserIdFromEmail(user.email);
    clearAnalysesByUser(userId);
    setAnalysedList([]);
    setSelectedMonthId("");
    setCurrentAnalysis(null);
    setCurrentScreen("dashboard");
  };

  // Callback when AI finishes scanning
  const [pendingResultsToConsolidate, setPendingResultsToConsolidate] = useState<any[] | null>(null);
  const [showCompetencyConflictDialog, setShowCompetencyConflictDialog] = useState(false);
  const [validationErrorMessage, setValidationErrorMessage] = useState<string | null>(null);
  const [showCaso4Confirmation, setShowCaso4Confirmation] = useState<boolean>(false);

  // Checks if results have different competencies
  const checkCompetenciesConflict = (results: any[]) => {
    if (results.length <= 1) return false;
    const firstCompetence = `${results[0].competencia?.mes || ""}-${results[0].competencia?.ano || ""}`.toLowerCase();
    for (const r of results) {
      const comp = `${r.competencia?.mes || ""}-${r.competencia?.ano || ""}`.toLowerCase();
      if (comp !== firstCompetence) {
        return true;
      }
    }
    return false;
  };

  const consolidateResults = (results: any[], isComplementar: boolean = false) => {
    if (results.length === 0) return null;
    if (results.length === 1) return results[0];

    const merged = JSON.parse(JSON.stringify(results[0]));
    merged.id = `pc-consolidated-${Date.now()}`;

    const valFields = [
      'salario_bruto', 'salario_liquido', 'total_descontos', 
      'total_adicionais', 'inss', 'fgts', 'horas_extras_valor', 
      'adicional_noturno_valor', 'bonus'
    ];
    
    const workFields = [
      'dias_trabalhados', 'horas_trabalhadas', 'horas_extras', 
      'horas_noturnas', 'horas_dsr_intermitente'
    ];

    valFields.forEach(f => { merged.valores[f] = 0; });
    workFields.forEach(f => {
      if (merged.trabalho[f] === undefined) {
        merged.trabalho[f] = 0;
      } else {
        merged.trabalho[f] = merged.trabalho[f] || 0;
      }
    });

    merged.itens = [];
    merged.alertas = [];
    const allItems: any[] = [];

    results.forEach((r, rIdx) => {
      valFields.forEach(f => {
        merged.valores[f] += Number(r.valores?.[f] || 0);
      });

      workFields.forEach(f => {
        if (r.trabalho) {
          merged.trabalho[f] += Number(r.trabalho[f] || 0);
        }
      });

      if (r.itens && Array.isArray(r.itens)) {
        allItems.push(...r.itens);
      }

      if (r.alertas && Array.isArray(r.alertas)) {
        r.alertas.forEach((al: any) => {
          if (!merged.alertas.some((existing: any) => existing.mensagem === al.mensagem)) {
            merged.alertas.push(al);
          }
        });
      }
    });

    // Helper functions for name normalization and deduplication
    const normalizeItemName = (name: string): string => {
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
    };

    const areItemsDuplicate = (item1: any, item2: any): boolean => {
      if (item1.tipo !== item2.tipo) return false;

      const norm1 = normalizeItemName(item1.nome);
      const norm2 = normalizeItemName(item2.nome);

      const namesSimilar = norm1 === norm2 ||
                           (norm1.length > 3 && norm2.length > 3 && (norm1.includes(norm2) || norm2.includes(norm1)));

      if (!namesSimilar) return false;

      const valDiff = Math.abs(item1.valor - item2.valor);
      const valClose = valDiff < 10 || (Math.min(item1.valor, item2.valor) > 0 && valDiff / Math.min(item1.valor, item2.valor) < 0.1);

      return valClose;
    };

    const deduplicatePaycheckItems = (items: any[], isComp: boolean): any[] => {
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
    };

    merged.itens = deduplicatePaycheckItems(allItems, isComplementar);

    // If NOT complementary option is confirmed, we can adjust totals to reflect deduplicated sum correctly, and mark adiantamento
    if (!isComplementar) {
      merged.itens.forEach((it: any) => {
        const lowerName = String(it.nome).toLowerCase();
        if ((lowerName.includes("adiantamento") || lowerName.includes("antecipa") || lowerName.includes("via folha")) && it.tipo === "desconto") {
          it.ja_recebido = true;
        }
      });

      merged.valores.total_descontos = merged.itens
        .filter((it: any) => it.tipo === "desconto" && !it.ja_recebido)
        .reduce((sum: number, it: any) => sum + it.valor, 0);

      merged.valores.total_adicionais = merged.itens
        .filter((it: any) => it.tipo === "provento" && !String(it.nome).toLowerCase().includes("salario base"))
        .reduce((sum: number, it: any) => sum + it.valor, 0);

      // Avoid double-counting gross and net
      const maxGross = Math.max(...results.map(r => r.valores?.salario_bruto || 0));
      merged.valores.salario_bruto = maxGross;
      const nonZeroLiquid = results.find(r => (r.valores?.salario_liquido || 0) > 0);
      if (nonZeroLiquid) {
        merged.valores.salario_liquido = nonZeroLiquid.valores.salario_liquido;
      }
    }

    workFields.forEach(f => {
      if (merged.trabalho[f] === 0) {
        merged.trabalho[f] = null;
      }
    });

    merged.resumo_ia = `Esta é a análise consolidada de ${results.length} holerites enviados para a competência de ${merged.competencia.mes}/${merged.competencia.ano}.\n` +
      `Soma totalizada: Salário Bruto de R$ ${merged.valores.salario_bruto.toFixed(2)} e Salário Líquido de R$ ${merged.valores.salario_liquido.toFixed(2)}.\n\n` +
      results.map((r, i) => `Holerite ${i + 1} (${r.trabalhador?.nome || "Trabalhador"}): ${r.resumo_ia || ""}`).join("\n\n");

    return merged;
  };

  const handleAnalyzeSeparately = () => {
    if (pendingResultsToConsolidate && pendingResultsToConsolidate.length > 0) {
      const toAdd = pendingResultsToConsolidate.map(r => {
        return calculateEnhancedAnalysis(r, {
          dias_trabalhados: r.trabalho?.dias_trabalhados ?? null,
          horas_trabalhadas: r.trabalho?.horas_trabalhadas ?? null,
          horas_extras: r.trabalho?.horas_extras ?? null,
          horas_noturnas: r.trabalho?.horas_noturnas ?? null,
          horas_dsr_intermitente: r.trabalho?.horas_dsr_intermitente ?? null,
          salario_liquido_recebido: r.valores?.salario_liquido ?? null,
          empresa_nome: r.empresa?.nome ?? null,
          tipo_trabalhador: r.trabalhador?.tipo ?? null,
          observacoes: null
        });
      });
      
      setAnalysedList(prev => [...toAdd, ...prev]);
      setSelectedMonthId(toAdd[0].id);
      
      setShowCompetencyConflictDialog(false);
      setPendingResultsToConsolidate(null);
      setCurrentScreen('dashboard');
    }
  };

  const handleConsolidateAll = () => {
    if (pendingResultsToConsolidate && pendingResultsToConsolidate.length > 0) {
      const merged = consolidateResults(pendingResultsToConsolidate);
      setCurrentAnalysis(merged);
      
      setShowCompetencyConflictDialog(false);
      setPendingResultsToConsolidate(null);
      setCurrentScreen('complement-analysis');
    }
  };

  const handleConfirmCaso4 = () => {
    if (pendingResultsToConsolidate && pendingResultsToConsolidate.length >= 2) {
      const consolidated = consolidateResults(pendingResultsToConsolidate, true);
      if (consolidated) {
        consolidated.validacao_multipla = {
          status: "ok",
          motivo: "Holerites de pagamento complementar consolidados após confirmação do usuário.",
          mesma_competencia: true,
          mesma_empresa: true,
          mesmo_trabalhador: true,
          documentos_relacionados: false,
          deve_consolidar: true,
          tipo_consolidacao: "pagamento_complementar"
        };
        setCurrentAnalysis(consolidated);
      }
      setShowCaso4Confirmation(false);
      setPendingResultsToConsolidate(null);
      setCurrentScreen('complement-analysis');
    }
  };

  const handleCancelCaso4 = () => {
    setShowCaso4Confirmation(false);
    setPendingResultsToConsolidate(null);
    setCurrentScreen('upload');
  };

  const handleAnalysisComplete = (extractedResult: any) => {
    setIsLoading(false);
    if (!extractedResult) {
      if (user) {
        setCurrentScreen('dashboard');
      } else {
        setCurrentScreen('welcome');
      }
      return;
    }

    if (extractedResult) {
      const validacao = extractedResult.validacao_multipla;
      
      // Rigid validation flow based on server-side response
      if (validacao) {
        if (validacao.status === "erro") {
          console.log(`[Contracheque AI Web] Validação falhou. Erro: ${validacao.motivo}`);
          setValidationErrorMessage(validacao.motivo);
          setCurrentScreen('upload');
          return;
        } else if (validacao.status === "confirmacao_necessaria") {
          console.log(`[Contracheque AI Web] Validação indicou confirmação necessária para CASO 4.`);
          setPendingResultsToConsolidate(extractedResult.results || []);
          setShowCaso4Confirmation(true);
          return;
        } else if (validacao.status === "ok") {
          console.log(`[Contracheque AI Web] Validação bem sucedida.`);
          if (extractedResult.result) {
            setCurrentAnalysis(extractedResult.result);
          } else {
            setCurrentAnalysis(extractedResult);
          }
          setCurrentScreen('complement-analysis');
          return;
        }
      }

      // Standalone/fallback pipeline
      if (extractedResult.multiple && Array.isArray(extractedResult.results)) {
        const results = extractedResult.results;
        if (results.length === 0) {
          setCurrentScreen('upload');
          return;
        }

        if (results.length === 1) {
          setCurrentAnalysis(results[0]);
          setCurrentScreen('complement-analysis');
        } else {
          const hasConflict = checkCompetenciesConflict(results);
          if (hasConflict) {
            setValidationErrorMessage("Os holerites enviados pertencem a meses diferentes. Envie apenas holerites da mesma competência para gerar uma análise consolidada.");
            setCurrentScreen('upload');
          } else {
            const consolidated = consolidateResults(results);
            setCurrentAnalysis(consolidated);
            setCurrentScreen('complement-analysis');
          }
        }
      } else {
        setCurrentAnalysis(extractedResult);
        setCurrentScreen('complement-analysis');
      }
    } else {
      setIsLoading(false);
      if (user) {
        setCurrentScreen('dashboard');
      } else {
        setCurrentScreen('welcome');
      }
    }
  };

  const calculateEnhancedAnalysis = (analysis: any, complements: ComplementaryAnalysisData) => {
    const merged = { ...analysis };

    // Make sure nested structures are cloned
    merged.trabalhador = { ...analysis.trabalhador };
    merged.empresa = { ...analysis.empresa };
    merged.valores = { ...analysis.valores };
    merged.trabalho = { ...analysis.trabalho };
    merged.itens = (analysis.itens || []).map((it: any) => ({ ...it }));

    // Extract hours and total bruto fallbacks
    if (merged.valores.provento_horas_trabalhadas === undefined || merged.valores.provento_horas_trabalhadas === null) {
      const targetItem = merged.itens?.find((it: any) => {
        if (it.tipo !== "provento") return false;
        const name = (it.nome || "").toLowerCase();
        return (
          name === "horas trabalhadas" ||
          name === "horas trabalhadas - interm" ||
          name === "horas trabalhadas - interm." ||
          name === "horas trabalhadas - intermitente" ||
          name.includes("horas trab")
        );
      });
      merged.valores.provento_horas_trabalhadas = targetItem ? targetItem.valor : null;
    }

    if (merged.valores.bruto_total_folha === undefined || merged.valores.bruto_total_folha === null) {
      merged.valores.bruto_total_folha = merged.valores.total_proventos || merged.valores.salario_bruto || 0;
    }

    if (complements.empresa_nome !== undefined && complements.empresa_nome !== null) {
      merged.empresa.nome = complements.empresa_nome;
    }
    if (complements.tipo_trabalhador !== undefined && complements.tipo_trabalhador !== null) {
      merged.trabalhador.tipo = complements.tipo_trabalhador;
    }
    
    // Set days and hours
    merged.trabalho.dias_trabalhados = complements.dias_trabalhados;
    merged.trabalho.horas_trabalhadas = complements.horas_trabalhadas;
    merged.trabalho.horas_extras = complements.horas_extras;
    merged.trabalho.horas_noturnas = complements.horas_noturnas;
    merged.trabalho.horas_dsr_intermitente = complements.horas_dsr_intermitente;
    
    if (complements.salario_liquido_recebido !== undefined && complements.salario_liquido_recebido !== null) {
      merged.valores.salario_liquido = complements.salario_liquido_recebido;
    }
    
    merged.observacoes_trabalhador = complements.observacoes || null;

    // Apply removed discounts
    if (complements.descontos_removidos_nomes && complements.descontos_removidos_nomes.length > 0) {
      merged.itens = merged.itens.map((it: any) => {
        if (it.tipo === "desconto" && complements.descontos_removidos_nomes?.includes(it.nome)) {
          return { ...it, removido_do_calculo: true };
        }
        return it;
      });
    }

    // Recalculate total_descontos
    let finalTotalDescontos = 0;
    if (complements.total_descontos_confirmado !== null && complements.total_descontos_confirmado !== undefined) {
      finalTotalDescontos = complements.total_descontos_confirmado;
    } else {
      // Sum only non-removed discounts
      finalTotalDescontos = merged.itens
        .filter((it: any) => it.tipo === "desconto" && !it.removido_do_calculo)
        .reduce((sum: number, it: any) => sum + (it.valor || 0), 0);
    }
    merged.valores.total_descontos = Number(finalTotalDescontos.toFixed(2));

    merged.descontos_removidos_ids = complements.descontos_removidos_ids || [];
    merged.descontos_removidos_nomes = complements.descontos_removidos_nomes || [];
    merged.total_descontos_confirmado = complements.total_descontos_confirmado;

    // Calculate metrics:
    const salLiq = merged.valores.salario_liquido;
    const dias = merged.trabalho.dias_trabalhados;
    const horas = merged.trabalho.horas_trabalhadas;
    const totDescontos = merged.valores.total_descontos;
    const totAdicionais = merged.valores.total_adicionais;
    const adicionalNoturnoValor = merged.valores.adicional_noturno_valor;
    const horasNoturnas = merged.trabalho.horas_noturnas;
    const horasExtrasValor = merged.valores.horas_extras_valor;
    const horasExtrasQtd = merged.trabalho.horas_extras;

    // Find DSR Proventos
    const dsrItems = merged.itens?.filter((item: any) => {
      const name = (item.nome || "").toLowerCase();
      return name.includes("dsr") || name.includes("descanso") || name.includes("r.s.d.") || name.includes("rsd");
    }) || [];
    const valor_dsr = dsrItems.reduce((acc: number, item: any) => {
      if (item.tipo === "provento") {
        return acc + (item.valor || 0);
      }
      return acc;
    }, 0);
    const horasDsr = complements.horas_dsr_intermitente;
    const dsr_por_hora = (valor_dsr && horasDsr && horasDsr > 0) ? (valor_dsr / horasDsr) : null;

    // 4. GANHO POR HORA DO INTERMITENTE
    let ganho_por_hora_intermitente: number | null = null;
    
    const parseReferenceHours = (refStr: string | null): number | null => {
      if (!refStr) return null;
      const clean = String(refStr).replace(':', ',').trim();
      const match = clean.match(/([\d.,]+)/);
      if (match) {
        let numStr = match[1];
        if (numStr.includes(',') && numStr.includes('.')) {
          numStr = numStr.replace(/\./g, '').replace(',', '.');
        } else if (numStr.includes(',')) {
          numStr = numStr.replace(',', '.');
        }
        const parsed = parseFloat(numStr);
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    };

    const targetItem = merged.itens?.find((it: any) => {
      if (it.tipo !== "provento") return false;
      const name = (it.nome || "").toLowerCase();
      return (
        name === "horas trabalhadas" ||
        name === "horas trabalhadas - interm" ||
        name === "horas trabalhadas - interm." ||
        name === "horas trabalhadas - intermitente" ||
        name.includes("horas trab")
      );
    });

    const provHoras = merged.valores.provento_horas_trabalhadas;
    if (provHoras && horas && horas > 0) {
      ganho_por_hora_intermitente = provHoras / horas;
    } else if (targetItem) {
      const qty = parseReferenceHours(targetItem.referencia);
      if (qty && qty > 0) {
        ganho_por_hora_intermitente = targetItem.valor / qty;
      }
    }

    const ganho_por_dia = (salLiq && dias && dias > 0) ? (salLiq / dias) : null;
    const ganho_por_hora = (salLiq && horas && horas > 0) ? (salLiq / horas) : null;
    const desconto_por_dia = (totDescontos && dias && dias > 0) ? (totDescontos / dias) : null;
    const adicional_por_dia = (totAdicionais && dias && dias > 0) ? (totAdicionais / dias) : null;
    const adicional_noturno_por_hora = (adicionalNoturnoValor && horasNoturnas && horasNoturnas > 0) ? (adicionalNoturnoValor / horasNoturnas) : null;
    const horas_extras_por_hora = (horasExtrasValor && horasExtrasQtd && horasExtrasQtd > 0) ? (horasExtrasValor / horasExtrasQtd) : null;

    merged.metricas_calculadas = {
      ganho_por_dia,
      ganho_por_hora,
      desconto_por_dia,
      adicional_por_dia,
      adicional_noturno_por_hora,
      horas_extras_por_hora,
      dsr_por_hora,
      ganho_por_hora_intermitente
    };

    // Update the standard work averages (keep as unrounded value)
    merged.trabalho.media_por_dia = ganho_por_dia;
    merged.trabalho.media_por_hora = ganho_por_hora;

    // Append observation text to resumo_ia if any complement filled
    const isComplemented = complements.dias_trabalhados !== null || complements.horas_trabalhadas !== null || complements.observacoes !== null;
    if (isComplemented) {
      const line = "\nA análise foi complementada com informações informadas pelo trabalhador.";
      if (!merged.resumo_ia.includes(line)) {
        merged.resumo_ia += line;
      }
    }

    return merged;
  };

  const handleComplementConfirm = (complements: ComplementaryAnalysisData) => {
    const finalEnhanced = calculateEnhancedAnalysis(currentAnalysis, complements);
    setCurrentAnalysis(finalEnhanced);
    setCurrentScreen('analysis');
  };

  // Saved confirmed paycheck
  const handleSaveWithChoice = async (choice: 'substitute' | 'new_version' | 'cancel') => {
    if (choice === 'cancel') {
      setShowDuplicateSaveDialog(false);
      setDuplicateConflictItem(null);
      setPendingAnalysisToSave(null);
      return;
    }

    const email = user?.email || "joao.silva@exemplo.com.br";
    const userId = getUserIdFromEmail(email);

    if (choice === 'substitute' && duplicateConflictItem) {
      // Replace the duplicate previous item in local history
      const updatedItem = calculateSafeMetrics({ 
        ...pendingAnalysisToSave, 
        id: duplicateConflictItem.id, 
        user_id: userId, 
        created_at: new Date().toISOString() 
      });
      await updateAnalysis(duplicateConflictItem.id, updatedItem);
      
      const list = await getAnalysesByUser(userId);
      setAnalysedList(list);
      setSelectedMonthId(duplicateConflictItem.id);
    } else if (choice === 'new_version' && pendingAnalysisToSave) {
      // Save as a new version: change ID slightly to avoid key duplicates
      const newId = `pc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const itemToSave = calculateSafeMetrics({ 
        ...pendingAnalysisToSave, 
        id: newId, 
        user_id: userId, 
        created_at: new Date().toISOString() 
      });
      await saveAnalysis(itemToSave, userId);

      const list = await getAnalysesByUser(userId);
      setAnalysedList(list);
      setSelectedMonthId(newId);
    }

    setShowDuplicateSaveDialog(false);
    setDuplicateConflictItem(null);
    setPendingAnalysisToSave(null);
    setCurrentAnalysis(null);
    setCurrentScreen('dashboard');
  };

  // Saved confirmed paycheck
  const handleConfirmAnalysis = async (finalParsedDoc: ContrachequeAnalise) => {
    const email = user?.email || "joao.silva@exemplo.com.br";
    const userId = getUserIdFromEmail(email);
    
    // Set user_id and make sure calculations are correct, with guaranteed valid id
    const finalId = finalParsedDoc.id || `pc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const preparedDoc = calculateSafeMetrics({
      ...finalParsedDoc,
      id: finalId,
      user_id: userId,
      uploadedAt: finalParsedDoc.uploadedAt || new Date().toISOString()
    });

    const duplicate = await findDuplicateAnalysis(preparedDoc, userId);
    if (duplicate) {
      setDuplicateConflictItem(duplicate);
      setPendingAnalysisToSave(preparedDoc);
      setShowDuplicateSaveDialog(true);
    } else {
      await saveAnalysis(preparedDoc, userId);
      const list = await getAnalysesByUser(userId);
      setAnalysedList(list);
      setSelectedMonthId(preparedDoc.id);
      setCurrentAnalysis(null);
      setCurrentScreen('dashboard');
    }
  };

  const handleDiscardAnalysis = () => {
    setCurrentAnalysis(null);
    setIsLoading(false);
    setCurrentScreen('upload');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Universal header navigation */}
      <Navbar 
        currentScreen={currentScreen} 
        onNavigate={setCurrentScreen} 
        user={user} 
        onLogout={handleLogout}
      />

      {/* Primary content area */}
      <main className="flex-grow flex flex-col max-w-7xl w-full mx-auto p-4 md:p-6 pb-28 md:pb-8 relative">
        {currentScreen === 'welcome' && (
          <WelcomeView 
            onLogin={handleLogin} 
            onNavigate={setCurrentScreen} 
          />
        )}

        {currentScreen === 'dashboard' && user && (
          <DashboardView 
            analysedList={analysedList} 
            user={user}
            onNavigate={setCurrentScreen}
            setSelectedMonthId={setSelectedMonthId}
          />
        )}

        {currentScreen === 'upload' && (
          <UploadView 
            onAnalysisComplete={handleAnalysisComplete}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            user={user}
          />
        )}

        {currentScreen === 'complement-analysis' && (
          <ComplementAnalysisView 
            currentAnalysis={currentAnalysis}
            onConfirm={handleComplementConfirm}
            onDiscard={handleDiscardAnalysis}
          />
        )}

        {currentScreen === 'analysis' && (
          <AnalysisView 
            currentAnalysis={currentAnalysis}
            onConfirm={handleConfirmAnalysis}
            onDiscard={handleDiscardAnalysis}
          />
        )}

        {currentScreen === 'month_details' && (
          <MonthDetailsView 
            analysedList={analysedList}
            selectedMonthId={selectedMonthId}
            setSelectedMonthId={setSelectedMonthId}
          />
        )}

        {currentScreen === 'calendar' && (
          <CalendarView onNavigate={setCurrentScreen} user={user} />
        )}

        {currentScreen === 'history' && (
          <HistoryView 
            analysedList={analysedList}
            onNavigate={setCurrentScreen}
            setSelectedMonthId={setSelectedMonthId}
          />
        )}

        {currentScreen === 'settings' && user && (
          <SettingsView 
            user={user}
            onUpdateUser={handleUpdateUser}
            onLogout={handleLogout}
            onClearAllAnalyses={handleClearAllAnalyses}
          />
        )}
      </main>

      {/* Competency Conflict Dialog Modal */}
      {showCompetencyConflictDialog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 scale-95 animate-scaleUp text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mb-4 mx-auto animate-bounce">
              <span className="material-symbols-outlined text-[24px]">warning</span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mb-2">
              Meses Diferentes Detectados
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Você enviou holerites de competências diferentes (meses distintos). Deseja analisar separadamente?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleAnalyzeSeparately}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">split_scene</span>
                <span>Sim (Analisar Separadamente)</span>
              </button>
              <button
                onClick={handleConsolidateAll}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 font-bold py-3 text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">layers</span>
                <span>Não (Consolidar em um Único Mês)</span>
              </button>
              <button
                onClick={() => {
                  setShowCompetencyConflictDialog(false);
                  setPendingResultsToConsolidate(null);
                  setCurrentScreen('upload');
                }}
                className="w-full bg-transparent hover:bg-rose-50 text-rose-600 font-bold py-2 text-[10px] rounded-xl transition-colors mt-2"
              >
                Cancelar e Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Error Dialog Modal */}
      {validationErrorMessage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 scale-95 animate-scaleUp text-center animate-pulse">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-4 mx-auto">
              <span className="material-symbols-outlined text-[24px]">gavel</span>
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 mb-2">
              Regra de Consolidação Rígida
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              {validationErrorMessage}
            </p>
            <button
              onClick={() => {
                setValidationErrorMessage(null);
                setCurrentScreen('upload');
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 text-xs rounded-xl shadow-xs transition-colors"
            >
              Entendido e Voltar
            </button>
          </div>
        </div>
      )}

      {/* Caso 4 Confirmation Modal */}
      {showCaso4Confirmation && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 scale-95 animate-scaleUp text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 mb-4 mx-auto">
              <span className="material-symbols-outlined text-[24px]">calculate</span>
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 mb-2">
              Holerites com Valores Diferentes
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Encontramos holerites do mesmo mês e da mesma empresa, mas com valores diferentes. Deseja analisar como pagamento complementar?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleConfirmCaso4}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Sim, Consolidar como Complementar</span>
              </button>
              <button
                onClick={handleCancelCaso4}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">cancel</span>
                <span>Não, Cancelar Análise</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Save Dialog Modal */}
      {showDuplicateSaveDialog && pendingAnalysisToSave && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 scale-95 animate-scaleUp text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mb-4 mx-auto animate-bounce animate-duration-1000">
              <span className="material-symbols-outlined text-[24px]">warning</span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mb-2">
              Holerite Duplicado Detectado
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Já existe uma análise salva para este mês e empresa ({pendingAnalysisToSave.competencia?.mes} {pendingAnalysisToSave.competencia?.ano}). Deseja substituir a análise anterior ou salvar como nova versão?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleSaveWithChoice('substitute')}
                className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold py-3 text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">sync</span>
                <span>Substituir anterior</span>
              </button>
              
              <button
                onClick={() => handleSaveWithChoice('new_version')}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-250 font-bold py-3 text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>Salvar nova versão</span>
              </button>

              <button
                onClick={() => handleSaveWithChoice('cancel')}
                className="w-full bg-transparent hover:bg-rose-50 text-rose-600 font-bold py-2 text-[10px] rounded-xl transition-colors mt-2 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
