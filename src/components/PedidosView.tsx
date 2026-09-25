import React, { useState } from 'react';
import { usePCP } from '../context/PCPContext';
import { Cliente, Pedido, Produto, ProdutoModelo, ProdutoInsumoFicha } from '../types';
import { ConfirmationDialog } from './ConfirmationDialog';
import { exportPedidosToExcel } from '../utils/excelExport';
import { 
  Plus, 
  Search, 
  Trash2, 
  Flame, 
  Play, 
  Calendar, 
  FileSpreadsheet, 
  ChevronRight,
  Info,
  X,
  UserPlus,
  Bookmark,
  Sparkles,
  Archive,
  ArrowUp,
  ArrowDown,
  Printer,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  FileText,
  EyeOff
} from 'lucide-react';

export function getPantoneColor(pantone: string): string {
  const normalized = (pantone || '').trim().toLowerCase();
  if (normalized.includes('orange')) return '#FF6A00';
  if (normalized.includes('red') || normalized.includes('rubine')) return '#E40046';
  if (normalized.includes('blue') || normalized.includes('reflex')) return '#002F6C';
  if (normalized.includes('yellow')) return '#FED141';
  if (normalized.includes('green')) return '#00AB84';
  if (normalized.includes('purple')) return '#BB29BB';
  if (normalized.includes('black')) return '#1C1C1C';
  if (normalized.includes('gray') || normalized.includes('grey')) return '#888B8D';
  if (normalized.includes('violet')) return '#4321A6';
  if (normalized.includes('cyan')) return '#00A3E0';
  if (normalized.includes('magenta')) return '#D01180';

  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
}

export const formatarDataBR = (dateStr?: string): string => {
  if (!dateStr) return '';
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return dateStr;
};

