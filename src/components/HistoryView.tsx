import React, { useState, useEffect } from 'react';
import { ContrachequeAnalise, Screen } from '../types';
import { compareMonthlyAnalyses } from '../services/analysisStorage';

interface HistoryViewProps {
  analysedList: ContrachequeAnalise[];
  onNavigate: (screen: Screen) => void;
  setSelectedMonthId: (id: string) => void;
}

export default function HistoryView({ analysedList, onNavigate, setSelectedMonthId }: HistoryViewProps) {
  // Generate unique available years sorted descending
  const availableYears = Array.from(new Set(
    analysedList.map(item => String(item.competencia.ano || "")).filter(Boolean)
  )).sort((a, b) => Number(b) - Number(a));

  // Determine initial state: current year if present, or most recent, or "all"
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    const currentYearStr = new Date().getFullYear().toString();
    if (availableYears.includes(currentYearStr)) {
      return currentYearStr;
    }
    if (availableYears.length > 0) {
      return availableYears[0];
    }
    return 'all';
  });

  const [compAId, setCompAId] = useState("");
  const [compBId, setCompBId] = useState("");
  const [comparisonResult, setComparisonResult] = useState<any | null>(null);

  // Sync active selected year based on availability
  const activeYear = selectedYear === 'all' || availableYears.includes(selectedYear)
    ? selectedYear
    : (availableYears.includes(new Date().getFullYear().toString())
        ? new Date().getFullYear().toString()
        : (availableYears.length > 0 ? availableYears[0] : 'all'));

  // Months order in PT
  const monthsInOrderPT = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const shortMonths: Record<string, string> = {
    "Janeiro": "Jan", "Fevereiro": "Fev", "Março": "Mar", "Abril": "Abr",
    "Maio": "Mai", "Junho": "Jun", "Julho": "Jul", "Agosto": "Ago",
    "Setembro": "Set", "Outubro": "Out", "Novembro": "Nov", "Dezembro": "Dez"
  };

  const getMonthIndex = (mes: string | null) => {
    if (!mes) return 0;
    const idx = monthsInOrderPT.indexOf(mes);
    return idx === -1 ? 0 : idx;
  };

  const getCompetenceValue = (ano: any, mes: string | null) => {
    const yearNum = Number(ano) || 0;
    const monthNum = getMonthIndex(mes);
    return yearNum * 12 + monthNum;
  };

  // Filter list by selected exercise year or keep all
  const filteredAnalyses = activeYear === "all"
    ? analysedList
    : analysedList.filter(item => String(item.competencia.ano) === activeYear);

  // Sort history from newest to oldest for lists/dropdowns
  const sortedHistoryList = [...filteredAnalyses].sort((a, b) => 
    getCompetenceValue(b.competencia.ano, b.competencia.mes) - getCompetenceValue(a.competencia.ano, a.competencia.mes)
  );

  // Sync comparator default options
  useEffect(() => {
    if (sortedHistoryList.length >= 2) {
      if (!compAId || !sortedHistoryList.some(x => x.id === compAId)) {
        setCompAId(sortedHistoryList[0].id);
      }
      if (!compBId || !sortedHistoryList.some(x => x.id === compBId) || compBId === compAId) {
        const remaining = sortedHistoryList.filter(x => x.id !== (compAId || sortedHistoryList[0].id));
        if (remaining.length > 0) {
          setCompBId(remaining[0].id);
        }
      }
    } else if (sortedHistoryList.length === 1) {
      if (!compAId || !sortedHistoryList.some(x => x.id === compAId)) {
        setCompAId(sortedHistoryList[0].id);
      }
      setCompBId("");
    } else {
      setCompAId("");
      setCompBId("");
    }
  }, [sortedHistoryList, compAId, compBId]);

  useEffect(() => {
    setComparisonResult(null);
  }, [compAId, compBId]);

  // Sum annual/overall calculations
  const totalReceived = filteredAnalyses.reduce((acc, curr) => acc + (curr.valores.salario_liquido || 0), 0);
  const totalDeducted = filteredAnalyses.reduce((acc, curr) => acc + (curr.valores.total_descontos || 0), 0);
  
  const countMonths = filteredAnalyses.length || 1;
  const averageMonthly = filteredAnalyses.length > 0 ? Math.round(totalReceived / filteredAnalyses.length) : 0;

  // Find best month by ganho/dia
  const bestMonthObj = [...filteredAnalyses].sort((a, b) => {
    const aVal = a.trabalho?.media_por_dia || 0;
    const bVal = b.trabalho?.media_por_dia || 0;
    return bVal - aVal;
  })[0];

  // Find worst month by ganho/dia
  const worstMonthObj = [...filteredAnalyses].filter(item => (item.trabalho?.media_por_dia || 0) > 0).sort((a, b) => {
    const aVal = a.trabalho?.media_por_dia || 99999999;
    const bVal = b.trabalho?.media_por_dia || 99999999;
    return aVal - bVal;
  })[0];
  
  // Average daily earnings overall
  const validDaysList = filteredAnalyses.filter(item => item.trabalho?.dias_trabalhados);
  const totalLiquidForDays = validDaysList.reduce((acc, curr) => acc + (curr.valores.salario_liquido || 0), 0);
  const totalDaysAcrossMonths = validDaysList.reduce((acc, curr) => acc + (curr.trabalho?.dias_trabalhados || 0), 0);
  const averageDailyOverall = totalDaysAcrossMonths > 0 ? (totalLiquidForDays / totalDaysAcrossMonths) : null;

  const handleCompareDocs = () => {
    const docA = analysedList.find(x => x.id === compAId);
    const docB = analysedList.find(x => x.id === compBId);
    if (docA && docB) {
      const res = compareMonthlyAnalyses(docA, docB);
      setComparisonResult(res);
    }
  };

  const getShortMonthName = (fullMonth: string | null) => {
    if (!fullMonth) return "Mês";
    return shortMonths[fullMonth] || fullMonth.substring(0, 3);
  };

  const formatCurrency = (val: any) => {
    if (val === null || val === undefined || isNaN(Number(val))) return 'R$ 0,00';
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleMonthClick = (id: string) => {
    setSelectedMonthId(id);
    onNavigate('month_details');
  };  

  // Determine dynamic graph data based on selected range
  const graphData = activeYear === "all"
    ? [...filteredAnalyses]
        .sort((a, b) => getCompetenceValue(a.competencia.ano, a.competencia.mes) - getCompetenceValue(b.competencia.ano, b.competencia.mes))
        .map(item => ({
          id: item.id,
          label: `${getShortMonthName(item.competencia.mes)}/${String(item.competencia.ano).substring(2)}`,
          fullLabel: `${item.competencia.mes} ${item.competencia.ano}`,
          value: item.valores.salario_liquido || 0,
          isPresent: true,
          match: item
        }))
    : monthsInOrderPT.map((mName, mIdx) => {
        const match = filteredAnalyses.find(x => x.competencia.mes === mName);
        return {
          id: match ? match.id : `empty-${mIdx}`,
          label: shortMonths[mName] || mName.substring(0, 3),
          fullLabel: `${mName} ${activeYear}`,
          value: match ? (match.valores.salario_liquido || 0) : 0,
          isPresent: !!match,
          match: match
        };
      });

  const maxNetVal = Math.max(...graphData.map(x => x.value), 5000);
  const polylinePoints = graphData.map((gItem, gIdx) => {
    const val = gItem.value;
    const totalCount = graphData.length;
    const x = totalCount > 1 ? (gIdx / (totalCount - 1)) * 90 + 5 : 50; // offset margins
    const y = 80 - (maxNetVal > 0 ? (val / maxNetVal) * 60 : 0);
    return { x, y, isPresent: gItem.isPresent };
  });

  const activePoints = polylinePoints.filter(p => p.isPresent);
  const activePolylineAttr = activePoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <div className="space-y-6 text-left">
      {/* Header section with Year Picker */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:hidden">Resumo Anual</h1>
          <h1 className="text-2xl font-bold text-slate-900 hidden md:block">Histórico Anual de Holerites</h1>
          <p className="text-sm text-slate-500 mt-1">
            {activeYear === 'all' ? "Visão consolidada de todos os anos" : "Acompanhe sua trajetória financeira consolidada ao longo do ano."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={activeYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-800 outline-none cursor-pointer shadow-xs"
          >
            <option value="all">Todos os anos</option>
            {availableYears.map(year => (
              <option key={year} value={year}>Exercício {year}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Span 8: Totals Cards and Annual Polyline Chart */}
        <div className="md:col-span-8 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Total Received Card */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col relative overflow-hidden group shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest flex items-center gap-1">
                <span className="material-symbols-outlined text-emerald-700 text-sm">arrow_upward</span> 
                Total Recebido Líquido ({activeYear === 'all' ? 'Todos os anos' : activeYear})
              </span>
              <div className="text-2xl font-bold text-slate-900 z-10">{formatCurrency(totalReceived)}</div>
              <div className="mt-4 flex items-center gap-1 text-emerald-700 text-[10px] font-bold">
                <span className="material-symbols-outlined text-[14px]">info</span>
                <span>Soma acumulada do período</span>
              </div>
            </div>

            {/* Total Deducted Card */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col relative overflow-hidden group shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest flex items-center gap-1">
                <span className="material-symbols-outlined text-red-500 text-sm">arrow_downward</span> 
                Descontos Acumulados ({activeYear === 'all' ? 'Todos os anos' : activeYear})
              </span>
              <div className="text-2xl font-bold text-slate-900 z-10">{formatCurrency(totalDeducted)}</div>
              <div className="mt-4 flex items-center gap-1 text-red-500 text-[10px] font-bold">
                <span className="material-symbols-outlined text-[14px]">info</span>
                <span>Retido IRRF & INSS das folhas</span>
              </div>
            </div>
          </div>

          {/* Graphical Area - Overlay Line Chart */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col min-h-[300px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 text-sm">
                {activeYear === 'all' ? "Evolução de Rendimentos" : "Gráfico Anual de Fluxo de Caixa"}
              </h3>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold">Líquido vs Descontos</span>
            </div>

            {/* Line Graph Canvas with dynamic columns and wave polyline */}
            <div className="flex-1 w-full relative bg-slate-50/50 rounded-xl flex items-end p-4 pt-12 justify-between border border-slate-100">
              
              {/* Background grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between z-0 pointer-events-none pb-8">
                <div className="w-full h-px bg-slate-100/55" />
                <div className="w-full h-px bg-slate-100/100" />
                <div className="w-full h-px bg-slate-100/100" />
                <div className="w-full h-px bg-slate-100/100" />
              </div>

              {/* Plotting points / columns backdrop */}
              {graphData.map((gItem, gIdx) => {
                const isPresent = gItem.isPresent;
                const value = gItem.value;
                const heightPct = isPresent ? Math.min(Math.max((value / maxNetVal) * 75, 15), 100) : 0;

                return (
                  <div 
                    key={gItem.id} 
                    onClick={() => gItem.match && handleMonthClick(gItem.match.id)}
                    className={`flex-1 flex flex-col items-center gap-2 group h-full justify-end z-10 ${isPresent ? 'cursor-pointer' : 'opacity-15'}`}
                  >
                    <div 
                      className={`w-3.5 bg-emerald-700/10 group-hover:bg-emerald-700/35 rounded-t-sm transition-all relative`}
                      style={{ height: isPresent ? `${heightPct}%` : '4px' }}
                    >
                      {isPresent && (
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold py-1 px-2.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md z-40">
                          {formatCurrency(value)}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold hidden sm:block whitespace-nowrap">{gItem.label}</span>
                  </div>
                );
              })}

              {/* Precise SVG Polyline Wave based on actual metrics */}
              {activePoints.length > 1 && (
                <svg className="absolute inset-0 h-full w-full pointer-events-none p-4" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <polyline 
                    fill="none" 
                    stroke="#006c49" 
                    strokeWidth="2.5" 
                    className="opacity-65"
                    points={activePolylineAttr} 
                  />
                  {activePoints.map((pt, pIdx) => (
                    <circle 
                      key={pIdx}
                      cx={pt.x}
                      cy={pt.y}
                      r="1.8"
                      fill="#006c49"
                      className="opacity-90"
                    />
                  ))}
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Right Span 4: Extra statistics and Monthly List breakdown */}
        <div className="md:col-span-4 flex flex-col gap-4">
          
          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-xs flex flex-col justify-center text-left">
              <span className="text-[10px] font-bold text-slate-400 mb-1">Média Mensal</span>
              <span className="text-sm font-bold text-slate-900">{formatCurrency(averageMonthly)}</span>
            </div>
            
            <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-xs flex flex-col justify-center text-left">
              <span className="text-[10px] font-bold text-slate-400 mb-1">Média p/ Dia Geral</span>
              <span className="text-sm font-bold text-emerald-800">
                {averageDailyOverall ? formatCurrency(averageDailyOverall) : "Não inf."}
              </span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-xs flex flex-col justify-center col-span-2 relative overflow-hidden text-left">
              <div className="absolute right-[-10px] top-[-10px] opacity-10">
                <span className="material-symbols-outlined text-[64px]">emoji_events</span>
              </div>
              <div className="flex justify-between items-end z-10">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Melhor Mês (Ganho/Dia)</span>
                  <span className="text-sm font-bold text-slate-800">
                    {bestMonthObj ? `${bestMonthObj.competencia.mes} ${bestMonthObj.competencia.ano}` : "Nenhum"}
                  </span>
                </div>
                {bestMonthObj && (
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 shrink-0">
                    {formatCurrency(bestMonthObj.trabalho?.media_por_dia || 0)}/dia
                  </span>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-xs flex flex-col justify-center col-span-2 text-left">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Pior Mês (Ganho/Dia)</span>
                  <span className="text-sm font-bold text-slate-800">
                    {worstMonthObj ? `${worstMonthObj.competencia.mes} ${worstMonthObj.competencia.ano}` : "Nenhum"}
                  </span>
                </div>
                {worstMonthObj && (
                  <span className="text-[9px] font-bold text-red-650 bg-red-50 px-2.5 py-1 rounded-full border border-red-105 shrink-0 font-semibold font-semibold">
                    {formatCurrency(worstMonthObj.trabalho?.media_por_dia || 0)}/dia
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Monthly Breakdown List */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs flex-1 flex flex-col overflow-hidden max-h-[380px]">
            <div className="p-4 border-b border-slate-50 bg-slate-50/50 sticky top-0 z-10">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Histórico Mensal ({activeYear === 'all' ? 'Todos os anos' : activeYear})
              </h3>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2 space-y-1.5 custom-scrollbar">
              {sortedHistoryList.map((item, idx) => {
                const isPositive = (item.valores.salario_liquido || 0) > 4000;
                
                return (
                  <div 
                    key={item.id || idx}
                    onClick={() => handleMonthClick(item.id)}
                    className="flex flex-col p-2.5 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group border border-transparent hover:border-slate-100"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors border border-slate-100">
                          {getShortMonthName(item.competencia.mes)}
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-800">
                            {item.competencia.mes} {item.competencia.ano}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {item.valores.bonus ? "Incluso Bônus" : "Competência Regular"}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`text-xs font-bold ${isPositive ? 'text-emerald-800' : 'text-slate-800'}`}>
                          {formatCurrency(item.valores.salario_liquido || 0)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[9px] text-slate-400 mt-2 border-t border-slate-50 pt-1.5 px-1 justify-between">
                      <span>G/Dia: <strong className="text-slate-700">{item.trabalho?.media_por_dia ? formatCurrency(item.trabalho.media_por_dia) : "Não inf."}</strong></span>
                      <span>G/Hora: <strong className="text-slate-700">{item.trabalho?.media_por_hora ? formatCurrency(item.trabalho.media_por_hora) : "Não inf."}</strong></span>
                      <span>Descontos: <strong className="text-red-500/80">{formatCurrency(item.valores?.total_descontos || 0)}</strong></span>
                    </div>
                  </div>
                );
              })}
              {sortedHistoryList.length === 0 && (
                <p className="text-xs text-slate-400 italic py-6 text-center">Nenhuma análise encontrada para este período.</p>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Side-by-side Month-over-Month Comparator Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-left">
        <div className="border-b border-slate-100 pb-3 mb-5">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-800 text-lg">compare_arrows</span>
            Comparador Mês a Mês (Análise de Variação)
          </h3>
          <p className="text-[11px] text-slate-500">Selecione dois holerites para ver as diferenças em salário líquido, taxa por dia, e entender as oscilações de impostos e adicionais.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Competência A (Mês Principal)</label>
            <select 
              value={compAId} 
              onChange={(e) => setCompAId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="">-- Selecione o Mês A --</option>
              {sortedHistoryList.map(item => (
                <option key={item.id} value={item.id}>{item.competencia.mes} {item.competencia.ano}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Competência B (Mês Comparativo)</label>
            <select 
              value={compBId} 
              onChange={(e) => setCompBId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="">-- Selecione o Mês B --</option>
              {sortedHistoryList.map(item => (
                <option key={item.id} value={item.id}>{item.competencia.mes} {item.competencia.ano}</option>
              ))}
            </select>
          </div>

          <div>
            <button 
              onClick={handleCompareDocs}
              disabled={!compAId || !compBId || compAId === compBId}
              className="w-full bg-slate-950 text-white rounded-lg px-4 py-2 text-xs font-bold hover:bg-slate-850 disabled:opacity-50 transition-colors cursor-pointer"
            >
              Analisar Comparação
            </button>
          </div>
        </div>

        {comparisonResult && (
          <div className="mt-5 bg-slate-50/50 rounded-xl p-5 border border-slate-150/45 space-y-4 animate-fadeIn text-xs">
            <h4 className="font-extrabold text-slate-850 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
              <span className="material-symbols-outlined text-amber-700 text-sm">science</span>
              Diferenças identificadas
            </h4>
            
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-white p-3 border border-slate-100 rounded-lg">
                <span className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Dif. Líquido</span>
                <span className={`text-xs font-extrabold ${comparisonResult.diffLiq >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {comparisonResult.diffLiq >= 0 ? '+' : ''}{formatCurrency(comparisonResult.diffLiq)}
                </span>
              </div>

              <div className="bg-white p-3 border border-slate-100 rounded-lg">
                <span className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Dif. Ganho/Dia</span>
                <span className={`text-xs font-extrabold ${comparisonResult.diffDia >= 0 ? 'text-emerald-700' : 'text-red-650'}`}>
                  {comparisonResult.diffDia >= 0 ? '+' : ''}{formatCurrency(comparisonResult.diffDia)}
                </span>
              </div>

              <div className="bg-white p-3 border border-slate-100 rounded-lg">
                <span className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Dif. Dias Trab.</span>
                <span className={`text-xs font-extrabold ${comparisonResult.diffDays >= 0 ? 'text-emerald-700' : 'text-red-650'}`}>
                  {comparisonResult.diffDays >= 0 ? '+' : ''}{comparisonResult.diffDays} dias
                </span>
              </div>

              <div className="bg-white p-3 border border-slate-100 rounded-lg">
                <span className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Dif. Descontos</span>
                <span className={`text-xs font-extrabold ${comparisonResult.diffDesc <= 0 ? 'text-emerald-700' : 'text-red-650'}`}>
                  {comparisonResult.diffDesc >= 0 ? '+' : ''}{formatCurrency(comparisonResult.diffDesc)}
                </span>
              </div>

              <div className="bg-white p-3 border border-slate-100 rounded-lg col-span-2 sm:col-span-1">
                <span className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Dif. Adicionais</span>
                <span className={`text-xs font-extrabold ${comparisonResult.diffAdd >= 0 ? 'text-emerald-700' : 'text-red-500'}`}>
                  {comparisonResult.diffAdd >= 0 ? '+' : ''}{formatCurrency(comparisonResult.diffAdd)}
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-150/45 p-3.5 rounded-lg text-slate-700 font-medium leading-relaxed">
              <strong>Motivo provável da variação:</strong> {comparisonResult.motivo}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
