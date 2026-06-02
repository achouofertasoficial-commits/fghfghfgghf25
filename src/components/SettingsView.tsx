import React, { useState } from 'react';
import { User } from '../types';

interface SettingsViewProps {
  user: User;
  onUpdateUser: (updated: User) => void;
  onLogout: () => void;
  onClearAllAnalyses: () => void;
}

export default function SettingsView({ user, onUpdateUser, onLogout, onClearAllAnalyses }: SettingsViewProps) {
  const [userName, setUserName] = useState(user.nome);
  const [userEmail, setUserEmail] = useState(user.email);
  const [workerType, setWorkerType] = useState<"mensalista" | "intermitente">("mensalista");
  const [allowNotifications, setAllowNotifications] = useState(true);
  const [allowSms, setAllowSms] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      nome: userName,
      email: userEmail
    });
    alert("Alterações salvas com sucesso!");
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-4 text-left">
      {/* Header section */}
      <section className="flex flex-col gap-1 border-b border-slate-100 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 border-none">Configurações</h1>
        <p className="text-sm text-slate-500">Configure suas preferências funcionais e gerencie sua assinatura CLT.</p>
      </section>

      {/* Profile Card details */}
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs flex flex-col sm:flex-row gap-5 items-center justify-between">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left w-full sm:w-auto">
          <div className="w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg border-2 border-slate-200 shadow-xs">
            {user.nome.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">{user.nome}</h2>
            <p className="text-xs text-slate-400">{user.email}</p>
            <p className="text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold inline-block border border-emerald-100 mt-1.5 capitalize">
              Plano Gratuito • {workerType === "mensalista" ? "CLT Mensalista" : "Intermitente"}
            </p>
          </div>
        </div>
      </section>

      {/* Form sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
        
        {/* Personal details form */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs flex flex-col gap-4">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-50 pb-2">Dados do Trabalhador</h3>
          
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-600 font-semibold">Nome exibido</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="h-10 px-3 border border-slate-200 bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 focus:bg-white outline-none focus:border-slate-400 transition-all"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-600 font-semibold">Endereço de e-mail</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="h-10 px-3 border border-slate-200 bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 focus:bg-white outline-none focus:border-slate-400 transition-all"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-600 font-semibold">Tipo de trabalhador padrão</label>
              <select
                value={workerType}
                onChange={(e) => setWorkerType(e.target.value as any)}
                className="h-10 px-3 border border-slate-200 bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 focus:bg-white outline-none focus:border-slate-400 transition-all cursor-pointer"
              >
                <option value="mensalista">CLT - Carteira Assinada (Mensalista)</option>
                <option value="intermitente">Prestador / Horista (Intermitente)</option>
              </select>
            </div>

            <button
              type="submit"
              className="mt-2 h-10 w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
            >
              Salvar Alterações
            </button>
          </form>
        </div>

        {/* Notifications and system configurations */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs flex flex-col gap-4">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-50 pb-2">Preferências de Notificação</h3>
            
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer p-1 rounded-lg hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={allowNotifications}
                  onChange={(e) => setAllowNotifications(e.target.checked)}
                  className="w-4 h-4 text-emerald-800 focus:ring-emerald-800 border-slate-300 rounded cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800">Alertas de contracheques por e-mail</p>
                  <p className="text-[10px] text-slate-400">Receba análises detalhadas prontas diretamente na caixa de entrada.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-1 rounded-lg hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={allowSms}
                  onChange={(e) => setAllowSms(e.target.checked)}
                  className="w-4 h-4 text-emerald-800 focus:ring-emerald-800 border-slate-300 rounded cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800">Notificações SMS legislativas e CLT</p>
                  <p className="text-[10px] text-slate-400">Ser notificado quando houver nova alteração tributária na CLT brasileira.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Gerenciar análises */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs flex flex-col gap-4">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-50 pb-2">Gerenciar análises</h3>
            <div className="flex flex-col gap-1">
              <p className="text-xs font-bold text-slate-800">Limpar histórico de contracheques</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Remove todas as análises de contracheques salvas nesta conta. O dashboard, histórico, médias, gráficos e comparativos serão zerados.
              </p>
            </div>
            
            <button
              onClick={() => setShowConfirmModal(true)}
              className="h-10 w-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              <span>Limpar todas as análises</span>
            </button>
          </div>

          {/* Logout Action */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs flex flex-col gap-4">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-50 pb-2">Sessão do Aplicativo</h3>
            <p className="text-[11px] text-slate-400">Você está conectado como {user.email}. Desconectar remove sessões locais temporárias desta máquina.</p>
            
            <button
              onClick={onLogout}
              className="h-10 w-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Sair da conta</span>
            </button>
          </div>
        </div>

      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 scale-95 animate-scaleUp text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-4 mx-auto animate-bounce animate-duration-1000">
              <span className="material-symbols-outlined text-[24px]">warning</span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mb-2">
              Tem certeza que deseja limpar todas as análises?
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Essa ação removerá todos os contracheques analisados, valores salvos, gráficos, médias e histórico desta conta. Essa ação não pode ser desfeita.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  onClearAllAnalyses();
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                aria-label="Limpar todas as análises"
              >
                Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
