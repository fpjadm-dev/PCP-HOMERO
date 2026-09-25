import React, { useState } from 'react';
import { PCPProvider, usePCP } from './context/PCPContext';
import { Navigation } from './components/Navigation';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { PedidosView } from './components/PedidosView';
import { KanbanView } from './components/KanbanView';
import { ApontamentosView } from './components/ApontamentosView';
import { EstoqueView } from './components/EstoqueView';
import { CadastrosView } from './components/CadastrosView';
import { CustosView } from './components/CustosView';
import { UsuariosView } from './components/UsuariosView';
import { OrcamentosView } from './components/OrcamentosView';
import { Bell, ShieldAlert } from 'lucide-react';

function ActiveViewRenderer({ activeTab }: { activeTab: string }) {
  const { currentUser } = usePCP();

  if (!currentUser) return <LoginView />;

  const emailLower = currentUser.email?.toLowerCase().trim();
  const isSuperAdmin = emailLower === 'fpjadm@gmail.com' || emailLower === 'admin@homero.com.br';

  const hasAccess = (() => {
    if (isSuperAdmin) return true;

    // Check module permissions first
    if (currentUser.permissoes) {
      const perm = currentUser.permissoes[activeTab as keyof typeof currentUser.permissoes];
      if (perm !== undefined) {
        return perm !== 'nenhum';
      }
    }

    // Role-based fallbacks
    switch (activeTab) {
      case 'dashboard':
        return ['admin', 'supervisor', 'operador'].includes(currentUser.role);
      case 'pedidos':
        return ['admin', 'supervisor'].includes(currentUser.role);
      case 'custos':
        return ['admin', 'supervisor'].includes(currentUser.role);
      case 'orcamentos':
        return ['admin', 'supervisor'].includes(currentUser.role);
      case 'kanban':
        return ['admin', 'supervisor', 'operador'].includes(currentUser.role);
      case 'apontamento':
        return ['admin', 'supervisor', 'operador'].includes(currentUser.role);
      case 'estoque':
        return ['admin', 'supervisor', 'operador'].includes(currentUser.role);
      case 'cadastros':
        return ['admin', 'supervisor'].includes(currentUser.role);
      case 'usuarios':
        return currentUser.role === 'admin';
      default:
        return true;
    }
  })();

  if (!hasAccess) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-450 max-w-xl mx-auto my-12 space-y-4 flex flex-col justify-center items-center">
        <div className="p-3 bg-red-50 text-red-600 rounded-2xl w-fit">
          <ShieldAlert size={36} />
        </div>
        <div className="space-y-1">
          <h3 className="font-sans text-base font-bold text-slate-800">Acesso Restrito</h3>
          <p className="font-sans text-xs text-slate-500 max-w-sm mx-auto leading-normal">
            Você não possui permissão de acesso para visualizar o módulo de {activeTab === 'orcamentos' ? 'Orçamentos de Produtos' : activeTab}. Entre em contato com o administrador do sistema para liberar seu perfil.
          </p>
        </div>
      </div>
    );
  }

  switch (activeTab) {
    case 'dashboard':
      return <DashboardView />;
    case 'pedidos':
      return <PedidosView />;
    case 'custos':
      return <CustosView />;
    case 'orcamentos':
      return <OrcamentosView />;
    case 'kanban':
      return <KanbanView />;
    case 'apontamento':
      return <ApontamentosView />;
    case 'estoque':
      return <EstoqueView />;
    case 'cadastros':
      return <CadastrosView />;
    case 'usuarios':
      return <UsuariosView />;
    default:
      return <DashboardView />;
  }
}