export const PedidosView: React.FC = () => {
  const { 
    pedidos, 
    produtos, 
    clientes, 
    insumos, 
    maquinas, 
    adicionarPedido, 
    excluirPedido, 
    cancelarPedido, 
    liberarPedidoParaProducao,
    editarPedidoPrioridadeSequencia,
    adicionarCliente,
    produtosModelos,
    adicionarProdutoModelo,
    excluirProdutoModelo,
    apontamentos,
    addNotification
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

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [excludedStatuses, setExcludedStatuses] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string>('todos');
  const [selectedPedidoParaImprimir, setSelectedPedidoParaImprimir] = useState<Pedido | null>(null);
  const [showAptHist, setShowAptHist] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<'id' | 'cliente' | 'produtos' | 'prioridade' | 'sequencia' | 'data_entrega' | 'status' | null>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (field: 'id' | 'cliente' | 'produtos' | 'prioridade' | 'sequencia' | 'data_entrega' | 'status') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: 'id' | 'cliente' | 'produtos' | 'prioridade' | 'sequencia' | 'data_entrega' | 'status') => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ArrowUp size={12} className="inline ml-1 text-slate-800" /> : <ArrowDown size={12} className="inline ml-1 text-slate-800" />;
  };

  // Form states - Pedido
  const [showForm, setShowForm] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [dataEntrega, setDataEntrega] = useState('');
  const [prioridade, setPrioridade] = useState<'alta' | 'media' | 'baixa'>('media');
  const [prioridadeSequencia, setPrioridadeSequencia] = useState<string>('');

  // Form states - Produtos (vários sob o mesmo Pedido)
  const [formProdutos, setFormProdutos] = useState<Array<{
    descricao: string;
    quantidade: number;
    dimensoes: string;
    material: string;
    fator_consumo: number;
    contatos_faca: number;
    medida_faca?: string;
    roteiro: string[];
    salvar_em_catalogo?: boolean;
    cores_quantidade: number;
    cores_frente?: number;
    cores_verso?: number;
    pantones: string[];
    tipo_produto?: 'embalagem' | 'manual' | 'bolacha';
    pontos_cola?: number;
    insumos_ficha?: ProdutoInsumoFicha[];
    faca_pdf_url?: string;
    faca_pdf_nome?: string;
    arte_pdf_url?: string;
    arte_pdf_nome?: string;
  }>>([
    { 
      descricao: '', 
      quantidade: 5000, 
      dimensoes: '20x15x5 cm', 
      material: 'Papel Cartão Duplex 250g (Folhas)', 
      fator_consumo: 0.05, 
      contatos_faca: 1,
      medida_faca: '',
      roteiro: ['m1', 'm2', 'm3'], // Roteiro gráfico padrão
      salvar_em_catalogo: false,
      cores_quantidade: 1,
      cores_frente: 1,
      cores_verso: 0,
      pantones: [''],
      tipo_produto: 'embalagem',
      pontos_cola: 1,
      insumos_ficha: [
        { insumo_id: '', nome: 'Papel Cartão Duplex 250g (Folhas)', rendimento: 20, fator_consumo: 0.05 }
      ]
    }
  ]);

  const handleProductQtdInsumosChange = (prodIdx: number, qtd: number) => {
    const normQtd = Math.max(1, qtd);
    setFormProdutos(prev => prev.map((p, idx) => {
      if (idx === prodIdx) {
        let nextInsumos = p.insumos_ficha ? [...p.insumos_ficha] : [];
        if (nextInsumos.length === 0) {
          nextInsumos = [{
            insumo_id: '',
            nome: p.material || 'Papel Cartão Duplex 250g (Folhas)',
            rendimento: p.fator_consumo > 0 ? Number((1 / p.fator_consumo).toFixed(4)) : 20,
            fator_consumo: p.fator_consumo || 0.05
          }];
        }
        if (nextInsumos.length < normQtd) {
          while (nextInsumos.length < normQtd) {
            nextInsumos.push({ insumo_id: '', nome: '', rendimento: 20, fator_consumo: 0.05 });
          }
        } else if (nextInsumos.length > normQtd) {
          nextInsumos.splice(normQtd);
        }
        return {
          ...p,
          insumos_ficha: nextInsumos,
          material: nextInsumos[0]?.nome || p.material,
          fator_consumo: nextInsumos[0]?.fator_consumo !== undefined ? nextInsumos[0].fator_consumo : p.fator_consumo
        };
      }
      return p;
    }));
  };

  const updateProductInsumoFicha = (prodIdx: number, itemIdx: number, fields: Partial<ProdutoInsumoFicha>) => {
    setFormProdutos(prev => prev.map((p, idx) => {
      if (idx === prodIdx) {
        let nextInsumos = p.insumos_ficha ? [...p.insumos_ficha] : [];
        if (nextInsumos.length === 0) {
          nextInsumos = [{
            insumo_id: '',
            nome: p.material || 'Papel Cartão Duplex 250g (Folhas)',
            rendimento: p.fator_consumo > 0 ? Number((1 / p.fator_consumo).toFixed(4)) : 20,
            fator_consumo: p.fator_consumo || 0.05
          }];
        }
        const item = { ...nextInsumos[itemIdx], ...fields };
        if (fields.rendimento !== undefined) {
          item.fator_consumo = fields.rendimento > 0 ? Number((1 / fields.rendimento).toFixed(6)) : 0;
        }
        nextInsumos[itemIdx] = item;

        return {
          ...p,
          insumos_ficha: nextInsumos,
          material: nextInsumos[0]?.nome || p.material,
          fator_consumo: nextInsumos[0]?.fator_consumo !== undefined ? nextInsumos[0].fator_consumo : p.fator_consumo
        };
      }
      return p;
    }));
  };

  const [modelSearchQuery, setModelSearchQuery] = useState<{[key: number]: string}>({});
  const [isSearchFocused, setIsSearchFocused] = useState<{[key: number]: boolean}>({});

  const [paperSearchQuery, setPaperSearchQuery] = useState<{[key: number]: string}>({});
  const [isPaperDropdownOpen, setIsPaperDropdownOpen] = useState<{[key: number]: boolean}>({});

  const [newModelPaperQuery, setNewModelPaperQuery] = useState('Papel Cartão Duplex 250g (Folhas)');
  const [isNewModelPaperDropdownOpen, setIsNewModelPaperDropdownOpen] = useState(false);

  // Form states - Novo Modelo no Catálogo
  const [showNewModelForm, setShowNewModelForm] = useState(false);
  const [newModelDesc, setNewModelDesc] = useState('');
  const [newModelDim, setNewModelDim] = useState('20x15x5 cm');
  const [newModelMat, setNewModelMat] = useState('Papel Cartão Duplex 250g (Folhas)');
  const [newModelFator, setNewModelFator] = useState(0.05);
  const [newModelRendimento, setNewModelRendimento] = useState<number>(20);

  const handleNewModelRendimentoChange = (val: number) => {
    setNewModelRendimento(val);
    const fator = val > 0 ? Number((1 / val).toFixed(6)) : 0;
    setNewModelFator(fator);
  };
  const [newModelContatosFaca, setNewModelContatosFaca] = useState(1);
  const [newModelMedidaFaca, setNewModelMedidaFaca] = useState('');
  const [newModelRoute, setNewModelRoute] = useState<string[]>(['m1', 'm2', 'm3']);
  const [newModelCoresQuantidade, setNewModelCoresQuantidade] = useState<number>(1);
  const [newModelCoresFrente, setNewModelCoresFrente] = useState<number>(1);
  const [newModelCoresVerso, setNewModelCoresVerso] = useState<number>(0);
  const [newModelPantones, setNewModelPantones] = useState<string[]>(['']);
  const [newModelTipoProduto, setNewModelTipoProduto] = useState<'embalagem' | 'manual' | 'bolacha'>('embalagem');

  // Form states - Novo Cliente Rápido
  const [showCliForm, setShowCliForm] = useState(false);
  const [newCliNome, setNewCliNome] = useState('');
  const [newCliContato, setNewCliContato] = useState('');
  const [newCliEmail, setNewCliEmail] = useState('');
  const [newCliTelefone, setNewCliTelefone] = useState('');

  // Adicionar produto ao item do formulário de criação
  const handleAddProductToForm = () => {
    setFormProdutos(prev => [
      ...prev,
      { 
        descricao: '', 
        quantidade: 10000, 
        dimensoes: '15x15x15 cm', 
        material: 'Papel Cartão Duplex 250g (Folhas)', 
        fator_consumo: 0.05, 
        contatos_faca: 1,
        medida_faca: '',
        roteiro: ['m1', 'm2', 'm3'],
        salvar_em_catalogo: false,
        cores_quantidade: 1,
        cores_frente: 1,
        cores_verso: 0,
        pantones: [''],
        tipo_produto: 'embalagem',
        insumos_ficha: [
          { insumo_id: '', nome: 'Papel Cartão Duplex 250g (Folhas)', rendimento: 20, fator_consumo: 0.05 }
        ]
      }
    ]);
  };

  const handleRemoveProductFromForm = (idx: number) => {
    if (formProdutos.length === 1) return; // mantém pelo menos um
    setFormProdutos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleProductFieldChange = (idx: number, field: string, value: any) => {
    setFormProdutos(prev => prev.map((item, i) => {
      if (i === idx) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleMoveStep = (prodIdx: number, stepIdx: number, direction: 'up' | 'down') => {
    setFormProdutos(prev => prev.map((prod, idx) => {
      if (idx === prodIdx) {
        const nextRoute = [...prod.roteiro];
        const targetIdx = direction === 'up' ? stepIdx - 1 : stepIdx + 1;
        if (targetIdx >= 0 && targetIdx < nextRoute.length) {
          const temp = nextRoute[stepIdx];
          nextRoute[stepIdx] = nextRoute[targetIdx];
          nextRoute[targetIdx] = temp;
        }
        return { ...prod, roteiro: nextRoute };
      }
      return prod;
    }));
  };

  const handleRemoveStep = (prodIdx: number, stepIdx: number) => {
    setFormProdutos(prev => prev.map((prod, idx) => {
      if (idx === prodIdx) {
        const nextRoute = prod.roteiro.filter((_, sIdx) => sIdx !== stepIdx);
        return { ...prod, roteiro: nextRoute };
      }
      return prod;
    }));
  };

  const handleAddStepToRoute = (prodIdx: number, machineId: string) => {
    setFormProdutos(prev => prev.map((prod, idx) => {
      if (idx === prodIdx) {
        return { ...prod, roteiro: [...prod.roteiro, machineId] };
      }
      return prod;
    }));
  };

  // Submeter Pedido
  const handleSubmitPedido = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClienteId) {
      alert('Por favor, selecione ou cadastre um Cliente.');
      return;
    }

    const invalidProd = formProdutos.find(p => !p.descricao || p.quantidade <= 0 || p.roteiro.length === 0);
    if (invalidProd) {
      alert('Certifique-se de que todos os produtos tenham uma descrição descrita, quantidade maior que zero e pelo menos 1 fase de máquina selecionada.');
      return;
    }

    // Save checked products to models catalog
    formProdutos.forEach(p => {
      if (p.salvar_em_catalogo) {
        adicionarProdutoModelo({
          descricao: p.descricao,
          dimensoes: p.dimensoes,
          material: p.material,
          fator_consumo: p.fator_consumo,
          contatos_faca: p.contatos_faca || 1,
          medida_faca: p.medida_faca || undefined,
          roteiro: p.roteiro,
          cores_quantidade: Number(p.cores_quantidade) || 0,
          cores_frente: Number(p.cores_frente) || 0,
          cores_verso: Number(p.cores_verso) || 0,
          pantones: (p.pantones || []).filter(pat => pat.trim() !== ''),
          tipo_produto: p.tipo_produto || 'embalagem',
          pontos_cola: p.tipo_produto === 'embalagem' ? (p.pontos_cola !== undefined ? p.pontos_cola : 1) : undefined,
          insumos_ficha: p.insumos_ficha,
          faca_pdf_url: p.faca_pdf_url || undefined,
          faca_pdf_nome: p.faca_pdf_nome || undefined,
          arte_pdf_url: p.arte_pdf_url || undefined,
          arte_pdf_nome: p.arte_pdf_nome || undefined,
          informacoes_importantes: p.informacoes_importantes || undefined,
          observacoes: p.informacoes_importantes || undefined
        });
      }
    });

    adicionarPedido(
      { 
        cliente_id: selectedClienteId, 
        data_entrega: dataEntrega, 
        prioridade,
        prioridade_sequencia: prioridadeSequencia ? Number(prioridadeSequencia) : undefined
      },
      formProdutos.map(p => ({
        descricao: p.descricao,
        quantidade: p.quantidade,
        dimensoes: p.dimensoes,
        material: p.material,
        fator_consumo: p.fator_consumo,
        contatos_faca: p.contatos_faca || 1,
        medida_faca: p.medida_faca || undefined,
        roteiro: p.roteiro,
        cores_quantidade: Number(p.cores_quantidade) || 0,
        cores_frente: Number(p.cores_frente) || 0,
        cores_verso: Number(p.cores_verso) || 0,
        pantones: (p.pantones || []).filter(pat => pat.trim() !== ''),
        tipo_produto: p.tipo_produto || 'embalagem',
        pontos_cola: p.tipo_produto === 'embalagem' ? (p.pontos_cola !== undefined ? p.pontos_cola : 1) : undefined,
        insumos_ficha: p.insumos_ficha,
        faca_pdf_url: p.faca_pdf_url || undefined,
        faca_pdf_nome: p.faca_pdf_nome || undefined,
        arte_pdf_url: p.arte_pdf_url || undefined,
        arte_pdf_nome: p.arte_pdf_nome || undefined,
        grade_itens: p.grade_itens,
        informacoes_importantes: p.informacoes_importantes || undefined,
        observacoes: p.informacoes_importantes || undefined
      }))
    );

    // Reset formulários
    setSelectedClienteId('');
    setDataEntrega('');
    setPrioridade('media');
    setPrioridadeSequencia('');
    setFormProdutos([{ 
      descricao: '', 
      quantidade: 5000, 
      dimensoes: '20x15x5 cm', 
      material: 'Papel Cartão Duplex 250g (Folhas)', 
      fator_consumo: 0.05, 
      contatos_faca: 1,
      medida_faca: '',
      roteiro: ['m1', 'm2', 'm3'],
      salvar_em_catalogo: false,
      cores_quantidade: 1,
      cores_frente: 1,
      cores_verso: 0,
      pantones: [''],
      tipo_produto: 'embalagem',
      pontos_cola: 1,
      insumos_ficha: [
        { insumo_id: '', nome: 'Papel Cartão Duplex 250g (Folhas)', rendimento: 20, fator_consumo: 0.05 }
      ]
    }]);
    setShowForm(false);
  };

  // Carregar dados de modelo piloto salvo
  const handleLoadFromModel = (prodIdx: number, modeloId: string) => {
    if (!modeloId) return;
    const model = produtosModelos.find(m => m.id === modeloId);
    if (!model) return;

    setFormProdutos(prev => prev.map((prod, i) => {
      if (i === prodIdx) {
        return {
          ...prod,
          descricao: model.descricao,
          dimensoes: model.dimensoes,
          material: model.material,
          fator_consumo: model.fator_consumo,
          contatos_faca: model.contatos_faca || 1,
          medida_faca: model.medida_faca || '',
          roteiro: [...model.roteiro],
          cores_quantidade: model.cores_quantidade || 0,
          cores_frente: model.cores_frente !== undefined ? model.cores_frente : (model.cores_quantidade || 0),
          cores_verso: model.cores_verso !== undefined ? model.cores_verso : 0,
          pantones: model.pantones && model.pantones.length > 0 ? [...model.pantones] : [''],
          tipo_produto: model.tipo_produto || 'embalagem',
          pontos_cola: model.pontos_cola !== undefined ? model.pontos_cola : 1,
          faca_pdf_url: model.faca_pdf_url || '',
          faca_pdf_nome: model.faca_pdf_nome || '',
          arte_pdf_url: model.arte_pdf_url || '',
          arte_pdf_nome: model.arte_pdf_nome || '',
          grade_itens: model.grade_itens ? [...model.grade_itens] : undefined,
          informacoes_importantes: model.informacoes_importantes || model.observacoes || '',
          insumos_ficha: model.insumos_ficha && model.insumos_ficha.length > 0
            ? [...model.insumos_ficha]
            : [{
                insumo_id: '',
                nome: model.material,
                rendimento: model.fator_consumo > 0 ? Number((1 / model.fator_consumo).toFixed(4)) : 20,
                fator_consumo: model.fator_consumo
              }]
        };
      }
      return prod;
    }));
  };

  const handleProductCoresChange = (prodIdx: number, coresQtd: number) => {
    const normQtd = Math.max(0, coresQtd);
    setFormProdutos(prev => prev.map((p, i) => {
      if (i === prodIdx) {
        let nextPantones = [...(p.pantones || [''])];
        if (nextPantones.length < normQtd) {
          while (nextPantones.length < normQtd) nextPantones.push('');
        } else if (nextPantones.length > normQtd) {
          nextPantones.splice(normQtd);
        }
        return {
          ...p,
          cores_quantidade: normQtd,
          pantones: nextPantones
        };
      }
      return p;
    }));
  };

  const handleProductCoresFrenteChange = (prodIdx: number, frente: number) => {
    const normFrente = Math.max(0, frente);
    setFormProdutos(prev => prev.map((p, i) => {
      if (i === prodIdx) {
        const verso = p.cores_verso || 0;
        const total = normFrente + verso;
        let nextPantones = [...(p.pantones || [''])];
        if (nextPantones.length < total) {
          while (nextPantones.length < total) nextPantones.push('');
        } else if (nextPantones.length > total) {
          nextPantones.splice(total);
        }
        return {
          ...p,
          cores_frente: normFrente,
          cores_quantidade: total,
          pantones: nextPantones
        };
      }
      return p;
    }));
  };

  const handleProductCoresVersoChange = (prodIdx: number, verso: number) => {
    const normVerso = Math.max(0, verso);
    setFormProdutos(prev => prev.map((p, i) => {
      if (i === prodIdx) {
        const frente = p.cores_frente || 0;
        const total = frente + normVerso;
        let nextPantones = [...(p.pantones || [''])];
        if (nextPantones.length < total) {
          while (nextPantones.length < total) nextPantones.push('');
        } else if (nextPantones.length > total) {
          nextPantones.splice(total);
        }
        return {
          ...p,
          cores_verso: normVerso,
          cores_quantidade: total,
          pantones: nextPantones
        };
      }
      return p;
    }));
  };

  const handleProductPantoneFieldChange = (prodIdx: number, pIdx: number, val: string) => {
    setFormProdutos(prev => prev.map((p, i) => {
      if (i === prodIdx) {
        const nextPantones = [...(p.pantones || [''])];
        nextPantones[pIdx] = val;
        return {
          ...p,
          pantones: nextPantones
        };
      }
      return p;
    }));
  };

  const handleNewModelCoresChange = (qtd: number) => {
    const normQtd = Math.max(0, qtd);
    setNewModelCoresQuantidade(normQtd);
    setNewModelPantones(prev => {
      const next = [...prev];
      if (next.length < normQtd) {
        while (next.length < normQtd) next.push('');
      } else if (next.length > normQtd) {
        next.splice(normQtd);
      }
      return next;
    });
  };

  const handleNewModelCoresFrenteChange = (frente: number) => {
    const normFrente = Math.max(0, frente);
    setNewModelCoresFrente(normFrente);
    const novoTotal = normFrente + newModelCoresVerso;
    handleNewModelCoresChange(novoTotal);
  };

  const handleNewModelCoresVersoChange = (verso: number) => {
    const normVerso = Math.max(0, verso);
    setNewModelCoresVerso(normVerso);
    const novoTotal = newModelCoresFrente + normVerso;
    handleNewModelCoresChange(novoTotal);
  };

  // Submeter cadastro direto de novos modelos no catálogo
  const handleAddProductModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelDesc) {
      alert('Por favor informe a descrição do produto.');
      return;
    }
    if (newModelRoute.length === 0) {
      alert('Selecione pelo menos uma máquina no roteiro de produção.');
      return;
    }
    adicionarProdutoModelo({
      descricao: newModelDesc,
      dimensoes: newModelDim,
      material: newModelMat,
      fator_consumo: newModelFator,
      contatos_faca: newModelContatosFaca,
      medida_faca: newModelMedidaFaca || undefined,
      roteiro: newModelRoute,
      cores_quantidade: Number(newModelCoresQuantidade) || 0,
      cores_frente: Number(newModelCoresFrente) || 0,
      cores_verso: Number(newModelCoresVerso) || 0,
      pantones: newModelPantones.filter(p => p.trim() !== ''),
      tipo_produto: newModelTipoProduto
    });
    setNewModelDesc('');
    setNewModelDim('20x15x5 cm');
    setNewModelMat('Papel Cartão Duplex 250g (Folhas)');
    setNewModelPaperQuery('Papel Cartão Duplex 250g (Folhas)');
    setNewModelFator(0.05);
    setNewModelRendimento(20);
    setNewModelContatosFaca(1);
    setNewModelMedidaFaca('');
    setNewModelRoute(['m1', 'm2', 'm3']);
    setNewModelCoresQuantidade(1);
    setNewModelCoresFrente(1);
    setNewModelCoresVerso(0);
    setNewModelPantones(['']);
    setNewModelTipoProduto('embalagem');
    setShowNewModelForm(false);
  };

  const handleNewModelRouteToggle = (machineId: string) => {
    const isSelected = newModelRoute.includes(machineId);
    const newRoute = isSelected
      ? newModelRoute.filter(id => id !== machineId)
      : [...newModelRoute, machineId];

    const sortedRoute = [...newRoute].sort((a,b) => {
      const order = ['m1', 'm2', 'm3'];
      return order.indexOf(a) - order.indexOf(b);
    });
    setNewModelRoute(sortedRoute);
  };

  // Submeter Cliente Rápido
  const handleAddQuickCliente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCliNome) return;
    adicionarCliente({
      nome: newCliNome,
      contato: newCliContato || 'Contato Direto',
      email: newCliEmail || 'contato@cliente.com',
      telefone: newCliTelefone || 'N/A'
    });
    setNewCliNome('');
    setNewCliContato('');
    setNewCliEmail('');
    setNewCliTelefone('');
    setShowCliForm(false);
  };

  // Filtros aplicados sobre a lista de pedidos
  const filteredPedidos = pedidos.filter(ped => {
    const cliente = clientes.find(c => c.id === ped.cliente_id);
    const prodsDoPed = produtos.filter(p => p.pedido_id === ped.id);
    const q = searchTerm.toLowerCase();

    // Check if any product in this order matches description, ID, or model code
    const matchesProduct = prodsDoPed.some(p => {
      const matchingModel = produtosModelos.find(m => m.descricao === p.descricao);
      return (
        p.descricao.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p as any).codigo?.toLowerCase().includes(q) ||
        (matchingModel?.codigo || '').toLowerCase().includes(q)
      );
    });

    const matchesSearch = searchTerm === '' || 
      (cliente?.nome.toLowerCase().includes(q)) || 
      ped.id.toLowerCase().includes(q) ||
      matchesProduct;
    
    const matchesStatus = (statusFilter === 'todos' || ped.status === statusFilter) && !excludedStatuses.includes(ped.status);
    const matchesPriority = priorityFilter === 'todos' || ped.prioridade === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Sort the filtered pedidos
  const sortedPedidos = [...filteredPedidos].sort((a, b) => {
    if (!sortField) return 0;
    
    let aVal: any = '';
    let bVal: any = '';
    
    if (sortField === 'id') {
      aVal = a.id;
      bVal = b.id;
      const aNum = parseInt(aVal.replace(/\D/g, ''), 10);
      const bNum = parseInt(bVal.replace(/\D/g, ''), 10);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }
    } else if (sortField === 'cliente') {
      const cliA = clientes.find(c => c.id === a.cliente_id)?.nome || '';
      const cliB = clientes.find(c => c.id === b.cliente_id)?.nome || '';
      aVal = cliA.toLowerCase();
      bVal = cliB.toLowerCase();
    } else if (sortField === 'produtos') {
      const prodsA = produtos.filter(p => p.pedido_id === a.id).map(p => p.descricao).join(', ');
      const prodsB = produtos.filter(p => p.pedido_id === b.id).map(p => p.descricao).join(', ');
      aVal = prodsA.toLowerCase();
      bVal = prodsB.toLowerCase();
    } else if (sortField === 'sequencia') {
      const seqA = a.prioridade_sequencia !== undefined && a.prioridade_sequencia !== null ? a.prioridade_sequencia : Infinity;
      const seqB = b.prioridade_sequencia !== undefined && b.prioridade_sequencia !== null ? b.prioridade_sequencia : Infinity;
      if (seqA === Infinity && seqB === Infinity) return 0;
      if (seqA === Infinity) return 1; // Put nulls/undefineds at the end
      if (seqB === Infinity) return -1;
      return sortDirection === 'asc' ? seqA - seqB : seqB - seqA;
    } else if (sortField === 'prioridade') {
      const priorityWeight = { alta: 3, media: 2, baixa: 1 };
      const weightA = priorityWeight[a.prioridade as 'alta'|'media'|'baixa'] || 0;
      const weightB = priorityWeight[b.prioridade as 'alta'|'media'|'baixa'] || 0;
      return sortDirection === 'asc' ? weightA - weightB : weightB - weightA;
    } else if (sortField === 'data_entrega') {
      aVal = a.data_entrega;
      bVal = b.data_entrega;
    } else if (sortField === 'status') {
      aVal = a.status;
      bVal = b.status;
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case 'alta': return 'text-rose-700 bg-rose-100 border-rose-200';
      case 'media': return 'text-amber-700 bg-amber-100 border-amber-200';
      case 'baixa': return 'text-slate-650 bg-slate-100 border-slate-200';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'producao': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'concluido': return 'bg-emerald-100 text-emerald-800 border-emerald-250';
      case 'cancelado': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-gray-100 text-gray-750';
    }
  };

  const handleExportExcel = () => {
    exportPedidosToExcel({
      pedidos: sortedPedidos,
      produtos,
      clientes,
      maquinas,
      apontamentos,
    });
    addNotification('success', `${sortedPedidos.length} pedido(s) exportado(s) para Excel com sucesso!`);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER E AÇÃO DA TELA */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-sans text-xl font-bold tracking-tight text-gray-950">Gestão de Pedidos e Lotes</h2>
          <p className="font-sans text-xs text-gray-500">Crie ordens gráficas, cadastre novos clientes e libere de forma sequencial para o Kanban.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 font-sans text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer active:scale-95"
            title="Exportar pedidos filtrados para planilha Excel (.xlsx)"
            id="btn-export-pedidos-excel-top"
          >
            <FileSpreadsheet size={15} />
            Exportar Excel
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 font-sans text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
            id="btn-open-create-order"
          >
            <Plus size={16} />
            Novo Pedido
          </button>
        </div>
      </div>

      {/* FILTROS E BUSCAS */}
      <div className="flex flex-col gap-3 sleek-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full">
          <div className="relative flex-1 shadow-3xs rounded-lg">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <Search size={15} />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por lote, ID de pedido, cliente, produto ou código de produto..."
              className="w-full rounded-lg border border-gray-200 py-1.5 pl-9 pr-3 text-xs placeholder:text-gray-450 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* STATUS FILTER */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-sans text-xs text-gray-700 focus:border-slate-900 focus:outline-none"
            >
              <option value="todos">Todos Status</option>
              <option value="pendente">Pendente de Produção</option>
              <option value="producao">Em Produção (Fila)</option>
              <option value="concluido">Concluídos</option>
              <option value="cancelado">Cancelados</option>
            </select>

            {/* PRIORIDADE FILTER */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-sans text-xs text-gray-700 focus:border-slate-900 focus:outline-none"
            >
              <option value="todos">Todas Prioridades</option>
              <option value="alta">Prioridade Alta</option>
              <option value="media">Prioridade Média</option>
              <option value="baixa">Prioridade Baixa</option>
            </select>

            {/* EXPORT BUTTON IN FILTER BAR */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-250 hover:bg-emerald-100 px-3 py-1.5 font-sans text-xs font-bold transition-all shadow-3xs cursor-pointer active:scale-95"
              title="Exportar listagem filtrada para Excel (.xlsx)"
              id="btn-export-pedidos-excel-filter"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* EXCLUDE STATUS CHECKBOXES */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2.5 border-t border-dashed border-gray-150">
          <span className="font-sans text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 select-none">
            <EyeOff size={11} className="text-slate-400" />
            Ocultar Status do Painel:
          </span>
          <div className="flex flex-wrap items-center gap-4">
            {[
              { id: 'pendente', label: 'Pendente' },
              { id: 'producao', label: 'Em Produção' },
              { id: 'concluido', label: 'Concluído' },
              { id: 'cancelado', label: 'Cancelado' }
            ].map(item => {
              const isChecked = excludedStatuses.includes(item.id);
              return (
                <label key={item.id} className="inline-flex items-center gap-1.5 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      if (isChecked) {
                        setExcludedStatuses(prev => prev.filter(s => s !== item.id));
                      } else {
                        setExcludedStatuses(prev => [...prev, item.id]);
                      }
                    }}
                    className="w-3.5 h-3.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className={`font-sans text-xs transition-colors ${isChecked ? 'text-rose-600 font-bold line-through' : 'text-gray-600 font-medium group-hover:text-slate-900'}`}>
                    {item.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* LISTA DE PEDIDOS EM TABELA */}
      <div className="overflow-hidden sleek-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-150 bg-gray-50/75 font-mono text-3xs font-bold uppercase tracking-wider text-gray-400 select-none">
                <th 
                  className="px-5 py-3 cursor-pointer hover:bg-gray-100/85 hover:text-gray-700 transition-colors"
                  onClick={() => toggleSort('id')}
                >
                  <span className="flex items-center gap-1">
                    Lote (Pedido) {getSortIcon('id')}
                  </span>
                </th>
                <th 
                  className="px-5 py-3 cursor-pointer hover:bg-gray-100/85 hover:text-gray-700 transition-colors"
                  onClick={() => toggleSort('cliente')}
                >
                  <span className="flex items-center gap-1">
                    Cliente {getSortIcon('cliente')}
                  </span>
                </th>
                <th 
                  className="px-5 py-3 cursor-pointer hover:bg-gray-100/85 hover:text-gray-700 transition-colors"
                  onClick={() => toggleSort('produtos')}
                >
                  <span className="flex items-center gap-1">
                    Produtos No Pedido {getSortIcon('produtos')}
                  </span>
                </th>
                <th 
                  className="px-5 py-3 cursor-pointer hover:bg-gray-100/85 hover:text-gray-700 transition-colors"
                  onClick={() => toggleSort('prioridade')}
                >
                  <span className="flex items-center gap-1">
                    Prioridade {getSortIcon('prioridade')}
                  </span>
                </th>
                <th 
                  className="px-5 py-3 cursor-pointer hover:bg-gray-100/85 hover:text-gray-700 transition-colors text-center"
                  onClick={() => toggleSort('sequencia')}
                >
                  <span className="flex items-center justify-center gap-1">
                    Sequência {getSortIcon('sequencia')}
                  </span>
                </th>
                <th 
                  className="px-5 py-3 cursor-pointer hover:bg-gray-100/85 hover:text-gray-700 transition-colors"
                  onClick={() => toggleSort('data_entrega')}
                >
                  <span className="flex items-center gap-1">
                    Data Entrega {getSortIcon('data_entrega')}
                  </span>
                </th>
                <th 
                  className="px-5 py-3 cursor-pointer hover:bg-gray-100/85 hover:text-gray-700 transition-colors"
                  onClick={() => toggleSort('status')}
                >
                  <span className="flex items-center gap-1">
                    Etapa Atual {getSortIcon('status')}
                  </span>
                </th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-2xs text-gray-650">
              {sortedPedidos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-xs text-gray-400">
                    Nenhum pedido encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                sortedPedidos.map(pedido => {
                  const cliente = clientes.find(c => c.id === pedido.cliente_id);
                  const prodsDoPed = produtos.filter(p => p.pedido_id === pedido.id);
                  const dataAtrasada = pedido.status === 'producao' && pedido.data_entrega < '2026-05-28';

                  return (
                    <tr key={pedido.id} className="hover:bg-gray-25/50 transition-colors">
                      {/* ID E FLAGS */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-gray-900">{pedido.id}</span>
                          {dataAtrasada && (
                            <span className="flex items-center gap-0.5 rounded bg-rose-100 px-1 py-0.5 font-mono text-4xs font-bold uppercase tracking-wide text-rose-700">
                              Atrasado
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-3xs text-gray-400">Criado em: {formatarDataBR(pedido.data_criacao)}</span>
                      </td>

                      {/* CLIENTE */}
                      <td className="px-5 py-3.5">
                        <p className="font-sans font-semibold text-gray-900 break-words">{cliente?.nome || 'Não definido'}</p>
                        <span className="font-sans text-3xs text-gray-450 block break-all">{cliente?.contato}</span>
                      </td>

                      {/* PRODUTOS DO PEDIDO */}
                      <td className="px-5 py-3.5 max-w-[280px]">
                        <div className="space-y-1.5">
                          {prodsDoPed.map(p => {
                            const matchingModel = produtosModelos.find(m => m.descricao === p.descricao);
                            return (
                              <div key={p.id} className="rounded bg-gray-50 p-2.5 border border-gray-150 space-y-1.5 shadow-3xs">
                                <div className="flex justify-between items-start gap-1">
                                  <p className="font-sans font-bold text-gray-900 text-2xs leading-tight">{p.descricao}</p>
                                  {matchingModel?.codigo && (
                                    <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-1 rounded shrink-0">
                                      {matchingModel.codigo}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-gray-500 font-sans space-y-0.5 mt-1 border-t border-gray-150 pt-1">
                                  <div><span className="text-gray-400 font-medium">Qtd:</span> <strong className="text-gray-700">{p.quantidade.toLocaleString('pt-BR')} un</strong></div>
                                  <div><span className="text-gray-400 font-medium">Dimensões:</span> <span className="text-gray-700">{p.dimensoes}</span></div>
                                  <div><span className="text-gray-400 font-medium">Material:</span> <span className="text-gray-700">{p.material}</span></div>
                                  {p.cores_quantidade !== undefined && (
                                    <div><span className="text-gray-400 font-medium">Cores:</span> <span className="text-gray-700">{p.cores_frente || 0} x {p.cores_verso || 0}</span></div>
                                  )}
                                  {p.pantones && p.pantones.length > 0 && p.pantones[0] !== '' && (
                                    <div>
                                      <span className="text-gray-400 font-medium">Pantones:</span>{' '}
                                      <span className="text-gray-700">{Array.isArray(p.pantones) ? p.pantones.join(', ') : String(p.pantones)}</span>
                                    </div>
                                  )}
                                  {(() => {
                                    const gradeItens = p.grade_itens || matchingModel?.grade_itens;
                                    if (!gradeItens || gradeItens.length === 0) return null;
                                    return (
                                      <div className="mt-1.5 bg-amber-50/45 border border-amber-100/70 p-1.5 rounded space-y-1">
                                        <span className="text-[8px] font-bold text-amber-800 uppercase block">Grade de Artes ({gradeItens.length}):</span>
                                        <div className="space-y-0.5">
                                          {gradeItens.map((item, gIdx) => (
                                            <div key={gIdx} className="text-[9px] text-amber-950 flex justify-between gap-2 border-b border-amber-100/20 last:border-none pb-0.5 last:pb-0 font-sans">
                                              <span className="truncate max-w-[150px] font-medium">{item.codigo ? `[${item.codigo}] ` : ''}{item.descricao || `Arte ${gIdx + 1}`}</span>
                                              <span className="font-mono text-amber-700 font-bold shrink-0">{item.contatos} pos</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                                {/* Arquivos do Produto em anexo */}
                                {(() => {
                                  const facaUrl = p.faca_pdf_url || matchingModel?.faca_pdf_url;
                                  const facaNome = p.faca_pdf_nome || p.faca_pdf_name || matchingModel?.faca_pdf_nome || matchingModel?.faca_pdf_name || 'Faca';
                                  const arteUrl = p.arte_pdf_url || matchingModel?.arte_pdf_url;
                                  const arteNome = p.arte_pdf_nome || p.arte_pdf_name || matchingModel?.arte_pdf_nome || matchingModel?.arte_pdf_name || 'Arte';

                                  if (!facaUrl && !arteUrl) return null;

                                  const isFacaLink = facaUrl?.startsWith('http') || facaUrl?.startsWith('www.');
                                  const isArteLink = arteUrl?.startsWith('http') || arteUrl?.startsWith('www.');

                                  return (
                                    <div className="mt-1 pt-1 border-t border-gray-250 flex gap-1">
                                      {facaUrl && (
                                        <a
                                          href={facaUrl}
                                          target={isFacaLink ? "_blank" : undefined}
                                          rel={isFacaLink ? "noopener noreferrer" : undefined}
                                          download={isFacaLink ? undefined : facaNome}
                                          className="flex-1 flex items-center justify-center gap-0.5 py-0.5 px-1 rounded bg-rose-50 border border-rose-150 hover:bg-rose-100 text-rose-700 font-sans font-bold text-[9px] transition-all cursor-pointer shadow-3xs"
                                          title={isFacaLink ? `Abrir Link da Faca: ${facaNome}` : `Baixar Faca: ${facaNome}`}
                                        >
                                          {isFacaLink ? (
                                            <ExternalLink size={8} className="text-rose-500 shrink-0" />
                                          ) : (
                                            <FileText size={8} className="text-rose-500 shrink-0" />
                                          )}
                                          <span className="truncate max-w-[40px]">{isFacaLink ? 'Link Faca' : 'Faca'}</span>
                                        </a>
                                      )}
                                      {arteUrl && (
                                        <a
                                          href={arteUrl}
                                          target={isArteLink ? "_blank" : undefined}
                                          rel={isArteLink ? "noopener noreferrer" : undefined}
                                          download={isArteLink ? undefined : arteNome}
                                          className="flex-1 flex items-center justify-center gap-0.5 py-0.5 px-1 rounded bg-indigo-50 border border-indigo-150 hover:bg-indigo-100 text-indigo-700 font-sans font-bold text-[9px] transition-all cursor-pointer shadow-3xs"
                                          title={isArteLink ? `Abrir Link da Arte: ${arteNome}` : `Baixar Arte: ${arteNome}`}
                                        >
                                          {isArteLink ? (
                                            <ExternalLink size={8} className="text-indigo-500 shrink-0" />
                                          ) : (
                                            <FileText size={8} className="text-indigo-500 shrink-0" />
                                          )}
                                          <span className="truncate max-w-[40px]">{isArteLink ? 'Link Arte' : 'Arte'}</span>
                                        </a>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      {/* PRIORIDADE */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-block border px-2 py-0.5 rounded-full font-sans text-4xs font-bold uppercase tracking-wider ${getPriorityColor(pedido.prioridade)}`}>
                          {pedido.prioridade}
                        </span>
                      </td>

                      {/* PRIORIDADE EM SEQUÊNCIA */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-center">
                        <input
                          type="number"
                          min="1"
                          className="w-16 rounded border border-gray-250 px-1.5 py-1 text-center font-sans text-2xs font-bold text-slate-800 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800 shadow-3xs"
                          defaultValue={pedido.prioridade_sequencia ?? ''}
                          onBlur={(e) => {
                            const val = e.target.value ? Number(e.target.value) : undefined;
                            if (val !== pedido.prioridade_sequencia) {
                              editarPedidoPrioridadeSequencia(pedido.id, val);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const target = e.currentTarget;
                              const val = target.value ? Number(target.value) : undefined;
                              if (val !== pedido.prioridade_sequencia) {
                                editarPedidoPrioridadeSequencia(pedido.id, val);
                              }
                              target.blur();
                            }
                          }}
                          placeholder="-"
                        />
                      </td>

                      {/* PRAZO */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-3xs text-gray-700 font-medium">
                          <Calendar size={13} className="text-gray-400" />
                          <span>{formatarDataBR(pedido.data_entrega)}</span>
                        </div>
                      </td>

                      {/* STATUS BADGE */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-block border rounded px-1.5 py-0.5 font-mono text-3xs font-bold uppercase tracking-wide ${getStatusBadge(pedido.status)}`}>
                          {pedido.status}
                        </span>
                      </td>

                      {/* ACOES */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {pedido.status === 'pendente' && (
                            <button
                              onClick={() => triggerConfirm(
                                'Liberar Pedido para Produção',
                                `Deseja liberar o Pedido #${pedido.id.substring(0, 6)}... para a esteira de produção? Isso iniciará a programação de máquinas no KANBAN.`,
                                () => liberarPedidoParaProducao(pedido.id),
                                { confirmLabel: 'Sim, Liberar', variant: 'info' }
                              )}
                              className="inline-flex items-center gap-1 rounded bg-slate-900 px-2.5 py-1 font-sans text-3xs font-bold text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
                              title="Liberar para fila de Produção"
                              id={`liberar-btn-${pedido.id}`}
                            >
                              <Play size={10} className="fill-white" />
                              Liberar
                            </button>
                          )}
                          
                          {pedido.status === 'producao' && (
                            <button
                              onClick={() => triggerConfirm(
                                'Cancelar Lote de Produção',
                                `Tem certeza que deseja cancelar a produção do Pedido #${pedido.id.substring(0, 6)}...? Essa ação interromperá as etapas em andamento.`,
                                () => cancelarPedido(pedido.id),
                                { confirmLabel: 'Sim, Cancelar', variant: 'danger' }
                              )}
                              className="rounded border border-gray-200 px-2 py-1 font-sans text-3xs font-medium text-gray-650 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-colors cursor-pointer animate-smooth"
                              title="Cancelar este lote"
                              id={`cancelar-btn-${pedido.id}`}
                            >
                              Cancelar
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedPedidoParaImprimir(pedido)}
                            className="p-1 px-1.5 rounded text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 border border-transparent hover:border-indigo-200 transition-colors cursor-pointer"
                            title="Imprimir Ficha de Produção"
                            id={`imprimir-btn-${pedido.id}`}
                          >
                            <Printer size={13} />
                          </button>

                          <button
                            onClick={() => triggerConfirm(
                              'Excluir Pedido Permanentemente',
                              `Tem certeza que deseja excluir o Pedido #${pedido.id.substring(0, 6)}... do sistema? Isso removerá o registro e todo o seu histórico permanentemente!`,
                              () => excluirPedido(pedido.id),
                              { confirmLabel: 'Excluir', variant: 'danger' }
                            )}
                            className="p-1 px-1.5 rounded text-gray-400 hover:bg-rose-50 hover:text-rose-600 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                            title="Deletar permanentemente"
                            id={`deletar-btn-${pedido.id}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL / DRAWER CADASTRO DE NOVO PEDIDO */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-3xs" id="modal-pedidos-new">
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl ring-1 ring-black/5 flex flex-col justify-between">
            <div>
              {/* Header drawer */}
              <div className="flex items-center justify-between border-b border-gray-150 pb-4 mb-5">
                <div>
                  <h3 className="font-sans text-sm font-bold text-gray-905">Estruturar Novo Lote Escalar</h3>
                  <p className="font-sans text-3xs text-gray-500 font-normal">Fature novos pedidos e configure as etapas das máquinas.</p>
                </div>
                <button 
                  onClick={() => setShowForm(false)} 
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                  id="close-create-order-drawer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form real */}
              <form onSubmit={handleSubmitPedido} className="space-y-4">
                {/* ID OU CLIENTE */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-sans text-2xs font-bold uppercase tracking-wider text-gray-400">
                      Cliente Adquirente
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCliForm(true)}
                      className="inline-flex items-center gap-1 font-sans text-3xs font-bold text-emerald-600 hover:underline"
                    >
                      <UserPlus size={12} />
                      Novo Cliente
                    </button>
                  </div>
                  
                  <select
                    required
                    value={selectedClienteId}
                    onChange={(e) => setSelectedClienteId(e.target.value)}
                    className="block w-full rounded-lg border border-gray-205 bg-white px-3 py-2 text-xs text-gray-800 focus:border-slate-900 focus:outline-none"
                    id="select-buyer-client"
                  >
                    <option value="">-- Selecione o Cliente Cadastrado --</option>
                    {clientes.map(cli => (
                      <option key={cli.id} value={cli.id}>{cli.nome}</option>
                    ))}
                  </select>
                </div>

                {/* PRAZO E PRIORIDADE */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-sans text-2xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Data de Entrega Limite
                    </label>
                    <input
                      type="date"
                      required
                      value={dataEntrega}
                      onChange={(e) => setDataEntrega(e.target.value)}
                      className="block w-full rounded-lg border border-gray-205 py-1.5 px-3 text-xs text-gray-800 focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-2xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Prioridade
                    </label>
                    <select
                      value={prioridade}
                      onChange={(e) => setPrioridade(e.target.value as any)}
                      className="block w-full rounded-lg border border-gray-205 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-slate-900 focus:outline-none"
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-sans text-2xs font-bold uppercase tracking-wider text-gray-400 mb-1.5" title="Prioridade em Sequência">
                      Prioridade Seq.
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Ex: 1, 2, 3..."
                      value={prioridadeSequencia}
                      onChange={(e) => setPrioridadeSequencia(e.target.value)}
                      className="block w-full rounded-lg border border-gray-205 py-1.5 px-3 text-xs text-gray-800 focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                {/* SEÇÃO DE PRODUTOS SOB DOCK */}
                <div className="border-t border-gray-100 pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-2xs font-bold uppercase tracking-wider text-gray-400 block">
                      Descrição Física dos Lotes/Produtos
                    </span>
                    <button
                      type="button"
                      onClick={handleAddProductToForm}
                      className="rounded border border-gray-200 px-2.5 py-1 font-sans text-3xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
                    >
                      + Prod
                    </button>
                  </div>

                  {formProdutos.map((prodCard, prodIdx) => (
                    <div key={prodIdx} className="relative rounded-xl border border-gray-150 bg-gray-25/50 p-4 space-y-3.5" id={`product-form-block-${prodIdx}`}>
                      
                      {/* Titulo do card com opção de exclusão */}
                      <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                        <span className="font-mono text-3xs font-bold text-slate-800">PRODUTO #{prodIdx + 1}</span>
                        {formProdutos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveProductFromForm(prodIdx)}
                            className="text-rose-500 text-3xs font-bold hover:underline"
                          >
                            Excluir Item
                          </button>
                        )}
                      </div>

                      {/* SELEÇÃO DE MODELO PILOTO */}
                      {produtosModelos.length > 0 && (
                        <div className="relative rounded-lg bg-slate-50 border border-slate-100 p-2 space-y-1.5">
                          <label className="block font-sans text-3xs font-bold text-slate-600 flex items-center gap-1">
                            <Bookmark size={11} className="text-slate-400" />
                            Preencher com Modelo Homologado:
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Digite código ou descrição para pesquisar..."
                              value={modelSearchQuery[prodIdx] || ''}
                              onFocus={() => setIsSearchFocused(prev => ({ ...prev, [prodIdx]: true }))}
                              onBlur={() => setTimeout(() => setIsSearchFocused(prev => ({ ...prev, [prodIdx]: false })), 250)}
                              onChange={(e) => {
                                const val = e.target.value;
                                setModelSearchQuery(prev => ({ ...prev, [prodIdx]: val }));
                              }}
                              className="block w-full rounded border border-gray-200 bg-white pl-2 pr-12 py-1.5 text-3xs text-gray-750 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                            {(modelSearchQuery[prodIdx] || '') && (
                              <button
                                type="button"
                                onClick={() => setModelSearchQuery(prev => ({ ...prev, [prodIdx]: '' }))}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] bg-slate-200 hover:bg-slate-300 rounded px-1 text-slate-600 font-bold cursor-pointer"
                              >
                                Limpar
                              </button>
                            )}

                            {/* Floating Suggestions List */}
                            {isSearchFocused[prodIdx] && (() => {
                              const q = (modelSearchQuery[prodIdx] || '').toLowerCase().trim();
                              const filtered = produtosModelos.filter(m => {
                                if (!q) return true;
                                const matchCode = m.codigo ? m.codigo.toLowerCase().includes(q) : false;
                                const matchDesc = m.descricao ? m.descricao.toLowerCase().includes(q) : false;
                                return matchCode || matchDesc;
                              });

                              if (filtered.length === 0) {
                                return (
                                  <div className="absolute left-0 right-0 z-50 mt-1 rounded-md border border-slate-200 bg-white shadow-lg py-3 px-3 text-center text-3xs text-slate-400 italic">
                                    Nenhum modelo homologado encontrado
                                  </div>
                                );
                              }

                              return (
                                <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg py-1">
                                  {filtered.map(m => (
                                    <button
                                      key={m.id}
                                      type="button"
                                      onMouseDown={() => {
                                        handleLoadFromModel(prodIdx, m.id);
                                        setModelSearchQuery(prev => ({ ...prev, [prodIdx]: m.descricao }));
                                      }}
                                      className="w-full text-left px-3 py-2 hover:bg-indigo-50/70 border-b border-slate-50 last:border-0 text-3xs text-slate-700 font-sans transition-colors block cursor-pointer"
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold text-slate-900">
                                          {m.codigo ? `[${m.codigo}] ` : ''}{m.descricao}
                                        </span>
                                        <span className="text-slate-400 font-mono text-[9px] shrink-0">
                                          {m.dimensoes}
                                        </span>
                                      </div>
                                      <div className="text-slate-400 text-[9px] truncate mt-0.5">
                                        {m.material} • {m.cores_quantidade || 0} cores
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Descricao */}
                      <div>
                        <label className="block font-sans text-3xs font-bold text-gray-500 mb-1">
                          Descrição do Item
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Cartucho Sabonete Cremoso (Sem Alça)"
                          value={prodCard.descricao}
                          onChange={(e) => handleProductFieldChange(prodIdx, 'descricao', e.target.value)}
                          className="block w-full rounded-lg border border-gray-200 bg-white py-1.5 px-3 text-2xs text-gray-800 focus:border-slate-900 focus:outline-none"
                        />
                      </div>

                      {/* Tipo de Produto e Pontos de Cola */}
                      <div className={(prodCard.tipo_produto || 'embalagem') === 'embalagem' ? "grid grid-cols-2 gap-3" : ""}>
                        <div>
                          <label className="block font-sans text-3xs font-bold text-gray-500 mb-1">
                            Tipo de Item / Produto
                          </label>
                          <select
                            value={prodCard.tipo_produto || 'embalagem'}
                            onChange={(e) => handleProductFieldChange(prodIdx, 'tipo_produto', e.target.value as any)}
                            className="block w-full rounded-lg border border-gray-200 bg-white py-1.5 px-3 text-2xs text-gray-850 focus:border-slate-900 focus:outline-none cursor-pointer"
                          >
                            <option value="embalagem">📦 Embalagem</option>
                            <option value="manual">📖 Manual Técnico</option>
                            <option value="bolacha">🍺 Bolacha de Chopp</option>
                          </select>
                        </div>

                        {(prodCard.tipo_produto || 'embalagem') === 'embalagem' && (
                          <div>
                            <label className="block font-sans text-3xs font-bold text-gray-500 mb-1">
                              Pontos de Cola
                            </label>
                            <select
                              value={prodCard.pontos_cola !== undefined ? prodCard.pontos_cola : 1}
                              onChange={(e) => handleProductFieldChange(prodIdx, 'pontos_cola', Number(e.target.value))}
                              className="block w-full rounded-lg border border-gray-200 bg-white py-1.5 px-3 text-2xs text-gray-850 focus:border-slate-900 focus:outline-none cursor-pointer"
                              id={`select-pontos-cola-${prodIdx}`}
                            >
                              <option value={0}>0 Pontos (Sem Cola)</option>
                              <option value={1}>1 Ponto</option>
                              <option value={2}>2 Pontos</option>
                              <option value={3}>3 Pontos</option>
                              <option value={4}>4 Pontos</option>
                              <option value={5}>5 Pontos</option>
                              <option value={6}>6 Pontos</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Quantidade, dimensoes e medida da faca */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block font-sans text-3xs font-bold text-gray-500 mb-1">
                            Quantidade (Pçs)
                          </label>
                          <input
                            type="number"
                            required
                            min={1}
                            value={prodCard.quantidade}
                            onChange={(e) => handleProductFieldChange(prodIdx, 'quantidade', Number(e.target.value))}
                            className="block w-full rounded-lg border border-gray-200 bg-white py-1.5 px-3 text-2xs text-gray-800 focus:border-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block font-sans text-3xs font-bold text-gray-500 mb-1">
                            Dimensões Finais (C x L x A)
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: 10x10x12 cm"
                            value={prodCard.dimensoes}
                            onChange={(e) => handleProductFieldChange(prodIdx, 'dimensoes', e.target.value)}
                            className="block w-full rounded-lg border border-gray-200 bg-white py-1.5 px-3 text-2xs text-gray-800 focus:border-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block font-sans text-3xs font-bold text-gray-500 mb-1">
                            Medida da Faca (L x C)
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: 50x70 cm"
                            value={prodCard.medida_faca || ''}
                            onChange={(e) => handleProductFieldChange(prodIdx, 'medida_faca', e.target.value)}
                            className="block w-full rounded-lg border border-gray-200 bg-white py-1.5 px-3 text-2xs text-gray-800 focus:border-slate-900"
                          />
                        </div>
                      </div>

                      {/* Layout e Contatos de Faca */}
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="block font-sans text-3xs font-bold text-gray-500 mb-1">
                            Contatos na Faca (poses)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={prodCard.contatos_faca}
                            onChange={(e) => handleProductFieldChange(prodIdx, 'contatos_faca', Number(e.target.value))}
                            className="block w-full rounded-lg border border-gray-200 bg-white py-1.5 px-3 text-2xs text-gray-800 focus:border-slate-900 focus:outline-none"
                          />
                          <p className="mt-1 font-mono text-[9px] text-emerald-700 font-medium whitespace-nowrap">
                            ➜ {prodCard.contatos_faca} poses/fl
                          </p>
                        </div>
                      </div>

                      {/* Múltiplos Insumos na Ficha Técnica do Pedido */}
                      <div className="border-t border-slate-200 pt-3 mt-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 bg-slate-50 p-2 rounded-lg border border-slate-150 gap-2">
                          <div>
                            <span className="font-sans text-3xs font-extrabold text-slate-500 uppercase flex items-center gap-1">
                              Insumos & Matérias-Primas da Ficha Técnica
                            </span>
                            <p className="text-[10px] text-slate-500 font-sans leading-tight">
                              Defina os insumos consumidos para fabricar este item.
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                            <label className="font-sans text-4xs font-extrabold text-slate-500 uppercase whitespace-nowrap">Qtd Insumos:</label>
                            <select
                              value={prodCard.insumos_ficha ? prodCard.insumos_ficha.length : 1}
                              onChange={(e) => handleProductQtdInsumosChange(prodIdx, Number(e.target.value))}
                              className="rounded border border-slate-200 bg-white py-0.5 px-1.5 text-3xs text-slate-800 font-bold focus:outline-none cursor-pointer"
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                <option key={n} value={n}>{n} {n === 1 ? 'Insumo' : 'Insumos'}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {(prodCard.insumos_ficha && prodCard.insumos_ficha.length > 0
                            ? prodCard.insumos_ficha
                            : [{ insumo_id: '', nome: prodCard.material, rendimento: prodCard.fator_consumo > 0 ? Number((1 / prodCard.fator_consumo).toFixed(4)) : 20, fator_consumo: prodCard.fator_consumo }]
                          ).map((item, itemIdx) => {
                            const selectedInsumo = insumos.find(ins => ins.id === item.insumo_id || ins.nome === item.nome);
                            return (
                              <div key={itemIdx} className="bg-slate-50/50 border border-slate-200 rounded-lg p-2.5 relative hover:border-slate-300 transition-colors">
                                <div className="absolute left-2 top-2 bg-slate-200 text-slate-700 font-mono text-[8px] font-extrabold w-3.5 h-3.5 rounded-full flex items-center justify-center border border-slate-300 shadow-3xs">
                                  {itemIdx + 1}
                                </div>
                                <div className="ml-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <label className="block font-sans text-4xs font-bold text-gray-500 mb-0.5">
                                      Selecionar Insumo {itemIdx === 0 && "(Principal / Papel)"}
                                    </label>
                                    <select
                                      value={item.insumo_id || (selectedInsumo?.id || '')}
                                      required
                                      onChange={(e) => {
                                        const insId = e.target.value;
                                        const found = insumos.find(ins => ins.id === insId);
                                        updateProductInsumoFicha(prodIdx, itemIdx, {
                                          insumo_id: insId,
                                          nome: found ? found.nome : '',
                                        });
                                      }}
                                      className="block w-full rounded border border-gray-200 bg-white py-1 px-2 text-3xs text-gray-800 focus:outline-none cursor-pointer"
                                    >
                                      <option value="">Selecione um Insumo...</option>
                                      {insumos
                                        .sort((a, b) => a.nome.localeCompare(b.nome))
                                        .map(ins => (
                                          <option key={ins.id} value={ins.id}>
                                            {ins.nome} ({ins.unidade}) {ins.codigo ? `- ERP: ${ins.codigo}` : ''}
                                          </option>
                                        ))}
                                    </select>
                                    {selectedInsumo && (
                                      <div className="mt-0.5 flex items-center gap-1">
                                        <span className="font-mono text-[8px] text-slate-500 bg-slate-150 px-1 rounded">
                                          Estoque: {selectedInsumo.estoque_atual} {selectedInsumo.unidade}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    <label className="block font-sans text-4xs font-bold text-gray-500 mb-0.5">
                                      Rendimento (unidades p/ {selectedInsumo?.unidade || 'folha/unidade'})
                                    </label>
                                    <input
                                      type="number"
                                      step="0.0001"
                                      min="0.0001"
                                      required
                                      value={item.rendimento}
                                      onChange={(e) => {
                                        const rend = Number(e.target.value) || 0;
                                        updateProductInsumoFicha(prodIdx, itemIdx, { rendimento: rend });
                                      }}
                                      placeholder="Ex: 20"
                                      className="block w-full rounded border border-gray-200 bg-white py-1 px-2 text-3xs text-gray-800 focus:outline-none"
                                    />
                                    <p className="mt-0.5 font-mono text-[8px] text-indigo-700 italic leading-none">
                                      ➜ Fator: {item.fator_consumo.toFixed(4)} | Total para prod: {Math.ceil(prodCard.quantidade * item.fator_consumo).toLocaleString('pt-BR')} {selectedInsumo?.unidade || 'un'}
                                    </p>
                                  </div>

                                  {itemIdx === 0 && (
                                    <div className="col-span-1 sm:col-span-2 mt-2.5 pt-2.5 border-t border-slate-200/60 space-y-3">
                                      <div className="bg-slate-100/70 p-3 rounded-lg border border-slate-200/60 text-left">
                                        <h4 className="font-sans text-[10px] font-extrabold uppercase tracking-wide text-indigo-900 mb-2.5 flex items-center gap-1.5">
                                          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                                          Esquema de Refilamento e Dimensões do Papel
                                        </h4>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
                                          <div className="space-y-2.5">
                                            {/* Formato de Refilamento Selection */}
                                            <div>
                                              <label className="block font-sans text-4xs font-extrabold text-slate-500 mb-1 uppercase tracking-wide">
                                                Formato de Refilamento
                                              </label>
                                              <select
                                                value={item.formato_refilamento || 'meia'}
                                                onChange={(e) => {
                                                  const format = e.target.value;
                                                  let wOrig = item.largura_original || 76;
                                                  let hOrig = item.altura_original || 112;
                                                  let wRef = item.largura_refilada || 56;
                                                  let hRef = item.altura_refilada || 76;

                                                  if (format === 'inteiro') {
                                                    wRef = wOrig;
                                                    hRef = hOrig;
                                                  } else if (format === 'meia') {
                                                    wRef = 56;
                                                    hRef = 76;
                                                  } else if (format === 'quarto') {
                                                    wRef = 38;
                                                    hRef = 56;
                                                  } else if (format === 'oitavo') {
                                                    wRef = 28;
                                                    hRef = 38;
                                                  }

                                                  updateProductInsumoFicha(prodIdx, itemIdx, {
                                                    formato_refilamento: format,
                                                    largura_original: wOrig,
                                                    altura_original: hOrig,
                                                    largura_refilada: wRef,
                                                    altura_refilada: hRef
                                                  });
                                                }}
                                                className="block w-full rounded border border-gray-200 bg-white py-1 px-2 text-3xs text-gray-800 focus:outline-none cursor-pointer"
                                              >
                                                <option value="inteiro">Folha Inteira (Sem Refile)</option>
                                                <option value="meia">Meia Folha (1/2)</option>
                                                <option value="quarto">Quarto de Folha (1/4)</option>
                                                <option value="oitavo">Oitavo de Folha (1/8)</option>
                                                <option value="personalizado">Formato Personalizado</option>
                                              </select>
                                            </div>

                                            {/* Medida do Insumo Original */}
                                            <div className="grid grid-cols-2 gap-2">
                                              <div>
                                                <label className="block font-sans text-[8px] font-extrabold text-slate-500 mb-1 uppercase tracking-wide">
                                                  Largura Original (cm)
                                                </label>
                                                <input
                                                  type="number"
                                                  min="1"
                                                  step="0.1"
                                                  value={item.largura_original ?? 76}
                                                  onChange={(e) => {
                                                    const val = Number(e.target.value) || 0;
                                                    const format = item.formato_refilamento || 'meia';
                                                    let wRef = item.largura_refilada ?? 56;
                                                    if (format === 'inteiro') wRef = val;
                                                    updateProductInsumoFicha(prodIdx, itemIdx, { 
                                                      largura_original: val,
                                                      largura_refilada: wRef
                                                    });
                                                  }}
                                                  className="block w-full rounded border border-gray-200 bg-white py-1 px-2 text-3xs text-gray-800 focus:outline-none font-semibold"
                                                />
                                              </div>
                                              <div>
                                                <label className="block font-sans text-[8px] font-extrabold text-slate-500 mb-1 uppercase tracking-wide">
                                                  Altura Original (cm)
                                                </label>
                                                <input
                                                  type="number"
                                                  min="1"
                                                  step="0.1"
                                                  value={item.altura_original ?? 112}
                                                  onChange={(e) => {
                                                    const val = Number(e.target.value) || 0;
                                                    const format = item.formato_refilamento || 'meia';
                                                    let hRef = item.altura_refilada ?? 76;
                                                    if (format === 'inteiro') hRef = val;
                                                    updateProductInsumoFicha(prodIdx, itemIdx, { 
                                                      altura_original: val,
                                                      altura_refilada: hRef
                                                    });
                                                  }}
                                                  className="block w-full rounded border border-gray-200 bg-white py-1 px-2 text-3xs text-gray-800 focus:outline-none font-semibold"
                                                />
                                              </div>
                                            </div>

                                            {/* Medida do Formato Refilado */}
                                            <div className="grid grid-cols-2 gap-2">
                                              <div>
                                                <label className="block font-sans text-[8px] font-extrabold text-slate-500 mb-1 uppercase tracking-wide">
                                                  Largura Refilada (cm)
                                                </label>
                                                <input
                                                  type="number"
                                                  min="1"
                                                  step="0.1"
                                                  disabled={item.formato_refilamento !== 'personalizado' && item.formato_refilamento !== undefined}
                                                  value={item.largura_refilada ?? 56}
                                                  onChange={(e) => {
                                                    const val = Number(e.target.value) || 0;
                                                    updateProductInsumoFicha(prodIdx, itemIdx, { largura_refilada: val });
                                                  }}
                                                  className="disabled:bg-slate-50 disabled:text-slate-500 block w-full rounded border border-gray-200 bg-white py-1 px-2 text-3xs text-gray-800 focus:outline-none font-semibold"
                                                />
                                              </div>
                                              <div>
                                                <label className="block font-sans text-[8px] font-extrabold text-slate-500 mb-1 uppercase tracking-wide">
                                                  Altura Refilada (cm)
                                                </label>
                                                <input
                                                  type="number"
                                                  min="1"
                                                  step="0.1"
                                                  disabled={item.formato_refilamento !== 'personalizado' && item.formato_refilamento !== undefined}
                                                  value={item.altura_refilada ?? 76}
                                                  onChange={(e) => {
                                                    const val = Number(e.target.value) || 0;
                                                    updateProductInsumoFicha(prodIdx, itemIdx, { altura_refilada: val });
                                                  }}
                                                  className="disabled:bg-slate-50 disabled:text-slate-500 block w-full rounded border border-gray-200 bg-white py-1 px-2 text-3xs text-gray-800 focus:outline-none font-semibold"
                                                />
                                              </div>
                                            </div>
                                          </div>

                                          {/* Dynamic Graphic Preview */}
                                          <div className="flex justify-center w-full">
                                            {(() => {
                                              const wOrig = item.largura_original ?? 76;
                                              const hOrig = item.altura_original ?? 112;
                                              const wRef = item.largura_refilada ?? 56;
                                              const hRef = item.altura_refilada ?? 76;
                                              const format = item.formato_refilamento ?? 'meia';

                                              // Fit in a bounding box of 160w x 100h
                                              const maxW = 160;
                                              const maxH = 100;
                                              const scale = Math.min(maxW / wOrig, maxH / hOrig);

                                              const svgWOrig = wOrig * scale;
                                              const svgHOrig = hOrig * scale;

                                              // Helper for division rounding tolerance (e.g. 113 / 37.67 = 2.9997 -> 3)
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

                                              // Centering values in SVG frame (200 x 120)
                                              const dx = (200 - svgWOrig) / 2;
                                              const dy = (120 - svgHOrig) / 2;

                                              const formatNames: Record<string, string> = {
                                                inteiro: 'Folha Inteira',
                                                meia: 'Meia Folha (1/2)',
                                                quarto: 'Quarto (1/4)',
                                                oitavo: 'Oitavo (1/8)',
                                                personalizado: 'Personalizado'
                                              };

                                              return (
                                                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 w-full flex flex-col items-center">
                                                  <div className="flex justify-between w-full text-[9px] font-mono text-slate-300 border-b border-slate-800 pb-1 mb-2 uppercase font-bold tracking-wider">
                                                    <span>Esquema de Corte</span>
                                                    <span className="text-emerald-400 font-extrabold">{formatNames[format] || format}</span>
                                                  </div>

                                                  <svg width="200" height="120" className="bg-slate-950 rounded border border-slate-850">
                                                    <defs>
                                                      <pattern id="grid-pattern-pedidos" width="10" height="10" patternUnits="userSpaceOnUse">
                                                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.8"/>
                                                      </pattern>
                                                    </defs>
                                                    <rect width="200" height="120" fill="url(#grid-pattern-pedidos)" />

                                                    {/* Outer Original Sheet */}
                                                    <rect
                                                      x={dx}
                                                      y={dy}
                                                      width={svgWOrig}
                                                      height={svgHOrig}
                                                      fill="rgba(99, 102, 241, 0.04)"
                                                      stroke="#6366f1"
                                                      strokeWidth="1.2"
                                                      strokeDasharray="2 2"
                                                      rx="2"
                                                    />

                                                    {/* Inner Refilado Sheets (Grid of all fitting sheets) */}
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
                                                              fill="rgba(16, 185, 129, 0.12)"
                                                              stroke="#10b981"
                                                              strokeWidth="1"
                                                              rx="1"
                                                            />
                                                            {/* Label inside each refiled sheet */}
                                                            <text
                                                              x={rx + rw / 2}
                                                              y={ry + rh / 2 + 2.5}
                                                              fill="#10b981"
                                                              fontSize="6"
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
                                                      fontSize="7"
                                                      fontWeight="bold"
                                                      fontFamily="monospace"
                                                      textAnchor="middle"
                                                    >
                                                      {wOrig} x {hOrig} cm
                                                    </text>
                                                  </svg>

                                                  <div className="flex flex-col gap-1 w-full mt-2 text-[8px] font-sans text-slate-400 border-t border-slate-800/60 pt-2 text-left">
                                                    <div className="flex justify-between">
                                                      <span>Rendimento de Refile:</span>
                                                      <span className="font-mono text-indigo-300 font-extrabold">
                                                        {finalCols * finalRows} {finalCols * finalRows === 1 ? 'folha' : 'folhas'} ({finalCols}x{finalRows})
                                                      </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span>Aproveitamento Total:</span>
                                                      <span className="font-mono text-emerald-400 font-extrabold">
                                                        {Math.min(100, Math.round(((drawWRef * drawHRef * finalCols * finalRows) / (wOrig * hOrig)) * 100))}% da área
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Cores e Pantones de Produção integrada por item */}
                      <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-lg space-y-3 mt-2">
                        <div className="grid grid-cols-3 gap-2 items-end">
                          <div>
                            <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">Cores Frente</label>
                            <input
                              type="number"
                              required
                              min="0"
                              max="12"
                              value={prodCard.cores_frente !== undefined ? prodCard.cores_frente : (prodCard.cores_quantidade || 0)}
                              onChange={(e) => handleProductCoresFrenteChange(prodIdx, Number(e.target.value))}
                              className="block w-full rounded-lg border border-gray-200 bg-white py-1 px-2.5 text-2xs text-gray-800 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">Cores Verso</label>
                            <input
                              type="number"
                              required
                              min="0"
                              max="12"
                              value={prodCard.cores_verso || 0}
                              onChange={(e) => handleProductCoresVersoChange(prodIdx, Number(e.target.value))}
                              className="block w-full rounded-lg border border-gray-200 bg-white py-1 px-2.5 text-2xs text-gray-800 focus:outline-none"
                            />
                          </div>
                          <div className="bg-white/60 rounded-lg p-1.5 text-center border border-gray-200">
                            <span className="block font-sans text-[8px] font-extrabold text-slate-400 uppercase leading-none">Total Cores</span>
                            <strong className="text-xs font-semibold text-slate-800 font-mono mt-0.5 block leading-tight">{prodCard.cores_quantidade}</strong>
                          </div>
                        </div>

                        {(prodCard.cores_quantidade || 0) > 0 && (
                          <div className="space-y-1.5">
                            <label className="block font-sans text-4xs font-extrabold text-slate-500 uppercase">Cores / Códigos Pantone (#Swatch)</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {(prodCard.pantones || []).map((pantoneVal, pIdx) => {
                                const hexColor = getPantoneColor(pantoneVal);
                                return (
                                  <div key={pIdx} className="flex items-center gap-1.5 border border-slate-200 bg-white p-1 rounded-md">
                                    <span className="text-[9px] text-slate-400 font-bold">#{pIdx + 1}</span>
                                    <input
                                      type="text"
                                      value={pantoneVal}
                                      onChange={(e) => handleProductPantoneFieldChange(prodIdx, pIdx, e.target.value)}
                                      placeholder="Ex: Warm Red C, 286 C"
                                      className="w-full bg-transparent text-[10px] focus:outline-none font-medium text-slate-800"
                                    />
                                    <div
                                      className="w-4 h-4 rounded border border-slate-200 shrink-0"
                                      style={{ backgroundColor: hexColor }}
                                      title={pantoneVal}
                                    ></div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Roteiro Sequencial da Maquina */}
                      <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-205 mt-2">
                        <div>
                          <label className="block font-sans text-3xs font-extrabold text-slate-700 uppercase tracking-wider">
                            Roteiro de Produção Planejado (Fases Sequenciais)
                          </label>
                          <p className="font-sans text-[10px] text-slate-450 mt-0.5 leading-tight">
                            Clique nos botões de direção para alterar quais as ordens dos passos ou adicione fases adicionais.
                          </p>
                        </div>

                        {prodCard.roteiro.length === 0 ? (
                          <div className="text-center py-4 border border-dashed border-slate-200 bg-white rounded-lg text-slate-400 text-3xs italic font-sans">
                            Nenhuma etapa selecionada. Inclua fases usando os botões abaixo.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {prodCard.roteiro.map((maqId, stepIdx) => {
                              const machineObj = maquinas.find(m => m.id === maqId);
                              return (
                                <div 
                                  key={`${maqId}-${stepIdx}`}
                                  className="flex items-center justify-between bg-white border border-slate-200/80 rounded-lg p-2 shadow-3xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="flex items-center justify-center bg-slate-900 text-white text-[9px] font-black w-4.5 h-4.5 rounded-sm font-mono">
                                      {stepIdx + 1}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="font-sans text-3xs font-bold text-slate-900 truncate">
                                        {machineObj?.nome || maqId}
                                      </p>
                                      <p className="text-[9px] text-slate-400 font-mono -mt-0.5 truncate uppercase">
                                        {machineObj?.tipo || 'Máquina'}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Control arrows and remove buttons to alter step order */}
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      disabled={stepIdx === 0}
                                      onClick={() => handleMoveStep(prodIdx, stepIdx, 'up')}
                                      className={`p-1 rounded transition-colors ${
                                        stepIdx === 0 
                                          ? 'text-slate-200 cursor-not-allowed' 
                                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                                      }`}
                                      title="Mover para cima"
                                    >
                                      <ArrowUp size={11} />
                                    </button>

                                    <button
                                      type="button"
                                      disabled={stepIdx === prodCard.roteiro.length - 1}
                                      onClick={() => handleMoveStep(prodIdx, stepIdx, 'down')}
                                      className={`p-1 rounded transition-colors ${
                                        stepIdx === prodCard.roteiro.length - 1
                                          ? 'text-slate-200 cursor-not-allowed' 
                                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                                      }`}
                                      title="Mover para baixo"
                                    >
                                      <ArrowDown size={11} />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveStep(prodIdx, stepIdx)}
                                      className="p-1 rounded text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                                      title="Remover etapa"
                                    >
                                      <X size={11} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-200 text-left">
                          <span className="block font-sans text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                            + Incluir fase no final do roteiro:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {maquinas.map((m, idx) => (
                              <button
                                type="button"
                                key={`${m.id || 'maq'}-${idx}`}
                                onClick={() => handleAddStepToRoute(prodIdx, m.id)}
                                className="py-1 px-2.5 bg-white border border-slate-250 text-slate-700 hover:border-slate-400 rounded-md text-3xs font-bold font-sans transition-all cursor-pointer shadow-3xs flex items-center gap-1 hover:bg-slate-50"
                              >
                                <span>{m.nome}</span>
                                <span className="text-slate-400 font-mono text-[8px] font-extrabold">({m.id.toUpperCase()})</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Informações Importantes da Ficha Técnica */}
                      <div className="bg-amber-50/50 border border-amber-200/80 rounded-lg p-2.5 space-y-1">
                        <label className="block font-sans text-3xs font-extrabold text-amber-950 uppercase flex items-center gap-1.5">
                          <AlertCircle size={12} className="text-amber-600 shrink-0" />
                          Informações Importantes / Observações Técnicas
                        </label>
                        <textarea
                          rows={2}
                          value={prodCard.informacoes_importantes || prodCard.observacoes || ''}
                          onChange={(e) => handleProductFieldChange(prodIdx, 'informacoes_importantes', e.target.value)}
                          placeholder="Orientações e detalhes importantes da ficha técnica para a produção..."
                          className="block w-full rounded border border-amber-200 bg-white py-1 px-2 text-2xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 font-sans leading-relaxed"
                        />
                      </div>

                      {/* Opção para Salvar como Modelo no Catálogo */}
                      <div className="pt-2 border-t border-gray-150/40 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`salvar_em_catalogo_${prodIdx}`}
                          checked={!!prodCard.salvar_em_catalogo}
                          onChange={(e) => handleProductFieldChange(prodIdx, 'salvar_em_catalogo', e.target.checked)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-950 cursor-pointer h-3.5 w-3.5"
                        />
                        <label htmlFor={`salvar_em_catalogo_${prodIdx}`} className="font-sans text-3xs font-bold text-emerald-800 cursor-pointer select-none flex items-center gap-1 select-none">
                          <Sparkles size={11} className="text-emerald-500 animate-pulse shrink-0" />
                          Salvar especificações como modelo de fábrica para reuso
                        </label>
                      </div>

                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-150 pt-4 mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 font-sans text-xs font-semibold text-gray-600 hover:bg-gray-50 text-center"
                  >
                    Descartar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 font-sans text-xs font-semibold text-white hover:bg-slate-800 text-center cursor-pointer shadow-sm"
                    id="save-constructed-order"
                  >
                    Salvar Pedido Lote
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL POPUP RÁPIDO PARA NOVO CLIENTE */}
      {showCliForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-3xs" id="quick-client-modal">
          <div className="w-full max-w-sm rounded-xl border border-gray-150 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-4">
              <span className="font-sans font-bold text-xs text-gray-900">Novo Cliente</span>
              <button onClick={() => setShowCliForm(false)} className="rounded text-gray-400 hover:bg-gray-100 p-1">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddQuickCliente} className="space-y-3">
              <div>
                <label className="block font-sans text-3xs font-bold text-gray-500 mb-1">Razão Social / Nome Fantasia</label>
                <input
                  type="text"
                  required
                  value={newCliNome}
                  onChange={(e) => setNewCliNome(e.target.value)}
                  placeholder="Ex: Chocolates Nestlé S.A."
                  className="block w-full rounded border border-gray-200 py-1 px-2.5 text-2xs text-gray-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-sans text-3xs font-bold text-gray-500 mb-1">E-mail Corporativo</label>
                <input
                  type="email"
                  value={newCliEmail}
                  onChange={(e) => setNewCliEmail(e.target.value)}
                  placeholder="contato@cliente.com"
                  className="block w-full rounded border border-gray-200 py-1 px-2.5 text-2xs text-gray-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-sans text-3xs font-bold text-gray-500 mb-1">Pessoa Contato</label>
                  <input
                    type="text"
                    value={newCliContato}
                    onChange={(e) => setNewCliContato(e.target.value)}
                    placeholder="E.g. Ana Clara"
                    className="block w-full rounded border border-gray-200 py-1 px-2.5 text-2xs text-gray-800"
                  />
                </div>
                <div>
                  <label className="block font-sans text-3xs font-bold text-gray-500 mb-1">Telefone / Ramal</label>
                  <input
                    type="text"
                    value={newCliTelefone}
                    onChange={(e) => setNewCliTelefone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="block w-full rounded border border-gray-200 py-1 px-2.5 text-2xs text-gray-800"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full rounded bg-slate-900 py-2 font-sans text-2xs font-bold text-white hover:bg-slate-800"
              >
                Cadastrar Cliente
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CATÁLOGO DE EMBALAGENS HOMOLOGADAS (PRODUTOS MODELOS) */}
      <div className="sleek-card p-5 space-y-4 shadow-3xs" id="product-templates-catalog">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Bookmark className="text-emerald-600 shrink-0" size={18} />
            <div>
              <h3 className="font-sans text-xs font-bold text-gray-900 uppercase tracking-wide">Catálogo de Modelos & Especificações</h3>
              <p className="font-sans text-3xs text-gray-500 font-normal">Fichas técnicas de embalagens pré-cadastradas para carregamento instantâneo em novos pedidos.</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewModelForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-3 py-1.5 font-sans text-3xs font-bold text-emerald-800 transition-colors cursor-pointer self-start sm:self-auto"
            id="btn-open-create-model"
          >
            <Plus size={13} />
            Novo Modelo Técn.
          </button>
        </div>

        {produtosModelos.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-gray-150 rounded-xl bg-gray-25/30">
            <Archive size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-2xs font-medium text-gray-400">Nenhum modelo de embalagem cadastrado no catálogo.</p>
            <p className="text-3xs text-gray-400 font-normal mt-0.5">Cadastre novos modelos acima ou marque para salvar ao criar pedidos.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {produtosModelos.map(mod => {
              return (
                <div key={mod.id} className="relative rounded-xl border border-gray-155 bg-white p-3.5 hover:shadow-xs transition-shadow flex flex-col justify-between space-y-3 shadow-3xs" id={`catalog-item-${mod.id}`}>
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="font-mono text-4xs font-bold uppercase text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100/40">Ficha Piloto</span>
                          {mod.codigo && (
                            <span className="font-mono text-4xs font-bold text-slate-500 uppercase tracking-tight">Cód: {mod.codigo}</span>
                          )}
                        </div>
                        <h4 className="font-sans font-bold text-xs text-slate-900 tracking-tight leading-snug line-clamp-2" title={mod.descricao}>
                          {mod.descricao}
                        </h4>
                      </div>
                      <button
                        onClick={() => triggerConfirm(
                          'Excluir Ficha Técnica / Modelo',
                          `Deseja realmente remover o modelo "${mod.descricao}" do catálogo? Esta ação é permanente.`,
                          () => excluirProdutoModelo(mod.id),
                          { confirmLabel: 'Remover', variant: 'danger' }
                        )}
                        className="text-gray-400 hover:text-rose-500 p-1 rounded-md hover:bg-rose-25 transition-colors cursor-pointer shrink-0"
                        title="Remover modelo do catálogo"
                        id={`btn-delete-model-${mod.id}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 font-mono text-3xs text-gray-550 border-t border-dashed border-gray-150 pt-2.5">
                      <div>
                        <span className="text-gray-400 block font-sans">C x L x A:</span>
                        <strong className="text-slate-800">{mod.dimensoes}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-sans">Gramatura:</span>
                        <strong className="text-slate-800 truncate block" title={mod.material}>{mod.material.replace(' (Kg)', '').replace(' (Folhas)', '')}</strong>
                      </div>
                      <div className="col-span-2 pt-0.5">
                        <span className="text-gray-400 block font-sans">Consumo unitário:</span>
                        <strong className="text-slate-900 font-bold">{mod.fator_consumo} folhas / un</strong>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-100/60 mt-1 flex flex-col gap-1">
                        <span className="text-gray-400 block font-sans text-[8px] uppercase font-bold tracking-wider">Cores de Impressão ({mod.cores_quantidade || 0}):</span>
                        <div className="flex flex-wrap gap-1">
                          {mod.pantones && mod.pantones.length > 0 ? (
                            mod.pantones.map((pantoneCode, pIdx) => {
                              const hex = getPantoneColor(pantoneCode);
                              return (
                                <span key={pIdx} className="inline-flex items-center gap-1 bg-white border border-slate-205 rounded px-1.5 py-0.5 text-[8.5px] font-sans font-semibold text-slate-700">
                                  <span className="w-2 h-2 rounded border border-slate-200 shrink-0" style={{ backgroundColor: hex }}></span>
                                  {pantoneCode}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-gray-400 text-[8px] italic">Sem Pantones ou cores</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-2.5">
                    <span className="font-sans text-4xs text-gray-450 uppercase font-bold block mb-1">Roteiro Sequencial:</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {mod.roteiro.map((node, nIdx) => {
                        const mInfo = maquinas.find(m => m.id === node);
                        return (
                          <div key={`${node}-${nIdx}`} className="flex items-center gap-1 font-mono text-4xs font-bold text-slate-700">
                            {nIdx > 0 && <ChevronRight size={10} className="text-gray-350 shrink-0" />}
                            <span 
                              className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-150 font-mono text-[9px] font-bold text-slate-800 max-w-[65px] truncate"
                              title={`${mInfo?.nome || node} (${mInfo?.tipo})`}
                            >
                              {node.toUpperCase()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* POPUP MODAL PARA CADASTRO DE NOVO MODELO DIRETAMENTE */}
      {showNewModelForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-3xs" id="quick-model-modal">
          <div className="w-full max-w-md rounded-xl border border-gray-150 bg-white p-5 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-4">
              <div className="flex items-center gap-1.5">
                <Bookmark className="text-emerald-600" size={16} />
                <span className="font-sans font-bold text-xs text-gray-900 uppercase">Novo Modelo de Embalagem</span>
              </div>
              <button onClick={() => setShowNewModelForm(false)} className="rounded text-gray-400 hover:bg-gray-100 p-1 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleAddProductModel} className="space-y-4">
              <div>
                <label className="block font-sans text-3xs font-bold text-gray-500 mb-1 uppercase">Descrição do Produto (Modelo)</label>
                <input
                  type="text"
                  required
                  value={newModelDesc}
                  onChange={(e) => setNewModelDesc(e.target.value)}
                  placeholder="Ex: Cartucho de Sabonete Glicerinado 90g (Triplex)"
                  className="block w-full rounded-lg border border-gray-200 bg-white py-1.5 px-3 text-2xs text-gray-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-sans text-3xs font-bold text-gray-500 mb-1 uppercase">Tipo de Produto</label>
                <select
                  value={newModelTipoProduto}
                  onChange={(e) => setNewModelTipoProduto(e.target.value as any)}
                  className="block w-full rounded-lg border border-gray-200 bg-white py-1.5 px-3 text-2xs text-gray-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 cursor-pointer"
                >
                  <option value="embalagem">📦 Embalagem</option>
                  <option value="manual">📖 Manual Técnico</option>
                  <option value="bolacha">🍺 Bolacha de Chopp</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-sans text-3xs font-bold text-gray-500 mb-1 uppercase">Dimensões (C x L x A)</label>
                  <input
                    type="text"
                    required
                    value={newModelDim}
                    onChange={(e) => setNewModelDim(e.target.value)}
                    placeholder="Ex: 8x8x10 cm"
                    className="block w-full rounded-lg border border-gray-200 bg-white py-1.5 px-3 text-2xs text-gray-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-sans text-3xs font-bold text-gray-500 mb-1 uppercase">Rendimento (unidades p/ folha)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={newModelRendimento}
                    onChange={(e) => handleNewModelRendimentoChange(Number(e.target.value) || 0)}
                    placeholder="Ex: 20"
                    className="block w-full rounded-lg border border-gray-200 bg-white py-1.5 px-3 text-2xs text-gray-800 focus:outline-none"
                  />
                  <p className="mt-1 font-mono text-[9px] text-indigo-700 italic leading-tight">
                    ➜ Fator: {newModelFator.toFixed(4)} fls/un | P/ 1.000 pçs: {Math.ceil(1000 * newModelFator).toLocaleString('pt-BR')} fls
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-sans text-3xs font-bold text-gray-500 mb-1 uppercase">Medida da Faca (L x C)</label>
                  <input
                    type="text"
                    value={newModelMedidaFaca}
                    onChange={(e) => setNewModelMedidaFaca(e.target.value)}
                    placeholder="Ex: 50x70 cm"
                    className="block w-full rounded-lg border border-gray-200 bg-white py-1.5 px-3 text-2xs text-gray-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-sans text-3xs font-bold text-gray-500 mb-1 uppercase">Contatos na Faca (poses)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newModelContatosFaca}
                    onChange={(e) => setNewModelContatosFaca(Number(e.target.value))}
                    className="block w-full rounded-lg border border-gray-200 bg-white py-1.5 px-3 text-2xs text-gray-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="relative">
                <label className="block font-sans text-3xs font-bold text-gray-500 mb-1 uppercase">Papel Cartão Principal</label>
                <div className="relative">
                  <input
                    type="text"
                    value={newModelPaperQuery}
                    placeholder="Pesquise por nome ou código..."
                    onFocus={() => setIsNewModelPaperDropdownOpen(true)}
                    onBlur={() => {
                      setTimeout(() => setIsNewModelPaperDropdownOpen(false), 250);
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewModelPaperQuery(val);
                      setNewModelMat(val);
                      setIsNewModelPaperDropdownOpen(true);
                    }}
                    className="block w-full rounded-lg border border-gray-200 bg-white py-1.5 px-3 pr-8 text-2xs text-gray-800 focus:outline-none focus:border-slate-900"
                  />
                  {newModelPaperQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewModelPaperQuery('');
                        setNewModelMat('');
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-650"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>

                {isNewModelPaperDropdownOpen && (() => {
                  const q = newModelPaperQuery.toLowerCase().trim();
                  const filteredInsumos = insumos
                    .filter(i => i.tipo === 'papel_cartao')
                    .filter(i => {
                      if (!q) return true;
                      const codeMatches = i.codigo ? i.codigo.toLowerCase().includes(q) : false;
                      const nameMatches = i.nome.toLowerCase().includes(q);
                      return codeMatches || nameMatches;
                    });

                  if (filteredInsumos.length === 0) {
                    return (
                      <div className="absolute left-0 right-0 z-50 mt-1 rounded-md border border-slate-200 bg-white shadow-lg py-2 px-3 text-center text-[10px] text-slate-400 italic">
                        Nenhum papel encontrado
                      </div>
                    );
                  }

                  return (
                    <div className="absolute left-0 right-0 z-50 mt-1 max-h-40 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg py-1">
                      {filteredInsumos.map(i => (
                        <button
                          key={i.id}
                          type="button"
                          onMouseDown={() => {
                            setNewModelMat(i.nome);
                            setNewModelPaperQuery(i.nome);
                            setIsNewModelPaperDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 border-b border-slate-50 last:border-0 text-3xs font-sans transition-colors block cursor-pointer ${
                            newModelMat === i.nome ? 'bg-indigo-50/50 text-indigo-900 font-semibold' : 'text-slate-700'
                          }`}
                        >
                          <div className="font-semibold">{i.nome}</div>
                          {i.codigo && (
                            <div className="text-[9px] text-indigo-600 font-mono mt-0.5">
                              Código ERP: {i.codigo}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block font-sans text-3xs font-bold text-gray-550 mb-1.5 uppercase">
                  Roteiro Sequencial de Produção
                </label>
                <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg space-y-3 mb-3">
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <label className="block font-sans text-3xs font-semibold text-slate-500 uppercase mb-1">Cores Frente</label>
                      <input
                        type="number"
                        required
                        min="0"
                        max="12"
                        value={newModelCoresFrente}
                        onChange={(e) => handleNewModelCoresFrenteChange(Number(e.target.value))}
                        className="block w-full rounded-lg border border-gray-200 bg-white py-1 px-2.5 text-2xs text-gray-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-sans text-3xs font-semibold text-slate-500 uppercase mb-1">Cores Verso</label>
                      <input
                        type="number"
                        required
                        min="0"
                        max="12"
                        value={newModelCoresVerso}
                        onChange={(e) => handleNewModelCoresVersoChange(Number(e.target.value))}
                        className="block w-full rounded-lg border border-gray-200 bg-white py-1 px-2.5 text-2xs text-gray-800 focus:outline-none"
                      />
                    </div>
                    <div className="bg-white rounded-lg p-1 text-center border border-gray-200">
                      <span className="block font-sans text-[8px] font-extrabold text-slate-400 uppercase leading-none">Total Cores</span>
                      <strong className="text-xs font-semibold text-slate-800 font-mono mt-0.5 block leading-tight">{newModelCoresQuantidade}</strong>
                    </div>
                  </div>

                  {newModelCoresQuantidade > 0 && (
                    <div className="space-y-1.5">
                      <label className="block font-sans text-4xs font-bold text-slate-500 uppercase">Pantones Recomendados</label>
                      <div className="grid grid-cols-1 gap-1.5">
                        {newModelPantones.map((pantoneVal, pIdx) => {
                          const hexColor = getPantoneColor(pantoneVal);
                          const isFrente = pIdx < newModelCoresFrente;
                          return (
                            <div key={pIdx} className="flex items-center gap-1.5 border border-slate-200 bg-white p-1 rounded">
                              <span className="text-[9px] text-slate-400 font-bold shrink-0">#{pIdx + 1}</span>
                              <span className={`text-[8px] font-bold px-1 py-0.5 rounded shrink-0 ${isFrente ? 'bg-sky-50 text-sky-700' : 'bg-purple-50 text-purple-700'}`}>
                                {isFrente ? 'Frente' : 'Verso'}
                              </span>
                              <input
                                type="text"
                                value={pantoneVal}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNewModelPantones(prev => {
                                    const next = [...prev];
                                    next[pIdx] = val;
                                    return next;
                                  });
                                }}
                                placeholder="Ex: Warm Gray 2, Cool Gray 10"
                                className="w-full bg-transparent text-[10px] focus:outline-none font-medium text-slate-800"
                              />
                              <div
                                className="w-4 h-4 rounded border border-slate-203 shrink-0"
                                style={{ backgroundColor: hexColor }}
                              ></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {maquinas.map((m, idx) => {
                    const isSelected = newModelRoute.includes(m.id);
                    return (
                      <button
                        type="button"
                        key={`${m.id || 'maq'}-${idx}`}
                        onClick={() => handleNewModelRouteToggle(m.id)}
                        className={`flex items-center justify-between text-left rounded-lg border p-2 text-3xs font-medium transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 font-bold' 
                            : 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <span>{m.nome} ({m.tipo})</span>
                        <span className={`h-2 text-4xs font-bold tracking-tight uppercase px-1 rounded ${isSelected ? 'bg-emerald-600 text-white' : 'bg-gray-100'}`}>
                          {isSelected ? 'Ativo' : 'Ignorar'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowNewModelForm(false)}
                  className="flex-1 rounded-lg border border-gray-200 py-2.5 font-sans text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-slate-900 py-2.5 font-sans text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Salvar no Catálogo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- IMPRESSÃO DE PEDIDOS / FICHA DE PRODUÇÃO MODAL --- */}
      {selectedPedidoParaImprimir && (() => {
        const p = selectedPedidoParaImprimir;
        const cli = clientes.find(c => c.id === p.cliente_id);
        const prods = produtos.filter(prod => prod.pedido_id === p.id);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto print-modal-overlay">
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                /* Esconde todo o conteúdo padrão da página */
                body * {
                  visibility: hidden !important;
                }
                
                /* Garante que o container do modal e o conteúdo da ficha fiquem visíveis */
                .print-modal-overlay {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  overflow: visible !important;
                  background: transparent !important;
                  backdrop-filter: none !important;
                  visibility: visible !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }

                .print-modal-content {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  max-height: none !important;
                  overflow: visible !important;
                  border: none !important;
                  box-shadow: none !important;
                  background: transparent !important;
                  visibility: visible !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }

                /* Container específico da Ficha de Produção para Impressão */
                #print-section, #print-section * {
                  visibility: visible !important;
                }

                #print-section {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  overflow: visible !important;
                  background: white !important;
                  color: black !important;
                  padding: 0px !important;
                  margin: 0px !important;
                }

                /* Força ocultação de botões, headers e avisos na hora de imprimir */
                .no-print, .no-print * {
                  display: none !important;
                  visibility: hidden !important;
                  height: 0 !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }
              }
            `}} />

            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh] print-modal-content">
              {/* Modal Header (Screen Only) */}
              <div className="p-5 border-b border-gray-150 flex items-center justify-between bg-gray-50/50 no-print">
                <div className="flex items-center gap-2.5">
                  <Printer className="text-indigo-600" size={18} />
                  <div>
                    <h3 className="font-sans text-sm font-bold text-gray-900 uppercase tracking-wider">
                      Visualizar e Imprimir Ficha de Produção
                    </h3>
                    <p className="font-sans text-4xs text-gray-500 font-medium">
                      Otimizado para impressão física ou salvar como PDF (Tamanho A4).
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPedidoParaImprimir(null)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* AVISO DE IFRAME (APARECE APENAS NA TELA E SE ESTIVER EM IFRAME) */}
              {(() => {
                const isIframe = typeof window !== 'undefined' && window.self !== window.top;
                if (!isIframe) return null;
                return (
                  <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 no-print shadow-4xs animate-fadeIn">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                      <div className="font-sans">
                        <strong className="text-xs font-bold text-amber-900 block">Bloqueio de Iframe do Navegador Detectado</strong>
                        <p className="text-4xs text-amber-700 leading-normal font-semibold mt-0.5">
                          Você está rodando o sistema dentro da moldura do AI Studio. Navegadores bloqueiam o comando de impressão (<code className="font-mono bg-amber-100 px-0.5 rounded">window.print()</code>) por motivos de segurança do Iframe.
                        </p>
                        <p className="text-4xs text-amber-800 leading-normal font-bold mt-1">
                          👉 Para imprimir ou Gerar PDF: Clique no botão ao lado para abrir o sistema em uma Nova Aba e realize a impressão normalmente!
                        </p>
                      </div>
                    </div>
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-sans text-2xs font-extrabold px-3 py-2 rounded-lg transition-all text-center inline-flex items-center gap-1.5 shadow-3xs cursor-pointer"
                    >
                      <ExternalLink size={12} />
                      Abrir em Nova Aba
                    </a>
                  </div>
                );
              })()}

              {/* Printable Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/20" id="print-section">
                
                {/* Cabeçalho da Ficha */}
                <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-slate-900 pb-5 gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-sans text-[10px] font-extrabold uppercase bg-slate-900 text-white px-2 py-0.5 rounded tracking-widest">
                        Ficha de Produção
                      </span>
                      <span className="font-sans text-3xs text-slate-500 font-semibold uppercase tracking-wider">
                        PCP Gráfica
                      </span>
                    </div>
                    <h1 className="font-sans text-lg font-black text-slate-900 mt-1 uppercase tracking-tight">
                      Ordem de Produção / Lote {p.id}
                    </h1>
                  </div>

                  <div className="text-left md:text-right font-mono">
                    <div className="text-xs font-bold text-slate-900 bg-slate-100 border border-slate-200 rounded px-3 py-1 inline-block">
                      *LOTE-{p.id}*
                    </div>
                    <p className="text-4xs text-slate-400 uppercase tracking-wider mt-1">Série de Rastreabilidade Gráfica</p>
                  </div>
                </div>

                {/* Grid de Informações de Cadastro */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white border border-slate-200 rounded-xl">
                  <div>
                    <span className="font-sans text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Cliente</span>
                    <span className="font-sans text-2xs font-bold text-slate-800 block mt-0.5">{cli?.nome || 'N/A'}</span>
                    <span className="font-sans text-[9px] text-slate-500 block">{cli?.contato || 'Contato não fornecido'}</span>
                  </div>
                  <div>
                    <span className="font-sans text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Data de Emissão</span>
                    <span className="font-mono text-2xs font-semibold text-slate-700 block mt-0.5">{formatarDataBR(p.data_criacao)}</span>
                  </div>
                  <div>
                    <span className="font-sans text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Prazo de Entrega</span>
                    <span className="font-mono text-2xs font-bold text-indigo-700 block mt-0.5">{formatarDataBR(p.data_entrega)}</span>
                  </div>
                  <div>
                    <span className="font-sans text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Prioridade & Status</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`px-1.5 py-0.5 rounded font-sans text-[8px] font-extrabold uppercase border ${getPriorityColor(p.prioridade)}`}>
                        {p.prioridade}
                      </span>
                      <span className="px-1.5 py-0.5 rounded font-mono text-[8px] font-extrabold uppercase bg-slate-100 border border-slate-200 text-slate-705">
                        {p.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* HISTÓRICO DE APONTAMENTOS DO PEDIDO (DROPDOWN / COLLAPSIBLE - NO-PRINT) */}
                {(() => {
                  const prodsDoPedIds = prods.map(prod => prod.id);
                  const pointingHistory = apontamentos.filter(apt => prodsDoPedIds.includes(apt.produto_id));
                  return (
                    <div className="no-print bg-indigo-25/50 border border-indigo-150 rounded-xl p-4 space-y-3">
                      <button
                        type="button"
                        onClick={() => setShowAptHist(!showAptHist)}
                        className="w-full flex items-center justify-between text-left focus:outline-none"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-indigo-600 font-mono text-3xs bg-indigo-100 border border-indigo-200 rounded-full px-2 py-0.5 font-bold uppercase">Acompanhamento</span>
                          <div>
                            <h4 className="font-sans font-extrabold text-xs text-indigo-950 uppercase tracking-wide">
                              Acompanhar Histórico de Apontamentos do Pedido (Dropdown)
                            </h4>
                            <p className="text-[10px] text-indigo-700 font-semibold font-mono">
                              {pointingHistory.length} apontamentos registrados no sistema para este pedido
                            </p>
                          </div>
                        </div>
                        <span className="text-indigo-600 bg-white rounded-full p-1 border border-indigo-100 hover:bg-indigo-50 transition-colors">
                          {showAptHist ? (
                            <ArrowUp size={14} className="text-indigo-700" />
                          ) : (
                            <ArrowDown size={14} className="text-indigo-700" />
                          )}
                        </span>
                      </button>

                      {showAptHist && (
                        <div className="border-t border-indigo-150/40 pt-3 space-y-2.5 animate-fadeIn">
                          {pointingHistory.length === 0 ? (
                            <p className="text-[11px] text-slate-500 italic text-center py-2 bg-white rounded border border-indigo-100">
                              Nenhum apontamento de produção ou setup foi efetuado para os itens deste pedido.
                            </p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse bg-white rounded-lg border border-indigo-100 text-[10px]">
                                <thead>
                                  <tr className="bg-indigo-50 text-indigo-900 border-b border-indigo-100 font-mono text-[9px] uppercase tracking-wider font-bold">
                                    <th className="p-2">Item / Lote</th>
                                    <th className="p-2">Máquina</th>
                                    <th className="p-2">Operador</th>
                                    <th className="p-2 text-center">Tipo</th>
                                    <th className="p-2 text-center">Período</th>
                                    <th className="p-2 text-right">Bom (Útil)</th>
                                    <th className="p-2 text-right">Refugo</th>
                                    <th className="p-2">Obs / Justificativa</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-indigo-50 text-slate-700">
                                  {pointingHistory.map(apt => {
                                    const prodItem = prods.find(pr => pr.id === apt.produto_id);
                                    const maq = maquinas.find(m => m.id === apt.maquina_id);
                                    return (
                                      <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-2 font-medium">
                                          {prodItem?.descricao || apt.produto_id}
                                          <span className="block text-[8px] text-slate-400 font-mono font-bold">ID: #{apt.produto_id}</span>
                                        </td>
                                        <td className="p-2 font-mono font-semibold text-slate-800">
                                          {maq?.nome || apt.maquina_id}
                                        </td>
                                        <td className="p-2 font-medium text-slate-600">
                                          {apt.operador_id}
                                        </td>
                                        <td className="p-2 text-center">
                                          <span className={`text-[8px] font-sans px-1.5 py-0.5 rounded-full font-bold uppercase ${
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
                                        </td>
                                        <td className="p-2 text-center font-mono text-[9px] leading-tight text-slate-500">
                                          <div>Início: {new Date(apt.data_inicio).toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}</div>
                                          <div>Fim: {new Date(apt.data_fim).toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}</div>
                                        </td>
                                        <td className="p-2 text-right font-semibold text-slate-900">
                                          {apt.tipo === 'producao' ? `${apt.quantidade_produzida.toLocaleString('pt-BR')} un` : '-'}
                                        </td>
                                        <td className="p-2 text-right text-rose-600 font-medium">
                                          {apt.tipo === 'producao' && apt.quantidade_refugo > 0 ? `-${apt.quantidade_refugo} un` : '-'}
                                        </td>
                                        <td className="p-2 text-[9px] text-slate-500 italic max-w-[150px] break-words">
                                          {apt.justificativa || apt.motivo_parada || '-'}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Lista de Produtos Envoltos no Lote */}
                <div className="space-y-6">
                  <h2 className="font-sans text-2xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                    Especificações Técnicas & Fluxo de Processamento
                  </h2>

                  {prods.map((prod, idxProd) => {
                    const totalFolhasEstimadas = Math.ceil(prod.quantidade * prod.fator_consumo);
                    const matchingModel = produtosModelos.find(m => m.descricao === prod.descricao);
                    const itemCode = matchingModel?.codigo;
                    const matchingInsumo = insumos.find(ins => ins.nome === prod.material || ins.id === prod.material);
                    const materialCode = matchingInsumo?.codigo;

                    return (
                      <div key={prod.id} className="p-4 bg-white border border-slate-200 rounded-xl space-y-4 shadow-4xs">
                        {/* Header do Produto */}
                        <div className="flex justify-between items-center bg-slate-100 border-l-4 border-slate-900 p-3.5 rounded-r-lg shadow-3xs">
                          <span className="font-sans text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                            Item #{idxProd + 1}: {itemCode ? `[${itemCode}] ` : ''}{prod.descricao}
                          </span>
                          <span className="font-mono text-[9px] text-slate-500 font-bold uppercase tracking-wider bg-white border border-slate-200 px-2 py-0.5 rounded shadow-3xs">
                            ID: {prod.id}
                          </span>
                        </div>

                        {/* Detalhes Técnicos do Insumo e Estruturação */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-2xs">
                          <div className="bg-slate-25/50 p-2 rounded border border-slate-100">
                            <span className="font-sans text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Quantidade</span>
                            <span className="font-mono font-bold text-slate-900">{prod.quantidade.toLocaleString('pt-BR')} un</span>
                          </div>
                          <div className="bg-slate-25/50 p-2 rounded border border-slate-100">
                            <span className="font-sans text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Material / Suporte</span>
                            <span className="font-sans font-semibold text-slate-700 block break-words" title={prod.material}>
                              {materialCode ? `[${materialCode}] ` : ''}{prod.material}
                            </span>
                          </div>
                          <div className="bg-slate-25/50 p-2 rounded border border-slate-100">
                            <span className="font-sans text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Dimensoes</span>
                            <span className="font-mono font-semibold text-slate-700">{prod.dimensoes || 'N/A'}</span>
                          </div>
                          <div className="bg-slate-25/50 p-2 rounded border border-slate-100">
                            <span className="font-sans text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Fator de Consumo</span>
                            <span className="font-mono font-semibold text-slate-700">{prod.fator_consumo} folhas/un</span>
                          </div>
                          <div className="bg-slate-25/50 p-2 rounded border border-slate-100">
                            <span className="font-sans text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Papel Estimado</span>
                            <span className="font-mono font-bold text-teal-800">{totalFolhasEstimadas.toLocaleString('pt-BR')} folhas</span>
                          </div>
                        </div>

                        {/* Seção de Insumos da Ficha Técnica se houver múltiplos */}
                        {prod.insumos_ficha && prod.insumos_ficha.length > 0 && (
                          <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-200">
                            <span className="font-sans text-[8px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                              Ficha Técnica do Item ({prod.insumos_ficha.length} Matérias-Primas / Insumos)
                            </span>
                            
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                              {/* List of Insumos */}
                              <div className={`${prod.insumos_ficha[0]?.formato_refilamento ? 'md:col-span-6' : 'md:col-span-12'} space-y-2`}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {prod.insumos_ficha.map((item, fIdx) => (
                                    <div key={fIdx} className="bg-white p-2 rounded border border-slate-150 flex flex-col justify-between shadow-3xs">
                                      <span className="font-sans font-bold text-slate-800 text-3xs truncate" title={item.nome}>
                                        {fIdx + 1}. {item.nome || 'Insumo'}
                                      </span>
                                      <div className="flex justify-between items-center mt-1.5 font-mono text-[9px] text-slate-500">
                                        <span>Rend: {item.rendimento} | Fat: {item.fator_consumo.toFixed(4)}</span>
                                        <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100/50">
                                          Estimado: {Math.ceil(prod.quantidade * item.fator_consumo).toLocaleString('pt-BR')}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Schema on the right side if available */}
                              {prod.insumos_ficha[0]?.formato_refilamento && (() => {
                                const item = prod.insumos_ficha[0];
                                const wOrig = item.largura_original ?? 76;
                                const hOrig = item.altura_original ?? 112;
                                const wRef = item.largura_refilada ?? 56;
                                const hRef = item.altura_refilada ?? 76;
                                const format = item.formato_refilamento ?? 'meia';

                                // Larger bounding box for clear readability in print (340w x 190h)
                                const maxW = 340;
                                const maxH = 190;
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

                                const canvasW = 360;
                                const canvasH = 210;
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
                                  <div className="md:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col items-center shadow-sm">
                                    <div className="flex justify-between items-center w-full text-[10px] font-mono text-slate-300 border-b border-slate-800 pb-1.5 mb-2 uppercase font-bold tracking-wider">
                                      <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                                        Esquema de Refilamento & Corte
                                      </span>
                                      <span className="text-emerald-400 font-extrabold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80">
                                        {formatNames[format] || format}
                                      </span>
                                    </div>

                                    <svg viewBox={`0 0 ${canvasW} ${canvasH}`} className="w-full max-w-[360px] h-auto bg-slate-950 rounded-lg border border-slate-800 shadow-inner my-1">
                                      <defs>
                                        <pattern id={`grid-print-${prod.id}`} width="12" height="12" patternUnits="userSpaceOnUse">
                                          <path d="M 12 0 L 0 0 0 12" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
                                        </pattern>
                                      </defs>
                                      <rect width={canvasW} height={canvasH} fill={`url(#grid-print-${prod.id})`} />

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
                                                y={ry + rh / 2 + 3}
                                                fill="#10b981"
                                                fontSize="10"
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
                                        y={dy + svgHOrig - 5}
                                        fill="#818cf8"
                                        fontSize="9"
                                        fontWeight="bold"
                                        fontFamily="monospace"
                                        textAnchor="middle"
                                      >
                                        Folha Base: {wOrig} x {hOrig} cm
                                      </text>
                                    </svg>

                                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 w-full mt-2 text-[9px] font-sans text-slate-300 border-t border-slate-800 pt-2 text-left">
                                      <div className="flex justify-between items-center bg-slate-950/60 p-1.5 rounded border border-slate-850">
                                        <span className="text-slate-400">Rendimento de Refile:</span>
                                        <span className="font-mono text-indigo-300 font-extrabold text-[10px]">
                                          {finalCols * finalRows} {finalCols * finalRows === 1 ? 'folha' : 'folhas'} ({finalCols}x{finalRows})
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center bg-slate-950/60 p-1.5 rounded border border-slate-850">
                                        <span className="text-slate-400">Aproveitamento Total:</span>
                                        <span className="font-mono text-emerald-400 font-extrabold text-[10px]">
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
                                      <div className="flex justify-between items-center bg-slate-950/60 p-1.5 rounded border border-slate-850">
                                        <span className="text-slate-400">Esquema / Formato:</span>
                                        <span className="font-mono text-amber-300 font-bold">
                                          {formatNames[format] || format}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center bg-slate-950/60 p-1.5 rounded border border-slate-850">
                                        <span className="text-slate-400">Orientação de Corte:</span>
                                        <span className="font-mono text-blue-300 font-bold">
                                          {isRotated ? 'Giro 90° (Rotacionado)' : 'Corte Normal'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Cores, Pantones, Facas e Cola */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-2xs">
                          <div className="bg-slate-25/50 p-2 rounded border border-slate-100">
                            <span className="font-sans text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Cores Impressão</span>
                            <span className="font-sans font-semibold text-slate-700">
                              {prod.cores_quantidade || 0} cores 
                              <span className="text-indigo-600 block text-[9px] font-medium">
                                (F: {prod.cores_frente !== undefined ? prod.cores_frente : (prod.cores_quantidade || 0)} | V: {prod.cores_verso || 0})
                              </span>
                            </span>
                          </div>
                          <div className="bg-slate-25/50 p-2 rounded border border-slate-100">
                            <span className="font-sans text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Pantones</span>
                            <span className="font-sans font-semibold text-slate-700">
                              {prod.pantones ? (Array.isArray(prod.pantones) ? prod.pantones.join(', ') : prod.pantones) : 'Nenhum'}
                            </span>
                          </div>
                          <div className="bg-slate-25/50 p-2 rounded border border-slate-100">
                            <span className="font-sans text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Tipo de Produto</span>
                            <span className="font-sans font-semibold text-slate-700 capitalize">{prod.tipo_produto || 'Embalagem'}</span>
                          </div>
                          <div className="bg-slate-25/50 p-2 rounded border border-slate-100">
                            <span className="font-sans text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Faca (Medida & Contatos)</span>
                            <span className="font-sans font-semibold text-slate-700">
                              {prod.medida_faca || 'N/A'} {prod.contatos_faca ? `(${prod.contatos_faca} contatos)` : ''}
                            </span>
                          </div>
                          <div className="bg-slate-25/50 p-2 rounded border border-slate-100">
                            <span className="font-sans text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Pontos de Cola</span>
                            <span className="font-sans font-semibold text-indigo-700">
                              {(prod.tipo_produto || 'embalagem') === 'embalagem' ? (prod.pontos_cola === 0 ? 'Sem Cola (0)' : `${prod.pontos_cola !== undefined ? prod.pontos_cola : 1} ponto(s)`) : 'Não Aplicável'}
                            </span>
                          </div>
                        </div>

                        {/* Seção de Grade de Artes se for bolacha */}
                        {(() => {
                          const matchingModel = produtosModelos.find(m => m.descricao === prod.descricao);
                          const gradeItens = prod.grade_itens || matchingModel?.grade_itens;
                          if (!gradeItens || gradeItens.length === 0) return null;
                          return (
                            <div className="bg-amber-50/20 p-2.5 rounded-lg border border-amber-200/50">
                              <span className="font-sans text-[8px] font-extrabold text-amber-800 uppercase tracking-wider block mb-1.5">
                                Composição Detalhada da Grade de Artes ({gradeItens.length} Artes / Versões)
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {gradeItens.map((item, gIdx) => (
                                  <div key={gIdx} className="bg-white p-2 rounded border border-amber-100 flex flex-col justify-between shadow-3xs">
                                    <span className="font-sans font-bold text-amber-950 text-3xs truncate" title={item.descricao}>
                                      {gIdx + 1}. {item.codigo ? `[${item.codigo}] ` : ''}{item.descricao || 'Arte'}
                                    </span>
                                    <div className="flex justify-between items-center mt-1.5 font-mono text-[9px] text-amber-700">
                                      <span>Contatos/Poses na faca:</span>
                                      <span className="font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/50">
                                        {item.contatos} {item.contatos === 1 ? 'pose' : 'poses'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Fluxograma Horizontal do Roteiro */}
                        <div className="space-y-1.5">
                          <span className="font-sans text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">
                            Roteiro de Fluxo Industrial
                          </span>
                          <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                            {prod.roteiro.length === 0 ? (
                              <span className="text-3xs text-slate-400 italic font-sans">Nenhuma máquina vinculada ao roteiro</span>
                            ) : (
                              prod.roteiro.map((maqId, stepIdx) => {
                                const maq = maquinas.find(m => m.id === maqId);
                                const isCurrent = stepIdx === prod.maquina_atual_idx;
                                const isCompleted = stepIdx < prod.maquina_atual_idx;
                                const isFuture = stepIdx > prod.maquina_atual_idx;

                                return (
                                  <React.Fragment key={maqId}>
                                    <div className={`p-2 rounded-lg border text-center font-sans ${
                                      isCurrent 
                                        ? 'border-indigo-600 bg-indigo-55/70 ring-2 ring-indigo-500/10 text-indigo-950 font-bold' 
                                        : isCompleted 
                                        ? 'border-emerald-200 bg-emerald-50/30 text-emerald-800 font-medium' 
                                        : 'border-slate-200 bg-white text-slate-500'
                                    }`}>
                                      <div className="text-[7.5px] uppercase font-extrabold tracking-tight text-slate-400">
                                        Etapa {stepIdx + 1}
                                      </div>
                                      <div className="text-2xs font-extrabold mt-0.5">
                                        {maq?.nome || maqId}
                                      </div>
                                      <div className="text-[7px] uppercase font-bold tracking-wider mt-0.5">
                                        {isCurrent ? '▶ Em Processo' : isCompleted ? '✓ Concluído' : '⏳ Fila / Espera'}
                                      </div>
                                    </div>
                                    {stepIdx < prod.roteiro.length - 1 && (
                                      <span className="text-slate-400 text-xs font-bold font-mono">➔</span>
                                    )}
                                  </React.Fragment>
                                );
                              })
                            )}
                          </div>
                        </div>

                        {/* Tabela de Apontamento e Rubrica dos Operadores */}
                        <div className="space-y-1.5 pt-1">
                          <span className="font-sans text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">
                            Registro de Apontamento Manual de Fábrica (Preenchimento do Operador)
                          </span>
                          <table className="w-full border-collapse border border-slate-300 text-[8px] font-sans">
                            <thead>
                              <tr className="bg-slate-100 border-b border-slate-300">
                                <th className="border border-slate-300 px-2 py-1.5 text-left font-bold uppercase w-1/4">Etapa / Processo</th>
                                <th className="border border-slate-300 px-2 py-1.5 text-left font-bold uppercase w-1/6">Operador</th>
                                <th className="border border-slate-300 px-2 py-1.5 text-left font-bold uppercase w-1/6">Início (Data/Hora)</th>
                                <th className="border border-slate-300 px-2 py-1.5 text-left font-bold uppercase w-1/6">Fim (Data/Hora)</th>
                                <th className="border border-slate-300 px-2 py-1.5 text-center font-bold uppercase w-1/12">Qtd Produzida</th>
                                <th className="border border-slate-300 px-2 py-1.5 text-center font-bold uppercase w-1/12">Perdas</th>
                                <th className="border border-slate-300 px-2 py-1.5 text-left font-bold uppercase">Rubrica / Assinatura</th>
                              </tr>
                            </thead>
                            <tbody>
                              {prod.roteiro.map((maqId, stepIdx) => {
                                const maq = maquinas.find(m => m.id === maqId);
                                return (
                                  <tr key={maqId} className="border-b border-slate-300">
                                    <td className="border border-slate-300 px-2 py-3.5 font-bold text-slate-800">
                                      Etapa {stepIdx + 1}: {maq?.nome || maqId} ({maq?.tipo || 'Gráfico'})
                                    </td>
                                    <td className="border border-slate-300 px-2 py-3.5"></td>
                                    <td className="border border-slate-300 px-2 py-3.5"></td>
                                    <td className="border border-slate-300 px-2 py-3.5"></td>
                                    <td className="border border-slate-300 px-2 py-3.5"></td>
                                    <td className="border border-slate-300 px-2 py-3.5"></td>
                                    <td className="border border-slate-300 px-2 py-3.5"></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                      </div>
                    );
                  })}
                </div>

                {/* Notas de Produção e Rodapé de Controle */}
                <div className="pt-4 border-t border-dashed border-slate-300 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="font-sans text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Observações do PCP / Instruções Especiais</span>
                    <div className="h-20 border-b border-slate-200 mt-2"></div>
                    <div className="h-10 mt-1"></div>
                  </div>

                  <div className="flex flex-col justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg font-sans">
                    <div>
                      <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Assinatura de Liberação Técnica</span>
                      <p className="text-4xs text-slate-400 mt-1">A liberação certifica que as especificações do papel cartão e tintas foram aferidas.</p>
                    </div>
                    <div className="flex items-end justify-between pt-6">
                      <div className="w-5/12 border-t border-slate-400 text-center pt-1">
                        <span className="text-[8px] text-slate-500 font-bold uppercase">Resp. PCP (Gráfica)</span>
                      </div>
                      <div className="w-5/12 border-t border-slate-400 text-center pt-1">
                        <span className="text-[8px] text-slate-500 font-bold uppercase">Supervisor de Turno</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer (Screen Only) */}
              <div className="p-4 border-t border-gray-150 bg-gray-50 flex justify-end gap-2.5 no-print">
                <button
                  type="button"
                  onClick={() => setSelectedPedidoParaImprimir(null)}
                  className="rounded-lg border border-gray-200 hover:bg-gray-100 px-4 py-2 font-sans text-xs font-semibold text-gray-700 transition-colors cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-750 px-4 py-2 font-sans text-xs font-semibold text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Printer size={13} />
                  Imprimir Ficha
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
