import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePCP } from '../context/PCPContext';
import { ConfirmationDialog } from './ConfirmationDialog';
import { 
  Calculator, 
  Coins, 
  Percent, 
  TrendingUp, 
  ArrowRight, 
  Settings, 
  Layers, 
  Info, 
  Printer, 
  FileText, 
  Check, 
  RefreshCw,
  HelpCircle,
  AlertTriangle,
  Flame,
  Wrench,
  Gauge,
  Package,
  CheckCircle2,
  FileSpreadsheet,
  Scissors,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Camera,
  Upload,
  X,
  Search,
  Calendar,
  FileImage,
  Copy,
  Edit3,
  LayoutGrid,
  Table,
  Download,
  ChevronDown,
  ChevronUp,
  Share2,
  SlidersHorizontal,
  FolderOpen,
  Eye,
  EyeOff
} from 'lucide-react';
import { ProdutoModelo, Maquina, Insumo, ProdutoInsumoFicha, OrcamentoSalvo, OrcamentoPrecoLote } from '../types';

export interface ExcelColumnDef {
  id: string;
  label: string;
  defaultVisible: boolean;
  required?: boolean;
}

const DEFAULT_EXCEL_COLUMNS: ExcelColumnDef[] = [
  { id: 'det', label: 'Det. (Expansão)', defaultVisible: true },
  { id: 'foto', label: 'Foto do Produto', defaultVisible: true },
  { id: 'descricao', label: 'Descrição do Produto', defaultVisible: true, required: true },
  { id: 'tipo', label: 'Tipo do Produto', defaultVisible: true },
  { id: 'material', label: 'Material Base', defaultVisible: true },
  { id: 'dimensoes', label: 'Dimensões', defaultVisible: true },
  { id: 'medida_papel_facas', label: 'Medida Papel & Facas', defaultVisible: true },
  { id: 'cores_faca', label: 'Cores / Faca', defaultVisible: true },
  { id: 'markup', label: 'Markup (%)', defaultVisible: true },
  { id: 'acerto', label: 'Acerto (Folhas)', defaultVisible: true },
  { id: 'precos', label: 'Tabela de Lotes & Preços', defaultVisible: true },
  { id: 'data', label: 'Data de Criação', defaultVisible: true },
  { id: 'acoes', label: 'Ações', defaultVisible: true, required: true },
];

interface CustomOpcao {
  id: string;
  nome: string;
  tipoProduto: 'bolacha' | 'manual' | 'embalagem';
  contatosFaca: number;
  coresQuantidade: number;
  roteiro: string[];
}

const safeLocalStorageSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Silently ignore storage quota exceptions or restricted mode
  }
};

