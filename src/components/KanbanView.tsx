import React, { useState } from 'react';
import { usePCP } from '../context/PCPContext';
import { KanbanItem, Produto, Maquina } from '../types';
import { 
  ArrowRight, 
  ArrowLeft, 
  HelpCircle, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Play,
  RotateCcw,
  PlusCircle,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Info,
  Search,
  Eye,
  Filter,
  BarChart2,
  CalendarCheck,
  ZoomIn,
  ZoomOut,
  ClipboardPen,
  FileCheck,
  FileText,
  FileSpreadsheet,
  Download,
  ExternalLink,
  Scissors,
  ToggleLeft,
  ToggleRight,
  EyeOff,
  Pin
} from 'lucide-react';
import { 
  exportKanbanHorizontalToExcel, 
  exportKanbanVerticalToExcel, 
  exportKanbanTabelaToExcel 
} from '../utils/excelExport';

const safeLocalStorageSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Silently ignore storage quota exceptions
  }
};

export const KanbanView: React.FC = () => {
  const { 
    kanban, 
    produtos, 
    pedidos, 
    clientes, 
    maquinas, 
    moverCardKanban,
    alterarOrdemLote,
    atualizarCheckInsumosKanban,
    addNotification,
    apontamentos,
    operadores,
    registrarApontamento,
    produtosModelos,
    insumos,
    editarPedidoPrioridadeSequencia,
    kanbanColIds,
    salvarSequenciaKanban
  } = usePCP();

  const [kanbanExcludedStatuses, setKanbanExcludedStatuses] = useState<string[]>([]);

  const [selectedCard, setSelectedCard] = useState<Produto | null>(null);
  const [expandedCardPhases, setExpandedCardPhases] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [aptShouldAdvance, setAptShouldAdvance] = useState<boolean>(true);

  // Modal for pointing before advancing
  const [aptModalData, setAptModalData] = useState<{
    produto: Produto;
    origemMaquinaId: string;
    destinoMaquinaId: string;
    status: 'aguardando' | 'em_processo' | 'concluido';
  } | null>(null);

  const [aptOperadorId, setAptOperadorId] = useState<string>('');
  const [aptDataInicio, setAptDataInicio] = useState<string>('');
  const [aptDataFim, setAptDataFim] = useState<string>('');
  const [aptQtdProduzida, setAptQtdProduzida] = useState<number>(0);
  const [aptQtdRefugo, setAptQtdRefugo] = useState<number>(0);
  const [aptTempoParado, setAptTempoParado] = useState<number>(0);
  const [aptMotivoParada, setAptMotivoParada] = useState<string>('');
  const [aptModalError, setAptModalError] = useState<string>('');

  // Estados para consumo obrigatório de folhas para máquinas Meia Folha / Folha Inteira
  const [aptQuantidadeFolhasUtilizadas, setAptQuantidadeFolhasUtilizadas] = useState<number>(0);
  const [aptInsumoFolhasId, setAptInsumoFolhasId] = useState<string>('');

  // Novas configurações de apontamento por tipo e validação de quantidade
  const [aptTipo, setAptTipo] = useState<'setup' | 'producao' | 'parada_manutencao' | 'parada_repouso' | 'outros'>('producao');
  const [aptJustificativa, setAptJustificativa] = useState<string>('');
  const [aptMotivoIncompleto, setAptMotivoIncompleto] = useState<string>('');
  const [aptReconfirmarIncompleto, setAptReconfirmarIncompleto] = useState<boolean>(false);
  const [aptReconfirmCheckbox, setAptReconfirmCheckbox] = useState<boolean>(false);

  // Zoom level state persistent across reloads
  const [zoomLevel, setZoomLevel] = useState<number>(() => {
    const saved = localStorage.getItem('pcp_kanban_zoom');
    return saved ? parseFloat(saved) : 1.0;
  });

  const handleZoomChange = (val: number) => {
    const nextVal = Math.max(0.6, Math.min(1.4, Number(val.toFixed(1))));
    setZoomLevel(nextVal);
    safeLocalStorageSetItem('pcp_kanban_zoom', nextVal.toString());
  };

  // Tab control
  const [viewMode, setViewMode] = useState<'kanban' | 'vertical' | 'tabela'>(() => {
    const saved = localStorage.getItem('pcp_kanban_view_mode');
    return (saved === 'tabela' || saved === 'vertical') ? saved : 'kanban';
  });
  
  const handleViewModeChange = (mode: 'kanban' | 'vertical' | 'tabela') => {
    setViewMode(mode);
    safeLocalStorageSetItem('pcp_kanban_view_mode', mode);
  };

  // Obrigatoriedade de apontamento para avançar de fase (Temporariamente desabilitada por padrão)
  const [exigirApontamento, setExigirApontamento] = useState<boolean>(() => {
    const saved = localStorage.getItem('pcp_kanban_exigir_apontamento');
    return saved === 'true';
  });

  const handleToggleExigirApontamento = () => {
    const newVal = !exigirApontamento;
    setExigirApontamento(newVal);
    safeLocalStorageSetItem('pcp_kanban_exigir_apontamento', newVal.toString());
    addNotification('info', newVal 
      ? 'Obrigatoriedade de apontamento para avançar ATIVADA.' 
      : 'Obrigatoriedade de apontamento para avançar DESATIVADA. Avanço livre ativo.'
    );
  };

  // State for order tracking table view
  const [tabSearch, setTabSearch] = useState('');
  const [tabStatusFilter, setTabStatusFilter] = useState<string>('todos');
  const [tabPrioFilter, setTabPrioFilter] = useState<string>('todos');
  const [selectedPedidoId, setSelectedPedidoId] = useState<string | null>(null);

  // Sorting state for table view in KanbanView
  const [tabSortField, setTabSortField] = useState<'id' | 'cliente' | 'produtos' | 'fase_atual' | 'produzido_meta' | 'progresso' | 'data_entrega' | 'prioridade' | 'sequencia' | 'status' | null>('data_entrega');
  const [tabSortDirection, setTabSortDirection] = useState<'asc' | 'desc'>('asc');

  const toggleTabSort = (field: 'id' | 'cliente' | 'produtos' | 'fase_atual' | 'produzido_meta' | 'progresso' | 'data_entrega' | 'prioridade' | 'sequencia' | 'status') => {
    if (tabSortField === field) {
      setTabSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setTabSortField(field);
      setTabSortDirection('asc');
    }
  };

  const getTabSortIcon = (field: 'id' | 'cliente' | 'produtos' | 'fase_atual' | 'produzido_meta' | 'progresso' | 'data_entrega' | 'prioridade' | 'sequencia' | 'status') => {
    if (tabSortField !== field) return null;
    return tabSortDirection === 'asc' ? <ChevronUp size={12} className="inline ml-1 text-slate-800" /> : <ChevronDown size={12} className="inline ml-1 text-slate-800" />;
  };

  // Persistent filter state for client or order ID in m1 / other columns
  const [filterQuery, setFilterQuery] = useState(() => localStorage.getItem('pcp_kanban_filter_query') || '');

  const handleFilterChange = (val: string) => {
    setFilterQuery(val);
    safeLocalStorageSetItem('pcp_kanban_filter_query', val);
  };
  const [colSorts, setColSorts] = useState<Record<string, 'manual' | 'date' | 'priority' | 'seq_priority'>>({
    m1: 'manual',
    m2: 'manual',
    m3: 'manual',
    concluido: 'manual'
  });

  const [columnIds, setColumnIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('pcp_kanban_col_ids');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Safe fail
      }
    }
    return ['m1', 'm2', 'm3', 'concluido'];
  });

  // Keep columns synced when machines list changes from context or kanbanColIds changes from Firestore
  React.useEffect(() => {
    const currentMachineIds = maquinas.map(m => m.id);
    const allExpectedIds = [...currentMachineIds, 'concluido'];
    
    setColumnIds(prev => {
      // Use kanbanColIds from context if available, otherwise previous state
      const baseColIds = kanbanColIds && kanbanColIds.length > 0 ? kanbanColIds : prev;
      
      const validPrev = baseColIds.filter(id => allExpectedIds.includes(id));
      const missing = allExpectedIds.filter(id => !validPrev.includes(id));
      
      const newOrder = [...validPrev];
      missing.forEach(id => {
        if (id === 'concluido') {
          newOrder.push(id);
        } else {
          // insert before 'concluido'
          const conclIdx = newOrder.indexOf('concluido');
          if (conclIdx !== -1) {
            newOrder.splice(conclIdx, 0, id);
          } else {
            newOrder.push(id);
          }
        }
      });
      
      safeLocalStorageSetItem('pcp_kanban_col_ids', JSON.stringify(newOrder));
      return newOrder;
    });
  }, [maquinas, kanbanColIds]);

  const moveColumnLeft = (idx: number) => {
    if (idx <= 0) return;
    setColumnIds(prev => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx - 1];
      copy[idx - 1] = temp;
      safeLocalStorageSetItem('pcp_kanban_col_ids', JSON.stringify(copy));
      salvarSequenciaKanban(copy);
      return copy;
    });
  };

  const moveColumnRight = (idx: number) => {
    if (idx >= columnIds.length - 1) return;
    setColumnIds(prev => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx + 1];
      copy[idx + 1] = temp;
      safeLocalStorageSetItem('pcp_kanban_col_ids', JSON.stringify(copy));
      salvarSequenciaKanban(copy);
      return copy;
    });
  };

  // Re-build columns base dynamically incorporating any dynamic machines too
  const columns = columnIds.map(id => {
    if (id === 'concluido') {
      return { id: 'concluido', title: 'CONCLUÍDO / EXPEDIÇÃO', sub: 'Lote Pronto para Faturamento', type: 'Concluído' };
    }
    const maq = maquinas.find(m => m.id === id);
    return {
      id: id,
      title: maq ? maq.nome.toUpperCase() : 'MÁQUINA EM LINHA',
      sub: maq ? `${maq.tipo} Ativo` : 'PROCESSO',
      type: maq ? maq.tipo : 'Desconhecido'
    };
  });

  // Filtra itens de Kanban por coluna (máquina)
  const getCardsForColumn = (columnId: string) => {
    return produtos.filter(p => {
      const ped = pedidos.find(pd => pd.id === p.pedido_id);
      if (!ped) return false;

      // Filter out excluded statuses
      if (kanbanExcludedStatuses.includes(ped.status)) return false;

      // Restrict to active production, but also allow concluded orders if looking in concluded column
      const belongsToActiveProduction = ped.status === 'producao' || (columnId === 'concluido' && ped.status === 'concluido');
      if (!belongsToActiveProduction) return false;

      if (columnId === 'concluido') {
        return p.maquina_atual_idx === p.roteiro.length;
      } else {
        const roteiro = p.roteiro;
        let indexNaEtapa = p.maquina_atual_idx;
        // Fallback: if parent order is in production but the index isn't initialized, start on stage 0
        if (indexNaEtapa < 0 && roteiro && roteiro.length > 0) {
          indexNaEtapa = 0;
        }
        return indexNaEtapa >= 0 && indexNaEtapa < roteiro.length && roteiro[indexNaEtapa] === columnId;
      }
    });
  };

  // Trata o clique rápido para mover o card
  const handleMoveCard = (
    produtoId: string, 
    origem: string, 
    destino: string, 
    status: 'aguardando' | 'em_processo' | 'concluido'
  ) => {
    setErrorMessage('');
    
    // Se estiver avançando etapa, exige apontamento!
    const prod = produtos.find(p => p.id === produtoId);
    if (prod && exigirApontamento) {
      const idxOrigem = prod.roteiro.indexOf(origem);
      const idxDestino = destino === 'concluido' ? prod.roteiro.length : prod.roteiro.indexOf(destino);
      
      const isAdvancing = (destino === 'concluido') || (idxDestino > idxOrigem);
      if (isAdvancing && idxOrigem > 0) {
        // Encontra a máquina para carregar o operador padrão
        const maquina = maquinas.find(m => m.id === origem);
        
        // Abre o modal de apontamento
        setAptModalData({
          produto: prod,
          origemMaquinaId: origem,
          destinoMaquinaId: destino,
          status: status
        });
        
        // Reseta estados do modal
        setAptOperadorId(maquina?.operador_id || '');
        // Ajusta as datas: Início há 2h, Fim agora
        const now = new Date();
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        
        // Converter para fuso horário local YYYY-MM-DDTHH:mm
        const formatLocalDateTime = (d: Date) => {
          const pad = (n: number) => n.toString().padStart(2, '0');
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };
        
        setAptDataInicio(formatLocalDateTime(twoHoursAgo));
        setAptDataFim(formatLocalDateTime(now));
        
        // Sugere o saldo faltante para esta etapa
        const existingProductionQty = apontamentos
          .filter(apt => apt.produto_id === prod.id && 
                         apt.maquina_id === origem && 
                         apt.tipo === 'producao')
          .reduce((acc, apt) => acc + apt.quantidade_produzida, 0);
        const outstandingQty = Math.max(0, prod.quantidade - existingProductionQty);
        setAptQtdProduzida(outstandingQty > 0 ? outstandingQty : prod.quantidade);
        setAptQtdRefugo(0);
        setAptTempoParado(0);
        setAptMotivoParada('');
        setAptTipo('producao');
        setAptJustificativa('');
        setAptMotivoIncompleto('');
        setAptReconfirmarIncompleto(false);
        setAptReconfirmCheckbox(false);
        setAptModalError('');

        // Auto-selecionar o insumo correspondente de folhas quando o lote for apontado
        const foundInsumo = insumos.find(i => i.unidade === 'folhas' && (i.nome === prod.material || prod.material.includes(i.nome) || i.nome.includes(prod.material)));
        if (foundInsumo) {
          setAptInsumoFolhasId(foundInsumo.id);
        } else {
          const firstSheetInsumo = insumos.find(i => i.unidade === 'folhas');
          setAptInsumoFolhasId(firstSheetInsumo ? firstSheetInsumo.id : '');
        }
        setAptQuantidadeFolhasUtilizadas(0);

        return; // não avança o card ainda!
      }
    }

    const result = moverCardKanban(produtoId, origem, destino, status);
    if (!result.success) {
      setErrorMessage(result.message);
      // Remove o erro após 5 segundos
      setTimeout(() => setErrorMessage(''), 6000);
    }
  };

  const handleConfirmarApontamentoModal = (e: React.FormEvent) => {
    e.preventDefault();
    setAptModalError('');

    if (!aptModalData) return;

    if (!aptOperadorId) {
      setAptModalError('Por favor, selecione o operador responsável.');
      return;
    }

    if (aptTipo === 'producao' && aptQtdProduzida <= 0) {
      setAptModalError('A quantidade produzida total deve ser maior que zero para apontamento de Produção.');
      return;
    }

    if ((aptTipo === 'outros' || aptTipo === 'parada_manutencao' || aptTipo === 'parada_repouso') && !aptJustificativa.trim()) {
      setAptModalError('Por favor, informe a justificativa obrigatória para o tipo de apontamento selecionado.');
      return;
    }

    const dtInicio = new Date(aptDataInicio);
    const dtFim = new Date(aptDataFim);

    if (dtFim <= dtInicio) {
      setAptModalError('A data/hora de término deve ser posterior à data/hora de início.');
      return;
    }

    let finalQtdProduzida = aptTipo === 'producao' ? aptQtdProduzida : 0;
    let finalQtdRefugo = aptTipo === 'producao' ? aptQtdRefugo : 0;
    let finalJustificativa = aptJustificativa;

    if (aptTipo === 'producao') {
      // Calcula a quantidade acumulada de produção já apontada + atual
      const existingProductionQty = apontamentos
        .filter(apt => apt.produto_id === aptModalData.produto.id && 
                       apt.maquina_id === aptModalData.origemMaquinaId && 
                       apt.tipo === 'producao')
        .reduce((acc, apt) => acc + apt.quantidade_produzida, 0);

      const totalProducao = existingProductionQty + finalQtdProduzida;
      const targetQty = aptModalData.produto.quantidade;

      if (aptShouldAdvance) {
        if (totalProducao < targetQty) {
          if (!aptReconfirmarIncompleto || !aptMotivoIncompleto.trim() || !aptReconfirmCheckbox) {
            setAptModalError(`A quantidade total produzida nesta etapa (${totalProducao.toLocaleString('pt-BR')} un) não atingiu a quantidade planejada do lote (${targetQty.toLocaleString('pt-BR')} un).`);
            setAptReconfirmarIncompleto(true);
            return;
          }
        }

        if (totalProducao < targetQty) {
          finalJustificativa = `Avanço com quantidade incompleta. Motivo: ${aptMotivoIncompleto}. ${aptJustificativa || ''}`.trim();
        }
      }
    }

    const selectedMaquinaObj = maquinas.find(m => m.id === aptModalData.origemMaquinaId);
    const requiresSheets = selectedMaquinaObj ? (
      selectedMaquinaObj.nome.toLowerCase().includes('meia folha') ||
      selectedMaquinaObj.nome.toLowerCase().includes('folha inteira')
    ) : false;

    if (aptTipo === 'producao' && requiresSheets) {
      if (!aptInsumoFolhasId) {
        setAptModalError('Para esta máquina, é obrigatório informar o insumo de folha utilizado.');
        return;
      }
      if (aptQuantidadeFolhasUtilizadas <= 0) {
        setAptModalError('Para esta máquina, é obrigatório informar uma quantidade positiva de folhas utilizadas.');
        return;
      }
    }

    // Registra o apontamento
    const dataObj = {
      maquina_id: aptModalData.origemMaquinaId,
      operador_id: aptOperadorId,
      produto_id: aptModalData.produto.id,
      data_inicio: dtInicio.toISOString(),
      data_fim: dtFim.toISOString(),
      quantidade_produzida: finalQtdProduzida,
      quantidade_refugo: finalQtdRefugo,
      tempo_parado: aptTempoParado,
      motivo_parada: aptTempoParado > 0 ? aptMotivoParada : undefined,
      tipo: aptTipo,
      justificativa: finalJustificativa.trim() || undefined,
      quantidade_folhas_utilizadas: (aptTipo === 'producao' && requiresSheets) ? aptQuantidadeFolhasUtilizadas : undefined,
      insumo_folhas_id: (aptTipo === 'producao' && requiresSheets) ? aptInsumoFolhasId : undefined
    };

    const res = registrarApontamento(dataObj);
    if (res.success) {
      // Limpa os novos estados de folhas
      setAptInsumoFolhasId('');
      setAptQuantidadeFolhasUtilizadas(0);

      if (aptTipo === 'producao' && aptShouldAdvance) {
        // Agora sim, move o card!
        const result = moverCardKanban(
          aptModalData.produto.id, 
          aptModalData.origemMaquinaId, 
          aptModalData.destinoMaquinaId, 
          aptModalData.status
        );
        if (result.success) {
          addNotification('success', `Apontamento de produção registrado e lote avançado com sucesso!`);
          setAptModalData(null);
        } else {
          setAptModalError(result.message);
        }
      } else {
        // Outros apontamentos ou produção parcial sem avançar o card
        const labelTipo = aptTipo === 'producao' ? 'Produção Parcial (Sem Avançar)' :
                          aptTipo === 'setup' ? 'Setup' : 
                          aptTipo === 'parada_manutencao' ? 'Parada Manutenção' : 
                          aptTipo === 'parada_repouso' ? 'Parada Descanso' : 'Outros';
        addNotification('success', `Apontamento de ${labelTipo} registrado com sucesso! (Esta ação não avança o lote, o card permanece na etapa atual).`);
        setAptModalData(null);
      }
    } else {
      setAptModalError(res.message);
    }
  };

  // HTML5 Drag and Drop support
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);

  const getSortedCardsForColumn = (columnId: string) => {
    const rawCards = getCardsForColumn(columnId);
    const currentSort = colSorts[columnId] || 'manual';
    let cards = [...rawCards];

    if (filterQuery.trim()) {
      const query = filterQuery.toLowerCase().trim();
      cards = cards.filter(p => {
        const ped = pedidos.find(pd => pd.id === p.pedido_id);
        const cli = clientes.find(c => c?.id === ped?.cliente_id);
        const matchingModel = produtosModelos.find(m => m.descricao === p.descricao);
        return (
          p.pedido_id.toLowerCase().includes(query) ||
          p.id.toLowerCase().includes(query) ||
          p.descricao.toLowerCase().includes(query) ||
          (cli?.nome && cli.nome.toLowerCase().includes(query)) ||
          (matchingModel?.codigo || '').toLowerCase().includes(query)
        );
      });
    }

    if (currentSort === 'manual') {
      cards.sort((a, b) => {
        const itemA = kanban.find(k => k.produto_id === a.id && k.maquina_id === columnId && k.status !== 'concluido');
        const itemB = kanban.find(k => k.produto_id === b.id && k.maquina_id === columnId && k.status !== 'concluido');
        const ordA = itemA ? itemA.ordem : 999;
        const ordB = itemB ? itemB.ordem : 999;
        return ordA - ordB;
      });
    } else if (currentSort === 'date') {
      cards.sort((a, b) => {
        const pedA = pedidos.find(p => p.id === a.pedido_id);
        const pedB = pedidos.find(p => p.id === b.pedido_id);
        const dateA = pedA?.data_entrega || '9999-99-99';
        const dateB = pedB?.data_entrega || '9999-99-99';
        return dateA.localeCompare(dateB);
      });
    } else if (currentSort === 'priority') {
      const priorityWeight = { alta: 3, media: 2, baixa: 1 };
      cards.sort((a, b) => {
        const pedA = pedidos.find(p => p.id === a.pedido_id);
        const pedB = pedidos.find(p => p.id === b.pedido_id);
        const prioA = priorityWeight[pedA?.prioridade || 'media'] || 2;
        const prioB = priorityWeight[pedB?.prioridade || 'media'] || 2;
        return prioB - prioA;
      });
    } else if (currentSort === 'seq_priority') {
      cards.sort((a, b) => {
        const pedA = pedidos.find(p => p.id === a.pedido_id);
        const pedB = pedidos.find(p => p.id === b.pedido_id);
        const seqA = pedA?.prioridade_sequencia !== undefined && pedA?.prioridade_sequencia !== null ? pedA.prioridade_sequencia : 999999;
        const seqB = pedB?.prioridade_sequencia !== undefined && pedB?.prioridade_sequencia !== null ? pedB.prioridade_sequencia : 999999;
        return seqA - seqB;
      });
    }
    return cards;
  };

  const handleDragStart = (e: React.DragEvent, prodId: string, sourceColId: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ prodId, sourceColId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const { prodId, sourceColId } = JSON.parse(dataStr);
      
      if (sourceColId === targetColId) return;

      handleMoveCard(prodId, sourceColId, targetColId, 'aguardando');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCardDrop = async (e: React.DragEvent, targetProdId: string, targetColId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCardId(null);
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const { prodId, sourceColId } = JSON.parse(dataStr);

      if (prodId === targetProdId) return;

      if (sourceColId === targetColId) {
        const cardsInCol = getSortedCardsForColumn(targetColId);
        const targetIndex = cardsInCol.findIndex(p => p.id === targetProdId);
        if (targetIndex !== -1) {
          const newOrdem = targetIndex + 1;
          await alterarOrdemLote(prodId, targetColId, newOrdem);
        }
      } else {
        handleMoveCard(prodId, sourceColId, targetColId, 'aguardando');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case 'alta': return 'border-l-4 border-l-rose-500 bg-rose-25/40';
      case 'media': return 'border-l-4 border-l-amber-500 bg-amber-25/40';
      default: return 'border-l-4 border-l-slate-400 bg-gray-25/30';
    }
  };

  const getPriorityBadge = (prio: string) => {
    switch (prio) {
      case 'alta': return 'text-rose-700 bg-rose-100';
      case 'media': return 'text-amber-700 bg-amber-100';
      default: return 'text-slate-750 bg-slate-100';
    }
  };

  // Handlers para Exportação em Excel
  const handleExportKanbanHorizontal = () => {
    exportKanbanHorizontalToExcel({
      columns,
      getCardsForColumn: (colId) => getSortedCardsForColumn(colId),
      pedidos,
      clientes,
      maquinas,
      apontamentos,
    });
    addNotification('success', 'Quadro Kanban Horizontal exportado para Excel com sucesso!');
  };

  const handleExportKanbanVertical = () => {
    exportKanbanVerticalToExcel({
      columns,
      getCardsForColumn: (colId) => getSortedCardsForColumn(colId),
      pedidos,
      clientes,
      maquinas,
      apontamentos,
    });
    addNotification('success', 'Quadro Kanban Vertical exportado para Excel com sucesso!');
  };

  const handleExportKanbanTabela = () => {
    const itemsFiltered = pedidos.filter(ped => {
      const matchesSearch = (() => {
        if (!tabSearch.trim()) return true;
        const q = tabSearch.toLowerCase().trim();
        const cli = clientes.find(c => c?.id === ped.cliente_id);
        const pedProds = produtos.filter(p => p.pedido_id === ped.id);
        const descMatches = pedProds.some(p => p.descricao.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
        return (
          ped.id.toLowerCase().includes(q) ||
          (cli?.nome && cli.nome.toLowerCase().includes(q)) ||
          descMatches
        );
      })();
      const matchesStatus = (tabStatusFilter === 'todos' || ped.status === tabStatusFilter) && !kanbanExcludedStatuses.includes(ped.status);
      const matchesPriority = tabPrioFilter === 'todos' || ped.prioridade === tabPrioFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });

    exportKanbanTabelaToExcel({
      pedidos: itemsFiltered,
      produtos,
      clientes,
      maquinas,
      apontamentos,
    });
    addNotification('success', 'Acompanhamento de Pedidos (Tabela) exportado para Excel com sucesso!');
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER DE EXPLICAÇÕES E ERRO */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white border border-slate-100 rounded-xl p-4 shadow-3xs">
        <div>
          <h2 className="font-sans text-xl font-bold tracking-tight text-gray-950">Gargalos e Fila Kanban</h2>
          <p className="font-sans text-xs text-gray-500">Arraste os lotes ou use os botões direcionais para avançar fases. O sistema audita faltas de sequência e registra materiais.</p>
        </div>

        {/* CONTROLES E BOTÕES DE AÇÃO NO TOPO DIREITO */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 self-start md:self-auto">
          {/* BOTÃO ATIVAR/DESATIVAR OBRIGATORIEDADE DE APONTAMENTO */}
          <button
            onClick={handleToggleExigirApontamento}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-sans font-bold transition-all border cursor-pointer shadow-4xs ${
              exigirApontamento 
                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' 
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
            title={exigirApontamento ? "Clique para desativar a obrigatoriedade" : "Clique para ativar a obrigatoriedade"}
            id="btn-toggle-exigir-apontamento"
          >
            {exigirApontamento ? (
              <>
                <ToggleRight className="text-amber-600 h-5 w-5" />
                <span>Apontamento Obrigatório</span>
              </>
            ) : (
              <>
                <ToggleLeft className="text-emerald-600 h-5 w-5" />
                <span>Avanço Livre (Sem Apontamento)</span>
              </>
            )}
          </button>

          {/* CONTROLES DE ZOOM / LUPA */}
          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 rounded-xl p-2 shadow-4xs" id="kanban-zoom-control">
            <div className="flex items-center gap-1.5 px-1.5 text-slate-500 font-sans text-3xs font-semibold">
              <Search size={12} className="text-slate-400" />
              <span>ZOOM KANBAN:</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleZoomChange(zoomLevel - 0.1)}
                disabled={zoomLevel <= 0.6}
                className="rounded-md border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Diminuir Zoom"
                id="btn-zoom-out"
              >
                <ZoomOut size={12} />
              </button>
              
              <div className="min-w-11 text-center select-none">
                <span className="font-mono text-[11px] font-black text-slate-800">
                  {Math.round(zoomLevel * 100)}%
                </span>
              </div>

              <button
                onClick={() => handleZoomChange(zoomLevel + 0.1)}
                disabled={zoomLevel >= 1.4}
                className="rounded-md border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Aumentar Zoom"
                id="btn-zoom-in"
              >
                <ZoomIn size={12} />
              </button>
            </div>

            <div className="h-4 w-px bg-slate-200 mx-1" />

            <button
              onClick={() => handleZoomChange(1.0)}
              className="text-[10px] font-sans font-bold text-indigo-650 hover:text-indigo-800 hover:underline px-1 cursor-pointer"
              title="Resetar Zoom"
            >
              100%
            </button>
          </div>
        </div>
      </div>

      {/* SELEÇÃO DE VIEW MODE (SUB-TABS) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 mb-4 gap-2 pb-1 sm:pb-0">
        <div className="flex overflow-x-auto min-w-0">
          <button
            onClick={() => handleViewModeChange('kanban')}
            className={`py-2 px-4 text-xs font-bold font-sans border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'kanban' 
                ? 'border-slate-900 text-slate-900 font-extrabold' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
            id="btn-subtab-kanban"
          >
            Visualização em Kanban (Colunas)
          </button>
          <button
            onClick={() => handleViewModeChange('vertical')}
            className={`py-2 px-4 text-xs font-bold font-sans border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'vertical' 
                ? 'border-slate-900 text-slate-900 font-extrabold' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
            id="btn-subtab-vertical"
          >
            Visualização em Linhas (Vertical)
          </button>
          <button
            onClick={() => handleViewModeChange('tabela')}
            className={`py-2 px-4 text-xs font-bold font-sans border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'tabela' 
                ? 'border-slate-900 text-slate-900 font-extrabold' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
            id="btn-subtab-tabela"
          >
            Acompanhamento de Pedidos (Tabela)
          </button>
        </div>

        <div className="flex items-center gap-2 sm:mb-1 self-start sm:self-auto">
          {/* BOTÃO EXPORTAR EXCEL CONTEXTUAL */}
          {viewMode === 'kanban' && (
            <button
              onClick={handleExportKanbanHorizontal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
              title="Exportar dados do Quadro Kanban Horizontal para Excel (.xlsx)"
              id="btn-export-kanban-horizontal-top"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" />
              <span>Exportar Excel</span>
            </button>
          )}

          {viewMode === 'vertical' && (
            <button
              onClick={handleExportKanbanVertical}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
              title="Exportar dados do Quadro Kanban Vertical para Excel (.xlsx)"
              id="btn-export-kanban-vertical-top"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" />
              <span>Exportar Excel</span>
            </button>
          )}

          {viewMode === 'tabela' && (
            <button
              onClick={handleExportKanbanTabela}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
              title="Exportar Tabela de Acompanhamento para Excel (.xlsx)"
              id="btn-export-kanban-tabela-top"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" />
              <span>Exportar Excel</span>
            </button>
          )}

          {/* BUTTON TO PIN KANBAN STAGES IN THE DATABASE */}
          {(viewMode === 'kanban' || viewMode === 'vertical') && (
            <button
              onClick={() => salvarSequenciaKanban(columnIds)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
              title="Salvar a ordem atual das máquinas/etapas no banco de dados permanentemente"
              id="btn-fixar-etapas"
            >
              <Pin size={12} className="rotate-45" />
              <span>Fixar Sequência de Etapas</span>
            </button>
          )}
        </div>
      </div>

      {viewMode === 'kanban' && (
        <>
          {/* BOX DE FEEDBACK DE REGRA DE NEGÓCIO SE CONFLITO */}
          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm flex items-start gap-3 text-xs text-rose-800 animate-pulse">
              <AlertCircle size={18} className="shrink-0 text-rose-600 mt-0.5" />
              <div>
                <strong className="font-sans font-bold block">Regra de Sequência Industrial Ativada!</strong>
                <p className="font-sans font-normal mt-0.5 leading-normal">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* PESQUISA INTEGRADA NO KANBAN */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-3xs" id="kanban-search-bar">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between w-full">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por Código do Lote (Pedido), Produto, Cliente ou Código de Produto..."
                  value={filterQuery}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="w-full bg-slate-50 pl-9 pr-3 py-2.5 font-sans text-xs font-semibold focus:bg-white border border-slate-200 focus:border-slate-800 rounded-lg focus:outline-none transition-all placeholder-slate-400"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {filterQuery && (
                  <button
                    onClick={() => handleFilterChange('')}
                    className="text-xs font-sans font-bold text-rose-600 hover:text-rose-800 hover:underline px-1 cursor-pointer shrink-0"
                  >
                    Limpar Busca
                  </button>
                )}
                <button
                  onClick={handleExportKanbanHorizontal}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-sans text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
                  title="Exportar dados do Quadro Kanban Horizontal para planilha Excel (.xlsx)"
                  id="btn-export-kanban-horizontal"
                >
                  <FileSpreadsheet size={14} />
                  <span>Exportar Excel</span>
                </button>
              </div>
            </div>

            {/* EXCLUDE STATUS CHECKBOXES */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2.5 border-t border-dashed border-slate-150">
              <span className="font-sans text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 select-none">
                <EyeOff size={11} className="text-slate-400" />
                Ocultar Status do Quadro:
              </span>
              <div className="flex flex-wrap items-center gap-4">
                {[
                  { id: 'pendente', label: 'Pendente' },
                  { id: 'producao', label: 'Em Produção' },
                  { id: 'concluido', label: 'Concluído' },
                  { id: 'cancelado', label: 'Cancelado' }
                ].map(item => {
                  const isChecked = kanbanExcludedStatuses.includes(item.id);
                  return (
                    <label key={item.id} className="inline-flex items-center gap-1.5 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setKanbanExcludedStatuses(prev => prev.filter(s => s !== item.id));
                          } else {
                            setKanbanExcludedStatuses(prev => [...prev, item.id]);
                          }
                        }}
                        className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className={`font-sans text-2xs transition-colors ${isChecked ? 'text-rose-600 font-bold line-through' : 'text-slate-600 font-medium group-hover:text-slate-900'}`}>
                        {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ROW/GRID KANBAN (SUPPORTS SCROLLING DYNAMIC COLUMNS BEAUTIFULLY) */}
          <div 
            className="flex gap-4 overflow-x-auto pb-4 select-none items-start max-w-full transition-all duration-150 origin-top-left"
            style={{ zoom: zoomLevel }}
            id="kanban-columns-container"
          >
            {columns.map((col, idx) => {
              const cards = getSortedCardsForColumn(col.id);
              const currentSort = colSorts[col.id] || 'manual';
              const extMac = maquinas.find(m => m.id === col.id);
              
              return (
                <div 
                  key={col.id} 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 w-72 md:w-80 shrink-0 transition-all shadow-xs h-auto min-h-[400px] pb-6"
                  id={`col-${col.id}`}
                >
                  {/* Header da coluna */}
                  <div className="flex flex-col border-b border-gray-150 pb-3 mb-3 shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {/* Botões para alterar posição da coluna */}
                        {idx > 0 && (
                          <button
                            onClick={() => moveColumnLeft(idx)}
                            className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                            title="Mover coluna para esquerda"
                            id={`btn-col-left-${col.id}`}
                          >
                            <ChevronLeft size={12} />
                          </button>
                        )}
                        {idx < columns.length - 1 && (
                          <button
                            onClick={() => moveColumnRight(idx)}
                            className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                            title="Mover coluna para direita"
                            id={`btn-col-right-${col.id}`}
                          >
                            <ChevronRight size={12} />
                          </button>
                        )}
                        <span className="font-mono text-[9px] font-bold uppercase tracking-tight text-slate-400 truncate">
                          {col.sub}
                        </span>
                      </div>
                      {extMac && (
                        <span className={`inline-block h-2 w-2 rounded-full ${
                          extMac.status_atual === 'operando' ? 'bg-emerald-500 animate-pulse' :
                          extMac.status_atual === 'ociosa' ? 'bg-gray-300' : 'bg-amber-500'
                        }`} />
                      )}
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <h3 className="font-sans text-2xs font-extrabold text-slate-900 tracking-tight">{col.title}</h3>
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 font-mono text-4xs font-bold text-white shadow-3xs">
                        {cards.length}
                      </span>
                    </div>



                    {/* Quick Sort Dropdown Menu */}
                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/60 pt-2 shrink-0">
                      <span className="font-sans text-[10px] text-slate-400 font-bold flex items-center gap-1">
                        <SlidersHorizontal size={10} className="text-slate-400 shrink-0" />
                        <span>Quick Sort:</span>
                      </span>
                      <select
                        value={currentSort}
                        onChange={(e) => setColSorts(prev => ({ ...prev, [col.id]: e.target.value as any }))}
                        className="font-sans text-[10px] font-bold text-slate-700 bg-white border border-slate-250 rounded-md py-1 px-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer shadow-3xs"
                        id={`sort-dropdown-${col.id}`}
                      >
                        <option value="manual">Padrão PCP</option>
                        <option value="date">Prazo de Entrega</option>
                        <option value="priority">Prioridade</option>
                        <option value="seq_priority">Prioridade em Seq.</option>
                      </select>
                    </div>
                  </div>

                  {/* Column Workload Summary Header at the beginning of the column */}
                  <div className="mb-3.5 bg-slate-150/70 p-2 text-left rounded-xl shrink-0 font-sans" id={`col-${col.id}-summary-header`}>
                    <div className="flex items-center justify-between text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">
                      <span>WORKLOAD {col.id === 'concluido' ? 'CONCLUÍDOS' : (extMac?.nome || col.title).toUpperCase()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-1.5 font-sans">
                      <div className="bg-white p-1 rounded-lg border border-slate-200/80 text-center shadow-3xs">
                        <span className="text-[7.5px] text-slate-400 block uppercase font-extrabold">Fila Ativa</span>
                        <strong className="text-2xs text-slate-900 font-mono font-bold">
                          {cards.length} {cards.length === 1 ? 'lote' : 'lotes'}
                        </strong>
                      </div>
                      <div className="bg-white p-1 rounded-lg border border-slate-200/80 text-center shadow-3xs">
                        <span className="text-[7.5px] text-slate-400 block uppercase font-extrabold">Qtd Total</span>
                        <strong className="text-2xs text-indigo-900 font-mono font-bold">
                          {cards.reduce((sum, p) => sum + p.quantidade, 0).toLocaleString('pt-BR')}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Corpo da fila de cards sem rolagem interna para expandir verticalmente */}
                  <div className="space-y-1.5 pb-4">
                    {cards.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-gray-150 h-32 text-gray-400 bg-white">
                        <CheckCircle2 size={16} className="text-gray-300" />
                        <span className="font-sans text-4xs font-semibold uppercase tracking-wider mt-1.5">Fila Vazia</span>
                      </div>
                    ) : (
                      cards.map(prod => {
                        const ped = pedidos.find(p => p.id === prod.pedido_id);
                        const cli = clientes.find(c => c?.id === ped?.cliente_id);
                        const isConcluded = col.id === 'concluido';
                        const activeAptForCard = kanban.find(k => k.produto_id === prod.id && k.maquina_id === col.id);

                        // Compute actual cumulative 'quantidade_produzida' from historical pointing records ('apontamentos')
                        const totalProduzido = apontamentos
                          .filter(apt => apt.produto_id === prod.id)
                          .reduce((sum, apt) => sum + apt.quantidade_produzida, 0);

                        const percentage = prod.quantidade > 0
                          ? Math.min(100, Math.round((totalProduzido / prod.quantidade) * 100))
                          : 0;

                        return (
                          <div
                            key={prod.id}
                            draggable={!isConcluded}
                            onDragStart={(e) => handleDragStart(e, prod.id, col.id)}
                            onDragOver={(e) => {
                              if (!isConcluded) {
                                e.preventDefault();
                                e.stopPropagation();
                              }
                            }}
                            onDragEnter={(e) => {
                              if (!isConcluded) {
                                e.preventDefault();
                                setDragOverCardId(prod.id);
                              }
                            }}
                            onDragLeave={() => {
                              if (!isConcluded) {
                                setDragOverCardId(null);
                              }
                            }}
                            onDrop={(e) => {
                              if (!isConcluded) {
                                setDragOverCardId(null);
                                handleCardDrop(e, prod.id, col.id);
                              }
                            }}
                            className={`sleek-card p-2 hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)] transition-all duration-200 cursor-grab active:cursor-grabbing ${getPriorityColor(ped?.prioridade || 'media')} ${
                              dragOverCardId === prod.id
                                ? 'border-indigo-650 ring-2 ring-indigo-500/20 bg-indigo-50/50 shadow-md scale-[1.02]'
                                : 'hover:border-slate-350 hover:-translate-y-0.5'
                            }`}
                            id={`card-${prod.id}`}
                          >
                            {/* Card Header Metadata */}
                            <div className="flex items-center justify-between text-[8px] font-sans font-extrabold uppercase tracking-wide text-slate-400 border-b border-slate-100 pb-1 mb-1.5 leading-none">
                              <span className="truncate max-w-[120px]" title={cli?.nome || 'N/A'}>
                                {cli?.nome || 'Cliente não definido'}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-mono text-[7.5px]" title="ID do Pedido">
                                  {prod.pedido_id.substring(0, 8)}
                                </span>
                                {ped && (
                                  <div 
                                    className="flex items-center gap-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-250 hover:border-amber-400 px-1 py-0.2 rounded font-sans font-extrabold text-[8.5px] shadow-3xs transition-colors shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Clique para alterar a sequência de produção do pedido"
                                  >
                                    <span className="text-[7.5px] uppercase tracking-wide text-amber-600 select-none">Seq:</span>
                                    <input
                                      type="number"
                                      min="1"
                                      className="w-7 bg-transparent border-none p-0 text-center text-[8.5px] font-sans font-extrabold text-amber-900 focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text"
                                      defaultValue={ped.prioridade_sequencia ?? ''}
                                      onBlur={(e) => {
                                        const val = e.target.value ? Number(e.target.value) : undefined;
                                        if (val !== ped.prioridade_sequencia) {
                                          editarPedidoPrioridadeSequencia(ped.id, val);
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          const target = e.currentTarget;
                                          const val = target.value ? Number(target.value) : undefined;
                                          if (val !== ped.prioridade_sequencia) {
                                            editarPedidoPrioridadeSequencia(ped.id, val);
                                          }
                                          target.blur();
                                        }
                                      }}
                                      placeholder="-"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Nome do Produto com Detalhes ao Lado */}
                            <div className="flex items-start justify-between gap-1">
                              {(() => {
                                const cardModel = produtosModelos.find(m => m.descricao === prod.descricao);
                                const cardModelCode = cardModel?.codigo;
                                return (
                                  <h4 className="font-sans text-[10px] font-extrabold text-slate-900 leading-tight tracking-tight line-clamp-2" title={prod.descricao}>
                                    {cardModelCode ? `[${cardModelCode}] ` : ''}{prod.descricao}
                                  </h4>
                                );
                              })()}
                              <button
                                onClick={() => setSelectedCard(prod)}
                                className="shrink-0 p-0.5 text-indigo-650 hover:text-indigo-850 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                                title="Fatores & Roteiro"
                              >
                                <Info size={9.5} />
                              </button>
                            </div>

                            {/* Informações Compactas: Qtd e Prazo em uma única linha */}
                            <div className="mt-1 flex items-center justify-between text-[9px] text-slate-500 font-medium">
                              <span>
                                Qtd: <strong className="font-mono text-slate-800 font-bold">{prod.quantidade.toLocaleString('pt-BR')}</strong>
                              </span>
                              {ped?.data_entrega && (
                                <span className="flex items-center gap-0.5">
                                  <Clock size={8} className="text-slate-400 shrink-0" />
                                  <strong className="font-mono text-slate-700 font-semibold text-[8.5px]">
                                    {new Date(ped.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR')}
                                  </strong>
                                </span>
                              )}
                            </div>

                            {/* Saldo Faltante / Apontamento Parcial na Etapa */}
                            {(() => {
                              const stepProduzido = apontamentos
                                .filter(apt => apt.produto_id === prod.id && apt.maquina_id === col.id && apt.tipo === 'producao')
                                .reduce((sum, apt) => sum + apt.quantidade_produzida, 0);
                              
                              if (stepProduzido > 0 && stepProduzido < prod.quantidade) {
                                return (
                                  <div className="mt-1.5 p-1 bg-amber-50/75 border border-amber-200/50 rounded text-[8.5px] font-sans flex items-center justify-between leading-none" id={`partial-step-${prod.id}`}>
                                    <div className="flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                                      <span className="text-amber-800 font-bold">Apontado:</span>
                                      <strong className="font-mono text-slate-800">{stepProduzido.toLocaleString('pt-BR')}</strong>
                                    </div>
                                    <span className="text-rose-700 bg-rose-50 border border-rose-100 rounded px-1 font-extrabold text-[8px]" title="Quantidade faltante nesta fase">
                                      Falta: {(prod.quantidade - stepProduzido).toLocaleString('pt-BR')}
                                    </span>
                                  </div>
                                );
                              }
                              return null;
                            })()}

                            {/* Controle de Insumos */}
                            {!isConcluded && (
                              <div className="mt-1.5 p-1 bg-slate-50 border border-slate-200/50 rounded-lg" id={`ctrl-insumos-${prod.id}`}>
                                <div className="text-[7.5px] font-extrabold uppercase text-slate-400 mb-0.5 px-0.5 tracking-wider">
                                  Controle de Insumos
                                </div>
                                <div className="flex items-center justify-between gap-1">
                                  <label className="flex-1 flex items-center justify-center gap-0.5 py-0.5 px-1 rounded border border-slate-150 bg-white hover:border-indigo-400 cursor-pointer transition-all select-none">
                                    <input
                                      type="checkbox"
                                      checked={activeAptForCard?.check_chapa || false}
                                      onChange={(e) => {
                                        atualizarCheckInsumosKanban(prod.id, col.id, { check_chapa: e.target.checked });
                                      }}
                                      className="h-2.5 w-2.5 rounded text-indigo-650 border-slate-300 focus:ring-0 cursor-pointer"
                                    />
                                    <span className={`text-[8px] font-semibold ${activeAptForCard?.check_chapa ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                                      Chapa
                                    </span>
                                  </label>

                                  <label className="flex-1 flex items-center justify-center gap-0.5 py-0.5 px-1 rounded border border-slate-150 bg-white hover:border-indigo-400 cursor-pointer transition-all select-none">
                                    <input
                                      type="checkbox"
                                      checked={activeAptForCard?.check_faca || false}
                                      onChange={(e) => {
                                        atualizarCheckInsumosKanban(prod.id, col.id, { check_faca: e.target.checked });
                                      }}
                                      className="h-2.5 w-2.5 rounded text-indigo-650 border-slate-300 focus:ring-0 cursor-pointer"
                                    />
                                    <span className={`text-[8px] font-semibold ${activeAptForCard?.check_faca ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                                      Faca
                                    </span>
                                  </label>

                                  <label className="flex-1 flex items-center justify-center gap-0.5 py-0.5 px-1 rounded border border-slate-150 bg-white hover:border-indigo-400 cursor-pointer transition-all select-none">
                                    <input
                                      type="checkbox"
                                      checked={activeAptForCard?.check_papel || false}
                                      onChange={(e) => {
                                        atualizarCheckInsumosKanban(prod.id, col.id, { check_papel: e.target.checked });
                                      }}
                                      className="h-2.5 w-2.5 rounded text-indigo-650 border-slate-300 focus:ring-0 cursor-pointer"
                                    />
                                    <span className={`text-[8px] font-semibold ${activeAptForCard?.check_papel ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                                      Papel
                                    </span>
                                  </label>
                                </div>
                              </div>
                            )}

                            {/* Controle de Posição & Navegação Combinados */}
                            {!isConcluded && (
                              <div className="mt-1.5 flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100">
                                {/* Posição na Fila */}
                                {cards.length > 1 ? (
                                  <div className="flex items-center gap-0.5 shrink-0 bg-slate-50 border border-slate-200/60 rounded px-1 py-0.2">
                                    <select
                                      value={activeAptForCard ? activeAptForCard.ordem : (cards.indexOf(prod) + 1)}
                                      onChange={(e) => {
                                        alterarOrdemLote(prod.id, col.id, Number(e.target.value));
                                      }}
                                      className="font-mono text-[8px] font-bold text-slate-700 bg-transparent border-none p-0 focus:outline-none cursor-pointer"
                                      id={`fila-pos-${prod.id}`}
                                    >
                                      {Array.from({ length: cards.length }, (_, j) => j + 1).map(num => (
                                        <option key={num} value={num}>
                                          #{num}
                                        </option>
                                      ))}
                                    </select>

                                    <button
                                      onClick={() => {
                                        const currentPos = activeAptForCard ? activeAptForCard.ordem : (cards.indexOf(prod) + 1);
                                        if (currentPos > 1) {
                                          alterarOrdemLote(prod.id, col.id, currentPos - 1);
                                        }
                                      }}
                                      disabled={(activeAptForCard ? activeAptForCard.ordem : (cards.indexOf(prod) + 1)) <= 1}
                                      className="p-0 text-[7px] text-slate-500 hover:text-indigo-600 disabled:opacity-30 cursor-pointer transition-all"
                                      title="Subir"
                                    >
                                      ▲
                                    </button>

                                    <button
                                      onClick={() => {
                                        const currentPos = activeAptForCard ? activeAptForCard.ordem : (cards.indexOf(prod) + 1);
                                        if (currentPos < cards.length) {
                                          alterarOrdemLote(prod.id, col.id, currentPos + 1);
                                        }
                                      }}
                                      disabled={(activeAptForCard ? activeAptForCard.ordem : (cards.indexOf(prod) + 1)) >= cards.length}
                                      className="p-0 text-[7px] text-slate-500 hover:text-indigo-600 disabled:opacity-30 cursor-pointer transition-all"
                                      title="Descer"
                                    >
                                      ▼
                                    </button>
                                  </div>
                                ) : (
                                  <span className="font-mono text-[8px] font-bold text-slate-400">#1</span>
                                )}

                                {/* Direcionamento de Fases */}
                                <div className="flex items-center gap-1">
                                  {prod.maquina_atual_idx > 0 && (
                                    <button
                                      onClick={() => {
                                        const anteriorMaqId = prod.roteiro[prod.maquina_atual_idx - 1];
                                        handleMoveCard(prod.id, col.id, anteriorMaqId, 'aguardando');
                                      }}
                                      className="flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1 py-0.5 font-sans text-[8px] font-extrabold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer"
                                      title="Voltar etapa"
                                    >
                                      <ArrowLeft size={7.5} />
                                      Voltar
                                    </button>
                                  )}

                                  <button
                                    onClick={() => {
                                      const proximaFaseIdx = prod.maquina_atual_idx + 1;
                                      const nextMaqId = proximaFaseIdx < prod.roteiro.length 
                                        ? prod.roteiro[proximaFaseIdx] 
                                        : 'concluido';
                                      handleMoveCard(prod.id, col.id, nextMaqId, 'aguardando');
                                    }}
                                    className="flex items-center gap-0.5 rounded bg-slate-900 px-1.5 py-0.5 font-sans text-[8px] font-extrabold text-white hover:bg-slate-800 transition-all shadow-3xs cursor-pointer"
                                    title="Avançar etapa"
                                  >
                                    Avançar
                                    <ArrowRight size={7.5} />
                                  </button>
                                </div>
                              </div>
                            )}

                          </div>
                        );
                      })
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </>
      )}

      {viewMode === 'vertical' && (
        <>
          {/* BOX DE FEEDBACK DE REGRA DE NEGÓCIO SE CONFLITO */}
          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm flex items-start gap-3 text-xs text-rose-800 animate-pulse mb-4">
              <AlertCircle size={18} className="shrink-0 text-rose-600 mt-0.5" />
              <div>
                <strong className="font-sans font-bold block">Regra de Sequência Industrial Ativada!</strong>
                <p className="font-sans font-normal mt-0.5 leading-normal">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* PESQUISA INTEGRADA NO KANBAN VERTICAL */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-3xs mb-4" id="kanban-vertical-search-bar">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between w-full">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por Código do Lote (Pedido), Produto, Cliente ou Código de Produto..."
                  value={filterQuery}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="w-full bg-slate-50 pl-9 pr-3 py-2.5 font-sans text-xs font-semibold focus:bg-white border border-slate-200 focus:border-slate-800 rounded-lg focus:outline-none transition-all placeholder-slate-400"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {filterQuery && (
                  <button
                    onClick={() => handleFilterChange('')}
                    className="text-xs font-sans font-bold text-rose-600 hover:text-rose-800 hover:underline px-1 cursor-pointer shrink-0"
                  >
                    Limpar Busca
                  </button>
                )}
                <button
                  onClick={handleExportKanbanVertical}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-sans text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
                  title="Exportar dados do Quadro Kanban Vertical para planilha Excel (.xlsx)"
                  id="btn-export-kanban-vertical"
                >
                  <FileSpreadsheet size={14} />
                  <span>Exportar Excel</span>
                </button>
              </div>
            </div>

            {/* EXCLUDE STATUS CHECKBOXES */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2.5 border-t border-dashed border-slate-150">
              <span className="font-sans text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 select-none">
                <EyeOff size={11} className="text-slate-400" />
                Ocultar Status do Painel Vertical:
              </span>
              <div className="flex flex-wrap items-center gap-4">
                {[
                  { id: 'pendente', label: 'Pendente' },
                  { id: 'producao', label: 'Em Produção' },
                  { id: 'concluido', label: 'Concluído' },
                  { id: 'cancelado', label: 'Cancelado' }
                ].map(item => {
                  const isChecked = kanbanExcludedStatuses.includes(item.id);
                  return (
                    <label key={item.id} className="inline-flex items-center gap-1.5 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setKanbanExcludedStatuses(prev => prev.filter(s => s !== item.id));
                          } else {
                            setKanbanExcludedStatuses(prev => [...prev, item.id]);
                          }
                        }}
                        className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className={`font-sans text-2xs transition-colors ${isChecked ? 'text-rose-600 font-bold line-through' : 'text-slate-600 font-medium group-hover:text-slate-900'}`}>
                        {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* GRID KANBAN VERTICAL (MÁQUINAS EM LINHAS, CARDS HORIZONTAIS) */}
          <div 
            className="space-y-4 select-none transition-all duration-150 origin-top-left"
            style={{ zoom: zoomLevel }}
            id="kanban-vertical-rows-container"
          >
            {columns.map((col, idx) => {
              const cards = getSortedCardsForColumn(col.id);
              const extMac = maquinas.find(m => m.id === col.id);
              
              return (
                <div 
                  key={col.id}
                  className="flex flex-col lg:flex-row gap-4 items-stretch border border-slate-200/80 bg-slate-50/20 p-4 rounded-2xl shadow-3xs"
                  id={`row-vertical-${col.id}`}
                >
                  {/* Bloco Esquerdo: Máquina / Processo */}
                  <div 
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 w-full lg:w-64 shrink-0 shadow-4xs"
                    id={`row-mach-info-${col.id}`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 min-w-0">
                          {idx > 0 && (
                            <button
                              onClick={() => moveColumnLeft(idx)}
                              className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                              title="Mover processo para cima"
                              id={`btn-col-up-${col.id}`}
                            >
                              <ChevronUp size={12} />
                            </button>
                          )}
                          {idx < columns.length - 1 && (
                            <button
                              onClick={() => moveColumnRight(idx)}
                              className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                              title="Mover processo para baixo"
                              id={`btn-col-down-${col.id}`}
                            >
                              <ChevronDown size={12} />
                            </button>
                          )}
                          <span className="font-mono text-[9px] font-bold uppercase tracking-tight text-slate-400 truncate">
                            {col.sub}
                          </span>
                        </div>
                        {extMac && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-sans text-[8px] font-extrabold uppercase tracking-widest text-slate-400">
                              {extMac.status_atual === 'operando' ? 'Operando' :
                               extMac.status_atual === 'ociosa' ? 'Ociosa' : 'Manutenção'}
                            </span>
                            <span className={`inline-block h-2 w-2 rounded-full ${
                              extMac.status_atual === 'operando' ? 'bg-emerald-500 animate-pulse' :
                              extMac.status_atual === 'ociosa' ? 'bg-gray-300' : 'bg-amber-500'
                            }`} />
                          </div>
                        )}
                      </div>
                      <h3 className="font-sans text-2xs font-extrabold text-slate-900 tracking-tight mt-1 leading-snug">
                        {col.title}
                      </h3>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 font-sans">
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200/50 text-center">
                        <span className="text-[7.5px] text-slate-400 block uppercase font-extrabold">Na Fila</span>
                        <strong className="text-2xs text-slate-900 font-mono font-bold">
                          {cards.length} {cards.length === 1 ? 'lote' : 'lotes'}
                        </strong>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200/50 text-center">
                        <span className="text-[7.5px] text-slate-400 block uppercase font-extrabold">Qtd Total</span>
                        <strong className="text-2xs text-indigo-900 font-mono font-bold">
                          {cards.reduce((sum, p) => sum + p.quantidade, 0).toLocaleString('pt-BR')}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Bloco Direito: Lista de Cards em Linha Horizontal */}
                  <div 
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.id)}
                    className="flex-1 flex gap-3.5 overflow-x-auto pb-2 pt-1 px-2 items-center rounded-xl border border-dashed border-slate-200 bg-white/70 hover:border-slate-350 hover:bg-white transition-all min-h-[140px]"
                    id={`row-cards-container-${col.id}`}
                  >
                    {cards.length === 0 ? (
                      <div className="flex items-center gap-2 pl-4 py-6 text-slate-400 font-sans text-xs italic">
                        <CheckCircle2 size={14} className="text-slate-350" />
                        <span>Fila vazia para este processo</span>
                      </div>
                    ) : (
                      cards.map(prod => {
                        const ped = pedidos.find(p => p.id === prod.pedido_id);
                        const cli = clientes.find(c => c?.id === ped?.cliente_id);
                        const isConcluded = col.id === 'concluido';
                        const activeAptForCard = kanban.find(k => k.produto_id === prod.id && k.maquina_id === col.id);

                        // Compute actual cumulative 'quantidade_produzida' from historical pointing records ('apontamentos')
                        const totalProduzido = apontamentos
                          .filter(apt => apt.produto_id === prod.id)
                          .reduce((sum, apt) => sum + apt.quantidade_produzida, 0);

                        return (
                          <div
                            key={prod.id}
                            draggable={!isConcluded}
                            onDragStart={(e) => handleDragStart(e, prod.id, col.id)}
                            onDragOver={(e) => {
                              if (!isConcluded) {
                                e.preventDefault();
                                e.stopPropagation();
                              }
                            }}
                            onDragEnter={(e) => {
                              if (!isConcluded) {
                                e.preventDefault();
                                setDragOverCardId(prod.id);
                              }
                            }}
                            onDragLeave={() => {
                              if (!isConcluded) {
                                setDragOverCardId(null);
                              }
                            }}
                            onDrop={(e) => {
                              if (!isConcluded) {
                                setDragOverCardId(null);
                                handleCardDrop(e, prod.id, col.id);
                              }
                            }}
                            className={`sleek-card p-2.5 w-64 md:w-72 shrink-0 hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)] transition-all duration-200 cursor-grab active:cursor-grabbing ${getPriorityColor(ped?.prioridade || 'media')} ${
                              dragOverCardId === prod.id
                                ? 'border-indigo-650 ring-2 ring-indigo-500/20 bg-indigo-50/50 shadow-md scale-[1.02]'
                                : 'hover:border-slate-350 hover:-translate-y-0.5'
                            }`}
                            id={`row-card-${prod.id}`}
                          >
                            {/* Card Header Metadata */}
                            <div className="flex items-center justify-between text-[8px] font-sans font-extrabold uppercase tracking-wide text-slate-400 border-b border-slate-100 pb-1 mb-1.5 leading-none">
                              <span className="truncate max-w-[120px]" title={cli?.nome || 'N/A'}>
                                {cli?.nome || 'Cliente não definido'}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-mono text-[7.5px]" title="ID do Pedido">
                                  {prod.pedido_id.substring(0, 8)}
                                </span>
                                {ped && (
                                  <div 
                                    className="flex items-center gap-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-250 hover:border-amber-400 px-1 py-0.2 rounded font-sans font-extrabold text-[8.5px] shadow-3xs transition-colors shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Clique para alterar a sequência de produção do pedido"
                                  >
                                    <span className="text-[7.5px] uppercase tracking-wide text-amber-600 select-none">Seq:</span>
                                    <input
                                      type="number"
                                      min="1"
                                      className="w-7 bg-transparent border-none p-0 text-center text-[8.5px] font-sans font-extrabold text-amber-900 focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text"
                                      defaultValue={ped.prioridade_sequencia ?? ''}
                                      onBlur={(e) => {
                                        const val = e.target.value ? Number(e.target.value) : undefined;
                                        if (val !== ped.prioridade_sequencia) {
                                          editarPedidoPrioridadeSequencia(ped.id, val);
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          const target = e.currentTarget;
                                          const val = target.value ? Number(target.value) : undefined;
                                          if (val !== ped.prioridade_sequencia) {
                                            editarPedidoPrioridadeSequencia(ped.id, val);
                                          }
                                          target.blur();
                                        }
                                      }}
                                      placeholder="-"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Nome do Produto com Detalhes ao Lado */}
                            <div className="flex items-start justify-between gap-1">
                              {(() => {
                                const cardModel = produtosModelos.find(m => m.descricao === prod.descricao);
                                const cardModelCode = cardModel?.codigo;
                                return (
                                  <h4 className="font-sans text-[10px] font-extrabold text-slate-900 leading-tight tracking-tight line-clamp-2" title={prod.descricao}>
                                    {cardModelCode ? `[${cardModelCode}] ` : ''}{prod.descricao}
                                  </h4>
                                );
                              })()}
                              <button
                                onClick={() => setSelectedCard(prod)}
                                className="shrink-0 p-0.5 text-indigo-650 hover:text-indigo-850 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                                title="Fatores & Roteiro"
                              >
                                <Info size={9.5} />
                              </button>
                            </div>

                            {/* Informações Compactas: Qtd e Prazo em uma única linha */}
                            <div className="mt-1 flex items-center justify-between text-[9px] text-slate-500 font-medium">
                              <span>
                                Qtd: <strong className="font-mono text-slate-800 font-bold">{prod.quantidade.toLocaleString('pt-BR')}</strong>
                              </span>
                              {ped?.data_entrega && (
                                <span className="flex items-center gap-0.5">
                                  <Clock size={8} className="text-slate-400 shrink-0" />
                                  <strong className="font-mono text-slate-700 font-semibold text-[8.5px]">
                                    {new Date(ped.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR')}
                                  </strong>
                                </span>
                              )}
                            </div>

                            {/* Saldo Faltante / Apontamento Parcial na Etapa */}
                            {(() => {
                              const stepProduzido = apontamentos
                                .filter(apt => apt.produto_id === prod.id && apt.maquina_id === col.id && apt.tipo === 'producao')
                                .reduce((sum, apt) => sum + apt.quantidade_produzida, 0);
                              
                              if (stepProduzido > 0 && stepProduzido < prod.quantidade) {
                                return (
                                  <div className="mt-1.5 p-1 bg-amber-50/75 border border-amber-200/50 rounded text-[8.5px] font-sans flex items-center justify-between leading-none" id={`partial-step-alt-${prod.id}`}>
                                    <div className="flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                                      <span className="text-amber-800 font-bold">Apontado:</span>
                                      <strong className="font-mono text-slate-800">{stepProduzido.toLocaleString('pt-BR')}</strong>
                                    </div>
                                    <span className="text-rose-700 bg-rose-50 border border-rose-100 rounded px-1 font-extrabold text-[8px]" title="Quantidade faltante nesta fase">
                                      Falta: {(prod.quantidade - stepProduzido).toLocaleString('pt-BR')}
                                    </span>
                                  </div>
                                );
                              }
                              return null;
                            })()}

                            {/* Controle de Insumos */}
                            {!isConcluded && (
                              <div className="mt-1.5 p-1 bg-slate-50 border border-slate-200/50 rounded-lg" id={`row-ctrl-insumos-${prod.id}`}>
                                <div className="text-[7.5px] font-extrabold uppercase text-slate-400 mb-0.5 px-0.5 tracking-wider">
                                  Controle de Insumos
                                </div>
                                <div className="flex items-center justify-between gap-1">
                                  <label className="flex-1 flex items-center justify-center gap-0.5 py-0.5 px-1 rounded border border-slate-150 bg-white hover:border-indigo-400 cursor-pointer transition-all select-none">
                                    <input
                                      type="checkbox"
                                      checked={activeAptForCard?.check_chapa || false}
                                      onChange={(e) => {
                                        atualizarCheckInsumosKanban(prod.id, col.id, { check_chapa: e.target.checked });
                                      }}
                                      className="h-2.5 w-2.5 rounded text-indigo-650 border-slate-300 focus:ring-0 cursor-pointer"
                                    />
                                    <span className={`text-[8px] font-semibold ${activeAptForCard?.check_chapa ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                                      Chapa
                                    </span>
                                  </label>

                                  <label className="flex-1 flex items-center justify-center gap-0.5 py-0.5 px-1 rounded border border-slate-150 bg-white hover:border-indigo-400 cursor-pointer transition-all select-none">
                                    <input
                                      type="checkbox"
                                      checked={activeAptForCard?.check_faca || false}
                                      onChange={(e) => {
                                        atualizarCheckInsumosKanban(prod.id, col.id, { check_faca: e.target.checked });
                                      }}
                                      className="h-2.5 w-2.5 rounded text-indigo-650 border-slate-300 focus:ring-0 cursor-pointer"
                                    />
                                    <span className={`text-[8px] font-semibold ${activeAptForCard?.check_faca ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                                      Faca
                                    </span>
                                  </label>

                                  <label className="flex-1 flex items-center justify-center gap-0.5 py-0.5 px-1 rounded border border-slate-150 bg-white hover:border-indigo-400 cursor-pointer transition-all select-none">
                                    <input
                                      type="checkbox"
                                      checked={activeAptForCard?.check_papel || false}
                                      onChange={(e) => {
                                        atualizarCheckInsumosKanban(prod.id, col.id, { check_papel: e.target.checked });
                                      }}
                                      className="h-2.5 w-2.5 rounded text-indigo-650 border-slate-300 focus:ring-0 cursor-pointer"
                                    />
                                    <span className={`text-[8px] font-semibold ${activeAptForCard?.check_papel ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                                      Papel
                                    </span>
                                  </label>
                                </div>
                              </div>
                            )}

                            {/* Controle de Posição & Navegação Combinados */}
                            {!isConcluded && (
                              <div className="mt-1.5 flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100">
                                {/* Posição na Fila */}
                                {cards.length > 1 ? (
                                  <div className="flex items-center gap-0.5 shrink-0 bg-slate-50 border border-slate-200/60 rounded px-1 py-0.2">
                                    <select
                                      value={activeAptForCard ? activeAptForCard.ordem : (cards.indexOf(prod) + 1)}
                                      onChange={(e) => {
                                        alterarOrdemLote(prod.id, col.id, Number(e.target.value));
                                      }}
                                      className="font-mono text-[8px] font-bold text-slate-700 bg-transparent border-none p-0 focus:outline-none cursor-pointer"
                                      id={`row-fila-pos-${prod.id}`}
                                    >
                                      {Array.from({ length: cards.length }, (_, j) => j + 1).map(num => (
                                        <option key={num} value={num}>
                                          #{num}
                                        </option>
                                      ))}
                                    </select>

                                    <button
                                      onClick={() => {
                                        const currentPos = activeAptForCard ? activeAptForCard.ordem : (cards.indexOf(prod) + 1);
                                        if (currentPos > 1) {
                                          alterarOrdemLote(prod.id, col.id, currentPos - 1);
                                        }
                                      }}
                                      disabled={(activeAptForCard ? activeAptForCard.ordem : (cards.indexOf(prod) + 1)) <= 1}
                                      className="p-0 text-[7px] text-slate-500 hover:text-indigo-600 disabled:opacity-30 cursor-pointer transition-all"
                                      title="Subir"
                                    >
                                      ▲
                                    </button>

                                    <button
                                      onClick={() => {
                                        const currentPos = activeAptForCard ? activeAptForCard.ordem : (cards.indexOf(prod) + 1);
                                        if (currentPos < cards.length) {
                                          alterarOrdemLote(prod.id, col.id, currentPos + 1);
                                        }
                                      }}
                                      disabled={(activeAptForCard ? activeAptForCard.ordem : (cards.indexOf(prod) + 1)) >= cards.length}
                                      className="p-0 text-[7px] text-slate-500 hover:text-indigo-600 disabled:opacity-30 cursor-pointer transition-all"
                                      title="Descer"
                                    >
                                      ▼
                                    </button>
                                  </div>
                                ) : (
                                  <span className="font-mono text-[8px] font-bold text-slate-400">#1</span>
                                )}

                                {/* Direcionamento de Fases */}
                                <div className="flex items-center gap-1">
                                  {prod.maquina_atual_idx > 0 && (
                                    <button
                                      onClick={() => {
                                        const anteriorMaqId = prod.roteiro[prod.maquina_atual_idx - 1];
                                        handleMoveCard(prod.id, col.id, anteriorMaqId, 'aguardando');
                                      }}
                                      className="flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1 py-0.5 font-sans text-[8px] font-extrabold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer"
                                      title="Voltar etapa"
                                    >
                                      <ArrowLeft size={7.5} />
                                      Voltar
                                    </button>
                                  )}

                                  <button
                                    onClick={() => {
                                      const proximaFaseIdx = prod.maquina_atual_idx + 1;
                                      const nextMaqId = proximaFaseIdx < prod.roteiro.length 
                                        ? prod.roteiro[proximaFaseIdx] 
                                        : 'concluido';
                                      handleMoveCard(prod.id, col.id, nextMaqId, 'aguardando');
                                    }}
                                    className="flex items-center gap-0.5 rounded bg-slate-900 px-1.5 py-0.5 font-sans text-[8px] font-extrabold text-white hover:bg-slate-800 transition-all shadow-3xs cursor-pointer"
                                    title="Avançar etapa"
                                  >
                                    Avançar
                                    <ArrowRight size={7.5} />
                                  </button>
                                </div>
                              </div>
                            )}

                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {viewMode === 'tabela' && (
        /* TABELA DE ACOMPANHAMENTO DE PEDIDOS */
        <div className="space-y-6">
          {/* STATS DE PAINEL DE CONTROLE DE PRODUÇÃO */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                  <BarChart2 size={18} />
                </div>
                <div>
                  <span className="font-sans text-3xs font-extrabold uppercase tracking-widest text-slate-400">Total de Lotes</span>
                  <p className="font-mono text-lg font-bold text-slate-900 mt-0.5">{pedidos.length}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-50 p-2 text-amber-600 animate-pulse">
                  <RotateCcw size={18} />
                </div>
                <div>
                  <span className="font-sans text-3xs font-extrabold uppercase tracking-widest text-slate-400">Em Produção Ativa</span>
                  <p className="font-mono text-lg font-bold text-amber-800 mt-0.5">
                    {pedidos.filter(p => p.status === 'producao').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-rose-50 p-2 text-rose-600">
                  <Clock size={18} />
                </div>
                <div>
                  <span className="font-sans text-3xs font-extrabold uppercase tracking-widest text-slate-400">Prazos Críticos</span>
                  <p className="font-mono text-lg font-bold text-rose-800 mt-0.5">
                    {pedidos.filter(p => p.status !== 'concluido' && p.status !== 'cancelado' && p.data_entrega < '2026-06-07').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <span className="font-sans text-3xs font-extrabold uppercase tracking-widest text-slate-400">Concluídos PCP</span>
                  <p className="font-mono text-lg font-bold text-emerald-800 mt-0.5">
                    {pedidos.filter(p => p.status === 'concluido').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* FILTROS INTEGRADOS */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-3xs">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between w-full">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar por Código do Pedido, Cliente ou Descrição do Lote..."
                  value={tabSearch}
                  onChange={(e) => setTabSearch(e.target.value)}
                  className="w-full bg-slate-50 pl-9 pr-3 py-2.5 font-sans text-xs font-semibold focus:bg-white border border-slate-200 focus:border-slate-800 rounded-lg focus:outline-none transition-all placeholder-slate-400"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 font-sans text-3xs text-slate-500 font-extrabold uppercase tracking-wider">
                  <Filter size={11} className="text-slate-400" />
                  <span>Status:</span>
                </div>
                <select
                  value={tabStatusFilter}
                  onChange={(e) => setTabStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-250 bg-white p-2 text-xs font-bold font-sans focus:outline-none cursor-pointer text-slate-700 shadow-3xs"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="pendente">Pendente</option>
                  <option value="producao">Em Produção</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>

                <div className="flex items-center gap-1.5 font-sans text-3xs text-slate-500 font-extrabold uppercase tracking-wider ml-1">
                  <span>Prioridade:</span>
                </div>
                <select
                  value={tabPrioFilter}
                  onChange={(e) => setTabPrioFilter(e.target.value)}
                  className="rounded-lg border border-slate-250 bg-white p-2 text-xs font-bold font-sans focus:outline-none cursor-pointer text-slate-700 shadow-3xs"
                >
                  <option value="todos">Todas</option>
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </select>

                <button
                  onClick={handleExportKanbanTabela}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-sans text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95 ml-auto sm:ml-0"
                  title="Exportar Tabela de Acompanhamento para planilha Excel (.xlsx)"
                  id="btn-export-kanban-tabela"
                >
                  <FileSpreadsheet size={14} />
                  <span>Exportar Excel</span>
                </button>
              </div>
            </div>

            {/* EXCLUDE STATUS CHECKBOXES */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2.5 border-t border-dashed border-slate-150">
              <span className="font-sans text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 select-none">
                <EyeOff size={11} className="text-slate-400" />
                Ocultar Status da Tabela:
              </span>
              <div className="flex flex-wrap items-center gap-4">
                {[
                  { id: 'pendente', label: 'Pendente' },
                  { id: 'producao', label: 'Em Produção' },
                  { id: 'concluido', label: 'Concluído' },
                  { id: 'cancelado', label: 'Cancelado' }
                ].map(item => {
                  const isChecked = kanbanExcludedStatuses.includes(item.id);
                  return (
                    <label key={item.id} className="inline-flex items-center gap-1.5 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setKanbanExcludedStatuses(prev => prev.filter(s => s !== item.id));
                          } else {
                            setKanbanExcludedStatuses(prev => [...prev, item.id]);
                          }
                        }}
                        className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className={`font-sans text-2xs transition-colors ${isChecked ? 'text-rose-600 font-bold line-through' : 'text-slate-600 font-medium group-hover:text-slate-900'}`}>
                        {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* TABELA PCP */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full border-collapse text-left text-xs text-slate-600">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-3xs text-slate-400 font-black uppercase tracking-wider select-none">
                  <th className="py-3 px-5 transition-colors">
                    <span className="flex items-center gap-1">
                      <span onClick={(e) => { e.stopPropagation(); toggleTabSort('id'); }} className="hover:underline cursor-pointer hover:text-slate-700">Pedido</span>
                      <span>/</span>
                      <span onClick={(e) => { e.stopPropagation(); toggleTabSort('cliente'); }} className="hover:underline cursor-pointer hover:text-slate-700">Cliente</span>
                      {tabSortField === 'id' && getTabSortIcon('id')}
                      {tabSortField === 'cliente' && getTabSortIcon('cliente')}
                    </span>
                  </th>
                  <th 
                    className="py-3 px-5 cursor-pointer hover:bg-slate-100/80 hover:text-slate-700 transition-colors"
                    onClick={() => toggleTabSort('produtos')}
                  >
                    <span className="flex items-center gap-1">
                      Produtos do Lote {getTabSortIcon('produtos')}
                    </span>
                  </th>
                  <th 
                    className="py-3 px-5 cursor-pointer hover:bg-slate-100/80 hover:text-slate-700 transition-colors"
                    onClick={() => toggleTabSort('fase_atual')}
                  >
                    <span className="flex items-center gap-1">
                      Fase Atual {getTabSortIcon('fase_atual')}
                    </span>
                  </th>
                  <th 
                    className="py-3 px-5 cursor-pointer hover:bg-slate-100/80 hover:text-slate-700 transition-colors text-right"
                    onClick={() => toggleTabSort('produzido_meta')}
                  >
                    <span className="flex items-center justify-end gap-1">
                      Produzido / Meta {getTabSortIcon('produzido_meta')}
                    </span>
                  </th>
                  <th 
                    className="py-3 px-5 cursor-pointer hover:bg-slate-100/80 hover:text-slate-700 transition-colors text-center"
                    onClick={() => toggleTabSort('progresso')}
                  >
                    <span className="flex items-center justify-center gap-1">
                      Progresso {getTabSortIcon('progresso')}
                    </span>
                  </th>
                  <th 
                    className="py-3 px-5 cursor-pointer hover:bg-slate-100/80 hover:text-slate-700 transition-colors"
                    onClick={() => toggleTabSort('data_entrega')}
                  >
                    <span className="flex items-center gap-1">
                      Entrega / Prazo {getTabSortIcon('data_entrega')}
                    </span>
                  </th>
                  <th 
                    className="py-3 px-5 cursor-pointer hover:bg-slate-100/80 hover:text-slate-700 transition-colors text-center"
                    onClick={() => toggleTabSort('prioridade')}
                  >
                    <span className="flex items-center justify-center gap-1">
                      Prioridade {getTabSortIcon('prioridade')}
                    </span>
                  </th>
                  <th 
                    className="py-3 px-5 cursor-pointer hover:bg-slate-100/80 hover:text-slate-700 transition-colors text-center"
                    onClick={() => toggleTabSort('sequencia')}
                  >
                    <span className="flex items-center justify-center gap-1">
                      Sequência {getTabSortIcon('sequencia')}
                    </span>
                  </th>
                  <th 
                    className="py-3 px-5 cursor-pointer hover:bg-slate-100/80 hover:text-slate-700 transition-colors text-center"
                    onClick={() => toggleTabSort('status')}
                  >
                    <span className="flex items-center justify-center gap-1">
                      Status {getTabSortIcon('status')}
                    </span>
                  </th>
                  <th className="py-3 px-5 text-right">Ficha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans font-medium">
                {(() => {
                  const itemsFiltered = pedidos.filter(ped => {
                    const matchesSearch = (() => {
                      if (!tabSearch.trim()) return true;
                      const q = tabSearch.toLowerCase().trim();
                      const cli = clientes.find(c => c?.id === ped.cliente_id);
                      const pedProds = produtos.filter(p => p.pedido_id === ped.id);
                      const descMatches = pedProds.some(p => p.descricao.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
                      return (
                        ped.id.toLowerCase().includes(q) ||
                        (cli?.nome && cli.nome.toLowerCase().includes(q)) ||
                        descMatches
                      );
                    })();
                    const matchesStatus = (tabStatusFilter === 'todos' || ped.status === tabStatusFilter) && !kanbanExcludedStatuses.includes(ped.status);
                    const matchesPriority = tabPrioFilter === 'todos' || ped.prioridade === tabPrioFilter;
                    return matchesSearch && matchesStatus && matchesPriority;
                  });

                  // Ordenação dinâmica
                  itemsFiltered.sort((a, b) => {
                    if (!tabSortField) return 0;

                    let aVal: any = '';
                    let bVal: any = '';

                    if (tabSortField === 'id') {
                      aVal = a.id;
                      bVal = b.id;
                      const aNum = parseInt(aVal.replace(/\D/g, ''), 10);
                      const bNum = parseInt(bVal.replace(/\D/g, ''), 10);
                      if (!isNaN(aNum) && !isNaN(bNum)) {
                        return tabSortDirection === 'asc' ? aNum - bNum : bNum - aNum;
                      }
                    } else if (tabSortField === 'cliente') {
                      const cliA = clientes.find(c => c?.id === a.cliente_id)?.nome || '';
                      const cliB = clientes.find(c => c?.id === b.cliente_id)?.nome || '';
                      aVal = cliA.toLowerCase();
                      bVal = cliB.toLowerCase();
                    } else if (tabSortField === 'produtos') {
                      const prodsA = produtos.filter(p => p.pedido_id === a.id).map(p => p.descricao).join(', ');
                      const prodsB = produtos.filter(p => p.pedido_id === b.id).map(p => p.descricao).join(', ');
                      aVal = prodsA.toLowerCase();
                      bVal = prodsB.toLowerCase();
                    } else if (tabSortField === 'fase_atual') {
                      const getActivePhaseName = (pedObj: typeof a) => {
                        const pedProds = produtos.filter(p => p.pedido_id === pedObj.id);
                        if (pedProds.length === 0) return '';
                        return pedProds.map(p => {
                          const isProdCompleted = p.maquina_atual_idx === p.roteiro.length;
                          if (isProdCompleted) return 'CONCLUÍDO / EXPEDIÇÃO';
                          const activeMachineId = p.roteiro[p.maquina_atual_idx] || p.roteiro[0];
                          const activeMacObj = maquinas.find(maq => maq.id === activeMachineId);
                          return activeMacObj ? activeMacObj.nome : 'Pronto';
                        }).join(', ');
                      };
                      aVal = getActivePhaseName(a).toLowerCase();
                      bVal = getActivePhaseName(b).toLowerCase();
                    } else if (tabSortField === 'produzido_meta') {
                      const getMeta = (pedObj: typeof a) => {
                        return produtos.filter(p => p.pedido_id === pedObj.id).reduce((sum, p) => sum + p.quantidade, 0);
                      };
                      aVal = getMeta(a);
                      bVal = getMeta(b);
                    } else if (tabSortField === 'progresso') {
                      const getProg = (pedObj: typeof a) => {
                        const pedProds = produtos.filter(p => p.pedido_id === pedObj.id);
                        let totalWorkGoal = 0;
                        let totalWorkDone = 0;
                        pedProds.forEach(item => {
                          const lastMachineId = item.roteiro && item.roteiro.length > 0 ? item.roteiro[item.roteiro.length - 1] : null;
                          const finalStageProduced = lastMachineId
                            ? apontamentos.filter(apt => apt.produto_id === item.id && apt.maquina_id === lastMachineId && apt.tipo === 'producao').reduce((sum, apt) => sum + apt.quantidade_produzida, 0)
                            : apontamentos.filter(apt => apt.produto_id === item.id && apt.tipo === 'producao').reduce((sum, apt) => sum + apt.quantidade_produzida, 0);
                          const steps = item.roteiro && item.roteiro.length > 0 ? item.roteiro.length : 1;
                          totalWorkGoal += steps * item.quantidade;
                          if (item.roteiro && item.roteiro.length > 0) {
                            item.roteiro.forEach(maqId => {
                              const producedOnMachine = apontamentos.filter(apt => apt.produto_id === item.id && apt.maquina_id === maqId && apt.tipo === 'producao').reduce((sum, apt) => sum + apt.quantidade_produzida, 0);
                              totalWorkDone += Math.min(item.quantidade, producedOnMachine);
                            });
                          } else {
                            totalWorkDone += Math.min(item.quantidade, finalStageProduced);
                          }
                        });
                        return totalWorkGoal > 0 ? Math.min(100, Math.round((totalWorkDone / totalWorkGoal) * 100)) : 0;
                      };
                      aVal = getProg(a);
                      bVal = getProg(b);
                    } else if (tabSortField === 'data_entrega') {
                      aVal = a.data_entrega;
                      bVal = b.data_entrega;
                    } else if (tabSortField === 'prioridade') {
                      const priorityWeight = { alta: 3, media: 2, baixa: 1 };
                      const weightA = priorityWeight[a.prioridade as 'alta'|'media'|'baixa'] || 0;
                      const weightB = priorityWeight[b.prioridade as 'alta'|'media'|'baixa'] || 0;
                      return tabSortDirection === 'asc' ? weightA - weightB : weightB - weightA;
                    } else if (tabSortField === 'sequencia') {
                      const seqA = a.prioridade_sequencia !== undefined && a.prioridade_sequencia !== null ? a.prioridade_sequencia : Infinity;
                      const seqB = b.prioridade_sequencia !== undefined && b.prioridade_sequencia !== null ? b.prioridade_sequencia : Infinity;
                      if (seqA === Infinity && seqB === Infinity) return 0;
                      if (seqA === Infinity) return 1;
                      if (seqB === Infinity) return -1;
                      return tabSortDirection === 'asc' ? seqA - seqB : seqB - seqA;
                    } else if (tabSortField === 'status') {
                      aVal = a.status;
                      bVal = b.status;
                    }

                    if (aVal < bVal) return tabSortDirection === 'asc' ? -1 : 1;
                    if (aVal > bVal) return tabSortDirection === 'asc' ? 1 : -1;
                    return 0;
                  });

                  if (itemsFiltered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          Nenhum lote correspondente cadastrado ou filtrado.
                        </td>
                      </tr>
                    );
                  }

                  return itemsFiltered.map(ped => {
                    const cli = clientes.find(c => c?.id === ped.cliente_id);
                    const pedProds = produtos.filter(p => p.pedido_id === ped.id);
                    const isLate = ped.status !== 'concluido' && ped.status !== 'cancelado' && ped.data_entrega < '2026-06-07';

                    // Compute aggregations across all items in order
                    let totalGoal = 0;
                    let totalFinished = 0;
                    let totalWorkGoal = 0;
                    let totalWorkDone = 0;

                    pedProds.forEach(item => {
                      totalGoal += item.quantidade;

                      const lastMachineId = item.roteiro && item.roteiro.length > 0 
                        ? item.roteiro[item.roteiro.length - 1] 
                        : null;

                      const finalStageProduced = lastMachineId
                        ? apontamentos
                            .filter(apt => apt.produto_id === item.id && apt.maquina_id === lastMachineId && apt.tipo === 'producao')
                            .reduce((sum, apt) => sum + apt.quantidade_produzida, 0)
                        : apontamentos
                            .filter(apt => apt.produto_id === item.id && apt.tipo === 'producao')
                            .reduce((sum, apt) => sum + apt.quantidade_produzida, 0);

                      totalFinished += finalStageProduced;

                      const steps = item.roteiro && item.roteiro.length > 0 ? item.roteiro.length : 1;
                      totalWorkGoal += steps * item.quantidade;

                      if (item.roteiro && item.roteiro.length > 0) {
                        item.roteiro.forEach(maqId => {
                          const producedOnMachine = apontamentos
                            .filter(apt => apt.produto_id === item.id && apt.maquina_id === maqId && apt.tipo === 'producao')
                            .reduce((sum, apt) => sum + apt.quantidade_produzida, 0);
                          totalWorkDone += Math.min(item.quantidade, producedOnMachine);
                        });
                      } else {
                        totalWorkDone += Math.min(item.quantidade, finalStageProduced);
                      }
                    });

                    const overallProg = totalWorkGoal > 0 
                      ? Math.min(100, Math.round((totalWorkDone / totalWorkGoal) * 100)) 
                      : 0;

                    return (
                      <tr key={ped.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Pedido / Cliente */}
                        <td className="py-4 px-5 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-mono text-xs font-black text-indigo-900 uppercase">
                              {ped.id}
                            </span>
                            <span className="text-3xs text-slate-500 font-extrabold uppercase mt-1 tracking-wider whitespace-nowrap max-w-[140px] truncate" title={cli?.nome}>
                              {cli?.nome || 'Cliente não definido'}
                            </span>
                          </div>
                        </td>

                        {/* Produtos do Lote */}
                        <td className="py-4 px-5">
                          <div className="space-y-1 max-w-[200px]" id={`prod-list-ped-${ped.id}`}>
                            {pedProds.map(p => {
                              const pModel = produtosModelos.find(m => m.descricao === p.descricao);
                              const pCode = pModel?.codigo;
                              return (
                                <div key={p.id} className="flex flex-col text-3xs font-semibold text-slate-700">
                                  <span className="line-clamp-1 truncate" title={p.descricao}>
                                    {pCode ? `[${pCode}] ` : ''}{p.descricao}
                                  </span>
                                  <span className="font-mono text-gray-400 mt-0.5">Dim: {p.dimensoes} • Ref: {p.id}</span>
                                </div>
                              );
                            })}
                            {pedProds.length === 0 && (
                              <span className="text-slate-400 font-mono text-3xs">Sem itens cadastrados</span>
                            )}
                          </div>
                        </td>

                        {/* Fase Atual da Produção */}
                        <td className="py-4 px-5 whitespace-nowrap">
                          <div className="space-y-1">
                            {pedProds.map(p => {
                              const isProdCompleted = p.maquina_atual_idx === p.roteiro.length;
                              let activePhase = '';
                              if (isProdCompleted) {
                                activePhase = 'CONCLUÍDO / EXPEDIÇÃO';
                              } else {
                                const activeMachineId = p.roteiro[p.maquina_atual_idx] || p.roteiro[0];
                                const activeMacObj = maquinas.find(maq => maq.id === activeMachineId);
                                activePhase = activeMacObj ? activeMacObj.nome : 'Pronto p/ Produção';
                              }

                              return (
                                <div key={p.id} className="flex items-center gap-1.5">
                                  <span className="rounded-sm bg-slate-100 px-1 py-0.5 font-mono text-[8px] text-slate-650 font-bold border border-slate-200">
                                    {p.id.split('-').pop()}
                                  </span>
                                  <span className={`font-sans tracking-tight text-3xs font-bold ${isProdCompleted ? 'text-emerald-700 font-mono font-black' : 'text-slate-800'}`}>
                                    {activePhase.toUpperCase()}
                                  </span>
                                </div>
                              );
                            })}
                            {pedProds.length === 0 && (
                              <span className="text-slate-400 font-mono text-3xs">-</span>
                            )}
                          </div>
                        </td>

                        {/* Produzido / Meta */}
                        <td className="py-4 px-5 text-right whitespace-nowrap">
                          <div className="flex flex-col font-mono text-3xs font-bold leading-tight">
                            <span className="text-slate-900">{totalFinished.toLocaleString('pt-BR')} un</span>
                            <span className="text-slate-400 font-medium mt-0.5">de {totalGoal.toLocaleString('pt-BR')} un</span>
                          </div>
                        </td>

                        {/* Progresso Geral */}
                        <td className="py-4 px-5 text-center min-w-[90px]">
                          <div className="flex flex-col items-center justify-center font-sans">
                            <span className="font-mono text-3xs font-extrabold text-slate-700">{overallProg}%</span>
                            <div className="w-16 bg-slate-150 border border-slate-200 h-1.5 rounded-full overflow-hidden mt-1 shadow-3xs">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  overallProg === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                                }`}
                                style={{ width: `${overallProg}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Entrega / Prazo */}
                        <td className="py-4 px-5 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1 font-mono text-3xs font-bold text-slate-850">
                              <CalendarCheck size={11} className="text-slate-400 shrink-0" />
                              <span>{new Date(ped.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                            </div>
                            {isLate ? (
                              <span className="mt-1 inline-flex items-center justify-center rounded bg-rose-100 px-1 py-0.5 font-sans text-[7.5px] font-black text-rose-700 animate-pulse border border-rose-200 tracking-wide">
                                🚨 ATRASADO
                              </span>
                            ) : (
                              <span className="mt-1 text-[8px] font-sans font-extrabold text-emerald-600 tracking-wider">
                                ✓ EM DIA
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Prioridade */}
                        <td className="py-4 px-5 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full font-sans text-5xs font-black uppercase tracking-wider ${getPriorityBadge(ped.prioridade)}`}>
                            {ped.prioridade}
                          </span>
                        </td>

                        {/* Sequência */}
                        <td className="py-4 px-5 text-center whitespace-nowrap font-mono text-xs font-bold text-indigo-900">
                          <div className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md border border-indigo-150 shadow-3xs hover:bg-indigo-100 transition-colors">
                            <span className="text-[9px] uppercase tracking-wide font-extrabold select-none">Seq:</span>
                            <input
                              type="number"
                              min="1"
                              className="w-10 bg-transparent border-none p-0 text-center text-xs font-black text-indigo-900 focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text"
                              defaultValue={ped.prioridade_sequencia ?? ''}
                              onBlur={(e) => {
                                const val = e.target.value ? Number(e.target.value) : undefined;
                                if (val !== ped.prioridade_sequencia) {
                                  editarPedidoPrioridadeSequencia(ped.id, val);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const target = e.currentTarget;
                                  const val = target.value ? Number(target.value) : undefined;
                                  if (val !== ped.prioridade_sequencia) {
                                    editarPedidoPrioridadeSequencia(ped.id, val);
                                  }
                                  target.blur();
                                }
                              }}
                              placeholder="-"
                            />
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-5 text-center whitespace-nowrap">
                          <span className={`inline-block border rounded px-1.5 py-0.5 font-mono text-5xs font-black uppercase tracking-wide ${
                            ped.status === 'pendente' ? 'bg-gray-100 text-gray-800 border-gray-250' :
                            ped.status === 'producao' ? 'bg-amber-100 text-amber-800 border-amber-250 animate-pulse' :
                            ped.status === 'concluido' ? 'bg-emerald-100 text-emerald-800 border-emerald-250' :
                            'bg-rose-100 text-rose-800 border-rose-250'
                          }`}>
                            {ped.status}
                          </span>
                        </td>

                        {/* Ficha / Detalhes */}
                        <td className="py-4 px-5 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedPedidoId(ped.id)}
                            className="inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-1 font-sans text-[10px] font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer shadow-3xs"
                            title="Visualizar andamento detalhado e apontamentos"
                            id={`view-pedido-ficha-${ped.id}`}
                          >
                            <Eye size={10} />
                            Ficha
                          </button>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES / FICHA COMPLETA DO PEDIDO */}
      {selectedPedidoId && (() => {
        const ped = pedidos.find(p => p.id === selectedPedidoId);
        if (!ped) return null;
        const cli = clientes.find(c => c?.id === ped.cliente_id);
        const pedProds = produtos.filter(p => p.pedido_id === ped.id);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-3xs p-4" id="modal-pedido-ficha-completa">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="font-mono text-3xs font-bold text-slate-400">FICHA DE PROTOCOLO PCP</span>
                  <h3 className="font-sans font-extrabold text-sm text-slate-900 mt-0.5">Lote de Produção: {ped.id}</h3>
                </div>
                <button 
                  onClick={() => setSelectedPedidoId(null)} 
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
                  id="close-pedido-ficha-modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Informações Gerais */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60 mb-5 text-2xs">
                <div>
                  <span className="text-slate-400">Cliente:</span>
                  <p className="font-sans font-bold text-slate-800 truncate">{cli?.nome || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Entrega Estimada:</span>
                  <p className="font-mono font-bold text-slate-800">
                    {new Date(ped.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Status Geral:</span>
                  <p className="mt-0.5">
                    <span className={`inline-block rounded px-1.5 py-0.5 font-mono text-3xs font-bold uppercase tracking-wider ${
                      ped.status === 'pendente' ? 'bg-gray-100 text-gray-800' :
                      ped.status === 'producao' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                      ped.status === 'concluido' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {ped.status}
                    </span>
                  </p>
                </div>
              </div>

              {/* Itens do Pedido */}
              <div className="space-y-6">
                <h4 className="font-sans font-extrabold text-xs text-slate-900 border-b border-slate-100 pb-1.5">Itens e Roteiro de Processamento</h4>
                
                {pedProds.map(prod => {
                  const lastMachineId = prod.roteiro && prod.roteiro.length > 0 ? prod.roteiro[prod.roteiro.length - 1] : null;
                  const prodApts = apontamentos.filter(a => a.produto_id === prod.id);
                  const finalProducedQty = lastMachineId
                    ? prodApts.filter(a => a.maquina_id === lastMachineId && a.tipo === 'producao').reduce((sum, a) => sum + a.quantidade_produzida, 0)
                    : prodApts.filter(a => a.tipo === 'producao').reduce((sum, a) => sum + a.quantidade_produzida, 0);

                  const steps = prod.roteiro && prod.roteiro.length > 0 ? prod.roteiro.length : 1;
                  const totalWorkGoal = steps * prod.quantidade;
                  let totalWorkDone = 0;
                  if (prod.roteiro && prod.roteiro.length > 0) {
                    prod.roteiro.forEach(maqId => {
                      const producedOnMachine = apontamentos
                        .filter(apt => apt.produto_id === prod.id && apt.maquina_id === maqId && apt.tipo === 'producao')
                        .reduce((sum, apt) => sum + apt.quantidade_produzida, 0);
                      totalWorkDone += Math.min(prod.quantidade, producedOnMachine);
                    });
                  } else {
                    totalWorkDone += Math.min(prod.quantidade, finalProducedQty);
                  }

                  const totalDonePercent = totalWorkGoal > 0 ? Math.min(100, Math.round((totalWorkDone / totalWorkGoal) * 100)) : 0;

                  const matchingModel = produtosModelos.find(m => m.descricao === prod.descricao);
                  const itemCode = matchingModel?.codigo;
                  const matchingInsumo = insumos.find(ins => ins.nome === prod.material || ins.id === prod.material);
                  const materialCode = matchingInsumo?.codigo;

                  return (
                    <div key={prod.id} className="border border-slate-200/80 rounded-xl p-4 space-y-4 shadow-3xs bg-white">
                      
                      {/* Descritivo Produto */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-indigo-50/40 p-3 rounded-lg border border-indigo-100">
                        <div>
                          <p className="font-sans font-bold text-2xs text-slate-855">
                            {itemCode ? `[${itemCode}] ` : ''}{prod.descricao}
                          </p>
                          <span className="font-mono text-3xs text-slate-450 mt-0.5 block">
                            Cód: {prod.id} • Dimen: {prod.dimensoes} • Material: {materialCode ? `[${materialCode}] ` : ''}{prod.material}
                          </span>
                        </div>
                        <div className="text-right font-mono text-2xs font-extrabold text-indigo-950 shrink-0 border border-indigo-150 p-1.5 rounded bg-white">
                          {finalProducedQty.toLocaleString('pt-BR')} / {prod.quantidade.toLocaleString('pt-BR')} un ({totalDonePercent}%)
                        </div>
                      </div>

                      {/* Informações Importantes da Ficha Técnica */}
                      {(() => {
                        const matchingModel = produtosModelos.find(m => m.descricao === prod.descricao);
                        const info = prod.informacoes_importantes || prod.observacoes || matchingModel?.informacoes_importantes || matchingModel?.observacoes;
                        if (!info) return null;
                        return (
                          <div className="bg-amber-50/70 border border-amber-200/80 p-2.5 rounded-lg space-y-1">
                            <p className="font-sans font-extrabold text-amber-950 text-3xs flex items-center gap-1.5 uppercase tracking-wide">
                              <AlertCircle size={12} className="text-amber-600 shrink-0" />
                              Informações Importantes / Ficha Técnica:
                            </p>
                            <p className="font-sans text-[11px] text-slate-800 whitespace-pre-wrap leading-relaxed">
                              {info}
                            </p>
                          </div>
                        );
                      })()}

                      {/* Documentos Técnicos do Produto */}
                      {(() => {
                        const matchingModel = produtosModelos.find(m => m.descricao === prod.descricao);
                        const facaUrl = prod.faca_pdf_url || matchingModel?.faca_pdf_url;
                        const facaNome = prod.faca_pdf_nome || prod.faca_pdf_name || matchingModel?.faca_pdf_nome || matchingModel?.faca_pdf_name || 'Faca do Produto';
                        const arteUrl = prod.arte_pdf_url || matchingModel?.arte_pdf_url;
                        const arteNome = prod.arte_pdf_nome || prod.arte_pdf_name || matchingModel?.arte_pdf_nome || matchingModel?.arte_pdf_name || 'Arte do Produto';

                        if (!facaUrl && !arteUrl) return null;

                        const getBadgeText = (url: string, name: string): string => {
                          const u = (url || '').toLowerCase();
                          const n = (name || '').toLowerCase();
                          if (u.startsWith('http') || u.startsWith('www.')) return 'LINK';
                          if (n.endsWith('.zip')) return 'ZIP';
                          if (n.endsWith('.rar')) return 'RAR';
                          if (n.endsWith('.7z')) return '7Z';
                          if (n.endsWith('.png') || n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'IMG';
                          return 'PDF';
                        };

                        const facaBadge = facaUrl ? getBadgeText(facaUrl, facaNome) : 'PDF';
                        const arteBadge = arteUrl ? getBadgeText(arteUrl, arteNome) : 'PDF';

                        const isFacaLink = facaUrl?.startsWith('http') || facaUrl?.startsWith('www.');
                        const isArteLink = arteUrl?.startsWith('http') || arteUrl?.startsWith('www.');

                        return (
                          <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-200/60 space-y-2">
                            <p className="font-sans font-bold text-slate-700 text-3xs flex items-center gap-1 uppercase tracking-wider">
                              <FileText size={12} className="text-slate-400" />
                              Arquivos & Links Técnicos:
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {facaUrl && (
                                <a
                                  href={facaUrl}
                                  target={isFacaLink ? "_blank" : undefined}
                                  rel={isFacaLink ? "noopener noreferrer" : undefined}
                                  download={isFacaLink ? undefined : facaNome}
                                  className="flex items-center gap-2 p-1.5 rounded-lg border border-rose-150 bg-rose-25 hover:bg-rose-50 hover:border-rose-300 transition-all cursor-pointer shadow-3xs"
                                  title={isFacaLink ? `Abrir Link da Faca: ${facaNome}` : `Baixar Faca: ${facaNome}`}
                                >
                                  <div className="w-6 h-6 rounded bg-rose-100 flex items-center justify-center text-rose-700 font-extrabold text-[8px] shrink-0">
                                    {facaBadge}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-sans font-bold text-rose-800 text-3xs truncate">
                                      {facaNome}
                                    </p>
                                    <span className="text-[7.5px] text-rose-500 font-medium uppercase tracking-wide">
                                      {isFacaLink ? 'Abrir Link' : 'Baixar'}
                                    </span>
                                  </div>
                                </a>
                              )}
                              {arteUrl && (
                                <a
                                  href={arteUrl}
                                  target={isArteLink ? "_blank" : undefined}
                                  rel={isArteLink ? "noopener noreferrer" : undefined}
                                  download={isArteLink ? undefined : arteNome}
                                  className="flex items-center gap-2 p-1.5 rounded-lg border border-indigo-150 bg-indigo-25 hover:bg-indigo-50 hover:border-indigo-300 transition-all cursor-pointer shadow-3xs"
                                  title={isArteLink ? `Abrir Link da Arte: ${arteNome}` : `Baixar Arte: ${arteNome}`}
                                >
                                  <div className="w-6 h-6 rounded bg-indigo-100 flex items-center justify-center text-indigo-700 font-extrabold text-[8px] shrink-0">
                                    {arteBadge}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-sans font-bold text-indigo-800 text-3xs truncate">
                                      {arteNome}
                                    </p>
                                    <span className="text-[7.5px] text-indigo-500 font-medium uppercase tracking-wide">
                                      {isArteLink ? 'Abrir Link' : 'Baixar'}
                                    </span>
                                  </div>
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Progresso do roteiro */}
                      <div>
                        <p className="font-sans text-[10px] text-slate-455 uppercase font-black tracking-wider mb-2">Fases de Máquina Planejadas:</p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          {prod.roteiro.map((maqId, idx) => {
                            const maqObj = maquinas.find(m => m.id === maqId);
                            const isPassed = idx < prod.maquina_atual_idx;
                            const isCurrent = idx === prod.maquina_atual_idx;
                            
                            return (
                              <div 
                                key={`${maqId}-${idx}`} 
                                className={`flex-1 flex flex-col justify-between p-2 rounded-lg border text-3xs ${
                                  isCurrent ? 'border-indigo-650 bg-indigo-50/40 text-indigo-950 font-bold shadow-3xs' :
                                  isPassed ? 'border-emerald-200 bg-emerald-50/20 text-emerald-800 font-bold' :
                                  'border-slate-150 text-slate-500 bg-slate-50/10'
                                }`}
                              >
                                <span className="font-mono text-[9px] text-slate-400 block mb-1">Passo {idx + 1}</span>
                                <span className="font-bold leading-tight">{maqObj?.nome || 'Fase'}</span>
                                <span className="mt-1 font-mono uppercase text-[8px] tracking-wide text-right">
                                  {isCurrent ? '● Ativo' : isPassed ? '✓ Concluido' : 'Aguardando'}
                                </span>
                              </div>
                            );
                          })}
                          {prod.maquina_atual_idx === prod.roteiro.length && (
                            <div className="flex-1 flex flex-col justify-between p-2 rounded-lg border border-emerald-500 bg-emerald-100/40 text-emerald-800 text-3xs font-sans font-bold shadow-3xs">
                              <span className="font-mono text-[9px] text-emerald-500 block mb-1">Protocolo Final</span>
                              <span>EXPEDIÇÃO FINALIZADA</span>
                              <span className="mt-1 font-mono uppercase text-[8px] tracking-wide text-right">✓ Pronto</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Histórico de Apontamentos deste produto */}
                      <div>
                        <p className="font-sans text-[10px] text-slate-455 uppercase font-black tracking-wider mb-2">Rastreabilidade (Apontamentos de Chão de Fábrica):</p>
                        {prodApts.length === 0 ? (
                          <div className="text-center py-4 bg-slate-50/30 rounded-lg border border-dashed border-slate-200 text-slate-400 italic font-sans text-3xs">
                            Nenhum apontamento voluntário registrado para este material ainda.
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-lg border border-slate-200">
                            <table className="w-full text-left text-3xs font-medium">
                              <thead className="bg-slate-50 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 text-[8px]">
                                <tr>
                                  <th className="py-2 px-3">Data/Hora</th>
                                  <th className="py-2 px-3">Operador</th>
                                  <th className="py-2 px-3">Máquina</th>
                                  <th className="py-2 px-3 text-right">Boa</th>
                                  <th className="py-2 px-3 text-right">Perda</th>
                                  <th className="py-2 px-3">Motivo Perda</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-sans">
                                {prodApts.map((apt, index) => {
                                  const reqMac = maquinas.find(m => m.id === apt.maquina_id);
                                  return (
                                    <tr key={index} className="hover:bg-slate-50/20">
                                      <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-500">
                                        {apt.data ? new Date(apt.data).toLocaleString('pt-BR') : '-'}
                                      </td>
                                      <td className="py-2 px-3 whitespace-nowrap font-medium text-slate-800">
                                        {apt.operador || 'Sistema'}
                                      </td>
                                      <td className="py-2 px-3 whitespace-nowrap font-bold text-indigo-950">
                                        {reqMac?.nome || apt.maquina_id}
                                      </td>
                                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-slate-900 font-bold">
                                        {apt.quantidade_produzida.toLocaleString('pt-BR')} un
                                      </td>
                                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-rose-600 font-bold">
                                        {apt.quantidade_perda > 0 ? `${apt.quantidade_perda.toLocaleString('pt-BR')} un` : '0'}
                                      </td>
                                      <td className="py-2 px-3 text-slate-400 truncate max-w-[120px]" title={apt.motivo_perda}>
                                        {apt.motivo_perda || '-'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Botão Fechar */}
              <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedPedidoId(null)}
                  className="rounded-lg bg-slate-900 px-4 py-2 font-sans font-bold text-xs text-white hover:bg-slate-800 cursor-pointer shadow-xs"
                >
                  Fechar Ficha do Lote
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL DETALHES DE PESO E ROTEIRO DO PRODUTO */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-3xs" id="modal-kanban-details">
          <div className="w-full max-w-md rounded-2xl border border-gray-150 bg-white p-5 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-4 shrink-0">
              <div>
                <span className="font-mono text-3xs font-bold text-gray-400">CÓDIGO: {selectedCard.id}</span>
                <h3 className="font-sans font-extrabold text-xs text-slate-900 mt-0.5">Fator de Consumo & Roteiro</h3>
              </div>
              <button 
                onClick={() => setSelectedCard(null)} 
                className="rounded p-1 text-gray-400 hover:bg-gray-105"
                id="close-kanban-details-modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3.5 text-2xs text-gray-650 overflow-y-auto pr-1 flex-1">
              <div className="bg-gray-25/50 p-2.5 rounded-lg border border-gray-100">
                <p className="font-sans font-bold text-gray-800">Embalagem:</p>
                <p className="font-sans font-normal text-gray-700 mt-0.5">{selectedCard.descricao}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-3xs">
                <div>
                  <span className="text-gray-400 font-sans">Material:</span>
                  <p className="font-bold text-gray-800 line-clamp-1">{selectedCard.material}</p>
                </div>
                <div>
                  <span className="text-gray-400 font-sans">Peso unitário:</span>
                  <p className="font-bold text-gray-800">{(selectedCard.fator_consumo * 1000).toFixed(0)} gramas</p>
                </div>
              </div>

              {/* Informações Importantes da Ficha Técnica */}
              {(() => {
                const matchingModel = produtosModelos.find(m => m.descricao === selectedCard.descricao);
                const info = selectedCard.informacoes_importantes || selectedCard.observacoes || matchingModel?.informacoes_importantes || matchingModel?.observacoes;
                if (!info) return null;
                return (
                  <div className="bg-amber-50/80 border border-amber-200/80 p-2.5 rounded-lg space-y-1">
                    <p className="font-sans font-extrabold text-amber-950 text-3xs flex items-center gap-1.5 uppercase tracking-wide">
                      <AlertCircle size={12} className="text-amber-600 shrink-0" />
                      Informações Importantes / Ficha Técnica:
                    </p>
                    <p className="font-sans text-[11px] text-slate-800 whitespace-pre-wrap leading-relaxed font-medium">
                      {info}
                    </p>
                  </div>
                );
              })()}

              {/* Documentos do Produto (Faca e Arte PDFs em miniaturas) */}
              {(() => {
                const matchingModel = produtosModelos.find(m => m.descricao === selectedCard.descricao);
                const facaUrl = selectedCard.faca_pdf_url || matchingModel?.faca_pdf_url;
                const facaNome = selectedCard.faca_pdf_nome || selectedCard.faca_pdf_name || matchingModel?.faca_pdf_nome || matchingModel?.faca_pdf_name || 'Faca do Produto';
                const arteUrl = selectedCard.arte_pdf_url || matchingModel?.arte_pdf_url;
                const arteNome = selectedCard.arte_pdf_nome || selectedCard.arte_pdf_name || matchingModel?.arte_pdf_nome || matchingModel?.arte_pdf_name || 'Arte do Produto';

                if (!facaUrl && !arteUrl) return null;

                const getBadgeText = (url: string, name: string): string => {
                  const u = (url || '').toLowerCase();
                  const n = (name || '').toLowerCase();
                  if (u.startsWith('http') || u.startsWith('www.')) return 'LINK';
                  if (n.endsWith('.zip')) return 'ZIP';
                  if (n.endsWith('.rar')) return 'RAR';
                  if (n.endsWith('.7z')) return '7Z';
                  if (n.endsWith('.png') || n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'IMG';
                  return 'PDF';
                };

                const facaBadge = facaUrl ? getBadgeText(facaUrl, facaNome) : 'PDF';
                const arteBadge = arteUrl ? getBadgeText(arteUrl, arteNome) : 'PDF';

                const isFacaLink = facaUrl?.startsWith('http') || facaUrl?.startsWith('www.');
                const isArteLink = arteUrl?.startsWith('http') || arteUrl?.startsWith('www.');

                return (
                  <div className="bg-gray-25/50 p-2.5 rounded-lg border border-gray-100 space-y-2">
                    <p className="font-sans font-bold text-gray-800 text-2xs flex items-center gap-1">
                      <FileText size={13} className="text-gray-500" />
                      Arquivos & Links Técnicos:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {facaUrl && (
                        <a
                          href={facaUrl}
                          target={isFacaLink ? "_blank" : undefined}
                          rel={isFacaLink ? "noopener noreferrer" : undefined}
                          download={isFacaLink ? undefined : facaNome}
                          className="flex flex-col items-center justify-center p-2 rounded-lg border border-rose-150 bg-rose-25 hover:bg-rose-50 hover:border-rose-300 transition-all text-center cursor-pointer shadow-3xs"
                          title={isFacaLink ? `Abrir Link da Faca: ${facaNome}` : `Baixar Faca: ${facaNome}`}
                        >
                          <div className="w-8 h-8 rounded-md bg-rose-100 flex items-center justify-center text-rose-700 font-extrabold text-[9px] shadow-3xs">
                            {facaBadge}
                          </div>
                          <span className="font-sans font-bold text-rose-800 text-3xs mt-1 truncate w-full px-1">
                            {facaNome}
                          </span>
                          <span className="text-[8px] text-rose-500 font-medium">
                            {isFacaLink ? 'Abrir Link' : 'Baixar Faca'}
                          </span>
                        </a>
                      )}
                      {arteUrl && (
                        <a
                          href={arteUrl}
                          target={isArteLink ? "_blank" : undefined}
                          rel={isArteLink ? "noopener noreferrer" : undefined}
                          download={isArteLink ? undefined : arteNome}
                          className="flex flex-col items-center justify-center p-2 rounded-lg border border-indigo-150 bg-indigo-25 hover:bg-indigo-50 hover:border-indigo-300 transition-all text-center cursor-pointer shadow-3xs"
                          title={isArteLink ? `Abrir Link da Arte: ${arteNome}` : `Baixar Arte: ${arteNome}`}
                        >
                          <div className="w-8 h-8 rounded-md bg-indigo-100 flex items-center justify-center text-indigo-700 font-extrabold text-[9px] shadow-3xs">
                            {arteBadge}
                          </div>
                          <span className="font-sans font-bold text-indigo-800 text-3xs mt-1 truncate w-full px-1">
                            {arteNome}
                          </span>
                          <span className="text-[8px] text-indigo-500 font-medium">
                            {isArteLink ? 'Abrir Link' : 'Baixar Arte'}
                          </span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Esquema de Refilamento / Corte do Insumo Principal */}
              {selectedCard.insumos_ficha && selectedCard.insumos_ficha.length > 0 && selectedCard.insumos_ficha[0].formato_refilamento && (() => {
                const item = selectedCard.insumos_ficha[0];
                const wOrig = item.largura_original ?? 76;
                const hOrig = item.altura_original ?? 112;
                const wRef = item.largura_refilada ?? 56;
                const hRef = item.altura_refilada ?? 76;
                const format = item.formato_refilamento ?? 'meia';

                // Bounding box for clear readability (280w x 160h)
                const maxW = 280;
                const maxH = 160;
                const scale = Math.min(maxW / wOrig, maxH / hOrig);

                const svgWOrig = wOrig * scale;
                const svgHOrig = hOrig * scale;

                const calcFit = (orig: number, ref: number): number => {
                  if (ref <= 0) return 1;
                  const ratio = orig / ref;
                  const ceilVal = Math.ceil(ratio);
                  if (Math.abs(ceilVal - ratio) < 0.02) {
                    return ceilVal;
                  }
                  return Math.floor(ratio + 0.01) || 1;
                };

                const nWidthNormal = calcFit(wOrig, wRef);
                const nHeightNormal = calcFit(hOrig, hRef);
                const totalNormal = nWidthNormal * nHeightNormal;

                const nWidthRot = calcFit(wOrig, hRef);
                const nHeightRot = calcFit(hOrig, wRef);
                const totalRot = nWidthRot * nHeightRot;

                const isRotated = totalRot > totalNormal;

                const finalCols = Math.max(1, isRotated ? nWidthRot : nWidthNormal);
                const finalRows = Math.max(1, isRotated ? nHeightRot : nHeightNormal);
                const drawWRef = isRotated ? hRef : wRef;
                const drawHRef = isRotated ? wRef : hRef;

                const canvasW = 300;
                const canvasH = 180;
                const dx = (canvasW - svgWOrig) / 2;
                const dy = (canvasH - svgHOrig) / 2;

                const formatNames: Record<string, string> = {
                  inteiro: 'Folha Inteira',
                  meia: 'Meia Folha (1/2)',
                  quarto: 'Quarto (1/4)',
                  oitavo: 'Oitavo (1/8)',
                  personalizado: 'Personalizado'
                };

                const aproveitamento = Math.min(100, Math.round(((drawWRef * drawHRef * finalCols * finalRows) / (wOrig * hOrig)) * 100));

                return (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col items-center shadow-sm">
                    <div className="flex justify-between items-center w-full text-[10px] font-mono text-slate-300 border-b border-slate-800 pb-2 mb-2 uppercase font-bold tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <Scissors size={13} className="text-emerald-400 animate-pulse" />
                        Esquema de Refilamento & Corte
                      </span>
                      <span className="text-emerald-400 font-extrabold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80">
                        {formatNames[format] || format}
                      </span>
                    </div>

                    <div className="relative w-full flex justify-center">
                      <svg viewBox={`0 0 ${canvasW} ${canvasH}`} className="w-full max-w-[300px] h-auto bg-slate-950 rounded-lg border border-slate-850 shadow-inner my-1">
                        <defs>
                          <pattern id={`grid-kanban-${selectedCard.id}`} width="10" height="10" patternUnits="userSpaceOnUse">
                            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.8"/>
                          </pattern>
                        </defs>
                        <rect width={canvasW} height={canvasH} fill={`url(#grid-kanban-${selectedCard.id})`} />

                        {/* Outer Original Sheet */}
                        <rect
                          x={dx}
                          y={dy}
                          width={svgWOrig}
                          height={svgHOrig}
                          fill="rgba(99, 102, 241, 0.05)"
                          stroke="#6366f1"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                          rx="3"
                        />

                        {/* Inner Refilado Sheets */}
                        {Array.from({ length: finalCols }).map((_, c) => {
                          return Array.from({ length: finalRows }).map((_, r) => {
                            const rx = dx + c * drawWRef * scale;
                            const ry = dy + r * drawHRef * scale;
                            const rw = Math.min(drawWRef * scale, dx + svgWOrig - rx);
                            const rh = Math.min(drawHRef * scale, dy + svgHOrig - ry);
                            const sheetIndex = c * finalRows + r + 1;

                            if (rw <= 1 || rh <= 1) return null;

                            return (
                              <g key={`${c}-${r}`}>
                                <rect
                                  x={rx}
                                  y={ry}
                                  width={rw}
                                  height={rh}
                                  fill="rgba(16, 185, 129, 0.15)"
                                  stroke="#10b981"
                                  strokeWidth="1.2"
                                  rx="2"
                                />
                                <text
                                  x={rx + rw / 2}
                                  y={ry + rh / 2 + 2.5}
                                  fill="#10b981"
                                  fontSize="9"
                                  fontWeight="bold"
                                  fontFamily="monospace"
                                  textAnchor="middle"
                                >
                                  #{sheetIndex}
                                </text>
                              </g>
                            );
                          });
                        })}

                        {/* Dimension Text Original */}
                        <text
                          x={dx + svgWOrig / 2}
                          y={dy + svgHOrig - 4}
                          fill="#818cf8"
                          fontSize="8"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          Folha Base: {wOrig} x {hOrig} cm
                        </text>
                      </svg>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2.5 gap-y-1 w-full mt-2 text-[9px] font-sans text-slate-300 border-t border-slate-800 pt-2 text-left">
                      <div className="flex justify-between items-center bg-slate-950/60 p-1.5 rounded border border-slate-850">
                        <span className="text-slate-400">Rendimento de Refile:</span>
                        <span className="font-mono text-indigo-300 font-extrabold">
                          {finalCols * finalRows} {finalCols * finalRows === 1 ? 'folha' : 'folhas'} ({finalCols}x{finalRows})
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-950/60 p-1.5 rounded border border-slate-850">
                        <span className="text-slate-400">Aproveitamento Total:</span>
                        <span className="font-mono text-emerald-400 font-extrabold">
                          {aproveitamento}% da área
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-950/60 p-1.5 rounded border border-slate-850">
                        <span className="text-slate-400">Folha Base (Entrada):</span>
                        <span className="font-mono text-slate-200 font-bold">
                          {wOrig} x {hOrig} cm
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-950/60 p-1.5 rounded border border-slate-850">
                        <span className="text-slate-400">Peça Refilada (Saída):</span>
                        <span className="font-mono text-slate-200 font-bold">
                          {wRef} x {hRef} cm
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="border-t border-gray-100 pt-3.5">
                <span className="font-mono text-3xs font-bold uppercase tracking-widest text-gray-400 block mb-2">
                  Sequência do Roteiro Gráfico
                </span>
                <div className="space-y-2.5">
                  {selectedCard.roteiro.map((maqId, idx) => {
                    const maqObj = maquinas.find(m => m.id === maqId);
                    const isPassed = idx < selectedCard.maquina_atual_idx;
                    const isCurrent = idx === selectedCard.maquina_atual_idx;
                    
                    // Apontamentos realizados nesta fase
                    const phaseApts = apontamentos.filter(
                      apt => apt.produto_id === selectedCard.id && apt.maquina_id === maqId
                    );
                    const hasApts = phaseApts.length > 0;
                    const isExpanded = !!expandedCardPhases[`${selectedCard.id}-${maqId}-${idx}`];

                    const phaseProdQty = phaseApts
                      .filter(apt => apt.tipo === 'producao')
                      .reduce((sum, apt) => sum + apt.quantidade_produzida, 0);
                    const phaseOutstanding = Math.max(0, selectedCard.quantidade - phaseProdQty);

                    return (
                      <div key={`${maqId}-${idx}`} className="space-y-1">
                        <div 
                          className={`flex items-center justify-between rounded-lg p-2 border transition-colors ${
                            isCurrent ? 'border-indigo-650 bg-indigo-25/50 text-indigo-900 font-bold' :
                            isPassed ? 'border-gray-200 bg-gray-50 text-gray-400' :
                            'border-gray-200 text-gray-700 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-sans">
                            <span className="font-mono text-3xs text-gray-400">Fase {idx + 1}:</span>
                            <span>{maqObj?.nome || maqId}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {phaseProdQty > 0 && (
                              <span className="font-mono text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200/50 rounded px-1.5 py-0.5">
                                {phaseProdQty.toLocaleString('pt-BR')} / {selectedCard.quantidade.toLocaleString('pt-BR')} un
                                {phaseOutstanding > 0 ? ` (Falta: ${phaseOutstanding.toLocaleString('pt-BR')})` : ''}
                              </span>
                            )}
                            <span className="font-mono text-3xs uppercase">
                              {isCurrent ? 'Produzindo' : isPassed ? 'Concluído' : 'Aguardando'}
                            </span>
                            {hasApts && (
                              <button
                                type="button"
                                onClick={() => {
                                  const key = `${selectedCard.id}-${maqId}-${idx}`;
                                  setExpandedCardPhases(prev => ({
                                    ...prev,
                                    [key]: !prev[key]
                                  }));
                                }}
                                className="flex items-center justify-center rounded p-1 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer bg-white"
                                title="Ver histórico de apontamentos nesta fase"
                              >
                                <ChevronDown 
                                  size={12} 
                                  className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                                />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Collapsible content with historical appointments of this phase */}
                        {hasApts && isExpanded && (
                          <div className="bg-slate-50 rounded-lg border border-slate-150 p-2.5 space-y-2 text-3xs text-slate-700 font-sans shadow-inner animate-fadeIn">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 border-b border-slate-200 pb-1 uppercase tracking-wider">
                              <span>Apontamentos ({phaseApts.length})</span>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {phaseApts.map((apt) => {
                                const isProd = apt.tipo === 'producao';
                                const labelTipo = apt.tipo === 'setup' ? 'Setup' :
                                                  apt.tipo === 'parada_manutencao' ? 'Manutenção' :
                                                  apt.tipo === 'parada_repouso' ? 'Descanso' :
                                                  isProd ? 'Produção' : 'Outros';
                                return (
                                  <div key={apt.id} className="bg-white p-2 rounded border border-slate-200 space-y-1.5 shadow-3xs text-left">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className={`text-[8px] font-sans px-1 py-0.2 rounded font-bold uppercase ${
                                        apt.tipo === 'producao' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                                        apt.tipo === 'setup' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                        apt.tipo === 'parada_manutencao' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                        apt.tipo === 'parada_repouso' ? 'bg-sky-50 text-sky-700 border border-sky-100' :
                                        'bg-slate-150 text-slate-700 border border-slate-200'
                                      }`}>
                                        {labelTipo}
                                      </span>
                                      <span className="text-[8px] font-mono text-slate-400">
                                        {apt.data_inicio ? new Date(apt.data_inicio).toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}) : '-'}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                                      <div>
                                        <span className="text-slate-400 block text-[9px]">Operador</span>
                                        <span className="font-semibold text-slate-800">{apt.operador_id}</span>
                                      </div>
                                      {isProd && (
                                        <div>
                                          <span className="text-slate-400 block text-[9px]">Quantidade</span>
                                          <span className="font-mono font-bold text-slate-850">
                                            {apt.quantidade_produzida?.toLocaleString('pt-BR')} un
                                          </span>
                                          {apt.quantidade_refugo > 0 && (
                                            <span className="text-rose-600 text-[8px] block font-mono font-semibold">
                                              Perda: -{apt.quantidade_refugo}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      {apt.tempo_parado > 0 && (
                                        <div className="col-span-2 bg-rose-50/50 p-1 rounded text-rose-800 border border-rose-100 text-[9px]">
                                          <span className="font-bold">Tempo Parado:</span> {apt.tempo_parado} min
                                          {apt.motivo_parada && (
                                            <span className="block italic mt-0.5">Motivo: {apt.motivo_parada}</span>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {apt.justificativa && (
                                      <div className="text-[9px] bg-slate-50 p-1.5 rounded text-slate-600 border border-slate-150 italic break-words leading-tight">
                                        Obs: {apt.justificativa}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            <button
              onClick={() => setSelectedCard(null)}
              className="mt-6 w-full rounded-lg bg-slate-900 py-2 font-sans font-bold text-xs text-white hover:bg-slate-800 shrink-0 cursor-pointer"
            >
              Fechar Detalhes
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE APONTAMENTO OBRIGATÓRIO AO AVANÇAR ETAPA */}
      {aptModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-3xs p-4 overflow-y-auto font-sans" id="modal-apt-avancar">
          <div className="w-full max-w-md rounded-2xl border border-slate-150 bg-white shadow-2xl flex flex-col my-8">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <ClipboardPen size={18} className="text-indigo-650 animate-pulse" />
                <div className="text-left">
                  <h3 className="font-sans font-bold text-sm text-slate-900">Registrar Apontamento</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Obrigatório para avançar a etapa de produção</p>
                </div>
              </div>
              <button 
                onClick={() => setAptModalData(null)} 
                className="rounded p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
                id="close-apt-modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmarApontamentoModal} className="flex flex-col p-5 space-y-4">
              {/* Product Info Summary */}
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 text-[11px] space-y-1.5 text-left">
                <div className="flex justify-between font-medium">
                  <span className="text-indigo-900 font-bold">Lote / Material:</span>
                  <span className="text-indigo-950 font-semibold text-right max-w-[200px] truncate">{aptModalData.produto.descricao}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-2xs pt-1.5 border-t border-indigo-100/60 text-indigo-700 font-semibold font-mono">
                  <div>Cód: <span className="text-indigo-950">{aptModalData.produto.id}</span></div>
                  <div>Pedido: <span className="text-indigo-950">{aptModalData.produto.pedido_id}</span></div>
                  <div>Máquina Atual: <span className="text-indigo-950 font-bold">{maquinas.find(m => m.id === aptModalData.origemMaquinaId)?.nome || aptModalData.origemMaquinaId}</span></div>
                  <div>Qtd Lote: <span className="text-indigo-950">{aptModalData.produto.quantidade.toLocaleString('pt-BR')} un</span></div>
                </div>
              </div>

              {aptModalError && (
                <div className="rounded-lg bg-rose-50 border border-rose-100 p-2.5 text-2xs font-bold text-rose-800 text-left">
                  {aptModalError}
                </div>
              )}

              {/* OPERADOR */}
              <div className="space-y-1 text-left">
                <label className="block font-sans text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Operador Responsável *
                </label>
                <select
                  required
                  value={aptOperadorId}
                  onChange={(e) => setAptOperadorId(e.target.value)}
                  className="block w-full rounded-lg border border-slate-205 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-600 focus:outline-none"
                  id="modal-apt-select-operator"
                >
                  <option value="">-- Selecione o Operador --</option>
                  {operadores.map(op => (
                    <option key={op.id} value={op.id}>{op.nome} ({op.turno})</option>
                  ))}
                </select>
              </div>

              {/* TIPO DE APONTAMENTO */}
              <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-left">
                <div>
                  <label className="block font-sans text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Tipo de Apontamento *
                  </label>
                  <select
                    required
                    value={aptTipo}
                    onChange={(e) => {
                      const t = e.target.value as any;
                      setAptTipo(t);
                      if (t !== 'producao') {
                        setAptQtdProduzida(0);
                      } else if (aptModalData) {
                        const existingProductionQty = apontamentos
                          .filter(apt => apt.produto_id === aptModalData.produto.id && 
                                         apt.maquina_id === aptModalData.origemMaquinaId && 
                                         apt.tipo === 'producao')
                          .reduce((acc, apt) => acc + apt.quantidade_produzida, 0);
                        const outstandingQty = Math.max(0, aptModalData.produto.quantidade - existingProductionQty);
                        setAptQtdProduzida(outstandingQty > 0 ? outstandingQty : aptModalData.produto.quantidade);
                      }
                    }}
                    className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-600 focus:outline-none"
                    id="modal-apt-select-type"
                  >
                    <option value="producao">Produção</option>
                    <option value="setup">Setup</option>
                    <option value="parada_manutencao">Parada Manutenção</option>
                    <option value="parada_repouso">Parada Descanso</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                {(aptTipo === 'parada_manutencao' || aptTipo === 'parada_repouso' || aptTipo === 'outros') && (
                  <div className="space-y-1">
                    <label className="block font-sans text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Justificativa / Motivo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Informe o motivo detalhado..."
                      value={aptJustificativa}
                      onChange={(e) => setAptJustificativa(e.target.value)}
                      className="block w-full rounded border border-slate-200 py-1.5 px-3 text-xs text-slate-800 focus:border-indigo-600 focus:outline-none bg-white font-sans"
                    />
                  </div>
                )}
              </div>

              {/* HORÁRIOS */}
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="space-y-1">
                  <label className="block font-sans text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Início da Etapa *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={aptDataInicio}
                    onChange={(e) => setAptDataInicio(e.target.value)}
                    className="block w-full rounded-lg border border-slate-200 py-1.5 px-3 font-mono text-[11px] text-slate-800 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-sans text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Término da Etapa *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={aptDataFim}
                    onChange={(e) => setAptDataFim(e.target.value)}
                    className="block w-full rounded-lg border border-slate-200 py-1.5 px-3 font-mono text-[11px] text-slate-800 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* QUANTIDADES */}
              {aptTipo === 'producao' && aptModalData && (() => {
                const targetQty = aptModalData.produto.quantidade;
                const existingProductionQty = apontamentos
                  .filter(apt => apt.produto_id === aptModalData.produto.id && 
                                 apt.maquina_id === aptModalData.origemMaquinaId && 
                                 apt.tipo === 'producao')
                  .reduce((acc, apt) => acc + apt.quantidade_produzida, 0);
                const outstandingQty = Math.max(0, targetQty - existingProductionQty);

                return (
                  <div className="space-y-3">
                    {/* Indicadores de Saldo e Rastreabilidade */}
                    <div className="grid grid-cols-3 gap-1.5 p-2 bg-indigo-50/40 border border-indigo-100 rounded-lg text-center font-mono text-[10px] leading-snug">
                      <div>
                        <span className="block text-[8px] font-sans font-extrabold uppercase text-slate-400">Planejado</span>
                        <span className="font-extrabold text-slate-700">{targetQty.toLocaleString('pt-BR')}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] font-sans font-extrabold uppercase text-slate-400">Já Apontado</span>
                        <span className="font-extrabold text-indigo-700">{existingProductionQty.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className={`rounded px-1 ${outstandingQty > 0 ? 'bg-amber-50 border border-amber-200/60' : 'bg-emerald-50 border border-emerald-200/60'}`}>
                        <span className="block text-[8px] font-sans font-extrabold uppercase text-slate-400">Saldo Falta</span>
                        <span className={`font-extrabold ${outstandingQty > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {outstandingQty.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-left">
                      <div className="space-y-1">
                        <label className="block font-sans text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Produzido Útil (Boas) *
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={aptQtdProduzida}
                          onChange={(e) => setAptQtdProduzida(Number(e.target.value))}
                          className="block w-full rounded-lg border border-slate-200 py-1.5 px-3 font-semibold text-xs text-slate-800 focus:border-indigo-600 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-sans text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Refugo / Aparas (Perda)
                        </label>
                        <input
                          type="number"
                          required
                          min={0}
                          value={aptQtdRefugo}
                          onChange={(e) => setAptQtdRefugo(Number(e.target.value))}
                          className="block w-full rounded-lg border border-slate-200 py-1.5 px-3 text-xs text-slate-800 focus:border-indigo-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* OBRIGAÇÃO DE INFORMAR FOLHAS PARA MÁQUINAS ESPECÍFICAS */}
              {aptTipo === 'producao' && (() => {
                const selectedMaquinaObj = maquinas.find(m => m.id === aptModalData.origemMaquinaId);
                const requiresSheets = selectedMaquinaObj ? (
                  selectedMaquinaObj.nome.toLowerCase().includes('meia folha') ||
                  selectedMaquinaObj.nome.toLowerCase().includes('folha inteira')
                ) : false;
                
                if (!requiresSheets) return null;
                
                return (
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-3 text-left">
                    <div className="flex items-center gap-1.5 text-indigo-700">
                      <AlertCircle className="w-3.5 h-3.5 text-indigo-500 animate-bounce" />
                      <span className="font-mono text-[9px] font-bold uppercase tracking-wider block">
                        Obrigatório para {selectedMaquinaObj.nome}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2.5">
                      <div>
                        <label className="block font-sans text-[9px] font-bold uppercase tracking-wider text-indigo-900 mb-1">
                          Insumo de Folha Utilizado *
                        </label>
                        <select
                          required
                          value={aptInsumoFolhasId}
                          onChange={(e) => setAptInsumoFolhasId(e.target.value)}
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
                        <label className="block font-sans text-[9px] font-bold uppercase tracking-wider text-indigo-900 mb-1">
                          Quantidade de Folhas Utilizadas *
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={aptQuantidadeFolhasUtilizadas || ''}
                          onChange={(e) => setAptQuantidadeFolhasUtilizadas(Number(e.target.value))}
                          className="block w-full rounded border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="Ex: 500"
                        />
                      </div>
                    </div>
                    <p className="text-[9px] text-indigo-600 font-medium">
                      💡 A quantidade informada dará baixa automática no estoque de insumos ao registrar o apontamento.
                    </p>
                  </div>
                );
              })()}

              {/* PARADAS */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-left">
                <div className="col-span-1 space-y-1">
                  <label className="block font-sans text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    Parado (Min)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={aptTempoParado}
                    onChange={(e) => setAptTempoParado(Number(e.target.value))}
                    className="block w-full rounded-lg border border-slate-200 py-1.5 px-2 text-xs text-slate-800 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="block font-sans text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    Justificativa da Parada
                  </label>
                  <select
                    value={aptMotivoParada}
                    onChange={(e) => setAptMotivoParada(e.target.value)}
                    disabled={aptTempoParado === 0}
                    className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-[10px] text-slate-800 focus:border-indigo-600 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">Selecione...</option>
                    <option value="Troca de Clichê / Gravação de Chapas">Troca de Chapa / Acerto de Tinta</option>
                    <option value="Ajuste de facão de destaque">Ajuste de facão de destaque</option>
                    <option value="Troca de Faca / Emborrachamento">Substituição de faca</option>
                    <option value="Entupimento do bico de cola PVA">Entupimento bico de cola</option>
                    <option value="Ajuste do alimentador automático">Ajuste físico do alimentador</option>
                    <option value="Manutenção elétrica/mecânica preventiva">Manutenção preventiva</option>
                    <option value="Falta de suprimentos no acumulador">Falta de suprimentos</option>
                  </select>
                </div>
              </div>

              {/* RECONFIRMAÇÃO DE AVANÇO INCOMPLETO */}
              {aptReconfirmarIncompleto && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-2.5 text-left text-xs text-rose-900 animate-pulse">
                  <div className="font-bold text-rose-950 flex items-center gap-1">
                    <AlertCircle size={15} className="text-rose-700" />
                    <span>Lote Incompleto - Justificativa e Reconfirmação</span>
                  </div>
                  <p className="text-[10px] leading-relaxed text-rose-800">
                    A quantidade produzida total apontada não atingiu a meta planejada do lote. Para prosseguir assim mesmo, justifique o motivo e confirme abaixo.
                  </p>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-rose-700">
                      Motivo do Avanço Incompleto *
                    </label>
                    <textarea
                      required
                      placeholder="Ex: Quebra inevitável / autorização do cliente / refugo excedente..."
                      value={aptMotivoIncompleto}
                      onChange={(e) => setAptMotivoIncompleto(e.target.value)}
                      className="block w-full rounded border border-rose-300 py-1.5 px-2 text-2xs text-rose-950 bg-white font-sans focus:outline-none focus:ring-1 focus:ring-rose-400"
                      rows={2}
                    />
                  </div>
                  <label className="flex items-start gap-1.5 cursor-pointer mt-2 pt-1 border-t border-rose-200/50">
                    <input
                      type="checkbox"
                      required
                      checked={aptReconfirmCheckbox}
                      onChange={(e) => setAptReconfirmCheckbox(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span className="text-[10px] font-bold text-rose-950">Estou ciente e reconfirmo o avanço manual deste lote com saldo menor.</span>
                  </label>
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setAptModalData(null)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-sans font-semibold text-2xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                
                {aptTipo === 'producao' && (
                  <button
                    type="submit"
                    onClick={() => setAptShouldAdvance(false)}
                    className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 px-3 py-2 font-sans font-bold text-2xs text-amber-800 transition-all cursor-pointer"
                  >
                    <ClipboardPen size={12} />
                    Somente Apontar (Sem Avançar)
                  </button>
                )}

                <button
                  type="submit"
                  onClick={() => setAptShouldAdvance(true)}
                  className="flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-2 font-sans font-bold text-2xs text-white shadow-sm transition-all cursor-pointer"
                >
                  <FileCheck size={12} />
                  {aptTipo === 'producao' ? 'Salvar Apontamento & Avançar' : 'Confirmar Apontamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

// Ícone de fechar auxiliar no escopo
const X: React.FC<{ size: number; className?: string }> = ({ size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
