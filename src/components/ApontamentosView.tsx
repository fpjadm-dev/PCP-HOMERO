import React, { useState, useEffect } from 'react';
import { usePCP } from '../context/PCPContext';
import { Appnto, Produto, Maquina, Operador } from '../types';
import { ConfirmationDialog } from './ConfirmationDialog';
import { 
  ClipboardPen, 
  Clock, 
  HelpCircle, 
  TrendingUp, 
  Gauge, 
  User, 
  AlertTriangle,
  FileCheck,
  CheckCircle,
  Timer,
  Trash2
} from 'lucide-react';

export const ApontamentosView: React.FC = () => {
  const { 
    apontamentos, 
    produtos, 
    pedidos,
    maquinas, 
    operadores, 
    insumos,
    registrarApontamento, 
    excluirApontamento,
    getOEEParaMaquina,
    addNotification,
    currentUser
  } = usePCP();

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

  // Form states
  const [maquinaId, setMaquinaId] = useState('');
  const [operadorId, setOperadorId] = useState(() => {
    // Se o usuário logado for operador correspondente, pré-selecionar!
    if (currentUser && currentUser.role === 'operador') {
      const match = operadores.find(o => o.nome.toLowerCase().includes(currentUser.nome.toLowerCase().split(' ')[0]));
      return match ? match.id : '';
    }
    return '';
  });
  const [produtoId, setProdutoId] = useState('');
  
  // Práticas datas padrões
  const [dataInicio, setDataInicio] = useState('2026-05-28T08:00');
  const [dataFim, setDataFim] = useState('2026-05-28T16:00');
  
  const [quantidadeProduzida, setQuantidadeProduzida] = useState<number>(10000);
  const [quantidadeRefugo, setQuantidadeRefugo] = useState<number>(100);
  const [tempoParado, setTempoParado] = useState<number>(30);
  const [motivoParada, setMotivoParada] = useState('');
  
  const [tipo, setTipo] = useState<'setup' | 'producao' | 'parada_manutencao' | 'parada_repouso' | 'outros'>('producao');
  const [justificativa, setJustificativa] = useState('');

  // Estados adicionais para obrigação de folhas utilizadas
  const [quantidadeFolhasUtilizadas, setQuantidadeFolhasUtilizadas] = useState<number>(0);
  const [insumoFolhasId, setInsumoFolhasId] = useState('');

  // Feedbacks
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Common stop reasons in packaging plants
  const MOTIVOS_PARADA = [
    { value: '', label: 'Nenhum / Sem Paradas significativas' },
    { value: 'Troca de Clichê / Gravação de Chapas', label: 'Impressão: Troca de Clichê / Chapa / Acerto de Tinta' },
    { value: 'Ajuste de facão de destaque', label: 'Corte: Ajuste de facão de destaque (Bobst)' },
    { value: 'Troca de Faca / Emborrachamento', label: 'Corte: Substituição de faca de corte e vinco' },
    { value: 'Entupimento do bico de cola PVA', label: 'Acabamento: Entupimento do bico injetor de cola' },
    { value: 'Ajuste do alimentador automático', label: 'Geral: Ajuste físico do alimentador / Engarrafamento' },
    { value: 'Manutenção elétrica/mecânica preventiva', label: 'Manutenção: Elétrica ou de Correias' },
    { value: 'Falta de suprimentos no acumulador', label: 'Abastecimento: Falta de chapas de papelão' }
  ];

  // Auto-selecionar o insumo correspondente de folhas quando o produto for alterado
  useEffect(() => {
    if (produtoId) {
      const prodObj = produtos.find(p => p.id === produtoId);
      if (prodObj) {
        const foundInsumo = insumos.find(i => i.unidade === 'folhas' && (i.nome === prodObj.material || prodObj.material.includes(i.nome) || i.nome.includes(prodObj.material)));
        if (foundInsumo) {
          setInsumoFolhasId(foundInsumo.id);
        } else {
          const firstSheetInsumo = insumos.find(i => i.unidade === 'folhas');
          if (firstSheetInsumo) {
            setInsumoFolhasId(firstSheetInsumo.id);
          }
        }
      }
    }
  }, [produtoId, produtos, insumos]);

  // Filtra produtos ativos aguardando processo na máquina selecionada!
  // Ex: se escolheu m2, só mostra produtos que estão com roteiro indicando que a m2 é a maquina_atual
  const selectedMaquinaObj = maquinas.find(m => m.id === maquinaId);
  const requiresSheets = selectedMaquinaObj ? (
    selectedMaquinaObj.nome.toLowerCase().includes('meia folha') ||
    selectedMaquinaObj.nome.toLowerCase().includes('folha inteira')
  ) : false;

  const filteredProdutosParaApontar = produtos.filter(p => {
    if (!maquinaId) return false;
    const roteiro = p.roteiro;
    const atualIdx = p.maquina_atual_idx;
    if (atualIdx >= 0 && atualIdx < roteiro.length) {
      return roteiro[atualIdx] === maquinaId;
    }
    return false;
  });

  const handleSalvarApontamento = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!maquinaId || !operadorId || !produtoId) {
      setErrorMessage('Por favor, informe a máquina, o operador responsável e o produto faturado.');
      return;
    }

    if (tipo === 'producao' && quantidadeProduzida <= 0) {
      setErrorMessage('A quantidade produzida total deve ser maior que zero para apontamento de Produção.');
      return;
    }

    if ((tipo === 'outros' || tipo === 'parada_manutencao' || tipo === 'parada_repouso') && !justificativa.trim()) {
      setErrorMessage('Por favor, forneça uma justificativa para o tipo de apontamento selecionado.');
      return;
    }

    if (tipo === 'producao' && requiresSheets) {
      if (!insumoFolhasId) {
        setErrorMessage('Para esta máquina, é obrigatório informar o insumo de folha utilizado.');
        return;
      }
      if (quantidadeFolhasUtilizadas <= 0) {
        setErrorMessage('Para esta máquina, é obrigatório informar uma quantidade positiva de folhas utilizadas.');
        return;
      }
    }

    const finalQtdProd = tipo === 'producao' ? quantidadeProduzida : 0;
    const finalQtdRefugo = tipo === 'producao' ? quantidadeRefugo : 0;

    // Estrutura objeto
    const dataObj = {
      maquina_id: maquinaId,
      operador_id: operadorId,
      produto_id: produtoId,
      data_inicio: new Date(dataInicio).toISOString(),
      data_fim: new Date(dataFim).toISOString(),
      quantidade_produzida: finalQtdProd,
      quantidade_refugo: finalQtdRefugo,
      tempo_parado: tempoParado,
      motivo_parada: tempoParado > 0 ? motivoParada : undefined,
      tipo,
      justificativa: justificativa.trim() || undefined,
      quantidade_folhas_utilizadas: (tipo === 'producao' && requiresSheets) ? quantidadeFolhasUtilizadas : undefined,
      insumo_folhas_id: (tipo === 'producao' && requiresSheets) ? insumoFolhasId : undefined
    };

    const res = registrarApontamento(dataObj);
    if (!res.success) {
      setErrorMessage(res.message);
    } else {
      setSuccessMessage('Apontamento e faturamento de lote gravados com sucesso! Estoque e Kanban atualizados.');
      // Limpa dados temporários
      setProdutoId('');
      setQuantidadeProduzida(10000);
      setQuantidadeRefugo(100);
      setTempoParado(30);
      setMotivoParada('');
      setTipo('producao');
      setJustificativa('');
      setQuantidadeFolhasUtilizadas(0);
      setInsumoFolhasId('');
      
      // Auto-esconder mensagem de sucesso
      setTimeout(() => setSuccessMessage(''), 7000);
    }
  };

  // Helper para mostrar informações amigáveis da tabela de apontamentos históricos
  const getProductDesc = (prodId: string) => {
    return produtos.find(p => p.id === prodId)?.descricao || prodId;
  };

  const getMachineName = (maqId: string) => {
    return maquinas.find(m => m.id === maqId)?.nome || maqId;
  };

  const getOperadorName = (opId: string) => {
    return operadores.find(o => o.id === opId)?.nome || opId;
  };

  // Calcular OEE individual do apontamento para auditar performance
  const calcularOEEApontamento = (apt: Appnto) => {
    const maquina = maquinas.find(m => m.id === apt.maquina_id);
    if (!maquina) return 100;
    
    const msDiff = new Date(apt.data_fim).getTime() - new Date(apt.data_inicio).getTime();
    const minutos = Math.max(1, Math.floor(msDiff / 60000));
    
    // Disponibilidade do apontamento
    const tempoAtivo = Math.max(0, minutos - apt.tempo_parado);
    const dispVal = (tempoAtivo / minutos) * 100;
    
    // Performance do apontamento
    const capTeorica = (tempoAtivo / 60) * maquina.capacidade_hora;
    let perfVal = capTeorica > 0 ? (apt.quantidade_produzida / capTeorica) * 100 : 100;
    if (perfVal > 100) perfVal = 100;

    // Qualidade do apontamento
    const bomTotal = Math.max(0, apt.quantidade_produzida - apt.quantidade_refugo);
    const qualVal = apt.quantidade_produzida > 0 ? (bomTotal / apt.quantidade_produzida) * 100 : 100;

    const oeeVal = (dispVal / 100) * (perfVal / 100) * (qualVal / 100) * 100;
    return Math.round(oeeVal);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER TELA */}
      <div>
        <h2 className="font-sans text-xl font-bold tracking-tight text-gray-950">Apontamento de Produção Diário</h2>
        <p className="font-sans text-xs text-gray-500">Registe os volumes faturados, horas de máquina ativa e justifique tempos de paradas corretivas/setups.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* FORMULÁRIO COLUNA 1 - REGISTRAR APONTAMENTO */}
        <div className="sleek-card p-5 lg:col-span-1 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
            <ClipboardPen size={17} className="text-gray-500" />
            <h3 className="font-sans text-sm font-bold text-gray-905">Nova Ordem / Boletim Diário</h3>
          </div>

          {errorMessage && (
            <div className="rounded-lg bg-rose-50 border border-rose-100 p-3 text-2xs font-bold text-rose-800">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-2xs font-bold text-emerald-800">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSalvarApontamento} className="space-y-3.5">
            
            {/* SELECIONAR MAQUINA */}
            <div>
              <label className="block font-sans text-3xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Máquina Ativa
              </label>
              <select
                required
                value={maquinaId}
                onChange={(e) => {
                  setMaquinaId(e.target.value);
                  setProdutoId(''); // limpa produto ao trocar maquina
                }}
                className="block w-full rounded-lg border border-gray-205 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-slate-900 focus:outline-none"
                id="pointing-select-machine"
              >
                <option value="">-- Escolha o Equipamento --</option>
                {maquinas.map((m, idx) => (
                  <option key={`${m.id || 'maq'}-${idx}`} value={m.id}>{m.nome} ({m.tipo})</option>
                ))}
              </select>
            </div>

            {/* SELECIONAR OPERADOR */}
            <div>
              <label className="block font-sans text-3xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Operador Responsável
              </label>
              <select
                required
                value={operadorId}
                onChange={(e) => setOperadorId(e.target.value)}
                className="block w-full rounded-lg border border-gray-205 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-slate-900 focus:outline-none"
                id="pointing-select-operator"
              >
                <option value="">-- Responsável Técnico --</option>
                {operadores.map(op => (
                  <option key={op.id} value={op.id}>{op.nome} (Turno: {op.turno})</option>
                ))}
              </select>
            </div>

            {/* SELECIONAR PRODUTO (RESTRITO AO QUE ESTÁ NA MÁQUINA!) */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block font-sans text-3xs font-bold uppercase tracking-wider text-gray-400">
                  Lote / Produto (NaFila)
                </label>
                {maquinaId && (
                  <span className="font-mono text-4xs bg-blue-50 text-blue-800 border-blue-100 border px-1.5 py-0.5 rounded font-bold">
                    {filteredProdutosParaApontar.length} Na fila da Maquina
                  </span>
                )}
              </div>
              <select
                required
                disabled={!maquinaId}
                value={produtoId}
                onChange={(e) => setProdutoId(e.target.value)}
                className="block w-full rounded-lg border border-gray-205 bg-white px-3 py-1.5 text-xs text-gray-850 focus:border-slate-900 focus:outline-none disabled:bg-gray-100"
                id="pointing-select-product"
              >
                <option value="">
                  {!maquinaId 
                    ? '◄ Selecione uma máquina ativa primeiro' 
                    : filteredProdutosParaApontar.length === 0 
                      ? 'Nenhum produto aguardando processo nesta máquina'
                      : '-- Lote de Embalagem para Apontar --'
                  }
                </option>
                {filteredProdutosParaApontar.map(p => {
                  const ped = pedidos.find(o => o.id === p.pedido_id);
                  return (
                    <option key={p.id} value={p.id}>
                      {ped?.id} - {p.descricao} (Qtd: {p.quantidade})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* CRONOGRAMA DATAS */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-sans text-3xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Início do Set
                </label>
                <input
                  type="datetime-local"
                  required
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="block w-full rounded border border-gray-200 py-1 px-2.5 font-mono text-3xs text-gray-800"
                />
              </div>

              <div>
                <label className="block font-sans text-3xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Término do Set
                </label>
                <input
                  type="datetime-local"
                  required
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="block w-full rounded border border-gray-200 py-1 px-2.5 font-mono text-3xs text-gray-800"
                />
              </div>
            </div>

            {/* TIPO DE APONTAMENTO */}
            <div className="space-y-3 p-3 bg-slate-50/70 rounded-xl border border-slate-100 text-left">
              <div>
                <label className="block font-sans text-3xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Tipo de Apontamento *
                </label>
                <select
                  required
                  value={tipo}
                  onChange={(e) => {
                    const t = e.target.value as any;
                    setTipo(t);
                    if (t !== 'producao') {
                      setQuantidadeProduzida(0);
                    } else {
                      setQuantidadeProduzida(10000);
                    }
                  }}
                  className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                  id="pointing-select-type"
                >
                  <option value="producao">Produção</option>
                  <option value="setup">Setup</option>
                  <option value="parada_manutencao">Parada Manutenção</option>
                  <option value="parada_repouso">Parada Descanso</option>
                  <option value="outros">Outros</option>
                </select>
              </div>

              {(tipo === 'parada_manutencao' || tipo === 'parada_repouso' || tipo === 'outros') && (
                <div className="space-y-1">
                  <label className="block font-sans text-3xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Justificativa / Motivo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Informe o motivo detalhado..."
                    value={justificativa}
                    onChange={(e) => setJustificativa(e.target.value)}
                    className="block w-full rounded border border-slate-200 py-1 px-2 text-xs text-slate-800 focus:outline-none bg-white font-sans"
                  />
                </div>
              )}
            </div>

            {/* QUANTIDADES */}
            {tipo === 'producao' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-sans text-3xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Produzido Útil (Boas)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={quantidadeProduzida}
                    onChange={(e) => setQuantidadeProduzida(Number(e.target.value))}
                    className="block w-full rounded border border-gray-200 py-1 px-2.5 text-xs font-semibold text-gray-800"
                  />
                </div>

                <div>
                  <label className="block font-sans text-3xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Refugo / Sucata (Aparada)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={quantidadeRefugo}
                    onChange={(e) => setQuantidadeRefugo(Number(e.target.value))}
                    className="block w-full rounded border border-gray-200 py-1 px-2.5 text-xs text-gray-850"
                  />
                </div>
              </div>
            )}

            {/* OBRIGAÇÃO DE INFORMAR FOLHAS PARA MÁQUINAS ESPECÍFICAS */}
            {tipo === 'producao' && requiresSheets && selectedMaquinaObj && (
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-lg space-y-3">
                <div className="flex items-center gap-1.5 text-indigo-700">
                  <AlertTriangle className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="font-mono text-3xs font-bold uppercase tracking-wider block">
                    Obrigatório para {selectedMaquinaObj.nome}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-sans text-3xs font-bold uppercase tracking-wider text-indigo-900 mb-1">
                      Insumo de Folha Utilizado *
                    </label>
                    <select
                      required
                      value={insumoFolhasId}
                      onChange={(e) => setInsumoFolhasId(e.target.value)}
                      className="block w-full rounded border border-indigo-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- Escolha o Insumo de Folhas --</option>
                      {insumos.filter(i => i.unidade === 'folhas').map(i => (
                        <option key={i.id} value={i.id}>
                          {i.nome} (Estoque: {i.estoque_atual.toLocaleString('pt-BR')} un)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-sans text-3xs font-bold uppercase tracking-wider text-indigo-900 mb-1">
                      Quantidade de Folhas Utilizadas *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={quantidadeFolhasUtilizadas || ''}
                      onChange={(e) => setQuantidadeFolhasUtilizadas(Number(e.target.value))}
                      className="block w-full rounded border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Ex: 500"
                    />
                  </div>
                </div>
                <p className="text-3xs text-indigo-600 font-medium">
                  💡 A quantidade informada dará baixa automática no estoque de insumos ao registrar o apontamento.
                </p>
              </div>
            )}

            {/* PARADAS */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="block font-sans text-3xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Parado (Minutos)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={tempoParado}
                  onChange={(e) => setTempoParado(Number(e.target.value))}
                  className="block w-full rounded border border-gray-200 py-1 px-2 text-xs text-gray-800"
                />
              </div>

              <div className="col-span-2">
                <label className="block font-sans text-3xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Justificativa da Parada
                </label>
                <select
                  value={motivoParada}
                  onChange={(e) => setMotivoParada(e.target.value)}
                  disabled={tempoParado === 0}
                  className="block w-full rounded border border-gray-200 bg-white py-1 px-1.5 text-3xs text-gray-800 focus:outline-none disabled:bg-gray-100"
                >
                  {MOTIVOS_PARADA.map((m, idx) => (
                    <option key={idx} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 font-sans text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer shadow-3xs"
              id="submit-pointing-btn"
            >
              <FileCheck size={15} />
              Lançar Boletim / Consumir Insumos
            </button>
          </form>
        </div>

        {/* HISTÓRICO COLUNAS 2 E 3 - TABELA APONTAMENTOS HISTÓRICOS */}
        <div className="sleek-card p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Clock size={17} className="text-gray-500" />
              <h3 className="font-sans text-sm font-bold text-gray-955">Boletim de Operações de Máquinas</h3>
            </div>
            <span className="font-mono text-3xs text-gray-400">Auditoria Retroativa</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-150 bg-gray-50/75 font-mono text-3xs font-bold uppercase tracking-wider text-gray-400">
                  <th className="px-3 py-2.5">Máquina / Operador</th>
                  <th className="px-3 py-2.5">Produto / Lote</th>
                  <th className="px-3 py-2.5">Período / Tempo</th>
                  <th className="px-3 py-2.5">Produzido (Bom)</th>
                  <th className="px-3 py-2.5">Parada (Gargalo)</th>
                  <th className="px-3 py-2.5 text-right">OEE Parcela</th>
                  {currentUser?.role === 'admin' && <th className="px-3 py-2.5 text-center">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-3xs text-gray-650">
                {apontamentos.length === 0 ? (
                  <tr>
                    <td colSpan={currentUser?.role === 'admin' ? 7 : 6} className="px-3 py-10 text-center text-xs text-gray-450">
                      Nenhum boletim apontado no histórico.
                    </td>
                  </tr>
                ) : (
                  apontamentos.map(apt => {
                    const aptOee = calcularOEEApontamento(apt);
                    let oeeBadgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                    if (aptOee < 85 && aptOee >= 65) oeeBadgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                    if (aptOee < 65) oeeBadgeColor = 'bg-rose-50 text-rose-800 border-rose-200';

                    const durMs = new Date(apt.data_fim).getTime() - new Date(apt.data_inicio).getTime();
                    const durHoras = (durMs / 3600000).toFixed(1);

                    return (
                      <tr key={apt.id} className="hover:bg-gray-25/50 transition-colors">
                        
                        {/* MAQUINA E RESP */}
                        <td className="px-3 py-3">
                          <p className="font-sans font-bold text-gray-900 leading-tight">
                            {getMachineName(apt.maquina_id).split(' ').slice(0, 3).join(' ')}
                          </p>
                          <span className="font-sans text-3xs text-gray-450 block mt-0.5">Resp: {getOperadorName(apt.operador_id)}</span>
                        </td>

                        {/* PRODUTO */}
                        <td className="px-3 py-3 max-w-[150px]">
                          <p className="font-sans font-medium text-gray-800 line-clamp-1">{getProductDesc(apt.produto_id)}</p>
                          <div className="flex flex-wrap gap-1 mt-1 items-center">
                            <span className="font-mono text-[9px] text-gray-400">Cod: #{apt.produto_id}</span>
                            {apt.tipo && (
                              <span className={`text-[8px] font-sans px-1 py-0.2 rounded font-bold uppercase ${
                                apt.tipo === 'producao' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                                apt.tipo === 'setup' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                apt.tipo === 'parada_manutencao' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                apt.tipo === 'parada_repouso' ? 'bg-sky-50 text-sky-700 border border-sky-100' :
                                'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {apt.tipo === 'producao' ? 'Produção' :
                                 apt.tipo === 'setup' ? 'Setup' :
                                 apt.tipo === 'parada_manutencao' ? 'Manutenção' :
                                 apt.tipo === 'parada_repouso' ? 'Descanso' : 'Outros'}
                              </span>
                            )}
                          </div>
                          {apt.justificativa && (
                            <p className="text-[9px] text-slate-500 italic mt-1 leading-tight font-sans bg-slate-50 p-1 rounded border border-slate-100">
                              Justificativa: {apt.justificativa}
                            </p>
                          )}
                        </td>

                        {/* HORAS DURACAO */}
                        <td className="px-3 py-3 font-mono">
                          <div className="text-gray-700 font-semibold">{durHoras} horas de Set</div>
                          <span className="text-gray-400 text-4xs block mt-0.5">
                            {new Date(apt.data_inicio).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>

                        {/* PRODUCAO BOM E RUIM */}
                        <td className="px-3 py-3">
                          {apt.tipo === 'producao' ? (
                            <>
                              <p className="font-sans font-semibold text-gray-900">{apt.quantidade_produzida.toLocaleString('pt-BR')} un</p>
                              <span className="font-sans text-rose-600 block text-4xs mt-0.5">Refugo: -{apt.quantidade_refugo} un</span>
                              {apt.quantidade_folhas_utilizadas && (
                                <span className="font-sans text-indigo-700 font-medium block text-4xs mt-1 bg-indigo-50 border border-indigo-100 rounded px-1 py-0.2 w-max">
                                  Consumo: {apt.quantidade_folhas_utilizadas.toLocaleString('pt-BR')} folhas
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-400 font-sans">-</span>
                          )}
                        </td>

                        {/* TEMPO REBOOT PARADO */}
                        <td className="px-3 py-3">
                          {apt.tempo_parado > 0 ? (
                            <div>
                              <p className="font-sans font-bold text-amber-700">{apt.tempo_parado} min</p>
                              <span className="font-sans text-gray-450 line-clamp-1 w-[120px] text-4xs block mt-0.5" title={apt.motivo_parada}>
                                {apt.motivo_parada || 'Outros setups'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">Zero Paradas</span>
                          )}
                        </td>

                        {/* OEE CALCULADO */}
                        <td className="px-3 py-3 text-right">
                          <span className={`inline-block border rounded px-1.5 py-0.5 font-mono font-bold ${oeeBadgeColor}`}>
                            {aptOee}% OEE
                          </span>
                        </td>

                        {currentUser?.role === 'admin' && (
                          <td className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => triggerConfirm(
                                'Excluir Apontamento',
                                `Tem certeza que deseja excluir este apontamento de produção? Essa ação removerá o registro e estornará as quantidades de estoque associadas.`,
                                () => excluirApontamento(apt.id),
                                { confirmLabel: 'Sim, Excluir', variant: 'danger' }
                              )}
                              className="p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded transition-colors inline-flex items-center justify-center cursor-pointer"
                              title="Excluir Apontamento"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        )}

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
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
