import React, { useState, useMemo, useCallback } from 'react';
import { usePCP } from '../context/PCPContext';
import { ConfirmationDialog } from './ConfirmationDialog';
import { 
  Calculator, 
  Coins, 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  Layers, 
  Wrench, 
  DollarSign, 
  Percent, 
  ChevronRight, 
  CheckCircle2,
  FileSpreadsheet,
  Trash2,
  Plus,
  Sliders,
  Gauge,
  Printer,
  X,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { ProdutoModelo, Maquina, Produto, Pedido } from '../types';

export function CustosView() {
  const { 
    produtosModelos, 
    maquinas, 
    produtos, 
    pedidos, 
    clientes,
    custosGerais,
    adicionarCustoGeral,
    excluirCustoGeral,
    taxasPresumido,
    atualizarTaxasPresumido,
    operadores,
    editarMaquina
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

  const avgOperadorHora = operadores.length > 0
    ? operadores.reduce((acc, op) => acc + (op.custo_hora || 0), 0) / operadores.length
    : 22;

  // --- TAB DO MÓDULO ---
  // 'simulador' | 'pedidos_custos' | 'custos_gerais' | 'depreciacao_maquinas' | 'impostos_presumido'
  const [activeSubTab, setActiveSubTab] = useState<'simulador' | 'pedidos_custos' | 'custos_gerais' | 'depreciacao_maquinas' | 'impostos_presumido'>('simulador');

  // --- ESTADOS DO SIMULADOR ---
  const [selectedModeloId, setSelectedModeloId] = useState<string>(produtosModelos[0]?.id || '');
  const [simlQtd, setSimlQtd] = useState<number>(5000);
  const [simlMarkup, setSimlMarkup] = useState<number>(35); // 35% de markup de lucro padrão
  const [simlAcabamentoOperadores, setSimlAcabamentoOperadores] = useState<number>(1);
  const [pedidoAcabamentoOperadores, setPedidoAcabamentoOperadores] = useState<Record<string, number>>({});
  const [isPrintingSimulador, setIsPrintingSimulador] = useState<boolean>(false);

  // --- ESTADOS DE CUSTOS GERAIS ---
  const [cgDesc, setCgDesc] = useState('');
  const [cgValor, setCgValor] = useState<number>(1500);
  const [cgRecorrencia, setCgRecorrencia] = useState<'Mensal' | 'Anual' | 'Único'>('Mensal');
  const [cgCategoria, setCgCategoria] = useState<'Infraestrutura' | 'Administrativo' | 'Impostos' | 'Utilidades (Luz/Água)' | 'Outros'>('Utilidades (Luz/Água)');

  // Handlers
  const handleAddCustoGeral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cgDesc.trim()) return;
    adicionarCustoGeral({
      descricao: cgDesc.trim(),
      valor: Number(cgValor) || 0,
      recorrencia: cgRecorrencia,
      categoria: cgCategoria
    });
    setCgDesc('');
    setCgValor(1500);
  };

  // --- ESTADOS DE ALÍQUOTAS DE IMPOSTO LOCAIS ---
  const [taxaPIS, setTaxaPIS] = useState<number>(taxasPresumido?.pis ?? 0.65);
  const [taxaCOFINS, setTaxaCOFINS] = useState<number>(taxasPresumido?.cofins ?? 3.00);
  const [taxaISS, setTaxaISS] = useState<number>(taxasPresumido?.iss ?? 5.50);
  const [taxaIRPJ, setTaxaIRPJ] = useState<number>(taxasPresumido?.irpj ?? 4.80);
  const [taxaCSLL, setTaxaCSLL] = useState<number>(taxasPresumido?.csll ?? 2.88);

  const handleUpdateImpostos = (e: React.FormEvent) => {
    e.preventDefault();
    atualizarTaxasPresumido({
      pis: Number(taxaPIS),
      cofins: Number(taxaCOFINS),
      iss: Number(taxaISS),
      irpj: Number(taxaIRPJ),
      csll: Number(taxaCSLL)
    });
  };

  // --- CÁLCULO DOS CUSTOS FIXOS RATEADOS IGUALMENTE NAS MÁQUINAS ---
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

  const custoFixoPorMaquinaHora = useMemo(() => {
    // Para retrocompatibilidade ou média geral
    return custoFixoPorMaquinaMensal / 160;
  }, [custoFixoPorMaquinaMensal]);

  // --- DETALHES DE COMPARAÇÃO / SIMULAÇÃO RÁPIDA ---
  const selectedModelo = useMemo(() => {
    return produtosModelos.find(m => m.id === selectedModeloId) || produtosModelos[0];
  }, [selectedModeloId, produtosModelos]);

  // Calcula o custo do modelo selecionado
  const simulacaoCusto = useMemo(() => {
    if (!selectedModelo) return null;

    // Calcular taxa de impostos total do lucro presumido
    const taxasPct = (taxasPresumido?.pis || 0) + 
                    (taxasPresumido?.cofins || 0) + 
                    (taxasPresumido?.iss || 0) + 
                    (taxasPresumido?.irpj || 0) + 
                    (taxasPresumido?.csll || 0);

    const detalheEtapas = selectedModelo.roteiro.map(maqId => {
      const maq = maquinas.find(m => m.id === maqId);
      if (!maq) {
        return {
          maqId,
          nome: `Máquina Desconhecida (${maqId})`,
          tipo: 'N/A',
          setup: 0,
          custoHora: 0,
          capacidade: 1,
          tempoHoras: 0,
          custoSetupEtapa: 0,
          custoOperacaoEtapa: 0,
          custoDepreciacaoEtapa: 0,
          custoMaoDeObraEtapa: 0,
          custoFixoEtapa: 0,
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
      let qtdBaseReal = simlQtd;
      
      if (maq.tipo_velocidade === 'folha') {
        const contatos = selectedModelo.contatos_faca || 1;
        capReal = cap * contatos;
        qtdBaseReal = simlQtd;
      } else {
        capReal = cap;
        qtdBaseReal = (isGuilhotina || isImpressao || isCorte)
          ? simlQtd * factorizationVal
          : simlQtd;
      }

      // Se for acabamento, usar a quantidade de operadores selecionada para o simulador
      const nOperadores = maq.tipo === 'Acabamento' ? simlAcabamentoOperadores : 1;

      const hours = (qtdBaseReal / capReal) / nOperadores;

      // Depreciação alocada com base nas horas trabalhadas
      // Considera 160 horas operacionais de trabalho por mês da máquina
      const deprM = maq.depreciacao_mensal || (maq.valor_aquisicao ? ((maq.valor_aquisicao / (maq.vida_util_anos || 10)) / 12) : 0);
      const depreciacaoPorHora = deprM / 160;

      // Mão de obra (operador running the machine)
      // Se a máquina tiver operador específico, podemos mapear ou usar a média do pool
      const opLinked = maq.operador_id ? operadores.find(o => o.id === maq.operador_id) : undefined;
      const baseOpCustoHora = opLinked ? (opLinked.custo_hora || 0) : avgOperadorHora;
      const opCustoHoraUsado = baseOpCustoHora * nOperadores;

      // Setup Time: base setup + (setup_cores * item_colors)
      const setupMinutes = (maq.tempo_setup || 0) + ((maq.setup_cores || 0) * (selectedModelo.cores_quantidade || 0));
      const setupHours = setupMinutes / 60;

      const custoFixoPorHoramaq = getCustoFixoHoraParaMaquina(maq);

      // Cost calculation with Setup using time * (depreciation + fixed + labor)
      const custoSetupRaw = setupHours * (depreciacaoPorHora + custoFixoPorHoramaq + opCustoHoraUsado);
      
      // Operation (Run) Cost
      const custoOperacaoRaw = hours * (depreciacaoPorHora + custoFixoPorHoramaq + opCustoHoraUsado);

      const custoDepreciacaoRaw = depreciacaoPorHora * (setupHours + hours);
      const custoFixoRaw = custoFixoPorHoramaq * (setupHours + hours);
      const custoMaoDeObraRaw = opCustoHoraUsado * (setupHours + hours);

      const custoTotalRaw = custoSetupRaw + custoOperacaoRaw;

      const setupMo = opCustoHoraUsado * setupHours;
      const setupFixo = (depreciacaoPorHora + custoFixoPorHoramaq) * setupHours;
      const operacaoMo = opCustoHoraUsado * hours;
      const operacaoFixo = (depreciacaoPorHora + custoFixoPorHoramaq) * hours;

      return {
        maqId,
        nome: maq.nome,
        tipo: maq.tipo,
        setup: setupMinutes,
        custoHora: depreciacaoPorHora + custoFixoPorHoramaq + opCustoHoraUsado,
        capacidade: cap,
        tempoHoras: hours,
        custoSetupEtapa: custoSetupRaw,
        custoOperacaoEtapa: custoOperacaoRaw,
        custoDepreciacaoEtapa: custoDepreciacaoRaw,
        custoMaoDeObraEtapa: custoMaoDeObraRaw,
        custoFixoEtapa: custoFixoRaw,
        custoTotalEtapa: custoTotalRaw,
        setupMo,
        setupFixo,
        operacaoMo,
        operacaoFixo,
        operadorNome: opLinked ? `${opLinked.nome}${nOperadores > 1 ? ` (x${nOperadores})` : ''}` : undefined,
        nOperadores
      };
    });

    const totalSetup = detalheEtapas.reduce((acc, curr) => acc + curr.custoSetupEtapa, 0);
    const totalOperacao = detalheEtapas.reduce((acc, curr) => acc + curr.custoOperacaoEtapa, 0);
    const totalDepreciacao = detalheEtapas.reduce((acc, curr) => acc + curr.custoDepreciacaoEtapa, 0);
    const totalMaoDeObra = detalheEtapas.reduce((acc, curr) => acc + curr.custoMaoDeObraEtapa, 0);
    const totalCustoFixo = detalheEtapas.reduce((acc, curr) => acc + curr.custoFixoEtapa, 0);

    const custoMinimoServico = totalSetup + totalOperacao;
    const custoUnitarioServico = simlQtd > 0 ? custoMinimoServico / simlQtd : 0;

    // Preço recomendado considerando impostos lucro presumido + markup
    // Preço = Custo / (1 - Markup% - Impostos%)
    const divisor = 1 - (simlMarkup / 100) - (taxasPct / 100);
    const precoEquivalenteLote = divisor > 0.1
      ? custoMinimoServico / divisor
      : custoMinimoServico * (1 + (simlMarkup + taxasPct) / 100);

    const precoEquivalenteUnitario = simlQtd > 0 ? precoEquivalenteLote / simlQtd : 0;

    // Calcular impostos em cima do preço sugerido faturado
    const impostosValorLote = precoEquivalenteLote * (taxasPct / 100);
    const lucroEsperado = precoEquivalenteLote - custoMinimoServico - impostosValorLote;

    return {
      detalheEtapas,
      totalSetup,
      totalOperacao,
      totalDepreciacao,
      totalMaoDeObra,
      totalCustoFixo,
      custoMinimoServico,
      custoUnitarioServico,
      precoEquivalenteLote,
      precoEquivalenteUnitario,
      impostosValorLote,
      taxasPct,
      lucroEsperado
    };
  }, [selectedModelo, simlQtd, simlMarkup, simlAcabamentoOperadores, maquinas, taxasPresumido, operadores, getCustoFixoHoraParaMaquina]);

  // --- CÁLCULO DE CUSTOS DE TODOS OS PEDIDOS DO SISTEMA ---
  const pedidosCustosCalculados = useMemo(() => {
    return pedidos.map(ped => {
      const cliente = clientes.find(c => c.id === ped.cliente_id);
      
      // Encontra todos os produtos associados a este pedido
      const prodsDoPedido = produtos.filter(p => p.pedido_id === ped.id);

      const detalhesProdutos = prodsDoPedido.map(prod => {
        let custoSetupAcumulado = 0;
        let custoOperacionalAcumulado = 0;
        let custoDepreciacaoAcumulado = 0;
        let custoMaoDeObraAcumulado = 0;
        let custoFixoAcumulado = 0;
        let tempoTotalHoras = 0;

        const breakdown = prod.roteiro.map(maqId => {
          const maq = maquinas.find(m => m.id === maqId);
          if (!maq) return { maqId, setup: 0, operacao: 0, depreciacao: 0, maoDeObra: 0, custoFixo: 0, total: 0, horas: 0, operadorNome: 'N/A' };

          let cap = maq.capacidade_hora || 1;
          if (prod.tipo_produto === 'bolacha') {
            cap = maq.capacidade_bolacha || maq.capacidade_hora || 10000;
          } else if (prod.tipo_produto === 'manual') {
            cap = maq.capacidade_manual || maq.capacidade_hora || 2500;
          } else if (prod.tipo_produto === 'embalagem') {
            cap = maq.capacidade_embalagem || maq.capacidade_hora || 5000;
          }

          const isGuilhotina = (maq.nome || '').toLowerCase().includes('guilhotina');
          const isImpressao = maq.tipo === 'Impressão' || (maq.nome || '').toLowerCase().includes('impress');
          const isCorte = maq.tipo === 'Corte' || (maq.nome || '').toLowerCase().includes('corte') || (maq.nome || '').toLowerCase().includes('vinco');

          const factorizationVal = prod.fator_consumo || 0.05;
          
          let capReal = cap;
          let qtdBaseReal = prod.quantidade;
          
          if (maq.tipo_velocidade === 'folha') {
            const contatos = prod.contatos_faca || 1;
            capReal = cap * contatos;
            qtdBaseReal = prod.quantidade;
          } else {
            capReal = cap;
            qtdBaseReal = (isGuilhotina || isImpressao || isCorte)
              ? prod.quantidade * factorizationVal
              : prod.quantidade;
          }

          // Se for acabamento, usar a quantidade de operadores selecionada para o produto
          const nOperadores = maq.tipo === 'Acabamento' ? (pedidoAcabamentoOperadores[prod.id] || 1) : 1;

          const horas = (qtdBaseReal / capReal) / nOperadores;

          // Depreciação alocada
          const deprM = maq.depreciacao_mensal || (maq.valor_aquisicao ? ((maq.valor_aquisicao / (maq.vida_util_anos || 10)) / 12) : 0);
          const deprH = deprM / 160;

          // Mão de obra do operador correto
          const opLinked = maq.operador_id ? operadores.find(o => o.id === maq.operador_id) : undefined;
          const baseOpCustoHora = opLinked ? (opLinked.custo_hora || 0) : avgOperadorHora;
          const opCustoHoraUsado = baseOpCustoHora * nOperadores;

          // Setup Time: base setup + (setup_cores * item_colors)
          const setupMinutes = (maq.tempo_setup || 0) + ((maq.setup_cores || 0) * (prod.cores_quantidade || 0));
          const setupHours = setupMinutes / 60;

          const totalHours = horas + setupHours;

          const custoFixoPorHoramaq = getCustoFixoHoraParaMaquina(maq);

          // Setup Cost uses time * (depreciation + fixed + labor)
          const setup = setupHours * (deprH + custoFixoPorHoramaq + opCustoHoraUsado);

          // Operation (Run) Cost uses time * (depreciation + fixed + labor)
          const operacao = horas * (deprH + custoFixoPorHoramaq + opCustoHoraUsado);

          const depreciacao = deprH * (setupHours + horas);
          const custoFixo = custoFixoPorHoramaq * (setupHours + horas);
          const maoDeObra = opCustoHoraUsado * (setupHours + horas);

          custoSetupAcumulado += setup;
          custoOperacionalAcumulado += operacao;
          custoDepreciacaoAcumulado += depreciacao;
          custoMaoDeObraAcumulado += maoDeObra;
          custoFixoAcumulado += custoFixo;
          tempoTotalHoras += totalHours;

          return {
            maqId,
            nome: maq.nome,
            horas,
            setup,
            operacao,
            depreciacao,
            custoFixo,
            maoDeObra,
            total: setup + operacao,
            operadorNome: opLinked 
              ? `${opLinked.nome}${nOperadores > 1 ? ` (x${nOperadores})` : ''}` 
              : `Pool${nOperadores > 1 ? ` (x${nOperadores})` : ''}`,
            nOperadores
          };
        });

        const custoTotalServicoEmbalagem = custoSetupAcumulado + custoOperacionalAcumulado;
        const custoUnitarioServicoEmbalagem = prod.quantidade > 0 ? custoTotalServicoEmbalagem / prod.quantidade : 0;

        return {
          ...prod,
          tempoTotalHoras,
          custoSetupAcumulado,
          custoOperacionalAcumulado,
          custoDepreciacaoAcumulado,
          custoMaoDeObraAcumulado,
          custoFixoAcumulado,
          custoTotalServicoEmbalagem,
          custoUnitarioServicoEmbalagem,
          breakdown
        };
      });

      const totalCustoPedido = detalhesProdutos.reduce((sum, item) => sum + item.custoTotalServicoEmbalagem, 0);
      const totalTempoHorasPedido = detalhesProdutos.reduce((sum, item) => sum + item.tempoTotalHoras, 0);
      const totalPecasPedido = detalhesProdutos.reduce((sum, item) => sum + item.quantidade, 0);

      return {
        ...ped,
        clienteNome: cliente ? cliente.nome : 'Cliente Desconhecido',
        clienteCodigo: cliente?.codigo || '—',
        produtosCalculados: detalhesProdutos,
        totalCustoPedido,
        totalTempoHorasPedido,
        totalPecasPedido
      };
    });
  }, [pedidos, produtos, clientes, maquinas, getCustoFixoHoraParaMaquina, operadores, pedidoAcabamentoOperadores]);

  // Total acumulado em carteira (serviço terceirizado)
  const totalFinanceiroServicosCarteira = useMemo(() => {
    return pedidosCustosCalculados
      .filter(p => p.status !== 'cancelado')
      .reduce((sum, p) => sum + p.totalCustoPedido, 0);
  }, [pedidosCustosCalculados]);

  const totalHorasAgendadasFábrica = useMemo(() => {
    return pedidosCustosCalculados
      .filter(p => p.status !== 'cancelado' && p.status !== 'concluido')
      .reduce((sum, p) => sum + p.totalTempoHorasPedido, 0);
  }, [pedidosCustosCalculados]);

  return (
    <div className="space-y-6" id="custos-view-container">
      
      {/* BANNER GERAL EXPLICATIVO (Anti-AI-Slop & Direct Instruction Alignment) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
        <div className="flex items-start gap-3.5 max-w-3xl">
          <div className="rounded-xl bg-blue-50 border border-blue-150 p-2 text-blue-800 shrink-0 mt-0.5">
            <Coins size={22} className="text-blue-700" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">Formação de Custos de Terceirização</h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              O sistema calcula exclusivamente o <strong>custo de transformação dos serviços</strong> (setup de facas/chapas, lavagem de clichê e tempo funcional das máquinas). Como o regime contratual é de industrialização por encomenda, a matéria-prima (folhas de papel cartão) fornecida pelo cliente é desconsiderada monetariamente (Custo do Insumo: R$ 0,00).
            </p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 px-4 border border-slate-150 self-start md:self-auto shrink-0 min-w-[200px]">
          <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Custo de Carteira PCP</span>
          <span className="text-lg font-black text-slate-800 block mt-0.5 tracking-tight">
            R$ {totalFinanceiroServicosCarteira.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-1 font-sans">
            <CheckCircle2 size={11} /> 100% focado em serviços
          </span>
        </div>
      </div>

      {/* SUB-TABS INTERNAS DE NAVEGAÇÃO */}
      <div className="flex border-b border-slate-200 gap-1.5 overflow-x-auto pb-1" id="custos-subtabs">
        <button
          onClick={() => setActiveSubTab('simulador')}
          className={`px-4 py-2.5 font-sans text-xs font-bold leading-none tracking-tight border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'simulador' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-400 hover:text-slate-800 hover:border-slate-300'
          }`}
          id="btn-subtab-simulador"
        >
          <div className="flex items-center gap-1.5">
            <Calculator size={14} />
            Simulador de Custo do Modelo
          </div>
        </button>
        <button
          onClick={() => setActiveSubTab('pedidos_custos')}
          className={`px-4 py-2.5 font-sans text-xs font-bold leading-none tracking-tight border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'pedidos_custos' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-400 hover:text-slate-800 hover:border-slate-300'
          }`}
          id="btn-subtab-pedidos-custos"
        >
          <div className="flex items-center gap-1.5">
            <FileSpreadsheet size={14} />
            Orçamento de Pedidos ({pedidos.filter(p => p.status !== 'cancelado').length})
          </div>
        </button>
        <button
          onClick={() => setActiveSubTab('custos_gerais')}
          className={`px-4 py-2.5 font-sans text-xs font-bold leading-none tracking-tight border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'custos_gerais' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-400 hover:text-slate-800 hover:border-slate-300'
          }`}
          id="btn-subtab-custos-gerais"
        >
          <div className="flex items-center gap-1.5">
            <DollarSign size={14} />
            Despesas e Custos Fixos
          </div>
        </button>
        <button
          onClick={() => setActiveSubTab('depreciacao_maquinas')}
          className={`px-4 py-2.5 font-sans text-xs font-bold leading-none tracking-tight border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'depreciacao_maquinas' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-400 hover:text-slate-800 hover:border-slate-300'
          }`}
          id="btn-subtab-depreciacao-maquinas"
        >
          <div className="flex items-center gap-1.5">
            <Wrench size={14} />
            Depreciação de Máquinas
          </div>
        </button>
        <button
          onClick={() => setActiveSubTab('impostos_presumido')}
          className={`px-4 py-2.5 font-sans text-xs font-bold leading-none tracking-tight border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'impostos_presumido' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-400 hover:text-slate-800 hover:border-slate-300'
          }`}
          id="btn-subtab-impostos-presumido"
        >
          <div className="flex items-center gap-1.5">
            <Percent size={14} />
            Impostos do Lucro Presumido
          </div>
        </button>
      </div>

      {/* --- CONTEÚDO 1: SIMULADOR DE CUSTO --- */}
      {activeSubTab === 'simulador' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* Painel de Configurações da Simulação */}
          <div className="lg:col-span-1 space-y-6">
            <div className="sleek-card p-5 bg-white border border-slate-200 rounded-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Calculator size={16} className="text-slate-500" />
                <h4 className="font-sans text-xs font-bold text-slate-800 uppercase tracking-wider">Parâmetros do Lote</h4>
              </div>

              {produtosModelos.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-150 rounded-xl text-3xs text-amber-800 font-sans leading-relaxed">
                  Não existem modelos ou fichas de produtos cadastrados no catálogo da fábrica. Por favor, cadastre um modelo na aba <strong>Cadastros da Fábrica</strong> antes de simular o custo operacional.
                </div>
              ) : (
                <div className="space-y-4 font-sans">
                  {/* Select Model */}
                  <div>
                    <label className="block text-3xs font-extrabold text-slate-500 uppercase mb-1.5">Escolher Ficha Piloto / Modelo</label>
                    <select
                      value={selectedModeloId}
                      onChange={(e) => setSelectedModeloId(e.target.value)}
                      className="block w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 focus:outline-none"
                    >
                      {produtosModelos.map((m, idx) => (
                        <option key={`${m.id}-${idx}`} value={m.id}>
                          {m.codigo ? `[${m.codigo}] ` : ''}{m.descricao}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity Input */}
                  <div>
                    <label className="block text-3xs font-extrabold text-slate-500 uppercase mb-1.5">Volume do Lote (Unidades de Embalagem)</label>
                    <input
                      type="number"
                      required
                      min="100"
                      step="100"
                      value={simlQtd}
                      onChange={(e) => setSimlQtd(Number(e.target.value) || 0)}
                      className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none font-mono"
                    />
                    <span className="text-[10px] text-slate-400 font-sans mt-1.5 block leading-relaxed">
                      Dimensões da caixa: <strong className="text-slate-600 font-medium">{selectedModelo?.dimensoes || '—'}</strong>
                      {selectedModelo?.tipo_produto === 'embalagem' && (
                        <> | Pontos de cola: <strong className="text-indigo-600 font-medium">{selectedModelo?.pontos_cola === 0 ? 'Sem Cola (0)' : `${selectedModelo?.pontos_cola || 1} ponto(s)`}</strong></>
                      )}
                    </span>
                  </div>

                  {/* Profit Markup Input */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-3xs font-extrabold text-slate-500 uppercase">Margem de Lucro desejável (Markup)</label>
                      <span className="text-3xs font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.5 rounded">{simlMarkup}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="75"
                      step="5"
                      value={simlMarkup}
                      onChange={(e) => setSimlMarkup(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-medium">
                      <span>15% (Baixo)</span>
                      <span>50% (Corporativo)</span>
                      <span>75% (Alto)</span>
                    </div>
                  </div>

                  {/* Se o modelo selecionado tiver máquina do tipo Acabamento no roteiro, mostrar seletor de operadores de Acabamento */}
                  {selectedModelo?.roteiro.some(maqId => maquinas.find(m => m.id === maqId)?.tipo === 'Acabamento') && (
                    <div className="pt-3 border-t border-slate-100 space-y-1.5">
                      <label className="block text-3xs font-extrabold text-slate-500 uppercase flex items-center gap-1">
                        👥 Operadores para Acabamento
                      </label>
                      <select
                        value={simlAcabamentoOperadores}
                        onChange={(e) => setSimlAcabamentoOperadores(Number(e.target.value) || 1)}
                        className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none cursor-pointer"
                      >
                        <option value={1}>1 Operador (Padrão)</option>
                        <option value={2}>2 Operadores (Metade do tempo)</option>
                        <option value={3}>3 Operadores (1/3 do tempo)</option>
                        <option value={4}>4 Operadores (1/4 do tempo)</option>
                        <option value={5}>5 Operadores (1/5 do tempo)</option>
                      </select>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Mais operadores reduzem o tempo de produção e os custos fixos/depreciação diluídos por hora, mas somam no custo de mão de obra.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quadro Resumo das Máquinas Configuradas */}
            <div className="sleek-card p-5 bg-[#0f172a] text-slate-300 rounded-xl space-y-3.5 font-sans border border-slate-900">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Tabela Geral do Lote</span>
              <h5 className="font-sans text-xs font-bold text-white uppercase tracking-tight">Roteiro Técnico & Engenharia</h5>
              
              {selectedModelo?.roteiro && selectedModelo.roteiro.length > 0 ? (
                <div className="divide-y divide-slate-800 text-3xs pt-1.5 space-y-2.5">
                  {selectedModelo.roteiro.map((maqId, idx) => {
                    const m = maquinas.find(maq => maq.id === maqId);
                    return (
                      <div key={`${maqId}-${idx}`} className="flex justify-between gap-3 pt-2.5 first:pt-0">
                        <div>
                          <p className="font-sans font-bold text-slate-100">{idx + 1}. {m?.nome || 'Inativo'}</p>
                          <p className="text-slate-400 text-[9px] mt-0.5">Fluxo: {m?.capacidade_hora.toLocaleString('pt-BR')} un/hora</p>
                        </div>
                        <div className="text-right whitespace-nowrap">
                          <p className="font-mono text-slate-200">Setup: R$ {m?.custo_setup || 0}</p>
                          <p className="text-slate-400 font-mono text-[9px]">Op: R$ {m?.custo_hora || 0}/h</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-3xs text-slate-400">Nenhum roteiro cadastrado neste modelo.</p>
              )}
            </div>
          </div>

          {/* Análises e Resultados com Detalhes */}
          <div className="lg:col-span-2 space-y-6">
            {selectedModelo && simulacaoCusto ? (
              <div className="space-y-6 font-sans">
                
                {/* BANNER DE AÇÃO E RESULTADOS */}
                <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-3xs no-print">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-blue-50 border border-blue-100 p-1.5 text-blue-700">
                      <Calculator size={16} />
                    </div>
                    <div>
                      <h4 className="font-sans text-xs font-bold text-slate-800 uppercase tracking-wider">Resultado da Simulação</h4>
                      <p className="text-[10px] text-slate-400">Geração de custos técnicos em tempo real</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsPrintingSimulador(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 font-sans text-xs font-bold text-white shadow-3xs hover:bg-slate-800 transition-all cursor-pointer"
                    id="btn-print-simulador"
                  >
                    <Printer size={13} />
                    Imprimir Orçamento
                  </button>
                </div>

                {/* 1. CARDS DE RESULTADOS FINANCEIROS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs">
                    <span className="font-mono text-[9px] uppercase tracking-wide text-slate-400 font-bold">Custo Direto de Transformação</span>
                    <strong className="text-xl font-bold text-slate-900 font-sans block mt-1 tracking-tight">
                      R$ {simulacaoCusto.custoMinimoServico.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      R$ {simulacaoCusto.custoUnitarioServico.toLocaleString('pt-BR', { minimumFractionDigits: 4 })} / unidade
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs">
                    <span className="font-mono text-[9px] uppercase tracking-wide text-slate-400 font-bold">Preço Recomendado (Markup)</span>
                    <strong className="text-xl font-bold text-blue-900 font-sans block mt-1 tracking-tight">
                      R$ {simulacaoCusto.precoEquivalenteLote.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                    <span className="text-[10px] text-blue-700 font-mono mt-1 block font-semibold">
                      R$ {simulacaoCusto.precoEquivalenteUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 4 })} / unidade
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs">
                    <span className="font-mono text-[9px] uppercase tracking-wide text-amber-500 font-bold">Lucro Operacional Líquido</span>
                    <strong className="text-xl font-bold text-emerald-800 font-sans block mt-1 tracking-tight">
                      R$ {simulacaoCusto.lucroEsperado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                    <span className="text-[10px] text-emerald-700 font-sans mt-1 block font-bold">
                      {(simlMarkup).toFixed(0)}% Margem sobre Venda
                    </span>
                  </div>
                </div>

                {/* 2. TABELA DETALHADA POR ETAPA DO ROTEIRO */}
                <div className="sleek-card p-5 bg-white border border-slate-200 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Layers size={16} className="text-slate-500" />
                      <h4 className="font-sans text-xs font-bold text-slate-900 uppercase tracking-wider">Breakdown por Posto de Trabalho</h4>
                    </div>
                    <span className="font-sans text-[10px] text-slate-400 font-medium">Preço com base em lote de {simlQtd.toLocaleString('pt-BR')} un.</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse font-sans text-2xs border border-slate-300">
                      <thead>
                        <tr className="bg-slate-800 text-white font-sans text-[10px] uppercase tracking-wider border-b border-slate-300">
                          <th rowSpan={2} className="py-3 px-3 border border-slate-300 text-left font-bold min-w-[150px]">Máquina / Processo</th>
                          <th rowSpan={2} className="py-3 px-3 border border-slate-300 text-right font-bold">Velocidade</th>
                          <th colSpan={4} className="py-2 px-3 border border-slate-300 text-center font-bold bg-slate-700 text-white uppercase tracking-wider">CUSTOS SETUP</th>
                          <th colSpan={4} className="py-2 px-3 border border-slate-300 text-center font-bold bg-slate-600 text-white uppercase tracking-wider">CUSTOS OPERAÇÃO</th>
                          <th rowSpan={2} className="py-3 px-3 border border-slate-300 text-right bg-slate-800 text-white font-bold">TOTAL ETAPA</th>
                        </tr>
                        <tr className="bg-slate-150 text-slate-700 font-sans text-[9px] font-black uppercase tracking-wider border-b border-slate-300">
                          {/* SETUP SUB-HEADERS */}
                          <th className="py-2.5 px-2.5 border border-slate-300 text-right font-bold text-slate-800">Tempo Setup</th>
                          <th className="py-2.5 px-2.5 border border-slate-300 text-right font-bold text-slate-800">M.O OPERADOR</th>
                          <th className="py-2.5 px-2.5 border border-slate-300 text-right font-bold text-slate-800">CUSTO FIXO RATEADO</th>
                          <th className="py-2.5 px-2.5 border border-slate-300 text-right font-black bg-amber-50 text-amber-900 border-b-2 border-amber-200">TOTAL SETUP</th>
                          
                          {/* OPERACAO SUB-HEADERS */}
                          <th className="py-2.5 px-2.5 border border-slate-300 text-right font-bold text-slate-800">Tempo Operação</th>
                          <th className="py-2.5 px-2.5 border border-slate-300 text-right font-bold text-slate-800">M.O OPERADOR</th>
                          <th className="py-2.5 px-2.5 border border-slate-300 text-right font-bold text-slate-800">CUSTO FIXO RATEADO</th>
                          <th className="py-2.5 px-2.5 border border-slate-300 text-right font-black bg-blue-50 text-blue-900 border-b-2 border-blue-200">TOTAL OPERAÇÃO</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-700">
                        {simulacaoCusto.detalheEtapas.map((etapa, idx) => (
                          <tr key={idx} className="hover:bg-slate-25/50 transition-all text-[11px]">
                            <td className="py-3 px-3 border border-slate-200 bg-slate-25/35">
                              <span className="font-semibold text-slate-900 block leading-tight">{etapa.nome}</span>
                              <div className="flex gap-2 items-center text-[9px] mt-0.5 whitespace-nowrap">
                                <span className="text-slate-400 font-mono uppercase">{etapa.tipo}</span>
                                <span className="text-slate-300">•</span>
                                <span className={`font-semibold ${etapa.operadorNome ? 'text-indigo-600' : 'text-slate-400 bg-slate-50 border border-slate-100 rounded px-1'}`}>
                                  Op: {etapa.operadorNome || 'Pool (Média)'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-550 border border-slate-200">
                              {etapa.capacidade.toLocaleString('pt-BR')} un/h
                            </td>
                            {/* SETUP */}
                            <td className="py-3 px-2.5 text-right font-mono text-slate-800 border border-slate-200">
                              <span className="p-1 px-1.5 rounded bg-amber-50/55 border border-amber-100/70 text-amber-800 font-medium">{(etapa.setup / 60).toFixed(2)}h</span>
                              <span className="block text-[9px] text-slate-400 mt-1">({etapa.setup} min)</span>
                            </td>
                            <td className="py-3 px-2.5 text-right font-mono text-slate-600 border border-slate-200">
                              R$ {etapa.setupMo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-2.5 text-right font-mono text-slate-600 border border-slate-200">
                              R$ {etapa.setupFixo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-2.5 text-right font-mono font-bold text-slate-900 bg-amber-50/20 border border-slate-200">
                              R$ {etapa.custoSetupEtapa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            {/* OPERACAO */}
                            <td className="py-3 px-2.5 text-right font-mono text-slate-800 border border-slate-200">
                              <span className="p-1 px-1.5 rounded bg-slate-50 border border-slate-100 font-medium">{etapa.tempoHoras.toFixed(2)}h</span>
                              <span className="block text-[9px] text-slate-400 mt-1">({(etapa.tempoHoras * 60).toFixed(0)} min)</span>
                            </td>
                            <td className="py-3 px-2.5 text-right font-mono text-slate-600 border border-slate-200">
                              R$ {etapa.operacaoMo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-2.5 text-right font-mono text-slate-600 border border-slate-200">
                              R$ {etapa.operacaoFixo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-2.5 text-right font-mono font-bold text-slate-900 bg-blue-50/20 border border-slate-200">
                              R$ {etapa.custoOperacaoEtapa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            {/* TOTAL ETAPA */}
                            <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-950 bg-slate-100/50 border border-slate-200">
                              R$ {etapa.custoTotalEtapa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                        {/* Rodapé Totais */}
                        <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                          <td className="py-3.5 px-3 font-extrabold text-slate-900 border border-slate-200 text-xs uppercase" colSpan={2}>
                            Serviço Total Consolidado
                          </td>
                          {/* SETUP TOTALS */}
                          <td className="py-3.5 px-2.5 border border-slate-200" colSpan={3}></td>
                          <td className="py-3.5 px-2.5 text-right font-mono text-slate-900 bg-amber-50/40 border border-slate-200 font-black">
                            R$ {simulacaoCusto.totalSetup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            <span className="block text-[9px] text-slate-400 font-normal mt-0.5 font-sans">= SOMA TOTAL SETUP</span>
                          </td>
                          {/* OPERACAO TOTALS */}
                          <td className="py-3.5 px-2.5 border border-slate-200" colSpan={3}></td>
                          <td className="py-3.5 px-2.5 text-right font-mono text-slate-900 bg-blue-50/40 border border-slate-200 font-black">
                            R$ {simulacaoCusto.totalOperacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            <span className="block text-[9px] text-slate-400 font-normal mt-0.5 font-sans">= SOMA TOTAL OPERAÇÃO</span>
                          </td>
                          {/* CONSOLIDATED TOTAL */}
                          <td className="py-3.5 px-3 text-right font-mono text-blue-900 text-xs font-black bg-slate-100 border-2 border-slate-400">
                            R$ {simulacaoCusto.custoMinimoServico.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            <span className="block text-[9px] text-blue-700 font-normal mt-0.5 font-sans">= SOMA TOTAL ETAPA</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-lg bg-emerald-50 border border-emerald-150 p-3.5 flex items-start gap-2 text-3xs text-emerald-800">
                    <CheckCircle2 className="shrink-0 text-emerald-600 mt-0.5" size={14} />
                    <div>
                      <p className="font-semibold block">Lógica industrial para Orçamentação:</p>
                      <p className="leading-relaxed mt-0.5 text-slate-550 font-sans">
                        Este resultado representa o <strong>custo fabril de transformação pura</strong>. Recomenda-se adicionar impostos locais de prestação de serviços (ex: ISSQN) e despesas de frete/manuseio (CIF/FOB) caso houver.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-10 bg-slate-25 rounded-xl border border-dashed border-slate-200">
                <AlertCircle size={32} className="text-slate-400 mx-auto mb-2" />
                <h4 className="font-sans text-xs font-bold text-slate-700 uppercase">Aguardando Dados</h4>
                <p className="text-3xs text-slate-400 mt-1 font-sans">Cadastre e configure recursos técnicos com tarifas de operação para habilitar os dados.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* --- CONTEÚDO 2: CUSTO DE PEDIDOS ATIVOS --- */}
      {activeSubTab === 'pedidos_custos' && (
        <div className="space-y-6 animate-fadeIn font-sans">
          
          <div className="sleek-card p-5 bg-white border border-slate-200 rounded-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
              <div>
                <h4 className="font-sans text-xs font-bold text-slate-900 uppercase tracking-widest leading-none">Cálculo de Custos por Lote Ativo</h4>
                <p className="font-sans text-[10px] text-slate-400 mt-1 leading-normal font-normal">
                  Relação de todos os pedidos agendados na carteira PCP e seus custos calculados dinamicamente com base no seu roteiro operacional.
                </p>
              </div>
              <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 border border-blue-150 px-3 py-1 rounded-full">
                {totalHorasAgendadasFábrica.toFixed(1)} Horas-Homem/Máscara Totais Pendentes
              </span>
            </div>

            {pedidosCustosCalculados.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle size={24} className="text-slate-400 mx-auto mb-2" />
                <p className="text-3xs text-slate-500 font-sans">Não há pedidos registrados no sistema.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pedidosCustosCalculados.map(ped => {
                  if (ped.status === 'cancelado') return null;
                  return (
                    <div 
                      key={ped.id} 
                      className="rounded-xl border border-slate-150 overflow-hidden bg-slate-25/40 hover:shadow-xs transition-shadow"
                      id={`ped-costing-row-${ped.id}`}
                    >
                      {/* Header de Lote */}
                      <div className="bg-white px-4 py-3 flex flex-wrap justify-between items-center gap-3 border-b border-slate-150">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-2xs font-extrabold text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                            {ped.id}
                          </span>
                          <div>
                            <span className="text-[10px] font-mono text-slate-400 font-bold block leading-none">Cliente</span>
                            <strong className="text-xs text-slate-900 mt-1 block leading-none tracking-tight">{ped.clienteNome}</strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 text-right flex-wrap">
                          <div>
                            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Est. Carga Máquina</span>
                            <span className="text-2xs font-mono font-bold text-slate-800">{ped.totalTempoHorasPedido.toFixed(1)} h</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Embalagens Totais</span>
                            <span className="text-2xs font-mono font-bold text-slate-800">{ped.totalPecasPedido.toLocaleString('pt-BR')} un</span>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-1.5 px-3 border border-slate-150">
                            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block font-bold">Total Serviços</span>
                            <strong className="text-xs font-mono font-black text-slate-950 font-extrabold">
                              R$ {ped.totalCustoPedido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </strong>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-4xs font-black uppercase tracking-wider ${
                            ped.status === 'concluido' ? 'bg-emerald-50 text-emerald-800 border border-emerald-150' :
                            ped.status === 'producao' ? 'bg-indigo-50 text-indigo-800 border border-indigo-150' :
                            'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {ped.status === 'concluido' ? 'concluído' : ped.status === 'producao' ? 'em produção' : 'pendente'}
                          </span>
                        </div>
                      </div>

                      {/* Items / Produtos do Lote list */}
                      <div className="p-4 bg-white/70 space-y-3">
                        <span className="text-[9px] font-mono font-extrabold text-slate-400 uppercase block tracking-wider mb-1">Itens do Pedido & Roteiros de Custo</span>
                        
                        {ped.produtosCalculados.map(prod => (
                          <div key={prod.id} className="p-3.5 bg-white border border-slate-150 rounded-lg text-2xs space-y-3">
                            <div className="flex justify-between items-start flex-wrap gap-2.5">
                              <div>
                                <strong className="text-xs text-slate-900 font-extrabold block tracking-tight leading-none">{prod.descricao}</strong>
                                <span className="text-[10px] text-slate-400 font-medium block mt-1 leading-none font-sans">
                                  Volume: <span className="font-mono text-slate-600 font-bold">{prod.quantidade.toLocaleString('pt-BR')}</span> un • Dim: <span className="font-mono text-slate-500 font-bold">{prod.dimensoes}</span>
                                </span>
                              </div>

                              <div className="text-right">
                                <span className="font-mono text-slate-900 font-bold block">
                                  R$ {prod.custoTotalServicoEmbalagem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (total)
                                </span>
                                <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
                                  Serviço Unitário: R$ {prod.custoUnitarioServicoEmbalagem.toLocaleString('pt-BR', { minimumFractionDigits: 4 })}/un
                                </span>
                              </div>
                            </div>

                            {/* Ajuste de operadores para máquinas de Acabamento se houver no roteiro */}
                            {prod.roteiro.some(maqId => maquinas.find(m => m.id === maqId)?.tipo === 'Acabamento') && (
                              <div className="flex items-center justify-between gap-2 p-2 px-3 bg-slate-50 rounded-lg border border-slate-150 leading-none">
                                <span className="font-bold text-slate-600 uppercase text-[9px] flex items-center gap-1.5">
                                  👥 Operadores de Acabamento para este item:
                                </span>
                                <select
                                  value={pedidoAcabamentoOperadores[prod.id] || 1}
                                  onChange={(e) => {
                                    setPedidoAcabamentoOperadores(prev => ({
                                      ...prev,
                                      [prod.id]: Number(e.target.value) || 1
                                    }));
                                  }}
                                  className="rounded-md border border-slate-300 bg-white py-0.5 px-2 text-3xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                                >
                                  <option value={1}>1 Operador (Padrão)</option>
                                  <option value={2}>2 Operadores (Metade do tempo)</option>
                                  <option value={3}>3 Operadores</option>
                                  <option value={4}>4 Operadores</option>
                                  <option value={5}>5 Operadores</option>
                                </select>
                              </div>
                            )}

                            {/* Roteiro breakdown steps horizontal line */}
                            <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center gap-1.5 justify-between">
                              <span className="font-mono text-4xs uppercase tracking-wider text-slate-400 font-black">Fluxo Operacional de Custos:</span>
                              <div className="flex items-center gap-1.5 overflow-x-auto flex-wrap">
                                {prod.breakdown.map((bk, bIdx) => (
                                  <React.Fragment key={bk.maqId}>
                                    <div className="p-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-3xs font-sans space-y-0.5">
                                      <span className="font-semibold block text-slate-800 leading-tight truncate max-w-[145px]" title={bk.nome}>{bk.nome}</span>
                                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[9px] font-mono text-slate-550">
                                        <span title="Custo de Setup recebido da máquina">Setup: R$ {bk.setup}</span>
                                        <span>•</span>
                                        <span title="Custo hora de operação da máquina alocada">Op. Máq: R$ {bk.operacao.toFixed(0)}</span>
                                        <span>•</span>
                                        <span title="Depreciação de horas operacionais calculada" className="text-sky-700">Depr: R$ {bk.depreciacao.toFixed(1)}</span>
                                        <span>•</span>
                                        <span title="Mão de obra do operador vinculado ou média" className="text-indigo-600 font-semibold">
                                          M.O. ({bk.operadorNome}): R$ {bk.maoDeObra.toFixed(0)}
                                        </span>
                                        <span>•</span>
                                        <span title="Custos fixos rateados da fábrica" className="text-purple-650 font-semibold">
                                          Fixo: R$ {bk.custoFixo.toFixed(1)}
                                        </span>
                                      </div>
                                    </div>
                                    {bIdx < prod.breakdown.length - 1 && (
                                      <ChevronRight size={12} className="text-slate-350 shrink-0" />
                                    )}
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>
      )}

      {/* --- CONTEÚDO 3: DESPESAS E CUSTOS GERAIS OPERACIONAIS --- */}
      {activeSubTab === 'custos_gerais' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn font-sans">
          
          {/* Cadastro de Custo Novo */}
          <div className="lg:col-span-1">
            <div className="sleek-card bg-white p-5 rounded-xl border border-slate-200 shadow-3xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Plus size={16} className="text-slate-500" />
                <h3 className="font-sans text-xs font-bold text-slate-800 uppercase tracking-wider">Nova Despesa / Custo Geral</h3>
              </div>

              <form onSubmit={handleAddCustoGeral} className="space-y-4 font-sans text-2xs">
                <div>
                  <label className="block text-3xs font-extrabold text-slate-500 uppercase mb-1.5">Descrição do Gasto</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Aluguel do Galpão"
                    value={cgDesc}
                    onChange={(e) => setCgDesc(e.target.value)}
                    className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-3xs font-extrabold text-slate-500 uppercase mb-1.5">Valor do Gasto</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-slate-400 font-mono">R$</span>
                      <input
                        type="number"
                        required
                        min="0"
                        step="any"
                        value={cgValor}
                        onChange={(e) => setCgValor(Number(e.target.value) || 0)}
                        className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-xs text-slate-800 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-3xs font-extrabold text-slate-500 uppercase mb-1.5">Recorrência</label>
                    <select
                      value={cgRecorrencia}
                      onChange={(e) => setCgRecorrencia(e.target.value as 'Mensal' | 'Anual' | 'Único')}
                      className="block w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      <option value="Mensal">Mensal</option>
                      <option value="Anual">Anual</option>
                      <option value="Único">Único</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-3xs font-extrabold text-slate-500 uppercase mb-1.5">Categoria</label>
                  <select
                    value={cgCategoria}
                    onChange={(e) => setCgCategoria(e.target.value as any)}
                    className="block w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Infraestrutura">Infraestrutura / Galpão</option>
                    <option value="Utilidades (Luz/Água)">Utilidades (Luz/Água)</option>
                    <option value="Administrativo">Administrativo & Escolar</option>
                    <option value="Impostos">Tributos / Taxas Fixas</option>
                    <option value="Outros">Outras Despesas</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-white font-sans text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer shadow-xs mt-2"
                  id="btn-submit-cost"
                >
                  <Plus size={14} />
                  Adicionar Despesa
                </button>
              </form>
            </div>
          </div>

          {/* Listagem de Despesas */}
          <div className="lg:col-span-2 space-y-4">
            <div className="sleek-card bg-white rounded-xl border border-slate-200 shadow-3xs p-5">
              <div className="flex md:items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Coins size={16} className="text-slate-500" />
                  <h3 className="font-sans text-xs font-bold text-slate-800 uppercase tracking-wider">Despesas Gerais de Infraestrutura Industrial</h3>
                </div>
                <span className="font-mono text-3xs font-bold text-slate-500">
                  Total Mensal Estimado: R$ {custosGerais
                    .filter(c => c.recorrencia === 'Mensal')
                    .reduce((acc, c) => acc + c.valor, 0)
                    .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {custosGerais.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle size={24} className="text-slate-400 mx-auto mb-2" />
                  <p className="text-3xs text-slate-500 font-sans">Nenhum custo geral cadastrado.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-sans text-2xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-3xs text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5">Descrição</th>
                        <th className="py-2.5">Categoria</th>
                        <th className="py-2.5 text-center">Recorrência</th>
                        <th className="py-2.5 text-right font-medium">Valor Nominal</th>
                        <th className="py-2.5 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {custosGerais.map((cost) => (
                        <tr key={cost.id} className="hover:bg-slate-25/50 transition-colors" id={`row-cost-${cost.id}`}>
                          <td className="py-3 font-semibold text-slate-900">
                            {cost.descricao}
                          </td>
                          <td className="py-3 text-slate-550 font-medium">
                            {cost.categoria}
                          </td>
                          <td className="py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              cost.recorrencia === 'Mensal' ? 'bg-blue-50 text-blue-850' :
                              cost.recorrencia === 'Anual' ? 'bg-purple-50 text-purple-850' :
                              'bg-amber-50 text-amber-800'
                            }`}>
                              {cost.recorrencia}
                            </span>
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-slate-950 whitespace-nowrap">
                            R$ {cost.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => triggerConfirm(
                                'Remover Despesa / Custo Geral',
                                `Tem certeza que deseja remover a despesa "${cost.descricao}" do cadastro?`,
                                () => excluirCustoGeral(cost.id),
                                { confirmLabel: 'Sim, Remover', variant: 'danger' }
                              )}
                              className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer"
                              title="Remover Despesa"
                              id={`btn-del-cost-${cost.id}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Split / Rateio de Custos Fixos nas Máquinas */}
            <div className="p-5 bg-purple-50/50 border border-purple-200 rounded-xl font-sans space-y-3 shadow-3xs">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-purple-700 shrink-0" size={18} />
                <h4 className="font-sans text-xs font-bold text-purple-950 uppercase tracking-wider">Cálculo de Rateio de Custo Fixo por Máquina</h4>
              </div>
              <p className="text-3xs text-slate-600 leading-relaxed">
                Em conformidade com a lógica de custeio por absorção, o montante total de despesas e custos fixos operacionais mensais é <strong>dividido igualmente</strong> entre as máquinas participantes do rateio:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="bg-white p-3 rounded-lg border border-purple-100">
                  <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-bold">Total Custos Fixos</span>
                  <strong className="block text-xs font-mono text-slate-800 mt-1">R$ {totalCustosFixosMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês</strong>
                </div>
                <div className="bg-white p-3 rounded-lg border border-purple-100">
                  <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-bold font-semibold">Máquinas no Rateio</span>
                  <strong className="block text-xs font-mono text-purple-700 mt-1 font-bold">{maquinasNoRateio.length} de {maquinas.length}</strong>
                </div>
                <div className="bg-white p-3 rounded-lg border border-purple-100">
                  <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-bold">Por Máquina Participante</span>
                  <strong className="block text-xs font-mono text-indigo-700 mt-1 font-bold">R$ {custoFixoPorMaquinaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês</strong>
                </div>
              </div>

              {/* Seletor e Horas/Mês das Máquinas */}
              <div className="bg-white border border-purple-100 rounded-lg overflow-hidden mt-3 shadow-3xs">
                <div className="px-4 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
                  <span className="text-[10px] uppercase font-bold text-purple-950">Quadro de Rateio Personalizado:</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {maquinas.map((maq, idx) => {
                    const participa = maq.participa_rateio !== false;
                    const horas = maq.horas_mensais_custo_fixo || 160;
                    const valorPorHora = participa ? (custoFixoPorMaquinaMensal / horas) : 0;

                    return (
                      <div key={`${maq.id}-${idx}`} className="p-3 flex flex-wrap items-center justify-between gap-3 text-2xs hover:bg-slate-25/50 transition-colors" id={`rateio-row-${maq.id}-${idx}`}>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={participa}
                            onChange={(e) => {
                              editarMaquina({
                                ...maq,
                                participa_rateio: e.target.checked
                              });
                            }}
                            className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                            id={`chk-rateio-${maq.id}`}
                          />
                          <div>
                            <span className="font-semibold text-slate-800 block text-xs">{maq.nome}</span>
                            <span className="text-[9px] font-mono font-bold uppercase text-slate-400 px-1 py-0.5 bg-slate-100 rounded">
                              {maq.id} • {maq.tipo}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <label className="text-[9px] font-extrabold text-slate-400 uppercase whitespace-nowrap font-sans">Horas/Mês:</label>
                            <input
                              type="number"
                              disabled={!participa}
                              min={1}
                              value={horas}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                editarMaquina({
                                  ...maq,
                                  horas_mensais_custo_fixo: val
                                });
                              }}
                              className="w-16 rounded border border-slate-200 bg-white py-1 px-1.5 text-center text-xs font-mono font-bold text-slate-800 disabled:bg-slate-50 disabled:text-slate-400 focus:border-purple-500 focus:outline-none"
                            />
                          </div>

                          <div className="text-right w-24">
                            <span className="text-[8px] text-slate-400 block uppercase font-bold">Taxa Horária</span>
                            <span className={`font-mono text-2xs font-bold ${participa ? 'text-indigo-600' : 'text-slate-300'}`}>
                              {participa ? `R$ ${valorPorHora.toLocaleString('pt-BR', { minimumFractionDigits: 4 })}/h` : 'Isento'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="text-[10px] text-purple-950 font-medium">
                *As taxas horárias mostradas acima são integradas automaticamente no cálculo/simulação de orçamentos e do programador PCP para a fabricação dos lotes.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* --- CONTEÚDO 4: DEPRECIAÇÃO SISTEMÁTICA DE ATIVOS --- */}
      {activeSubTab === 'depreciacao_maquinas' && (
        <div className="space-y-6 animate-fadeIn font-sans">
          
          <div className="sleek-card p-5 bg-white border border-slate-200 rounded-xl space-y-4">
            <div className="flex md:items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
              <div>
                <h4 className="font-sans text-xs font-bold text-slate-900 uppercase tracking-wider">Depreciação Analítica do Ativo Imobilizado Coletivo</h4>
                <p className="font-sans text-[10px] text-slate-400 mt-1 leading-normal">
                  Visão sistemática de depreciação mensal industrial por máquina com base na taxa legal expedida pela Receita Federal (vida útil estimada de 10 anos).
                </p>
              </div>
              <span className="font-mono text-3xs font-extrabold text-blue-900 bg-blue-50 border border-blue-150 px-3 py-1 rounded-full">
                Encargo Mensal Consolidado: R$ {maquinas
                  .reduce((acc, m) => acc + (m.depreciacao_mensal || (m.valor_aquisicao ? ((m.valor_aquisicao / (m.vida_util_anos || 10)) / 12) : 0)), 0)
                  .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans text-2xs">
                <thead>
                  <tr className="border-b border-slate-200 text-3xs text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5">Equipamento Industrial</th>
                    <th className="py-2.5">Grupo / Tipo</th>
                    <th className="py-2.5 text-right">Mão de Obra (Operador)</th>
                    <th className="py-2.5 text-right text-blue-700">Depreciação p/ Hora</th>
                    <th className="py-2.5 text-right text-purple-700">Custo Fixo p/ Hora</th>
                    <th className="py-2.5 text-right text-indigo-950 font-black">Tarifa Total / Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {maquinas.map((maq, idx) => {
                    const deprM = maq.depreciacao_mensal || 
                            (maq.valor_aquisicao ? ((maq.valor_aquisicao / (maq.vida_util_anos || 10)) / 12) : 0);
                    // Depreciação por hora assumindo 160 h/mês operacionais
                    const depreciacaoHoraVal = deprM / 160;

                    // Mão de obra do operador correto ou média
                    const opLinked = maq.operador_id ? operadores.find(o => o.id === maq.operador_id) : undefined;
                    const opCustoHoraUsado = opLinked ? (opLinked.custo_hora || 0) : avgOperadorHora;

                    return (
                      <tr key={`${maq.id}-${idx}`} className="hover:bg-slate-25/50 transition-colors" id={`row-deprec-maq-${maq.id}-${idx}`}>
                        <td className="py-3 font-semibold text-slate-900 flex items-center gap-2">
                          <span className="p-1 rounded bg-slate-100 text-slate-650 font-bold font-mono text-[9px] uppercase">
                            {maq.id}
                          </span>
                          {maq.nome}
                        </td>
                        <td className="py-3 text-slate-550 font-medium">
                          {maq.tipo}
                        </td>
                        <td className="py-3 text-right font-mono text-slate-700">
                          R$ {opCustoHoraUsado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/h
                        </td>
                        <td className="py-3 text-right font-mono text-blue-800 font-medium">
                          R$ {depreciacaoHoraVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/h
                        </td>
                        <td className="py-3 text-right font-mono text-purple-700 font-medium">
                          R$ {getCustoFixoHoraParaMaquina(maq).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/h
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-indigo-950 bg-indigo-50/20">
                          R$ {(opCustoHoraUsado + depreciacaoHoraVal + getCustoFixoHoraParaMaquina(maq)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/h
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-sky-50/40 border border-sky-150 rounded-xl text-3xs text-slate-600 leading-relaxed flex items-start gap-3">
              <Gauge className="text-sky-700 shrink-0 mt-0.5" size={16} />
              <div>
                <span className="font-bold text-slate-800 block mb-0.5">Integração com Engenharia Fila Piloto</span>
                O PCP integra os custos de depreciação de ativos por hora trabalhada em cada etapa operacional. Desta forma, o preço sugerido do lote sugerirá markup suficiente para criar reservas financeiras que permitirão substituir estes mesmos imobilizados industriais ao fim de sua vida útil sem comprometer o fluxo de caixa operacional.
              </div>
            </div>
          </div>

        </div>
      )}

      {/* --- CONTEÚDO 5: TRIBUTOS DO LUCRO PRESUMIDO DE SERVIÇOS --- */}
      {activeSubTab === 'impostos_presumido' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn font-sans">
          
          {/* Ajuste de Alíquotas */}
          <div className="lg:col-span-1">
            <div className="sleek-card bg-white p-5 rounded-xl border border-slate-200 shadow-3xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sliders size={16} className="text-slate-500" />
                <h3 className="font-sans text-xs font-bold text-slate-800 uppercase tracking-wider">Ajuste de Alíquotas de Serviços</h3>
              </div>

              <form onSubmit={handleUpdateImpostos} className="space-y-4 font-sans text-2xs">
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-3xs font-extrabold text-slate-500 uppercase">PIS (%)</label>
                    <span className="font-mono text-3xs text-slate-600 font-bold">{taxaPIS}%</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="5"
                    value={taxaPIS}
                    onChange={(e) => setTaxaPIS(Number(e.target.value) || 0)}
                    className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-3xs font-extrabold text-slate-500 uppercase">COFINS (%)</label>
                    <span className="font-mono text-3xs text-slate-600 font-bold">{taxaCOFINS}%</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={taxaCOFINS}
                    onChange={(e) => setTaxaCOFINS(Number(e.target.value) || 0)}
                    className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-3xs font-extrabold text-slate-500 uppercase">ISS (%)</label>
                    <span className="font-mono text-3xs text-slate-600 font-bold">{taxaISS}%</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="5"
                    value={taxaISS}
                    onChange={(e) => setTaxaISS(Number(e.target.value) || 0)}
                    className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-3xs font-extrabold text-slate-500 uppercase">IRPJ (Lucro Presumido - Serviços) (%)</label>
                    <span className="font-mono text-3xs text-slate-600 font-bold">{taxaIRPJ}%</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={taxaIRPJ}
                    onChange={(e) => setTaxaIRPJ(Number(e.target.value) || 0)}
                    className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                  />
                  <p className="text-[9px] text-slate-400 mt-1 leading-tight">Presunção de 32% sobre renda vezes 15% alíquota nominal padrão = 4,8% efetivo.</p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-3xs font-extrabold text-slate-500 uppercase">CSLL (Lucro Presumido - Serviços) (%)</label>
                    <span className="font-mono text-3xs text-slate-600 font-bold">{taxaCSLL}%</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="5"
                    value={taxaCSLL}
                    onChange={(e) => setTaxaCSLL(Number(e.target.value) || 0)}
                    className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                  />
                  <p className="text-[9px] text-slate-400 mt-1 leading-tight">Presunção de 32% sobre renda vezes 9% alíquota nominal padrão = 2,88% efetivo.</p>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-900 py-2.5 text-white font-sans text-xs font-bold hover:bg-indigo-800 transition-all cursor-pointer shadow-xs mt-2"
                  id="btn-save-imp"
                >
                  <Percent size={14} />
                  Salvar Tributação Efetiva
                </button>
              </form>
            </div>
          </div>

          {/* Resumos de Impostos */}
          <div className="lg:col-span-2 space-y-4">
            <div className="sleek-card bg-white rounded-xl border border-slate-200 shadow-3xs p-5 space-y-4">
              <div className="flex md:items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Percent size={16} className="text-slate-500" />
                  <h3 className="font-sans text-xs font-bold text-slate-800 uppercase tracking-wider">Tributação do Lucro Presumido Industrial para Terceirizações</h3>
                </div>
                <div className="bg-indigo-50 border border-indigo-150 px-3.5 py-1 rounded-lg text-center">
                  <span className="font-mono text-xs font-extrabold text-indigo-900">
                    Carga Combinada: {((taxasPresumido?.pis || 0) + (taxasPresumido?.cofins || 0) + (taxasPresumido?.iss || 0) + (taxasPresumido?.irpj || 0) + (taxasPresumido?.csll || 0)).toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 border border-slate-150 rounded-lg text-center space-y-1">
                  <span className="block text-4xs uppercase text-slate-400 font-bold">PIS</span>
                  <strong className="block text-sm font-mono font-extrabold text-slate-900">{(taxasPresumido?.pis ?? 0.65).toFixed(2)}%</strong>
                  <span className="block text-[8px] text-slate-400 leading-none">Faturamento</span>
                </div>
                <div className="p-3 border border-slate-150 rounded-lg text-center space-y-1">
                  <span className="block text-4xs uppercase text-slate-400 font-bold">COFINS</span>
                  <strong className="block text-sm font-mono font-extrabold text-slate-900">{(taxasPresumido?.cofins ?? 3.00).toFixed(2)}%</strong>
                  <span className="block text-[8px] text-slate-400 leading-none">Faturamento</span>
                </div>
                <div className="p-3 border border-slate-150 rounded-lg text-center space-y-1 bg-slate-50/50">
                  <span className="block text-4xs uppercase text-slate-400 font-bold">ISS</span>
                  <strong className="block text-sm font-mono font-extrabold text-slate-900">{(taxasPresumido?.iss ?? 5.00).toFixed(2)}%</strong>
                  <span className="block text-[8px] text-slate-400 leading-none">Municipal / Serv.</span>
                </div>
                <div className="p-3 border border-slate-150 rounded-lg text-center space-y-1">
                  <span className="block text-4xs uppercase text-slate-400 font-bold">IRPJ</span>
                  <strong className="block text-sm font-mono font-extrabold text-slate-900">{(taxasPresumido?.irpj ?? 4.80).toFixed(2)}%</strong>
                  <span className="block text-[8px] text-slate-350 leading-none">Presunção 32%</span>
                </div>
                <div className="p-3 border border-slate-150 rounded-lg text-center space-y-1">
                  <span className="block text-4xs uppercase text-slate-400 font-bold">CSLL</span>
                  <strong className="block text-sm font-mono font-extrabold text-slate-900">{(taxasPresumido?.csll ?? 2.88).toFixed(2)}%</strong>
                  <span className="block text-[8px] text-slate-350 leading-none">Presunção 32%</span>
                </div>
              </div>

              <div className="pt-2 text-2xs text-slate-550 leading-relaxed font-sans space-y-2">
                <p>
                  Sendo o objeto social da indústria voltado primordialmente para a <strong>industrialização por encomenda</strong>, e não fabricação própria de bens de consumo (pois o cliente fornece toda a matéria-prima), as notas fiscais emitidas são tipificadas como de prestação de serviços técnicos de terceirização com incidência predominante de ISS (Imposto sobre Serviços).
                </p>
                <p>
                  No regime de <strong>Lucro Presumido para Serviços</strong>, a base tributável estipulada em Lei é presumida de <strong>32%</strong> do faturamento bruto trimestral comercializado de serviço, servindo de base para as alíquotas do IRPJ (15%) e CSLL (9%). O PIS e COFINS incidem da forma cumulativa direta sobre o faturamento, sem apropriação de créditos.
                </p>
              </div>

            </div>

            <div className="p-4 bg-indigo-50/40 border border-indigo-150 rounded-xl text-3xs text-slate-600 leading-relaxed flex items-start gap-3">
              <CheckCircle2 className="text-indigo-700 shrink-0 mt-0.5" size={16} />
              <div>
                <span className="font-bold text-slate-800 block mb-0.5">Influência Efetiva no Markup de Orçamentação</span>
                A orçamentação sugerida retém o PIS/COFINS/ISS/IRPJ/CSLL calculando-os 'por dentro' na matriz de Markup de Venda Recomendada. Desta forma, o recolhimento das guias mensais de impostos federais e municipais não consome as margens operacionais brutas da gráfica.
              </div>
            </div>
          </div>

        </div>
      )}

      {/* --- MODAL DE IMPRESSÃO DO SIMULADOR DE CUSTO --- */}
      {isPrintingSimulador && selectedModelo && simulacaoCusto && (() => {
        const simlMarkupValue = simlMarkup;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto print-modal-overlay">
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                /* Esconde todo o conteúdo padrão da página */
                body * {
                  visibility: hidden !important;
                }
                
                /* Garante que o container do modal e o conteúdo fiquem visíveis */
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

                /* Container específico para Impressão */
                #print-simulador-section, #print-simulador-section * {
                  visibility: visible !important;
                }

                #print-simulador-section {
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

            <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh] print-modal-content">
              {/* Modal Header (Screen Only) */}
              <div className="p-5 border-b border-gray-150 flex items-center justify-between bg-gray-50/50 no-print">
                <div className="flex items-center gap-2.5">
                  <Printer className="text-blue-600" size={18} />
                  <div>
                    <h3 className="font-sans text-sm font-bold text-gray-900 uppercase tracking-wider">
                      Visualizar e Imprimir Orçamento
                    </h3>
                    <p className="font-sans text-4xs text-gray-500 font-medium">
                      Relatório de custos técnicos otimizado para impressão física ou salvar como PDF (Tamanho A4).
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPrintingSimulador(false)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* AVISO DE IFRAME DO NAVEGADOR */}
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

              {/* Corpo Imprimível */}
              <div className="p-8 overflow-y-auto flex-1 space-y-6 bg-slate-50/20 font-sans" id="print-simulador-section">
                {/* Cabeçalho da Ficha */}
                <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-slate-900 pb-5 gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-sans text-[10px] font-extrabold uppercase bg-slate-900 text-white px-2 py-0.5 rounded tracking-widest">
                        Orçamento Industrial
                      </span>
                      <span className="font-sans text-3xs text-slate-500 font-semibold uppercase tracking-wider">
                        Homero Embalagens
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mt-2 tracking-tight">
                      Simulação de Custo do Modelo / Lote
                    </h2>
                    <p className="text-3xs text-slate-400 font-mono mt-0.5">
                      ID DA SIMULAÇÃO: {selectedModeloId.toUpperCase()}-{simlQtd}-{(new Date()).getTime().toString().slice(-6)}
                    </p>
                  </div>
                  <div className="text-left md:text-right text-xs">
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Emitido em:</span>
                    <span className="font-mono font-bold text-slate-900 block mt-0.5">{(new Date()).toLocaleString('pt-BR')}</span>
                    <span className="text-4xs text-slate-500 font-medium block mt-1">Homero Industrial Lab & PCP</span>
                  </div>
                </div>

                {/* Informações Básicas do Modelo e do Lote */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Parâmetros do Lote */}
                  <div className="border border-slate-200 bg-white p-4 rounded-xl space-y-2.5">
                    <h4 className="font-sans text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                      Parâmetros do Lote
                    </h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 block">Ficha Piloto / Modelo:</span>
                        <strong className="text-slate-800 font-bold">
                          {selectedModelo.codigo ? `[${selectedModelo.codigo}] ` : ''}{selectedModelo.descricao}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Volume do Lote:</span>
                        <strong className="text-slate-800 font-mono font-bold">
                          {simlQtd.toLocaleString('pt-BR')} un
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Margem de Lucro (Markup):</span>
                        <strong className="text-slate-800 font-bold">
                          {simlMarkupValue}%
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Dimensões da Caixa:</span>
                        <strong className="text-slate-800 font-mono font-bold">
                          {selectedModelo.dimensoes || '—'}
                        </strong>
                      </div>
                      {selectedModelo.tipo_produto === 'embalagem' && (
                        <div className="col-span-2">
                          <span className="text-slate-400 block">Pontos de Cola:</span>
                          <strong className="text-slate-800 font-bold">
                            {selectedModelo.pontos_cola === 0 ? 'Sem Cola (0)' : `${selectedModelo.pontos_cola || 1} ponto(s)`}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resumo de Roteiro Técnico */}
                  <div className="border border-slate-200 bg-white p-4 rounded-xl space-y-2.5">
                    <h4 className="font-sans text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                      Roteiro e Engenharia Industrial
                    </h4>
                    <div className="divide-y divide-slate-100 text-[10px]">
                      {selectedModelo.roteiro && selectedModelo.roteiro.length > 0 ? (
                        selectedModelo.roteiro.map((maqId, idx) => {
                          const m = maquinas.find(maq => maq.id === maqId);
                          return (
                            <div key={idx} className="flex justify-between py-1.5 first:pt-0 last:pb-0">
                              <div>
                                <span className="font-bold text-slate-800">{idx + 1}. {m?.nome || 'Inativo'}</span>
                                <span className="text-slate-400 block text-[9px]">Capacidade: {m?.capacidade_hora.toLocaleString('pt-BR')} un/h</span>
                              </div>
                              <div className="text-right font-mono text-slate-600">
                                <span>Setup: R$ {m?.custo_setup || 0}</span>
                                <span className="block text-[9px]">Op: R$ {m?.custo_hora || 0}/h</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-slate-400 py-2">Nenhum roteiro cadastrado neste modelo.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Consolidação Financeira */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Custo Direto de Transformação</span>
                    <strong className="text-lg font-bold text-slate-900 block mt-1">
                      R$ {simulacaoCusto.custoMinimoServico.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                      R$ {simulacaoCusto.custoUnitarioServico.toLocaleString('pt-BR', { minimumFractionDigits: 4 })} / un
                    </span>
                  </div>

                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <span className="text-[10px] uppercase tracking-wide text-blue-700 font-bold">Preço Recomendado (Markup)</span>
                    <strong className="text-lg font-bold text-blue-900 block mt-1">
                      R$ {simulacaoCusto.precoEquivalenteLote.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                    <span className="text-[10px] text-blue-700 font-mono mt-0.5 block font-bold">
                      R$ {simulacaoCusto.precoEquivalenteUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 4 })} / un
                    </span>
                  </div>

                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                    <span className="text-[10px] uppercase tracking-wide text-emerald-800 font-bold">Lucro Operacional Líquido</span>
                    <strong className="text-lg font-bold text-emerald-900 block mt-1">
                      R$ {simulacaoCusto.lucroEsperado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                    <span className="text-[10px] text-emerald-700 font-sans mt-0.5 block font-bold">
                      {simlMarkupValue.toFixed(0)}% Margem sobre Venda
                    </span>
                  </div>
                </div>

                {/* Detalhamento do Custo de Transformação (Breakdown por Posto de Trabalho) */}
                <div className="space-y-2.5">
                  <h4 className="font-sans text-xs font-black text-slate-800 uppercase tracking-wider">
                    Breakdown por Posto de Trabalho
                  </h4>
                  <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
                    <table className="w-full text-left border-collapse text-[10px] font-sans">
                      <thead>
                        <tr className="bg-slate-800 text-white font-sans text-[9px] uppercase tracking-wider border-b border-slate-300">
                          <th className="py-2.5 px-3 border border-slate-300 text-left font-bold" colSpan={1}>Máquina / Processo</th>
                          <th className="py-2.5 px-3 border border-slate-300 text-right font-bold" colSpan={1}>Velocidade</th>
                          <th className="py-2 px-3 border border-slate-300 text-center font-bold bg-slate-700" colSpan={4}>CUSTOS SETUP</th>
                          <th className="py-2 px-3 border border-slate-300 text-center font-bold bg-slate-600" colSpan={4}>CUSTOS OPERAÇÃO</th>
                          <th className="py-2.5 px-3 border border-slate-300 text-right font-bold bg-slate-800" colSpan={1}>TOTAL ETAPA</th>
                        </tr>
                        <tr className="bg-slate-100 text-slate-700 font-sans text-[8px] font-black uppercase tracking-wider border-b border-slate-300">
                          <th className="py-2 px-3 border border-slate-300" colSpan={2}></th>
                          <th className="py-1.5 px-2 border border-slate-300 text-right font-bold">Tempo</th>
                          <th className="py-1.5 px-2 border border-slate-300 text-right font-bold">M.O</th>
                          <th className="py-1.5 px-2 border border-slate-300 text-right font-bold">Rateio</th>
                          <th className="py-1.5 px-2 border border-slate-300 text-right font-black bg-amber-50">Total Setup</th>
                          <th className="py-1.5 px-2 border border-slate-300 text-right font-bold">Tempo</th>
                          <th className="py-1.5 px-2 border border-slate-300 text-right font-bold">M.O</th>
                          <th className="py-1.5 px-2 border border-slate-300 text-right font-bold">Rateio</th>
                          <th className="py-1.5 px-2 border border-slate-300 text-right font-black bg-blue-50">Total Op.</th>
                          <th className="py-2 px-3 border border-slate-300"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-700">
                        {simulacaoCusto.detalheEtapas.map((etapa, idx) => (
                          <tr key={idx} className="text-[10px]">
                            <td className="py-2 px-3 border border-slate-200 font-semibold text-slate-900">
                              {etapa.nome}
                              <span className="block text-[8px] text-slate-400 font-normal mt-0.5">
                                Op: {etapa.operadorNome || 'Pool (Média)'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600 border border-slate-200">
                              {etapa.capacidade.toLocaleString('pt-BR')} un/h
                            </td>
                            {/* SETUP */}
                            <td className="py-2 px-2 text-right font-mono text-slate-800 border border-slate-200 bg-amber-50/10">
                              {(etapa.setup / 60).toFixed(2)}h ({etapa.setup} min)
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-600 border border-slate-200 bg-amber-50/10">
                              R$ {etapa.setupMo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-600 border border-slate-200 bg-amber-50/10">
                              R$ {etapa.setupFixo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 bg-amber-50/20 border border-slate-200">
                              R$ {etapa.custoSetupEtapa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            {/* OPERACAO */}
                            <td className="py-2 px-2 text-right font-mono text-slate-800 border border-slate-200 bg-blue-50/10">
                              {etapa.tempoHoras.toFixed(2)}h
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-600 border border-slate-200 bg-blue-50/10">
                              R$ {etapa.operacaoMo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-600 border border-slate-200 bg-blue-50/10">
                              R$ {etapa.operacaoFixo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 bg-blue-50/20 border border-slate-200">
                              R$ {etapa.custoOperacaoEtapa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            {/* TOTAL ETAPA */}
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-950 bg-slate-50 border border-slate-200">
                              R$ {etapa.custoTotalEtapa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                        {/* Totais do Rodapé */}
                        <tr className="bg-slate-100 font-bold border-t border-slate-300 text-[10px]">
                          <td className="py-2.5 px-3 font-extrabold text-slate-900 border border-slate-200 text-[9px] uppercase" colSpan={2}>
                            Serviço Consolidado
                          </td>
                          <td className="py-2.5 px-2 border border-slate-200" colSpan={3}></td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-900 bg-amber-50/30 border border-slate-200 font-black">
                            R$ {simulacaoCusto.totalSetup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-2 border border-slate-200" colSpan={3}></td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-900 bg-blue-50/30 border border-slate-200 font-black">
                            R$ {simulacaoCusto.totalOperacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-blue-900 bg-slate-150 border-2 border-slate-400 font-black">
                            R$ {simulacaoCusto.custoMinimoServico.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Green Explanation Box */}
                <div className="rounded-lg bg-emerald-50 border border-emerald-150 p-4 text-[10px] text-emerald-800 leading-relaxed">
                  <span className="font-extrabold block mb-1">Lógica industrial para Orçamentação:</span>
                  Este resultado representa o <strong>custo fabril de transformação pura</strong>. Recomenda-se adicionar impostos locais de prestação de serviços (ex: ISSQN) e despesas de frete/manuseio (CIF/FOB) caso houver.
                </div>

                {/* Área de Assinatura */}
                <div className="grid grid-cols-2 gap-8 pt-12 border-t border-slate-200 text-xs text-center">
                  <div>
                    <div className="w-48 border-b border-slate-400 mx-auto mb-1"></div>
                    <span className="text-slate-400 block font-medium">Assinatura do PCP</span>
                    <span className="text-slate-500 font-mono text-[9px]">Homero Embalagens</span>
                  </div>
                  <div>
                    <div className="w-48 border-b border-slate-400 mx-auto mb-1"></div>
                    <span className="text-slate-400 block font-medium">Aprovação Comercial / Gerente</span>
                    <span className="text-slate-500 font-mono text-[9px]">Homero Industrial Lab</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer (Screen Only) */}
              <div className="p-4 border-t border-gray-150 bg-gray-50 flex justify-end gap-2.5 no-print">
                <button
                  onClick={() => setIsPrintingSimulador(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all cursor-pointer shadow-3xs"
                >
                  <Printer size={14} />
                  Imprimir / Salvar PDF
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
}
