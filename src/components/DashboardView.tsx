import React from 'react';
import { ContrachequeAnalise, User, Screen } from '../types';

interface DashboardViewProps {
  analysedList: ContrachequeAnalise[];
  user: User;
  onNavigate: (screen: Screen) => void;
  setSelectedMonthId: (id: string) => void;
}

export default function DashboardView({ analysedList, user, onNavigate, setSelectedMonthId }: DashboardViewProps) {
  if (analysedList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-450 border border-slate-100 mb-6">
          <span className="material-symbols-outlined text-3xl">upload_file</span>
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">Sem contracheques analisados</h2>
        <p className="text-xs text-slate-500 leading-relaxed mb-6">
          Você limpou o histórico ou ainda não enviou nenhum contracheque. Envie seu holerite para começar a monitorar suas rendas e descontos de forma unificada!
        </p>
        <button
          onClick={() => onNavigate('upload')}
          className="bg-emerald-800 hover:bg-emerald-900 text-white rounded-full px-6 py-3 font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Enviar contracheque</span>
        </button>
      </div>
    );
  }

  function getCompetenceValue(item: ContrachequeAnalise) {
    const meses: Record<string, number> = {
      Janeiro: 0,
      Fevereiro: 1,
      Março: 2,
      Abril: 3,
      Maio: 4,
      Junho: 5,
      Julho: 6,
      Agosto: 7,
      Setembro: 8,
      Outubro: 9,
      Novembro: 10,
      Dezembro: 11
    };

    return Number(item.competencia.ano || 0) * 12 + (meses[item.competencia.mes || ""] ?? 0);
  }

  const sortedAnalyses = [...analysedList].sort((a, b) => getCompetenceValue(a) - getCompetenceValue(b));

  // Use the last (latest chronologically) analysed item to populate wages
  const latestItem = sortedAnalyses[sortedAnalyses.length - 1];

  // Comparative month details
  const previousItem = sortedAnalyses[sortedAnalyses.length - 2];
  let comparisonText = "Sem mês anterior para comparar";
  let showTrendingIcon = false;
  let isPositive = false;

  if (previousItem) {
    const currentNet = latestItem.valores.salario_liquido || 0;
    const previousNet = previousItem.valores.salario_liquido || 0;

    if (previousNet > 0) {
      const percentageDiff = ((currentNet - previousNet) / previousNet) * 100;
      const roundedDiff = Math.abs(percentageDiff).toFixed(1);
      
      if (percentageDiff > 0) {
        comparisonText = `+${roundedDiff}% em relação ao mês anterior`;
        showTrendingIcon = true;
        isPositive = true;
      } else if (percentageDiff < 0) {
        comparisonText = `-${roundedDiff}% em relação ao mês anterior`;
        showTrendingIcon = true;
        isPositive = false;
      } else {
        comparisonText = `Sem variação em relação ao mês anterior`;
        showTrendingIcon = false;
      }
    }
  }

  // Format money function
  const formatCurrency = (val: any) => {
    if (val === null || val === undefined || isNaN(Number(val))) return "R$ 0,00";
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const brutoTotalFolha =
    latestItem.valores.bruto_total_folha ??
    latestItem.valores.total_proventos ??
    latestItem.valores.salario_bruto ??
    null;

  const clampPercent = (value: number) => {
    return Math.min(Math.max(value, 0), 100);
  };

  const netRatio = brutoTotalFolha && brutoTotalFolha > 0
    ? clampPercent(Math.round(((latestItem.valores.salario_liquido || 0) / brutoTotalFolha) * 100))
    : 0;

  const discountRatio = brutoTotalFolha && brutoTotalFolha > 0
    ? clampPercent(Math.round(((latestItem.valores.total_descontos || 0) / brutoTotalFolha) * 100))
    : 0;

  // Pie chart calculation
  const strokeDash = `${netRatio} ${discountRatio}`;

  // Month labels mapping for Portuguese
  const shortMonths: Record<string, string> = {
    "Janeiro": "Jan", "Fevereiro": "Fev", "Março": "Mar", "Abril": "Abr",
    "Maio": "Mai", "Junho": "Jun", "Julho": "Jul", "Agosto": "Ago",
    "Setembro": "Set", "Outubro": "Out", "Novembro": "Nov", "Dezembro": "Dez"
  };

  const getShortMonthName = (fullMonth: string | null) => {
    if (!fullMonth) return "Mês";
    return shortMonths[fullMonth] || fullMonth.substring(0, 3);
  };

  const getMonthYearLabel = (item: ContrachequeAnalise) => {
    if (!item.competencia) return "";
    const mesAbrv = getShortMonthName(item.competencia.mes);
    const ano = String(item.competencia.ano || "").substring(2);
    return `${mesAbrv}/${ano}`;
  };

  const maxNet = Math.max(...sortedAnalyses.map(item => Number(item.valores.salario_liquido || 0)), 1);

  // Handle detailed month routing
  const viewMonthDetails = (id: string) => {
    setSelectedMonthId(id);
    onNavigate('month_details');
  };

  return (
    <div className="space-y-6">
      {/* Header section with notification badge */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/40 p-4 rounded-2xl border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Olá, {user.nome}</h1>
          <p className="text-xs text-slate-500 mt-0.5">Aqui está o resumo financeiro consolidado do seu último contracheque.</p>
        </div>
        <div className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full shadow-xs border ${
          previousItem 
            ? isPositive 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
              : 'bg-rose-50 border-rose-100 text-rose-800'
            : 'bg-slate-55 border-slate-100/80 text-slate-500'
        }`}>
          {showTrendingIcon && (
            <span className={`material-symbols-outlined text-sm ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isPositive ? 'trending_up' : 'trending_down'}
            </span>
          )}
          <span className="text-xs font-semibold">{comparisonText}</span>
        </div>
      </section>

      {/* Main Income Bento Cards layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Salário Líquido Green highlight panel */}
        <div className="bg-emerald-800 text-white rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[160px] shadow-sm transform transition-all hover:translate-y-[-2px]">
          {/* Ambient background blur circles */}
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-black/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="relative z-10 flex items-center justify-between mb-4">
            <h2 className="text-xs text-emerald-100 font-bold uppercase tracking-wider">Salário Líquido</h2>
            <span className="material-symbols-outlined text-emerald-200 text-xl font-light">account_balance_wallet</span>
          </div>
          <div className="relative z-10">
            <p className="text-3xl font-bold tracking-tight">{formatCurrency(latestItem.valores.salario_liquido)}</p>
          </div>
        </div>

        {/* Salário Bruto card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col justify-between min-h-[160px] shadow-xs hover:shadow-sm transition-all transform hover:translate-y-[-2px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs text-slate-500 font-bold uppercase tracking-wider">Bruto Total da Folha</h2>
            <span className="material-symbols-outlined text-slate-400 text-xl">payments</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{formatCurrency(brutoTotalFolha)}</p>
          </div>
        </div>

        {/* Descontos card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col justify-between min-h-[160px] shadow-xs hover:shadow-sm transition-all transform hover:translate-y-[-2px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total de Descontos</h2>
            <span className="material-symbols-outlined text-slate-400 text-xl">receipt_long</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-rose-600 tracking-tight">- {formatCurrency(latestItem.valores.total_descontos)}</p>
          </div>
        </div>
      </div>

      {/* Row of Micro Averages stats */}
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2">Métricas Adicionais Extraídas</h3>
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[150px] bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-700 border border-slate-100">
            <span className="material-symbols-outlined text-lg">dark_mode</span>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold">Adicional Noturno</p>
            <p className="text-sm font-bold text-slate-800">{formatCurrency(latestItem.valores.adicional_noturno_valor)}</p>
          </div>
        </div>

        <div className="flex-1 min-w-[150px] bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-700 border border-slate-100">
            <span className="material-symbols-outlined text-lg">more_time</span>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold">Horas Extras</p>
            <p className="text-sm font-bold text-slate-800">{formatCurrency(latestItem.valores.horas_extras_valor)}</p>
          </div>
        </div>

        <div className="flex-1 min-w-[150px] bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-700 border border-slate-100">
            <span className="material-symbols-outlined text-lg">today</span>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold">Dias Trabalhados</p>
            <p className="text-sm font-bold text-slate-800">
              {latestItem.trabalho.dias_trabalhados !== null && latestItem.trabalho.dias_trabalhados !== undefined ? `${latestItem.trabalho.dias_trabalhados} dias` : "Não informado"}
            </p>
          </div>
        </div>

        {latestItem.valores.provento_horas_trabalhadas !== null && latestItem.valores.provento_horas_trabalhadas !== undefined && (
          <div className="flex-1 min-w-[150px] bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3 shadow-xs">
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-700 border border-slate-100">
              <span className="material-symbols-outlined text-lg">hourglass_empty</span>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold">Provento por Horas</p>
              <p className="text-sm font-bold text-slate-800">{formatCurrency(latestItem.valores.provento_horas_trabalhadas)}</p>
            </div>
          </div>
        )}

        <div className="flex-1 min-w-[150px] bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-700 border border-slate-100">
            <span className="material-symbols-outlined text-lg">calculate</span>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold">Média por Dia</p>
            <p className="text-sm font-bold text-slate-800">{formatCurrency(latestItem.trabalho.media_por_dia)}</p>
          </div>
        </div>

        <div className="flex-grow min-w-[150px] bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-700 border border-slate-100">
            <span className="material-symbols-outlined text-lg">schedule</span>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold">Média por Hora</p>
            <p className="text-sm font-bold text-slate-800">{formatCurrency(latestItem.trabalho.media_por_hora)}</p>
          </div>
        </div>
      </div>

      {/* Row of visual Charts */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Net Income Trend Bar Chart (8 Columns on md) */}
        <div className="md:col-span-8 bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-900">Evolução da Renda Líquida</h3>
            <button 
              onClick={() => onNavigate('history')}
              className="text-xs text-emerald-800 hover:text-emerald-950 font-semibold transition-colors"
            >
              Ver Histórico Completo
            </button>
          </div>

          {/* Graphical Bars Area */}
          <div className="h-60 w-full flex items-end justify-between gap-4 pt-4 relative border-b border-slate-200">
            {/* Background grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between z-0 pointer-events-none pb-8">
              <div className="w-full h-px bg-slate-100/50" />
              <div className="w-full h-px bg-slate-100/100" />
              <div className="w-full h-px bg-slate-100/100" />
              <div className="w-full h-px bg-slate-100/100" />
            </div>

            {/* Invert list to show chronologically if we have months */}
            {sortedAnalyses.map((item, index) => {
              const netValue = item.valores.salario_liquido || 0;
              const barHeightPct = Math.min(Math.max((netValue / maxNet) * 100, 8), 100);
              const isLast = index === sortedAnalyses.length - 1;

              return (
                <div 
                  key={item.id || index} 
                  onClick={() => viewMonthDetails(item.id)}
                  className="flex-1 flex flex-col items-center gap-2 z-10 group cursor-pointer"
                >
                  <div 
                    className={`w-full max-w-[48px] rounded-t-sm transition-all duration-300 relative ${
                      isLast 
                        ? 'bg-emerald-700 shadow-md transform hover:-translate-y-1' 
                        : 'bg-emerald-600/30 hover:bg-emerald-600/75'
                    }`}
                    style={{ height: `${barHeightPct}%` }}
                  >
                    {/* Tooltip detail block */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-955 text-white text-[10px] font-bold py-1 px-2.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md z-40 bg-slate-900">
                      {formatCurrency(netValue)}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{getMonthYearLabel(item)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Proporção Bruta Donut Circle Chart (4 Columns on md) */}
        <div className="md:col-span-4 bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex flex-col items-center justify-center text-center">
          <div className="w-full text-left mb-6">
            <h3 className="font-bold text-slate-900">Proporção Bruta</h3>
          </div>

          <div className="relative w-48 h-48 rounded-full flex items-center justify-center mb-6">
            {/* SVG circle donut */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="transparent"
                stroke="#e2e8f0" /* Neutral / Gray background ratio */
                strokeWidth="3.2"
              />
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="transparent"
                stroke="#006c49" /* Success Secondary Green */
                strokeWidth="3.2"
                strokeDasharray={`${netRatio} ${discountRatio}`}
                strokeDashoffset="25"
                className="transition-all duration-500 ease-out"
              />
            </svg>

            {/* Inner detailed absolute tags */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-xs text-slate-400 font-semibold">Líquido</span>
              <span className="text-2xl font-bold text-emerald-800">{netRatio}%</span>
            </div>
          </div>

          {/* Legend indicator tags */}
          <div className="w-full flex justify-around border-t border-slate-100 pt-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-700" />
              <span className="text-xs font-semibold text-slate-500">Líquido ({netRatio}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="text-xs font-semibold text-slate-500">Descontos ({discountRatio}%)</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
