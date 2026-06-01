import React from 'react';
import { ContrachequeAnalise } from '../types';
import { getCompetenceValue } from '../services/analysisStorage';

interface MonthDetailsViewProps {
  analysedList: ContrachequeAnalise[];
  selectedMonthId: string;
  setSelectedMonthId: (id: string) => void;
}

export default function MonthDetailsView({ analysedList, selectedMonthId, setSelectedMonthId }: MonthDetailsViewProps) {
  
  // Sort the list descending by competence real value (newest first)
  const sortedList = [...analysedList].sort((a, b) => getCompetenceValue(b) - getCompetenceValue(a));

  // Find current active month
  const activeMonth = sortedList.find(item => item.id === selectedMonthId) || sortedList[0];

  if (!activeMonth) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Nenhum holerite localizado.</p>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (val: any) => {
    if (val === null || val === undefined || isNaN(Number(val))) return "R$ 0,00";
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Classify proventos and descontos arrays
  const proventos = activeMonth.itens.filter(item => item.tipo === 'provento');
  const descontos = activeMonth.itens.filter(item => item.tipo === 'desconto');

  return (
    <div className="space-y-6 text-left">
      {/* Month Picker Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 border-none">Detalhamento Financeiro</h1>
          <p className="text-sm text-slate-500 mt-1">
            Visualização de proventos, tributação e médias diárias da folha.
          </p>
        </div>
        <div>
          <select 
            value={selectedMonthId}
            onChange={(e) => setSelectedMonthId(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-800 outline-none cursor-pointer shadow-xs"
          >
            {sortedList.map((item) => (
              <option key={item.id} value={item.id}>
                {item.competencia.mes} {item.competencia.ano}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Grid containing micro averages and days/hours stats */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Days worked card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Dias Trabalhados</span>
            <span className="text-xl font-bold text-slate-950">
              {activeMonth.trabalho.dias_trabalhados !== null && activeMonth.trabalho.dias_trabalhados !== undefined ? `${activeMonth.trabalho.dias_trabalhados} dias` : "Não informado"}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100/50">
            <span className="material-symbols-outlined text-slate-500">calendar_today</span>
          </div>
        </div>

        {/* Hours worked card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Horas Trabalhadas</span>
            <span className="text-xl font-bold text-slate-950">
              {activeMonth.trabalho.horas_trabalhadas !== null && activeMonth.trabalho.horas_trabalhadas !== undefined ? `${activeMonth.trabalho.horas_trabalhadas} horas` : "Não informado"}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100/50">
            <span className="material-symbols-outlined text-slate-500">schedule</span>
          </div>
        </div>

        {/* Earnings per day */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between animate-fadeIn">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Ganho por dia trabalhado</span>
            <span className="text-xl font-bold text-slate-950">{formatCurrency(activeMonth.trabalho.media_por_dia)}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100/50">
            <span className="material-symbols-outlined text-slate-500">price_change</span>
          </div>
        </div>

        {/* Earnings per hour */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between animate-fadeIn">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Ganho por hora útil</span>
            <span className="text-xl font-bold text-slate-950">{formatCurrency(activeMonth.trabalho.media_por_hora)}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100/50">
            <span className="material-symbols-outlined text-slate-500">payments</span>
          </div>
        </div>

      </section>

      {/* Breakdown list containing additions and deductions */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Proventos list */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-emerald-100/60 bg-emerald-50/20 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-emerald-700 text-[18px]">add_circle</span>
              Proventos e Adicionais
            </h3>
            <span className="text-xs font-bold text-emerald-800">
              {formatCurrency(activeMonth.valores.salario_bruto + (activeMonth.valores.total_adicionais || 0))}
            </span>
          </div>

          <div className="p-2 divide-y divide-slate-100/40">
            {proventos.map((prov, i) => (
              <div key={i} className="flex items-center justify-between p-3">
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800">{prov.nome}</p>
                  <p className="text-[10px] text-slate-400">Ref: {prov.referencia || "Automática"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-emerald-700">+ {formatCurrency(prov.valor)}</p>
                </div>
              </div>
            ))}
            {proventos.length === 0 && (
              <p className="text-xs text-slate-400 italic p-4">Nenhum provento cadastrado.</p>
            )}
          </div>
        </div>

        {/* Descontos list */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-red-100/60 bg-red-50/10 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-red-500 text-[18px]">remove_circle</span>
              Deduções e Impostos
            </h3>
            <span className="text-xs font-bold text-red-600">
              - {formatCurrency(activeMonth.valores.total_descontos)}
            </span>
          </div>

          <div className="p-2 divide-y divide-slate-100/40">
            {descontos.map((desc, i) => (
              <div key={i} className="flex items-center justify-between p-3">
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800">{desc.nome}</p>
                  <p className="text-[10px] text-slate-400">Ref: {desc.referencia || "Legal"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-red-600">- {formatCurrency(desc.valor)}</p>
                </div>
              </div>
            ))}
            {descontos.length === 0 && (
              <p className="text-xs text-slate-400 italic p-4">Nenhum desconto cadastrado.</p>
            )}
          </div>
        </div>
      </section>

      {/* Net values callout */}
      <section className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between shadow-md">
        <div className="flex items-center gap-3 text-left mb-4 sm:mb-0">
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-white">
            <span className="material-symbols-outlined">account_balance_wallet</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Cálculo de Liquidação Final</h4>
            <p className="text-[10px] text-slate-300">Resumo de depósitos e repasse líquido consolidado.</p>
          </div>
        </div>

        <div className="text-right flex flex-col sm:items-end">
          <span className="text-xs text-slate-400">Salário de Repasse Bancário:</span>
          <span className="text-2xl font-bold text-emerald-400">{formatCurrency(activeMonth.valores.salario_liquido)}</span>
        </div>
      </section>

    </div>
  );
}
