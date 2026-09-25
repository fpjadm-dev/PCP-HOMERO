import React from 'react';
import { usePCP } from '../context/PCPContext';
import { 
  LayoutDashboard, 
  ReceiptText, 
  Columns4, 
  ClipboardPen, 
  Package, 
  Database,
  Coins,
  LogOut, 
  Menu,
  X,
  Users,
  ChevronLeft,
  ChevronRight,
  Calculator
} from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  sidebarCollapsed?: boolean;
  toggleSidebar?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ 
  activeTab, 
  setActiveTab, 
  mobileMenuOpen, 
  setMobileMenuOpen,
  sidebarCollapsed = false,
  toggleSidebar
}) => {
  const { currentUser, logout } = usePCP();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'supervisor', 'operador'] },
    { id: 'pedidos', label: 'Gestão de Pedidos', icon: ReceiptText, roles: ['admin', 'supervisor'] },
    { id: 'custos', label: 'Custos de Serviço', icon: Coins, roles: ['admin', 'supervisor'] },
    { id: 'orcamentos', label: (currentUser?.role === 'vendedor' || currentUser?.permissoes?.orcamentos === 'vendedor') ? 'Catálogo de Preços' : 'Orçamento de Produtos', icon: Calculator, roles: ['admin', 'supervisor', 'vendedor'] },
    { id: 'kanban', label: 'Kanban Dinâmico', icon: Columns4, roles: ['admin', 'supervisor', 'operador'] },
    { id: 'apontamento', label: 'Apontamentos', icon: ClipboardPen, roles: ['admin', 'supervisor', 'operador'] },
    { id: 'estoque', label: 'Estoque de Insumos', icon: Package, roles: ['admin', 'supervisor', 'operador'] },
    { id: 'cadastros', label: 'Cadastros da Fábrica', icon: Database, roles: ['admin', 'supervisor'] },
    { id: 'usuarios', label: 'Usuários e Permissões', icon: Users, roles: ['admin'] },
  ];

  // Filtra itens de menu conforme o cargo e permissões por módulo do usuário
  const filteredMenuItems = currentUser 
    ? menuItems.filter(item => {
        const emailLower = currentUser.email?.toLowerCase().trim();
        const isSuperAdmin = emailLower === 'fpjadm@gmail.com' || emailLower === 'admin@homero.com.br';
        
        if (item.id === 'usuarios') {
          return isSuperAdmin || currentUser.role === 'admin';
        }

        if (isSuperAdmin) return true;

        if (currentUser.permissoes) {
          const perm = currentUser.permissoes[item.id as keyof typeof currentUser.permissoes];
          return perm && perm !== 'nenhum';
        }
        
        return item.roles.includes(currentUser.role);
      })
    : [];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'PPCP';
      case 'supervisor': return 'Supervisor de Turno';
      case 'operador': return 'Operador Industrial';
      case 'vendedor': return 'Vendedor Comercial';
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'supervisor': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'operador': return 'bg-emerald-100 text-emerald-800 border-emerald-250';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!currentUser) return null;

  return (
    <>
      {/* 1. HEADER DE TOPO MOBILE (visível somente em telas pequenas) */}
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="rounded p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Menu"
            id="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-sans text-sm font-black text-white">
              H
            </div>
            <div>
              <h1 className="font-sans text-xs font-bold tracking-tight text-slate-900 leading-none">Homero</h1>
              <span className="font-mono text-[9px] uppercase tracking-wide text-slate-400">PCP v2.0</span>
            </div>
          </div>
        </div>

        {/* DIREÇÃO MOBILE LOGOUT RÁPIDO */}
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 text-3xs font-mono font-bold border border-slate-250">
            {currentUser.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <button 
            onClick={logout}
            className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* 2. SIDEBAR CORPORATIVO DESKTOP (Sleek Interface Style) */}
      <aside className={`sidebar hidden ${sidebarCollapsed ? 'w-20 px-3' : 'w-60 p-6'} flex-col py-6 text-white md:flex bg-[#0f172a] shrink-0 min-h-screen transition-all duration-300 ease-in-out`}>
        {/* LOGO AREA */}
        <div className={`mb-10 flex items-center ${sidebarCollapsed ? 'flex-col gap-4 justify-center' : 'justify-between gap-3'}`}>
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-2 rounded-lg shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2"/>
                <path d="M3 9h18"/>
                <path d="M9 21V9"/>
              </svg>
            </div>
            {!sidebarCollapsed && (
              <h1 className="text-sm font-bold leading-none tracking-tight">
                HOMERO<br/>
                <span className="text-[10px] font-medium text-slate-400">EMBALAGENS</span>
              </h1>
            )}
          </div>

          {toggleSidebar && (
            <button
              onClick={toggleSidebar}
              className="rounded-lg bg-slate-800 p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
              title={sidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
              id="sidebar-toggle-btn"
            >
              {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          )}
        </div>

        {/* NAVIGATION AREA */}
        <nav className="flex-1 space-y-2">
          {filteredMenuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`flex items-center ${sidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 p-3'} rounded-lg cursor-pointer transition-all ${
                  isActive 
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' 
                    : 'text-slate-400 hover:bg-slate-800 transition-colors'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
                id={`nav-item-${item.id}`}
              >
                <Icon size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="font-semibold text-xs font-sans truncate">{item.label}</span>}
              </div>
            );
          })}
        </nav>

        {/* PROFILE BLOCK */}
        <div className={`pt-6 border-t border-slate-800 space-y-3.5 ${sidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
          <div className="flex items-center gap-3 w-full">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold font-mono text-slate-200 shrink-0 mx-auto md:mx-0">
              {currentUser.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate leading-tight">{currentUser.nome}</div>
                <div className="text-[10px] text-slate-500 uppercase font-medium truncate mt-0.5">{getRoleLabel(currentUser.role)}</div>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            className={`flex items-center justify-center gap-2 rounded-xl border border-slate-850 bg-slate-900/40 hover:bg-rose-950/25 py-2.5 font-sans text-xs font-semibold text-rose-450 hover:text-rose-300 transition-all cursor-pointer shadow-3xs hover:border-rose-900/30 ${sidebarCollapsed ? 'w-10 h-10 p-0 rounded-full' : 'w-full'}`}
            title="Sair do Sistema"
            id="desktop-logout-btn"
          >
            <LogOut size={14} className="shrink-0" />
            {!sidebarCollapsed && <span>Sair do Sistema</span>}
          </button>
          {!sidebarCollapsed && (
            <div className="text-[8.5px] text-slate-500 font-sans tracking-normal text-center pt-1 leading-normal border-t border-slate-800/40">
              Desenvolvido por <span className="text-slate-400 font-semibold">Francisco P. Junior</span> • Todos os direitos reservados
            </div>
          )}
        </div>
      </aside>

      {/* 3. MOBILE MENU SLIDER DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" id="mobile-sidebar-overlay">
          {/* Backdrop screen */}
          <div className="fixed inset-0 bg-black/40 backdrop-blur-3xs" onClick={() => setMobileMenuOpen(false)}></div>
          
          <div className="relative flex w-60 max-w-xs flex-col bg-[#0f172a] text-white p-5 shadow-xl min-h-screen">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <span className="font-sans text-xs font-bold text-slate-300">Menu de Navegação</span>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800"
                id="close-mobile-menu-btn"
              >
                <X size={18} />
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 space-y-2">
              {filteredMenuItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      isActive 
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' 
                        : 'text-slate-400 hover:bg-slate-800 transition-colors'
                    }`}
                    id={`mobile-nav-item-${item.id}`}
                  >
                    <Icon size={18} />
                    <span className="font-semibold text-xs font-sans">{item.label}</span>
                  </div>
                );
              })}
            </nav>

            {/* Profile & Logout at bottom for Mobile */}
            <div className="mt-auto border-t border-slate-800 pt-4">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
                  {currentUser.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-bold leading-none">{currentUser.nome}</div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase mt-1">{getRoleLabel(currentUser.role)}</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 font-sans text-xs font-semibold text-rose-450 hover:bg-rose-950/20"
                id="mobile-logout-btn"
              >
                <LogOut size={16} />
                Sair do Sistema
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
