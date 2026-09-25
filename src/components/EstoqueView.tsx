import React, { useState } from 'react';
import { usePCP } from '../context/PCPContext';
import { Insumo, InsumoMovimento } from '../types';
import { 
  Package, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Search, 
  History, 
  Building,
  Sliders,
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';

export const EstoqueView: React.FC = () => {
  const { 
    insumos, 
    movimentos, 
    produtos, 
    registrarEntradaEstoque, 
    registrarSaidaEstoque 
  } = usePCP();

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');
  
  // Forms state
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [modalType, setModalType] = useState<'entrada' | 'saida'>('entrada');
  
  // Form fields
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [quantidade, setQuantidade] = useState<number>(1000);
  const [fornecedor, setFornecedor] = useState('');
  const [motivo, setMotivo] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSalvarMovimento = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedInsumoId || quantidade <= 0) {
      setErrorMessage('Por favor, informe o insumo e uma quantidade válida maior que zero.');
      return;
    }

    if (modalType === 'entrada') {
      registrarEntradaEstoque(
        selectedInsumoId, 
        quantidade, 
        fornecedor || 'Fornecedor Local', 
        motivo || 'Entrada manual de suprimentos'
      );
    } else {
      const res = registrarSaidaEstoque(
        selectedInsumoId, 
        quantidade, 
        motivo || 'Saída manual por descarte/perda'
      );
      if (!res) {
        setErrorMessage('Saldo insuficiente para realizar essa retirada de estoque.');
        return;
      }
    }

    // Reset fields
    setSelectedInsumoId('');
    setQuantidade(1000);
    setFornecedor('');
    setMotivo('');
    setShowTransactionModal(false);
  };

  const getInsumoUnitPercent = (ins: Insumo) => {
    return Math.min(100, Math.round((ins.estoque_atual / (ins.estoque_minimo * 3.5)) * 100));
  };

  const filteredInsumos = insumos.filter(i => 
    i.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.fornecedor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInsumoBadgeType = (tipo: string) => {
    switch (tipo) {
      case 'papel_cartao': return 'bg-orange-50 text-orange-850 border-orange-200';
      case 'tinta': return 'bg-cyan-50 text-cyan-850 border-cyan-200';
      case 'cola': return 'bg-indigo-50 text-indigo-850 border-indigo-200';
      case 'verniz': return 'bg-purple-50 text-purple-850 border-purple-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER TELA */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-sans text-xl font-bold tracking-tight text-gray-950">Estoque Físico de Insumos Gráficos</h2>
          <p className="font-sans text-xs text-gray-500">Faça o controle de compra (entradas), balanços de inventário e audite as deduções automáticas de bobinas/folhas.</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* LANÇAR SAÍDA */}
          <button
            onClick={() => {
              setModalType('saida');
              setShowTransactionModal(true);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 font-sans text-xs font-semibold text-gray-750 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
            id="btn-stock-withdraw"
          >
            <ArrowDownLeft size={15} className="text-rose-500" />
            Lançar Perda / Saída
          </button>

          {/* LANÇAR ENTRADA */}
          <button
            onClick={() => {
              setModalType('entrada');
              setShowTransactionModal(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 font-sans text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-3xs cursor-pointer"
            id="btn-stock-add"
          >
            <ArrowUpRight size={15} className="text-emerald-400" />
            Lançar Compra / Entrada
          </button>
        </div>
      </div>

      {/* METRICAS DE SUPLEMENTO DE PAPELÃO */}
      <div className="grid gap-4 sm:grid-cols-3">
        {insumos.filter(i => i.tipo === 'papel_cartao').map(paper => {
          const crit = paper.estoque_atual < paper.estoque_minimo;
          return (
            <div key={paper.id} className={`sleek-card p-4 hover:shadow-md transition-all ${crit ? 'border-rose-200 bg-rose-50/20' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-3xs font-bold uppercase text-gray-400 tracking-wider">Insumo Base / Papelão</span>
                {crit && (
                  <span className="font-sans text-5xs font-black bg-rose-100 text-rose-850 px-1.5 py-0.5 rounded border border-rose-200">
                    Estoque Crítico
                  </span>
                )}
              </div>
              <p className="mt-1.5 font-sans text-xs font-bold text-gray-950 truncate">{paper.nome}</p>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="font-sans text-2xl font-black text-slate-900">
                  {paper.estoque_atual.toLocaleString('pt-BR')}
                </span>
                <span className="font-sans text-4xs uppercase font-extrabold text-gray-450 tracking-wider">{paper.unidade}</span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between items-center font-mono text-4xs text-gray-450 mb-1">
                  <span>Segurança Mínima: {paper.estoque_minimo} {paper.unidade}</span>
                  <span className="font-bold text-gray-650">{getInsumoUnitPercent(paper)}% Saturação</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full rounded-full ${crit ? 'bg-rose-500' : 'bg-slate-800'}`} style={{ width: `${getInsumoUnitPercent(paper)}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DUAS COLUNAS: LISTA DE ESTOQUES FÍSICOS & HISTÓRICO DE DEDUÇÕES */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* TABELA DE SALDOS ATUAIS DE INSUMOS */}
        <div className="sleek-card p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Package size={17} className="text-gray-500" />
              <h3 className="font-sans text-sm font-bold text-gray-905">Balancete de Materiais</h3>
            </div>
            {/* Buscador */}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar material / fornecedor..."
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 font-sans text-4xs text-gray-700 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-150 bg-gray-50/75 font-mono text-3xs font-bold uppercase tracking-wider text-gray-400">
                  <th className="px-4 py-3">Insumo / Material</th>
                  <th className="px-4 py-3">Subgrupo</th>
                  <th className="px-4 py-3">Saldo Físico</th>
                  <th className="px-4 py-3">Estoque Mínimo</th>
                  <th className="px-4 py-3">Distribuidor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-3xs text-gray-650">
                {filteredInsumos.map(ins => {
                  const isCrit = ins.estoque_atual < ins.estoque_minimo;
                  return (
                    <tr key={ins.id} className={`hover:bg-gray-25/50 transition-colors ${isCrit ? 'bg-rose-50/20' : ''}`}>
                      <td className="px-4 py-3 font-sans font-bold text-gray-900 flex items-center gap-1.5">
                        {ins.nome}
                        {isCrit && <AlertTriangle size={12} className="text-rose-500 shrink-0" />}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block border px-1.5 py-0.5 rounded font-mono text-4xs font-bold uppercase tracking-tight ${getInsumoBadgeType(ins.tipo)}`}>
                          {ins.type || ins.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-gray-950">
                        {ins.estoque_atual.toLocaleString('pt-BR')} {ins.unidade}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-450">
                        {ins.estoque_minimo} {ins.unidade}
                      </td>
                      <td className="px-4 py-3 text-gray-450 font-sans truncate max-w-[130px]" title={ins.fornecedor}>
                        {ins.fornecedor}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* LOGS DE MOVIMENTAÇÃO DO CONTROLE DE ESTOQUE */}
        <div className="sleek-card p-5 lg:col-span-1 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
            <History size={17} className="text-gray-500" />
            <h3 className="font-sans text-sm font-bold text-gray-905">Deduções Físicas & Compras</h3>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {movimentos.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">Nenhum histórico gravado.</div>
            ) : (
              movimentos.map(mov => {
                const insName = insumos.find(i => i.id === mov.insumo_id)?.nome.split(' ')[0] || 'Insumo';
                return (
                  <div key={mov.id} className="rounded-lg bg-gray-25 border border-gray-100 p-2.5 text-3xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 font-bold">
                        {mov.tipo === 'entrada' ? (
                          <span className="flex items-center gap-0.5 text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded font-mono uppercase">
                            + Entrada
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-rose-700 bg-rose-100 px-1 py-0.5 rounded font-mono uppercase">
                            - Saída
                          </span>
                        )}
                        <span className="text-gray-800 truncate max-w-[90px]" title={insName}>{insName}</span>
                      </div>
                      <span className="font-mono text-gray-405">{mov.data}</span>
                    </div>

                    <div className="flex justify-between font-mono font-medium text-gray-700">
                      <span>Volume:</span>
                      <strong className={mov.tipo === 'entrada' ? 'text-emerald-700' : 'text-rose-600'}>
                        {mov.tipo === 'entrada' ? '+' : '-'}{mov.quantidade.toLocaleString('pt-BR')} {insumos.find(i => i.id === mov.insumo_id)?.unidade || ''}
                      </strong>
                    </div>

                    <p className="font-sans text-gray-450 leading-tight border-t border-dashed border-gray-100 pt-1">
                      {mov.motivo}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* MODAL TRANSACAO (ENTRADA / SAÍDA) */}
      {showTransactionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-3xs" id="modal-stock-ledger">
          <div className="w-full max-w-sm rounded-2xl border border-gray-150 bg-white p-5 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-4">
              <div>
                <span className="font-mono text-3xs font-extrabold uppercase text-gray-400 block">Movimento Caderneta</span>
                <h3 className="font-sans font-black text-xs text-slate-905 mt-0.5">
                  {modalType === 'entrada' ? 'Adicionar Saldo (Entrada NFe)' : 'Retirar Saldo (Ajuste/Consumo)'}
                </h3>
              </div>
              <button 
                onClick={() => setShowTransactionModal(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-105"
                id="close-stock-ledger-modal"
              >
                <X size={16} />
              </button>
            </div>

            {errorMessage && (
              <div className="my-2 p-2 rounded bg-rose-50 text-rose-800 text-3xs border border-rose-100 font-bold">
                {errorMessage}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSalvarMovimento} className="space-y-4">
              {/* Escolha do Insumo */}
              <div>
                <label className="block font-sans text-3xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Insumo de Destino
                </label>
                <select
                  required
                  value={selectedInsumoId}
                  onChange={(e) => setSelectedInsumoId(e.target.value)}
                  className="block w-full rounded-lg border border-gray-205 bg-white px-3 py-1.5 text-xs text-gray-800 focus:outline-none"
                  id="stock-select-insumo"
                >
                  <option value="">-- Escolha o Suprimento --</option>
                  {insumos.map(i => (
                    <option key={i.id} value={i.id}>{i.nome} (Atual: {i.estoque_atual} {i.unidade})</option>
                  ))}
                </select>
              </div>

              {/* Quantidade */}
              <div>
                <label className="block font-sans text-3xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Quantidade Física (unidades / Kg)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                  className="block w-full rounded border border-gray-200 py-1.5 px-3 text-xs font-semibold text-gray-800 focus:outline-none"
                />
              </div>

              {/* Se for Entrada, pede fornecedor */}
              {modalType === 'entrada' && (
                <div>
                  <label className="block font-sans text-3xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Fornecedor / Emitente NFe
                  </label>
                  <input
                    type="text"
                    value={fornecedor}
                    onChange={(e) => setFornecedor(e.target.value)}
                    placeholder="Ex: Klabin S.A."
                    className="block w-full rounded border border-gray-200 py-1 py-2 px-3 text-xs placeholder:text-gray-400"
                  />
                </div>
              )}

              {/* Descritivo do motivo */}
              <div>
                <label className="block font-sans text-3xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Justificativa / Motivo do Lançamento
                </label>
                <input
                  type="text"
                  required
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder={modalType === 'entrada' ? "Ex: Compra NFe 99282" : "Ex: Perda por rasgo em descarga"}
                  className="block w-full rounded border border-gray-200 py-1.5 px-3 text-2xs text-gray-805"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded bg-slate-900 py-2.5 font-sans text-xs font-semibold text-white hover:bg-slate-800 shadow-3xs cursor-pointer text-center"
                id="save-stock-ledger-btn"
              >
                Concluir Registro
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
