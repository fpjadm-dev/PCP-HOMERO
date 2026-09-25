import React, { useState } from 'react';
import { usePCP } from '../context/PCPContext';
import { User, UserRole, UserPermissions } from '../types';
import { ConfirmationDialog } from './ConfirmationDialog';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Check, 
  Trash2, 
  Plus, 
  ShieldAlert, 
  FileLock, 
  ChevronRight,
  UserCog,
  RefreshCw
} from 'lucide-react';

export const UsuariosView: React.FC = () => {
  const { dbUsers, salvarUsuario, excluirUsuario, currentUser } = usePCP();

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const triggerConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: { confirmLabel?: string; variant?: 'danger' | 'warning' | 'info' }
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmLabel: options?.confirmLabel,
      variant: options?.variant
    });
  };

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form states for new/edit
  const [newEmail, setNewEmail] = useState('');
  const [newNome, setNewNome] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('operador');
  const [newTurno, setNewTurno] = useState('Manhã');
  const [newAprovado, setNewAprovado] = useState(false);

  const [permDashboard, setPermDashboard] = useState<'nenhum' | 'ler' | 'escrever'>('ler');
  const [permPedidos, setPermPedidos] = useState<'nenhum' | 'ler' | 'escrever'>('nenhum');
  const [permCustos, setPermCustos] = useState<'nenhum' | 'ler' | 'escrever'>('nenhum');
  const [permOrcamentos, setPermOrcamentos] = useState<'nenhum' | 'vendedor' | 'ler' | 'escrever'>('nenhum');
  const [permKanban, setPermKanban] = useState<'nenhum' | 'ler' | 'escrever'>('escrever');
  const [permApontamento, setPermApontamento] = useState<'nenhum' | 'ler' | 'escrever'>('escrever');
  const [permEstoque, setPermEstoque] = useState<'nenhum' | 'ler' | 'escrever'>('ler');
  const [permCadastros, setPermCadastros] = useState<'nenhum' | 'ler' | 'escrever'>('nenhum');

  const modulesList = [
    { id: 'dashboard', label: 'Dashboard / OEE', value: permDashboard, setter: setPermDashboard },
    { id: 'pedidos', label: 'Gestão de Pedidos', value: permPedidos, setter: setPermPedidos },
    { id: 'custos', label: 'Custos de Serviço', value: permCustos, setter: setPermCustos },
    { id: 'orcamentos', label: 'Orçamentos de Produtos', value: permOrcamentos, setter: setPermOrcamentos },
    { id: 'kanban', label: 'Kanban Dinâmico', value: permKanban, setter: setPermKanban },
    { id: 'apontamento', label: 'Apontamentos', value: permApontamento, setter: setPermApontamento },
    { id: 'estoque', label: 'Estoque de Insumos', value: permEstoque, setter: setPermEstoque },
    { id: 'cadastros', label: 'Cadastros da Fábrica', value: permCadastros, setter: setPermCadastros },
  ];

  const applyPreset = (presetRole: UserRole) => {
    if (presetRole === 'admin') {
      setPermDashboard('escrever');
      setPermPedidos('escrever');
      setPermCustos('escrever');
      setPermOrcamentos('escrever');
      setPermKanban('escrever');
      setPermApontamento('escrever');
      setPermEstoque('escrever');
      setPermCadastros('escrever');
    } else if (presetRole === 'supervisor') {
      setPermDashboard('escrever');
      setPermPedidos('escrever');
      setPermCustos('ler');
      setPermOrcamentos('ler');
      setPermKanban('escrever');
      setPermApontamento('escrever');
      setPermEstoque('escrever');
      setPermCadastros('ler');
    } else if (presetRole === 'vendedor') {
      setPermDashboard('nenhum');
      setPermPedidos('nenhum');
      setPermCustos('nenhum');
      setPermOrcamentos('vendedor');
      setPermKanban('nenhum');
      setPermApontamento('nenhum');
      setPermEstoque('nenhum');
      setPermCadastros('nenhum');
    } else {
      setPermDashboard('ler');
      setPermPedidos('nenhum');
      setPermCustos('nenhum');
      setPermOrcamentos('nenhum');
      setPermKanban('escrever');
      setPermApontamento('escrever');
      setPermEstoque('ler');
      setPermCadastros('nenhum');
    }
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setIsAddingNew(false);
    setNewNome(user.nome);
    setNewEmail(user.email);
    setNewRole(user.role);
    setNewTurno(user.turno || 'Manhã');
    setNewAprovado(user.aprovado || false);

    const perms = user.permissoes || {
      dashboard: 'ler',
      pedidos: 'nenhum',
      custos: 'nenhum',
      orcamentos: 'nenhum',
      kanban: 'escrever',
      apontamento: 'escrever',
      estoque: 'ler',
      cadastros: 'nenhum'
    };

    setPermDashboard(perms.dashboard);
    setPermPedidos(perms.pedidos);
    setPermCustos(perms.custos);
    setPermOrcamentos(perms.orcamentos || 'nenhum');
    setPermKanban(perms.kanban);
    setPermApontamento(perms.apontamento);
    setPermEstoque(perms.estoque);
    setPermCadastros(perms.cadastros);
  };

  const handleInitCreateNew = () => {
    setSelectedUser(null);
    setIsAddingNew(true);
    setNewNome('');
    setNewEmail('');
    setNewRole('operador');
    setNewTurno('Manhã');
    setNewAprovado(true); // default new admins create them as approved
    applyPreset('operador');
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newNome) return;

    const targetPermissions: UserPermissions = {
      dashboard: permDashboard,
      pedidos: permPedidos,
      custos: permCustos,
      orcamentos: permOrcamentos,
      kanban: permKanban,
      apontamento: permApontamento,
      estoque: permEstoque,
      cadastros: permCadastros,
    };

    const targetUser: User = {
      id: selectedUser?.id || `usr_db_${Date.now()}`,
      nome: newNome,
      email: newEmail.toLowerCase().trim(),
      role: newRole,
      turno: newTurno,
      aprovado: newAprovado,
      permissoes: targetPermissions
    };

    await salvarUsuario(targetUser);
    
    if (isAddingNew) {
      setIsAddingNew(false);
    }
    // Refresh selections
    setSelectedUser(targetUser);
  };

  const handleDeleteClick = (email: string) => {
    triggerConfirm(
      'Remover Usuário',
      `Tem certeza que deseja remover o usuário "${email}" permanentemente do sistema?`,
      async () => {
        await excluirUsuario(email);
        setSelectedUser(null);
        setIsAddingNew(false);
      },
      { confirmLabel: 'Sim, Remover', variant: 'danger' }
    );
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'PPCP Admin';
      case 'supervisor': return 'Supervisor de Turno';
      case 'operador': return 'Operador Industrial';
      case 'vendedor': return 'Vendedor Comercial';
      default: return role;
    }
  };

  const getPermissionBadgeClass = (level: 'nenhum' | 'ler' | 'escrever') => {
    if (level === 'escrever') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (level === 'ler') return 'bg-blue-100 text-blue-850 border-blue-200';
    return 'bg-gray-100 text-gray-400 border-gray-200';
  };

  const getPermissionLabel = (level: 'nenhum' | 'ler' | 'escrever') => {
    if (level === 'escrever') return 'Escrita';
    if (level === 'ler') return 'Leitura';
    return 'Sem Acesso';
  };

  return (
    <div className="flex flex-col space-y-6 md:space-y-8 max-w-7xl mx-auto px-1 md:px-4 py-2">
      {/* HEADER DE SEÇÃO */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-5">
        <div>
          <h2 className="font-sans text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <UserCog className="text-blue-600" size={24} />
            Controle de Usuários e Permissões por Módulos
          </h2>
          <p className="font-sans text-xs text-slate-500 mt-1">
            Libere acessos corporativos e gerencie privilégios granulares em nível de visualização ou edição para cada módulo do sistema.
          </p>
        </div>
        <button
          onClick={handleInitCreateNew}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 font-sans text-xs font-bold text-white hover:bg-blue-700 shadow-md transition-all cursor-pointer"
        >
          <Plus size={16} />
          Cadastrar Usuário
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: LISTAGEM DE USUÁRIOS */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[450px]">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3.5 flex justify-between items-center">
            <span className="font-sans text-xs font-bold text-slate-700 flex items-center gap-2">
              <Users size={16} className="text-slate-450" />
              Usuários Registrados ({dbUsers.length})
            </span>
            <div className="flex items-center gap-1.5 text-2xs font-bold text-slate-400">
              <RefreshCw size={11} className="animate-pulse" />
              Sincronizado
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[580px] overflow-y-auto">
            {dbUsers.length === 0 ? (
              <div className="p-8 text-center text-slate-450 space-y-2">
                <ShieldAlert size={36} className="mx-auto text-slate-300" />
                <p className="font-sans text-xs font-semibold">Nenhum usuário cadastrado.</p>
                <p className="font-sans text-3xs">Clique em "Cadastrar Usuário" para registrar a primeira autorização.</p>
              </div>
            ) : (
              dbUsers.map(u => {
                const isSelected = selectedUser?.email.toLowerCase() === u.email.toLowerCase();
                const superAdmin = u.email.toLowerCase() === 'fpjadm@gmail.com' || u.email.toLowerCase() === 'admin@homero.com.br';
                return (
                  <div
                    key={u.email}
                    onClick={() => handleSelectUser(u)}
                    className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-blue-50/50 border-r-2 border-blue-600' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex gap-3 min-w-0 flex-1">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-mono text-xs font-bold text-slate-700 border border-slate-200">
                        {u.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`font-sans text-xs font-bold leading-none truncate ${isSelected ? 'text-blue-800' : 'text-slate-800'}`}>
                            {u.nome}
                          </p>
                          {superAdmin && (
                            <span className="bg-slate-900 text-white text-[8px] font-black uppercase px-1 rounded-sm leading-tight">Master</span>
                          )}
                        </div>
                        <p className="font-sans text-3xs text-slate-450 truncate mt-1 leading-none">{u.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">{getRoleLabel(u.role)}</span>
                          <span className="text-slate-200">•</span>
                          {u.aprovado ? (
                            <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5">
                              <UserCheck size={11} /> Ativo
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-rose-500 flex items-center gap-0.5">
                              <UserX size={11} /> Pendente
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className={`text-slate-300 transition-transform ${isSelected ? 'text-blue-600 translate-x-1' : ''}`} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: DETALHE / CADASTRO */}
        <div className="lg:col-span-7">
          {selectedUser || isAddingNew ? (
            <form onSubmit={handleSaveSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
                <span className="font-sans text-xs font-bold text-slate-800 flex items-center gap-2">
                  <FileLock size={16} className="text-blue-600" />
                  {isAddingNew ? 'Cadastrar Novo Acesso' : 'Configurar Licença e Permissões'}
                </span>
                {!isAddingNew && selectedUser && selectedUser.email.toLowerCase() !== 'fpjadm@gmail.com' && (
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(selectedUser.email)}
                    className="flex items-center gap-1 text-slate-400 hover:text-rose-600 text-2xs font-bold transition-colors"
                  >
                    <Trash2 size={13} />
                    Excluir Acesso
                  </button>
                )}
              </div>

              <div className="p-5 md:p-6 space-y-6">
                {/* 1. SEÇÃO DE DADOS GERAIS */}
                <div className="space-y-4">
                  <h3 className="font-sans text-2xs font-extrabold uppercase tracking-widest text-slate-400 pb-1 border-b border-slate-100">Dados do Colaborador</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-3xs font-bold text-slate-500 uppercase tracking-wide mb-1">E-mail Corporativo</label>
                      <input
                        type="email"
                        required
                        disabled={!isAddingNew}
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Ex: joao.silva@homero.com.br"
                        className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-xs placeholder:text-slate-400 font-medium text-slate-850 bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </div>

                    <div>
                      <label className="block text-3xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nome Completo</label>
                      <input
                        type="text"
                        required
                        value={newNome}
                        onChange={(e) => setNewNome(e.target.value)}
                        placeholder="Ex: João Silva"
                        className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-xs placeholder:text-slate-400 font-medium text-slate-850"
                      />
                    </div>

                    <div>
                      <label className="block text-3xs font-bold text-slate-500 uppercase tracking-wide mb-1">Cargo Base</label>
                      <select
                        value={newRole}
                        onChange={(e) => {
                          const r = e.target.value as UserRole;
                          setNewRole(r);
                          applyPreset(r);
                        }}
                        className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 bg-white"
                      >
                        <option value="admin">PPCP (Acesso Completo)</option>
                        <option value="supervisor">Supervisor de Turno</option>
                        <option value="operador">Operador Industrial</option>
                        <option value="vendedor">Vendedor Comercial (Apenas Tabela de Preços)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-3xs font-bold text-slate-500 uppercase tracking-wide mb-1">Status de Liberação</label>
                      <div className="flex items-center gap-4 mt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={newAprovado === true}
                            onChange={() => setNewAprovado(true)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <span className="font-sans text-2xs font-bold text-emerald-600 flex items-center gap-0.5">
                            <UserCheck size={11} /> Liberado para Login
                          </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={newAprovado === false}
                            onChange={() => setNewAprovado(false)}
                            className="h-4 w-4 text-rose-500 focus:ring-rose-500 border-gray-300"
                          />
                          <span className="font-sans text-2xs font-bold text-rose-600 flex items-center gap-0.5">
                            <UserX size={11} /> Pendente / Bloqueado
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. SEÇÃO DE PERMISSÕES POR MÓDULO */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <h3 className="font-sans text-2xs font-extrabold uppercase tracking-widest text-slate-400">Permissões de Módulo Granulares</h3>
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => applyPreset('admin')}
                        className="text-[9px] font-black text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 uppercase cursor-pointer"
                      >
                        Preset Admin
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('supervisor')}
                        className="text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 uppercase cursor-pointer"
                      >
                        Preset Sup
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('operador')}
                        className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 uppercase cursor-pointer"
                      >
                        Preset Oper
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('vendedor')}
                        className="text-[9px] font-black text-purple-600 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5 uppercase cursor-pointer"
                      >
                        Preset Vend.
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {modulesList.map((m) => {
                      const isOrcamentos = m.id === 'orcamentos';
                      const levels = isOrcamentos 
                        ? (['nenhum', 'vendedor', 'ler', 'escrever'] as const)
                        : (['nenhum', 'ler', 'escrever'] as const);

                      return (
                        <div key={m.id} className="flex flex-col md:flex-row md:items-center justify-between border-b border-dashed border-slate-100 pb-3 last:border-0 last:pb-0 gap-2">
                          <div className="pb-1.5 md:pb-0">
                            <span className="font-sans text-xs font-bold text-slate-700">{m.label}</span>
                            <span className="block font-mono text-[9px] uppercase text-slate-400">Modulo ID: {m.id}</span>
                          </div>
                          
                          <div className="flex gap-1.5 flex-wrap">
                            {levels.map((level) => {
                              const isChosen = m.value === level;
                              let label = 'Sem Acesso';
                              let styleClass = 'bg-gray-100 text-gray-500 border-gray-200';

                              if (level === 'escrever') {
                                label = 'Acesso Total';
                                styleClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                              } else if (level === 'ler') {
                                label = 'Leitura Completa';
                                styleClass = 'bg-blue-100 text-blue-800 border-blue-200';
                              } else if (level === 'vendedor') {
                                label = 'Visão Vendedor';
                                styleClass = 'bg-purple-100 text-purple-800 border-purple-200 font-extrabold';
                              }

                              return (
                                <button
                                  key={level}
                                  type="button"
                                  onClick={() => m.setter(level as any)}
                                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                    isChosen 
                                      ? styleClass + ' ring-2 ring-slate-900/10 shadow-3xs' 
                                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex gap-2.5 items-start">
                  <ShieldAlert className="text-blue-500 shrink-0 mt-0.5" size={16} />
                  <div className="text-2xs font-medium text-slate-500 leading-normal space-y-1">
                    <p className="font-bold text-slate-700">Regra de Segurança de Banco de Dados Ativada (Zero-Trust):</p>
                    <p>Ao salvar, as novas configurações de acesso entram em vigor imediatamente na próxima requisição do usuário ou recarregamento de aba do navegador.</p>
                  </div>
                </div>

                {/* BOTÕES DE SALVAMENTO */}
                <div className="flex justify-end gap-3.5 pt-4 border-t border-slate-150">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(null);
                      setIsAddingNew(false);
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 font-sans text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 font-sans text-xs font-bold text-white hover:bg-blue-700 shadow-md cursor-pointer"
                  >
                    <Check size={16} />
                    Salvar Usuário e Regras
                  </button>
                </div>

              </div>
            </form>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-450 space-y-4 min-h-[450px] flex flex-col justify-center items-center">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit">
                <Users size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="font-sans text-sm font-bold text-slate-800">Gerenciador de Contas Corporativas</h3>
                <p className="font-sans text-2xs text-slate-400 max-w-sm mx-auto">
                  Selecione um usuário cadastrado na barra lateral para regularizar pendências, redefinir presets de cargo ou configurar e-mails validados de acesso.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
};
