import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { usePCP } from '../context/PCPContext';
import { Cliente, Maquina, ProdutoModelo, Insumo, Operador, ProdutoInsumoFicha } from '../types';
import { ConfirmationDialog } from './ConfirmationDialog';
import { 
  Users, 
  Layers, 
  Cpu, 
  Plus, 
  Trash2, 
  UserPlus, 
  Sparkles, 
  FileText, 
  Link,
  ExternalLink,
  Maximize2, 
  Workflow, 
  Play, 
  Check, 
  AlertCircle,
  Package,
  Wrench,
  DollarSign,
  Edit,
  ArrowUp,
  ArrowDown,
  Upload,
  X,
  Grid,
  Search,
  ChevronDown
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

export const CadastrosView: React.FC = () => {
  const { 
    clientes, 
    adicionarCliente, 
    excluirCliente,
    editarCliente,
    produtosModelos, 
    adicionarProdutoModelo, 
    excluirProdutoModelo,
    editarProdutoModelo,
    maquinas, 
    adicionarMaquina, 
    excluirMaquina,
    vincularOperadorMaquina,
    editarMaquina,
    insumos,
    adicionarInsumo,
    excluirInsumo,
    editarInsumo,
    operadores,
    adicionarOperador,
    excluirOperador,
    editarOperador
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

  const [activeSubTab, setActiveSubTab] = useState<'clientes' | 'produtos' | 'maquinas' | 'insumos' | 'operadores'>('clientes');

  // --- EDITING STATES ---
  const [editingClienteId, setEditingClienteId] = useState<string | null>(null);
  const [editingProdutoModeloId, setEditingProdutoModeloId] = useState<string | null>(null);
  const [editingMaquinaId, setEditingMaquinaId] = useState<string | null>(null);
  const [editingInsumoId, setEditingInsumoId] = useState<string | null>(null);
  const [editingOperadorId, setEditingOperadorId] = useState<string | null>(null);

  // --- OPERADORES FORM STATE ---
  const [opNome, setOpNome] = useState('');
  const [opCargo, setOpCargo] = useState('');
  const [opCustoHora, setOpCustoHora] = useState(22);
  const [opCustoMensal, setOpCustoMensal] = useState(3800);
  const [opHorasMensais, setOpHorasMensais] = useState(160);

  // --- CLIENTES FORM STATE ---
  const [cliNome, setCliNom] = useState('');
  const [cliContato, setCliContato] = useState('');
  const [cliEmail, setCliEmail] = useState('');
  const [cliTelefone, setCliTelefone] = useState('');
  const [cliCodigo, setCliCodigo] = useState('');

  // --- PRODUTOS FORM STATE ---
  const [prodDesc, setProdDesc] = useState('');
  const [prodDim, setProdDim] = useState('20x15x5 cm');
  const [prodTipoProduto, setProdTipoProduto] = useState<'embalagem' | 'manual' | 'bolacha'>('embalagem');
  const [prodMat, setProdMat] = useState('Papel Cartão Duplex 250g (Folhas)');
  const [paperSearchQuery, setPaperSearchQuery] = useState('Papel Cartão Duplex 250g (Folhas)');
  const [isPaperDropdownOpen, setIsPaperDropdownOpen] = useState(false);
  const [prodFator, setProdFator] = useState(0.05);
  const [prodRendimento, setProdRendimento] = useState<number>(20);

  const handleRendimentoChange = (val: number) => {
    setProdRendimento(val);
    const fator = val > 0 ? Number((1 / val).toFixed(6)) : 0;
    setProdFator(fator);
  };
  const [prodContatosFaca, setProdContatosFaca] = useState<number>(1);
  const [prodMedidaFaca, setProdMedidaFaca] = useState('');
  const [prodRoute, setProdRoute] = useState<string[]>(['m1', 'm2', 'm3']);
  const [prodCodigo, setProdCodigo] = useState('');
  const [prodCoresQuantidade, setProdCoresQuantidade] = useState<number>(1);
  const [prodCoresFrente, setProdCoresFrente] = useState<number>(1);
  const [prodCoresVerso, setProdCoresVerso] = useState<number>(0);
  const [prodPantones, setProdPantones] = useState<string[]>(['']);
  const [prodPontosCola, setProdPontosCola] = useState<number>(1);

  const [prodFacaPdfUrl, setProdFacaPdfUrl] = useState<string>('');
  const [prodFacaPdfNome, setProdFacaPdfNome] = useState<string>('');
  const [prodArtePdfUrl, setProdArtePdfUrl] = useState<string>('');
  const [prodArtePdfNome, setProdArtePdfNome] = useState<string>('');
  const [prodInformacoesImportantes, setProdInformacoesImportantes] = useState<string>('');
  const [facaMode, setFacaMode] = useState<'file' | 'link'>('file');
  const [arteMode, setArteMode] = useState<'file' | 'link'>('file');

  const [prodQtdInsumos, setProdQtdInsumos] = useState<number>(1);
  const [prodInsumosFicha, setProdInsumosFicha] = useState<ProdutoInsumoFicha[]>([
    { insumo_id: '', nome: 'Papel Cartão Duplex 250g (Folhas)', rendimento: 20, fator_consumo: 0.05 }
  ]);

  const [prodGradeItens, setProdGradeItens] = useState<{ codigo: string; descricao: string; contatos: number; }[]>([]);
  const [prodUsarGrade, setProdUsarGrade] = useState<boolean>(false);
  const isGradeActive = prodUsarGrade || prodTipoProduto === 'bolacha';

  const handleGradeQtdChange = (qtd: number) => {
    const normQtd = Math.max(0, qtd);
    setProdGradeItens(prev => {
      const next = [...prev];
      if (next.length < normQtd) {
        while (next.length < normQtd) {
          next.push({ codigo: '', descricao: '', contatos: 1 });
        }
      } else if (next.length > normQtd) {
        next.splice(normQtd);
      }
      
      const sum = next.reduce((acc, curr) => acc + (Number(curr.contatos) || 0), 0);
      setProdContatosFaca(sum || 1);
      
      return next;
    });
  };

  const updateGradeItem = (index: number, fields: Partial<{ codigo: string; descricao: string; contatos: number }>) => {
    setProdGradeItens(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...fields };
      
      const sum = next.reduce((acc, curr) => acc + (Number(curr.contatos) || 0), 0);
      setProdContatosFaca(sum || 1);
      
      return next;
    });
  };

  const handleQtdInsumosChange = (qtd: number) => {
    const normQtd = Math.max(1, qtd);
    setProdQtdInsumos(normQtd);
    setProdInsumosFicha(prev => {
      const next = [...prev];
      if (next.length < normQtd) {
        while (next.length < normQtd) {
          next.push({ insumo_id: '', nome: '', rendimento: 20, fator_consumo: 0.05 });
        }
      } else if (next.length > normQtd) {
        next.splice(normQtd);
      }
      return next;
    });
  };

  const updateInsumoFicha = (index: number, fields: Partial<ProdutoInsumoFicha>) => {
    setProdInsumosFicha(prev => {
      const next = [...prev];
      const item = { ...next[index], ...fields };
      if (fields.rendimento !== undefined) {
        item.fator_consumo = fields.rendimento > 0 ? Number((1 / fields.rendimento).toFixed(6)) : 0;
      }
      next[index] = item;

      // Sync with legacy single product states if it's the first insumo
      if (index === 0) {
        if (fields.nome !== undefined) {
          setProdMat(fields.nome);
          setPaperSearchQuery(fields.nome);
        }
        if (fields.rendimento !== undefined) {
          setProdRendimento(fields.rendimento);
          setProdFator(fields.rendimento > 0 ? Number((1 / fields.rendimento).toFixed(6)) : 0);
        }
      }
      return next;
    });
  };

  const handleCoresChange = (qtd: number) => {
    const normQtd = Math.max(0, qtd);
    setProdCoresQuantidade(normQtd);
    setProdPantones(prev => {
      const next = [...prev];
      if (next.length < normQtd) {
        while (next.length < normQtd) next.push('');
      } else if (next.length > normQtd) {
        next.splice(normQtd);
      }
      return next;
    });
  };

  const handleCoresFrenteChange = (frente: number) => {
    const normFrente = Math.max(0, frente);
    setProdCoresFrente(normFrente);
    const novoTotal = normFrente + prodCoresVerso;
    handleCoresChange(novoTotal);
  };

  const handleCoresVersoChange = (verso: number) => {
    const normVerso = Math.max(0, verso);
    setProdCoresVerso(normVerso);
    const novoTotal = prodCoresFrente + normVerso;
    handleCoresChange(novoTotal);
  };

  // --- MÁQUINAS FORM STATE ---
  const [maqNome, setMaqNome] = useState('');
  const [maqTipo, setMaqTipo] = useState<'Impressão' | 'Corte' | 'Acabamento'>('Impressão');
  const [maqCapacidade, setMaqCapacidade] = useState(5000);
  const [maqCapacidadeEmbalagem, setMaqCapacidadeEmbalagem] = useState(5000);
  const [maqCapacidadeManual, setMaqCapacidadeManual] = useState(2500);
  const [maqCapacidadeBolacha, setMaqCapacidadeBolacha] = useState(10000);
  const [maqTipoVelocidade, setMaqTipoVelocidade] = useState<'unidade' | 'folha'>('unidade');
  const [maqCodigo, setMaqCodigo] = useState('');
  const [maqTempoSetup, setMaqTempoSetup] = useState(30);
  const [maqSetupCores, setMaqSetupCores] = useState(15);
  const [maqValorAquisicao, setMaqValorAquisicao] = useState<number>(300000);
  const [maqVidaUtilAnos, setMaqVidaUtilAnos] = useState<number>(10);
  const [maqOperadorId, setMaqOperadorId] = useState<string>('');

  // --- INSUMOS FORM STATE ---
  const [insNome, setInsNome] = useState('');
  const [insTipo, setInsTipo] = useState<'papel_cartao' | 'tinta' | 'cola' | 'verniz' | 'outro'>('papel_cartao');
  const [insUnidade, setInsUnidade] = useState<'folhas' | 'litros' | 'unidades'>('folhas');
  const [insEstoqueAtual, setInsEstoqueAtual] = useState(1000);
  const [insEstoqueMinimo, setInsEstoqueMinimo] = useState(250);
  const [insFornecedor, setInsFornecedor] = useState('');
  const [insCodigo, setInsCodigo] = useState('');

  // --- CAMPOS DE PESQUISA NOS CADASTROS ---
  const [searchClientes, setSearchClientes] = useState('');
  const [searchProdutos, setSearchProdutos] = useState('');
  const [searchMaquinas, setSearchMaquinas] = useState('');
  const [searchInsumos, setSearchInsumos] = useState('');
  const [searchOperadores, setSearchOperadores] = useState('');
  const [insumosSearchQueries, setInsumosSearchQueries] = useState<string[]>([]);
  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);

  // --- EXCEL IMPORT STATES ---
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importLogs, setImportLogs] = useState<string[]>([]);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError(null);
    setImportLogs([]);

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);

          if (!data || data.length === 0) {
            throw new Error("A planilha está vazia ou não possui dados válidos.");
          }

          const newLogs: string[] = [];
          let successCount = 0;

          for (const row of data as any[]) {
            const keys = Object.keys(row);
            const getVal = (possibleKeys: string[]) => {
              const matchedKey = keys.find(k => 
                possibleKeys.some(pk => {
                  const normalizedK = k.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
                  const normalizedPK = pk.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
                  return normalizedK === normalizedPK;
                })
              );
              return matchedKey ? row[matchedKey] : undefined;
            };

            const nomeVal = getVal(['nome', 'descricao', 'nome do insumo', 'material', 'insumo', 'nome_insumo', 'desc']);
            if (!nomeVal) continue;

            const codigoVal = getVal(['codigo', 'codigo erp', 'erp', 'codigo_erp', 'cod', 'sku']);
            const tipoValRaw = getVal(['tipo', 'categoria', 'tipo de materia prima', 'grupo', 'tipo_insumo']);
            const unidadeValRaw = getVal(['unidade', 'unidade fisica', 'un', 'unidade_medida']);
            const estoqueAtualVal = getVal(['estoque atual', 'qtd atual', 'estoque', 'quantidade', 'saldo', 'estoque_atual']);
            const estoqueMinimoVal = getVal(['estoque minimo', 'minimo', 'estoque_minimo', 'saldo_minimo']);
            const fornecedorVal = getVal(['fornecedor', 'fabricante', 'fornecedor_principal']);

            // Parse tipo
            let parsedTipo: 'papel_cartao' | 'tinta' | 'cola' | 'verniz' | 'outro' = 'outro';
            if (tipoValRaw) {
              const lowerTipo = String(tipoValRaw).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
              if (lowerTipo.includes('papel') || lowerTipo.includes('cartao') || lowerTipo.includes('duplex') || lowerTipo.includes('triplex') || lowerTipo.includes('papel_cartao')) {
                parsedTipo = 'papel_cartao';
              } else if (lowerTipo.includes('tinta') || lowerTipo.includes('cmyk') || lowerTipo.includes('pantone')) {
                parsedTipo = 'tinta';
              } else if (lowerTipo.includes('cola') || lowerTipo.includes('adesivo') || lowerTipo.includes('hotmelt')) {
                parsedTipo = 'cola';
              } else if (lowerTipo.includes('verniz') || lowerTipo.includes('brilho') || lowerTipo.includes('cobertura')) {
                parsedTipo = 'verniz';
              }
            }

            // Parse unidade
            let parsedUnidade: 'folhas' | 'litros' | 'unidades' = 'unidades';
            if (unidadeValRaw) {
              const lowerUn = String(unidadeValRaw).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
              if (lowerUn.includes('folha') || lowerUn === 'fl' || lowerUn === 'fls') {
                parsedUnidade = 'folhas';
              } else if (lowerUn.includes('litro') || lowerUn === 'l' || lowerUn === 'kg' || lowerUn === 'kilo') {
                parsedUnidade = 'litros';
              }
            }

            const parsedEstoqueAtual = Number(estoqueAtualVal) || 0;
            const parsedEstoqueMinimo = Number(estoqueMinimoVal) || 0;
            const finalCodigo = codigoVal ? String(codigoVal).trim() : '';

            await adicionarInsumo({
              codigo: finalCodigo || undefined,
              nome: String(nomeVal).trim(),
              tipo: parsedTipo,
              unidade: parsedUnidade,
              estoque_atual: parsedEstoqueAtual,
              estoque_minimo: parsedEstoqueMinimo,
              fornecedor: fornecedorVal ? String(fornecedorVal).trim() : 'Importado'
            });

            successCount++;
            newLogs.push(`"${nomeVal}" importado com sucesso (Código: ${finalCodigo || 'Automático'}).`);
          }

          setImportLogs(prev => [...prev, ...newLogs]);
          if (successCount === 0) {
            setImportError("Nenhum insumo válido pôde ser importado. Verifique os cabeçalhos das colunas.");
          }
        } catch (err: any) {
          setImportError(err.message || "Erro desconhecido ao processar planilha.");
        } finally {
          setImporting(false);
        }
      };

      reader.onerror = () => {
        setImportError("Falha na leitura física do arquivo.");
        setImporting(false);
      };

      reader.readAsBinaryString(file);
    } catch (err: any) {
      setImportError(err.message || "Falha ao ler o arquivo Excel.");
      setImporting(false);
    }
  };

  // Handlers for Clientes
  const handleAddClienteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliNome || !cliEmail) return;
    
    if (editingClienteId) {
      editarCliente({
        id: editingClienteId,
        nome: cliNome,
        contato: cliContato,
        email: cliEmail,
        telefone: cliTelefone,
        codigo: cliCodigo.trim() || undefined
      });
      setEditingClienteId(null);
    } else {
      adicionarCliente({
        nome: cliNome,
        contato: cliContato,
        email: cliEmail,
        telefone: cliTelefone,
        codigo: cliCodigo.trim() || undefined
      });
    }
    
    setCliNom('');
    setCliContato('');
    setCliEmail('');
    setCliTelefone('');
    setCliCodigo('');
  };

  const startEditCliente = (cli: Cliente) => {
    setEditingClienteId(cli.id);
    setCliCodigo(cli.codigo || '');
    setCliNom(cli.nome);
    setCliContato(cli.contato);
    setCliEmail(cli.email);
    setCliTelefone(cli.telefone || '');
  };

  const cancelEditCliente = () => {
    setEditingClienteId(null);
    setCliNom('');
    setCliContato('');
    setCliEmail('');
    setCliTelefone('');
    setCliCodigo('');
  };

  // Handlers for Produtos (Modelos)
  const handleAddProdutoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodDesc || prodRoute.length === 0) return;
    
    // Certifique-se de que os insumos na ficha tenham os dados corretos preenchidos
    const finalInsumos = prodInsumosFicha.map((item, idx) => {
      // Para o primeiro item, se o nome não tiver preenchido mas prodMat sim, use prodMat
      if (idx === 0 && !item.nome && prodMat) {
        return {
          ...item,
          nome: prodMat,
          fator_consumo: prodFator,
          rendimento: prodRendimento
        };
      }
      return item;
    });

    if (editingProdutoModeloId) {
      editarProdutoModelo({
        id: editingProdutoModeloId,
        descricao: prodDesc,
        dimensoes: prodDim,
        material: finalInsumos[0]?.nome || prodMat,
        fator_consumo: finalInsumos[0]?.fator_consumo !== undefined ? finalInsumos[0].fator_consumo : prodFator,
        contatos_faca: prodContatosFaca,
        medida_faca: prodMedidaFaca || undefined,
        roteiro: prodRoute,
        codigo: prodCodigo.trim() || undefined,
        cores_quantidade: Number(prodCoresQuantidade) || 0,
        cores_frente: Number(prodCoresFrente) || 0,
        cores_verso: Number(prodCoresVerso) || 0,
        pantones: prodPantones.filter(p => p.trim() !== ''),
        tipo_produto: prodTipoProduto,
        pontos_cola: prodTipoProduto === 'embalagem' ? prodPontosCola : undefined,
        insumos_ficha: finalInsumos,
        faca_pdf_url: prodFacaPdfUrl || undefined,
        faca_pdf_nome: prodFacaPdfNome || undefined,
        arte_pdf_url: prodArtePdfUrl || undefined,
        arte_pdf_nome: prodArtePdfNome || undefined,
        grade_itens: isGradeActive ? prodGradeItens : undefined,
        informacoes_importantes: prodInformacoesImportantes.trim() || undefined,
        observacoes: prodInformacoesImportantes.trim() || undefined
      });
      setEditingProdutoModeloId(null);
    } else {
      adicionarProdutoModelo({
        descricao: prodDesc,
        dimensoes: prodDim,
        material: finalInsumos[0]?.nome || prodMat,
        fator_consumo: finalInsumos[0]?.fator_consumo !== undefined ? finalInsumos[0].fator_consumo : prodFator,
        contatos_faca: prodContatosFaca,
        medida_faca: prodMedidaFaca || undefined,
        roteiro: prodRoute,
        codigo: prodCodigo.trim() || undefined,
        cores_quantidade: Number(prodCoresQuantidade) || 0,
        cores_frente: Number(prodCoresFrente) || 0,
        cores_verso: Number(prodCoresVerso) || 0,
        pantones: prodPantones.filter(p => p.trim() !== ''),
        tipo_produto: prodTipoProduto,
        pontos_cola: prodTipoProduto === 'embalagem' ? prodPontosCola : undefined,
        insumos_ficha: finalInsumos,
        faca_pdf_url: prodFacaPdfUrl || undefined,
        faca_pdf_nome: prodFacaPdfNome || undefined,
        arte_pdf_url: prodArtePdfUrl || undefined,
        arte_pdf_nome: prodArtePdfNome || undefined,
        grade_itens: isGradeActive ? prodGradeItens : undefined,
        informacoes_importantes: prodInformacoesImportantes.trim() || undefined,
        observacoes: prodInformacoesImportantes.trim() || undefined
      });
    }
    
    setProdDesc('');
    setProdDim('20x15x5 cm');
    setProdMat('Papel Cartão Duplex 250g (Folhas)');
    setPaperSearchQuery('Papel Cartão Duplex 250g (Folhas)');
    setProdFator(0.05);
    setProdRendimento(20);
    setProdContatosFaca(1);
    setProdMedidaFaca('');
    setProdRoute(['m1', 'm2', 'm3']);
    setProdCodigo('');
    setProdCoresQuantidade(1);
    setProdCoresFrente(1);
    setProdCoresVerso(0);
    setProdPantones(['']);
    setProdTipoProduto('embalagem');
    setProdPontosCola(1);
    setProdInsumosFicha([{ insumo_id: '', nome: 'Papel Cartão Duplex 250g (Folhas)', rendimento: 20, fator_consumo: 0.05 }]);
    setProdQtdInsumos(1);
    setProdFacaPdfUrl('');
    setProdFacaPdfNome('');
    setProdArtePdfUrl('');
    setProdArtePdfNome('');
    setProdInformacoesImportantes('');
    setProdGradeItens([]);
    setProdUsarGrade(false);
  };

  const startEditProduto = (mod: ProdutoModelo) => {
    setEditingProdutoModeloId(mod.id);
    setProdCodigo(mod.codigo || '');
    setProdDesc(mod.descricao);
    setProdDim(mod.dimensoes);
    setProdMat(mod.material);
    setPaperSearchQuery(mod.material);
    setProdFator(mod.fator_consumo);
    setProdRendimento(mod.fator_consumo > 0 ? Number((1 / mod.fator_consumo).toFixed(4)) : 20);
    setProdContatosFaca(mod.contatos_faca || 1);
    setProdMedidaFaca(mod.medida_faca || '');
    setProdRoute(mod.roteiro);
    setProdCoresQuantidade(mod.cores_quantidade || 0);
    setProdCoresFrente(mod.cores_frente !== undefined ? mod.cores_frente : (mod.cores_quantidade || 0));
    setProdCoresVerso(mod.cores_verso !== undefined ? mod.cores_verso : 0);
    setProdPantones(mod.pantones && mod.pantones.length > 0 ? mod.pantones : ['']);
    setProdTipoProduto(mod.tipo_produto || 'embalagem');
    setProdPontosCola(mod.pontos_cola !== undefined ? mod.pontos_cola : 1);
    setProdFacaPdfUrl(mod.faca_pdf_url || '');
    setProdFacaPdfNome(mod.faca_pdf_nome || '');
    setProdArtePdfUrl(mod.arte_pdf_url || '');
    setProdArtePdfNome(mod.arte_pdf_nome || '');
    setProdInformacoesImportantes(mod.informacoes_importantes || mod.observacoes || '');
    if (mod.faca_pdf_url?.startsWith('http') || mod.faca_pdf_url?.startsWith('www.')) {
      setFacaMode('link');
    } else {
      setFacaMode('file');
    }
    if (mod.arte_pdf_url?.startsWith('http') || mod.arte_pdf_url?.startsWith('www.')) {
      setArteMode('link');
    } else {
      setArteMode('file');
    }
    if (mod.grade_itens && mod.grade_itens.length > 0) {
      setProdGradeItens(mod.grade_itens);
      setProdUsarGrade(true);
    } else {
      setProdGradeItens([]);
      setProdUsarGrade(false);
    }

    if (mod.insumos_ficha && mod.insumos_ficha.length > 0) {
      setProdInsumosFicha(mod.insumos_ficha);
      setProdQtdInsumos(mod.insumos_ficha.length);
    } else {
      setProdInsumosFicha([{
        insumo_id: '',
        nome: mod.material,
        rendimento: mod.fator_consumo > 0 ? Number((1 / mod.fator_consumo).toFixed(4)) : 20,
        fator_consumo: mod.fator_consumo
      }]);
      setProdQtdInsumos(1);
    }
  };

  const cancelEditProduto = () => {
    setEditingProdutoModeloId(null);
    setProdDesc('');
    setProdDim('20x15x5 cm');
    setProdMat('Papel Cartão Duplex 250g (Folhas)');
    setPaperSearchQuery('Papel Cartão Duplex 250g (Folhas)');
    setProdFator(0.05);
    setProdRendimento(20);
    setProdContatosFaca(1);
    setProdMedidaFaca('');
    setProdRoute(['m1', 'm2', 'm3']);
    setProdCodigo('');
    setProdCoresQuantidade(1);
    setProdCoresFrente(1);
    setProdCoresVerso(0);
    setProdPantones(['']);
    setProdTipoProduto('embalagem');
    setProdPontosCola(1);
    setProdInsumosFicha([{ insumo_id: '', nome: 'Papel Cartão Duplex 250g (Folhas)', rendimento: 20, fator_consumo: 0.05 }]);
    setProdQtdInsumos(1);
    setProdFacaPdfUrl('');
    setProdFacaPdfNome('');
    setProdArtePdfUrl('');
    setProdArtePdfNome('');
    setProdInformacoesImportantes('');
    setFacaMode('file');
    setArteMode('file');
    setProdGradeItens([]);
    setProdUsarGrade(false);
  };

  const handleMoveRouteStep = (stepIdx: number, direction: 'up' | 'down') => {
    const nextRoute = [...prodRoute];
    const targetIdx = direction === 'up' ? stepIdx - 1 : stepIdx + 1;
    if (targetIdx >= 0 && targetIdx < nextRoute.length) {
      const temp = nextRoute[stepIdx];
      nextRoute[stepIdx] = nextRoute[targetIdx];
      nextRoute[targetIdx] = temp;
    }
    setProdRoute(nextRoute);
  };

  const handleRemoveRouteStep = (stepIdx: number) => {
    const nextRoute = prodRoute.filter((_, sIdx) => sIdx !== stepIdx);
    setProdRoute(nextRoute);
  };

  const handleAddRouteStep = (machineId: string) => {
    setProdRoute(prev => [...prev, machineId]);
  };

  // Handlers for Máquinas
  const handleAddMaquinaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!maqNome) return;

    // Calcular depreciação mensal automatico
    const deprMensal = maqValorAquisicao && maqVidaUtilAnos
      ? (maqValorAquisicao / maqVidaUtilAnos) / 12
      : 0;

    if (editingMaquinaId) {
      const originalMaq = maquinas.find(m => m.id === editingMaquinaId);
      editarMaquina({
        id: editingMaquinaId,
        nome: maqNome,
        tipo: maqTipo,
        capacidade_hora: Number(maqCapacidadeEmbalagem) || Number(maqCapacidade) || 5000,
        status_atual: originalMaq ? originalMaq.status_atual : 'ociosa',
        codigo: maqCodigo.trim() || undefined,
        tempo_setup: Number(maqTempoSetup) || 0,
        setup_cores: Number(maqSetupCores) || 0,
        valor_aquisicao: Number(maqValorAquisicao) || 0,
        vida_util_anos: Number(maqVidaUtilAnos) || 10,
        depreciacao_mensal: Number(deprMensal.toFixed(2)),
        operador_id: maqOperadorId || undefined,
        capacidade_embalagem: Number(maqCapacidadeEmbalagem) || 5000,
        capacidade_manual: Number(maqCapacidadeManual) || 2500,
        capacidade_bolacha: Number(maqCapacidadeBolacha) || 10000,
        tipo_velocidade: maqTipoVelocidade
      });
      setEditingMaquinaId(null);
    } else {
      adicionarMaquina({
        nome: maqNome,
        tipo: maqTipo,
        capacidade_hora: Number(maqCapacidadeEmbalagem) || Number(maqCapacidade) || 5000,
        status_atual: 'ociosa',
        codigo: maqCodigo.trim() || undefined,
        tempo_setup: Number(maqTempoSetup) || 0,
        setup_cores: Number(maqSetupCores) || 0,
        valor_aquisicao: Number(maqValorAquisicao) || 0,
        vida_util_anos: Number(maqVidaUtilAnos) || 10,
        depreciacao_mensal: Number(deprMensal.toFixed(2)),
        operador_id: maqOperadorId || undefined,
        capacidade_embalagem: Number(maqCapacidadeEmbalagem) || 5000,
        capacidade_manual: Number(maqCapacidadeManual) || 2500,
        capacidade_bolacha: Number(maqCapacidadeBolacha) || 10000,
        tipo_velocidade: maqTipoVelocidade
      });
    }

    setMaqNome('');
    setMaqCapacidade(5500);
    setMaqCapacidadeEmbalagem(5000);
    setMaqCapacidadeManual(2500);
    setMaqCapacidadeBolacha(10000);
    setMaqTipoVelocidade('unidade');
    setMaqCodigo('');
    setMaqTempoSetup(30);
    setMaqSetupCores(15);
    setMaqValorAquisicao(300000);
    setMaqVidaUtilAnos(10);
    setMaqOperadorId('');
  };

  const startEditMaquina = (maq: Maquina) => {
    setEditingMaquinaId(maq.id);
    setMaqCodigo(maq.codigo || '');
    setMaqNome(maq.nome);
    setMaqTipo(maq.tipo);
    setMaqCapacidade(maq.capacidade_hora || 5000);
    setMaqCapacidadeEmbalagem(maq.capacidade_embalagem || maq.capacidade_hora || 5000);
    setMaqCapacidadeManual(maq.capacidade_manual || Math.round(maq.capacidade_hora / 2) || 2500);
    setMaqCapacidadeBolacha(maq.capacidade_bolacha || (maq.capacidade_hora * 2) || 10000);
    setMaqTipoVelocidade(maq.tipo_velocidade || 'unidade');
    setMaqTempoSetup(maq.tempo_setup || 0);
    setMaqSetupCores(maq.setup_cores || 0);
    setMaqValorAquisicao(maq.valor_aquisicao || 0);
    setMaqVidaUtilAnos(maq.vida_util_anos || 10);
    setMaqOperadorId(maq.operador_id || '');
  };

  const cancelEditMaquina = () => {
    setEditingMaquinaId(null);
    setMaqNome('');
    setMaqCapacidade(5000);
    setMaqCapacidadeEmbalagem(5000);
    setMaqCapacidadeManual(2500);
    setMaqCapacidadeBolacha(10000);
    setMaqTipoVelocidade('unidade');
    setMaqCodigo('');
    setMaqTempoSetup(30);
    setMaqSetupCores(15);
    setMaqValorAquisicao(300000);
    setMaqVidaUtilAnos(10);
    setMaqOperadorId('');
  };

  // Handlers for Insumos
  const handleAddInsumoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!insNome) return;
    
    if (editingInsumoId) {
      editarInsumo({
        id: editingInsumoId,
        nome: insNome,
        tipo: insTipo,
        unidade: insUnidade,
        estoque_atual: Number(insEstoqueAtual),
        estoque_minimo: Number(insEstoqueMinimo),
        fornecedor: insFornecedor || 'Fornecedor Local',
        codigo: insCodigo.trim() || undefined
      });
      setEditingInsumoId(null);
    } else {
      adicionarInsumo({
        nome: insNome,
        tipo: insTipo,
        unidade: insUnidade,
        estoque_atual: Number(insEstoqueAtual),
        estoque_minimo: Number(insEstoqueMinimo),
        fornecedor: insFornecedor || 'Fornecedor Local',
        codigo: insCodigo.trim() || undefined
      });
    }
    
    setInsNome('');
    setInsFornecedor('');
    setInsEstoqueAtual(1000);
    setInsEstoqueMinimo(250);
    setInsCodigo('');
  };

  const startEditInsumo = (ins: Insumo) => {
    setEditingInsumoId(ins.id);
    setInsCodigo(ins.codigo || '');
    setInsNome(ins.nome);
    setInsTipo(ins.tipo);
    setInsUnidade(ins.unidade);
    setInsEstoqueAtual(ins.estoque_atual);
    setInsEstoqueMinimo(ins.estoque_minimo);
    setInsFornecedor(ins.fornecedor || '');
  };

  const cancelEditInsumo = () => {
    setEditingInsumoId(null);
    setInsNome('');
    setInsFornecedor('');
    setInsEstoqueAtual(1000);
    setInsEstoqueMinimo(250);
    setInsCodigo('');
  };

  // Handlers for Operadores
  const handleAddOperadorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opNome) return;
    
    if (editingOperadorId) {
      const currentOp = operadores.find(o => o.id === editingOperadorId);
      editarOperador({
        id: editingOperadorId,
        nome: opNome,
        turno: currentOp?.turno || 'Manhã',
        cargo: opCargo.trim() || 'Operador de Máquinas',
        custo_hora: Number(opCustoHora) || 0,
        custo_mensal: Number(opCustoMensal) || 0,
        horas_mensais: Number(opHorasMensais) || 160
      });
      setEditingOperadorId(null);
    } else {
      adicionarOperador({
        nome: opNome,
        turno: 'Manhã',
        cargo: opCargo.trim() || 'Operador de Máquinas',
        custo_hora: Number(opCustoHora) || 0,
        custo_mensal: Number(opCustoMensal) || 0,
        horas_mensais: Number(opHorasMensais) || 160
      });
    }
    
    setOpNome('');
    setOpCargo('');
    setOpCustoHora(22);
    setOpCustoMensal(3800);
    setOpHorasMensais(160);
  };

  const startEditOperador = (op: Operador) => {
    setEditingOperadorId(op.id);
    setOpNome(op.nome);
    setOpCargo(op.cargo || '');
    setOpCustoHora(op.custo_hora || 0);
    setOpCustoMensal(op.custo_mensal || 0);
    setOpHorasMensais(op.horas_mensais || 160);
  };

  const cancelEditOperador = () => {
    setEditingOperadorId(null);
    setOpNome('');
    setOpCargo('');
    setOpCustoHora(22);
    setOpCustoMensal(3800);
    setOpHorasMensais(160);
  };

  return (
    <div className="space-y-6">
      {/* HEADER DE SECÇÃO */}
      <div>
        <p className="font-sans text-xs text-slate-500">Módulos de Gestão e Criação de Cadastros Base para Apoio Industrial.</p>
      </div>

      {/* SUB-TABS SELECTOR */}
      <div className="flex border-b border-slate-200 bg-white p-1 rounded-xl shadow-3xs max-w-2xl overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('clientes')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-sans text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'clientes' 
              ? 'bg-slate-900 text-white shadow-2xs' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
          id="tab-cad-clientes"
        >
          <Users size={14} />
          Clientes
        </button>
        <button
          onClick={() => setActiveSubTab('produtos')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-sans text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'produtos' 
              ? 'bg-slate-900 text-white shadow-2xs' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
          id="tab-cad-produtos"
        >
          <Layers size={14} />
          Fichas Técnicas
        </button>
        <button
          onClick={() => setActiveSubTab('maquinas')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-sans text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'maquinas' 
              ? 'bg-slate-900 text-white shadow-2xs' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
          id="tab-cad-maquinas"
        >
          <Cpu size={14} />
          Máquinas
        </button>
        <button
          onClick={() => setActiveSubTab('insumos')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-sans text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'insumos' 
              ? 'bg-slate-900 text-white shadow-2xs' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
          id="tab-cad-insumos"
        >
          <Package size={14} />
          Insumos
        </button>
        <button
          onClick={() => setActiveSubTab('operadores')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-sans text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'operadores' 
              ? 'bg-slate-900 text-white shadow-2xs' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
          id="tab-cad-operadores"
        >
          <Wrench size={14} />
          Operadores
        </button>
      </div>

      {/* --- CLIENTES TAB CONTENT --- */}
      {activeSubTab === 'clientes' && (
        <div className="grid gap-6 md:grid-cols-3">
          
          {/* Cadastro de Cliente Novo */}
          <div className="sleek-card p-5 space-y-4 shadow-3xs bg-white rounded-xl border border-slate-200">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-sans text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus size={16} className="text-blue-600" />
                {editingClienteId ? 'Editar Cliente' : 'Novo Cliente'}
              </h3>
              <p className="font-sans text-[10px] text-slate-400 font-normal">
                {editingClienteId ? 'Altere os dados cadastrais da gráfica.' : 'Insira os dados cadastrais da gráfica.'}
              </p>
            </div>

            <form onSubmit={handleAddClienteSubmit} className="space-y-3.5" id="form-create-cliente">
              <div>
                <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">Código ERP / Registro</label>
                <input
                  type="text"
                  value={cliCodigo}
                  onChange={(e) => setCliCodigo(e.target.value)}
                  placeholder="Ex: CLI-3012"
                  className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">Razão Social / Nome completo</label>
                <input
                  type="text"
                  required
                  value={cliNome}
                  onChange={(e) => setCliNom(e.target.value)}
                  placeholder="Ex: Chocolates Imperial S.A."
                  className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">Responsável de Compras (Contato)</label>
                <input
                  type="text"
                  required
                  value={cliContato}
                  onChange={(e) => setCliContato(e.target.value)}
                  placeholder="Ex: Márcio Silveira"
                  className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1 font-semibold">Email Principal</label>
                <input
                  type="email"
                  required
                  value={cliEmail}
                  onChange={(e) => setCliEmail(e.target.value)}
                  placeholder="compras@imperial.com.br"
                  className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">Telefone Comercial</label>
                <input
                  type="text"
                  value={cliTelefone}
                  onChange={(e) => setCliTelefone(e.target.value)}
                  placeholder="(11) 4004-9281"
                  className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              {editingClienteId ? (
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={cancelEditCliente}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 py-2.5 font-sans text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 py-2.5 font-sans text-xs font-semibold text-white transition-colors cursor-pointer"
                    id="btn-submit-cliente"
                  >
                    <Check size={14} />
                    Salvar
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 py-2.5 font-sans text-xs font-semibold text-white transition-colors cursor-pointer"
                  id="btn-submit-cliente"
                >
                  <Plus size={14} />
                  Cadastrar Cliente
                </button>
              )}
            </form>
          </div>

          {/* Listagem de Clientes */}
          <div className="md:col-span-2 sleek-card p-5 space-y-4 shadow-3xs bg-white rounded-xl border border-slate-200">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-sans text-xs font-extrabold text-slate-900 uppercase tracking-wider">Clientes Cadastrados</h3>
                <p className="font-sans text-[10px] text-slate-400 font-normal">Base operacional de clientes ativos na matriz.</p>
              </div>
              <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                {clientes.length}
              </span>
            </div>

            {/* Campo de Pesquisa */}
            <div className="relative">
              <input
                type="text"
                placeholder="Pesquisar cliente por razão social, código, contato, e-mail ou telefone..."
                value={searchClientes}
                onChange={(e) => setSearchClientes(e.target.value)}
                className="w-full text-xs font-sans pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 placeholder:text-slate-400 transition-all bg-slate-50/50"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs select-none">🔍</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left" id="table-clientes-catalog">
                <thead>
                  <tr className="border-b border-slate-100 text-3xs text-slate-400 font-black uppercase tracking-wider">
                    <th className="py-2.5">Cód. ERP</th>
                    <th className="py-2.5">Razão Social</th>
                    <th className="py-2.5">Contato</th>
                    <th className="py-2.5">E-mail</th>
                    <th className="py-2.5">Telefone</th>
                    <th className="py-2.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60 font-sans text-2xs text-slate-700">
                  {clientes
                    .filter(cli => {
                      const q = searchClientes.toLowerCase();
                      return (
                        cli.nome.toLowerCase().includes(q) ||
                        (cli.codigo || '').toLowerCase().includes(q) ||
                        (cli.contato || '').toLowerCase().includes(q) ||
                        (cli.email || '').toLowerCase().includes(q) ||
                        (cli.telefone || '').toLowerCase().includes(q)
                      );
                    })
                    .map(cli => (
                    <tr key={cli.id} className="hover:bg-slate-25/50 transition-colors" id={`cli-row-${cli.id}`}>
                      <td className="py-3 font-mono text-3xs font-bold text-slate-500 whitespace-nowrap">{cli.codigo || '—'}</td>
                      <td className="py-3 font-semibold text-slate-900">{cli.nome}</td>
                      <td className="py-3 text-slate-550">{cli.contato}</td>
                      <td className="py-3 text-slate-500 font-mono text-[10px]">{cli.email}</td>
                      <td className="py-3 text-slate-600 font-mono text-[10px]">{cli.telefone || 'N/A'}</td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => startEditCliente(cli)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer"
                            title="Editar cliente"
                            id={`btn-edit-cli-${cli.id}`}
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            onClick={() => triggerConfirm(
                              'Excluir Cliente',
                              `Tem certeza que deseja excluir o cliente "${cli.nome}"? Isso removerá o registro permanentemente do sistema.`,
                              () => excluirCliente(cli.id),
                              { confirmLabel: 'Sim, Excluir', variant: 'danger' }
                            )}
                            className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer"
                            title="Remover cliente"
                            id={`btn-del-cli-${cli.id}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* --- PRODUTOS TAB CONTENT --- */}
      {activeSubTab === 'produtos' && (
        <div className="grid gap-6 md:grid-cols-3">
          
          {/* Cadastro de Produto Modelo Novo */}
          <div className="sleek-card p-5 space-y-4 shadow-3xs bg-white rounded-xl border border-slate-200">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-sans text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={16} className="text-emerald-600" />
                {editingProdutoModeloId ? 'Editar Modelo Técn.' : 'Novo Modelo Técn.'}
              </h3>
              <p className="font-sans text-[10px] text-slate-400 font-normal">
                {editingProdutoModeloId ? 'Altere a ficha piloto de embalagem para pedidos.' : 'Defina a ficha piloto de embalagem para pedidos.'}
              </p>
            </div>

            <form onSubmit={handleAddProdutoSubmit} className="space-y-3.5" id="form-create-produto">
              <div>
                <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">Código do Modelo (ERP)</label>
                <input
                  type="text"
                  value={prodCodigo}
                  onChange={(e) => setProdCodigo(e.target.value)}
                  placeholder="Ex: MP-7049"
                  className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Ex: Caixa de Panetone Imperial 500g"
                  className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div className={prodTipoProduto === 'embalagem' ? "grid grid-cols-2 gap-3" : ""}>
                <div>
                  <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">Tipo de Produto</label>
                  <select
                    value={prodTipoProduto}
                    onChange={(e) => setProdTipoProduto(e.target.value as any)}
                    className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 cursor-pointer"
                    id="select-tipo-produto"
                  >
                    <option value="embalagem">📦 Embalagem</option>
                    <option value="manual">📖 Manual Técnico</option>
                    <option value="bolacha">🍺 Bolacha de Chopp</option>
                  </select>
                </div>

                {prodTipoProduto === 'embalagem' && (
                  <div>
                    <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">Pontos de Cola</label>
                    <select
                      value={prodPontosCola}
                      onChange={(e) => setProdPontosCola(Number(e.target.value))}
                      className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 cursor-pointer"
                      id="select-pontos-cola"
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
              
              {prodTipoProduto !== 'bolacha' && (
                <div className="flex items-center gap-2.5 mt-2 mb-3 bg-slate-50 border border-slate-200 p-3 rounded-lg">
                  <input
                    type="checkbox"
                    id="checkbox-usar-grade"
                    checked={prodUsarGrade}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setProdUsarGrade(checked);
                      if (!checked) {
                        setProdGradeItens([]);
                      } else if (prodGradeItens.length === 0) {
                        setProdGradeItens([{ codigo: '', descricao: '', contatos: 1 }]);
                        setProdContatosFaca(1);
                      }
                    }}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="checkbox-usar-grade" className="font-sans text-xs font-semibold text-slate-700 cursor-pointer">
                    Trabalhar com Grade de Artes / Múltiplos Modelos nesta Ficha Técnica
                  </label>
                </div>
              )}

              {isGradeActive && (
                <div className="bg-amber-50/35 border border-amber-200/60 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-sans text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <Grid size={14} className="text-amber-700" />
                        Configuração de Grade de Artes (Modelos / Versões)
                      </h4>
                      <p className="font-sans text-[10px] text-amber-700">
                        Junte múltiplos modelos, artes ou versões na mesma faca / chapa de impressão.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block font-sans text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Quantidade de Artes/Itens na Grade
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="32"
                        value={prodGradeItens.length}
                        onChange={(e) => handleGradeQtdChange(Number(e.target.value) || 0)}
                        placeholder="Ex: 4"
                        className="block w-24 rounded-lg border border-amber-200 bg-white py-1 px-3 text-xs text-slate-850 font-bold focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => handleGradeQtdChange(prodGradeItens.length + 1)}
                        className="rounded-lg bg-amber-600 hover:bg-amber-700 py-1.5 px-2.5 text-white font-sans text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        + Adicionar Arte
                      </button>
                    </div>
                  </div>

                  {prodGradeItens.length > 0 && (
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 border-t border-amber-100 pt-2">
                      {prodGradeItens.map((item, gIdx) => (
                        <div key={gIdx} className="bg-white border border-slate-200 rounded-lg p-3 space-y-2 shadow-2xs relative">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-3xs font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                              Arte #{gIdx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const next = prodGradeItens.filter((_, i) => i !== gIdx);
                                setProdGradeItens(next);
                                const sum = next.reduce((acc, curr) => acc + (Number(curr.contatos) || 0), 0);
                                setProdContatosFaca(sum || 1);
                              }}
                              className="text-rose-600 hover:text-rose-800 text-[10px] font-medium cursor-pointer"
                            >
                              Remover
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="block font-sans text-[9px] font-extrabold text-slate-500 uppercase mb-0.5">Código Arte</label>
                              <input
                                type="text"
                                placeholder="Cód. ERP ou SKU"
                                value={item.codigo}
                                onChange={(e) => updateGradeItem(gIdx, { codigo: e.target.value })}
                                className="block w-full rounded border border-slate-200 bg-white py-1 px-2 text-xs text-slate-800 focus:outline-none focus:border-amber-400"
                              />
                            </div>
                            <div>
                              <label className="block font-sans text-[9px] font-extrabold text-slate-500 uppercase mb-0.5">Descrição/Arte</label>
                              <input
                                type="text"
                                placeholder="Ex: Heineken Verso"
                                value={item.descricao}
                                onChange={(e) => updateGradeItem(gIdx, { descricao: e.target.value })}
                                className="block w-full rounded border border-slate-200 bg-white py-1 px-2 text-xs text-slate-800 focus:outline-none focus:border-amber-400"
                              />
                            </div>
                            <div>
                              <label className="block font-sans text-[9px] font-extrabold text-slate-500 uppercase mb-0.5">Contatos (Poses)</label>
                              <input
                                type="number"
                                min="1"
                                placeholder="1"
                                value={item.contatos}
                                onChange={(e) => updateGradeItem(gIdx, { contatos: Number(e.target.value) || 0 })}
                                className="block w-full rounded border border-slate-200 bg-white py-1 px-2 text-xs text-slate-800 font-bold font-mono focus:outline-none focus:border-amber-400"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">C x L x A (Dimensões do Produto)</label>
                  <input
                    type="text"
                    required
                    value={prodDim}
                    onChange={(e) => setProdDim(e.target.value)}
                    placeholder="20x20x15 cm"
                    className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">Medida da Faca (L x C)</label>
                  <input
                    type="text"
                    value={prodMedidaFaca}
                    onChange={(e) => setProdMedidaFaca(e.target.value)}
                    placeholder="Ex: 50x70 cm"
                    className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">
                    Contatos na Faca (poses) {isGradeActive && "(Calculado pela Grade)"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={prodContatosFaca}
                    onChange={(e) => setProdContatosFaca(Number(e.target.value))}
                    disabled={isGradeActive}
                    className={`block w-full rounded-lg border py-1.5 px-3 text-xs text-slate-800 focus:outline-none ${
                      isGradeActive
                        ? 'bg-slate-100 border-slate-200 cursor-not-allowed font-bold text-slate-500'
                        : 'bg-white border-slate-200 focus:border-slate-900'
                    }`}
                  />
                  <p className="mt-1 font-mono text-[9px] text-emerald-700 italic">
                    ➜ Rend: {prodContatosFaca} {prodContatosFaca === 1 ? 'pose' : 'poses'}/folha {isGradeActive && "(calculado automaticamente pela soma da grade)"}
                  </p>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4 mt-2">
                <h4 className="font-sans text-xs font-bold text-slate-800 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText size={14} className="text-slate-500" />
                    Arquivos & Links Técnicos (Faca, Arte, ZIP, RAR, Google Drive)
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Faca (Arquivo ou Link) */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex justify-between items-center border-b border-slate-150 pb-1.5 mb-1">
                      <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase">
                        Faca do Produto
                      </label>
                      {!prodFacaPdfUrl && (
                        <div className="flex gap-1 text-[8px] bg-slate-200/55 p-0.5 rounded">
                          <button
                            type="button"
                            onClick={() => setFacaMode('file')}
                            className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-bold ${facaMode === 'file' ? 'bg-white text-slate-800 shadow-3xs' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Arquivo
                          </button>
                          <button
                            type="button"
                            onClick={() => setFacaMode('link')}
                            className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-bold ${facaMode === 'link' ? 'bg-white text-slate-800 shadow-3xs' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Link / Drive
                          </button>
                        </div>
                      )}
                    </div>

                    {prodFacaPdfUrl ? (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-2 animate-fadeIn">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {prodFacaPdfUrl.startsWith('http') || prodFacaPdfUrl.startsWith('www.') ? (
                            <Link size={14} className="text-emerald-650 flex-shrink-0 animate-pulse" />
                          ) : (
                            <FileText size={14} className="text-emerald-650 flex-shrink-0 animate-pulse" />
                          )}
                          <span className="font-sans text-[10px] font-semibold text-emerald-800 truncate" title={prodFacaPdfNome}>
                            {prodFacaPdfNome || 'Faca do Produto'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setProdFacaPdfUrl('');
                            setProdFacaPdfNome('');
                          }}
                          className="text-[10px] text-rose-600 hover:text-rose-800 hover:underline font-bold flex-shrink-0 cursor-pointer"
                        >
                          Remover
                        </button>
                      </div>
                    ) : facaMode === 'file' ? (
                      <div className="relative border border-dashed border-slate-300 rounded-lg p-3 hover:bg-slate-100 transition-colors cursor-pointer text-center">
                        <input
                          type="file"
                          accept=".pdf,.zip,.rar,.7z,.tar,.gz,image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 1.5 * 1024 * 1024) {
                                alert("O arquivo excede o limite de 1.5 MB para armazenamento direto no banco. Para arquivos maiores, utilize a aba 'Link/Drive' para anexar um link de compartilhamento (ex: Google Drive, Dropbox).");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  setProdFacaPdfUrl(event.target.result as string);
                                  setProdFacaPdfNome(file.name);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <Upload size={16} className="text-slate-400" />
                          <span className="font-sans text-[10px] font-semibold text-slate-600">Importar Arquivo da Faca</span>
                          <span className="text-[9px] text-slate-400">PDF, ZIP, RAR, etc. de até 1.5MB</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 animate-fadeIn">
                        <input
                          type="url"
                          placeholder="Cole o link do Google Drive, Dropbox, etc."
                          value={prodFacaPdfUrl}
                          onChange={(e) => {
                            const url = e.target.value;
                            setProdFacaPdfUrl(url);
                            if (url) {
                              setProdFacaPdfNome(url.includes('drive.google.com') ? 'Google Drive Link' : 'Link Externo');
                            } else {
                              setProdFacaPdfNome('');
                            }
                          }}
                          className="block w-full rounded-lg border border-slate-200 bg-white py-1 px-2.5 text-xs text-slate-805 placeholder:text-slate-400 focus:outline-none focus:border-slate-450 focus:ring-1 focus:ring-slate-450 shadow-3xs"
                        />
                        <input
                          type="text"
                          placeholder="Nome de exibição do link (Ex: Faca no Drive)"
                          value={prodFacaPdfNome}
                          onChange={(e) => setProdFacaPdfNome(e.target.value)}
                          className="block w-full rounded-lg border border-slate-200 bg-white py-0.5 px-2.5 text-[10px] text-slate-600 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 shadow-3xs"
                        />
                        <p className="text-[9.5px] text-slate-400 italic">
                          Sugestão: Ideal para arquivos pesados que excedam 1.5MB.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Arte (Arquivo ou Link) */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex justify-between items-center border-b border-slate-150 pb-1.5 mb-1">
                      <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase">
                        Arte do Produto
                      </label>
                      {!prodArtePdfUrl && (
                        <div className="flex gap-1 text-[8px] bg-slate-200/55 p-0.5 rounded">
                          <button
                            type="button"
                            onClick={() => setArteMode('file')}
                            className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-bold ${arteMode === 'file' ? 'bg-white text-slate-800 shadow-3xs' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Arquivo
                          </button>
                          <button
                            type="button"
                            onClick={() => setArteMode('link')}
                            className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-bold ${arteMode === 'link' ? 'bg-white text-slate-800 shadow-3xs' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Link / Drive
                          </button>
                        </div>
                      )}
                    </div>

                    {prodArtePdfUrl ? (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-2 animate-fadeIn">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {prodArtePdfUrl.startsWith('http') || prodArtePdfUrl.startsWith('www.') ? (
                            <Link size={14} className="text-emerald-650 flex-shrink-0 animate-pulse" />
                          ) : (
                            <FileText size={14} className="text-emerald-650 flex-shrink-0 animate-pulse" />
                          )}
                          <span className="font-sans text-[10px] font-semibold text-emerald-800 truncate" title={prodArtePdfNome}>
                            {prodArtePdfNome || 'Arte do Produto'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setProdArtePdfUrl('');
                            setProdArtePdfNome('');
                          }}
                          className="text-[10px] text-rose-600 hover:text-rose-800 hover:underline font-bold flex-shrink-0 cursor-pointer"
                        >
                          Remover
                        </button>
                      </div>
                    ) : arteMode === 'file' ? (
                      <div className="relative border border-dashed border-slate-300 rounded-lg p-3 hover:bg-slate-100 transition-colors cursor-pointer text-center">
                        <input
                          type="file"
                          accept=".pdf,.zip,.rar,.7z,.tar,.gz,image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 1.5 * 1024 * 1024) {
                                alert("O arquivo excede o limite de 1.5 MB para armazenamento direto no banco. Para arquivos maiores, utilize a aba 'Link/Drive' para anexar um link de compartilhamento (ex: Google Drive, Dropbox).");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  setProdArtePdfUrl(event.target.result as string);
                                  setProdArtePdfNome(file.name);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <Upload size={16} className="text-slate-400" />
                          <span className="font-sans text-[10px] font-semibold text-slate-600">Importar Arquivo da Arte</span>
                          <span className="text-[9px] text-slate-400">PDF, ZIP, RAR, etc. de até 1.5MB</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 animate-fadeIn">
                        <input
                          type="url"
                          placeholder="Cole o link do Google Drive, Dropbox, etc."
                          value={prodArtePdfUrl}
                          onChange={(e) => {
                            const url = e.target.value;
                            setProdArtePdfUrl(url);
                            if (url) {
                              setProdArtePdfNome(url.includes('drive.google.com') ? 'Google Drive Link' : 'Link Externo');
                            } else {
                              setProdArtePdfNome('');
                            }
                          }}
                          className="block w-full rounded-lg border border-slate-200 bg-white py-1 px-2.5 text-xs text-slate-805 placeholder:text-slate-400 focus:outline-none focus:border-slate-450 focus:ring-1 focus:ring-slate-450 shadow-3xs"
                        />
                        <input
                          type="text"
                          placeholder="Nome de exibição do link (Ex: Arte no Drive)"
                          value={prodArtePdfNome}
                          onChange={(e) => setProdArtePdfNome(e.target.value)}
                          className="block w-full rounded-lg border border-slate-200 bg-white py-0.5 px-2.5 text-[10px] text-slate-600 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 shadow-3xs"
                        />
                        <p className="text-[9.5px] text-slate-400 italic">
                          Sugestão: Ideal para arquivos pesados que excedam 1.5MB.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Múltiplos Insumos na Ficha Técnica (Requisito Especial) */}
              <div className="border-t border-slate-200 pt-4 mt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 bg-slate-50 p-2 rounded-lg border border-slate-150 gap-2">
                  <div>
                    <h4 className="font-sans text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Layers size={14} className="text-slate-500" />
                      Insumos & Matérias-Primas da Ficha Técnica
                    </h4>
                    <p className="text-[10px] text-slate-500 font-sans">
                      Preencha os insumos consumidos para fabricar este produto.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <label className="font-sans text-[10px] font-extrabold text-slate-500 uppercase whitespace-nowrap">Qtd de Insumos:</label>
                    <select
                      value={prodQtdInsumos}
                      onChange={(e) => handleQtdInsumosChange(Number(e.target.value))}
                      className="rounded-md border border-slate-200 bg-white py-1 px-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-slate-900 cursor-pointer"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                        <option key={n} value={n}>{n} {n === 1 ? 'Insumo' : 'Insumos'}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  {prodInsumosFicha.map((item, idx) => {
                    const selectedInsumo = insumos.find(i => i.id === item.insumo_id || i.nome === item.nome);
                    return (
                      <div key={idx} className="bg-slate-50/40 border border-slate-200 rounded-xl p-3 shadow-sm relative hover:border-slate-300 transition-colors animate-fadeIn">
                        <div className="absolute left-3 top-3 bg-slate-200 text-slate-700 font-mono text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border border-slate-300 shadow-3xs">
                          {idx + 1}
                        </div>
                        
                        <div className="ml-6 flex flex-col gap-3.5 min-w-0">
                          <div className="relative min-w-0">
                            <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">
                              Selecionar Insumo {idx === 0 && "(Principal / Papel)"}
                            </label>
                            
                            <div className="relative">
                              {/* Trigger Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenDropdownIdx(openDropdownIdx === idx ? null : idx);
                                  // Seed the search input with empty string when opening
                                  if (openDropdownIdx !== idx) {
                                    setInsumosSearchQueries(prev => {
                                      const copy = [...prev];
                                      copy[idx] = '';
                                      return copy;
                                    });
                                  }
                                }}
                                className="w-full flex items-center justify-between rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-slate-450 focus:ring-1 focus:ring-slate-450 cursor-pointer shadow-3xs"
                              >
                                <span className="truncate">
                                  {selectedInsumo 
                                    ? `${selectedInsumo.nome} ${selectedInsumo.codigo ? `(${selectedInsumo.codigo})` : ''}` 
                                    : '-- Selecione o Insumo --'}
                                </span>
                                <ChevronDown size={14} className="text-slate-500 shrink-0 ml-1.5" />
                              </button>

                              {/* Dropdown Menu Popup */}
                              {openDropdownIdx === idx && (
                                <>
                                  {/* Click Outside Backdrop */}
                                  <div 
                                    className="fixed inset-0 z-30 cursor-default" 
                                    onClick={() => setOpenDropdownIdx(null)} 
                                  />
                                  
                                  {/* Floating Panel */}
                                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-40 p-2 space-y-2 animate-fadeIn max-h-72 flex flex-col">
                                    {/* Search Input inside the Dropdown Panel */}
                                    <div className="relative flex-shrink-0">
                                      <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                                      <input
                                        type="text"
                                        placeholder="Pesquisar insumo..."
                                        autoFocus
                                        value={insumosSearchQueries[idx] ?? ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setInsumosSearchQueries(prev => {
                                            const copy = [...prev];
                                            copy[idx] = val;
                                            return copy;
                                          });
                                        }}
                                        className="w-full pl-8 pr-3 py-1.5 rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-400 shadow-inner"
                                      />
                                    </div>

                                    {/* Options List */}
                                    <div className="overflow-y-auto max-h-48 divide-y divide-slate-100 flex-1">
                                      {(() => {
                                        const query = (insumosSearchQueries[idx] || '').toLowerCase();
                                        const filteredInsumos = insumos
                                          .filter(ins => {
                                            return !query || 
                                              ins.nome.toLowerCase().includes(query) || 
                                              (ins.codigo || '').toLowerCase().includes(query);
                                          })
                                          .sort((a, b) => a.nome.localeCompare(b.nome));

                                        if (filteredInsumos.length === 0) {
                                          return (
                                            <div className="py-3 text-center text-[11px] text-slate-400 italic">
                                              Nenhum insumo encontrado
                                            </div>
                                          );
                                        }

                                        return filteredInsumos.map(ins => {
                                          const isSelected = item.insumo_id === ins.id;
                                          return (
                                            <button
                                              key={ins.id}
                                              type="button"
                                              onClick={() => {
                                                updateInsumoFicha(idx, {
                                                  insumo_id: ins.id,
                                                  nome: ins.nome,
                                                });
                                                setOpenDropdownIdx(null);
                                              }}
                                              className={`w-full text-left py-2 px-2.5 text-xs rounded transition-colors flex items-center justify-between hover:bg-slate-50 ${isSelected ? 'bg-emerald-50 text-emerald-850 font-semibold' : 'text-slate-700'}`}
                                            >
                                              <span className="truncate">
                                                {ins.nome} {ins.codigo ? `(${ins.codigo})` : ''}
                                              </span>
                                              {isSelected && (
                                                <Check size={12} className="text-emerald-600 shrink-0 ml-1.5" />
                                              )}
                                            </button>
                                          );
                                        });
                                      })()}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>

                            {selectedInsumo && (
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                  Tipo: {selectedInsumo.tipo === 'papel_cartao' ? 'Papel Cartão' : selectedInsumo.tipo === 'tinta' ? 'Tinta' : selectedInsumo.tipo === 'chapa_offset' ? 'Chapa' : 'Vários'}
                                </span>
                                <span className="font-mono text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold border border-emerald-100/40">
                                  Estoque: {selectedInsumo.estoque_atual} {selectedInsumo.unidade}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="w-full">
                            <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">
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
                                updateInsumoFicha(idx, { rendimento: rend });
                              }}
                              placeholder="Ex: 20"
                              className="block w-full max-w-xs rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                            />
                            <p className="mt-1 font-mono text-[9px] text-indigo-700 italic leading-tight">
                              ➜ Fator: {item.fator_consumo.toFixed(4)} {selectedInsumo?.unidade || 'un'}/un
                            </p>
                          </div>

                          {idx === 0 && (
                            <div className="w-full mt-2 pt-3 border-t border-slate-200/60 space-y-3">
                              <div className="bg-slate-100/70 p-3.5 rounded-xl border border-slate-200/60 text-left">
                                <h4 className="font-sans text-xs font-extrabold uppercase tracking-wide text-indigo-900 mb-3 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                                  Esquema de Refilamento e Dimensões do Papel
                                </h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                  <div className="space-y-3">
                                    {/* Formato de Refilamento Selection */}
                                    <div>
                                      <label className="block font-sans text-4xs font-extrabold text-slate-500 mb-1.5 uppercase tracking-wide">
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

                                          updateInsumoFicha(idx, {
                                            formato_refilamento: format,
                                            largura_original: wOrig,
                                            altura_original: hOrig,
                                            largura_refilada: wRef,
                                            altura_refilada: hRef
                                          });
                                        }}
                                        className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none cursor-pointer shadow-3xs"
                                      >
                                        <option value="inteiro">Folha Inteira (Sem Refile)</option>
                                        <option value="meia">Meia Folha (1/2)</option>
                                        <option value="quarto">Quarto de Folha (1/4)</option>
                                        <option value="oitavo">Oitavo de Folha (1/8)</option>
                                        <option value="personalizado">Formato Personalizado</option>
                                      </select>
                                    </div>

                                    {/* Medida do Insumo Original */}
                                    <div className="grid grid-cols-2 gap-2.5">
                                      <div>
                                        <label className="block font-sans text-[9px] font-extrabold text-slate-500 mb-1.5 uppercase tracking-wide">
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
                                            updateInsumoFicha(idx, { 
                                              largura_original: val,
                                              largura_refilada: wRef
                                            });
                                          }}
                                          className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none font-semibold"
                                        />
                                      </div>
                                      <div>
                                        <label className="block font-sans text-[9px] font-extrabold text-slate-500 mb-1.5 uppercase tracking-wide">
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
                                            updateInsumoFicha(idx, { 
                                              altura_original: val,
                                              altura_refilada: hRef
                                            });
                                          }}
                                          className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none font-semibold"
                                        />
                                      </div>
                                    </div>

                                    {/* Medida do Formato Refilado */}
                                    <div className="grid grid-cols-2 gap-2.5">
                                      <div>
                                        <label className="block font-sans text-[9px] font-extrabold text-slate-500 mb-1.5 uppercase tracking-wide">
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
                                            updateInsumoFicha(idx, { largura_refilada: val });
                                          }}
                                          className="disabled:bg-slate-50 disabled:text-slate-500 block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none font-semibold"
                                        />
                                      </div>
                                      <div>
                                        <label className="block font-sans text-[9px] font-extrabold text-slate-500 mb-1.5 uppercase tracking-wide">
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
                                            updateInsumoFicha(idx, { altura_refilada: val });
                                          }}
                                          className="disabled:bg-slate-50 disabled:text-slate-500 block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none font-semibold"
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
                                              <pattern id="grid-pattern-cadastros" width="10" height="10" patternUnits="userSpaceOnUse">
                                                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.8"/>
                                              </pattern>
                                            </defs>
                                            <rect width="200" height="120" fill="url(#grid-pattern-cadastros)" />

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

              {/* Novidade: Configuração de Cores e Pantones */}
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg space-y-3">
                <div className="grid grid-cols-3 gap-2 items-end">
                  <div>
                    <label className="block font-sans text-[9px] font-extrabold text-slate-500 uppercase mb-1">Cores Frente</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="12"
                      value={prodCoresFrente}
                      onChange={(e) => handleCoresFrenteChange(Number(e.target.value))}
                      className="block w-full rounded-lg border border-slate-200 bg-white py-1 px-2.5 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-sans text-[9px] font-extrabold text-slate-500 uppercase mb-1">Cores Verso</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="12"
                      value={prodCoresVerso}
                      onChange={(e) => handleCoresVersoChange(Number(e.target.value))}
                      className="block w-full rounded-lg border border-slate-200 bg-white py-1 px-2.5 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div className="bg-slate-100/60 rounded-lg p-1.5 text-center border border-slate-200/50">
                    <span className="block font-sans text-[8px] font-extrabold text-slate-400 uppercase leading-none">Total Cores</span>
                    <strong className="text-sm font-semibold text-slate-800 font-mono mt-0.5 block leading-tight">{prodCoresQuantidade}</strong>
                  </div>
                </div>

                {prodCoresQuantidade > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <label className="block font-sans text-[9px] font-extrabold text-slate-500 uppercase">Pantones Recomendados (Código ou Nome)</label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {prodPantones.map((pantone, pIdx) => {
                        const swatchColor = getPantoneColor(pantone);
                        const isFrente = pIdx < prodCoresFrente;
                        return (
                          <div key={pIdx} className="flex items-center gap-2 border border-slate-200 bg-white p-1 rounded">
                            <span className="text-[9px] text-slate-400 font-bold w-4 shrink-0">#{pIdx + 1}</span>
                            <span className={`text-[8px] font-bold px-1 py-0.5 rounded shrink-0 ${isFrente ? 'bg-sky-50 text-sky-700' : 'bg-purple-50 text-purple-700'}`}>
                              {isFrente ? 'Frente' : 'Verso'}
                            </span>
                            <input
                              type="text"
                              value={pantone}
                              onChange={(e) => {
                                const val = e.target.value;
                                setProdPantones(prev => {
                                  const next = [...prev];
                                  next[pIdx] = val;
                                  return next;
                                });
                              }}
                              placeholder="Digite o código (ex: Yellow C, Cool Gray 9, Red 032)"
                              className="w-full bg-transparent text-[10px] focus:outline-none font-medium text-slate-800"
                            />
                            <div
                              className="w-4.5 h-4.5 rounded border border-slate-200 shrink-0"
                              style={{ backgroundColor: swatchColor }}
                              title={`Swat para Pantone: ${pantone || 'Vazio'}`}
                            ></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-205">
                <div>
                  <label className="block font-sans text-3xs font-extrabold text-slate-700 uppercase tracking-wider">
                    Roteiro Sequencial Escalonado (Fases de Máquina)
                  </label>
                  <p className="font-sans text-[10px] text-slate-450 mt-0.5 leading-tight">
                    Clique nos botões de direção para alterar quais as ordens dos passos ou adicione fases adicionais.
                  </p>
                </div>

                {prodRoute.length === 0 ? (
                  <div className="text-center py-4 border border-dashed border-slate-200 bg-white rounded-lg text-slate-400 text-3xs italic font-sans">
                    Nenhum maquinário no roteiro. Inclua fases usando os botões abaixo.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {prodRoute.map((maqId, stepIdx) => {
                      const machineObj = maquinas.find(m => m.id === maqId);
                      return (
                        <div 
                          key={`${maqId}-${stepIdx}`}
                          className="flex items-center justify-between bg-white border border-slate-200/80 rounded-lg p-2 shadow-3xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex items-center justify-center bg-emerald-600 text-white text-[9px] font-black w-4.5 h-4.5 rounded-sm font-mono">
                              {stepIdx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="font-sans text-3xs font-bold text-slate-905 truncate block">
                                {machineObj?.nome || maqId}
                              </p>
                              <p className="text-[9px] text-slate-405 font-mono -mt-0.5 truncate uppercase block">
                                {machineObj?.tipo || 'Máquina'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={stepIdx === 0}
                              onClick={() => handleMoveRouteStep(stepIdx, 'up')}
                              className={`p-1 rounded transition-colors ${
                                stepIdx === 0 
                                  ? 'text-slate-205 cursor-not-allowed' 
                                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                              }`}
                              title="Mover para cima"
                            >
                              <ArrowUp size={11} />
                            </button>

                            <button
                              type="button"
                              disabled={stepIdx === prodRoute.length - 1}
                              onClick={() => handleMoveRouteStep(stepIdx, 'down')}
                              className={`p-1 rounded transition-colors ${
                                stepIdx === prodRoute.length - 1
                                  ? 'text-slate-250 cursor-not-allowed' 
                                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                              }`}
                              title="Mover para baixo"
                            >
                              <ArrowDown size={11} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveRouteStep(stepIdx)}
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
                        onClick={() => handleAddRouteStep(m.id)}
                        className="py-1 px-2.5 bg-white border border-slate-250 text-slate-700 hover:border-slate-400 rounded-md text-3xs font-bold font-sans transition-all cursor-pointer shadow-3xs flex items-center gap-1 hover:bg-slate-50"
                      >
                        <span>{m.nome}</span>
                        <span className="text-slate-400 font-mono text-[8px] font-extrabold">({m.id.toUpperCase()})</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Campo de Informações Importantes da Ficha Técnica */}
              <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="input-prod-informacoes-importantes" className="block font-sans text-3xs font-extrabold text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-amber-600 shrink-0" />
                    Informações Importantes / Observações da Ficha Técnica
                  </label>
                  <span className="text-[9px] font-mono text-amber-800 font-semibold bg-amber-100/70 px-1.5 py-0.5 rounded border border-amber-200/50">
                    Opcional
                  </span>
                </div>
                <p className="font-sans text-[10px] text-amber-800/90 leading-tight">
                  Escreva aqui notas cruciais sobre este modelo (ex: orientações de colagem/montagem, especificações do cliente, tolerâncias de dobra, padrão de cor, conferências especiais na fábrica, etc.).
                </p>
                <textarea
                  id="input-prod-informacoes-importantes"
                  rows={3}
                  value={prodInformacoesImportantes}
                  onChange={(e) => setProdInformacoesImportantes(e.target.value)}
                  placeholder="Ex: Cuidado com a dobra da aba na colagem; Verniz reserva na área de código de barras; Cliente exige conferência com padrão de cor físico assinado; Não empilhar mais de 500 unidades no pallet..."
                  className="block w-full rounded-lg border border-amber-200 bg-white py-2 px-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-sans leading-relaxed"
                />
              </div>

              {editingProdutoModeloId ? (
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={cancelEditProduto}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 py-2.5 font-sans text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 py-2.5 font-sans text-xs font-semibold text-white transition-colors cursor-pointer"
                    id="btn-submit-produto"
                  >
                    <Check size={14} />
                    Salvar
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-teal-800 hover:bg-teal-700 py-2.5 font-sans text-xs font-semibold text-white transition-colors cursor-pointer"
                  id="btn-submit-produto"
                >
                  <Plus size={14} />
                  Adicionar Ficha Piloto
                </button>
              )}
            </form>
          </div>

          {/* Listagem de Modelos de Produtos */}
          <div className="md:col-span-2 sleek-card p-5 space-y-4 shadow-3xs bg-white rounded-xl border border-slate-200">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-sans text-xs font-extrabold text-slate-900 uppercase tracking-wider">Modelos Cadastrados no Catálogo</h3>
                <p className="font-sans text-[10px] text-slate-400 font-normal">Fichas técnicas prontas que podem ser selecionadas e aplicadas na criação de pedidos.</p>
              </div>
              <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                {produtosModelos.length}
              </span>
            </div>

            {/* Campo de Pesquisa */}
            <div className="relative">
              <input
                type="text"
                placeholder="Pesquisar modelo de produto por descrição, código ou dimensões..."
                value={searchProdutos}
                onChange={(e) => setSearchProdutos(e.target.value)}
                className="w-full text-xs font-sans pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 placeholder:text-slate-400 transition-all bg-slate-50/50"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs select-none">🔍</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {produtosModelos
                .filter(mod => {
                  const q = searchProdutos.toLowerCase();
                  return (
                    mod.descricao.toLowerCase().includes(q) ||
                    (mod.codigo || '').toLowerCase().includes(q) ||
                    (mod.dimensoes || '').toLowerCase().includes(q) ||
                    (mod.material || '').toLowerCase().includes(q) ||
                    (mod.informacoes_importantes || '').toLowerCase().includes(q) ||
                    (mod.observacoes || '').toLowerCase().includes(q)
                  );
                })
                .map(mod => (
                <div key={mod.id} className="rounded-xl border border-slate-150 p-4 bg-slate-25/40 hover:bg-white hover:shadow-xs transition-all flex flex-col justify-between space-y-3.5" id={`view-model-card-${mod.id}`}>
                  <div>
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="font-mono text-4xs font-bold uppercase text-emerald-800 bg-emerald-50 self-start px-1 py-0.5 rounded border border-emerald-100/50">Modelo Homologado</span>
                        {mod.codigo && (
                          <span className="text-[10px] font-mono font-bold text-slate-500 mt-1 uppercase" title="Código ERP">
                            Cód: {mod.codigo}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEditProduto(mod)}
                          className="text-slate-400 hover:bg-slate-100 hover:text-slate-800 p-1 rounded transition-colors cursor-pointer"
                          title="Editar ficha modelo"
                          id={`btn-edit-model-${mod.id}`}
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => triggerConfirm(
                            'Inativar Ficha Técnica / Modelo',
                            `Deseja realmente inativar/remover o modelo "${mod.descricao}" do catálogo?`,
                            () => excluirProdutoModelo(mod.id),
                            { confirmLabel: 'Inativar', variant: 'danger' }
                          )}
                          className="text-slate-400 hover:text-rose-550 p-1 hover:bg-rose-25 rounded transition-colors cursor-pointer"
                          title="Inativar modelo do catálogo"
                          id={`btn-del-model-${mod.id}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <h4 className="font-sans font-bold text-xs text-slate-900 tracking-tight leading-tight mt-1.5">{mod.descricao}</h4>
                    <div className="mt-1">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                        mod.tipo_produto === 'bolacha' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                        mod.tipo_produto === 'manual' ? 'bg-cyan-50 text-cyan-850 border border-cyan-100' :
                        'bg-violet-50 text-violet-800 border border-violet-100'
                      }`}>
                        {mod.tipo_produto === 'bolacha' ? '🍺 Bolacha de Chopp' :
                         mod.tipo_produto === 'manual' ? '📖 Manual Técnico' : '📦 Embalagem'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-3.5 font-mono text-[10px] text-slate-550 border-t border-slate-100 pt-3">
                      <div>
                        <span className="text-slate-400 block font-sans text-4xs uppercase">Dimensões:</span>
                        <strong className="text-slate-800">{mod.dimensoes}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-sans text-4xs uppercase">Medida da Faca (L x C):</span>
                        <strong className="text-amber-850 font-semibold">{mod.medida_faca || 'Não Informada'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-sans text-4xs uppercase">Material Principal:</span>
                        <strong className="text-slate-800 block truncate" title={mod.material}>{mod.material.replace(' (Kg)', '').replace(' (Folhas)', '')}</strong>
                      </div>
                      <div className="pt-1">
                        <span className="text-slate-400 block font-sans text-4xs uppercase">Consumo Unitário (Fator Papel):</span>
                        <strong className="text-slate-900">{mod.fator_consumo} fls / unidade</strong>
                      </div>
                      <div className="pt-1">
                        <span className="text-slate-400 block font-sans text-4xs uppercase">Contatos na Faca:</span>
                        <strong className="text-emerald-800">{mod.contatos_faca || 1} poses/folha</strong>
                      </div>
                      {mod.tipo_produto === 'embalagem' && (
                        <div className="pt-1">
                          <span className="text-slate-400 block font-sans text-4xs uppercase">Pontos de Cola:</span>
                          <strong className="text-indigo-800 font-bold">{mod.pontos_cola === 0 ? 'Sem Cola (0)' : `${mod.pontos_cola !== undefined ? mod.pontos_cola : 1} ponto(s)`}</strong>
                        </div>
                      )}
                      
                      {mod.insumos_ficha && mod.insumos_ficha.length > 0 && (
                        <div className="col-span-2 pt-1 border-t border-slate-100/60 mt-1 flex flex-col gap-1">
                          <span className="text-slate-400 block font-sans text-4xs uppercase font-semibold">
                            Ficha Técnica Completa ({mod.insumos_ficha.length} Matérias-Primas):
                          </span>
                          <div className="flex flex-col gap-1 bg-slate-50 p-1.5 rounded border border-slate-100">
                            {mod.insumos_ficha.map((item, fIdx) => (
                              <div key={fIdx} className="flex justify-between items-center text-[9px] font-sans text-slate-600 border-b border-slate-100/50 last:border-none pb-0.5 last:pb-0">
                                <span className="font-medium truncate max-w-[130px]" title={item.nome}>{fIdx + 1}. {item.nome || 'Não Selecionado'}</span>
                                <span className="font-mono text-slate-500 text-[8px] shrink-0">Rend: {item.rendimento} | Fat: {item.fator_consumo.toFixed(4)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="col-span-2 pt-1 border-t border-slate-100/60 mt-1 flex flex-col gap-1">
                        <span className="text-slate-400 block font-sans text-4xs uppercase">
                          Cores de Impressão ({mod.cores_quantidade || 0}) 
                          <span className="text-indigo-600 font-bold ml-1">
                            (Frente: {mod.cores_frente !== undefined ? mod.cores_frente : (mod.cores_quantidade || 0)} | Verso: {mod.cores_verso || 0})
                          </span>:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {mod.pantones && mod.pantones.length > 0 ? (
                            mod.pantones.map((pantoneCode, pIdx) => {
                              const hex = getPantoneColor(pantoneCode);
                              const isFrente = pIdx < (mod.cores_frente !== undefined ? mod.cores_frente : (mod.cores_quantidade || 0));
                              return (
                                <span key={pIdx} className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[9px] font-sans font-semibold text-slate-700 shadow-3xs">
                                  <span className="w-2.5 h-2.5 rounded-sm border border-slate-250 shrink-0" style={{ backgroundColor: hex }}></span>
                                  <span>{pantoneCode}</span>
                                  <span className={`text-[7px] font-extrabold px-1 rounded-sm ${isFrente ? 'bg-sky-50 text-sky-700' : 'bg-purple-50 text-purple-700'}`}>
                                    {isFrente ? 'F' : 'V'}
                                  </span>
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-slate-400 text-[8px] italic">Nenhuma cor ou Pantone registrado</span>
                          )}
                        </div>
                      </div>

                      {mod.grade_itens && mod.grade_itens.length > 0 && (
                        <div className="col-span-2 pt-1 border-t border-slate-100/60 mt-1 flex flex-col gap-1">
                          <span className="text-slate-400 block font-sans text-4xs uppercase font-semibold">
                            Composição da Grade de Artes / Modelos ({mod.grade_itens.length} itens):
                          </span>
                          <div className="grid grid-cols-1 gap-1 bg-amber-50/30 p-1.5 rounded border border-amber-100/40">
                            {mod.grade_itens.map((item, gIdx) => (
                              <div key={gIdx} className="flex justify-between items-center text-[9px] font-sans text-amber-900 border-b border-amber-100/20 last:border-none pb-0.5 last:pb-0">
                                <span className="font-medium truncate max-w-[130px]" title={item.descricao}>
                                  {item.codigo ? `[${item.codigo}] ` : ''}{item.descricao || `Item ${gIdx + 1}`}
                                </span>
                                <span className="font-mono text-amber-700 text-[8px] shrink-0 font-bold">
                                  {item.contatos} {item.contatos === 1 ? 'pose' : 'poses'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-2.5 mt-2 flex flex-col gap-1">
                    <span className="font-sans text-4xs text-slate-400 uppercase font-black tracking-wider">Roteiro Produtivo:</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {mod.roteiro.map((node, stepIdx) => {
                        const mInfo = maquinas.find(m => m.id === node);
                        return (
                          <div key={`${node}-${stepIdx}`} className="flex items-center gap-1 font-mono text-3xs font-semibold text-slate-800">
                            {stepIdx > 0 && <span className="text-slate-300">→</span>}
                            <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-3xs max-w-[80px] truncate" title={`${mInfo?.nome || node}`}>
                              {node.toUpperCase()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Downloads de Faca e Arte */}
                  {(mod.faca_pdf_url || mod.arte_pdf_url) && (
                    <div className="border-t border-slate-150 pt-2.5 mt-2 flex flex-col gap-1.5">
                      <span className="font-sans text-[9px] text-slate-400 uppercase font-black tracking-wider">Documentos do Produto:</span>
                      <div className="flex gap-2">
                        {mod.faca_pdf_url && (() => {
                          const isLink = mod.faca_pdf_url.startsWith('http') || mod.faca_pdf_url.startsWith('www.');
                          const name = mod.faca_pdf_nome || 'Faca do Produto';
                          return (
                            <a
                              href={mod.faca_pdf_url}
                              target={isLink ? "_blank" : undefined}
                              rel={isLink ? "noopener noreferrer" : undefined}
                              download={isLink ? undefined : (mod.faca_pdf_nome || `faca_${mod.id}.pdf`)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg bg-rose-50 border border-rose-150 hover:bg-rose-100 text-rose-700 font-sans font-bold text-3xs transition-all cursor-pointer shadow-3xs"
                              title={isLink ? `Abrir Link da Faca: ${name}` : `Baixar Faca: ${name}`}
                            >
                              {isLink ? (
                                <ExternalLink size={10} className="shrink-0 text-rose-500" />
                              ) : (
                                <FileText size={10} className="shrink-0 text-rose-500" />
                              )}
                              <span className="truncate max-w-[80px]">{isLink ? `Link: ${name}` : name}</span>
                            </a>
                          );
                        })()}
                        {mod.arte_pdf_url && (() => {
                          const isLink = mod.arte_pdf_url.startsWith('http') || mod.arte_pdf_url.startsWith('www.');
                          const name = mod.arte_pdf_nome || 'Arte do Produto';
                          return (
                            <a
                              href={mod.arte_pdf_url}
                              target={isLink ? "_blank" : undefined}
                              rel={isLink ? "noopener noreferrer" : undefined}
                              download={isLink ? undefined : (mod.arte_pdf_nome || `arte_${mod.id}.pdf`)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg bg-indigo-50 border border-indigo-150 hover:bg-indigo-100 text-indigo-700 font-sans font-bold text-3xs transition-all cursor-pointer shadow-3xs"
                              title={isLink ? `Abrir Link da Arte: ${name}` : `Baixar Arte: ${name}`}
                            >
                              {isLink ? (
                                <ExternalLink size={10} className="shrink-0 text-indigo-500" />
                              ) : (
                                <FileText size={10} className="shrink-0 text-indigo-500" />
                              )}
                              <span className="truncate max-w-[80px]">{isLink ? `Link: ${name}` : name}</span>
                            </a>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Informações Importantes / Observações Técnicas Registradas */}
                  {(mod.informacoes_importantes || mod.observacoes) && (
                    <div className="border-t border-amber-200/70 pt-2.5 mt-2 bg-amber-50/70 rounded-lg p-2.5 border border-amber-200 shadow-3xs">
                      <span className="font-sans text-[10px] font-extrabold text-amber-950 uppercase flex items-center gap-1.5 mb-1 tracking-tight">
                        <AlertCircle size={12} className="text-amber-600 shrink-0" />
                        Informações Importantes:
                      </span>
                      <p className="text-[11px] font-sans text-slate-800 whitespace-pre-wrap leading-relaxed font-medium">
                        {mod.informacoes_importantes || mod.observacoes}
                      </p>
                    </div>
                  )}

                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* --- MÁQUINAS TAB CONTENT --- */}
      {activeSubTab === 'maquinas' && (
        <div className="grid gap-6 md:grid-cols-3">
          
          {/* Cadastro de Máquina Nova */}
          <div className="sleek-card p-5 space-y-4 shadow-3xs bg-white rounded-xl border border-slate-200">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-sans text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu size={16} className="text-blue-600" />
                {editingMaquinaId ? 'Editar Máquina' : 'Nova Máquina'}
              </h3>
              <p className="font-sans text-[10px] text-slate-400 font-normal">
                {editingMaquinaId ? 'Altere as especificações técnicas e de custos desse recurso.' : 'Insira um novo recurso produtivo para o roteiro gráfico.'}
              </p>
            </div>

            <form onSubmit={handleAddMaquinaSubmit} className="space-y-3.5" id="form-create-maquina">
              <div>
                <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">Código ERP / Ativo</label>
                <input
                  type="text"
                  value={maqCodigo}
                  onChange={(e) => setMaqCodigo(e.target.value)}
                  placeholder="Ex: MAQ-104"
                  className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">Nome do Equipamento / Recurso</label>
                <input
                  type="text"
                  required
                  value={maqNome}
                  onChange={(e) => setMaqNome(e.target.value)}
                  placeholder="Ex: Heidelberg XL 106 6 Cores"
                  className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">Processo Gráfico Subjacente</label>
                <select
                  value={maqTipo}
                  onChange={(e) => setMaqTipo(e.target.value as any)}
                  className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                >
                  <option value="Impressão">Impressão (Ofset, Flexo)</option>
                  <option value="Corte">Corte & Vinco, Faca Plana</option>
                  <option value="Acabamento">Acabamento, Dobra & Colagem, Revestimento</option>
                </select>
              </div>

              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 border-b border-indigo-100 pb-2">
                  <span className="block font-sans text-[10px] font-black text-indigo-900 uppercase tracking-wider">Produtividade Nominal</span>
                  
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <span className="font-sans text-[9px] font-extrabold text-slate-500 uppercase">Medir Rendimento Por:</span>
                    <select
                      value={maqTipoVelocidade}
                      onChange={(e) => setMaqTipoVelocidade(e.target.value as 'unidade' | 'folha')}
                      className="rounded border border-slate-200 bg-white text-[9px] font-bold text-slate-800 px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-550"
                    >
                      <option value="unidade">Unidades (un/h)</option>
                      <option value="folha">Folhas (fls/h)</option>
                    </select>
                  </div>
                </div>

                <p className="font-sans text-[9px] text-indigo-750 font-normal leading-tight">
                  {maqTipoVelocidade === 'folha' 
                    ? '⚠️ Velocidade calculada em Folhas por hora (impressora, corte e vinco, etc). O PCP multiplicará este rendimento pelos "Contatos na Faca" da ficha técnica para obter as peças/unidades finais.' 
                    : 'Velocidade calculada diretamente em unidades (peças) prontas por hora.'}
                </p>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <label className="block font-sans text-[9px] font-bold text-slate-500 uppercase mb-0.5" title="Embalagem">📦 Embalagem ({maqTipoVelocidade === 'folha' ? 'fls' : 'un'}/h)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={maqCapacidadeEmbalagem}
                      onChange={(e) => setMaqCapacidadeEmbalagem(Number(e.target.value))}
                      placeholder="5000"
                      className="block w-full rounded-lg border border-slate-205 bg-white py-1 px-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-sans text-[9px] font-bold text-slate-500 uppercase mb-0.5" title="Manual Técnico">📖 Manual ({maqTipoVelocidade === 'folha' ? 'fls' : 'un'}/h)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={maqCapacidadeManual}
                      onChange={(e) => setMaqCapacidadeManual(Number(e.target.value))}
                      placeholder="2500"
                      className="block w-full rounded-lg border border-slate-205 bg-white py-1 px-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-sans text-[9px] font-bold text-slate-500 uppercase mb-0.5" title="Bolacha de Chopp">🍺 Bolacha ({maqTipoVelocidade === 'folha' ? 'fls' : 'un'}/h)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={maqCapacidadeBolacha}
                      onChange={(e) => setMaqCapacidadeBolacha(Number(e.target.value))}
                      placeholder="10000"
                      className="block w-full rounded-lg border border-slate-205 bg-white py-1 px-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-sans text-[10px] font-extrabold text-slate-500 uppercase mb-1">Tempo setup (minutos)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={maqTempoSetup}
                    onChange={(e) => setMaqTempoSetup(Number(e.target.value))}
                    placeholder="30"
                    className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-sans text-[10px] font-extrabold text-slate-500 uppercase mb-1">SETUP Cores (minutos)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={maqSetupCores}
                    onChange={(e) => setMaqSetupCores(Number(e.target.value))}
                    placeholder="15"
                    className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">Valor de Aquisição (R$)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="100"
                    value={maqValorAquisicao}
                    onChange={(e) => setMaqValorAquisicao(Number(e.target.value))}
                    placeholder="300000"
                    className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">Vida Útil Estimada (Anos)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="50"
                    step="1"
                    value={maqVidaUtilAnos}
                    onChange={(e) => setMaqVidaUtilAnos(Number(e.target.value))}
                    placeholder="10"
                    className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">Operador Vinculado (Padrão)</label>
                <select
                  value={maqOperadorId}
                  onChange={(e) => setMaqOperadorId(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                >
                  <option value="">Nenhum (Usar Média de Custos)</option>
                  {operadores.map(op => (
                    <option key={op.id} value={op.id}>
                      {op.nome} ({op.cargo || 'Operador'} • R$ {op.custo_hora || 0}/h)
                    </option>
                  ))}
                </select>
              </div>

              {/* Box de Cálculo em Tempo Real */}
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg space-y-1.5 font-sans">
                <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Cálculo de Depreciação Automático</span>
                <div className="flex justify-between text-3xs text-slate-650">
                  <span>Depreciação Mensal:</span>
                  <strong className="text-slate-900 font-mono">
                    R$ {((maqValorAquisicao && maqVidaUtilAnos) ? (maqValorAquisicao / maqVidaUtilAnos) / 12 : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mês
                  </strong>
                </div>
                <div className="flex justify-between text-3xs text-slate-650">
                  <div className="flex items-center gap-1">
                    <span>Depreciação por Hora:</span>
                    <span className="text-[8px] text-slate-400 font-normal leading-none">(160h/mês)</span>
                  </div>
                  <strong className="text-blue-900 font-mono">
                    R$ {(((maqValorAquisicao && maqVidaUtilAnos) ? (maqValorAquisicao / maqVidaUtilAnos) / 12 : 0) / 160).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}/h
                  </strong>
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-3xs text-blue-800 flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 text-blue-600 mt-0.5" />
                <p className="leading-relaxed">
                  Novos equipamentos são inicializados com o status operacional <strong>ociosa</strong> e aparecem como novas colunas flexíveis no Kanban de Produção instantaneamente.
                </p>
              </div>

              {editingMaquinaId ? (
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={cancelEditMaquina}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 py-2.5 font-sans text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 py-2.5 font-sans text-xs font-semibold text-white transition-colors cursor-pointer"
                    id="btn-submit-maquina"
                  >
                    <Check size={14} />
                    Salvar
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 py-2.5 font-sans text-xs font-semibold text-white transition-colors cursor-pointer"
                  id="btn-submit-maquina"
                >
                  <Plus size={14} />
                  Cadastrar Ativo de Máquina
                </button>
              )}
            </form>
          </div>

          {/* Listagem de Máquinas cadastrados */}
          <div className="md:col-span-2 sleek-card p-5 space-y-4 shadow-3xs bg-white rounded-xl border border-slate-200 font-sans">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-sans text-xs font-extrabold text-slate-900 uppercase tracking-wider">Máquinas e Ativos em Linha</h3>
                <p className="font-sans text-[10px] text-slate-400 font-normal">Capacidades de produção de embalagens mapeadas na planta.</p>
              </div>
              <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                {maquinas.length} ativos
              </span>
            </div>

            {/* Campo de Pesquisa */}
            <div className="relative">
              <input
                type="text"
                placeholder="Pesquisar máquina por nome, tipo, operador ou código..."
                value={searchMaquinas}
                onChange={(e) => setSearchMaquinas(e.target.value)}
                className="w-full text-xs font-sans pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 placeholder:text-slate-400 transition-all bg-slate-50/50"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs select-none">🔍</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left" id="table-maquinas-catalog">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                    <th className="py-2 px-1">Cód Ativo</th>
                    <th className="py-2 px-1">Nome do Equipamento</th>
                    <th className="py-2 px-1">Tipo</th>
                    <th className="py-2 px-1 text-right">Velo. Fluxo</th>
                    <th className="py-2 px-1 text-right">Tempo Setup</th>
                    <th className="py-2 px-1 text-right">Setup Cores</th>
                    <th className="py-2 px-1 text-right">Aquisição (Vida)</th>
                    <th className="py-2 px-1 text-right text-indigo-700">Depr. Mensal</th>
                    <th className="py-2 px-1 text-right text-sky-700">Depr. Hora</th>
                    <th className="py-2 px-1 text-left pl-3 text-indigo-850">Operador</th>
                    <th className="py-2 px-1 text-center">Status</th>
                    <th className="py-2 px-1 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60 font-sans text-[10px] text-slate-700">
                  {maquinas
                    .filter(maq => {
                      const q = searchMaquinas.toLowerCase();
                      const op = operadores.find(o => o.id === maq.operador_id);
                      return (
                        maq.nome.toLowerCase().includes(q) ||
                        maq.id.toLowerCase().includes(q) ||
                        (maq.codigo || '').toLowerCase().includes(q) ||
                        maq.tipo.toLowerCase().includes(q) ||
                        (op?.nome || '').toLowerCase().includes(q)
                      );
                    })
                    .map(maq => {
                      const deprM = maq.depreciacao_mensal || (maq.valor_aquisicao ? ((maq.valor_aquisicao / (maq.vida_util_anos || 10)) / 12) : 0);
                      const deprH = deprM / 160;

                      return (
                      <tr key={maq.id} className="hover:bg-slate-25/50 transition-colors" id={`maq-row-${maq.id}`}>
                        <td className="py-2 px-1 font-mono text-[9px] font-semibold uppercase text-slate-500">
                          <div>{maq.id}</div>
                          {maq.codigo && <div className="text-[8px] text-slate-400 font-normal mt-0.5" title="Código ERP">ERP: {maq.codigo}</div>}
                        </td>
                        <td className="py-2 px-1 font-semibold text-slate-900 leading-tight">{maq.nome}</td>
                        <td className="py-2 px-1">
                          <span className={`px-1 rounded-full text-[8px] font-bold uppercase tracking-tight ${
                            maq.tipo === 'Impressão' ? 'bg-amber-50 text-amber-800 border border-amber-100' :
                            maq.tipo === 'Corte' ? 'bg-cyan-50 text-cyan-850 border border-cyan-150' :
                            'bg-purple-50 text-purple-800 border border-purple-100'
                          }`}>
                            {maq.tipo}
                          </span>
                        </td>
                        <td className="py-1 px-1 text-right font-sans text-slate-800 whitespace-nowrap leading-tight text-[9px]">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-mono text-[9px] text-slate-900" title="Embalagens">📦 {(maq.capacidade_embalagem || maq.capacidade_hora || 5000).toLocaleString('pt-BR')} {maq.tipo_velocidade === 'folha' ? 'fls' : 'un'}/h</span>
                            <span className="font-mono text-[9px] text-blue-700" title="Manuais Técnicos">📖 {(maq.capacidade_manual || Math.round((maq.capacidade_hora || 5000) / 2) || 2500).toLocaleString('pt-BR')} {maq.tipo_velocidade === 'folha' ? 'fls' : 'un'}/h</span>
                            <span className="font-mono text-[9px] text-emerald-700" title="Bolachas de Chopp">🍺 {(maq.capacidade_bolacha || ((maq.capacidade_hora || 5000) * 2) || 10000).toLocaleString('pt-BR')} {maq.tipo_velocidade === 'folha' ? 'fls' : 'un'}/h</span>
                            <span className={`text-[8px] font-sans font-extrabold mt-0.5 px-1 rounded uppercase tracking-wider ${
                              maq.tipo_velocidade === 'folha' ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-slate-105 text-slate-600 border border-slate-200'
                            }`} title={maq.tipo_velocidade === 'folha' ? 'Velocidade em Folhas operadas' : 'Velocidade em Unidades finais'}>
                              {maq.tipo_velocidade === 'folha' ? 'Medida: Folha' : 'Medida: Peça'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-1 text-right font-mono font-medium text-slate-800">
                          {maq.tempo_setup || 0} min
                        </td>
                        <td className="py-2 px-1 text-right font-mono font-medium text-slate-800">
                          {maq.setup_cores || 0} min
                        </td>
                        <td className="py-2 px-1 text-right font-mono text-slate-400 whitespace-nowrap">
                          {maq.valor_aquisicao ? `R$ ${maq.valor_aquisicao.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : 'N/A'}{' '}
                          <span className="text-slate-400 text-[8px] font-sans">({maq.vida_util_anos || 10}a)</span>
                        </td>
                        <td className="py-2 px-1 text-right font-mono text-indigo-700 whitespace-nowrap font-medium">
                          R$ {deprM.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-1 text-right font-mono text-sky-700 whitespace-nowrap font-medium">
                          R$ {deprH.toLocaleString('pt-BR', { minimumFractionDigits: 4 })}
                        </td>
                        <td className="py-2 px-1 pl-3 text-left whitespace-nowrap">
                          <select
                            value={maq.operador_id || ''}
                            onChange={(e) => vincularOperadorMaquina(maq.id, e.target.value || undefined)}
                            className="bg-white border border-slate-200 text-[9px] rounded px-1.5 py-0.5 text-slate-800 font-medium focus:outline-none focus:border-indigo-400 max-w-[100px] truncate animate-none"
                          >
                            <option value="">Pool (Média)</option>
                            {operadores.map(op => (
                              <option key={op.id} value={op.id}>
                                {op.nome}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-1 text-center">
                          <span className="inline-flex items-center gap-1 text-slate-650 justify-center">
                            <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[8px] font-semibold text-slate-500 uppercase">{maq.status_atual}</span>
                          </span>
                        </td>
                        <td className="py-2 px-1 text-right">
                          <div className="flex justify-end gap-0.5">
                            <button
                              onClick={() => startEditMaquina(maq)}
                              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer"
                              title="Editar máquina"
                              id={`btn-edit-maq-${maq.id}`}
                            >
                              <Edit size={12} />
                            </button>
                            <button
                              onClick={() => triggerConfirm(
                                'Remover Máquina',
                                `Tem certeza que deseja remover a máquina "${maq.nome}"? Esta ação removerá a máquina de toda a esteira do PCP.`,
                                () => excluirMaquina(maq.id),
                                { confirmLabel: 'Sim, Remover', variant: 'danger' }
                              )}
                              className="rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer"
                              title="Remover máquina"
                              id={`btn-del-maq-${maq.id}`}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* --- INSUMOS TAB CONTENT --- */}
      {activeSubTab === 'insumos' && (
        <div className="grid gap-6 md:grid-cols-3">
          
          {/* Cadastro de Insumo/Suprimento */}
          <div className="sleek-card p-5 space-y-4 shadow-3xs bg-white rounded-xl border border-slate-200 animate-fadeIn" id="creation-insumo-form">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-sans text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Package size={16} className="text-teal-600" />
                {editingInsumoId ? 'Editar Insumo / Suprimento' : 'Novo Insumo / Suprimento'}
              </h3>
              <p className="font-sans text-[10px] text-slate-400 font-normal">
                {editingInsumoId ? 'Altere os dados desse material ou suprimento do estoque.' : 'Insira suprimentos ou insumos no estoque base.'}
              </p>
            </div>

            <form onSubmit={handleAddInsumoSubmit} className="space-y-3.5" id="form-create-insumo">
              <div>
                <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">Código ERP / Material</label>
                <input
                  type="text"
                  value={insCodigo}
                  onChange={(e) => setInsCodigo(e.target.value)}
                  placeholder="Ex: PM-0082"
                  className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">Nome do Insumo / Descrição</label>
                <input
                  type="text"
                  required
                  value={insNome}
                  onChange={(e) => setInsNome(e.target.value)}
                  placeholder="Ex: Verniz de Proteção Fosco UV"
                  className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">Tipo de Matéria-Prima</label>
                  <select
                    value={insTipo}
                    onChange={(e) => setInsTipo(e.target.value as any)}
                    className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-slate-900"
                  >
                    <option value="papel_cartao">Papel Cartão</option>
                    <option value="tinta">Tinta (CMYK)</option>
                    <option value="cola">Cola / Adesivo</option>
                    <option value="verniz">Verniz / Brilho</option>
                    <option value="outro">Outro / Miscelânea</option>
                  </select>
                </div>

                <div>
                  <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">Unidade Física</label>
                  <select
                    value={insUnidade}
                    onChange={(e) => setInsUnidade(e.target.value as any)}
                    className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-slate-900"
                  >
                    <option value="folhas">Folhas (fl)</option>
                    <option value="litros">Litros (l)</option>
                    <option value="unidades">Unidades (un)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">Estoque Inicial</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={insEstoqueAtual}
                    onChange={(e) => setInsEstoqueAtual(Number(e.target.value))}
                    className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">Estoque Mínimo</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={insEstoqueMinimo}
                    onChange={(e) => setInsEstoqueMinimo(Number(e.target.value))}
                    className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-sans text-3xs font-extrabold text-slate-500 uppercase mb-1">Fabricante / Fornecedor</label>
                <input
                  type="text"
                  value={insFornecedor}
                  onChange={(e) => setInsFornecedor(e.target.value)}
                  placeholder="Ex: Suzano, Sun Chemical, Henkel"
                  className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              {editingInsumoId ? (
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={cancelEditInsumo}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 py-2.5 font-sans text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 py-2.5 font-sans text-xs font-semibold text-white transition-colors cursor-pointer"
                    id="btn-submit-insumo"
                  >
                    <Check size={14} />
                    Salvar
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-teal-800 hover:bg-teal-750 py-2.5 font-sans text-xs font-semibold text-white transition-colors cursor-pointer"
                  id="btn-submit-insumo"
                >
                  <Plus size={14} />
                  Cadastrar Suprimento
                </button>
              )}
            </form>
          </div>

          {/* Listagem de Insumos cadastrados */}
          <div className="md:col-span-2 sleek-card p-5 space-y-4 shadow-3xs bg-white rounded-xl border border-slate-200 font-sans">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-sans text-xs font-extrabold text-slate-900 uppercase tracking-wider">Insumos & Suprimentos Cadastrados</h3>
                <p className="font-sans text-[10px] text-slate-400 font-normal">Quadro geral de matérias-primas e ativos de estoque físico.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setImportError(null);
                    setImportLogs([]);
                    setImportModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-teal-50 border border-teal-200 hover:bg-teal-100 px-3 py-1.5 font-sans text-3xs font-extrabold uppercase tracking-wider text-teal-800 transition-colors cursor-pointer"
                  id="btn-open-import-insumos"
                >
                  <FileText size={13} className="text-teal-700" />
                  Importar Planilha
                </button>
                <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-3xs font-bold text-slate-700">
                  {insumos.length} itens
                </span>
              </div>
            </div>

            {/* Campo de Pesquisa */}
            <div className="relative">
              <input
                type="text"
                placeholder="Pesquisar insumo por nome, fornecedor, categoria, ID ou código ERP..."
                value={searchInsumos}
                onChange={(e) => setSearchInsumos(e.target.value)}
                className="w-full text-xs font-sans pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 placeholder:text-slate-400 transition-all bg-slate-50/50"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs select-none">🔍</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left" id="table-insumos-catalog">
                <thead>
                  <tr className="border-b border-slate-100 text-3xs text-slate-400 font-black uppercase tracking-wider">
                    <th className="py-2.5">Código</th>
                    <th className="py-2.5">Nome do Insumo</th>
                    <th className="py-2.5">Categoria</th>
                    <th className="py-2.5 text-right font-semibold">Qtd Atual</th>
                    <th className="py-2.5 text-right">Mínimo</th>
                    <th className="py-2.5 text-right pl-3">Fornecedor</th>
                    <th className="py-2.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60 font-sans text-2xs text-slate-700">
                  {insumos
                    .filter(ins => {
                      const q = searchInsumos.toLowerCase();
                      return (
                        ins.nome.toLowerCase().includes(q) ||
                        ins.id.toLowerCase().includes(q) ||
                        (ins.codigo || '').toLowerCase().includes(q) ||
                        ins.tipo.toLowerCase().includes(q) ||
                        (ins.fornecedor || '').toLowerCase().includes(q)
                      );
                    })
                    .map(ins => {
                      const critico = ins.estoque_atual < ins.estoque_minimo;
                      return (
                      <tr key={ins.id} className={`hover:bg-slate-25/50 transition-colors ${critico ? 'bg-rose-50/10' : ''}`} id={`ins-row-${ins.id}`}>
                        <td className="py-3 font-mono text-3xs font-semibold uppercase text-slate-500">
                          <div>{ins.id}</div>
                          {ins.codigo && <div className="text-[9px] text-slate-400 font-normal mt-0.5" title="Código ERP">ERP: {ins.codigo}</div>}
                        </td>
                        <td className="py-3">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            {ins.nome}
                            {critico && (
                              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" title="Crítico" />
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-4xs font-bold uppercase tracking-tight ${
                            ins.tipo === 'papel_cartao' ? 'bg-orange-50 text-orange-850 border border-orange-100' :
                            ins.tipo === 'tinta' ? 'bg-cyan-50 text-cyan-850 border border-cyan-150' :
                            ins.tipo === 'cola' ? 'bg-indigo-50 text-indigo-850 border border-indigo-150' :
                            ins.tipo === 'verniz' ? 'bg-purple-50 text-purple-800 border border-purple-100' :
                            'bg-gray-50 text-gray-800 border border-gray-150'
                          }`}>
                            {ins.tipo === 'papel_cartao' ? 'Papel Cartão' :
                             ins.tipo === 'tinta' ? 'Tinta CMYK' :
                             ins.tipo === 'cola' ? 'Cola' :
                             ins.tipo === 'verniz' ? 'Verniz' : 'Outro'}
                          </span>
                        </td>
                        <td className={`py-3 text-right font-mono font-bold ${critico ? 'text-rose-600' : 'text-slate-950'}`}>
                          {ins.estoque_atual.toLocaleString('pt-BR')} {ins.unidade}
                        </td>
                        <td className="py-3 text-right font-mono text-slate-500">{ins.estoque_minimo.toLocaleString('pt-BR')} {ins.unidade}</td>
                        <td className="py-3 text-right text-slate-500 truncate max-w-[110px]" title={ins.fornecedor}>{ins.fornecedor}</td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => startEditInsumo(ins)}
                              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer"
                              title="Editar insumo"
                              id={`btn-edit-ins-${ins.id}`}
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              onClick={() => triggerConfirm(
                                'Remover Insumo do Estoque',
                                `Tem certeza que deseja excluir o insumo "${ins.nome}"? Esta ação removerá o insumo do cadastro do estoque base de matérias-primas.`,
                                () => excluirInsumo(ins.id),
                                { confirmLabel: 'Sim, Excluir', variant: 'danger' }
                              )}
                              className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer"
                              title="Remover insumo"
                              id={`btn-del-ins-${ins.id}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* --- OPERADORES TAB CONTENT --- */}
      {activeSubTab === 'operadores' && (
        <div className="grid gap-6 md:grid-cols-3">
          
          {/* Cadastro de Operador Novo */}
          <div className="md:col-span-1">
            <div className="sleek-card bg-white p-5 rounded-xl border border-slate-200 shadow-3xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <UserPlus size={16} className="text-slate-500" />
                <h3 className="font-sans text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {editingOperadorId ? 'Editar Operador' : 'Novo Operador'}
                </h3>
              </div>

              <form onSubmit={handleAddOperadorSubmit} className="space-y-4 font-sans text-2xs">
                <div>
                  <label className="block text-3xs font-extrabold text-slate-500 uppercase mb-1.5">Nome Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João da Silva"
                    value={opNome}
                    onChange={(e) => setOpNome(e.target.value)}
                    className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-3xs font-extrabold text-slate-500 uppercase mb-1.5">Cargo / Função</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Operador Offset Master"
                    value={opCargo}
                    onChange={(e) => setOpCargo(e.target.value)}
                    className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 font-sans text-2xs">
                  <div>
                    <label className="block text-3xs font-extrabold text-slate-500 uppercase mb-1.5" title="Horas Trabalhadas por Mês">Horas/Mês</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={opHorasMensais}
                      onChange={(e) => {
                        const h = Number(e.target.value) || 0;
                        setOpHorasMensais(h);
                        if (h > 0) {
                          setOpCustoHora(Number((opCustoMensal / h).toFixed(2)));
                        }
                      }}
                      className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs text-slate-800 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-3xs font-extrabold text-slate-500 uppercase mb-1.5">Custo Mensal</label>
                    <div className="relative font-sans">
                      <span className="absolute left-2.5 top-1.5 text-slate-400 font-mono text-3xs">R$</span>
                      <input
                        type="number"
                        required
                        min="0"
                        step="any"
                        value={opCustoMensal}
                        onChange={(e) => {
                          const m = Number(e.target.value) || 0;
                          setOpCustoMensal(m);
                          if (opHorasMensais > 0) {
                            setOpCustoHora(Number((m / opHorasMensais).toFixed(2)));
                          }
                        }}
                        className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-6 pr-1 text-xs text-slate-800 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-3xs font-extrabold text-slate-500 uppercase mb-1.5">Custo Hora</label>
                    <div className="relative font-sans">
                      <span className="absolute left-2.5 top-1.5 text-slate-400 font-mono text-3xs">R$</span>
                      <input
                        type="number"
                        required
                        min="0"
                        step="any"
                        value={opCustoHora}
                        onChange={(e) => {
                          const hc = Number(e.target.value) || 0;
                          setOpCustoHora(hc);
                          if (opHorasMensais > 0) {
                            setOpCustoMensal(Math.round(hc * opHorasMensais));
                          }
                        }}
                        className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-6 pr-1 text-xs text-slate-800 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                {editingOperadorId ? (
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={cancelEditOperador}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 py-2.5 font-sans text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 py-2.5 font-sans text-xs font-semibold text-white transition-colors cursor-pointer"
                      id="btn-submit-op"
                    >
                      <Check size={14} />
                      Salvar
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-white font-sans text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer shadow-xs mt-2"
                    id="btn-submit-op"
                  >
                    <Plus size={14} />
                    Cadastrar Operador
                  </button>
                )}
              </form>
            </div>
          </div>

          {/* Listagem de Operadores Cadastrados */}
          <div className="md:col-span-2 space-y-4">
            <div className="sleek-card bg-white rounded-xl border border-slate-200 shadow-3xs p-5">
              <div className="flex md:items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-slate-500" />
                  <h3 className="font-sans text-xs font-bold text-slate-800 uppercase tracking-wider">Quadro de Operadores de Produção</h3>
                </div>
                <span className="font-mono text-3xs font-bold text-slate-500">
                  Total: {operadores.length} Colaboradores
                </span>
              </div>

              {/* Campo de Pesquisa */}
              <div className="relative mt-3">
                <input
                  type="text"
                  placeholder="Pesquisar operador por nome, cargo ou ID..."
                  value={searchOperadores}
                  onChange={(e) => setSearchOperadores(e.target.value)}
                  className="w-full text-xs font-sans pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 placeholder:text-slate-400 transition-all bg-slate-50/50"
                />
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs select-none">🔍</span>
              </div>

              {operadores.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle size={24} className="text-slate-400 mx-auto mb-2" />
                  <p className="text-3xs text-slate-500 font-sans">Nenhum operador cadastrado no sistema.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-sans text-2xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-3xs text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5">Colaborador</th>
                        <th className="py-2.5">Cargo / Função</th>
                        <th className="py-2.5 text-right">Horas/Mês</th>
                        <th className="py-2.5 text-right">Custo p/ Hora</th>
                        <th className="py-2.5 text-right">Custo Mensal</th>
                        <th className="py-2.5 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {operadores
                        .filter(op => {
                          const q = searchOperadores.toLowerCase();
                          return (
                            op.nome.toLowerCase().includes(q) ||
                            op.id.toLowerCase().includes(q) ||
                            (op.cargo || '').toLowerCase().includes(q)
                          );
                        })
                        .map((op) => (
                        <tr key={op.id} className="hover:bg-slate-25/50 transition-colors" id={`row-op-${op.id}`}>
                          <td className="py-3 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-650 text-[10px]">
                                {op.nome.slice(0, 2).toUpperCase()}
                              </span>
                              <div>
                                <span>{op.nome}</span>
                                <span className="text-[9px] font-mono text-slate-400 block">{op.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-slate-550 font-medium">
                            {op.cargo || 'Operador de Máquinas'}
                          </td>
                          <td className="py-3 text-right font-mono font-semibold text-slate-950 font-medium whitespace-nowrap">
                            {op.horas_mensais || 160}h
                          </td>
                          <td className="py-3 text-right font-mono font-semibold text-slate-950 font-medium whitespace-nowrap">
                            R$ {op.custo_hora ? op.custo_hora.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}/h
                          </td>
                          <td className="py-3 text-right font-mono font-semibold text-slate-950 font-medium whitespace-nowrap">
                            R$ {op.custo_mensal ? op.custo_mensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => startEditOperador(op)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer"
                                title="Editar operador"
                                id={`btn-edit-op-${op.id}`}
                              >
                                <Edit size={13} />
                              </button>
                              <button
                                onClick={() => triggerConfirm(
                                  'Excluir Operador',
                                  `Tem certeza que deseja excluir o operador "${op.nome}" do cadastro?`,
                                  () => excluirOperador(op.id),
                                  { confirmLabel: 'Sim, Excluir', variant: 'danger' }
                                )}
                                className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer"
                                title="Remover operador"
                                id={`btn-del-op-${op.id}`}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Banner explicativo de custos de mão de obra */}
            <div className="p-4 bg-blue-50/50 border border-blue-150 rounded-xl text-3xs text-slate-600 font-sans leading-relaxed flex items-start gap-3">
              <DollarSign className="text-blue-700 shrink-0 mt-0.5" size={16} />
              <div>
                <span className="font-bold text-slate-800 block mb-0.5">Metodologia de Custos de Mão de Obra</span>
                O custo por hora informada (R$/h) é aplicado sobre os apontamentos de produção para mensurar a eficiência de mão de obra direta de cada lote, enquanto a folha de pagamento mensal (Custo Mensal) é somada aos custos de infraestrutura e depreciação técnica para apurar o ponto de equilíbrio global e alocação de tarifas.
              </div>
            </div>
          </div>

        </div>
      )}

      {/* --- EXCEL IMPORT MODAL --- */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="sleek-card w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden font-sans animate-scaleIn">
            {/* Header */}
            <div className="border-b border-slate-100 p-5 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="text-teal-700" size={18} />
                <h3 className="font-sans text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Importar Insumos por Planilha
                </h3>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Instructions */}
              <div className="p-3.5 bg-amber-50 border border-amber-150 rounded-lg text-2xs text-slate-700 space-y-2">
                <span className="font-bold text-amber-850 block">Formato da Planilha:</span>
                <p>O sistema aceita arquivos Excel (.xlsx, .xls) ou CSV. As colunas podem estar em qualquer ordem, mas certifique-se de que tenham cabeçalhos reconhecíveis:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Nome / Descrição</strong> (Obrigatório)</li>
                  <li><strong>Código ERP / Código</strong></li>
                  <li><strong>Tipo / Categoria</strong> (Papel Cartão, Tinta, Cola, Verniz, Outro)</li>
                  <li><strong>Unidade</strong> (Folhas, Litros, Unidades)</li>
                  <li><strong>Estoque Atual / Quantidade</strong></li>
                  <li><strong>Estoque Mínimo / Mínimo</strong></li>
                  <li><strong>Fornecedor / Fabricante</strong></li>
                </ul>
              </div>

              {/* File Dropzone / Selector */}
              {!importing && importLogs.length === 0 && (
                <div className="border-2 border-dashed border-slate-200 hover:border-teal-500 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-2.5 transition-all relative">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleImportExcel}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="p-3 bg-teal-50 text-teal-800 rounded-full">
                    <Upload size={22} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Selecione ou Arraste o Arquivo</p>
                    <p className="text-4xs text-slate-400 mt-1 uppercase tracking-wider">Suporta .xlsx, .xls e .csv</p>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {importing && (
                <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
                  <div className="h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-semibold text-slate-600">Lendo e interpretando planilha...</p>
                </div>
              )}

              {/* Error Box */}
              {importError && (
                <div className="p-3.5 bg-rose-50 border border-rose-150 rounded-lg text-2xs text-rose-800 flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Ocorreu um erro:</span>
                    <p>{importError}</p>
                  </div>
                </div>
              )}

              {/* Success / Logs Box */}
              {importLogs.length > 0 && (
                <div className="space-y-2">
                  <div className="p-3 bg-teal-50 border border-teal-150 rounded-lg text-2xs text-teal-800 flex items-start gap-2">
                    <Check size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Sucesso!</span>
                      <p>A importação foi concluída. Confira os logs abaixo:</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg text-4xs font-mono text-slate-600 max-h-40 overflow-y-auto space-y-1">
                    {importLogs.map((log, i) => (
                      <div key={i} className="border-b border-slate-100 pb-1 last:border-0 last:pb-0">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex justify-end gap-2">
              {importLogs.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setImportModalOpen(false);
                    setImportLogs([]);
                  }}
                  className="rounded-lg bg-teal-800 hover:bg-teal-750 px-4 py-2 font-sans text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Concluir
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setImportModalOpen(false)}
                    className="rounded-lg bg-slate-100 hover:bg-slate-200 px-4 py-2 font-sans text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
