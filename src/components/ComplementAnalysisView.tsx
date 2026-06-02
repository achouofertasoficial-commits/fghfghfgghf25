import React, { useState } from 'react';
import { ComplementaryAnalysisData } from '../types';
import DecimalHoursHint from './DecimalHoursHint';

interface ComplementAnalysisViewProps {
  currentAnalysis: any;
  onConfirm: (complements: ComplementaryAnalysisData) => void;
  onDiscard: () => void;
}

export default function ComplementAnalysisView({ currentAnalysis, onConfirm, onDiscard }: ComplementAnalysisViewProps) {
  if (!currentAnalysis) return null;

  const parsedSalarioLiquido = currentAnalysis?.valores?.salario_liquido;
  const isSalarioLiquidoExtracted = parsedSalarioLiquido !== null && parsedSalarioLiquido !== undefined && parsedSalarioLiquido > 0;

  const parsedHorasNoturnas = currentAnalysis?.trabalho?.horas_noturnas;
  const isHorasNoturnasExtracted = parsedHorasNoturnas !== null && parsedHorasNoturnas !== undefined && parsedHorasNoturnas > 0;

  const parsedHorasDsr = currentAnalysis?.trabalho?.horas_dsr_intermitente;
  const isHorasDsrExtracted = parsedHorasDsr !== null && parsedHorasDsr !== undefined && parsedHorasDsr > 0;

  const parsedHorasTrabalhadas = currentAnalysis?.trabalho?.horas_trabalhadas;
  const isHorasTrabalhadasExtracted = parsedHorasTrabalhadas !== null && parsedHorasTrabalhadas !== undefined && parsedHorasTrabalhadas > 0;

  const parsedHorasExtras = currentAnalysis?.trabalho?.horas_extras;
  const isHorasExtrasExtracted = parsedHorasExtras !== null && parsedHorasExtras !== undefined && parsedHorasExtras > 0;

  const parsedEmpresaNome = currentAnalysis?.empresa?.nome;
  const isEmpresaNomeExtracted = parsedEmpresaNome !== null && parsedEmpresaNome !== undefined && parsedEmpresaNome.trim().length > 0;

  // Pre-populate with values extracted by AI so the user can easily confirm them
  const [complements, setComplements] = useState<Required<ComplementaryAnalysisData>>({
    dias_trabalhados: currentAnalysis.trabalho?.dias_trabalhados ?? null,
    horas_trabalhadas: currentAnalysis.trabalho?.horas_trabalhadas ?? null,
    horas_extras: currentAnalysis.trabalho?.horas_extras ?? null,
    horas_noturnas: currentAnalysis.trabalho?.horas_noturnas ?? null,
    salario_liquido_recebido: currentAnalysis.valores?.salario_liquido ?? null,
    empresa_nome: currentAnalysis.empresa?.nome ?? '',
    tipo_trabalhador: currentAnalysis.trabalhador?.tipo ?? 'mensalista',
    observacoes: '',
    horas_dsr_intermitente: currentAnalysis.trabalho?.horas_dsr_intermitente ?? null,
    total_descontos_confirmado: null,
    descontos_removidos_ids: [],
    descontos_removidos_nomes: [],
  });

  const [discountItems, setDiscountItems] = useState<any[]>(() => {
    return (currentAnalysis?.itens || [])
      .filter((it: any) => it.tipo === "desconto")
      .map((it: any, index: number) => ({
        ...it,
        id: it.id || `discount-${index}`,
        removido_do_calculo: !!it.removido_do_calculo
      }));
  });

  const [totalDescontosText, setTotalDescontosText] = useState(() => {
    const val = currentAnalysis.valores?.total_descontos;
    if (val === null || val === undefined || isNaN(Number(val))) return '';
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  });

  const [isTotalDescontosEdited, setIsTotalDescontosEdited] = useState(false);

  const toggleDiscountRemoval = (index: number) => {
    setDiscountItems((prev) => {
      const updated = prev.map((it, i) => (i === index ? { ...it, removido_do_calculo: !it.removido_do_calculo } : it));
      
      if (!isTotalDescontosEdited) {
        const remainingSum = updated
          .filter(it => !it.removido_do_calculo)
          .reduce((sum, it) => sum + it.valor, 0);
        setTotalDescontosText(remainingSum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
      }
      return updated;
    });
  };

  // Local state as string for uncontrolled user typing before parses
  const [salLiqText, setSalLiqText] = useState(() => {
    const val = currentAnalysis.valores?.salario_liquido;
    if (val === null || val === undefined || isNaN(Number(val))) return '';
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  });

  const [diasText, setDiasText] = useState(() => {
    return currentAnalysis.trabalho?.dias_trabalhados?.toString() || '';
  });

  const [horasText, setHorasText] = useState(() => {
    return currentAnalysis.trabalho?.horas_trabalhadas?.toString() || '';
  });

  const [extrasText, setExtrasText] = useState(() => {
    return currentAnalysis.trabalho?.horas_extras?.toString() || '';
  });

  const [noturnasText, setNoturnasText] = useState(() => {
    return currentAnalysis.trabalho?.horas_noturnas?.toString() || '';
  });

  const [dsrText, setDsrText] = useState(() => {
    return currentAnalysis.trabalho?.horas_dsr_intermitente?.toString() || '';
  });

  const [empresaText, setEmpresaText] = useState(() => {
    return currentAnalysis.empresa?.nome || '';
  });

  const [tipoTrab, setTipoTrab] = useState<"mensalista" | "intermitente">(() => {
    return (currentAnalysis.trabalhador?.tipo as "mensalista" | "intermitente") || 'mensalista';
  });

  const [obsText, setObsText] = useState('');

  // Currency parser
  function parseBrazilianCurrency(value: string): number | null {
    if (!value) return null;
    let clean = value.replace(/R\$\s?/gi, '').trim();
    if (!clean) return null;
    
    if (clean.includes(',') && clean.includes('.')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes(',')) {
      clean = clean.replace(',', '.');
    }
    
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? null : parsed;
  }

  const handleRecalculate = () => {
    const parsedSalLiq = parseBrazilianCurrency(salLiqText);
    const parsedDias = diasText ? parseInt(diasText, 10) : null;
    const parsedHoras = horasText ? parseFloat(horasText.replace(',', '.')) : null;
    const parsedExtras = extrasText ? parseFloat(extrasText.replace(',', '.')) : null;
    const parsedNoturnas = noturnasText ? parseFloat(noturnasText.replace(',', '.')) : null;
    const parsedDsr = dsrText ? parseFloat(dsrText.replace(',', '.')) : null;

    const parsedTotalDescontosInput = parseBrazilianCurrency(totalDescontosText);
    const removedNames = discountItems
      .filter(it => it.removido_do_calculo)
      .map(it => it.nome);
    const removedIds = discountItems
      .filter(it => it.removido_do_calculo)
      .map((it, idx) => it.id || `discount-${idx}`);

    let totalDescontosConfirmed = null;
    if (isTotalDescontosEdited) {
      totalDescontosConfirmed = parsedTotalDescontosInput;
    } else {
      const remainingSum = discountItems
        .filter(it => !it.removido_do_calculo)
        .reduce((sum, it) => sum + it.valor, 0);
      totalDescontosConfirmed = Number(remainingSum.toFixed(2));
    }

    const data: ComplementaryAnalysisData = {
      dias_trabalhados: isNaN(Number(parsedDias)) ? null : parsedDias,
      horas_trabalhadas: isNaN(Number(parsedHoras)) ? null : parsedHoras,
      horas_extras: isNaN(Number(parsedExtras)) ? null : parsedExtras,
      horas_noturnas: isNaN(Number(parsedNoturnas)) ? null : parsedNoturnas,
      salario_liquido_recebido: parsedSalLiq,
      empresa_nome: (empresaText && empresaText.trim()) || null,
      tipo_trabalhador: tipoTrab || null,
      observacoes: obsText.trim() || null,
      horas_dsr_intermitente: isNaN(Number(parsedDsr)) ? null : parsedDsr,
      total_descontos_confirmado: totalDescontosConfirmed,
      descontos_removidos_ids: removedIds,
      descontos_removidos_nomes: removedNames
    };

    onConfirm(data);
  };

  const hasDsrItem = currentAnalysis.itens?.some((item: any) => {
    const name = (item.nome || "").toLowerCase();
    return name.includes("dsr") || name.includes("descanso") || name.includes("r.s.d.") || name.includes("rsd");
  }) || false;

  const showDsrField = tipoTrab === 'intermitente' || hasDsrItem;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 flex flex-col gap-6 animate-fadeIn pb-16">
      {/* Step Banner */}
      <div className="text-center space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
          <span className="material-symbols-outlined text-[14px]">checklist</span> Passo 2 de 3: Confirmar Dados
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Completar dados do holerite</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          A IA interpretou os dados do documento. Revise e preencha as informações abaixo para que possamos calcular as médias, rendimentos e estatísticas precisas.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
        
        {/* Helper Note */}
        <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100/50 flex gap-3 text-left">
          <span className="material-symbols-outlined text-emerald-700 text-xl shrink-0 mt-0.5">info</span>
          <div>
            <p className="text-xs font-bold text-emerald-950">Mais transparência nas suas contas</p>
            <p className="text-[11px] text-emerald-800/90 mt-0.5 mt-1 leading-relaxed">
              Quanto mais dados você preencher, mais completa será sua análise. Campo sob revisão ou ausente na digitalização pode ser corrigido diretamente abaixo.
            </p>
          </div>
        </div>

        {/* Form fields */}
        <div className="space-y-6 text-left">
          
          {/* Highlighted Field: Dias Trabalhados */}
          <div className="p-5 bg-gradient-to-tr from-emerald-50/30 to-emerald-50/70 border-2 border-emerald-600/40 rounded-2xl space-y-2 relative shadow-xs">
            <div className="absolute -top-3 right-4 bg-emerald-600 text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Uso Essencial
            </div>
            
            <label className="block text-xs font-extrabold text-slate-900 flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px] text-emerald-700">calendar_today</span>
              Dias trabalhados no mês
            </label>
            <p className="text-[10px] text-slate-500 leading-normal">
              Este campo é fundamental! Se não for informado ou estiver incorreto, não conseguiremos calcular seu ganho real por dia trabalhado, seus adicionais diários e futuros comparativos.
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Ex: 22"
              value={diasText}
              onChange={(e) => setDiasText(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-white border-2 border-emerald-600/20 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all max-w-[150px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Liquid Salary received */}
            {isSalarioLiquidoExtracted ? (
              <div className="flex flex-col gap-1.5 bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4 text-left relative shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <span className="absolute top-3.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100/80 text-emerald-800 flex items-center gap-0.5 select-none">
                  <span className="material-symbols-outlined text-[10px] font-bold">check_circle</span> Confirmado por IA
                </span>
                <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-emerald-800">payments</span>
                  Valor líquido extraído
                </label>
                <input
                  type="text"
                  value={salLiqText}
                  onChange={(e) => setSalLiqText(e.target.value)}
                  className="text-sm font-extrabold text-slate-900 mt-1 bg-transparent border-0 outline-none w-full focus:bg-white focus:ring-1 focus:ring-emerald-600 rounded px-1 -mx-1 py-0.5"
                />
                <span className="text-[9px] text-emerald-700 font-medium">
                  Salário líquido final extraído com precisão do holerite.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-left">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-emerald-800">payments</span>
                  Valor líquido recebido
                </label>
                <input
                  type="text"
                  placeholder="Ex: R$ 2.779,25"
                  value={salLiqText}
                  onChange={(e) => setSalLiqText(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all mt-1"
                />
                <span className="text-[9px] text-slate-400">
                  Insira o salário líquido final que cairá na sua conta.
                </span>
              </div>
            )}

            {/* Total Hours worked in month */}
            {isHorasTrabalhadasExtracted ? (
              <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left relative shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <span className="absolute top-3.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-200/60 text-slate-600 flex items-center gap-0.5 select-none">
                  <span className="material-symbols-outlined text-[10px] font-bold">check_circle</span> Confirmado por IA
                </span>
                <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-slate-500">schedule</span>
                  Horas trabalhadas
                </label>
                <div className="flex items-center gap-1 text-sm font-extrabold text-slate-800 mt-1">
                  <input
                    type="text"
                    value={horasText}
                    onChange={(e) => setHorasText(e.target.value)}
                    className="bg-transparent border-0 outline-none w-20 focus:bg-white focus:ring-1 focus:ring-emerald-600 rounded px-1 -mx-1 py-0.5 text-slate-800 font-extrabold"
                  />
                  <span>horas</span>
                </div>
                <span className="text-[9px] text-slate-500 font-medium">
                  Carga horária mensal extraída com as devidas referências.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-left">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-slate-500">schedule</span>
                  Horas trabalhadas no mês
                </label>
                <input
                  type="text"
                  placeholder="Ex: 176"
                  value={horasText}
                  onChange={(e) => setHorasText(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all mt-1"
                />
                <span className="text-[9px] text-slate-400">
                  Carga horária total (ex: 176 horas ou 220 horas).
                </span>
                <DecimalHoursHint />
              </div>
            )}

            {/* Extra Hours Quantity */}
            {isHorasExtrasExtracted ? (
              <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left relative shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <span className="absolute top-3.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-200/60 text-slate-600 flex items-center gap-0.5 select-none">
                  <span className="material-symbols-outlined text-[10px] font-bold">check_circle</span> Confirmado por IA
                </span>
                <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-amber-500 font-bold">add_time</span>
                  Horas extras realizadas
                </label>
                <div className="flex items-center gap-1 text-sm font-extrabold text-slate-800 mt-1">
                  <input
                    type="text"
                    value={extrasText}
                    onChange={(e) => setExtrasText(e.target.value)}
                    className="bg-transparent border-0 outline-none w-20 focus:bg-white focus:ring-1 focus:ring-emerald-600 rounded px-1 -mx-1 py-0.5 text-slate-800 font-extrabold"
                  />
                  <span>horas</span>
                </div>
                <span className="text-[9px] text-slate-500 font-medium">
                  Soma da quantidade de horas extras extraída do holerite.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-left">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-amber-500 font-bold">add_time</span>
                  Horas extras realizadas
                </label>
                <input
                  type="text"
                  placeholder="Ex: 12"
                  value={extrasText}
                  onChange={(e) => setExtrasText(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all mt-1"
                />
                <span className="text-[9px] text-slate-400">
                  Soma da quantidade de horas extras trabalhadas no mês.
                </span>
                <DecimalHoursHint />
              </div>
            )}

            {/* Night shift hours Quantity */}
            {isHorasNoturnasExtracted ? (
              <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left relative shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <span className="absolute top-3.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-200/60 text-slate-600 flex items-center gap-0.5 select-none">
                  <span className="material-symbols-outlined text-[10px] font-bold">check_circle</span> Confirmado por IA
                </span>
                <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-slate-800">dark_mode</span>
                  Horas noturnas realizadas
                </label>
                <div className="flex items-center gap-1 text-sm font-extrabold text-slate-800 mt-1">
                  <input
                    type="text"
                    value={noturnasText}
                    onChange={(e) => setNoturnasText(e.target.value)}
                    className="bg-transparent border-0 outline-none w-20 focus:bg-white focus:ring-1 focus:ring-emerald-600 rounded px-1 -mx-1 py-0.5 text-slate-800 font-extrabold"
                  />
                  <span>horas</span>
                </div>
                <span className="text-[9px] text-slate-500 font-medium">
                  Quantidade total extraída de adicional noturno do holerite.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-left">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-slate-800">dark_mode</span>
                  Horas de adicional noturno realizadas
                </label>
                <input
                  type="text"
                  placeholder="Ex: 35"
                  value={noturnasText}
                  onChange={(e) => setNoturnasText(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all mt-1"
                />
                <span className="text-[9px] text-slate-400">
                  Muitos holerites mostram apenas o valor, declare as horas se souber!
                </span>
                <DecimalHoursHint />
              </div>
            )}

            {/* DSR Intermitente Hours */}
            {showDsrField && (
              isHorasDsrExtracted ? (
                <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left relative shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <span className="absolute top-3.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-200/60 text-slate-600 flex items-center gap-0.5 select-none">
                    <span className="material-symbols-outlined text-[10px] font-bold">check_circle</span> Confirmado por IA
                  </span>
                  <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-indigo-500">beach_access</span>
                    Horas de DSR Intermitente
                  </label>
                  <div className="flex items-center gap-1 text-sm font-extrabold text-slate-800 mt-1">
                    <input
                      type="text"
                      value={dsrText}
                      onChange={(e) => setDsrText(e.target.value)}
                      className="bg-transparent border-0 outline-none w-20 focus:bg-white focus:ring-1 focus:ring-emerald-600 rounded px-1 -mx-1 py-0.5 text-slate-800 font-extrabold"
                    />
                    <span>horas</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-medium">
                    Descanso Semanal Remunerado identificado nas rubricas da IA.
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-left">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-indigo-500">beach_access</span>
                    Horas de DSR Intermitente
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 12,50"
                    value={dsrText}
                    onChange={(e) => setDsrText(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all mt-1"
                  />
                  <span className="text-[9px] text-slate-400">
                    Horas de Descanso Semanal Remunerado do período contratado.
                  </span>
                  <DecimalHoursHint />
                </div>
              )
            )}

            {/* Company name */}
            {isEmpresaNomeExtracted ? (
              <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left relative shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <span className="absolute top-3.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-200/60 text-slate-600 flex items-center gap-0.5 select-none">
                  <span className="material-symbols-outlined text-[10px] font-bold">check_circle</span> Confirmado por IA
                </span>
                <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-slate-500">domain</span>
                  Nome da empresa
                </label>
                <input
                  type="text"
                  value={empresaText}
                  onChange={(e) => setEmpresaText(e.target.value)}
                  className="text-sm font-extrabold text-slate-800 mt-1 bg-transparent border-0 outline-none w-full focus:bg-white focus:ring-1 focus:ring-emerald-600 rounded px-1 -mx-1 py-0.5 text-slate-800 font-extrabold"
                />
                <span className="text-[9px] text-slate-500 font-medium">
                  CNPJ/Nome de fonte pagadora identificado pelo extrator de layout.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-left">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-slate-500">domain</span>
                  Nome da empresa
                </label>
                <input
                  type="text"
                  placeholder="Aparece no cabeçalho"
                  value={empresaText}
                  onChange={(e) => setEmpresaText(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all mt-1"
                />
                <span className="text-[9px] text-slate-400">
                  Razão social ou nome fantasia do empregador.
                </span>
              </div>
            )}

            {/* Worker Type */}
            <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-left">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-slate-500">work</span>
                Regime do trabalhador
              </label>
              <select
                value={tipoTrab}
                onChange={(e) => setTipoTrab(e.target.value as any)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all mt-1"
              >
                <option value="mensalista">Mensalista CLT (Fixo Mensal)</option>
                <option value="intermitente">Intermitente CLT (Por Período/Hora)</option>
              </select>
              <span className="text-[9px] text-slate-400">
                O regime define a base de proventos e férias futuras.
              </span>
            </div>

          </div>

          {/* Revisar descontos encontrados */}
          <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-5 space-y-4 text-left">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-rose-700 select-none">style</span>
                Revisar descontos encontrados
              </h3>
              <p className="text-[10px] text-slate-500 leading-normal mt-1">
                A IA encontrou estes descontos no holerite. Você pode remover algum item se ele não deve entrar no cálculo final.
              </p>
            </div>

            {discountItems.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">Nenhum desconto identificado pela IA neste holerite.</p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {discountItems.map((item, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      item.removido_do_calculo 
                        ? 'bg-slate-100/50 border-slate-200/50 opacity-60 line-through text-slate-400' 
                        : 'bg-white border-slate-200 text-slate-850 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`material-symbols-outlined text-[16px] select-none ${item.removido_do_calculo ? 'text-slate-400' : 'text-slate-500'}`}>
                        {item.removido_do_calculo ? 'do_not_disturb_on' : 'payments'}
                      </span>
                      <span className="text-xs font-semibold truncate">{item.nome}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-extrabold">
                        {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleDiscountRemoval(index)}
                        className={`p-1.5 rounded-lg transition-all ${
                          item.removido_do_calculo 
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                            : 'bg-slate-100 text-slate-650 hover:bg-rose-50 hover:text-rose-600'
                        }`}
                        title={item.removido_do_calculo ? "Restaurar item" : "Remover do cálculo"}
                      >
                        <span className="material-symbols-outlined text-[16px] block select-none">
                          {item.removido_do_calculo ? 'settings_backup_restore' : 'delete'}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Desconto total confirmado field */}
            <div className="pt-3 border-t border-slate-200/80 flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-slate-500 select-none">price_check</span>
                Desconto total confirmado
              </label>
              <input
                type="text"
                placeholder="Ex: R$ 350,00"
                value={totalDescontosText}
                onChange={(e) => {
                  setTotalDescontosText(e.target.value);
                  setIsTotalDescontosEdited(true);
                }}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all max-w-[200px]"
              />
              <p className="text-[9px] text-slate-400">
                Esse campo vem pré-preenchido com o total de descontos do holerite. Você pode editá-lo caso a IA tenha detectado incorretamente.
              </p>
            </div>
          </div>

          {/* Worker Observations (observacoes) */}
          <div className="flex flex-col gap-1.5 pt-2">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-slate-500">notes</span>
              Observações ou anotações pessoais
            </label>
            <textarea
              placeholder="Digite aqui as particularidades deste mês (ex: 'Recebi bonificação especial por bater meta', 'Descontaram atrasos indevidos')"
              rows={3}
              value={obsText}
              onChange={(e) => setObsText(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all resize-none"
            />
            <span className="text-[9px] text-slate-400">
              Essas notas ficarão registradas no detalhe do seu histórico do holerite.
            </span>
          </div>

        </div>

        {/* Action triggers */}
        <div className="pt-4 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onDiscard}
            className="flex-1 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 text-slate-600 text-xs font-bold py-3 px-4 rounded-xl transition-all"
          >
            Descartar holerite
          </button>
          
          <button
            onClick={handleRecalculate}
            className="flex-1 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">calculate</span>
            Recalcular análise
          </button>
        </div>

      </div>
    </div>
  );
}
