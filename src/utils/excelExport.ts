import * as XLSX from 'xlsx';
import { Pedido, Produto, Cliente, Maquina, Appnto } from '../types';

// Utilitário para formatar datas no padrão brasileiro DD/MM/YYYY
const formatarData = (dateStr?: string): string => {
  if (!dateStr) return '';
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return dateStr;
};

// Data atual no formato YYYY-MM-DD para nome do arquivo
const getDataHoraArquivo = (): string => {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

// ============================================================================
// 1. EXPORTAR KANBAN HORIZONTAL (POR COLUNAS / MÁQUINAS)
// ============================================================================
export interface ExportKanbanHorizontalParams {
  columns: Array<{ id: string; title: string; sub?: string; type?: string }>;
  getCardsForColumn: (colId: string) => Produto[];
  pedidos: Pedido[];
  clientes: Cliente[];
  maquinas: Maquina[];
  apontamentos: Appnto[];
}

export function exportKanbanHorizontalToExcel({
  columns,
  getCardsForColumn,
  pedidos,
  clientes,
  maquinas,
  apontamentos,
}: ExportKanbanHorizontalParams) {
  const dataPrincipal: any[] = [];
  const resumoMaquinas: any[] = [];

  columns.forEach((col) => {
    const cards = getCardsForColumn(col.id);
    const maquinaObj = maquinas.find((m) => m.id === col.id);

    let totalPecasColuna = 0;

    cards.forEach((prod, index) => {
      const pedido = pedidos.find((p) => p.id === prod.pedido_id);
      const cliente = clientes.find((c) => c.id === pedido?.cliente_id);

      totalPecasColuna += prod.quantidade || 0;

      // Apontamentos feitos nesta máquina
      const aptsNaEtapa = apontamentos.filter(
        (a) => a.produto_id === prod.id && a.maquina_id === col.id && a.tipo === 'producao'
      );
      const qtdProduzidaEtapa = aptsNaEtapa.reduce((acc, a) => acc + (a.quantidade_produzida || 0), 0);
      const progressoEtapa = prod.quantidade > 0 ? Math.min(100, Math.round((qtdProduzidaEtapa / prod.quantidade) * 100)) : 0;

      // Traduz nomes do roteiro
      const nomesRoteiro = (prod.roteiro || []).map((mId) => {
        const m = maquinas.find((maq) => maq.id === mId);
        return m ? m.nome : mId;
      }).join(' ➔ ');

      const statusMap: Record<string, string> = {
        pendente: 'Pendente',
        producao: 'Em Produção',
        concluido: 'Concluído',
        cancelado: 'Cancelado',
      };

      dataPrincipal.push({
        'Etapa / Coluna': col.title,
        'Tipo do Processo': col.type || 'Etapa Gráfica',
        'Posição na Fila': index + 1,
        'Nº Lote / Pedido': pedido?.id || prod.pedido_id,
        'Cliente': cliente?.nome || 'Não Informado',
        'Contato Cliente': cliente?.contato || '',
        'Telefone': cliente?.telefone || '',
        'Descrição do Produto': prod.descricao,
        'Quantidade do Lote (un)': prod.quantidade,
        'Qtd Apontada na Etapa (un)': qtdProduzidaEtapa,
        'Progresso da Etapa (%)': `${progressoEtapa}%`,
        'Prioridade': (pedido?.prioridade || 'media').toUpperCase(),
        'Sequência': pedido?.prioridade_sequencia !== undefined && pedido?.prioridade_sequencia !== null ? pedido.prioridade_sequencia : 'N/A',
        'Data Emissão': formatarData(pedido?.data_criacao),
        'Data Entrega': formatarData(pedido?.data_entrega),
        'Status do Pedido': statusMap[pedido?.status || ''] || pedido?.status || 'N/A',
        'Material / Papel': prod.material || 'N/A',
        'Dimensões': prod.dimensoes || 'N/A',
        'Faca (Contatos)': prod.contatos_faca || 1,
        'Cores Impressão': prod.cores_quantidade ? `${prod.cores_quantidade} cores (Frente: ${prod.cores_frente || 0}, Verso: ${prod.cores_verso || 0})` : 'N/A',
        'Pantones': Array.isArray(prod.pantones) ? prod.pantones.filter(Boolean).join(', ') : '',
        'Roteiro Completo': nomesRoteiro || 'Padrão',
      });
    });

    resumoMaquinas.push({
      'Máquina / Etapa': col.title,
      'Tipo de Operação': col.type || 'Processo',
      'Status Operacional': maquinaObj?.status_atual?.toUpperCase() || (col.id === 'concluido' ? 'EXPEDIÇÃO' : 'OPERANDO'),
      'Capacidade Nominal (un/h)': maquinaObj?.capacidade_hora || 'N/A',
      'Total de Lotes na Fila': cards.length,
      'Volume Total na Fila (un)': totalPecasColuna,
    });
  });

  const wb = XLSX.utils.book_new();

  // 1ª Aba: Lotes do Kanban
  const ws1 = XLSX.utils.json_to_sheet(dataPrincipal);
  ws1['!cols'] = [
    { wch: 22 }, // Coluna
    { wch: 18 }, // Tipo Processo
    { wch: 14 }, // Posicao
    { wch: 16 }, // Pedido
    { wch: 26 }, // Cliente
    { wch: 20 }, // Contato
    { wch: 16 }, // Telefone
    { wch: 32 }, // Produto
    { wch: 18 }, // Qtd Lote
    { wch: 22 }, // Qtd Apontada
    { wch: 18 }, // Progresso %
    { wch: 14 }, // Prioridade
    { wch: 12 }, // Sequência
    { wch: 14 }, // Data Criacao
    { wch: 14 }, // Data Entrega
    { wch: 16 }, // Status
    { wch: 28 }, // Material
    { wch: 18 }, // Dimensoes
    { wch: 14 }, // Faca
    { wch: 26 }, // Cores
    { wch: 20 }, // Pantones
    { wch: 36 }, // Roteiro
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Kanban_Por_Etapas');

  // 2ª Aba: Resumo por Máquina
  const ws2 = XLSX.utils.json_to_sheet(resumoMaquinas);
  ws2['!cols'] = [
    { wch: 26 },
    { wch: 18 },
    { wch: 18 },
    { wch: 24 },
    { wch: 20 },
    { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumo_Por_Maquina');

  const filename = `PCP_Kanban_Horizontal_${getDataHoraArquivo()}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ============================================================================
// 2. EXPORTAR KANBAN VERTICAL (POR LINHAS / ETAPAS DE PRODUÇÃO)
// ============================================================================
export interface ExportKanbanVerticalParams {
  columns: Array<{ id: string; title: string; sub?: string; type?: string }>;
  getCardsForColumn: (colId: string) => Produto[];
  pedidos: Pedido[];
  clientes: Cliente[];
  maquinas: Maquina[];
  apontamentos: Appnto[];
}

export function exportKanbanVerticalToExcel({
  columns,
  getCardsForColumn,
  pedidos,
  clientes,
  maquinas,
  apontamentos,
}: ExportKanbanVerticalParams) {
  const dataVertical: any[] = [];
  const resumoVertical: any[] = [];

  columns.forEach((col) => {
    const cards = getCardsForColumn(col.id);
    let totalPecas = 0;

    cards.forEach((prod, idx) => {
      const pedido = pedidos.find((p) => p.id === prod.pedido_id);
      const cliente = clientes.find((c) => c.id === pedido?.cliente_id);

      totalPecas += prod.quantidade || 0;

      const aptsNaEtapa = apontamentos.filter(
        (a) => a.produto_id === prod.id && a.maquina_id === col.id && a.tipo === 'producao'
      );
      const qtdProduzida = aptsNaEtapa.reduce((acc, a) => acc + (a.quantidade_produzida || 0), 0);
      const percConclusao = prod.quantidade > 0 ? Math.min(100, Math.round((qtdProduzida / prod.quantidade) * 100)) : 0;

      const nomesRoteiro = (prod.roteiro || []).map((mId) => {
        const m = maquinas.find((maq) => maq.id === mId);
        return m ? m.nome : mId;
      }).join(' ➔ ');

      const statusMap: Record<string, string> = {
        pendente: 'Pendente',
        producao: 'Em Produção',
        concluido: 'Concluído',
        cancelado: 'Cancelado',
      };

      dataVertical.push({
        'Etapa de Produção': col.title,
        'Tipo do Setor': col.type || 'Processo Industrial',
        'Ordem na Linha': idx + 1,
        'Nº Lote (Pedido)': pedido?.id || prod.pedido_id,
        'Cliente': cliente?.nome || 'Não Informado',
        'Contato': cliente?.contato || '',
        'Telefone': cliente?.telefone || '',
        'Produto': prod.descricao,
        'Quantidade do Lote (un)': prod.quantidade,
        'Produzido na Etapa (un)': qtdProduzida,
        'Progresso Etapa (%)': `${percConclusao}%`,
        'Prioridade': (pedido?.prioridade || 'media').toUpperCase(),
        'Sequência': pedido?.prioridade_sequencia !== undefined && pedido?.prioridade_sequencia !== null ? pedido.prioridade_sequencia : 'N/A',
        'Data Emissão': formatarData(pedido?.data_criacao),
        'Data de Entrega': formatarData(pedido?.data_entrega),
        'Status do Pedido': statusMap[pedido?.status || ''] || pedido?.status || 'N/A',
        'Material': prod.material || 'N/A',
        'Dimensões': prod.dimensoes || 'N/A',
        'Faca (Contatos)': prod.contatos_faca || 1,
        'Cores': prod.cores_quantidade ? `${prod.cores_quantidade} cores` : 'N/A',
        'Pantones': Array.isArray(prod.pantones) ? prod.pantones.filter(Boolean).join(', ') : '',
        'Fluxo de Produção (Roteiro)': nomesRoteiro || 'Padrão',
      });
    });

    resumoVertical.push({
      'Linha / Etapa': col.title,
      'Tipo de Operação': col.type || 'Processo',
      'Total de Lotes Aguardando/Em Linha': cards.length,
      'Quantidade Total de Unidades (un)': totalPecas,
    });
  });

  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.json_to_sheet(dataVertical);
  ws1['!cols'] = [
    { wch: 24 }, // Etapa
    { wch: 18 }, // Tipo Setor
    { wch: 14 }, // Ordem
    { wch: 16 }, // Lote
    { wch: 26 }, // Cliente
    { wch: 20 }, // Contato
    { wch: 16 }, // Telefone
    { wch: 32 }, // Produto
    { wch: 18 }, // Qtd Lote
    { wch: 22 }, // Qtd Produzida
    { wch: 18 }, // Progresso %
    { wch: 14 }, // Prioridade
    { wch: 12 }, // Sequência
    { wch: 14 }, // Data Criacao
    { wch: 14 }, // Data Entrega
    { wch: 16 }, // Status
    { wch: 28 }, // Material
    { wch: 18 }, // Dimensoes
    { wch: 14 }, // Faca
    { wch: 16 }, // Cores
    { wch: 20 }, // Pantones
    { wch: 36 }, // Fluxo Roteiro
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Kanban_Vertical_Linhas');

  const ws2 = XLSX.utils.json_to_sheet(resumoVertical);
  ws2['!cols'] = [
    { wch: 28 },
    { wch: 20 },
    { wch: 32 },
    { wch: 32 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumo_Etapas');

  const filename = `PCP_Kanban_Vertical_${getDataHoraArquivo()}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ============================================================================
// 3. EXPORTAR TABELA DE ACOMPANHAMENTO DE PEDIDOS (KANBAN TABELA)
// ============================================================================
export interface ExportKanbanTabelaParams {
  pedidos: Pedido[];
  produtos: Produto[];
  clientes: Cliente[];
  maquinas: Maquina[];
  apontamentos: Appnto[];
}

export function exportKanbanTabelaToExcel({
  pedidos,
  produtos,
  clientes,
  maquinas,
  apontamentos,
}: ExportKanbanTabelaParams) {
  const dataTabela: any[] = [];

  pedidos.forEach((ped) => {
    const cliente = clientes.find((c) => c.id === ped.cliente_id);
    const pedProds = produtos.filter((p) => p.pedido_id === ped.id);

    const nomesProdutos = pedProds.map((p) => p.descricao).join('; ');
    const totalMeta = pedProds.reduce((sum, p) => sum + (p.quantidade || 0), 0);

    // Identifica a fase atual
    const fases = pedProds.map((p) => {
      const isConcluido = p.maquina_atual_idx === p.roteiro.length;
      if (isConcluido) return 'CONCLUÍDO / EXPEDIÇÃO';
      const activeMacId = p.roteiro[p.maquina_atual_idx] || p.roteiro[0];
      const macObj = maquinas.find((m) => m.id === activeMacId);
      return macObj ? macObj.nome : 'Pronto';
    }).join('; ');

    // Calcula progresso consolidado
    let totalWorkGoal = 0;
    let totalWorkDone = 0;
    pedProds.forEach((item) => {
      const lastMachineId = item.roteiro && item.roteiro.length > 0 ? item.roteiro[item.roteiro.length - 1] : null;
      const aptFinal = lastMachineId
        ? apontamentos
            .filter((a) => a.produto_id === item.id && a.maquina_id === lastMachineId && a.tipo === 'producao')
            .reduce((acc, a) => acc + (a.quantidade_produzida || 0), 0)
        : 0;

      totalWorkGoal += item.quantidade || 0;
      if (item.maquina_atual_idx === item.roteiro.length) {
        totalWorkDone += item.quantidade || 0;
      } else {
        totalWorkDone += Math.min(item.quantidade, aptFinal);
      }
    });

    const progressoPercentual = totalWorkGoal > 0 ? Math.min(100, Math.round((totalWorkDone / totalWorkGoal) * 100)) : 0;

    const statusMap: Record<string, string> = {
      pendente: 'Pendente',
      producao: 'Em Produção',
      concluido: 'Concluído',
      cancelado: 'Cancelado',
    };

    // Situação de atraso
    const hoje = new Date().toISOString().split('T')[0];
    let situacaoPrazo = 'No Prazo';
    if (ped.status === 'concluido') {
      situacaoPrazo = 'Concluído';
    } else if (ped.status === 'cancelado') {
      situacaoPrazo = 'Cancelado';
    } else if (ped.data_entrega && ped.data_entrega < hoje) {
      situacaoPrazo = 'Atrasado!';
    }

    dataTabela.push({
      'Nº Lote / Pedido': ped.id,
      'Cliente': cliente?.nome || 'Não Informado',
      'Contato do Cliente': cliente?.contato || '',
      'Telefone': cliente?.telefone || '',
      'Produtos do Lote': nomesProdutos || 'Nenhum item',
      'Fase Atual / Máquina': fases || 'Pendente',
      'Quantidade Meta (un)': totalMeta,
      'Quantidade Produzida (un)': totalWorkDone,
      'Progresso Geral (%)': `${progressoPercentual}%`,
      'Prioridade': (ped.prioridade || 'media').toUpperCase(),
      'Sequência de Produção': ped.prioridade_sequencia !== undefined && ped.prioridade_sequencia !== null ? ped.prioridade_sequencia : 'N/A',
      'Data de Emissão': formatarData(ped.data_criacao),
      'Prazo de Entrega': formatarData(ped.data_entrega),
      'Status Geral': statusMap[ped.status] || ped.status,
      'Situação do Prazo': situacaoPrazo,
    });
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(dataTabela);
  ws['!cols'] = [
    { wch: 16 }, // Pedido
    { wch: 28 }, // Cliente
    { wch: 20 }, // Contato
    { wch: 16 }, // Telefone
    { wch: 36 }, // Produtos
    { wch: 26 }, // Fase Atual
    { wch: 18 }, // Meta
    { wch: 22 }, // Produzida
    { wch: 18 }, // Progresso %
    { wch: 14 }, // Prioridade
    { wch: 20 }, // Sequencia
    { wch: 16 }, // Emissao
    { wch: 16 }, // Entrega
    { wch: 16 }, // Status
    { wch: 18 }, // Situacao Prazo
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Acompanhamento_Pedidos');

  const filename = `PCP_Acompanhamento_Tabela_${getDataHoraArquivo()}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ============================================================================
// 4. EXPORTAR GESTÃO DE PEDIDOS (PEDIDOS E ORDENS COMPLETAS)
// ============================================================================
export interface ExportPedidosParams {
  pedidos: Pedido[];
  produtos: Produto[];
  clientes: Cliente[];
  maquinas: Maquina[];
  apontamentos: Appnto[];
}

export function exportPedidosToExcel({
  pedidos,
  produtos,
  clientes,
  maquinas,
  apontamentos,
}: ExportPedidosParams) {
  const dataPedidos: any[] = [];
  const dataItensDetalhes: any[] = [];

  const statusMap: Record<string, string> = {
    pendente: 'Pendente de Produção',
    producao: 'Em Produção (Fila)',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
  };

  const hoje = new Date().toISOString().split('T')[0];

  pedidos.forEach((ped) => {
    const cliente = clientes.find((c) => c.id === ped.cliente_id);
    const prodsDoPed = produtos.filter((p) => p.pedido_id === ped.id);

    const descricoes = prodsDoPed.map((p) => `[${p.quantidade.toLocaleString('pt-BR')} un] ${p.descricao}`).join(' | ');
    const totalQtd = prodsDoPed.reduce((acc, p) => acc + (p.quantidade || 0), 0);

    let situacaoPrazo = 'No Prazo';
    if (ped.status === 'concluido') {
      situacaoPrazo = 'Concluído';
    } else if (ped.status === 'cancelado') {
      situacaoPrazo = 'Cancelado';
    } else if (ped.data_entrega && ped.data_entrega < hoje) {
      situacaoPrazo = 'Atrasado';
    }

    dataPedidos.push({
      'Nº Lote / Pedido': ped.id,
      'Cliente': cliente?.nome || 'Não Informado',
      'Código Cliente': cliente?.codigo || 'N/A',
      'Contato': cliente?.contato || '',
      'Email': cliente?.email || '',
      'Telefone': cliente?.telefone || '',
      'Resumo dos Produtos': descricoes || 'Sem produtos',
      'Quantidade Total de Peças (un)': totalQtd,
      'Prioridade': (ped.prioridade || 'media').toUpperCase(),
      'Sequência': ped.prioridade_sequencia !== undefined && ped.prioridade_sequencia !== null ? ped.prioridade_sequencia : 'N/A',
      'Data de Emissão': formatarData(ped.data_criacao),
      'Data de Entrega': formatarData(ped.data_entrega),
      'Status': statusMap[ped.status] || ped.status,
      'Situação de Prazo': situacaoPrazo,
      'Total de Itens/Modelos': prodsDoPed.length,
    });

    // Detalha cada produto e ficha técnica do pedido
    prodsDoPed.forEach((p, pIdx) => {
      const nomesRoteiro = (p.roteiro || []).map((mId) => {
        const m = maquinas.find((maq) => maq.id === mId);
        return m ? m.nome : mId;
      }).join(' ➔ ');

      // Insumos da ficha
      const insumosDetalhados = (p.insumos_ficha || []).map(
        (ins) => `${ins.nome} (Rendimento: ${ins.rendimento || 'N/A'}, Fator: ${ins.fator_consumo || 'N/A'})`
      ).join('; ');

      dataItensDetalhes.push({
        'Nº Lote / Pedido': ped.id,
        'Item Nº': pIdx + 1,
        'ID Produto': p.id,
        'Cliente': cliente?.nome || 'Não Informado',
        'Descrição do Produto': p.descricao,
        'Tipo do Produto': (p.tipo_produto || 'embalagem').toUpperCase(),
        'Quantidade (un)': p.quantidade,
        'Dimensões': p.dimensoes || 'N/A',
        'Material / Papel': p.material || 'N/A',
        'Fator de Consumo': p.fator_consumo || 0,
        'Contatos da Faca': p.contatos_faca || 1,
        'Medida da Faca': p.medida_faca || 'N/A',
        'Pontos de Cola': p.pontos_cola || 1,
        'Qtd de Cores': p.cores_quantidade || 0,
        'Cores Frente': p.cores_frente || 0,
        'Cores Verso': p.cores_verso || 0,
        'Pantones': Array.isArray(p.pantones) ? p.pantones.filter(Boolean).join(', ') : '',
        'Roteiro de Produção': nomesRoteiro || 'Padrão',
        'Ficha Técnica (Insumos)': insumosDetalhados || 'N/A',
        'Status do Pedido': statusMap[ped.status] || ped.status,
      });
    });
  });

  const wb = XLSX.utils.book_new();

  // Aba 1: Gestão de Pedidos
  const ws1 = XLSX.utils.json_to_sheet(dataPedidos);
  ws1['!cols'] = [
    { wch: 16 }, // Pedido
    { wch: 28 }, // Cliente
    { wch: 14 }, // Codigo
    { wch: 20 }, // Contato
    { wch: 24 }, // Email
    { wch: 16 }, // Telefone
    { wch: 40 }, // Resumo
    { wch: 26 }, // Qtd Total
    { wch: 14 }, // Prioridade
    { wch: 12 }, // Sequência
    { wch: 16 }, // Emissao
    { wch: 16 }, // Entrega
    { wch: 22 }, // Status
    { wch: 18 }, // Situacao
    { wch: 22 }, // Total Itens
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Gestao_Pedidos_e_Lotes');

  // Aba 2: Itens e Fichas Técnicas
  const ws2 = XLSX.utils.json_to_sheet(dataItensDetalhes);
  ws2['!cols'] = [
    { wch: 16 }, // Pedido
    { wch: 10 }, // Item
    { wch: 14 }, // ID
    { wch: 26 }, // Cliente
    { wch: 32 }, // Produto
    { wch: 16 }, // Tipo
    { wch: 16 }, // Qtd
    { wch: 18 }, // Dimensoes
    { wch: 28 }, // Material
    { wch: 16 }, // Fator
    { wch: 16 }, // Faca
    { wch: 16 }, // Medida
    { wch: 14 }, // Cola
    { wch: 12 }, // Cores
    { wch: 12 }, // Frente
    { wch: 12 }, // Verso
    { wch: 20 }, // Pantones
    { wch: 36 }, // Roteiro
    { wch: 44 }, // Insumos
    { wch: 20 }, // Status
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'Itens_e_Fichas_Tecnicas');

  const filename = `PCP_Gestao_Pedidos_${getDataHoraArquivo()}.xlsx`;
  XLSX.writeFile(wb, filename);
}