function PCPAppContent() {
  const { currentUser, notifications, notificationsClear, isQuotaExceeded } = usePCP();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('pcp_sidebar_collapsed');
    return saved === 'true';
  });

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('pcp_sidebar_collapsed', next.toString());
      } catch {
        // Silently ignore storage quota or access restriction
      }
      return next;
    });
  };

  // Se o usuário não estiver logado, exibe apenas a tela de Login Gateway
  if (!currentUser) {
    return <LoginView />;
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900 font-sans antialiased md:flex-row flex-col overflow-x-hidden">
      {/* Sidebar de navegação esquerda e topo mobile */}
      <Navigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        mobileMenuOpen={mobileMenuOpen} 
        setMobileMenuOpen={setMobileMenuOpen} 
        sidebarCollapsed={sidebarCollapsed}
        toggleSidebar={toggleSidebar}
      />

      {/* Área Central / Lateral de Trabalho (Sleek Interface Style) */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f1f5f9] min-h-screen">
        
        {/* HEADER DE TOPO - DESKTOP */}
        <header className="hidden md:flex sticky top-0 z-30 h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-8 shrink-0 shadow-xs">
          <div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400 font-bold leading-none block">Planta Industrial</span>
            <h2 className="text-base font-extrabold text-slate-800 mt-1 leading-none tracking-tight">
              {activeTab === 'dashboard' && 'Painel de Controle PCP'}
              {activeTab === 'pedidos' && 'Gestão de Pedidos e Lotes'}
              {activeTab === 'custos' && 'Custos de Terceirização de Serviços'}
              {activeTab === 'orcamentos' && 'Orçamento de Produtos Acabados'}
              {activeTab === 'kanban' && 'Fila Kanban de Máquinas'}
              {activeTab === 'apontamento' && 'Apontamento de Produção'}
              {activeTab === 'estoque' && 'Estoque de Insumos'}
              {activeTab === 'cadastros' && 'Cadastros Gerais da Fábrica'}
              {activeTab === 'usuarios' && 'Usuários e Permissões'}
            </h2>
          </div>

          <div className="flex items-center gap-5">
            {/* NOTIFICAÇÕES BELL */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                id="notification-bell-btn"
              >
                <Bell size={18} />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </button>

              {showNotifications && (
                <div 
                  className="absolute right-0 mt-3.5 w-80 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl z-50 ring-1 ring-black/5"
                  id="notifications-dropdown"
                >
                  <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-sans text-xs font-bold text-slate-800">Notificações Recentes</span>
                    {notifications.length > 0 && (
                      <button 
                        onClick={notificationsClear}
                        className="font-sans text-[10px] text-rose-500 hover:underline font-semibold"
                        id="clear-notifications"
                      >
                        Limpar tudo
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 font-medium">Nenhum aviso no momento.</div>
                  ) : (
                    <div className="space-y-3 pt-1">
                      {notifications.map(n => (
                        <div 
                          key={n.id} 
                          className={`rounded-lg p-2.5 text-[11px] border-l-3 leading-tight ${
                            n.type === 'error' ? 'bg-red-50 border-red-500 text-red-900' :
                            n.type === 'warning' ? 'bg-amber-50 border-amber-500 text-amber-950' :
                            n.type === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-900' :
                            'bg-blue-50 border-blue-500 text-blue-900'
                          }`}
                        >
                          <div className="flex justify-between font-bold">
                            <span className="uppercase text-[9px] tracking-wider">{n.type}</span>
                            <span className="font-mono text-[9px] text-slate-400 font-normal">{n.timestamp}</span>
                          </div>
                          <p className="mt-1 font-normal text-slate-750 leading-normal">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* STATUS DO SISTEMA */}
            <div className={`rounded-lg border px-3.5 py-1.5 flex items-center gap-2 text-[11px] font-medium shadow-2xs ${
              isQuotaExceeded 
                ? 'bg-amber-50 border-amber-200 text-amber-700 font-bold animate-pulse' 
                : 'bg-white border-slate-200 text-slate-600'
            }`}>
              <span className={`h-2 w-2 rounded-full ${isQuotaExceeded ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></span> 
              {isQuotaExceeded ? 'Cota de Conexões Excedida' : 'Sistema Operacional'}
            </div>

            {/* DATA DO DIA */}
            <div className="rounded-lg bg-slate-800 text-white px-3.5 py-1.5 text-xs font-semibold font-mono shadow-2xs uppercase tracking-tight">
              28 de Mai, 2026
            </div>
          </div>
        </header>

        {/* PAINEL CENTRAL DYNAMIC VIEW */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="w-full">
            {isQuotaExceeded && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-xs flex flex-col sm:flex-row gap-4 items-start animate-fade-in" id="quota-exceeded-banner">
                <div className="p-3 bg-amber-100 text-amber-800 rounded-lg shrink-0">
                  <ShieldAlert size={24} className="animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-amber-900">Limite de Cota Diária do Firebase Excedido (GCP Free Tier)</h4>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    O banco de dados atingiu o limite gratuito de 50.000 leituras diárias (Firestore Quota Exceeded). 
                    Por este motivo, novos cadastros de produtos ou pedidos que você fizer <strong>ficarão salvos temporariamente apenas no seu navegador</strong> 
                    e não sincronizarão em tempo real para os demais usuários conectados até que a cota seja redefinida.
                  </p>
                  <div className="pt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-amber-800">
                    <span>💡 Solução para o Proprietário (fpjadm@gmail.com):</span>
                    <a 
                      href="https://console.firebase.google.com/" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="underline hover:text-amber-950 font-bold"
                    >
                      Ativar plano "Pay-As-You-Go" (Blaze) no Firebase Console
                    </a>
                    <span className="hidden sm:inline">•</span>
                    <span>Reset diário automático: Meia-noite (Horário do Pacífico / UTC)</span>
                  </div>
                </div>
              </div>
            )}
            <ActiveViewRenderer activeTab={activeTab} />
          </div>
        </main>

        {/* FOOTER CORPORATIVO */}
        <footer className="border-t border-slate-200 bg-white py-4 text-center font-sans text-[10px] text-slate-400 shrink-0 font-medium space-y-1">
          <div className="text-slate-500 font-semibold text-2xs uppercase tracking-wider" id="developer-by-credits">Sistema desenvolvido por Francisco P. Junior • Todos os direitos reservados</div>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <PCPProvider>
      <PCPAppContent />
    </PCPProvider>
  );
}