export function OrcamentosView() {
  const { 
    produtosModelos, 
    maquinas, 
    operadores, 
    custosGerais, 
    taxasPresumido,
    orcamentosSalvos,
    adicionarOrcamentoSalvo,
    excluirOrcamentoSalvo,
    editarOrcamentoSalvo,
    currentUser,
    addNotification
  } = usePCP();

  const isVendedorMode = currentUser?.role === 'vendedor' || 
                         currentUser?.permissoes?.orcamentos === 'vendedor' ||
                         window.location.search.includes('vendedor=true');

  const [descontosMap, setDescontosMap] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('pcp_orcamentos_descontos_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  const getDesconto = (key: string): number => descontosMap[key] ?? 0;
  
  const setDesconto = (key: string, val: number) => {
    const clean = Math.max(0, Math.min(80, isNaN(val) ? 0 : val));
    setDescontosMap(prev => {
      const updated = { ...prev, [key]: clean };
      safeLocalStorageSetItem('pcp_orcamentos_descontos_v1', JSON.stringify(updated));
      return updated;
    });
  };

  const computeDiscountedUnitPrice = (unitPrice: number, discountPercent: number): number => {
    if (!discountPercent || discountPercent <= 0) return unitPrice;
    return Math.max(0, unitPrice * (1 - discountPercent / 100));
  };

  const handleCopyVendedorLink = () => {
    const vendedorUrl = `${window.location.origin}${window.location.pathname}?tab=orcamentos&vendedor=true`;
    navigator.clipboard.writeText(vendedorUrl);
    addNotification('success', 'Link do Portal de Vendedores copiado com sucesso!');
  };

  // --- ESTADOS DO MÓDULO ---
  const [selectedModeloId, setSelectedModeloId] = useState<string>('');
  const [markup, setMarkup] = useState<number>(250); // 250% de markup multiplicador de lucro padrão
  const [acabamentoOperadores, setAcabamentoOperadores] = useState<number>(1);
  const [isPrintMode, setIsPrintMode] = useState<boolean>(false);
  const [showInsumoSettings, setShowInsumoSettings] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'tabela' | 'analise' | 'tabela_cliente' | 'produtos_orcados'>(() => {
    return isVendedorMode ? 'produtos_orcados' : 'tabela';
  });

  useEffect(() => {
    if (isVendedorMode) {
      setActiveTab('produtos_orcados');
    }
  }, [isVendedorMode]);

  // --- ESTADOS DE SALVAMENTO E EDIÇÃO DE ORÇAMENTO ---
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [editingOrcamento, setEditingOrcamento] = useState<OrcamentoSalvo | null>(null);
  const [editingSavedOrcamentoOriginal, setEditingSavedOrcamentoOriginal] = useState<OrcamentoSalvo | null>(null);
  const [printOrcamento, setPrintOrcamento] = useState<OrcamentoSalvo | null>(null);

  // Garante que o body receba classe especial para isolar a impressão perfeitamente
  useEffect(() => {
    if (printOrcamento) {
      document.body.classList.add('print-quote-modal-active');
      return () => {
        document.body.classList.remove('print-quote-modal-active');
      };
    }
  }, [printOrcamento]);
  const [saveOrcamentoNome, setSaveOrcamentoNome] = useState<string>('');
  const [saveOrcamentoCodigo, setSaveOrcamentoCodigo] = useState<string>('');
  const [saveOrcamentoObs, setSaveOrcamentoObs] = useState<string>('');
  const [saveOrcamentoDimensoes, setSaveOrcamentoDimensoes] = useState<string>('');
  const [saveOrcamentoMaterial, setSaveOrcamentoMaterial] = useState<string>('');
  const [saveOrcamentoFotos, setSaveOrcamentoFotos] = useState<string[]>([]);
  const [saveOrcamentoCores, setSaveOrcamentoCores] = useState<number>(4);
  const [saveOrcamentoMedidaPapelFacas, setSaveOrcamentoMedidaPapelFacas] = useState<string>('');
  const [saveOrcamentoTipo, setSaveOrcamentoTipo] = useState<'embalagem' | 'manual' | 'bolacha'>('embalagem');
  const [tempPhotoUrl, setTempPhotoUrl] = useState<string>('');
  const [searchOrcamento, setSearchOrcamento] = useState<string>('');
  const [produtosOrcadosViewMode, setProdutosOrcadosViewMode] = useState<'excel' | 'cards'>('excel');
  const [expandedOrcamentoId, setExpandedOrcamentoId] = useState<string | null>(null);
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'embalagem' | 'manual' | 'bolacha'>('todos');

  // --- CONFIGURAÇÃO DE COLUNAS VISÍVEIS NA TABELA EXCEL ---
  const [visibleExcelColumns, setVisibleExcelColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('pcp_orcamentos_colunas_excel_v3');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing saved columns", e);
      }
    }
    return {
      det: true,
      foto: true,
      descricao: true,
      tipo: true,
      material: true,
      dimensoes: true,
      medida_papel_facas: true,
      cores_faca: true,
      markup: true,
      acerto: true,
      precos: true,
      data: true,
      acoes: true
    };
  });

  const [showColConfigPopover, setShowColConfigPopover] = useState<boolean>(false);

  const isColVisible = (colId: string): boolean => {
    if (isVendedorMode && (colId === 'markup' || colId === 'acerto')) return false;
    return visibleExcelColumns[colId] !== false;
  };

  const toggleColVisible = (colId: string, visible: boolean) => {
    setVisibleExcelColumns(prev => {
      const updated = { ...prev, [colId]: visible };
      safeLocalStorageSetItem('pcp_orcamentos_colunas_excel_v3', JSON.stringify(updated));
      return updated;
    });
  };

  const handleShowAllColumns = () => {
    const all: Record<string, boolean> = {};
    DEFAULT_EXCEL_COLUMNS.forEach(c => { all[c.id] = true; });
    setVisibleExcelColumns(all);
    safeLocalStorageSetItem('pcp_orcamentos_colunas_excel_v3', JSON.stringify(all));
  };

  const handleResetColumns = () => {
    const defaults: Record<string, boolean> = {};
    DEFAULT_EXCEL_COLUMNS.forEach(c => { defaults[c.id] = c.defaultVisible; });
    setVisibleExcelColumns(defaults);
    safeLocalStorageSetItem('pcp_orcamentos_colunas_excel_v3', JSON.stringify(defaults));
  };

  // --- CONTROLE DE CLASSE DE IMPRESSÃO ---
  useEffect(() => {
    if (printOrcamento) {
      document.body.classList.add('print-quote-modal-active');
    } else {
      document.body.classList.remove('print-quote-modal-active');
    }
    return () => {
      document.body.classList.remove('print-quote-modal-active');
    };
  }, [printOrcamento]);

  // --- ESTADO DO DIALOGO DE CONFIRMAÇÃO ---
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

  // --- MULTI-OPÇÕES DO PRODUTO AVULSO ---
  const [customOpcoes, setCustomOpcoes] = useState<CustomOpcao[]>(() => {
    const saved = localStorage.getItem('pcp_orcamentos_custom_opcoes_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: 'opcao-1',
        nome: 'Opção 1',
        tipoProduto: 'embalagem',
        contatosFaca: 10,
        coresQuantidade: 4,
        roteiro: []
      }
    ];
  });
  const [activeOpcaoId, setActiveOpcaoId] = useState<string>(() => {
    return localStorage.getItem('pcp_orcamentos_active_opcao_id_v2') || 'opcao-1';
  });

  // --- ESTADOS DE SIMULAÇÃO DE PRODUTO NÃO CADASTRADO (AVULSO) ---
  const [isCustomProduct, setIsCustomProduct] = useState<boolean>(() => {
    return localStorage.getItem('pcp_orcamentos_is_custom_product') === 'true';
  });
  const [customName, setCustomName] = useState<string>(() => {
    return localStorage.getItem('pcp_orcamentos_custom_name') || 'Sacola de Papel Custom';
  });
  const [customTipoProduto, setCustomTipoProduto] = useState<'bolacha' | 'manual' | 'embalagem'>(() => {
    return (localStorage.getItem('pcp_orcamentos_custom_tipo_produto') as 'bolacha' | 'manual' | 'embalagem') || 'embalagem';
  });
  const [customContatosFaca, setCustomContatosFaca] = useState<number>(() => {
    const v = localStorage.getItem('pcp_orcamentos_custom_contatos_faca');
    return v !== null ? Number(v) : 10;
  });
  const [customCoresQuantidade, setCustomCoresQuantidade] = useState<number>(() => {
    const v = localStorage.getItem('pcp_orcamentos_custom_cores_qtd');
    return v !== null ? Number(v) : 4;
  });
  const [customRoteiro, setCustomRoteiro] = useState<string[]>(() => {
    const saved = localStorage.getItem('pcp_orcamentos_custom_roteiro');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  // --- CALCULADORA DE PAPEL PERSONALIZADA ---
  const [usarCalculadoraPapel, setUsarCalculadoraPapel] = useState<boolean>(() => {
    return localStorage.getItem('pcp_orcamentos_usar_calc_papel') === 'true';
  });
  const [custoKgPapel, setCustoKgPapel] = useState<number>(() => {
    const v = localStorage.getItem('pcp_orcamentos_custo_kg_papel');
    return v !== null ? Number(v) : 12.50;
  });
  const [gramaturaPapel, setGramaturaPapel] = useState<number>(() => {
    const v = localStorage.getItem('pcp_orcamentos_gramatura_papel');
    return v !== null ? Number(v) : 250;
  });
  const [larguraFolha, setLarguraFolha] = useState<number>(() => {
    const v = localStorage.getItem('pcp_orcamentos_largura_folha');
    return v !== null ? Number(v) : 76;
  });
  const [alturaFolha, setAlturaFolha] = useState<number>(() => {
    const v = localStorage.getItem('pcp_orcamentos_altura_folha');
    return v !== null ? Number(v) : 112;
  });
  const [contatosFolha, setContatosFolha] = useState<number>(() => {
    const v = localStorage.getItem('pcp_orcamentos_contatos_folha');
    return v !== null ? Number(v) : 10;
  });

  const [adicionalAcabamentoNome, setAdicionalAcabamentoNome] = useState<string>(() => {
    return localStorage.getItem('pcp_orcamentos_adicional_acabamento_nome') || '';
  });
  const [adicionalAcabamentoValor, setAdicionalAcabamentoValor] = useState<number>(() => {
    const v = localStorage.getItem('pcp_orcamentos_adicional_acabamento_valor');
    return v !== null ? Number(v) : 0;
  });
  const [folhasAcerto, setFolhasAcerto] = useState<number>(() => {
    const v = localStorage.getItem('pcp_orcamentos_folhas_acerto');
    return v !== null ? Number(v) : 50;
  });

  useEffect(() => {
    safeLocalStorageSetItem('pcp_orcamentos_adicional_acabamento_nome', adicionalAcabamentoNome);
  }, [adicionalAcabamentoNome]);
  useEffect(() => {
    safeLocalStorageSetItem('pcp_orcamentos_adicional_acabamento_valor', String(adicionalAcabamentoValor));
  }, [adicionalAcabamentoValor]);
  useEffect(() => {
    safeLocalStorageSetItem('pcp_orcamentos_folhas_acerto', String(folhasAcerto));
  }, [folhasAcerto]);

  useEffect(() => {
    safeLocalStorageSetItem('pcp_orcamentos_is_custom_product', String(isCustomProduct));
  }, [isCustomProduct]);
  useEffect(() => {
    safeLocalStorageSetItem('pcp_orcamentos_custom_name', customName);
  }, [customName]);
  useEffect(() => {
    safeLocalStorageSetItem('pcp_orcamentos_custom_tipo_produto', customTipoProduto);
  }, [customTipoProduto]);
  useEffect(() => {
    safeLocalStorageSetItem('pcp_orcamentos_custom_contatos_faca', String(customContatosFaca));
  }, [customContatosFaca]);
  useEffect(() => {
    safeLocalStorageSetItem('pcp_orcamentos_custom_cores_qtd', String(customCoresQuantidade));
  }, [customCoresQuantidade]);
  useEffect(() => {
    safeLocalStorageSetItem('pcp_orcamentos_custom_roteiro', JSON.stringify(customRoteiro));
  }, [customRoteiro]);

  useEffect(() => {
    safeLocalStorageSetItem('pcp_orcamentos_usar_calc_papel', String(usarCalculadoraPapel));
  }, [usarCalculadoraPapel]);
  useEffect(() => {
    safeLocalStorageSetItem('pcp_orcamentos_custo_kg_papel', String(custoKgPapel));
  }, [custoKgPapel]);
  useEffect(() => {
    safeLocalStorageSetItem('pcp_orcamentos_gramatura_papel', String(gramaturaPapel));
  }, [gramaturaPapel]);
  useEffect(() => {
    safeLocalStorageSetItem('pcp_orcamentos_largura_folha', String(larguraFolha));
  }, [larguraFolha]);
  useEffect(() => {
    safeLocalStorageSetItem('pcp_orcamentos_altura_folha', String(alturaFolha));
  }, [alturaFolha]);
  useEffect(() => {
    safeLocalStorageSetItem('pcp_orcamentos_contatos_folha', String(contatosFolha));
  }, [contatosFolha]);

  // --- SINCRONIZAÇÃO E PERSISTÊNCIA DAS MULTI-OPÇÕES ---
  useEffect(() => {
    safeLocalStorageSetItem('pcp_orcamentos_custom_opcoes_v2', JSON.stringify(customOpcoes));
  }, [customOpcoes]);

  useEffect(() => {
    safeLocalStorageSetItem('pcp_orcamentos_active_opcao_id_v2', activeOpcaoId);
  }, [activeOpcaoId]);

  // Carrega configurações da opção ativa nos inputs de edição ao trocar de aba de opção
  useEffect(() => {
    const activeOp = customOpcoes.find(o => o.id === activeOpcaoId);
    if (activeOp) {
      setCustomTipoProduto(activeOp.tipoProduto);
      setCustomContatosFaca(activeOp.contatosFaca);
      setCustomCoresQuantidade(activeOp.coresQuantidade);
      if (activeOp.roteiro && activeOp.roteiro.length > 0) {
        setCustomRoteiro(activeOp.roteiro);
      }
    }
  }, [activeOpcaoId]);

  // Propaga alterações dos estados individuais de volta para a opção ativa da lista
  useEffect(() => {
    if (!isCustomProduct) return;
    setCustomOpcoes(prev => prev.map(op => {
      if (op.id === activeOpcaoId) {
        return {
          ...op,
          tipoProduto: customTipoProduto,
          contatosFaca: customContatosFaca,
          coresQuantidade: customCoresQuantidade,
          roteiro: customRoteiro
        };
      }
      return op;
    }));
  }, [customTipoProduto, customContatosFaca, customCoresQuantidade, customRoteiro, activeOpcaoId, isCustomProduct]);

  const handleAdicionarOpcao = () => {
    const nextId = `opcao-${Date.now()}`;
    const nextNum = customOpcoes.length + 1;
    const currentActive = customOpcoes.find(o => o.id === activeOpcaoId) || customOpcoes[0];
    
    const novaOp: CustomOpcao = {
      id: nextId,
      nome: `Opção ${nextNum}`,
      tipoProduto: currentActive?.tipoProduto || 'embalagem',
      contatosFaca: currentActive?.contatosFaca || 10,
      coresQuantidade: currentActive?.coresQuantidade || 4,
      roteiro: [...(currentActive?.roteiro || [])]
    };

    setCustomOpcoes(prev => [...prev, novaOp]);
    setActiveOpcaoId(nextId);
  };

  const handleRemoverOpcao = (id: string) => {
    if (customOpcoes.length <= 1) return;
    const remaining = customOpcoes.filter(o => o.id !== id);
    setCustomOpcoes(remaining);
    if (activeOpcaoId === id) {
      setActiveOpcaoId(remaining[0].id);
    }
  };

  const handleUpdateActiveOpcaoNome = (nome: string) => {
    setCustomOpcoes(prev => prev.map(op => {
      if (op.id === activeOpcaoId) {
        return { ...op, nome };
      }
      return op;
    }));
  };

  // Inicializar o roteiro padrão se estiver vazio
  useEffect(() => {
    if (customRoteiro.length === 0 && maquinas.length > 0) {
      const firstIds = maquinas.slice(0, 3).map(m => m.id);
      setCustomRoteiro(firstIds);
    }
  }, [maquinas, customRoteiro]);

  // Selecionar o primeiro modelo de produto automaticamente caso nenhum esteja selecionado
  useEffect(() => {
    if (produtosModelos.length > 0 && !selectedModeloId) {
      setSelectedModeloId(produtosModelos[0].id);
    }
  }, [produtosModelos, selectedModeloId]);

  const selectedModelo = useMemo(() => {
    if (isCustomProduct) {
      return {
        id: 'custom-temp',
        codigo: 'AVULSO',
        descricao: customName || 'Produto Customizado Simulado',
        tipo_produto: customTipoProduto,
        roteiro: customRoteiro,
        material: 'Papel Customizado',
        fator_consumo: 1 / (customContatosFaca || 1),
        contatos_faca: customContatosFaca,
        cores_quantidade: customCoresQuantidade,
        insumos_ficha: [{
          insumo_id: 'custom-paper',
          nome: 'Papel Customizado',
          fator_consumo: 1 / (customContatosFaca || 1),
          rendimento: customContatosFaca || 1
        }]
      };
    }
    return produtosModelos.find(m => m.id === selectedModeloId) || produtosModelos[0];
  }, [isCustomProduct, customName, customTipoProduto, customRoteiro, customContatosFaca, customCoresQuantidade, selectedModeloId, produtosModelos]);

  // --- FUNÇÕES AUXILIARES PARA EDIÇÃO DO ROTEIRO SIMULADO ---
  const handleMoveMachine = useCallback((index: number, direction: 'up' | 'down') => {
    const nextRoteiro = [...customRoteiro];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= nextRoteiro.length) return;
    
    const temp = nextRoteiro[index];
    nextRoteiro[index] = nextRoteiro[targetIdx];
    nextRoteiro[targetIdx] = temp;
    setCustomRoteiro(nextRoteiro);
  }, [customRoteiro]);

  const handleRemoveMachine = useCallback((index: number) => {
    const nextRoteiro = [...customRoteiro];
    nextRoteiro.splice(index, 1);
    setCustomRoteiro(nextRoteiro);
  }, [customRoteiro]);

  const handleAddMachine = useCallback((maqId: string) => {
    if (!maqId) return;
    setCustomRoteiro(prev => [...prev, maqId]);
  }, []);

  // --- DICIONÁRIO PERSISTENTE DE CUSTO DOS INSUMOS (MATÉRIAS-PRIMAS) ---
  const [precosInsumos, setPrecosInsumos] = useState<Record<string, number>>({});

  // Preços padrões de referência
  const defaultPrecos: Record<string, number> = {
    'ins1': 1.45,  // Papel Cartão Duplex 250g
    'ins2': 1.85,  // Papel Cartão Triplex 300g
    'ins3': 38.00, // Tinta Cyan (por kg) -> rendimento trata a proporção
    'ins4': 38.00, // Tinta Magenta
    'ins5': 38.00, // Tinta Yellow
    'ins6': 35.00, // Tinta Black
    'ins7': 12.50, // Cola PVA Henkel
    'ins8': 24.00, // Verniz UV
  };

  // Carregar ou inicializar custos unitários
  useEffect(() => {
    const saved = localStorage.getItem('pcp_orcamentos_precos_insumos');
    if (saved) {
      try {
        setPrecosInsumos(JSON.parse(saved));
      } catch (e) {
        console.error('Erro ao ler preços salvos de insumos', e);
      }
    } else {
      // Gerar iniciais com base nos cadastros do sistema
      const initialMap: Record<string, number> = { ...defaultPrecos };
      setPrecosInsumos(initialMap);
    }
  }, []);

  // Salvar alterações de preços
  const salvarPrecoInsumo = (key: string, valor: number) => {
    const updated = { ...precosInsumos, [key]: valor };
    setPrecosInsumos(updated);
    safeLocalStorageSetItem('pcp_orcamentos_precos_insumos', JSON.stringify(updated));
  };

  // Obter o preço unitário de um insumo com inteligência de fallback
  const getInsumoUnitPrice = useCallback((insNameOrId: string, itemFicha?: ProdutoInsumoFicha): number => {
    if (!insNameOrId) return 1.0;
    
    // 1. Tentar buscar por ID
    if (precosInsumos[insNameOrId] !== undefined) {
      return precosInsumos[insNameOrId];
    }

    // 2. Tentar buscar por Nome se o insNameOrId for id, ou vice-versa
    const nameClean = (itemFicha?.nome || insNameOrId).toLowerCase();
    
    // Encontrar chave parcial ou nome correspondente
    for (const key of Object.keys(precosInsumos)) {
      if (key.toLowerCase() === nameClean) return precosInsumos[key];
    }

    // 3. Fallbacks inteligentes baseados no nome do insumo
    if (nameClean.includes('triplex') || nameClean.includes('duplex') || nameClean.includes('papel') || nameClean.includes('cartão')) {
      return nameClean.includes('triplex') ? 1.85 : 1.45;
    }
    if (nameClean.includes('tinta') || nameClean.includes('cyan') || nameClean.includes('magenta') || nameClean.includes('yellow') || nameClean.includes('black')) {
      return 38.00;
    }
    if (nameClean.includes('cola') || nameClean.includes('pva')) {
      return 12.50;
    }
    if (nameClean.includes('verniz') || nameClean.includes('brilho')) {
      return 24.00;
    }

    return 1.0; // Padrão genérico de R$ 1,00
  }, [precosInsumos]);

  // --- CÁLCULO DE CUSTOS DE SERVIÇO ---
  // Replicando exatamente a lógica de CustosView.tsx para total alinhamento operacional
  const avgOperadorHora = useMemo(() => {
    return operadores.length > 0
      ? operadores.reduce((acc, op) => acc + (op.custo_hora || 0), 0) / operadores.length
      : 22;
  }, [operadores]);

  const totalCustosFixosMensal = useMemo(() => {
    return custosGerais
      .filter(c => c.recorrencia === 'Mensal')
      .reduce((acc, c) => acc + c.valor, 0);
  }, [custosGerais]);

  const maquinasNoRateio = useMemo(() => {
    return maquinas.filter(m => m.participa_rateio !== false);
  }, [maquinas]);

  const custoFixoPorMaquinaMensal = useMemo(() => {
    const numMaquinas = maquinasNoRateio.length;
    return numMaquinas > 0 ? totalCustosFixosMensal / numMaquinas : 0;
  }, [totalCustosFixosMensal, maquinasNoRateio]);

  const getCustoFixoHoraParaMaquina = useCallback((maq: Maquina | undefined) => {
    if (!maq) return 0;
    if (maq.participa_rateio === false) return 0;
    const horas = maq.horas_mensais_custo_fixo || 160;
    return custoFixoPorMaquinaMensal / horas;
  }, [custoFixoPorMaquinaMensal]);

  // --- CÁLCULO GERAL DO ORÇAMENTO PARA MÚLTIPLAS QUANTIDADES ---
  const targetQuantities = [1000, 2000, 3000, 5000, 10000, 20000, 30000];

  // Recalculador dinâmico de orçamentos para modo de edição ou cotações múltiplas
  const recalculateSavedOrcamento = useCallback((orc: OrcamentoSalvo): OrcamentoSalvo => {
    // 1. Recalcular resultados principais
    const updatedResultados = orc.resultados.map(res => {
      const qty = res.quantidade;

      let totalSetup = 0;
      let totalOperacao = 0;

      const roteiro = orc.roteiro || [];
      roteiro.forEach(maqId => {
        const maq = maquinas.find(m => m.id === maqId);
        if (!maq) return;

        let cap = maq.capacidade_hora || 1;
        if (orc.tipo_produto === 'bolacha') {
          cap = maq.capacidade_bolacha || maq.capacidade_hora || 10000;
        } else if (orc.tipo_produto === 'manual') {
          cap = maq.capacidade_manual || maq.capacidade_hora || 2500;
        } else if (orc.tipo_produto === 'embalagem') {
          cap = maq.capacidade_embalagem || maq.capacidade_hora || 5000;
        }

        const isGuilhotina = (maq.nome || '').toLowerCase().includes('guilhotina');
        const isImpressao = maq.tipo === 'Impressão' || (maq.nome || '').toLowerCase().includes('impress');
        const isCorte = maq.tipo === 'Corte' || (maq.nome || '').toLowerCase().includes('corte') || (maq.nome || '').toLowerCase().includes('vinco');

        const factorizationVal = 1 / (orc.contatos_faca || 1);
        
        let capReal = cap;
        let qtdBaseReal = qty;
        
        if (maq.tipo_velocidade === 'folha') {
          const contatos = orc.contatos_faca || 1;
          capReal = cap * contatos;
          qtdBaseReal = qty;
        } else {
          capReal = cap;
          qtdBaseReal = (isGuilhotina || isImpressao || isCorte)
            ? qty * factorizationVal
            : qty;
        }

        const nOperadores = maq.tipo === 'Acabamento' ? acabamentoOperadores : 1;
        const hours = (qtdBaseReal / capReal) / nOperadores;

        const deprM = maq.depreciacao_mensal || (maq.valor_aquisicao ? ((maq.valor_aquisicao / (maq.vida_util_anos || 10)) / 12) : 0);
        const depreciacaoPorHora = deprM / 160;

        const opLinked = maq.operador_id ? operadores.find(o => o.id === maq.operador_id) : undefined;
        const baseOpCustoHora = opLinked ? (opLinked.custo_hora || 0) : avgOperadorHora;
        const opCustoHoraUsado = baseOpCustoHora * nOperadores;

        const setupMinutes = (maq.tempo_setup || 0) + ((maq.setup_cores || 0) * (orc.cores_quantidade || 0));
        const setupHours = setupMinutes / 60;

        const custoFixoPorHoramaq = getCustoFixoHoraParaMaquina(maq);

        const custoSetupRaw = (setupHours * (depreciacaoPorHora + custoFixoPorHoramaq + opCustoHoraUsado)) / 0.5;
        const custoOperacaoRaw = (hours * (depreciacaoPorHora + custoFixoPorHoramaq + opCustoHoraUsado)) / 0.5;

        totalSetup += custoSetupRaw;
        totalOperacao += custoOperacaoRaw;
      });

      const custoServicoTotal = totalSetup + totalOperacao;

      let custoInsumosTotal = 0;
      const listInsumos = orc.insumos_ficha && orc.insumos_ficha.length > 0
        ? orc.insumos_ficha
        : [{
            insumo_id: '',
            nome: orc.material || 'Papel',
            fator_consumo: 1 / (orc.contatos_faca || 1),
            rendimento: orc.contatos_faca || 1
          }];

      listInsumos.forEach((item, itemIdx) => {
        let unitPrice = getInsumoUnitPrice(item.insumo_id || item.nome, item);
        let divisorContatos = contatosFolha || 1;
        let fator = item.fator_consumo || (1 / (orc.contatos_faca || 1));

        const isMainPaper = usarCalculadoraPapel && (
          itemIdx === 0 || 
          item.nome.toLowerCase().includes('papel') || 
          item.nome.toLowerCase().includes('cartão') || 
          item.nome.toLowerCase().includes('duplex') || 
          item.nome.toLowerCase().includes('triplex')
        );

        if (isMainPaper) {
          const pesoFolhaKg = (larguraFolha * alturaFolha * gramaturaPapel) / 10000000;
          unitPrice = pesoFolhaKg * custoKgPapel;
          fator = 1 / divisorContatos;
        }

        const isPaper = isMainPaper || 
          item.nome.toLowerCase().includes('papel') || 
          item.nome.toLowerCase().includes('cartão') || 
          item.nome.toLowerCase().includes('duplex') || 
          item.nome.toLowerCase().includes('triplex') || 
          item.nome.toLowerCase().includes('folha') ||
          (itemIdx === 0 && !item.nome.toLowerCase().includes('tinta') && !item.nome.toLowerCase().includes('cola') && !item.nome.toLowerCase().includes('verniz'));

        const acertoUsado = orc.folhas_acerto !== undefined ? orc.folhas_acerto : folhasAcerto;
        const qtdConsumida = (qty * fator) + (isPaper ? acertoUsado : 0);
        const custoItem = qtdConsumida * unitPrice;
        custoInsumosTotal += custoItem;
      });

      const custoFabricaTotal = custoInsumosTotal + custoServicoTotal;
      const precoVendaTotal = custoFabricaTotal * (orc.markup / 100);
      const precoVendaUnitario = (precoVendaTotal / qty) + (orc.adicional_acabamento_valor || 0);

      return {
        quantidade: qty,
        precoVendaUnitario,
        custoTotal: custoFabricaTotal
      };
    });

    // 2. Recalcular opções listadas se houver
    const updatedOpcoes = orc.opcoes?.map(op => {
      const opResultados = op.resultados.map(res => {
        const qty = res.quantidade;

        let totalSetup = 0;
        let totalOperacao = 0;

        const roteiro = op.roteiro || orc.roteiro || [];
        roteiro.forEach(maqId => {
          const maq = maquinas.find(m => m.id === maqId);
          if (!maq) return;

          let cap = maq.capacidade_hora || 1;
          const tipoProd = op.tipo_produto || orc.tipo_produto || 'embalagem';
          if (tipoProd === 'bolacha') {
            cap = maq.capacidade_bolacha || maq.capacidade_hora || 10000;
          } else if (tipoProd === 'manual') {
            cap = maq.capacidade_manual || maq.capacidade_hora || 2500;
          } else if (tipoProd === 'embalagem') {
            cap = maq.capacidade_embalagem || maq.capacidade_hora || 5000;
          }

          const isGuilhotina = (maq.nome || '').toLowerCase().includes('guilhotina');
          const isImpressao = maq.tipo === 'Impressão' || (maq.nome || '').toLowerCase().includes('impress');
          const isCorte = maq.tipo === 'Corte' || (maq.nome || '').toLowerCase().includes('corte') || (maq.nome || '').toLowerCase().includes('vinco');

          const factorizationVal = 1 / (op.contatos_faca || orc.contatos_faca || 1);
          
          let capReal = cap;
          let qtdBaseReal = qty;
          
          if (maq.tipo_velocidade === 'folha') {
            const contatos = op.contatos_faca || orc.contatos_faca || 1;
            capReal = cap * contatos;
            qtdBaseReal = qty;
          } else {
            capReal = cap;
            qtdBaseReal = (isGuilhotina || isImpressao || isCorte)
              ? qty * factorizationVal
              : qty;
          }

          const nOperadores = maq.tipo === 'Acabamento' ? acabamentoOperadores : 1;
          const hours = (qtdBaseReal / capReal) / nOperadores;

          const deprM = maq.depreciacao_mensal || (maq.valor_aquisicao ? ((maq.valor_aquisicao / (maq.vida_util_anos || 10)) / 12) : 0);
          const depreciacaoPorHora = deprM / 160;

          const opLinked = maq.operador_id ? operadores.find(o => o.id === maq.operador_id) : undefined;
          const baseOpCustoHora = opLinked ? (opLinked.custo_hora || 0) : avgOperadorHora;
          const opCustoHoraUsado = baseOpCustoHora * nOperadores;

          const setupMinutes = (maq.tempo_setup || 0) + ((maq.setup_cores || 0) * (op.cores_quantidade || orc.cores_quantidade || 0));
          const setupHours = setupMinutes / 60;

          const custoFixoPorHoramaq = getCustoFixoHoraParaMaquina(maq);

          const custoSetupRaw = (setupHours * (depreciacaoPorHora + custoFixoPorHoramaq + opCustoHoraUsado)) / 0.5;
          const custoOperacaoRaw = (hours * (depreciacaoPorHora + custoFixoPorHoramaq + opCustoHoraUsado)) / 0.5;

          totalSetup += custoSetupRaw;
          totalOperacao += custoOperacaoRaw;
        });

        const custoServicoTotal = totalSetup + totalOperacao;

        let custoInsumosTotal = 0;
        const listInsumos = orc.insumos_ficha && orc.insumos_ficha.length > 0
          ? orc.insumos_ficha
          : [{
              insumo_id: '',
              nome: orc.material || 'Papel',
              fator_consumo: 1 / (op.contatos_faca || orc.contatos_faca || 1),
              rendimento: op.contatos_faca || orc.contatos_faca || 1
            }];

        listInsumos.forEach((item, itemIdx) => {
          let unitPrice = getInsumoUnitPrice(item.insumo_id || item.nome, item);
          let divisorContatos = contatosFolha || 1;
          let fator = item.fator_consumo || (1 / (op.contatos_faca || orc.contatos_faca || 1));

          const isMainPaper = usarCalculadoraPapel && (
            itemIdx === 0 || 
            item.nome.toLowerCase().includes('papel') || 
            item.nome.toLowerCase().includes('cartão') || 
            item.nome.toLowerCase().includes('duplex') || 
            item.nome.toLowerCase().includes('triplex')
          );

          if (isMainPaper) {
            const pesoFolhaKg = (larguraFolha * alturaFolha * gramaturaPapel) / 10000000;
            unitPrice = pesoFolhaKg * custoKgPapel;
            fator = 1 / divisorContatos;
          }

          const isPaper = isMainPaper || 
            item.nome.toLowerCase().includes('papel') || 
            item.nome.toLowerCase().includes('cartão') || 
            item.nome.toLowerCase().includes('duplex') || 
            item.nome.toLowerCase().includes('triplex') || 
            item.nome.toLowerCase().includes('folha') ||
            (itemIdx === 0 && !item.nome.toLowerCase().includes('tinta') && !item.nome.toLowerCase().includes('cola') && !item.nome.toLowerCase().includes('verniz'));

          const acertoUsado = op.folhas_acerto !== undefined ? op.folhas_acerto : (orc.folhas_acerto !== undefined ? orc.folhas_acerto : folhasAcerto);
          const qtdConsumida = (qty * fator) + (isPaper ? acertoUsado : 0);
          const custoItem = qtdConsumida * unitPrice;
          custoInsumosTotal += custoItem;
        });

        const custoFabricaTotal = custoInsumosTotal + custoServicoTotal;
        const precoVendaTotal = custoFabricaTotal * (orc.markup / 100);
        const precoVendaUnitario = (precoVendaTotal / qty) + (op.adicional_acabamento_valor ?? orc.adicional_acabamento_valor ?? 0);

        return {
          quantidade: qty,
          precoVendaUnitario,
          custoTotal: custoFabricaTotal
        };
      });

      return {
        ...op,
        resultados: opResultados
      };
    });

    return {
      ...orc,
      resultados: updatedResultados,
      opcoes: updatedOpcoes
    };
  }, [maquinas, operadores, avgOperadorHora, acabamentoOperadores, getCustoFixoHoraParaMaquina, getInsumoUnitPrice, contatosFolha, usarCalculadoraPapel, larguraFolha, alturaFolha, gramaturaPapel, custoKgPapel, folhasAcerto]);

  const orcamentoResultados = useMemo(() => {
    if (!selectedModelo) return [];

    // Calcular taxa total de impostos (Lucro Presumido)
    const taxasPct = (taxasPresumido?.pis || 0) + 
                    (taxasPresumido?.cofins || 0) + 
                    (taxasPresumido?.iss || 0) + 
                    (taxasPresumido?.irpj || 0) + 
                    (taxasPresumido?.csll || 0);

    return targetQuantities.map(qty => {
      // 1. CUSTO OPERACIONAL / SERVIÇOS (Roteiro Industrial)
      let totalSetup = 0;
      let totalOperacao = 0;
      let totalDepreciacao = 0;
      let totalMaoDeObra = 0;
      let totalCustoFixo = 0;

      const detalheEtapas = selectedModelo.roteiro.map(maqId => {
        const maq = maquinas.find(m => m.id === maqId);
        if (!maq) {
          return {
            maqId,
            nome: `Máquina Desconhecida (${maqId})`,
            custoTotalEtapa: 0
          };
        }

        let cap = maq.capacidade_hora || 1;
        if (selectedModelo.tipo_produto === 'bolacha') {
          cap = maq.capacidade_bolacha || maq.capacidade_hora || 10000;
        } else if (selectedModelo.tipo_produto === 'manual') {
          cap = maq.capacidade_manual || maq.capacidade_hora || 2500;
        } else if (selectedModelo.tipo_produto === 'embalagem') {
          cap = maq.capacidade_embalagem || maq.capacidade_hora || 5000;
        }

        const isGuilhotina = (maq.nome || '').toLowerCase().includes('guilhotina');
        const isImpressao = maq.tipo === 'Impressão' || (maq.nome || '').toLowerCase().includes('impress');
        const isCorte = maq.tipo === 'Corte' || (maq.nome || '').toLowerCase().includes('corte') || (maq.nome || '').toLowerCase().includes('vinco');

        const factorizationVal = selectedModelo.fator_consumo || 0.05;
        
        let capReal = cap;
        let qtdBaseReal = qty;
        
        if (maq.tipo_velocidade === 'folha') {
          const contatos = selectedModelo.contatos_faca || 1;
          capReal = cap * contatos;
          qtdBaseReal = qty;
        } else {
          capReal = cap;
          qtdBaseReal = (isGuilhotina || isImpressao || isCorte)
            ? qty * factorizationVal
            : qty;
        }

        // Se for acabamento, usar a quantidade de operadores selecionada
        const nOperadores = maq.tipo === 'Acabamento' ? acabamentoOperadores : 1;

        const hours = (qtdBaseReal / capReal) / nOperadores;

        // Depreciação de máquina
        const deprM = maq.depreciacao_mensal || (maq.valor_aquisicao ? ((maq.valor_aquisicao / (maq.vida_util_anos || 10)) / 12) : 0);
        const depreciacaoPorHora = deprM / 160;

        // Mão de obra (Operador)
        const opLinked = maq.operador_id ? operadores.find(o => o.id === maq.operador_id) : undefined;
        const baseOpCustoHora = opLinked ? (opLinked.custo_hora || 0) : avgOperadorHora;
        const opCustoHoraUsado = baseOpCustoHora * nOperadores;

        // Tempo de Setup: base + ( setup cores * cores )
        const setupMinutes = (maq.tempo_setup || 0) + ((maq.setup_cores || 0) * (selectedModelo.cores_quantidade || 0));
        const setupHours = setupMinutes / 60;

        // Custo fixo da fábrica rateado por hora
        const custoFixoPorHoramaq = getCustoFixoHoraParaMaquina(maq);

        // Setup Total Cost (with 50% built-in service margin)
        const custoSetupRaw = (setupHours * (depreciacaoPorHora + custoFixoPorHoramaq + opCustoHoraUsado)) / 0.5;
        
        // Operation Total Cost (with 50% built-in service margin)
        const custoOperacaoRaw = (hours * (depreciacaoPorHora + custoFixoPorHoramaq + opCustoHoraUsado)) / 0.5;

        const custoDepreciacaoRaw = (depreciacaoPorHora * (setupHours + hours)) / 0.5;
        const custoFixoRaw = (custoFixoPorHoramaq * (setupHours + hours)) / 0.5;
        const custoMaoDeObraRaw = (opCustoHoraUsado * (setupHours + hours)) / 0.5;

        totalSetup += custoSetupRaw;
        totalOperacao += custoOperacaoRaw;
        totalDepreciacao += custoDepreciacaoRaw;
        totalMaoDeObra += custoMaoDeObraRaw;
        totalCustoFixo += custoFixoRaw;

        return {
          maqId,
          nome: maq.nome,
          tipo: maq.tipo,
          hours,
          custoTotalEtapa: custoSetupRaw + custoOperacaoRaw
        };
      });

      const custoServicoTotal = totalSetup + totalOperacao;
      const custoServicoUnitario = custoServicoTotal / qty;

      // 2. CUSTO DE INSUMOS / MATÉRIAS-PRIMAS
      const listInsumosFicha = selectedModelo.insumos_ficha && selectedModelo.insumos_ficha.length > 0
        ? selectedModelo.insumos_ficha
        : [{
            insumo_id: '',
            nome: selectedModelo.material || 'Papel Cartão',
            fator_consumo: selectedModelo.fator_consumo || 0.1,
            rendimento: selectedModelo.fator_consumo > 0 ? 1 / selectedModelo.fator_consumo : 10
          }];

      let custoInsumosTotal = 0;

      const detalheInsumos = listInsumosFicha.map((item, itemIdx) => {
        let unitPrice = getInsumoUnitPrice(item.insumo_id || item.nome, item);
        let divisorContatos = contatosFolha || 1;
        let fator = item.fator_consumo;

        const isMainPaper = usarCalculadoraPapel && (
          itemIdx === 0 || 
          item.nome.toLowerCase().includes('papel') || 
          item.nome.toLowerCase().includes('cartão') || 
          item.nome.toLowerCase().includes('duplex') || 
          item.nome.toLowerCase().includes('triplex')
        );

        if (isMainPaper) {
          const pesoFolhaKg = (larguraFolha * alturaFolha * gramaturaPapel) / 10000000;
          unitPrice = pesoFolhaKg * custoKgPapel;
          fator = 1 / divisorContatos;
        }

        const isPaper = isMainPaper || 
          item.nome.toLowerCase().includes('papel') || 
          item.nome.toLowerCase().includes('cartão') || 
          item.nome.toLowerCase().includes('duplex') || 
          item.nome.toLowerCase().includes('triplex') || 
          item.nome.toLowerCase().includes('folha') ||
          (itemIdx === 0 && !item.nome.toLowerCase().includes('tinta') && !item.nome.toLowerCase().includes('cola') && !item.nome.toLowerCase().includes('verniz'));

        // Considere a quantidade de folhas para acerto no orçamento de produtos acabados
        const qtdConsumida = (qty * fator) + (isPaper ? folhasAcerto : 0);
        const custoItem = qtdConsumida * unitPrice;
        custoInsumosTotal += custoItem;

        return {
          nome: isMainPaper ? `Papel Customizado (${gramaturaPapel}g - ${larguraFolha}x${alturaFolha}cm)` : item.nome,
          fator,
          qtdConsumida,
          unitPrice,
          custoItem,
          isCustomPaper: isMainPaper
        };
      });

      const custoInsumosUnitario = custoInsumosTotal / qty;

      // 3. CUSTO DE FÁBRICA INTEGRADO (Insumos + Serviços)
      const custoFabricaTotal = custoInsumosTotal + custoServicoTotal;
      const custoFabricaUnitario = custoFabricaTotal / qty;

      // 4. PREÇO DE VENDA BASEADO EM MULTIPLICADOR DE MARKUP DIRETO (sem taxas ou margens embutidas no custo)
      const precoVendaTotalSemAcabamento = custoFabricaTotal * (markup / 100);
      const precoVendaUnitario = (precoVendaTotalSemAcabamento / qty) + (adicionalAcabamentoValor || 0);
      const precoVendaTotal = precoVendaUnitario * qty;

      // Impostos e margem de lucro calculados para fins informativos simples
      const impostosTotal = 0; // Removido dos custos/margens conforme solicitado
      const margemLucroTotal = precoVendaTotal - custoFabricaTotal;

      return {
        qty,
        custoServicoTotal,
        custoServicoUnitario,
        custoInsumosTotal,
        custoInsumosUnitario,
        custoFabricaTotal,
        custoFabricaUnitario,
        precoVendaTotal,
        precoVendaUnitario,
        impostosTotal,
        impostosUnitario: impostosTotal / qty,
        margemLucroTotal,
        margemLucroUnitario: margemLucroTotal / qty,
        detalheInsumos,
        detalheEtapas,
        taxasPct,
        totalSetup,
        totalOperacao,
        setupDilutedUnit: totalSetup / qty,
        runDilutedUnit: totalOperacao / qty
      };
    });
  }, [selectedModelo, markup, acabamentoOperadores, maquinas, operadores, custosGerais, taxasPresumido, getInsumoUnitPrice, getCustoFixoHoraParaMaquina, avgOperadorHora, usarCalculadoraPapel, custoKgPapel, gramaturaPapel, larguraFolha, alturaFolha, contatosFolha, adicionalAcabamentoValor, folhasAcerto]);

  // --- CÁLCULO DAS MÚLTIPLAS OPÇÕES DO PRODUTO AVULSO ---
  const orcamentoOpcoesResultados = useMemo(() => {
    if (!isCustomProduct) return [];
    
    return customOpcoes.map(op => {
      const resultados = targetQuantities.map(qty => {
        let totalSetup = 0;
        let totalOperacao = 0;

        const roteiro = op.roteiro || [];
        roteiro.forEach(maqId => {
          const maq = maquinas.find(m => m.id === maqId);
          if (!maq) return;

          let cap = maq.capacidade_hora || 1;
          if (op.tipoProduto === 'bolacha') {
            cap = maq.capacidade_bolacha || maq.capacidade_hora || 10000;
          } else if (op.tipoProduto === 'manual') {
            cap = maq.capacidade_manual || maq.capacidade_hora || 2500;
          } else if (op.tipoProduto === 'embalagem') {
            cap = maq.capacidade_embalagem || maq.capacidade_hora || 5000;
          }

          const isGuilhotina = (maq.nome || '').toLowerCase().includes('guilhotina');
          const isImpressao = maq.tipo === 'Impressão' || (maq.nome || '').toLowerCase().includes('impress');
          const isCorte = maq.tipo === 'Corte' || (maq.nome || '').toLowerCase().includes('corte') || (maq.nome || '').toLowerCase().includes('vinco');

          const factorizationVal = 1 / (op.contatosFaca || 1);
          
          let capReal = cap;
          let qtdBaseReal = qty;
          
          if (maq.tipo_velocidade === 'folha') {
            const contatos = op.contatosFaca || 1;
            capReal = cap * contatos;
            qtdBaseReal = qty;
          } else {
            capReal = cap;
            qtdBaseReal = (isGuilhotina || isImpressao || isCorte)
              ? qty * factorizationVal
              : qty;
          }

          const nOperadores = maq.tipo === 'Acabamento' ? acabamentoOperadores : 1;
          const hours = (qtdBaseReal / capReal) / nOperadores;

          const deprM = maq.depreciacao_mensal || (maq.valor_aquisicao ? ((maq.valor_aquisicao / (maq.vida_util_anos || 10)) / 12) : 0);
          const depreciacaoPorHora = deprM / 160;

          const opLinked = maq.operador_id ? operadores.find(o => o.id === maq.operador_id) : undefined;
          const baseOpCustoHora = opLinked ? (opLinked.custo_hora || 0) : avgOperadorHora;
          const opCustoHoraUsado = baseOpCustoHora * nOperadores;

          const setupMinutes = (maq.tempo_setup || 0) + ((maq.setup_cores || 0) * (op.coresQuantidade || 0));
          const setupHours = setupMinutes / 60;

          const custoFixoPorHoramaq = getCustoFixoHoraParaMaquina(maq);

          // Custos com 50% de margem embutida
          const custoSetupRaw = (setupHours * (depreciacaoPorHora + custoFixoPorHoramaq + opCustoHoraUsado)) / 0.5;
          const custoOperacaoRaw = (hours * (depreciacaoPorHora + custoFixoPorHoramaq + opCustoHoraUsado)) / 0.5;

          totalSetup += custoSetupRaw;
          totalOperacao += custoOperacaoRaw;
        });

        const custoServicoTotal = totalSetup + totalOperacao;

        // Insumos
        let custoInsumosTotal = 0;
        let divisorContatos = contatosFolha || 1;
        let factor = 1 / (op.contatosFaca || 1);

        let unitPrice = 0;
        const isMainPaper = usarCalculadoraPapel;
        if (isMainPaper) {
          const pesoFolhaKg = (larguraFolha * alturaFolha * gramaturaPapel) / 10000000;
          unitPrice = pesoFolhaKg * custoKgPapel;
          factor = 1 / divisorContatos;
        } else {
          unitPrice = custosGerais?.find(c => (c.descricao || '').toLowerCase().includes('papel'))?.valor || custosGerais?.[0]?.valor || 1.5;
        }

        const qtdConsumida = (qty * factor) + folhasAcerto; // folhasAcerto de acerto
        const custoItem = qtdConsumida * unitPrice;
        custoInsumosTotal = custoItem;

        const custoFabricaTotal = custoInsumosTotal + custoServicoTotal;
        const precoVendaTotalSemAcabamento = custoFabricaTotal * (markup / 100);
        const precoVendaUnitario = (precoVendaTotalSemAcabamento / qty) + (adicionalAcabamentoValor || 0);
        const precoVendaTotal = precoVendaUnitario * qty;

        return {
          qty,
          precoVendaUnitario,
          precoVendaTotal
        };
      });

      return {
        opcaoId: op.id,
        resultados
      };
    });
  }, [
    isCustomProduct,
    customOpcoes,
    maquinas,
    operadores,
    custosGerais,
    markup,
    acabamentoOperadores,
    avgOperadorHora,
    getCustoFixoHoraParaMaquina,
    usarCalculadoraPapel,
    custoKgPapel,
    gramaturaPapel,
    larguraFolha,
    alturaFolha,
    contatosFolha,
    adicionalAcabamentoValor,
    folhasAcerto
  ]);

  // Exportação simples da tabela para CSV
  const handleExportCSV = () => {
    if (!selectedModelo) return;
    
    let csv = `Orcamento Homero Embalagens - Modelo: ${selectedModelo.codigo || ''} ${selectedModelo.descricao}\n`;
    csv += `Markup Praticado: ${markup}%\n`;
    csv += `Data de Emissao: ${new Date().toLocaleDateString('pt-BR')}\n\n`;
    csv += `Quantidade;Custo Insumos (Total);Custo Insumos (Unit);Custo Servico (Total);Custo Servico (Unit);Custo Total Fabrica;Preco Total;Preco Unitario;Margem Lucro;Impostos\n`;
    
    orcamentoResultados.forEach(r => {
      csv += `${r.qty};R$ ${r.custoInsumosTotal.toFixed(2)};R$ ${r.custoInsumosUnitario.toFixed(4)};R$ ${r.custoServicoTotal.toFixed(2)};R$ ${r.custoServicoUnitario.toFixed(4)};R$ ${r.custoFabricaTotal.toFixed(2)};R$ ${r.precoVendaTotal.toFixed(2)};R$ ${r.precoVendaUnitario.toFixed(4)};R$ ${r.margemLucroTotal.toFixed(2)};R$ ${r.impostosTotal.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Orcamento_${selectedModelo.codigo || 'Modelo'}_Precos.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Exportação limpa da tabela de preços para cliente
  const handleExportClientCSV = () => {
    const itemName = isCustomProduct ? customName : (selectedModelo?.descricao || 'Produto');
    let csv = `TABELA DE PRECOS - ${itemName.toUpperCase()}\n`;
    csv += `Data de Emissao: ${new Date().toLocaleDateString('pt-BR')}\n\n`;
    
    if (isCustomProduct) {
      csv += `Quantidade;` + customOpcoes.map(op => `${op.nome} (Unitario)`).join(';') + '\n';
      
      targetQuantities.forEach((qty, qIdx) => {
        const rowVals = [qty.toLocaleString('pt-BR') + ' un'];
        customOpcoes.forEach(op => {
          const opRes = orcamentoOpcoesResultados.find(r => r.opcaoId === op.id);
          const price = opRes?.resultados?.[qIdx]?.precoVendaUnitario || 0;
          rowVals.push(`R$ ${price.toFixed(4)}`);
        });
        csv += rowVals.join(';') + '\n';
      });
    } else {
      csv += `Quantidade;Preco Unitario\n`;
      orcamentoResultados.forEach(r => {
        csv += `${r.qty} un;R$ ${r.precoVendaUnitario.toFixed(4)}\n`;
      });
    }
    
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `tabela_precos_${itemName.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Exportar lista geral de orçamentos salvos para CSV / Excel
  const handleExportAllOrcamentosCSV = (items: OrcamentoSalvo[]) => {
    if (!items || items.length === 0) {
      alert('Nenhum orçamento disponível para exportação.');
      return;
    }

    let csv = `RELATORIO GERAL DE ORCAMENTOS SALVOS - HOMERO EMBALAGENS\n`;
    csv += `Data de Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}\n`;
    csv += `Total de Registros: ${items.length}\n\n`;

    if (isVendedorMode) {
      csv += `Codigo;Descricao;Tipo;Material;Dimensoes;Medida Papel e Facas;Cores;Contatos Faca;Desconto Aplicado (%);Data Criacao;Lotes e Precos Unitarios (R$);Observacoes\n`;
    } else {
      csv += `Codigo;Descricao;Tipo;Material;Dimensoes;Medida Papel e Facas;Cores;Contatos Faca;Markup (%);Folhas Acerto;Data Criacao;Lotes e Precos Unitarios (R$);Observacoes\n`;
    }

    items.forEach(orc => {
      const discount = getDesconto(orc.id);
      if (orc.opcoes && orc.opcoes.length > 0) {
        orc.opcoes.forEach((op) => {
          const lotesText = (op.resultados || [])
            .map(r => {
              const finalPrice = computeDiscountedUnitPrice(r.precoVendaUnitario, discount);
              return `${r.quantidade}un: R$ ${finalPrice.toFixed(4)}${discount > 0 ? ` (-${discount}%)` : ''}`;
            })
            .join(' | ');

          const descCompleta = `${orc.descricao} - ${op.nome}`;

          const row = isVendedorMode ? [
            orc.codigo || 'AVULSO',
            `"${descCompleta.replace(/"/g, '""')}"`,
            op.tipo_produto || orc.tipo_produto || 'embalagem',
            `"${(orc.material || '').replace(/"/g, '""')}"`,
            `"${(orc.dimensoes || '').replace(/"/g, '""')}"`,
            `"${(orc.medida_papel_facas || '').replace(/"/g, '""')}"`,
            `${op.cores_quantidade || 0} cores`,
            `${op.contatos_faca || 1} contatos`,
            `${discount}%`,
            new Date(orc.data_criacao).toLocaleDateString('pt-BR'),
            `"${lotesText}"`,
            `"${(orc.observacoes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
          ] : [
            orc.codigo || 'AVULSO',
            `"${descCompleta.replace(/"/g, '""')}"`,
            op.tipo_produto || orc.tipo_produto || 'embalagem',
            `"${(orc.material || '').replace(/"/g, '""')}"`,
            `"${(orc.dimensoes || '').replace(/"/g, '""')}"`,
            `"${(orc.medida_papel_facas || '').replace(/"/g, '""')}"`,
            `${op.cores_quantidade || 0} cores`,
            `${op.contatos_faca || 1} contatos`,
            `${orc.markup}%`,
            `${orc.folhas_acerto ?? 50} fls`,
            new Date(orc.data_criacao).toLocaleDateString('pt-BR'),
            `"${lotesText}"`,
            `"${(orc.observacoes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
          ];

          csv += row.join(';') + '\n';
        });
      } else {
        const lotesText = (orc.resultados || [])
          .map(r => {
            const finalPrice = computeDiscountedUnitPrice(r.precoVendaUnitario, discount);
            return `${r.quantidade}un: R$ ${finalPrice.toFixed(4)}${discount > 0 ? ` (-${discount}%)` : ''}`;
          })
          .join(' | ');

        const row = isVendedorMode ? [
          orc.codigo || 'AVULSO',
          `"${(orc.descricao || '').replace(/"/g, '""')}"`,
          orc.tipo_produto || 'embalagem',
          `"${(orc.material || '').replace(/"/g, '""')}"`,
          `"${(orc.dimensoes || '').replace(/"/g, '""')}"`,
          `"${(orc.medida_papel_facas || '').replace(/"/g, '""')}"`,
          `${orc.cores_quantidade || 0} cores`,
          `${orc.contatos_faca || 1} contatos`,
          `${discount}%`,
          new Date(orc.data_criacao).toLocaleDateString('pt-BR'),
          `"${lotesText}"`,
          `"${(orc.observacoes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
        ] : [
          orc.codigo || 'AVULSO',
          `"${(orc.descricao || '').replace(/"/g, '""')}"`,
          orc.tipo_produto || 'embalagem',
          `"${(orc.material || '').replace(/"/g, '""')}"`,
          `"${(orc.dimensoes || '').replace(/"/g, '""')}"`,
          `"${(orc.medida_papel_facas || '').replace(/"/g, '""')}"`,
          `${orc.cores_quantidade || 0} cores`,
          `${orc.contatos_faca || 1} contatos`,
          `${orc.markup}%`,
          `${orc.folhas_acerto ?? 50} fls`,
          new Date(orc.data_criacao).toLocaleDateString('pt-BR'),
          `"${lotesText}"`,
          `"${(orc.observacoes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
        ];

        csv += row.join(';') + '\n';
      }
    });

    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Tabela_Geral_Orcamentos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Imprimir relatório
  const handlePrint = () => {
    setActiveTab('tabela_cliente');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Salvar orçamento no banco de dados
  const handleSaveOrcamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveOrcamentoNome.trim()) return;

    let resultadosSalvar: OrcamentoPrecoLote[] = [];
    let opcoesSalvar = undefined;

    if (isCustomProduct) {
      const activeOpRes = orcamentoOpcoesResultados.find(r => r.opcaoId === activeOpcaoId) || orcamentoOpcoesResultados[0];
      if (activeOpRes) {
        resultadosSalvar = activeOpRes.resultados.map(r => ({
          quantidade: r.qty,
          precoVendaUnitario: r.precoVendaUnitario,
          custoTotal: r.precoVendaTotal / (markup / 100)
        }));
      }

      if (customOpcoes.length > 0) {
        opcoesSalvar = customOpcoes.map(op => {
          const opRes = orcamentoOpcoesResultados.find(r => r.opcaoId === op.id);
          return {
            id: op.id,
            nome: op.nome,
            tipo_produto: op.tipoProduto,
            cores_quantidade: op.coresQuantidade,
            contatos_faca: op.contatosFaca,
            roteiro: op.roteiro || [],
            resultados: opRes ? opRes.resultados.map(r => ({
              quantidade: r.qty,
              precoVendaUnitario: r.precoVendaUnitario,
              custoTotal: r.precoVendaTotal / (markup / 100)
            })) : []
          };
        });
      }
    } else {
      resultadosSalvar = orcamentoResultados.map(r => ({
        quantidade: r.qty,
        precoVendaUnitario: r.precoVendaUnitario,
        custoTotal: r.custoFabricaTotal
      }));
    }

    const payload = {
      descricao: saveOrcamentoNome,
      codigo: saveOrcamentoCodigo || 'AVULSO',
      dimensoes: saveOrcamentoDimensoes || 'Custom',
      material: saveOrcamentoMaterial || 'Papel Customizado',
      cores_quantidade: isCustomProduct ? saveOrcamentoCores : (selectedModelo?.cores_quantidade || 4),
      contatos_faca: isCustomProduct ? customContatosFaca : (selectedModelo?.contatos_faca || 10),
      medida_papel_facas: saveOrcamentoMedidaPapelFacas.trim() || undefined,
      tipo_produto: isCustomProduct ? customTipoProduto : (selectedModelo?.tipo_produto || 'embalagem'),
      markup: markup,
      observacoes: saveOrcamentoObs,
      fotos: saveOrcamentoFotos,
      resultados: resultadosSalvar,
      roteiro: isCustomProduct ? customRoteiro : (selectedModelo?.roteiro || []),
      insumos_ficha: isCustomProduct ? undefined : (selectedModelo?.insumos_ficha || []),
      opcoes: opcoesSalvar,
      adicional_acabamento_nome: adicionalAcabamentoNome || undefined,
      adicional_acabamento_valor: adicionalAcabamentoValor || undefined,
      folhas_acerto: folhasAcerto
    };

    await adicionarOrcamentoSalvo(payload);
    setShowSaveModal(false);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        alert("A imagem excede o limite de 1.5 MB para armazenamento direto no banco. Por favor, selecione uma imagem menor.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          callback(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPhotoToOrcamento = async (orc: OrcamentoSalvo, photoDataUrlOrUrl: string) => {
    if (!photoDataUrlOrUrl) return;
    const updatedPhotos = [...(orc.fotos || []), photoDataUrlOrUrl];
    const updated: OrcamentoSalvo = {
      ...orc,
      fotos: updatedPhotos
    };
    await editarOrcamentoSalvo(updated);
  };

  const handleRemovePhotoFromOrcamento = async (orc: OrcamentoSalvo, indexToRemove: number) => {
    const updatedPhotos = (orc.fotos || []).filter((_, i) => i !== indexToRemove);
    const updated: OrcamentoSalvo = {
      ...orc,
      fotos: updatedPhotos
    };
    await editarOrcamentoSalvo(updated);
  };

  const handleCarregarOrcamentoParaEdicaoCompleta = (orc: OrcamentoSalvo) => {
    setEditingSavedOrcamentoOriginal(orc);
    setIsCustomProduct(true);
    setCustomName(orc.descricao);
    setSaveOrcamentoNome(orc.descricao);
    setSaveOrcamentoCodigo(orc.codigo || 'AVULSO');
    setSaveOrcamentoDimensoes(orc.dimensoes || '');
    setSaveOrcamentoMaterial(orc.material || '');
    setSaveOrcamentoObs(orc.observacoes || '');
    setSaveOrcamentoMedidaPapelFacas(orc.medida_papel_facas || '');
    setSaveOrcamentoFotos(orc.fotos || []);
    setCustomTipoProduto(orc.tipo_produto || 'embalagem');
    setCustomContatosFaca(orc.contatos_faca || 10);
    setCustomCoresQuantidade(orc.cores_quantidade || 4);
    setMarkup(orc.markup || 250);
    setFolhasAcerto(orc.folhas_acerto !== undefined ? orc.folhas_acerto : 50);
    setAdicionalAcabamentoNome(orc.adicional_acabamento_nome || '');
    setAdicionalAcabamentoValor(orc.adicional_acabamento_valor || 0);

    if (orc.roteiro && orc.roteiro.length > 0) {
      setCustomRoteiro(orc.roteiro);
    } else if (maquinas.length > 0) {
      setCustomRoteiro(maquinas.slice(0, 3).map(m => m.id));
    }

    if (orc.opcoes && orc.opcoes.length > 0) {
      const loadedOps: CustomOpcao[] = orc.opcoes.map(op => ({
        id: op.id || `opcao-${Date.now()}-${Math.random()}`,
        nome: op.nome,
        tipoProduto: op.tipo_produto || 'embalagem',
        contatosFaca: op.contatos_faca || 10,
        coresQuantidade: op.cores_quantidade || 4,
        roteiro: op.roteiro && op.roteiro.length > 0 ? op.roteiro : (orc.roteiro || [])
      }));
      setCustomOpcoes(loadedOps);
      setActiveOpcaoId(loadedOps[0].id);
    } else {
      setCustomOpcoes([
        {
          id: 'opcao-1',
          nome: 'Opção Padrão',
          tipoProduto: orc.tipo_produto || 'embalagem',
          contatosFaca: orc.contatos_faca || 10,
          coresQuantidade: opCores(orc),
          roteiro: orc.roteiro && orc.roteiro.length > 0 ? orc.roteiro : (maquinas.slice(0, 3).map(m => m.id))
        }
      ]);
      setActiveOpcaoId('opcao-1');
    }

    setActiveTab('tabela');
    addNotification('info', `Orçamento "${orc.descricao}" reaberto no simulador completo. Altere o fluxo, preços de insumos, cores ou faca e clique em "Salvar Alterações".`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  function opCores(orc: OrcamentoSalvo) {
    return orc.cores_quantidade || 4;
  }

  const handleCancelarEdicaoCompleta = () => {
    setEditingSavedOrcamentoOriginal(null);
    addNotification('info', 'Edição completa cancelada.');
  };

  const handleSalvarAtualizacaoOrcamento = async () => {
    if (!editingSavedOrcamentoOriginal) return;

    let resultadosSalvar: OrcamentoPrecoLote[] = [];
    let opcoesSalvar = undefined;

    if (isCustomProduct) {
      const activeOpRes = orcamentoOpcoesResultados.find(r => r.opcaoId === activeOpcaoId) || orcamentoOpcoesResultados[0];
      if (activeOpRes) {
        resultadosSalvar = activeOpRes.resultados.map(r => ({
          quantidade: r.qty,
          precoVendaUnitario: r.precoVendaUnitario,
          custoTotal: r.precoVendaTotal / (markup / 100)
        }));
      }

      if (customOpcoes.length > 0) {
        opcoesSalvar = customOpcoes.map(op => {
          const opRes = orcamentoOpcoesResultados.find(r => r.opcaoId === op.id);
          return {
            id: op.id,
            nome: op.nome,
            tipo_produto: op.tipoProduto,
            cores_quantidade: op.coresQuantidade,
            contatos_faca: op.contatosFaca,
            roteiro: op.roteiro || [],
            resultados: opRes ? opRes.resultados.map(r => ({
              quantidade: r.qty,
              precoVendaUnitario: r.precoVendaUnitario,
              custoTotal: r.precoVendaTotal / (markup / 100)
            })) : []
          };
        });
      }
    } else {
      resultadosSalvar = orcamentoResultados.map(r => ({
        quantidade: r.qty,
        precoVendaUnitario: r.precoVendaUnitario,
        custoTotal: r.custoFabricaTotal
      }));
    }

    const updated: OrcamentoSalvo = {
      ...editingSavedOrcamentoOriginal,
      descricao: customName || saveOrcamentoNome || editingSavedOrcamentoOriginal.descricao,
      codigo: saveOrcamentoCodigo || editingSavedOrcamentoOriginal.codigo || 'AVULSO',
      dimensoes: saveOrcamentoDimensoes || editingSavedOrcamentoOriginal.dimensoes || 'Custom',
      material: saveOrcamentoMaterial || editingSavedOrcamentoOriginal.material || 'Papel Customizado',
      cores_quantidade: isCustomProduct ? customCoresQuantidade : (selectedModelo?.cores_quantidade || 4),
      contatos_faca: isCustomProduct ? customContatosFaca : (selectedModelo?.contatos_faca || 10),
      medida_papel_facas: saveOrcamentoMedidaPapelFacas.trim() || editingSavedOrcamentoOriginal.medida_papel_facas,
      tipo_produto: isCustomProduct ? customTipoProduto : (selectedModelo?.tipo_produto || 'embalagem'),
      markup: markup,
      observacoes: saveOrcamentoObs || editingSavedOrcamentoOriginal.observacoes,
      fotos: saveOrcamentoFotos.length > 0 ? saveOrcamentoFotos : (editingSavedOrcamentoOriginal.fotos || []),
      resultados: resultadosSalvar,
      roteiro: isCustomProduct ? customRoteiro : (selectedModelo?.roteiro || []),
      insumos_ficha: isCustomProduct ? undefined : (selectedModelo?.insumos_ficha || []),
      opcoes: opcoesSalvar,
      adicional_acabamento_nome: adicionalAcabamentoNome || undefined,
      adicional_acabamento_valor: adicionalAcabamentoValor || undefined,
      folhas_acerto: folhasAcerto
    };

    await editarOrcamentoSalvo(updated);
    setEditingSavedOrcamentoOriginal(null);
    addNotification('success', `Orçamento "${updated.descricao}" atualizado com sucesso com todos os novos cálculos e fluxo!`);
    setActiveTab('produtos_orcados');
  };

  if (produtosModelos.length === 0 && !isCustomProduct) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs max-w-xl mx-auto space-y-4">
        <Calculator className="mx-auto h-12 w-12 text-slate-400" />
        <h3 className="text-sm font-extrabold text-slate-900">Nenhum modelo cadastrado</h3>
        <p className="text-xs text-slate-500 leading-normal">
          Você não possui modelos de produtos cadastrados em "Cadastros da Fábrica" para selecionar.
          No entanto, você pode simular um produto novo avulso sem cadastro agora mesmo!
        </p>
        <button
          onClick={() => setIsCustomProduct(true)}
          className="mx-auto flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold shadow-3xs cursor-pointer transition-all"
        >
          <Scissors size={14} />
          Simular Produto Novo (Avulso)
        </button>
      </div>
    );
  }

  if (!selectedModelo) return null;

  // Lista única de matérias-primas requisitadas pelo modelo atual para exibir e editar preços
  const insumosDoModeloAtual = selectedModelo.insumos_ficha && selectedModelo.insumos_ficha.length > 0
    ? selectedModelo.insumos_ficha
    : [{ insumo_id: '', nome: selectedModelo.material, fator_consumo: selectedModelo.fator_consumo }];

  return (
    <div className="space-y-6">
      {/* HEADER DE COMANDO */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between no-print">
        <div>
          <span className="font-mono text-4xs font-bold uppercase tracking-widest text-slate-400 leading-none block">Módulo Comercial de PCP</span>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            Orçamento de Produtos Acabados
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium leading-normal">
            Considere custos reais de matérias-primas e custos operacionais de maquinários para formar sua tabela de preços recomendados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowInsumoSettings(!showInsumoSettings)}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 font-sans text-xs font-bold shadow-3xs transition-all cursor-pointer ${
              showInsumoSettings 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            id="btn-toggle-insumos-config"
          >
            <Settings size={14} className={showInsumoSettings ? 'animate-spin-slow' : ''} />
            Configurar Preços de Insumos
          </button>
          
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-sans text-xs font-bold text-slate-600 shadow-3xs hover:bg-slate-50 transition-all cursor-pointer"
            id="btn-export-orcamento-csv"
          >
            <FileSpreadsheet size={14} className="text-emerald-500" />
            Exportar CSV
          </button>

          <button
            onClick={() => {
              setSaveOrcamentoNome(isCustomProduct ? customName : (selectedModelo?.descricao || ''));
              setSaveOrcamentoCodigo(isCustomProduct ? 'AVULSO' : (selectedModelo?.codigo || ''));
              setSaveOrcamentoDimensoes(selectedModelo?.dimensoes || 'Custom un');
              setSaveOrcamentoMaterial(isCustomProduct ? 'Papel Customizado' : (selectedModelo?.material || ''));
              setSaveOrcamentoCores(isCustomProduct ? customCoresQuantidade : (selectedModelo?.cores_quantidade || 4));
              setSaveOrcamentoTipo(isCustomProduct ? customTipoProduto : (selectedModelo?.tipo_produto || 'embalagem'));

              // Pré-preenchimento inteligente de Medida do Papel & Quantidade de Facas
              let defaultPapelFacas = '';
              if (usarCalculadoraPapel && larguraFolha && alturaFolha) {
                defaultPapelFacas = `${larguraFolha}x${alturaFolha} cm - ${contatosFolha || 1} faca(s)`;
              } else if (selectedModelo?.medida_faca) {
                defaultPapelFacas = `${selectedModelo.medida_faca} - ${selectedModelo.contatos_faca || 1} faca(s)`;
              } else if (isCustomProduct && customContatosFaca) {
                defaultPapelFacas = `${customContatosFaca} faca(s)`;
              }
              setSaveOrcamentoMedidaPapelFacas(defaultPapelFacas);

              setSaveOrcamentoObs('');
              setSaveOrcamentoFotos([]);
              setShowSaveModal(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-sans text-xs font-bold text-white shadow-3xs hover:bg-blue-500 transition-all cursor-pointer"
            id="btn-save-orcamento-db"
          >
            <CheckCircle2 size={14} />
            Salvar Orçamento
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 font-sans text-xs font-bold text-white shadow-3xs hover:bg-slate-800 transition-all cursor-pointer"
            id="btn-print-orcamento"
          >
            <Printer size={14} />
            Imprimir Relatório
          </button>
        </div>
      </div>

      {/* PAINEL DE CONFIGURAÇÃO DE PREÇOS DE INSUMOS (DILATÁVEL) */}
      {showInsumoSettings && (
        <div className="rounded-2xl border border-blue-150 bg-blue-50/25 p-5 shadow-xs transition-all duration-300 no-print" id="panel-insumos-settings">
          <div className="flex items-start justify-between border-b border-blue-100 pb-3 mb-4">
            <div>
              <h4 className="font-sans text-xs font-black text-blue-900 flex items-center gap-2 uppercase tracking-wider">
                <Settings size={14} className="text-blue-600" />
                Ajuste Dinâmico de Custo Unitário das Matérias-Primas
              </h4>
              <p className="text-[11px] text-blue-700 mt-0.5">
                Os valores salvos abaixo serão aplicados de forma persistente nas fórmulas técnicas para simulação do custo de insumos.
              </p>
            </div>
            <button 
              onClick={() => setShowInsumoSettings(false)}
              className="font-mono text-3xs text-blue-500 hover:text-blue-700 font-bold"
            >
              Fechar
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            {insumosDoModeloAtual.map((item, index) => {
              const currentPrice = getInsumoUnitPrice(item.insumo_id || item.nome, item);
              return (
                <div key={index} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-3xs hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Package size={13} className="text-slate-400 shrink-0" />
                    <span className="font-sans text-[11px] font-black text-slate-700 truncate block" title={item.nome}>
                      {item.nome}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 font-mono text-[10px] text-slate-400 font-bold">R$</span>
                      <input
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        value={currentPrice || ''}
                        onChange={(e) => salvarPrecoInsumo(item.insumo_id || item.nome, Number(e.target.value) || 0)}
                        className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-2.5 text-xs font-mono font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                        placeholder="0.00"
                      />
                    </div>
                    <span className="font-mono text-4xs text-slate-400 font-bold shrink-0">
                      fator: {item.fator_consumo}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-100 p-2 text-[10px] text-blue-800 leading-normal">
            <Info size={12} className="shrink-0 text-blue-600" />
            <span>
              Para alterar preços de outros insumos não utilizados por este modelo, o PCP utiliza como base os registros do menu principal. O fator indica a quantidade consumida por unidade produzida.
            </span>
          </div>
        </div>
      )}

      {/* ÁREA PRINCIPAL DO SIMULADOR */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 no-print">
        
        {/* PARTE ESQUERDA - PARAMETRIZAÇÃO */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="font-sans text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-2">
              <Layers size={14} className="text-blue-600" />
              Roteiro e Modelo de Referência
            </h3>

            {/* SELETOR DE TIPO DE ORÇAMENTO */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl no-print">
              <button
                type="button"
                onClick={() => setIsCustomProduct(false)}
                disabled={produtosModelos.length === 0}
                className={`py-1.5 px-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                  !isCustomProduct 
                    ? 'bg-white text-blue-600 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-700 disabled:opacity-50'
                }`}
              >
                Cadastrado
              </button>
              <button
                type="button"
                onClick={() => setIsCustomProduct(true)}
                className={`py-1.5 px-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                  isCustomProduct 
                    ? 'bg-white text-blue-600 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Avulso / Simulado
              </button>
            </div>

            {!isCustomProduct ? (
              <div className="space-y-4">
                {/* SELECIONAR MODELO */}
                <div className="space-y-1.5">
                  <label className="font-sans text-[11px] font-black text-slate-600 uppercase tracking-wide">
                    Modelo do Produto Acabado
                  </label>
                  <select
                    value={selectedModeloId}
                    onChange={(e) => setSelectedModeloId(e.target.value)}
                    className="w-full rounded-xl border border-slate-250 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-3xs hover:border-slate-350 focus:border-blue-500 focus:outline-none transition-all"
                    id="select-orcamento-modelo"
                  >
                    {produtosModelos.map((m, idx) => (
                      <option key={`${m.id}-${idx}`} value={m.id}>
                        {m.codigo ? `[${m.codigo}] ` : ''}{m.descricao}
                      </option>
                    ))}
                  </select>
                </div>

                {/* MODEL SUMMARY */}
                <div className="rounded-xl bg-slate-50 border border-slate-150 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-semibold font-sans">Dimensões:</span>
                    <span className="text-slate-700 font-bold font-mono">{selectedModelo?.dimensoes || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-semibold font-sans">Material de Base:</span>
                    <span className="text-slate-700 font-bold truncate max-w-[180px]" title={selectedModelo?.material}>
                      {selectedModelo?.material}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-semibold font-sans">Fator de Consumo:</span>
                    <span className="text-slate-700 font-bold font-mono">{selectedModelo?.fator_consumo} fol/un</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-semibold font-sans">Cores Frente/Verso:</span>
                    <span className="text-slate-700 font-bold font-mono">
                      {selectedModelo?.cores_frente || selectedModelo?.cores_quantidade || 0}F / {selectedModelo?.cores_verso || 0}V
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-semibold font-sans">Etapas de Produção:</span>
                    <span className="bg-blue-50 border border-blue-100 text-blue-700 rounded px-1.5 py-0.5 text-4xs font-black uppercase">
                      {selectedModelo?.roteiro?.length || 0} Máquinas
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* GERENCIAMENTO DE MULTI-OPÇÕES */}
                <div className="rounded-xl border border-blue-150 bg-blue-50/20 p-3 space-y-3 shadow-3xs">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-[11px] font-black text-blue-900 uppercase tracking-wide">
                      Opções de Custeamento
                    </span>
                    <button
                      type="button"
                      onClick={handleAdicionarOpcao}
                      className="flex items-center gap-1 text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-2 py-1 rounded shadow-3xs cursor-pointer transition-all"
                    >
                      <Plus size={10} /> Adicionar Opção
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {customOpcoes.map((op) => (
                      <div key={op.id} className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => setActiveOpcaoId(op.id)}
                          className={`px-2 py-0.5 text-3xs font-extrabold rounded-md cursor-pointer ${
                            activeOpcaoId === op.id
                              ? 'bg-blue-600 text-white shadow-3xs'
                              : 'text-slate-600 hover:text-slate-800'
                          }`}
                        >
                          {op.nome}
                        </button>
                        {customOpcoes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoverOpcao(op.id)}
                            className="px-1 text-slate-400 hover:text-red-600 cursor-pointer transition-colors"
                            title="Excluir Opção"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-1.5 border-t border-slate-200/50">
                    <label className="font-sans text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Identificação desta Opção:
                    </label>
                    <input
                      type="text"
                      value={customOpcoes.find(o => o.id === activeOpcaoId)?.nome || ''}
                      onChange={(e) => handleUpdateActiveOpcaoNome(e.target.value)}
                      placeholder="Ex: Opção 1 - Digital"
                      className="w-full rounded-lg border border-slate-250 px-2 py-1 text-3xs font-extrabold text-slate-800 bg-white shadow-3xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* NOME DO PRODUTO AVULSO */}
                <div className="space-y-1">
                  <label className="font-sans text-[11px] font-black text-slate-600 uppercase tracking-wide">
                    Nome / Descrição do Produto
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Ex: Caixa Sapato Duplex"
                    className="w-full rounded-xl border border-slate-250 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-3xs focus:border-blue-500 focus:outline-none transition-all"
                  />
                </div>

                {/* TIPO E DADOS OPERACIONAIS */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-black text-slate-600 uppercase tracking-wide">
                      Tipo Operacional
                    </label>
                    <select
                      value={customTipoProduto}
                      onChange={(e) => setCustomTipoProduto(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-250 bg-white px-2 py-2 text-xs font-bold text-slate-800 shadow-3xs focus:border-blue-500 focus:outline-none transition-all"
                    >
                      <option value="bolacha">Bolacha (Alta Cap.)</option>
                      <option value="manual">Acabamento Manual</option>
                      <option value="embalagem">Embalagem (Padrão)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-black text-slate-600 uppercase tracking-wide">
                      Qtd Cores (Setup)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="12"
                      value={customCoresQuantidade}
                      onChange={(e) => setCustomCoresQuantidade(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full rounded-xl border border-slate-250 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 shadow-3xs focus:border-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-sans text-[11px] font-black text-slate-600 uppercase tracking-wide">
                    Contatos Faca (Aproveit.)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={customContatosFaca}
                      onChange={(e) => setCustomContatosFaca(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full rounded-xl border border-slate-250 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 shadow-3xs focus:border-blue-500 focus:outline-none transition-all"
                    />
                    {usarCalculadoraPapel && (
                      <button
                        type="button"
                        onClick={() => setCustomContatosFaca(contatosFolha)}
                        className="rounded-lg bg-emerald-50 text-emerald-700 px-2.5 py-2 text-3xs font-black uppercase hover:bg-emerald-100 shrink-0 border border-emerald-100 transition-colors"
                        title="Copiar rendimento da calculadora de papel"
                      >
                        Copiar da Calc ({contatosFolha})
                      </button>
                    )}
                  </div>
                </div>

                {/* SEQUÊNCIA DE MÁQUINAS (ROTEIRO) */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <label className="font-sans text-[11px] font-black text-slate-600 uppercase tracking-wide flex items-center justify-between">
                    <span>Sequência de Máquinas ({customRoteiro.length})</span>
                    <span className="text-[10px] text-slate-400 lowercase font-medium">clique nas setas para ordenar</span>
                  </label>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {customRoteiro.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic text-center py-2">
                        Nenhuma máquina selecionada para o roteiro.
                      </p>
                    ) : (
                      customRoteiro.map((maqId, idx) => {
                        const maq = maquinas.find(m => m.id === maqId);
                        return (
                          <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-1.5 hover:bg-slate-100/60 transition-colors">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-mono text-3xs font-black text-slate-400 w-3 text-center">
                                {idx + 1}
                              </span>
                              <span className="text-3xs font-extrabold text-slate-700 truncate" title={maq?.nome || 'Desconhecido'}>
                                {maq?.nome || `Id: ${maqId}`}
                              </span>
                              {maq?.tipo && (
                                <span className="text-[8px] px-1 py-0.2 bg-blue-50 text-blue-600 border border-blue-100 rounded font-bold shrink-0 uppercase">
                                  {maq.tipo}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveMachine(idx, 'up')}
                                className="p-0.5 rounded text-slate-400 hover:bg-slate-250 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowUp size={11} />
                              </button>
                              <button
                                type="button"
                                disabled={idx === customRoteiro.length - 1}
                                onClick={() => handleMoveMachine(idx, 'down')}
                                className="p-0.5 rounded text-slate-400 hover:bg-slate-250 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowDown size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveMachine(idx)}
                                className="p-0.5 rounded text-red-400 hover:bg-red-50 hover:text-red-600 cursor-pointer ml-0.5"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* ADICIONAR MÁQUINA */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddMachine(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                      className="flex-1 rounded-lg border border-slate-200 bg-white p-1.5 text-3xs font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">+ Adicionar máquina no roteiro</option>
                      {maquinas.map((m, idx) => (
                        <option key={`${m.id || 'maq'}-${idx}`} value={m.id}>
                          {m.nome} ({m.tipo || 'Operação'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDER DE MARKUP */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <label className="font-sans text-[11px] font-black text-slate-600 uppercase tracking-wide flex items-center gap-1">
                  <Percent size={12} className="text-slate-400" />
                  Markup Multiplicador
                </label>
                <span className="font-mono text-xs font-extrabold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg">
                  {markup}%
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal mb-1">
                O percentual de markup que multiplica o custo total de fábrica (insumos + serviços) para compor o preço de venda (ex: 250% multiplica o custo por 2.5).
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="5"
                  value={markup}
                  onChange={(e) => setMarkup(Number(e.target.value))}
                  className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <input
                  type="number"
                  min="1"
                  max="2000"
                  value={markup}
                  onChange={(e) => setMarkup(Math.max(1, Number(e.target.value) || 0))}
                  className="w-16 rounded-lg border border-slate-200 py-1 text-center text-xs font-mono font-bold text-slate-800"
                />
              </div>
            </div>

            {/* AJUSTE OPERADORES DE ACABAMENTO */}
            {selectedModelo.roteiro.some(id => maquinas.find(m => m.id === id)?.tipo === 'Acabamento') && (
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <label className="font-sans text-[11px] font-black text-slate-600 uppercase tracking-wide">
                    Operadores no Acabamento
                  </label>
                  <span className="font-mono text-xs font-bold text-slate-700">
                    {acabamentoOperadores} {acabamentoOperadores === 1 ? 'operador' : 'operadores'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal mb-1">
                  Ajuda a diluir o tempo e aumentar a capacidade real das máquinas manuais/acabamento.
                </p>
                <select
                  value={acabamentoOperadores}
                  onChange={(e) => setAcabamentoOperadores(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-white p-1.5 text-xs font-bold text-slate-700 shadow-3xs"
                >
                  <option value={1}>1 Operador (Padrão)</option>
                  <option value={2}>2 Operadores (Dobro de Velocidade)</option>
                  <option value={3}>3 Operadores</option>
                  <option value={4}>4 Operadores</option>
                </select>
              </div>
            )}
          </div>

          {/* CALCULADORA DE PAPEL PERSONALIZADA */}
          <div className={`rounded-2xl border p-5 shadow-xs space-y-4 transition-all ${usarCalculadoraPapel ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="font-sans text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Scissors size={14} className={usarCalculadoraPapel ? 'text-emerald-500' : 'text-slate-400'} />
                Cálculo de Papel por KG
              </h3>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={usarCalculadoraPapel} 
                  onChange={(e) => setUsarCalculadoraPapel(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {usarCalculadoraPapel ? (
              <div className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-sans text-[10px] font-bold text-slate-500 uppercase">
                      Custo do KG (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={custoKgPapel}
                      onChange={(e) => setCustoKgPapel(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full rounded-lg border border-slate-200 py-1.5 px-2.5 font-mono font-bold text-slate-800 bg-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-sans text-[10px] font-bold text-slate-500 uppercase">
                      Gramatura (g)
                    </label>
                    <input
                      type="number"
                      step="5"
                      min="0"
                      value={gramaturaPapel}
                      onChange={(e) => setGramaturaPapel(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full rounded-lg border border-slate-200 py-1.5 px-2.5 font-mono font-bold text-slate-800 bg-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-sans text-[10px] font-bold text-slate-500 uppercase">
                      Largura (cm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={larguraFolha}
                      onChange={(e) => setLarguraFolha(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full rounded-lg border border-slate-200 py-1.5 px-2.5 font-mono font-bold text-slate-800 bg-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-sans text-[10px] font-bold text-slate-500 uppercase">
                      Altura (cm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={alturaFolha}
                      onChange={(e) => setAlturaFolha(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full rounded-lg border border-slate-200 py-1.5 px-2.5 font-mono font-bold text-slate-800 bg-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-sans text-[10px] font-bold text-slate-500 uppercase">
                    Contatos por Folha (Rendimento)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={contatosFolha}
                    onChange={(e) => setContatosFolha(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full rounded-lg border border-slate-200 py-1.5 px-2.5 font-mono font-bold text-slate-800 bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* RESULTADOS DA CALCULADORA EM TEMPO REAL */}
                {(() => {
                  const pesoFolhaKg = (larguraFolha * alturaFolha * gramaturaPapel) / 10000000;
                  const precoFolha = pesoFolhaKg * custoKgPapel;
                  const custoInsumoUnit = precoFolha / contatosFolha;

                  return (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 space-y-1.5 font-sans text-[11px] text-emerald-800">
                      <div className="flex justify-between">
                        <span>Peso de 1 Folha:</span>
                        <strong className="font-mono">{(pesoFolhaKg * 1000).toFixed(1)}g ({pesoFolhaKg.toFixed(4)} kg)</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Custo de 1 Folha:</span>
                        <strong className="font-mono">R$ {precoFolha.toFixed(3)}</strong>
                      </div>
                      <div className="flex justify-between border-t border-emerald-200/50 pt-1.5">
                        <span>Custo Unitário de Papel:</span>
                        <strong className="font-mono text-emerald-700 font-extrabold text-xs">R$ {custoInsumoUnit.toFixed(4)} /un</strong>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 leading-normal">
                Ative o cálculo por gramatura para simular o custo do papel cartão duplex/triplex de acordo com o peso real da folha e o aproveitamento de contatos.
              </p>
            )}
          </div>

          {/* CONFIGURAÇÃO DE FOLHAS PARA ACERTO */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="font-sans text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileImage size={14} className="text-slate-500" />
                Folhas para Acerto (Desperdício)
              </h3>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-sans text-[10px] font-bold text-slate-500 uppercase">
                Quantidade de Folhas para Acerto
              </label>
              <p className="text-[10px] text-slate-400 leading-normal mb-1.5">
                Quantidade de folhas adicionadas por padrão ao orçamento para acerto de máquina/ajuste de cores no insumo principal (papel).
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="5"
                  value={folhasAcerto}
                  onChange={(e) => setFolhasAcerto(Number(e.target.value))}
                  className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={folhasAcerto}
                  onChange={(e) => setFolhasAcerto(Math.max(0, Number(e.target.value) || 0))}
                  className="w-16 rounded-lg border border-slate-200 py-1 text-center text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* CUSTO DE ACABAMENTO ADICIONAL */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/10 p-5 shadow-xs space-y-4 transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="font-sans text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Layers size={14} className="text-blue-500" />
                Acabamento Adicional (Valor Unitário)
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-sans text-[10px] font-bold text-slate-500 uppercase">
                  Descrição do Acabamento
                </label>
                <input
                  type="text"
                  value={adicionalAcabamentoNome}
                  onChange={(e) => setAdicionalAcabamentoNome(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 py-1.5 px-2.5 font-sans text-slate-800 bg-white focus:border-blue-500 focus:outline-none"
                  placeholder="Ex: Hot Stamping, Verniz Localizado, Relevo"
                />
              </div>

              <div className="space-y-1">
                <label className="font-sans text-[10px] font-bold text-slate-500 uppercase">
                  Valor Unitário Somado ao Preço Final (R$)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={adicionalAcabamentoValor}
                  onChange={(e) => setAdicionalAcabamentoValor(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full rounded-lg border border-slate-200 py-1.5 px-2.5 font-mono font-bold text-slate-800 bg-white focus:border-blue-500 focus:outline-none"
                  placeholder="0,0000"
                />
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                Este valor será somado diretamente ao preço de venda unitário calculado para cada quantidade/lote e será salvo no orçamento com a respectiva descrição.
              </p>
            </div>
          </div>

          {/* CARD DE DETALHAMENTO DE TAXAS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h4 className="font-sans text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Info size={13} className="text-amber-500" />
              Impostos Lucro Presumido
            </h4>
            <p className="text-[10px] text-slate-400 leading-normal">
              O preço unitário já considera a alíquota dos impostos integrados de venda configurados no menu "Custos de Serviço":
            </p>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1 font-mono">
                <span className="text-slate-400 font-semibold">PIS:</span>
                <span className="text-slate-700 font-extrabold">{(taxasPresumido?.pis || 0).toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-1 font-mono">
                <span className="text-slate-400 font-semibold">COFINS:</span>
                <span className="text-slate-700 font-extrabold">{(taxasPresumido?.cofins || 0).toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-1 font-mono">
                <span className="text-slate-400 font-semibold">ISS:</span>
                <span className="text-slate-700 font-extrabold">{(taxasPresumido?.iss || 0).toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-1 font-mono">
                <span className="text-slate-400 font-semibold">IRPJ:</span>
                <span className="text-slate-700 font-extrabold">{(taxasPresumido?.irpj || 0).toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between col-span-2 pt-1 font-mono border-t border-slate-150">
                <span className="text-slate-400 font-semibold">CSLL:</span>
                <span className="text-slate-700 font-extrabold">{(taxasPresumido?.csll || 0).toFixed(2)}%</span>
              </div>
            </div>
            <div className="pt-2 flex items-center justify-between font-sans text-[11px] font-black text-slate-800 border-t border-slate-150">
              <span>Alíquota Total Estimada:</span>
              <span className="text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded font-mono">
                {((taxasPresumido?.pis || 0) + 
                  (taxasPresumido?.cofins || 0) + 
                  (taxasPresumido?.iss || 0) + 
                  (taxasPresumido?.irpj || 0) + 
                  (taxasPresumido?.csll || 0)).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* PARTE DIREITA - RELATÓRIOS E TABELA DE PREÇOS */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* TABS DE VISUALIZAÇÃO */}
          <div className="flex items-center justify-between border-b border-slate-200">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('tabela')}
                className={`py-2.5 px-1 font-sans text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'tabela' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Tabela de Preços por Lote
              </button>
              <button
                onClick={() => setActiveTab('analise')}
                className={`py-2.5 px-1 font-sans text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'analise' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Análise Gráfica & Diluição
              </button>
              <button
                onClick={() => setActiveTab('tabela_cliente')}
                className={`py-2.5 px-1 font-sans text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'tabela_cliente' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Tabela de Preços p/ Clientes
              </button>
              <button
                onClick={() => setActiveTab('produtos_orcados')}
                className={`py-2.5 px-1 font-sans text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'produtos_orcados' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Produtos Orçados
              </button>
            </div>
            
            <div className="text-4xs font-mono text-slate-400 uppercase tracking-widest font-black select-none">
              Homero Industrial Lab
            </div>
          </div>

          {/* TAB 1: TABELA DE PREÇOS */}
          {activeTab === 'tabela' && (
            <div className="space-y-6">
              
              {/* MODO DE EDIÇÃO COMPLETA DE ORÇAMENTO SALVO */}
              {editingSavedOrcamentoOriginal && (
                <div className="rounded-2xl border-2 border-amber-400 bg-amber-50/80 p-4 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs no-print">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500 text-white shadow-2xs shrink-0 mt-0.5">
                      <FolderOpen size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-sans font-black text-amber-900 uppercase text-xs tracking-wide">
                          Modo de Edição Completa do Orçamento
                        </span>
                        <span className="bg-amber-200 text-amber-900 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                          Ref: {editingSavedOrcamentoOriginal.codigo || 'AVULSO'}
                        </span>
                      </div>
                      <p className="text-amber-800 font-semibold mt-0.5">
                        Item: <strong className="text-amber-950 font-black">{editingSavedOrcamentoOriginal.descricao}</strong>
                      </p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Você pode alterar o roteiro de máquinas, preço do papel/gramatura, cores, faca e markup. Ao finalizar, clique em salvar para recalcular e atualizar o histórico.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 sm:self-center">
                    <button
                      type="button"
                      onClick={handleCancelarEdicaoCompleta}
                      className="px-3 py-2 rounded-xl border border-amber-300 bg-white hover:bg-amber-100 text-amber-800 font-bold text-xs shadow-3xs transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSalvarAtualizacaoOrcamento}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-3xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={14} />
                      Salvar Alterações
                    </button>
                  </div>
                </div>
              )}

              {/* ALERTA DE PARAMETRIZAÇÃO PERSONALIZADA */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs no-print">
                <div className="flex items-center gap-2">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse shrink-0" />
                  <span className="font-sans text-blue-800 font-semibold leading-relaxed">
                    Parâmetros Especiais de Venda Ativos:
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-blue-700">
                  <span className="bg-white border border-blue-150 px-2 py-0.5 rounded-md shadow-3xs font-bold">
                    +{folhasAcerto} Folhas de Acerto (Insumo Principal)
                  </span>
                  <span className="bg-white border border-blue-150 px-2 py-0.5 rounded-md shadow-3xs font-bold">
                    50% Margem de Serviço (Terceirização)
                  </span>
                </div>
              </div>
              
              {/* TABELA DE RESULTADOS */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/75 font-mono text-3xs font-black uppercase tracking-wider text-slate-400">
                        <th className="py-3 px-4">Qtd (Unidades)</th>
                        <th className="py-3 px-4">Custo Insumos</th>
                        <th className="py-3 px-4">Custo Serviço</th>
                        <th className="py-3 px-4">Custo Total</th>
                        <th className="py-3 px-4">Impostos & Margem</th>
                        <th className="py-3 px-4 text-right">Preço de Venda do Lote</th>
                        <th className="py-3 px-4 text-right bg-blue-50/50 text-blue-800">Preço Unitário</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {orcamentoResultados.map((res, idx) => {
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            {/* QUANTIDADE */}
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              {res.qty.toLocaleString('pt-BR')} un
                            </td>

                            {/* CUSTO INSUMOS */}
                            <td className="py-3 px-4">
                              <span className="font-mono text-slate-700 block font-semibold">
                                R$ {res.custoInsumosTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="font-mono text-4xs text-slate-400 block">
                                R$ {res.custoInsumosUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} /un
                              </span>
                            </td>

                            {/* CUSTO SERVIÇO */}
                            <td className="py-3 px-4">
                              <span className="font-mono text-slate-700 block font-semibold">
                                R$ {res.custoServicoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="font-mono text-4xs text-slate-400 block">
                                R$ {res.custoServicoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} /un
                              </span>
                            </td>

                            {/* CUSTO TOTAL */}
                            <td className="py-3 px-4 font-semibold text-slate-800">
                              <span className="font-mono block">
                                R$ {res.custoFabricaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="font-mono text-4xs text-slate-400 block">
                                R$ {res.custoFabricaUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} /un
                              </span>
                            </td>

                            {/* IMPOSTOS & MARGEM */}
                            <td className="py-3 px-4">
                              <span className="font-mono text-4xs text-slate-500 block">
                                Imp: R$ {res.impostosTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="font-mono text-4xs text-emerald-600 block font-bold">
                                Luc: R$ {res.margemLucroTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </td>

                            {/* PREÇO DE VENDA DO LOTE */}
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                              R$ {res.precoVendaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            {/* PREÇO UNITÁRIO */}
                            <td className="py-3 px-4 text-right bg-blue-50/25 font-mono font-extrabold text-blue-700">
                              R$ {res.precoVendaUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CARD DE DESTAQUES E INTERPRETAÇÃO */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                
                <div className="rounded-2xl border border-slate-150 bg-slate-50/50 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
                    <TrendingUp size={14} className="text-blue-600" />
                    Ganho de Escala Industrial
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Observe como o preço unitário reduz drasticamente ao elevar a tiragem de 1.000 para 30.000 unidades. 
                    Isso ocorre porque os <b>custos de Setup das máquinas</b> (preparação de facas, chapas, tintas) 
                    ficam diluídos sobre uma quantidade muito maior de peças fabricadas.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-150 bg-slate-50/50 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
                    <Coins size={14} className="text-amber-500" />
                    Custo Real vs Preço Unitário
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    O custo real dos insumos (papel, cola, tinta) permanece praticamente constante por unidade em todas as tiragens, 
                    enquanto o custo do serviço/setup cai consideravelmente à medida que a velocidade nominal de cada equipamento 
                    é maximizada sem novos setups intermediários.
                  </p>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: ANÁLISE GRÁFICA & DILUIÇÃO */}
          {activeTab === 'analise' && (
            <div className="space-y-6">
              
              {/* COMPOSIÇÃO DE CUSTO GRÁFICO (BENTO STYLE) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <div>
                  <h4 className="font-sans text-xs font-black text-slate-800 uppercase tracking-wider">
                    Composição do Preço Unitário de Venda por Quantidade
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Veja como cada fração (Insumos, Setup de Serviço, Operação Running, Margem e Tributos) compõe o preço final unitário.
                  </p>
                </div>

                <div className="space-y-4">
                  {orcamentoResultados.map((res, idx) => {
                    // Porcentagens para empilhamento visual
                    const total = res.precoVendaUnitario;
                    const pctInsumos = (res.custoInsumosUnitario / total) * 100;
                    const pctSetup = (res.setupDilutedUnit / total) * 100;
                    const pctRun = (res.runDilutedUnit / total) * 100;
                    const pctTaxes = (res.impostosUnitario / total) * 100;
                    const pctMargem = (res.margemLucroUnitario / total) * 100;

                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono font-extrabold text-slate-900">{res.qty.toLocaleString('pt-BR')} un</span>
                          <span className="font-mono font-bold text-blue-700">R$ {res.precoVendaUnitario.toFixed(3)} /un</span>
                        </div>
                        
                        {/* Custom Stacking Bar Chart */}
                        <div className="h-6 w-full rounded-lg bg-slate-100 overflow-hidden flex shadow-2xs">
                          {/* Insumos */}
                          {pctInsumos > 0 && (
                            <div 
                              style={{ width: `${pctInsumos}%` }}
                              className="bg-emerald-500 h-full flex items-center justify-center text-[8px] text-white font-extrabold truncate"
                              title={`Insumos: R$ ${res.custoInsumosUnitario.toFixed(3)} (${pctInsumos.toFixed(1)}%)`}
                            >
                              {pctInsumos > 15 && 'Insumos'}
                            </div>
                          )}
                          {/* Setup */}
                          {pctSetup > 0 && (
                            <div 
                              style={{ width: `${pctSetup}%` }}
                              className="bg-rose-500 h-full flex items-center justify-center text-[8px] text-white font-extrabold truncate"
                              title={`Setup Serviço: R$ ${res.setupDilutedUnit.toFixed(3)} (${pctSetup.toFixed(1)}%)`}
                            >
                              {pctSetup > 15 && 'Setup'}
                            </div>
                          )}
                          {/* Run Operação */}
                          {pctRun > 0 && (
                            <div 
                              style={{ width: `${pctRun}%` }}
                              className="bg-orange-400 h-full flex items-center justify-center text-[8px] text-white font-extrabold truncate"
                              title={`Operação: R$ ${res.runDilutedUnit.toFixed(3)} (${pctRun.toFixed(1)}%)`}
                            >
                              {pctRun > 15 && 'Operação'}
                            </div>
                          )}
                          {/* Tributos */}
                          {pctTaxes > 0 && (
                            <div 
                              style={{ width: `${pctTaxes}%` }}
                              className="bg-slate-400 h-full flex items-center justify-center text-[8px] text-white font-extrabold truncate"
                              title={`Tributos: R$ ${res.impostosUnitario.toFixed(3)} (${pctTaxes.toFixed(1)}%)`}
                            >
                              {pctTaxes > 15 && 'Trib.'}
                            </div>
                          )}
                          {/* Margem */}
                          {pctMargem > 0 && (
                            <div 
                              style={{ width: `${pctMargem}%` }}
                              className="bg-blue-600 h-full flex items-center justify-center text-[8px] text-white font-extrabold truncate"
                              title={`Lucro/Margem: R$ ${res.margemLucroUnitario.toFixed(3)} (${pctMargem.toFixed(1)}%)`}
                            >
                              {pctMargem > 15 && 'Lucro'}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* LEGENDA GRÁFICA */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-3 text-[10px] font-bold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-500 block"></span>
                    <span>Custo Insumos</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-rose-500 block"></span>
                    <span>Setup de Máquina</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-orange-400 block"></span>
                    <span>Tempo de Corrida (Running)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-slate-400 block"></span>
                    <span>Tributos (Impostos)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-blue-600 block"></span>
                    <span>Margem Operacional</span>
                  </div>
                </div>
              </div>

              {/* CARD EXPLICATIVO DO SETUP */}
              <div className="rounded-2xl border border-indigo-150 bg-indigo-50/20 p-5 space-y-2.5">
                <h5 className="font-sans text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame size={14} className="text-indigo-600" />
                  Conceito de Diluição de Setup na Indústria de Embalagens
                </h5>
                <p className="text-xs text-indigo-950 leading-relaxed">
                  Em uma indústria gráfica e de cartonagem (como a <b>Homero Embalagens</b>), cada etapa do roteiro exige um tempo físico de preparação 
                  (instalação de facas na corte e vinco, gravação de chapas, lavagem de tintas, regulagem de guias). 
                  Esse tempo é chamado de <b>Setup</b> e consome o mesmo valor de depreciação, mão de obra e energia elétrica, independentemente de estarmos 
                  rodando 100 ou 100.000 caixas. 
                  <br className="my-2 block"/>
                  Ao orçar lotes maiores, o custo fixo de setup é dividido por milhares de unidades, derrubando o preço unitário drasticamente. 
                  Isso explica porque lotes inferiores a 1.000 unidades muitas vezes tornam-se inviáveis comercialmente devido ao peso de setup na composição final.
                </p>
              </div>

            </div>
          )}

          {/* TAB 3: TABELA DE PREÇOS PARA CLIENTES (SEM CUSTOS OU DETALHES DE MARGEM) */}
          {activeTab === 'tabela_cliente' && (
            <div className="space-y-6">
              
              {/* HEADER E AÇÕES DA TABELA DE CLIENTES */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs no-print">
                <div>
                  <h4 className="font-sans text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={16} className="text-blue-600" />
                    Tabela de Preços para Clientes
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    Esta tabela não expõe custos de insumos, setup ou taxas internas. É ideal para enviar diretamente aos seus clientes como cotação oficial.
                  </p>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleExportClientCSV}
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 px-3.5 py-2 font-sans text-xs font-bold shadow-3xs transition-all cursor-pointer"
                  >
                    <FileSpreadsheet size={14} className="text-emerald-600" />
                    Exportar Excel
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 font-sans text-xs font-bold text-white shadow-3xs hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <Printer size={14} />
                    Exportar PDF / Imprimir
                  </button>
                </div>
              </div>

              {/* CONTEÚDO DA PROPOSTA DE PREÇOS */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6 print-active-area">
                
                {/* CABEÇALHO DO PRODUTO */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between border-b border-slate-100 pb-5 gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Produto Orçado:</span>
                    <h3 className="text-lg font-black text-slate-800 mt-0.5">
                      {isCustomProduct ? customName : (selectedModelo?.descricao || 'Produto Cadastrado')}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 mt-1">
                      Código / Ref: {isCustomProduct ? 'AVULSO-SIMULADO' : (selectedModelo?.codigo || 'S/C')}
                    </p>
                  </div>
                  <div className="text-left sm:text-right text-xs">
                    <p className="text-slate-400 font-medium">Data de Emissão:</p>
                    <p className="font-mono font-bold text-slate-700 mt-0.5">{new Date().toLocaleDateString('pt-BR')}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Validade: 15 dias</p>
                  </div>
                </div>

                {/* DETALHES DE ESPECIFICAÇÕES DO ITEM (SE EXISTIREM) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150 text-xs">
                  <div>
                    <p className="text-slate-400 font-semibold font-sans">Material de Referência:</p>
                    <p className="text-slate-700 font-extrabold mt-0.5">{isCustomProduct ? 'Papel Customizado' : selectedModelo?.material}</p>
                  </div>
                  {selectedModelo?.dimensoes && (
                    <div>
                      <p className="text-slate-400 font-semibold font-sans">Dimensões:</p>
                      <p className="text-slate-700 font-bold font-mono mt-0.5">{selectedModelo.dimensoes}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-400 font-semibold font-sans">Cores Recomendadas:</p>
                    <p className="text-slate-700 font-bold mt-0.5">{isCustomProduct ? `${customCoresQuantidade} cores` : `${selectedModelo?.cores_quantidade || 0} cores`}</p>
                  </div>
                </div>

                {/* TABELA LIMPA SEM CUSTOS */}
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/75 font-sans text-3xs font-black uppercase tracking-wider text-slate-400">
                          <th className="py-3 px-4">Quantidade (Lote)</th>
                          {isCustomProduct ? (
                            customOpcoes.map((op) => (
                              <th key={op.id} className="py-3 px-4 text-right">{op.nome} (Unitário)</th>
                            ))
                          ) : (
                            <th className="py-3 px-4 text-right">Preço Unitário</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 text-slate-600">
                        {targetQuantities.map((qty, qIdx) => (
                          <tr key={qIdx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              {qty.toLocaleString('pt-BR')} un
                            </td>
                            {isCustomProduct ? (
                              customOpcoes.map((op) => {
                                const opRes = orcamentoOpcoesResultados.find(r => r.opcaoId === op.id);
                                const price = opRes?.resultados?.[qIdx]?.precoVendaUnitario || 0;
                                return (
                                  <td key={op.id} className="py-3.5 px-4 text-right font-mono font-bold text-slate-800 bg-slate-50/25">
                                    R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                                  </td>
                                );
                              })
                            ) : (
                              <td className="py-3.5 px-4 text-right font-mono font-extrabold text-blue-700 bg-blue-50/10">
                                R$ {orcamentoResultados[qIdx]?.precoVendaUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* INSTRUÇÕES COMERCIAIS */}
                <div className="text-[10px] text-slate-400 space-y-1 bg-slate-50/50 p-3.5 rounded-lg border border-dashed border-slate-200 leading-relaxed">
                  <p className="font-extrabold uppercase text-slate-500">Observações de Faturamento e Produção:</p>
                  <p>1. Cotação baseada em custos atuais de matérias-primas e processamento industrial.</p>
                  <p>2. Os preços expressos na tabela acima são puramente unitários e não incluem eventuais impostos incidentes sobre a venda de mercadorias no regime fiscal do destinatário.</p>
                  <p>3. Prazo de validade desta proposta é de 15 dias corridos.</p>
                </div>

              </div>

            </div>
          )}

          {activeTab === 'produtos_orcados' && (
            <div className="space-y-6">
              {/* HEADER E BARRA DE CONTROLES */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs no-print">
                <div>
                  <h4 className="font-sans text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <FileSpreadsheet size={18} className="text-blue-600" />
                    Produtos Orçados Salvos
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    Gerencie o histórico de orçamentos em formato de tabela tipo Excel ou fichas em cards, com exportação CSV e visualização rápida.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Busca por Texto */}
                  <div className="relative flex-1 sm:w-64">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Search size={14} />
                    </span>
                    <input
                      type="text"
                      placeholder="Filtrar por nome, código ou papel..."
                      value={searchOrcamento}
                      onChange={(e) => setSearchOrcamento(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-sans text-slate-700 bg-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Alternador de Modo de Visualização (Excel x Cards) */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold font-sans">
                    <button
                      type="button"
                      onClick={() => setProdutosOrcadosViewMode('excel')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        produtosOrcadosViewMode === 'excel'
                          ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      title="Visualização em Planilha / Tabela estilo Excel"
                    >
                      <Table size={14} />
                      <span>Tabela Excel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProdutosOrcadosViewMode('cards')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        produtosOrcadosViewMode === 'cards'
                          ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      title="Visualização em Fichas Individuais / Cards"
                    >
                      <LayoutGrid size={14} />
                      <span>Cards</span>
                    </button>
                  </div>

                  {/* Botão Configurar Colunas (apenas no modo Excel) */}
                  {produtosOrcadosViewMode === 'excel' && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowColConfigPopover(prev => !prev)}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-sans font-bold shadow-3xs cursor-pointer transition-all ${
                          showColConfigPopover 
                            ? 'bg-blue-600 border-blue-600 text-white' 
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                        title="Ocultar ou reexibir colunas da tabela Excel"
                      >
                        <SlidersHorizontal size={14} />
                        <span>Colunas</span>
                        <span className="text-[10px] font-mono opacity-80">({Object.values(visibleExcelColumns).filter(Boolean).length}/{DEFAULT_EXCEL_COLUMNS.length})</span>
                      </button>

                      {showColConfigPopover && (
                        <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-50 animate-in fade-in zoom-in-95">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                            <span className="text-xs font-bold text-slate-800">Colunas Visíveis</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={handleShowAllColumns}
                                className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer"
                              >
                                Todas
                              </button>
                              <span className="text-slate-300">|</span>
                              <button
                                type="button"
                                onClick={handleResetColumns}
                                className="text-[10px] text-slate-500 hover:underline font-medium cursor-pointer"
                              >
                                Padrão
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                            {DEFAULT_EXCEL_COLUMNS.map(col => {
                              if (isVendedorMode && (col.id === 'markup' || col.id === 'acerto')) return null;
                              const checked = isColVisible(col.id);
                              return (
                                <label 
                                  key={col.id} 
                                  className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-50 text-xs text-slate-700 cursor-pointer select-none"
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      disabled={col.required}
                                      onChange={() => toggleColVisible(col.id, !checked)}
                                      className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer disabled:opacity-50"
                                    />
                                    <span className={col.required ? 'font-bold' : ''}>{col.label}</span>
                                  </div>
                                  {checked ? <Eye size={12} className="text-blue-500" /> : <EyeOff size={12} className="text-slate-300" />}
                                </label>
                              );
                            })}
                          </div>
                          <div className="mt-2 pt-2 border-t border-slate-100 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setShowColConfigPopover(false)}
                              className="text-[11px] font-bold text-slate-600 hover:text-slate-900 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 cursor-pointer"
                            >
                              Fechar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Botão de Exportar Tabela Completa para Excel CSV */}
                  <button
                    type="button"
                    onClick={() => {
                      const listToExport = (orcamentosSalvos || []).filter(orc => {
                        const s = searchOrcamento.toLowerCase().trim();
                        const matchText = !s || (
                          orc.descricao.toLowerCase().includes(s) ||
                          (orc.codigo || '').toLowerCase().includes(s) ||
                          (orc.material || '').toLowerCase().includes(s)
                        );
                        const matchTipo = tipoFiltro === 'todos' || orc.tipo_produto === tipoFiltro;
                        return matchText && matchTipo;
                      });
                      handleExportAllOrcamentosCSV(listToExport);
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-2 text-xs font-sans font-bold shadow-3xs cursor-pointer transition-all"
                    title="Exportar todos os orçamentos da busca para arquivo de planilha Excel (.csv)"
                  >
                    <Download size={14} />
                    <span>Exportar Excel (.csv)</span>
                  </button>
                </div>
              </div>

              {/* BARRA DE METRICAS E FILTRO DE TIPO */}
              {(() => {
                const allList = orcamentosSalvos || [];
                const filtered = allList.filter(orc => {
                  const s = searchOrcamento.toLowerCase().trim();
                  const matchText = !s || (
                    orc.descricao.toLowerCase().includes(s) ||
                    (orc.codigo || '').toLowerCase().includes(s) ||
                    (orc.material || '').toLowerCase().includes(s)
                  );
                  const matchTipo = tipoFiltro === 'todos' || orc.tipo_produto === tipoFiltro;
                  return matchText && matchTipo;
                });

                const countEmbalagens = allList.filter(o => o.tipo_produto === 'embalagem' || !o.tipo_produto).length;
                const countManuais = allList.filter(o => o.tipo_produto === 'manual').length;
                const countBolachas = allList.filter(o => o.tipo_produto === 'bolacha').length;

                return (
                  <div className="space-y-4">
                    {/* Filtros rápidos por tipo e resumo de contagem */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 text-xs font-sans">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase mr-1">Filtrar Categoria:</span>
                        <button
                          onClick={() => setTipoFiltro('todos')}
                          className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            tipoFiltro === 'todos'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Todos ({allList.length})
                        </button>
                        <button
                          onClick={() => setTipoFiltro('embalagem')}
                          className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            tipoFiltro === 'embalagem'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Embalagens ({countEmbalagens})
                        </button>
                        <button
                          onClick={() => setTipoFiltro('manual')}
                          className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            tipoFiltro === 'manual'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Manuais ({countManuais})
                        </button>
                        <button
                          onClick={() => setTipoFiltro('bolacha')}
                          className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            tipoFiltro === 'bolacha'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Bolachas ({countBolachas})
                        </button>
                      </div>

                      <div className="text-[11px] font-mono font-bold text-slate-500">
                        Exibindo <span className="text-blue-700">{filtered.length}</span> de <span className="text-slate-700">{allList.length}</span> orçamentos
                      </div>
                    </div>

                    {filtered.length === 0 ? (
                      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs space-y-4">
                        <ImageIcon className="mx-auto h-12 w-12 text-slate-300" />
                        <h3 className="text-sm font-bold text-slate-700">Nenhum orçamento encontrado</h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-normal">
                          {searchOrcamento || tipoFiltro !== 'todos'
                            ? "Nenhum resultado corresponde à sua busca e filtros atuais." 
                            : "Você ainda não possui orçamentos salvos. Clique no botão 'Salvar Orçamento' para criar o primeiro!"}
                        </p>
                      </div>
                    ) : produtosOrcadosViewMode === 'excel' ? (
                      /* ================= MODO TABELA ESTILO EXCEL ================= */
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
                        <table className="w-full text-left border-collapse text-xs font-sans">
                          <thead>
                            <tr className="bg-slate-100/90 border-b border-slate-200 text-[10px] font-mono text-slate-600 uppercase tracking-wider select-none">
                              {isColVisible('det') && <th className="py-3 px-3 w-10 text-center">Det.</th>}
                              {isColVisible('foto') && <th className="py-3 px-3 text-center font-bold w-16">Foto</th>}
                              {isColVisible('descricao') && <th className="py-3 px-3 font-bold min-w-[200px]">Descrição do Produto</th>}
                              {isColVisible('tipo') && <th className="py-3 px-3 font-bold">Tipo</th>}
                              {isColVisible('material') && <th className="py-3 px-3 font-bold min-w-[150px]">Material Base</th>}
                              {isColVisible('dimensoes') && <th className="py-3 px-3 font-bold">Dimensões</th>}
                              {isColVisible('medida_papel_facas') && <th className="py-3 px-3 font-bold min-w-[140px]">Medida Papel & Facas</th>}
                              {isColVisible('cores_faca') && <th className="py-3 px-3 font-bold">Cores / Faca</th>}
                              {!isVendedorMode && isColVisible('markup') && <th className="py-3 px-3 text-center font-bold">Markup</th>}
                              {!isVendedorMode && isColVisible('acerto') && <th className="py-3 px-3 text-center font-bold">Acerto</th>}
                              {isColVisible('precos') && <th className="py-3 px-3 font-bold min-w-[220px]">Tabela de Lotes & Preços (R$)</th>}
                              {isColVisible('data') && <th className="py-3 px-3 font-bold">Data</th>}
                              {isColVisible('acoes') && <th className="py-3 px-3 text-right font-bold min-w-[150px]">Ações</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/70">
                            {filtered.map((orc) => {
                              const isExpanded = expandedOrcamentoId === orc.id;
                              const visibleColsCount = [
                                isColVisible('det'),
                                isColVisible('foto'),
                                isColVisible('descricao'),
                                isColVisible('tipo'),
                                isColVisible('material'),
                                isColVisible('dimensoes'),
                                isColVisible('medida_papel_facas'),
                                isColVisible('cores_faca'),
                                !isVendedorMode && isColVisible('markup'),
                                !isVendedorMode && isColVisible('acerto'),
                                isColVisible('precos'),
                                isColVisible('data'),
                                isColVisible('acoes')
                              ].filter(Boolean).length;

                              return (
                                <React.Fragment key={orc.id}>
                                  <tr className={`hover:bg-blue-50/40 transition-colors ${isExpanded ? 'bg-blue-50/20' : ''}`}>
                                    {/* Expand/Collapse detail toggle */}
                                    {isColVisible('det') && (
                                      <td className="py-3 px-3 text-center">
                                        <button
                                          type="button"
                                          onClick={() => setExpandedOrcamentoId(isExpanded ? null : orc.id)}
                                          className="text-slate-400 hover:text-blue-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                                          title={isExpanded ? "Ocultar galeria de fotos e notas" : "Expandir fotos e especificações"}
                                        >
                                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                        </button>
                                      </td>
                                    )}

                                    {/* Foto do Produto */}
                                    {isColVisible('foto') && (
                                      <td className="py-2 px-2 text-center align-middle">
                                        {orc.fotos && orc.fotos.length > 0 ? (
                                          <div className="relative group inline-block">
                                            <img
                                              src={orc.fotos[0]}
                                              alt={orc.descricao}
                                              referrerPolicy="no-referrer"
                                              className="w-11 h-11 object-cover rounded-lg border border-slate-200 shadow-2xs hover:border-blue-400 hover:scale-105 transition-all cursor-pointer bg-slate-50"
                                              onClick={() => setExpandedOrcamentoId(isExpanded ? null : orc.id)}
                                              title="Clique para expandir galeria e detalhes"
                                            />
                                            {orc.fotos.length > 1 && (
                                              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[9px] font-bold px-1 py-0.2 rounded-full border border-white shadow-2xs">
                                                +{orc.fotos.length - 1}
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <div
                                            onClick={() => setExpandedOrcamentoId(isExpanded ? null : orc.id)}
                                            className="w-11 h-11 rounded-lg border border-dashed border-slate-250 bg-slate-50 flex flex-col items-center justify-center text-slate-300 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer mx-auto"
                                            title="Sem foto. Clique para expandir e anexar fotos."
                                          >
                                            <ImageIcon size={18} />
                                          </div>
                                        )}
                                      </td>
                                    )}

                                    {/* Descrição do Produto */}
                                    {isColVisible('descricao') && (
                                      <td className="py-3 px-3 font-extrabold text-slate-900">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span>{orc.descricao}</span>
                                          {orc.codigo && (
                                            <span className="bg-slate-100 text-slate-600 text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-200 font-bold" title="Código de referência">
                                              Ref: {orc.codigo}
                                            </span>
                                          )}
                                          {orc.opcoes && orc.opcoes.length > 0 && (
                                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[9px] font-mono px-1.5 py-0.5 rounded border border-amber-200 font-bold" title={`${orc.opcoes.length} opções de orçamento`}>
                                              {orc.opcoes.length} Opções
                                            </span>
                                          )}
                                          {orc.fotos && orc.fotos.length > 0 && (
                                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[9px] font-mono px-1.5 py-0.5 rounded border border-blue-100 font-bold" title={`${orc.fotos.length} foto(s) anexadas`}>
                                              <ImageIcon size={10} />
                                              {orc.fotos.length}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                    )}

                                    {/* Tipo */}
                                    {isColVisible('tipo') && (
                                      <td className="py-3 px-3 whitespace-nowrap">
                                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase border border-slate-200">
                                          {orc.tipo_produto || 'embalagem'}
                                        </span>
                                      </td>
                                    )}

                                    {/* Material Base */}
                                    {isColVisible('material') && (
                                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                                        {orc.material || 'N/A'}
                                      </td>
                                    )}

                                    {/* Dimensões */}
                                    {isColVisible('dimensoes') && (
                                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                                        {orc.dimensoes || 'N/A'}
                                      </td>
                                    )}

                                    {/* Medida do Papel & Facas */}
                                    {isColVisible('medida_papel_facas') && (
                                      <td className="py-3 px-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                                        {orc.medida_papel_facas ? (
                                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-bold text-slate-800 border border-slate-200">
                                            {orc.medida_papel_facas}
                                          </span>
                                        ) : (
                                          <span className="text-slate-300">-</span>
                                        )}
                                      </td>
                                    )}

                                    {/* Cores / Faca */}
                                    {isColVisible('cores_faca') && (
                                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                                        {orc.opcoes && orc.opcoes.length > 0 ? (
                                          <div className="flex flex-col gap-1">
                                            {orc.opcoes.map((op, opIdx) => (
                                              <span key={op.id || opIdx} className="bg-slate-100 text-slate-700 text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-200 font-medium whitespace-nowrap">
                                                {op.nome}: <strong>{op.cores_quantidade || 0}c | {op.contatos_faca || 1}f</strong>
                                              </span>
                                            ))}
                                          </div>
                                        ) : (
                                          <span>{orc.cores_quantidade || 0}c | {orc.contatos_faca || 1}f</span>
                                        )}
                                      </td>
                                    )}

                                    {/* Markup */}
                                    {!isVendedorMode && isColVisible('markup') && (
                                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                                        {orc.markup}%
                                      </td>
                                    )}

                                    {/* Acerto */}
                                    {!isVendedorMode && isColVisible('acerto') && (
                                      <td className="py-3 px-3 text-center font-mono text-slate-600">
                                        {orc.folhas_acerto ?? 50} fls
                                      </td>
                                    )}

                                    {/* Lotes e Preços Unitários */}
                                    {isColVisible('precos') && (() => {
                                      const discount = getDesconto(orc.id);
                                      return (
                                        <td className="py-3 px-3">
                                          {/* Barra de Ajuste de Desconto no Item */}
                                          <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-150">
                                            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">
                                              Preços Unitários:
                                            </span>
                                            <div className="flex items-center gap-1 bg-amber-50/90 border border-amber-200 rounded-md px-1.5 py-0.5" title="Aplicar % de desconto comercial na tabela inteira deste item">
                                              <Percent size={10} className="text-amber-700 shrink-0" />
                                              <span className="text-[9px] font-bold text-amber-900 font-sans">Desc:</span>
                                              <input
                                                type="number"
                                                min="0"
                                                max="80"
                                                step="1"
                                                value={discount || ''}
                                                onChange={(e) => setDesconto(orc.id, Number(e.target.value))}
                                                placeholder="0"
                                                className="w-8 text-[10px] font-mono font-black text-amber-900 bg-white border border-amber-300 rounded px-1 py-0 text-center focus:outline-none focus:border-amber-500"
                                              />
                                              <span className="text-[9px] font-mono text-amber-800 font-bold">%</span>
                                            </div>
                                          </div>

                                          {orc.opcoes && orc.opcoes.length > 0 ? (
                                            <div className="space-y-1.5 py-0.5 min-w-[240px]">
                                              {orc.opcoes.map((op, opIdx) => (
                                                <div key={op.id || opIdx} className="bg-blue-50/50 border border-blue-100/80 rounded-lg p-1.5 space-y-1">
                                                  <div className="text-[10px] font-black text-blue-900 font-sans flex items-center justify-between gap-2">
                                                    <span>{op.nome}</span>
                                                    <span className="text-[9px] font-mono font-bold text-blue-700 bg-white px-1.5 py-0.2 rounded border border-blue-200">
                                                      {op.cores_quantidade || 0} Cores
                                                    </span>
                                                  </div>
                                                  <div className="flex flex-wrap gap-1">
                                                    {op.resultados && op.resultados.map((res, rIdx) => {
                                                      const origPrice = res.precoVendaUnitario;
                                                      const finalPrice = computeDiscountedUnitPrice(origPrice, discount);
                                                      return (
                                                        <span key={rIdx} className="bg-white border border-slate-200 text-slate-700 text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1 whitespace-nowrap shadow-3xs">
                                                          <span className="text-slate-400 font-medium">{res.quantidade.toLocaleString('pt-BR')}un:</span>
                                                          {discount > 0 ? (
                                                            <>
                                                              <span className="text-slate-400 line-through text-[9px]">R$ {origPrice.toFixed(4)}</span>
                                                              <strong className="text-emerald-700 font-black">R$ {finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</strong>
                                                            </>
                                                          ) : (
                                                            <strong className="text-blue-700 font-black">R$ {origPrice.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</strong>
                                                          )}
                                                        </span>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="flex flex-wrap gap-1.5">
                                              {orc.resultados && orc.resultados.map((res, rIdx) => {
                                                const origPrice = res.precoVendaUnitario;
                                                const finalPrice = computeDiscountedUnitPrice(origPrice, discount);
                                                return (
                                                  <span key={rIdx} className="bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1 whitespace-nowrap shadow-3xs">
                                                    <span className="text-slate-400 font-medium">{res.quantidade.toLocaleString('pt-BR')}un:</span>
                                                    {discount > 0 ? (
                                                      <>
                                                        <span className="text-slate-400 line-through text-[9px]">R$ {origPrice.toFixed(4)}</span>
                                                        <strong className="text-emerald-700 font-black">R$ {finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</strong>
                                                      </>
                                                    ) : (
                                                      <strong className="text-blue-700 font-black">R$ {origPrice.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</strong>
                                                    )}
                                                  </span>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </td>
                                      );
                                    })()}

                                    {/* Data */}
                                    {isColVisible('data') && (
                                      <td className="py-3 px-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                                        {new Date(orc.data_criacao).toLocaleDateString('pt-BR')}
                                      </td>
                                    )}

                                    {/* Ações */}
                                    {isColVisible('acoes') && (
                                      <td className="py-3 px-3 text-right whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-1">
                                          {/* Reabrir para edição completa (Fluxo, Papel, etc.) */}
                                          {!isVendedorMode && (
                                            <button
                                              type="button"
                                              onClick={() => handleCarregarOrcamentoParaEdicaoCompleta(orc)}
                                              className="text-slate-500 hover:text-amber-600 p-1.5 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer"
                                              title="Reabrir no Simulador Completo (Editar Fluxo, Papel, Insumos e Fórmulas)"
                                            >
                                              <FolderOpen size={15} />
                                            </button>
                                          )}

                                          {/* Edição Rápida da Ficha */}
                                          {!isVendedorMode && (
                                            <button
                                              type="button"
                                              onClick={() => setEditingOrcamento(orc)}
                                              className="text-slate-500 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                                              title="Editar Ficha e Parâmetros Rápidos"
                                            >
                                              <Edit3 size={15} />
                                            </button>
                                          )}

                                          <button
                                            type="button"
                                            onClick={() => {
                                              const discount = getDesconto(orc.id);
                                              let text = `*PROPOSTA COMERCIAL: ${orc.descricao.toUpperCase()}*\n`;
                                              text += `Ref Código: ${orc.codigo || 'AVULSO'}\n`;
                                              text += `Dimensões: ${orc.dimensoes || 'N/A'}\n`;
                                              text += `Material: ${orc.material || 'N/A'}\n`;
                                              if (discount > 0) {
                                                text += `*DESCONTO COMERCIAL APLICADO: ${discount}%*\n`;
                                              }

                                              if (orc.opcoes && orc.opcoes.length > 0) {
                                                text += `\n*OPÇÕES DE COTAÇÃO DISPONÍVEIS:*\n\n`;
                                                orc.opcoes.forEach((op, opIdx) => {
                                                  text += `--- OPÇÃO ${opIdx + 1}: ${op.nome.toUpperCase()} (${op.cores_quantidade || 0} Cores, ${op.contatos_faca || 1} Faca) ---\n`;
                                                  text += `TABELA DE PREÇOS POR LOTE:\n`;
                                                  op.resultados.forEach(res => {
                                                    const finalUnit = computeDiscountedUnitPrice(res.precoVendaUnitario, discount);
                                                    const finalTotal = finalUnit * res.quantidade;
                                                    text += `• Lote ${res.quantidade.toLocaleString('pt-BR')} un: R$ ${finalUnit.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}/un (Total: R$ ${finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})\n`;
                                                  });
                                                  text += `\n`;
                                                });
                                              } else {
                                                text += `Cores: ${orc.cores_quantidade || 0} cores\n\n`;
                                                text += `*TABELA DE PREÇOS POR LOTE:*\n`;
                                                orc.resultados.forEach(res => {
                                                  const finalUnit = computeDiscountedUnitPrice(res.precoVendaUnitario, discount);
                                                  const finalTotal = finalUnit * res.quantidade;
                                                  text += `• Lote ${res.quantidade.toLocaleString('pt-BR')} un: R$ ${finalUnit.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}/un (Total: R$ ${finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})\n`;
                                                });
                                              }
                                              navigator.clipboard.writeText(text);
                                              alert(`Proposta comercial copiada para a área de transferência!`);
                                            }}
                                            className="text-slate-500 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                                            title="Copiar Texto da Proposta"
                                          >
                                            <Copy size={15} />
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => setPrintOrcamento(orc)}
                                            className="text-slate-500 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                                            title="Imprimir / Proposta PDF"
                                          >
                                            <Printer size={15} />
                                          </button>

                                          {!isVendedorMode && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                triggerConfirm(
                                                  'Excluir Orçamento Salvo',
                                                  `Deseja realmente remover o orçamento "${orc.descricao}" do histórico? Esta ação é permanente.`,
                                                  () => excluirOrcamentoSalvo(orc.id),
                                                  { confirmLabel: 'Excluir', variant: 'danger' }
                                                );
                                              }}
                                              className="text-slate-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                              title="Excluir Orçamento"
                                            >
                                              <Trash2 size={15} />
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    )}
                                  </tr>

                                  {/* PAINEL DE DETALHES EXPANDIDO NA TABELA EXCEL */}
                                  {isExpanded && (
                                    <tr className="bg-slate-50/80 border-b border-slate-200">
                                      <td colSpan={visibleColsCount} className="p-5">
                                        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 shadow-xs">
                                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                            <h5 className="font-sans text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                              <Info size={14} className="text-blue-600" />
                                              Detalhes e Fotos do Produto: {orc.descricao}
                                            </h5>
                                            <span className="text-[10px] font-mono text-slate-400">
                                              Criado em {new Date(orc.data_criacao).toLocaleString('pt-BR')}
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Galeria de Fotos */}
                                            <div>
                                              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-2">
                                                Fotos e Amostras do Lote:
                                              </span>
                                              {orc.fotos && orc.fotos.length > 0 ? (
                                                <div className="grid grid-cols-3 gap-2 mb-3">
                                                  {orc.fotos.map((foto, idx) => (
                                                    <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-50 group">
                                                      <img src={foto} alt={`Amostra ${idx + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                                      <button
                                                        type="button"
                                                        onClick={() => handleRemovePhotoFromOrcamento(orc, idx)}
                                                        className="absolute top-1 right-1 bg-red-600 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-2xs"
                                                        title="Remover Foto"
                                                      >
                                                        <X size={10} />
                                                      </button>
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                <p className="text-[11px] text-slate-400 italic mb-3">Nenhuma foto cadastrada para este produto.</p>
                                              )}

                                              {/* Upload Rápido de Foto na Tabela */}
                                              <div className="flex items-center gap-2">
                                                <label className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 text-[10px] font-sans font-bold text-slate-600 cursor-pointer transition-all">
                                                  <Upload size={12} className="text-blue-600" />
                                                  <span>Adicionar Foto Local</span>
                                                  <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleImageFileChange(e, (base64) => handleAddPhotoToOrcamento(orc, base64))}
                                                    className="hidden"
                                                  />
                                                </label>
                                              </div>
                                            </div>

                                            {/* Observações de Produção */}
                                            <div>
                                              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-2">
                                                Observações de Produção & Comercial:
                                              </span>
                                              <textarea
                                                value={orc.observacoes || ''}
                                                placeholder="Adicione observações para este orçamento..."
                                                onChange={(e) => {
                                                  const updated: OrcamentoSalvo = {
                                                    ...orc,
                                                    observacoes: e.target.value
                                                  };
                                                  editarOrcamentoSalvo(updated);
                                                }}
                                                className="w-full rounded-lg border border-slate-200 p-2.5 text-[11px] font-sans text-slate-700 bg-white placeholder-slate-400 focus:border-blue-500 focus:outline-none resize-none h-20"
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      /* ================= MODO CARDS / FICHAS INDIVIDUAIS ================= */
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {filtered.map(orc => {
                          return (
                            <div key={orc.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                              {/* Top Bar da Ficha do Orçamento */}
                              <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold font-mono text-blue-700 border border-blue-100">
                                      {orc.codigo || 'AVULSO'}
                                    </span>
                                    {orc.opcoes && orc.opcoes.length > 0 && (
                                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold font-mono text-amber-800 border border-amber-200">
                                        {orc.opcoes.length} Opções de Orçamento
                                      </span>
                                    )}
                                    {!isVendedorMode && (
                                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                        Markup: {orc.markup}%
                                      </span>
                                    )}
                                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                                      {orc.tipo_produto}
                                    </span>
                                  </div>
                                  <h4 className="font-sans text-sm font-black text-slate-800 mt-1.5 leading-tight">
                                    {orc.descricao}
                                  </h4>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 font-sans">
                                    <Calendar size={11} />
                                    <span>Criado em {new Date(orc.data_criacao).toLocaleString('pt-BR')}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  {!isVendedorMode && (
                                    <button
                                      type="button"
                                      onClick={() => handleCarregarOrcamentoParaEdicaoCompleta(orc)}
                                      className="text-slate-400 hover:text-amber-600 p-1.5 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer"
                                      title="Reabrir no Simulador Completo (Editar Fluxo, Papel, Insumos e Fórmulas)"
                                    >
                                      <FolderOpen size={16} />
                                    </button>
                                  )}
                                  {!isVendedorMode && (
                                    <button
                                      type="button"
                                      onClick={() => setEditingOrcamento(orc)}
                                      className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                                      title="Editar Ficha e Parâmetros Rápidos"
                                    >
                                      <Edit3 size={16} />
                                    </button>
                                  )}
                                  {!isVendedorMode && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        triggerConfirm(
                                          'Excluir Orçamento Salvo',
                                          `Deseja realmente remover o orçamento "${orc.descricao}" do histórico? Esta ação é permanente.`,
                                          () => excluirOrcamentoSalvo(orc.id),
                                          { confirmLabel: 'Excluir', variant: 'danger' }
                                        );
                                      }}
                                      className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                      title="Excluir Orçamento"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Galeria de Fotos e Imagens */}
                              <div className="p-5 border-b border-slate-100 bg-white">
                                <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-2.5">
                                  Fotos e Modelos do Produto:
                                </span>

                                {orc.fotos && orc.fotos.length > 0 ? (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                                    {orc.fotos.map((foto, idx) => (
                                      <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group">
                                        <img 
                                          src={foto} 
                                          alt={`Foto ${idx + 1}`} 
                                          referrerPolicy="no-referrer"
                                          className="w-full h-full object-cover"
                                        />
                                        <button
                                          onClick={() => handleRemovePhotoFromOrcamento(orc, idx)}
                                          className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
                                          title="Remover Foto"
                                        >
                                          <X size={10} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-400 mb-4 bg-slate-50/20">
                                    <ImageIcon className="mx-auto h-8 w-8 text-slate-300 mb-1.5" />
                                    <p className="text-[11px] font-sans">Nenhuma foto adicionada para este modelo orçado.</p>
                                  </div>
                                )}

                                {/* Adicionar Fotos Box */}
                                <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 space-y-3">
                                  <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="flex-1">
                                      <label className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 text-[11px] font-sans font-bold text-slate-600 shadow-3xs cursor-pointer transition-all">
                                        <Upload size={12} className="text-blue-500" />
                                        <span>Upload de Foto Local</span>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) => handleImageFileChange(e, (base64) => handleAddPhotoToOrcamento(orc, base64))}
                                          className="hidden"
                                        />
                                      </label>
                                    </div>

                                    <div className="flex-1 flex gap-2">
                                      <input
                                        type="text"
                                        placeholder="Ou cole URL da foto..."
                                        id={`input-url-photo-${orc.id}`}
                                        className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-sans text-slate-600 bg-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            const input = e.currentTarget;
                                            if (input.value.trim()) {
                                              handleAddPhotoToOrcamento(orc, input.value.trim());
                                              input.value = '';
                                            }
                                          }
                                        }}
                                      />
                                      <button
                                        onClick={() => {
                                          const input = document.getElementById(`input-url-photo-${orc.id}`) as HTMLInputElement;
                                          if (input && input.value.trim()) {
                                            handleAddPhotoToOrcamento(orc, input.value.trim());
                                            input.value = '';
                                          }
                                        }}
                                        className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-[11px] font-sans font-bold shadow-3xs cursor-pointer transition-all"
                                      >
                                        Add
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Especificações Técnicas e Roteiro */}
                              <div className="p-5 border-b border-slate-100 bg-slate-50/25 grid grid-cols-2 gap-4 text-xs font-sans text-slate-600">
                                <div>
                                  <p className="text-[10px] uppercase font-mono font-bold text-slate-400">Especificações:</p>
                                  <ul className="mt-1.5 space-y-1">
                                    <li><strong>Dimensões:</strong> {orc.dimensoes || 'N/A'}</li>
                                    <li><strong>Material Base:</strong> {orc.material || 'N/A'}</li>
                                    {orc.medida_papel_facas && (
                                      <li>
                                        <strong>Medida Papel & Facas:</strong>{' '}
                                        <span className="font-mono bg-blue-50 text-blue-800 px-1 rounded border border-blue-100 font-semibold">
                                          {orc.medida_papel_facas}
                                        </span>
                                      </li>
                                    )}
                                    {orc.opcoes && orc.opcoes.length > 0 ? (
                                      <li>
                                        <strong>Opções de Cores/Faca:</strong>
                                        <div className="mt-1 space-y-1">
                                          {orc.opcoes.map((op, opIdx) => (
                                            <div key={op.id || opIdx} className="bg-slate-100 rounded px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-700">
                                              {op.nome}: {op.cores_quantidade || 0}c | {op.contatos_faca || 1}f
                                            </div>
                                          ))}
                                        </div>
                                      </li>
                                    ) : (
                                      <>
                                        <li><strong>Cores Impressão:</strong> {orc.cores_quantidade || 0} cores</li>
                                        <li><strong>Faca (Rendimento):</strong> {orc.contatos_faca || 1} contatos</li>
                                      </>
                                    )}
                                    {orc.adicional_acabamento_nome && (
                                      <li><strong>Acabamento:</strong> {orc.adicional_acabamento_nome} {orc.adicional_acabamento_valor ? `(+ R$ ${orc.adicional_acabamento_valor.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}/un)` : ''}</li>
                                    )}
                                  </ul>
                                </div>
                                <div className="flex flex-col justify-between">
                                  <div>
                                    <p className="text-[10px] uppercase font-mono font-bold text-slate-400">Observações de Produção:</p>
                                    <textarea
                                      value={orc.observacoes || ''}
                                      placeholder="Clique para adicionar notas e comentários..."
                                      onChange={(e) => {
                                        const updated: OrcamentoSalvo = {
                                          ...orc,
                                          observacoes: e.target.value
                                        };
                                        editarOrcamentoSalvo(updated);
                                      }}
                                      className="w-full mt-1.5 rounded-lg border border-slate-200 p-2 text-[11px] font-sans text-slate-600 bg-white placeholder-slate-400 focus:border-blue-500 focus:outline-none resize-none h-16"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Tabela de Preços por Quantidades Orçadas */}
                              {(() => {
                                const discount = getDesconto(orc.id);
                                return (
                                  <div className="p-5 bg-white flex-1 flex flex-col justify-between">
                                    <div>
                                      {/* Desconto Comercial do Item */}
                                      <div className="mb-3.5 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5">
                                          <div className="p-1 rounded bg-amber-500 text-white">
                                            <Percent size={11} />
                                          </div>
                                          <div>
                                            <span className="text-[10px] font-black text-amber-950 block leading-tight">
                                              Desconto Comercial no Lote
                                            </span>
                                            <span className="text-[9px] text-amber-700">
                                              Ajusta toda a tabela deste produto
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                          <div className="flex items-center gap-1">
                                            {[0, 5, 10, 15, 20].map((pct) => (
                                              <button
                                                key={pct}
                                                type="button"
                                                onClick={() => setDesconto(orc.id, pct)}
                                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                                                  discount === pct
                                                    ? 'bg-amber-600 text-white shadow-2xs'
                                                    : 'bg-white text-amber-900 border border-amber-200 hover:bg-amber-100'
                                                }`}
                                              >
                                                {pct}%
                                              </button>
                                            ))}
                                          </div>

                                          <div className="flex items-center gap-0.5 bg-white border border-amber-300 rounded px-1.5 py-0.5">
                                            <input
                                              type="number"
                                              min="0"
                                              max="80"
                                              step="1"
                                              value={discount || ''}
                                              onChange={(e) => setDesconto(orc.id, Number(e.target.value))}
                                              placeholder="0"
                                              className="w-7 text-[10px] font-mono font-black text-amber-900 text-center focus:outline-none"
                                            />
                                            <span className="text-[9px] font-mono font-bold text-amber-800">%</span>
                                          </div>
                                        </div>
                                      </div>

                                      <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-2">
                                        Tabela de Cotação Dinâmica p/ Lote:
                                      </span>

                                      {orc.opcoes && orc.opcoes.length > 0 ? (
                                        <div className="space-y-4">
                                          {orc.opcoes.map((op, opIdx) => (
                                            <div key={op.id || opIdx} className="overflow-hidden rounded-xl border border-blue-150 bg-slate-50/30">
                                              <div className="bg-blue-50/80 px-3 py-1.5 border-b border-blue-100 flex items-center justify-between text-xs font-bold text-blue-900">
                                                <span>Option {opIdx + 1}: {op.nome}</span>
                                                <span className="text-[10px] font-mono text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                                                  {op.cores_quantidade || 0} Cores | {op.contatos_faca || 1} Faca
                                                </span>
                                              </div>
                                              <table className="w-full text-left border-collapse text-xs">
                                                <thead>
                                                  <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-mono text-slate-400 uppercase">
                                                    <th className="py-2 px-3">Lote (Qty)</th>
                                                    <th className="py-2 px-3 text-right">Preço Unitário</th>
                                                    <th className="py-2 px-3 text-right">Faturamento Total</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                  {op.resultados && op.resultados.map((res, rIdx) => {
                                                    const origPrice = res.precoVendaUnitario;
                                                    const finalPrice = computeDiscountedUnitPrice(origPrice, discount);
                                                    const finalTotal = finalPrice * res.quantidade;
                                                    return (
                                                      <tr key={rIdx} className="hover:bg-slate-50/50">
                                                        <td className="py-1.5 px-3 font-mono font-bold text-slate-600">
                                                          {res.quantidade.toLocaleString('pt-BR')} un
                                                        </td>
                                                        <td className="py-1.5 px-3 text-right font-mono">
                                                          {discount > 0 ? (
                                                            <div className="flex items-center justify-end gap-1.5">
                                                              <span className="text-slate-400 line-through text-[10px]">R$ {origPrice.toFixed(4)}</span>
                                                              <strong className="text-emerald-700 font-black">R$ {finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</strong>
                                                            </div>
                                                          ) : (
                                                            <strong className="text-blue-700 font-extrabold">R$ {origPrice.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</strong>
                                                          )}
                                                        </td>
                                                        <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-700">
                                                          R$ {finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                      </tr>
                                                    );
                                                  })}
                                                </tbody>
                                              </table>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="overflow-hidden rounded-xl border border-slate-150">
                                          <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                              <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-mono text-slate-400 uppercase">
                                                <th className="py-2 px-3">Lote (Qty)</th>
                                                <th className="py-2 px-3 text-right">Preço Unitário</th>
                                                <th className="py-2 px-3 text-right">Faturamento Total</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                              {orc.resultados && orc.resultados.map((res, rIdx) => {
                                                const origPrice = res.precoVendaUnitario;
                                                const finalPrice = computeDiscountedUnitPrice(origPrice, discount);
                                                const finalTotal = finalPrice * res.quantidade;
                                                return (
                                                  <tr key={rIdx} className="hover:bg-slate-50/50">
                                                    <td className="py-1.5 px-3 font-mono font-bold text-slate-600">
                                                      {res.quantidade.toLocaleString('pt-BR')} un
                                                    </td>
                                                    <td className="py-1.5 px-3 text-right font-mono">
                                                      {discount > 0 ? (
                                                        <div className="flex items-center justify-end gap-1.5">
                                                          <span className="text-slate-400 line-through text-[10px]">R$ {origPrice.toFixed(4)}</span>
                                                          <strong className="text-emerald-700 font-black">R$ {finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</strong>
                                                        </div>
                                                      ) : (
                                                        <strong className="text-blue-700 font-extrabold">R$ {origPrice.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</strong>
                                                      )}
                                                    </td>
                                                    <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-700">
                                                      R$ {finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                      <button
                                        onClick={() => {
                                          let text = `*PROPOSTA COMERCIAL: ${orc.descricao.toUpperCase()}*\n`;
                                          text += `Ref Código: ${orc.codigo || 'AVULSO'}\n`;
                                          text += `Dimensões: ${orc.dimensoes || 'N/A'}\n`;
                                          text += `Material: ${orc.material || 'N/A'}\n`;
                                          if (discount > 0) {
                                            text += `*DESCONTO COMERCIAL APLICADO: ${discount}%*\n`;
                                          }

                                          if (orc.opcoes && orc.opcoes.length > 0) {
                                            text += `\n*OPÇÕES DE COTAÇÃO DISPONÍVEIS:*\n\n`;
                                            orc.opcoes.forEach((op, opIdx) => {
                                              text += `--- OPÇÃO ${opIdx + 1}: ${op.nome.toUpperCase()} (${op.cores_quantidade || 0} Cores, ${op.contatos_faca || 1} Faca) ---\n`;
                                              text += `TABELA DE PREÇOS POR LOTE:\n`;
                                              op.resultados.forEach(res => {
                                                const finalUnit = computeDiscountedUnitPrice(res.precoVendaUnitario, discount);
                                                const finalTotal = finalUnit * res.quantidade;
                                                text += `• Lote ${res.quantidade.toLocaleString('pt-BR')} un: R$ ${finalUnit.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}/un (Total: R$ ${finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})\n`;
                                              });
                                              text += `\n`;
                                            });
                                          } else {
                                            text += `Cores: ${orc.cores_quantidade || 0} cores\n\n`;
                                            text += `*TABELA DE PREÇOS POR LOTE:*\n`;
                                            orc.resultados.forEach(res => {
                                              const finalUnit = computeDiscountedUnitPrice(res.precoVendaUnitario, discount);
                                              const finalTotal = finalUnit * res.quantidade;
                                              text += `• Lote ${res.quantidade.toLocaleString('pt-BR')} un: R$ ${finalUnit.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}/un (Total: R$ ${finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})\n`;
                                            });
                                          }
                                          navigator.clipboard.writeText(text);
                                          alert(`Proposta comercial copiada para a área de transferência!`);
                                        }}
                                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-[11px] font-sans font-bold text-slate-600 shadow-3xs cursor-pointer transition-all"
                                      >
                                        <Copy size={12} className="text-slate-500" />
                                        Copiar Proposta
                                      </button>

                                      <button
                                        onClick={() => setPrintOrcamento(orc)}
                                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-[11px] font-sans font-bold text-slate-600 shadow-3xs cursor-pointer transition-all"
                                      >
                                        <Printer size={12} className="text-blue-500" />
                                        Gerar PDF
                                      </button>

                                      <button
                                        onClick={() => {
                                          let csv = `Orcamento Homero Embalagens - Modelo: ${orc.codigo || ''} ${orc.descricao}\n`;
                                          if (!isVendedorMode) {
                                            csv += `Markup Praticado: ${orc.markup}%\n`;
                                          }
                                          if (discount > 0) {
                                            csv += `Desconto Comercial Aplicado: ${discount}%\n`;
                                          }
                                          csv += `Data de Emissão: ${new Date(orc.data_criacao).toLocaleDateString('pt-BR')}\n\n`;
                                          
                                          if (orc.opcoes && orc.opcoes.length > 0) {
                                            csv += `Opcao;Cores;Faca;Quantidade;Preço Unitário (R$);Faturamento Total (R$)\n`;
                                            orc.opcoes.forEach(op => {
                                              (op.resultados || []).forEach(res => {
                                                const finalUnit = computeDiscountedUnitPrice(res.precoVendaUnitario, discount);
                                                const finalTotal = finalUnit * res.quantidade;
                                                csv += `"${op.nome}";${op.cores_quantidade || 0};${op.contatos_faca || 1};${res.quantidade};${finalUnit.toFixed(4)};${finalTotal.toFixed(2)}\n`;
                                              });
                                            });
                                          } else {
                                            csv += `Quantidade;Preço Unitário (R$);Faturamento Total (R$)\n`;
                                            orc.resultados.forEach(res => {
                                              const finalUnit = computeDiscountedUnitPrice(res.precoVendaUnitario, discount);
                                              const finalTotal = finalUnit * res.quantidade;
                                              csv += `${res.quantidade};${finalUnit.toFixed(4)};${finalTotal.toFixed(2)}\n`;
                                            });
                                          }

                                          const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
                                          const url = URL.createObjectURL(blob);
                                          const link = document.createElement('a');
                                          link.setAttribute('href', url);
                                          link.setAttribute('download', `Orcamento_Salvo_${orc.codigo}_${orc.descricao.replace(/\s+/g, '_')}.csv`);
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                        }}
                                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-[11px] font-sans font-bold text-slate-600 shadow-3xs cursor-pointer transition-all"
                                      >
                                        <FileSpreadsheet size={12} className="text-emerald-500" />
                                        Exportar CSV
                                      </button>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

        </div>
      </div>

      {/* RENDER DE IMPRESSÃO (Oculto em tela e visível apenas em Window.print()) */}
      <div className="hidden print-report p-8 space-y-6 bg-white text-slate-950">
        
        {/* CABEÇALHO DO RELATÓRIO */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-tight">HOMERO EMBALAGENS S.A.</h1>
            <p className="text-[10px] uppercase font-mono text-slate-500 font-semibold tracking-wide">
              Relatório Comercial PCP • Formação de Preço Integrada
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold font-mono">DATA DE EMISSÃO: {new Date().toLocaleDateString('pt-BR')}</p>
            <p className="text-[9px] font-mono text-slate-500">VALORES EXPRESSOS EM MOEDA CORRENTE (BRL)</p>
          </div>
        </div>

        {/* METADADOS DO MODELO */}
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-350 p-4 text-xs">
          <div>
            <p className="font-bold text-[10px] uppercase text-slate-500">Modelo Solicitado</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">[{selectedModelo.codigo || 'S/C'}] {selectedModelo.descricao}</p>
            <p className="mt-1"><b>Dimensões:</b> {selectedModelo.dimensoes || 'N/A'}</p>
            <p><b>Material Base:</b> {selectedModelo.material}</p>
          </div>
          <div>
            <p className="font-bold text-[10px] uppercase text-slate-500">Parâmetros Comerciais</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">Markup de Lucro Praticado: {markup}%</p>
            <p className="mt-1"><b>Cores de Impressão:</b> {selectedModelo.cores_quantidade || 0} cores</p>
            <p><b>Tipo do Roteiro:</b> {selectedModelo.tipo_produto?.toUpperCase() || 'EMBALAGEM'}</p>
          </div>
        </div>

        {/* COMPOSIÇÃO DOS INSUMOS UTILIZADOS NO CÁLCULO */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide border-b border-slate-300 pb-1">
            Fórmula de Matérias-Primas e Insumos Considerados
          </h3>
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-slate-400 font-mono text-[10px] uppercase text-slate-500">
                <th className="py-1 px-2">Insumo / Matéria-Prima</th>
                <th className="py-1 px-2">Fator de Consumo</th>
                <th className="py-1 px-2 text-right">Custo Unitário Referencial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {orcamentoResultados[0]?.detalheInsumos.map((item, idx) => {
                return (
                  <tr key={idx}>
                    <td className="py-1.5 px-2 font-bold text-slate-800">{item.nome}</td>
                    <td className="py-1.5 px-2 font-mono">{item.fator.toFixed(4)}</td>
                    <td className="py-1.5 px-2 text-right font-mono">R$ {item.unitPrice.toFixed(4)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* SEQUÊNCIA DE MAQUINÁRIOS DO ROTEIRO */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide border-b border-slate-300 pb-1">
            Roteiro Industrial e Processos de Maquinário
          </h3>
          <div className="flex flex-wrap gap-2 text-[10px]">
            {selectedModelo.roteiro.map((maqId, idx) => {
              const maq = maquinas.find(m => m.id === maqId);
              return (
                <div key={idx} className="border border-slate-300 rounded px-2.5 py-1.5 bg-slate-50 font-mono">
                  <span className="font-bold text-slate-900">Etapa #{idx + 1}:</span> {maq?.nome || maqId} ({maq?.tipo || 'N/A'})
                </div>
              );
            })}
          </div>
        </div>

        {/* TABELA DE PREÇOS OFICIAL PARA IMPRESSÃO */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wide border-b-2 border-slate-900 pb-1">
            Tabela de Preços e Escala Comercial por Quantidade (Lotes)
          </h3>
          <table className="w-full border-collapse text-left text-[10.5px]">
            <thead>
              <tr className="border-b-2 border-slate-400 bg-slate-100 font-mono text-[9px] uppercase tracking-wider text-slate-600">
                <th className="py-2 px-3">Quantidade</th>
                <th className="py-2 px-3">Custo Insumos</th>
                <th className="py-2 px-3">Custo Serviço</th>
                <th className="py-2 px-3">Custo Total</th>
                <th className="py-2 px-3 text-right">Preço Total Lote</th>
                <th className="py-2 px-3 text-right font-bold bg-slate-200">Preço Unitário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 text-slate-800">
              {orcamentoResultados.map((res, idx) => {
                return (
                  <tr key={idx} className="font-mono">
                    <td className="py-2 px-3 font-bold text-slate-900">{res.qty.toLocaleString('pt-BR')} un</td>
                    <td className="py-2 px-3">R$ {res.custoInsumosTotal.toFixed(2)}</td>
                    <td className="py-2 px-3">R$ {res.custoServicoTotal.toFixed(2)}</td>
                    <td className="py-2 px-3 font-semibold">R$ {res.custoFabricaTotal.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-bold">R$ {res.precoVendaTotal.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-extrabold bg-slate-100 text-slate-900">
                      R$ {res.precoVendaUnitario.toFixed(4)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ASSINATURA / RODAPÉ DO DOCUMENTO */}
        <div className="pt-12 flex justify-between text-[10px] border-t border-slate-300">
          <div>
            <p className="font-bold text-slate-500">Homero Embalagens - Gestão PCP</p>
            <p>Gerado de forma segura e automatizada via PCP Homero.</p>
          </div>
          <div className="text-right">
            <p className="border-t border-slate-400 w-48 pt-1 text-center font-bold">Francisco P. Junior</p>
            <p className="text-center text-slate-500">Diretor Comercial / PCP</p>
          </div>
        </div>

      </div>

      {/* MODAL DE SALVAR ORÇAMENTO */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs no-print">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Salvar Cotação de Produto
                </h3>
              </div>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveOrcamento} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Nome / Descrição Comercial do Produto *
                  </label>
                  <input
                    type="text"
                    required
                    value={saveOrcamentoNome}
                    onChange={(e) => setSaveOrcamentoNome(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs font-sans text-slate-800 bg-white focus:border-blue-500 focus:outline-none"
                    placeholder="Ex: Sacola Kraft Homero M"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Código de Referência
                  </label>
                  <input
                    type="text"
                    value={saveOrcamentoCodigo}
                    onChange={(e) => setSaveOrcamentoCodigo(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs font-sans text-slate-800 bg-white focus:border-blue-500 focus:outline-none"
                    placeholder="Ex: SAC-KRAFT-M"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Dimensões (cm/un)
                  </label>
                  <input
                    type="text"
                    value={saveOrcamentoDimensoes}
                    onChange={(e) => setSaveOrcamentoDimensoes(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs font-sans text-slate-800 bg-white focus:border-blue-500 focus:outline-none"
                    placeholder="Ex: 24 x 32 x 10"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Material Base
                  </label>
                  <input
                    type="text"
                    value={saveOrcamentoMaterial}
                    onChange={(e) => setSaveOrcamentoMaterial(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs font-sans text-slate-800 bg-white focus:border-blue-500 focus:outline-none"
                    placeholder="Ex: Papel Kraft 120g"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Quantidade de Cores
                  </label>
                  <input
                    type="number"
                    value={saveOrcamentoCores}
                    onChange={(e) => setSaveOrcamentoCores(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs font-sans text-slate-800 bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Medida do Papel & Facas
                  </label>
                  <input
                    type="text"
                    value={saveOrcamentoMedidaPapelFacas}
                    onChange={(e) => setSaveOrcamentoMedidaPapelFacas(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs font-sans text-slate-800 bg-white focus:border-blue-500 focus:outline-none"
                    placeholder="Ex: 66 x 96 cm - 2 facas"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Fotos Iniciais (Opcional)
                </label>
                <div className="flex gap-3 items-center">
                  <label className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 px-3 py-2 text-[11px] font-sans font-bold text-slate-600 shadow-3xs cursor-pointer transition-all">
                    <Upload size={12} className="text-blue-500" />
                    <span>Upload de Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFileChange(e, (base64) => setSaveOrcamentoFotos(prev => [...prev, base64]))}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {saveOrcamentoFotos.length} foto(s) anexada(s)
                  </span>
                </div>

                {saveOrcamentoFotos.length > 0 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                    {saveOrcamentoFotos.map((foto, idx) => (
                      <div key={idx} className="relative w-16 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0 group">
                        <img src={foto} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setSaveOrcamentoFotos(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Observações Comerciais / Produção
                </label>
                <textarea
                  value={saveOrcamentoObs}
                  onChange={(e) => setSaveOrcamentoObs(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs font-sans text-slate-800 bg-white placeholder-slate-400 focus:border-blue-500 focus:outline-none resize-none h-16"
                  placeholder="Ex: Alça torcida de papel, fundo reforçado..."
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-4 py-2 text-xs font-bold shadow-3xs cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold shadow-3xs cursor-pointer transition-all"
                >
                  Gravar Cotação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE ORÇAMENTO */}
      {editingOrcamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs no-print">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Editar Orçamento Salvo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrcamento(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editingOrcamento.descricao.trim()) return;
                await editarOrcamentoSalvo(editingOrcamento);
                setEditingOrcamento(null);
              }} 
              className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Nome / Descrição Comercial do Produto *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingOrcamento.descricao}
                    onChange={(e) => setEditingOrcamento(recalculateSavedOrcamento({ ...editingOrcamento, descricao: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs font-sans text-slate-800 bg-white focus:border-blue-500 focus:outline-none"
                    placeholder="Ex: Sacola Kraft Homero M"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Código de Referência
                  </label>
                  <input
                    type="text"
                    value={editingOrcamento.codigo || ''}
                    onChange={(e) => setEditingOrcamento(recalculateSavedOrcamento({ ...editingOrcamento, codigo: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs font-sans text-slate-800 bg-white focus:border-blue-500 focus:outline-none"
                    placeholder="Ex: SAC-KRAFT-M"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Dimensões (cm/un)
                  </label>
                  <input
                    type="text"
                    value={editingOrcamento.dimensoes || ''}
                    onChange={(e) => setEditingOrcamento(recalculateSavedOrcamento({ ...editingOrcamento, dimensoes: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs font-sans text-slate-800 bg-white focus:border-blue-500 focus:outline-none"
                    placeholder="Ex: 24 x 32 x 10"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Material Base
                  </label>
                  <input
                    type="text"
                    value={editingOrcamento.material || ''}
                    onChange={(e) => setEditingOrcamento(recalculateSavedOrcamento({ ...editingOrcamento, material: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs font-sans text-slate-800 bg-white focus:border-blue-500 focus:outline-none"
                    placeholder="Ex: Papel Kraft 120g"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Quantidade de Cores
                  </label>
                  <input
                    type="number"
                    value={editingOrcamento.cores_quantidade || 0}
                    onChange={(e) => setEditingOrcamento(recalculateSavedOrcamento({ ...editingOrcamento, cores_quantidade: Number(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs font-sans text-slate-800 bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Medida do Papel & Facas
                  </label>
                  <input
                    type="text"
                    value={editingOrcamento.medida_papel_facas || ''}
                    onChange={(e) => setEditingOrcamento(recalculateSavedOrcamento({ ...editingOrcamento, medida_papel_facas: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs font-sans text-slate-800 bg-white focus:border-blue-500 focus:outline-none"
                    placeholder="Ex: 66 x 96 cm - 2 facas"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Markup Praticado (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingOrcamento.markup || 0}
                    onChange={(e) => setEditingOrcamento(recalculateSavedOrcamento({ ...editingOrcamento, markup: Number(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs font-sans text-slate-800 bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Folhas para Acerto
                  </label>
                  <input
                    type="number"
                    value={editingOrcamento.folhas_acerto !== undefined ? editingOrcamento.folhas_acerto : 50}
                    onChange={(e) => setEditingOrcamento(recalculateSavedOrcamento({ ...editingOrcamento, folhas_acerto: Number(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs font-sans text-slate-800 bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Contatos / Faca
                  </label>
                  <input
                    type="number"
                    value={editingOrcamento.contatos_faca || 1}
                    onChange={(e) => setEditingOrcamento(recalculateSavedOrcamento({ ...editingOrcamento, contatos_faca: Number(e.target.value) || 1 }))}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs font-sans text-slate-800 bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Tipo do Produto
                  </label>
                  <select
                    value={editingOrcamento.tipo_produto || 'embalagem'}
                    onChange={(e) => setEditingOrcamento(recalculateSavedOrcamento({ ...editingOrcamento, tipo_produto: e.target.value as any }))}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs font-sans text-slate-800 bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="embalagem">Embalagem</option>
                    <option value="manual">Manual</option>
                    <option value="bolacha">Bolacha</option>
                  </select>
                </div>
              </div>

              {/* Tabela de Preços por Quantidade */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-500">
                    Tabela de Cotação Dinâmica (Lotes)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const updatedRes = [...(editingOrcamento.resultados || [])];
                      updatedRes.push({
                        quantidade: 1000,
                        precoVendaUnitario: 1.5,
                        custoTotal: 1000
                      });
                      setEditingOrcamento(recalculateSavedOrcamento({ ...editingOrcamento, resultados: updatedRes }));
                    }}
                    className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-100 cursor-pointer"
                  >
                    <Plus size={10} />
                    Adicionar Lote
                  </button>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-150">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-mono text-slate-400 uppercase">
                        <th className="py-2 px-3">Quantidade (un)</th>
                        <th className="py-2 px-3">Preço Unitário (R$)</th>
                        <th className="py-2 px-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {editingOrcamento.resultados && editingOrcamento.resultados.map((res, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/50">
                          <td className="py-1.5 px-3">
                            <input
                              type="number"
                              required
                              value={res.quantidade}
                              onChange={(e) => {
                                const updatedRes = [...editingOrcamento.resultados];
                                updatedRes[rIdx] = {
                                  ...res,
                                  quantidade: Number(e.target.value) || 0
                                };
                                setEditingOrcamento(recalculateSavedOrcamento({ ...editingOrcamento, resultados: updatedRes }));
                              }}
                              className="w-24 rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-800 bg-white font-mono"
                            />
                          </td>
                          <td className="py-1.5 px-3">
                            <input
                              type="number"
                              step="0.0001"
                              required
                              value={res.precoVendaUnitario}
                              onChange={(e) => {
                                const updatedRes = [...editingOrcamento.resultados];
                                updatedRes[rIdx] = {
                                  ...res,
                                  precoVendaUnitario: Number(e.target.value) || 0
                                };
                                setEditingOrcamento({ ...editingOrcamento, resultados: updatedRes });
                              }}
                              className="w-32 rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-800 bg-white font-mono"
                            />
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                const updatedRes = editingOrcamento.resultados.filter((_, i) => i !== rIdx);
                                setEditingOrcamento(recalculateSavedOrcamento({ ...editingOrcamento, resultados: updatedRes }));
                              }}
                              className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fotos */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Fotos e Modelos do Produto
                </label>
                {editingOrcamento.fotos && editingOrcamento.fotos.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2 pb-2">
                    {editingOrcamento.fotos.map((foto, idx) => (
                      <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-50 group">
                        <img src={foto} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            const updatedFotos = editingOrcamento.fotos?.filter((_, i) => i !== idx) || [];
                            setEditingOrcamento({ ...editingOrcamento, fotos: updatedFotos });
                          }}
                          className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">Nenhuma foto adicionada.</p>
                )}

                <div className="flex gap-3 items-center pt-1">
                  <label className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 px-3 py-2 text-[11px] font-sans font-bold text-slate-600 shadow-3xs cursor-pointer transition-all">
                    <Upload size={12} className="text-blue-500" />
                    <span>Upload de Nova Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFileChange(e, (base64) => {
                        const updatedFotos = [...(editingOrcamento.fotos || []), base64];
                        setEditingOrcamento({ ...editingOrcamento, fotos: updatedFotos });
                      })}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Observações Comerciais / Produção
                </label>
                <textarea
                  value={editingOrcamento.observacoes || ''}
                  onChange={(e) => setEditingOrcamento({ ...editingOrcamento, observacoes: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs font-sans text-slate-800 bg-white placeholder-slate-400 focus:border-blue-500 focus:outline-none resize-none h-16"
                  placeholder="Ex: Alça torcida de papel, fundo reforçado..."
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const orc = editingOrcamento;
                    setEditingOrcamento(null);
                    handleCarregarOrcamentoParaEdicaoCompleta(orc);
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 px-3.5 py-2 text-xs font-bold shadow-3xs cursor-pointer transition-all"
                  title="Abrir este orçamento no Simulador Completo para alterar fluxo de máquinas, papel, formato de folha, insumos e fórmulas"
                >
                  <FolderOpen size={14} className="text-amber-600" />
                  <span>Edição Completa no Simulador (Fluxo, Papel, etc.)</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setEditingOrcamento(null)}
                    className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-4 py-2 text-xs font-bold shadow-3xs cursor-pointer transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold shadow-3xs cursor-pointer transition-all"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE IMPRESSÃO / GERAÇÃO DE PDF */}
      {printOrcamento && createPortal(
        <div id="print-modal-portal">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 10mm;
              }

              /* Oculta tudo que não for o portal de impressão */
              body.print-quote-modal-active > *:not(#print-modal-portal) {
                display: none !important;
              }

              body.print-quote-modal-active #root {
                display: none !important;
              }

              /* Força que a página de impressão tenha fundo branco e texto preto */
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
              }

              /* Garante que o container do modal e o conteúdo fiquem perfeitamente visíveis */
              #print-modal-portal {
                display: block !important;
                position: static !important;
                width: 100% !important;
                height: auto !important;
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
              }

              #print-modal-portal .print-modal-overlay {
                position: static !important;
                background: #ffffff !important;
                backdrop-filter: none !important;
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
                display: block !important;
                inset: auto !important;
              }

              #print-modal-portal .print-modal-content {
                position: static !important;
                border: none !important;
                box-shadow: none !important;
                background: #ffffff !important;
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                overflow: visible !important;
                padding: 0 !important;
                margin: 0 !important;
                display: block !important;
                border-radius: 0 !important;
              }

              #print-quote-section {
                display: block !important;
                width: 100% !important;
                background: #ffffff !important;
                color: #000000 !important;
                padding: 0 !important;
                margin: 0 !important;
              }

              /* Força ocultação de botões, headers e avisos na hora de imprimir */
              .no-print, .no-print * {
                display: none !important;
                visibility: hidden !important;
                height: 0 !important;
                width: 0 !important;
                padding: 0 !important;
                margin: 0 !important;
              }

              img {
                max-width: 100% !important;
                page-break-inside: avoid !important;
              }

              tr {
                page-break-inside: avoid !important;
              }

              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}} />

          <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 backdrop-blur-xs overflow-y-auto p-4 md:p-8 print-modal-overlay">
            <div className="relative w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden print-modal-content flex flex-col my-auto">
              {/* Controle Superior (no-print) */}
              <div className="flex items-center justify-between border-b border-slate-150 bg-slate-50 p-4 no-print">
                <div className="flex items-center gap-2">
                  <Printer className="text-blue-600" size={18} />
                  <span className="font-sans text-xs font-black text-slate-700 uppercase tracking-wider">
                    Visualização da Proposta Comercial (PDF)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-bold shadow-3xs cursor-pointer transition-all flex items-center gap-1"
                  >
                    <Printer size={13} />
                    <span>Imprimir / Salvar PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintOrcamento(null)}
                    className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-1.5 text-xs font-bold shadow-3xs cursor-pointer transition-all flex items-center gap-1"
                  >
                    <X size={13} />
                    <span>Fechar</span>
                  </button>
                </div>
              </div>

              {/* Seção Imprimível */}
              <div className="bg-white p-8 space-y-6 text-slate-950 font-sans" id="print-quote-section">
                {/* CABEÇALHO DO RELATÓRIO */}
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                  <div>
                    <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900">HOMERO EMBALAGENS S.A.</h1>
                    <p className="text-[10px] uppercase font-mono text-slate-500 font-semibold tracking-wide">
                      Cotação Comercial de Produto PCP • Proposta Oficial de Preços
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold font-mono">EMISSÃO: {new Date(printOrcamento.data_criacao).toLocaleDateString('pt-BR')}</p>
                    <p className="text-[9px] font-mono text-slate-500">VALORES EXPRESSOS EM MOEDA CORRENTE (BRL)</p>
                  </div>
                </div>

                {/* METADADOS DO MODELO */}
                <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-300 p-4 text-xs">
                  <div>
                    <p className="font-bold text-[10px] uppercase text-slate-500">Produto Referência</p>
                    <p className="text-sm font-bold text-slate-950 mt-0.5">[{printOrcamento.codigo || 'AVULSO'}] {printOrcamento.descricao}</p>
                    <p className="mt-1"><b>Dimensões:</b> {printOrcamento.dimensoes || 'N/A'}</p>
                    <p><b>Material Base:</b> {printOrcamento.material || 'N/A'}</p>
                    {printOrcamento.medida_papel_facas && (
                      <p><b>Medida Papel & Facas:</b> {printOrcamento.medida_papel_facas}</p>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-[10px] uppercase text-slate-500">Especificações Técnicas</p>
                    <p className="mt-1"><b>Quantidade de Cores:</b> {printOrcamento.cores_quantidade || 0} cores</p>
                    <p><b>Rendimento / Faca:</b> {printOrcamento.contatos_faca || 1} contatos</p>
                    <p><b>Tipo do Roteiro:</b> {printOrcamento.tipo_produto?.toUpperCase() || 'EMBALAGEM'}</p>
                    {printOrcamento.adicional_acabamento_nome && (
                      <p><b>Acabamento Adicional:</b> {printOrcamento.adicional_acabamento_nome} {printOrcamento.adicional_acabamento_valor ? `(+ R$ ${printOrcamento.adicional_acabamento_valor.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}/un)` : ''}</p>
                    )}
                  </div>
                </div>

                {/* FOTOS / MODELOS */}
                {printOrcamento.fotos && printOrcamento.fotos.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wide border-b border-slate-300 pb-1">
                      Fotos e Protótipos do Modelo
                    </h3>
                    <div className="flex flex-wrap gap-4 pt-1">
                      {printOrcamento.fotos.map((foto, idx) => (
                        <div key={idx} className="border border-slate-300 rounded-lg overflow-hidden p-1 bg-white">
                          <img 
                            src={foto} 
                            alt={`Modelo ${idx + 1}`} 
                            className="h-28 object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* OBSERVAÇÕES */}
                {printOrcamento.observacoes && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wide border-b border-slate-300 pb-1">
                      Observações e Condições de Produção
                    </h3>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {printOrcamento.observacoes}
                    </p>
                  </div>
                )}

                {/* TABELA DE PREÇOS OFICIAL PARA IMPRESSÃO */}
                {(() => {
                  const printDiscount = getDesconto(printOrcamento.id);
                  return (
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between border-b-2 border-slate-900 pb-1">
                        <h3 className="text-xs font-bold uppercase tracking-wide">
                          Tabela de Preços e Escala Comercial por Quantidade (Lotes)
                        </h3>
                        {printDiscount > 0 && (
                          <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                            Desconto Especial Aplicado: {printDiscount}%
                          </span>
                        )}
                      </div>
                      
                      {printOrcamento.opcoes && printOrcamento.opcoes.length > 0 ? (
                        <div className="space-y-6">
                          {printOrcamento.opcoes.map((op, opIdx) => (
                            <div key={op.id || opIdx} className="space-y-1.5 break-inside-avoid">
                              <h4 className="text-[11px] font-black text-blue-800 uppercase tracking-wide">
                                Opção {opIdx + 1}: {op.nome} ({op.tipo_produto?.toUpperCase() || 'EMBALAGEM'}, {op.cores_quantidade || 0} Cores, {op.contatos_faca || 1} Faca)
                              </h4>
                              <table className="w-full border-collapse text-left text-xs">
                                <thead>
                                  <tr className="border-b-2 border-slate-400 bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-600 font-bold">
                                    <th className="py-2 px-3">Quantidade de Itens (un)</th>
                                    <th className="py-2.5 px-3 text-right">Preço Unitário</th>
                                    <th className="py-2.5 px-3 text-right">Valor Total da Cotação</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {op.resultados && op.resultados.map((res, rIdx) => {
                                    const finalUnit = computeDiscountedUnitPrice(res.precoVendaUnitario, printDiscount);
                                    const totalValue = finalUnit * res.quantidade;
                                    return (
                                      <tr key={rIdx} className="hover:bg-slate-50/50">
                                        <td className="py-1.5 px-3 font-mono font-bold text-slate-800">
                                          {res.quantidade.toLocaleString('pt-BR')} un
                                        </td>
                                        <td className="py-1.5 px-3 text-right font-mono font-extrabold text-slate-900 font-sans">
                                          R$ {finalUnit.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                                        </td>
                                        <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-700">
                                          R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <table className="w-full border-collapse text-left text-xs">
                          <thead>
                            <tr className="border-b-2 border-slate-400 bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-600 font-bold">
                              <th className="py-2.5 px-3">Quantidade de Itens (un)</th>
                              <th className="py-2.5 px-3 text-right">Preço Unitário</th>
                              <th className="py-2.5 px-3 text-right">Valor Total da Cotação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {printOrcamento.resultados && printOrcamento.resultados.map((res, rIdx) => {
                              const finalUnit = computeDiscountedUnitPrice(res.precoVendaUnitario, printDiscount);
                              const totalValue = finalUnit * res.quantidade;
                              return (
                                <tr key={rIdx} className="hover:bg-slate-50/50">
                                  <td className="py-2 px-3 font-mono font-bold text-slate-800">
                                    {res.quantidade.toLocaleString('pt-BR')} un
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-extrabold text-slate-900 font-sans">
                                    R$ {finalUnit.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-700">
                                    R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })()}

                {/* ASSINATURAS / FECHAMENTO */}
                <div className="pt-16 grid grid-cols-2 gap-12 text-center text-xs">
                  <div className="space-y-1">
                    <div className="border-t border-slate-400 mx-auto w-48 pt-1"></div>
                    <p className="font-bold text-slate-800">Homero Embalagens S.A.</p>
                    <p className="text-[10px] text-slate-500">Departamento Comercial PCP</p>
                  </div>
                  <div className="space-y-1">
                    <div className="border-t border-slate-400 mx-auto w-48 pt-1"></div>
                    <p className="font-bold text-slate-800">Aceite do Cliente</p>
                    <p className="text-[10px] text-slate-500">Carimbo e Assinatura</p>
                  </div>
                </div>

                {/* TERMOS E CONDIÇÕES */}
                <div className="pt-10 border-t border-slate-200 text-[9px] text-slate-400 leading-normal text-center space-y-1">
                  <p>Estes preços estão sujeitos a reajuste conforme flutuação de custos de matérias-primas e insumos de produção.</p>
                  <p>Prazo de entrega referencial: Sob consulta. Impostos inclusos conforme regime tributário aplicável.</p>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DIALOG DE CONFIRMAÇÃO */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
      />

    </div>
  );
}
