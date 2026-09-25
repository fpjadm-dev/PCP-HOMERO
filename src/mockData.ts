import { Cliente, Pedido, Produto, Maquina, Operador, Insumo, Appnto, KanbanItem, InsumoMovimento, CustoGeral, TaxasLucroPresumido } from './types';

export const INITIAL_CLIENTES: Cliente[] = [
  { id: 'cli1', nome: 'Chocolates Gramado S/A', contato: 'Marta Souza (Logística)', email: 'marta@chocolatesgramado.com', telefone: '(54) 3286-1234' },
  { id: 'cli2', nome: 'Café Imperial Ltda', contato: 'Roberto Caldas (Suprimentos)', email: 'roberto@cafeimperial.com', telefone: '(11) 4002-8922' },
  { id: 'cli3', nome: 'Cosméticos Belas & Cia', contato: 'Fernanda Lima (Plan.)', email: 'fernanda.lima@belascosmeticos.com.br', telefone: '(21) 2500-4499' },
  { id: 'cli4', nome: 'Cervejaria Artesanal Homem do Malte', contato: 'Eduardo Reis', email: 'eduardo@homemdomalte.com.br', telefone: '(41) 3344-5566' }
];

export const INITIAL_MAQUINAS: Maquina[] = [
  { id: 'm1', nome: 'Impressora Offset Heidelberg Speedmaster 4 Cores', tipo: 'Impressão', capacidade_hora: 3000, status_atual: 'operando', tempo_setup: 60, setup_cores: 15, valor_aquisicao: 850000, vida_util_anos: 10, depreciacao_mensal: 7083.33, operador_id: 'op1', capacidade_embalagem: 3000, capacidade_manual: 1500, capacidade_bolacha: 6000 },
  { id: 'm2', nome: 'Corte e Vinco Automática Bobst 102', tipo: 'Corte', capacidade_hora: 4000, status_atual: 'ociosa', tempo_setup: 40, setup_cores: 0, valor_aquisicao: 480000, vida_util_anos: 12, depreciacao_mensal: 3333.33, operador_id: 'op2', capacidade_embalagem: 4000, capacidade_manual: 2000, capacidade_bolacha: 8000 },
  { id: 'm3', nome: 'Coladeira de Cartuchos Vega 80', tipo: 'Acabamento', capacidade_hora: 5000, status_atual: 'operando', tempo_setup: 30, setup_cores: 0, valor_aquisicao: 240000, vida_util_anos: 8, depreciacao_mensal: 2500, operador_id: 'op3', capacidade_embalagem: 5000, capacidade_manual: 2500, capacidade_bolacha: 10000 },
  { id: 'm4', nome: 'Meia Folha 1 Cor', tipo: 'Impressão', capacidade_hora: 2000, status_atual: 'ociosa', tempo_setup: 30, setup_cores: 5, valor_aquisicao: 120000, vida_util_anos: 10, depreciacao_mensal: 1000, operador_id: 'op1', capacidade_embalagem: 2000, capacidade_manual: 1000, capacidade_bolacha: 4000 },
  { id: 'm5', nome: 'Meia Folha 2 Cores', tipo: 'Impressão', capacidade_hora: 2000, status_atual: 'ociosa', tempo_setup: 40, setup_cores: 10, valor_aquisicao: 180000, vida_util_anos: 10, depreciacao_mensal: 1500, operador_id: 'op2', capacidade_embalagem: 2000, capacidade_manual: 1000, capacidade_bolacha: 4000 },
  { id: 'm6', nome: 'Folha Inteira 4 Cores', tipo: 'Impressão', capacidade_hora: 4000, status_atual: 'ociosa', tempo_setup: 60, setup_cores: 20, valor_aquisicao: 500000, vida_util_anos: 10, depreciacao_mensal: 4166.67, operador_id: 'op3', capacidade_embalagem: 4000, capacidade_manual: 2000, capacidade_bolacha: 8000 }
];

export const INITIAL_OPERADORES: Operador[] = [
  { id: 'op1', nome: 'Arnaldo Silva Ramos', turno: 'Manhã', cargo: 'Impressor Offset Pleno', custo_hora: 25, custo_mensal: 4400 },
  { id: 'op2', nome: 'Beatriz Souza Silveira', turno: 'Tarde', cargo: 'Auxiliar de Corte e Vinco', custo_hora: 20, custo_mensal: 3520 },
  { id: 'op3', nome: 'Carlos Eduardo Santos', turno: 'Noite', cargo: 'Operador de Dobra e Colagem', custo_hora: 28, custo_mensal: 4920 },
  { id: 'op4', nome: 'Daiane Rodrigues Costa', turno: 'Manhã', cargo: 'Auxiliar de Bobst Junior', custo_hora: 18, custo_mensal: 3168 }
];

export const INITIAL_CUSTOS_GERAIS: CustoGeral[] = [
  { id: 'cg1', descricao: 'Aluguel do Galpão Industrial 1200m²', valor: 8500, recorrencia: 'Mensal', categoria: 'Aluguel', data_vencimento: '2026-06-10' },
  { id: 'cg2', descricao: 'Energia Elétrica Trifásica Copel', valor: 3100, recorrencia: 'Mensal', categoria: 'Energia S/A', data_vencimento: '2026-06-15' },
  { id: 'cg3', descricao: 'Sanepar Saneamento e Água', valor: 450, recorrencia: 'Mensal', categoria: 'Água/Saneamento', data_vencimento: '2026-06-12' },
  { id: 'cg4', descricao: 'Internet Fibra Óptica Dedicada', valor: 250, recorrencia: 'Mensal', categoria: 'Internet/Nuvem', data_vencimento: '2026-06-05' },
  { id: 'cg5', descricao: 'Pro-labore dos Administradores do PCP', valor: 12000, recorrencia: 'Mensal', categoria: 'Pro-labore/Adm', data_vencimento: '2026-06-30' }
];

export const DEFAULT_TAXAS_PRESUMIDO: TaxasLucroPresumido = {
  pis: 0.65,
  cofins: 3.00,
  iss: 5.00,
  irpj: 4.80,
  csll: 2.88
};

export const INITIAL_INSUMOS: Insumo[] = [
  { id: 'ins1', nome: 'Papel Cartão Duplex 250g (Folhas)', tipo: 'papel_cartao', unidade: 'folhas', estoque_atual: 0, estoque_minimo: 3000, fornecedor: 'Klabin S.A.' },
  { id: 'ins2', nome: 'Papel Cartão Triplex 300g (Folhas)', tipo: 'papel_cartao', unidade: 'folhas', estoque_atual: 0, estoque_minimo: 2500, fornecedor: 'Suzano Papel e Celulose' },
  { id: 'ins3', nome: 'Tinta Escala Cyan Sun-Uv', tipo: 'tinta', unidade: 'folhas', estoque_atual: 0, estoque_minimo: 30, fornecedor: 'Sun Chemical do Brasil' },
  { id: 'ins4', nome: 'Tinta Escala Magenta Sun-Uv', tipo: 'tinta', unidade: 'folhas', estoque_atual: 0, estoque_minimo: 30, fornecedor: 'Sun Chemical do Brasil' },
  { id: 'ins5', nome: 'Tinta Escala Yellow Sun-Uv', tipo: 'tinta', unidade: 'folhas', estoque_atual: 0, estoque_minimo: 30, fornecedor: 'Sun Chemical do Brasil' },
  { id: 'ins6', nome: 'Tinta Escala Black Sun-Uv', tipo: 'tinta', unidade: 'folhas', estoque_atual: 0, estoque_minimo: 30, fornecedor: 'Sun Chemical do Brasil' },
  { id: 'ins7', nome: 'Cola PVA Henkel Aquence (Saco)', tipo: 'cola', unidade: 'folhas', estoque_atual: 0, estoque_minimo: 120, fornecedor: 'Henkel Ltda' },
  { id: 'ins8', nome: 'Verniz UV Brilho Alto Sol (Galão)', tipo: 'verniz', unidade: 'litros', estoque_atual: 0, estoque_minimo: 60, fornecedor: 'Toyo Ink Brasil' }
];

export const INITIAL_PEDIDOS: Pedido[] = [
  { id: 'PED-1001', cliente_id: 'cli1', data_entrega: '2026-06-15', status: 'producao', prioridade: 'alta', data_criacao: '2026-05-25' },
  { id: 'PED-1002', cliente_id: 'cli2', data_entrega: '2026-06-25', status: 'producao', prioridade: 'media', data_criacao: '2026-05-26' },
  { id: 'PED-1003', cliente_id: 'cli3', data_entrega: '2026-05-27', status: 'producao', prioridade: 'alta', data_criacao: '2026-05-20' }, // Atrasado em relação a hoje (2026-05-28)
  { id: 'PED-1004', cliente_id: 'cli4', data_entrega: '2026-07-02', status: 'pendente', prioridade: 'baixa', data_criacao: '2026-05-28' }
];

export const INITIAL_PRODUTOS: Produto[] = [
  {
    id: 'PROD-101',
    pedido_id: 'PED-1001',
    descricao: 'Caixa Trufas Recheadas Imperial (Duplex)',
    quantidade: 20000,
    dimensoes: '22x14x6 cm',
    material: 'Papel Cartão Duplex 250g (Folhas)',
    fator_consumo: 0.08, // 80 folhas ou folhas equivalent por caixa
    roteiro: ['m1', 'm2', 'm3'], // Offset -> Bobst -> Vega
    maquina_atual_idx: 1, // Está no Corte (m2)
    cores_quantidade: 4,
    cores_frente: 4,
    cores_verso: 0,
    pantones: [
      { nome: 'Pantone White C', cor: '#fcfcfc' },
      { nome: 'Pantone 485 C (Vermelho)', cor: '#da291c' },
      { nome: 'Pantone 872 C (Gold)', cor: '#85754e' },
      { nome: 'Pantone Black C', cor: '#2d2926' }
    ],
    tipo_produto: 'embalagem'
  },
  {
    id: 'PROD-102',
    pedido_id: 'PED-1002',
    descricao: 'Cartucho Café Imperial Espresso 1kg (Triplex)',
    quantidade: 15000,
    dimensoes: '15x10x28 cm',
    material: 'Papel Cartão Triplex 300g (Folhas)',
    fator_consumo: 0.12, // 120 folhas por caixa
    roteiro: ['m1', 'm2', 'm3'],
    maquina_atual_idx: 0, // Está na Impressão (m1)
    cores_quantidade: 2,
    cores_frente: 2,
    cores_verso: 0,
    pantones: [
      { nome: 'Pantone Coffee Brown', cor: '#4a2c11' },
      { nome: 'Pantone Golden Yellow', cor: '#f3bc2c' }
    ],
    tipo_produto: 'embalagem'
  },
  {
    id: 'PROD-103',
    pedido_id: 'PED-1003',
    descricao: 'Estojo Batom Matte Luxo (Duplex)',
    quantidade: 35000,
    dimensoes: '4x4x10 cm',
    material: 'Papel Cartão Duplex 250g (Folhas)',
    fator_consumo: 0.02, // 20 folhas por embalagem
    roteiro: ['m1', 'm2', 'm3'],
    maquina_atual_idx: 2, // Está no Acabamento (m3)
    cores_quantidade: 3,
    cores_frente: 3,
    cores_verso: 0,
    pantones: [
      { nome: 'Pantone Velvet Rose', cor: '#b93a58' },
      { nome: 'Pantone Luxury Gold', cor: '#d4af37' },
      { nome: 'Pantone Dark Night', cor: '#111625' }
    ],
    tipo_produto: 'embalagem'
  },
  {
    id: 'PROD-104',
    pedido_id: 'PED-1004',
    descricao: 'Pack Cerveja 6un Malte Forte',
    quantidade: 10000,
    dimensoes: '30x20x22 cm',
    material: 'Papel Cartão Triplex 300g (Folhas)',
    fator_consumo: 0.25, // 250 folhas por caixa
    roteiro: ['m2', 'm3'], // Apenas Corte e Acabamento (sem impressão personalizada complexa, usa liner pardo)
    maquina_atual_idx: -1, // Pendente de liberação
    cores_quantidade: 0,
    cores_frente: 0,
    cores_verso: 0,
    pantones: [],
    tipo_produto: 'embalagem'
  }
];

export const INITIAL_KANBAN: KanbanItem[] = [
  // PROD-101 (Duplex Trufas) - maquina_atual_idx = 1 (Bobst Corte - m2)
  { id: 'kb1', produto_id: 'PROD-101', maquina_id: 'm1', ordem: 1, status: 'concluido', data_entrada: '2026-05-26 08:30', data_saida: '2026-05-27 11:30' },
  { id: 'kb2', produto_id: 'PROD-101', maquina_id: 'm2', ordem: 1, status: 'aguardando', data_entrada: '2026-05-27 11:35' },
  
  // PROD-102 (Café Espresso) - maquina_atual_idx = 0 (Speedmaster Impressora - m1)
  { id: 'kb3', produto_id: 'PROD-102', maquina_id: 'm1', ordem: 2, status: 'em_processo', data_entrada: '2026-05-27 09:00' },
  
  // PROD-103 (Estojo Batom) - maquina_atual_idx = 2 (Vega Coladeira - m3)
  { id: 'kb4', produto_id: 'PROD-103', maquina_id: 'm1', ordem: 1, status: 'concluido', data_entrada: '2026-05-21 08:00', data_saida: '2026-05-22 17:00' },
  { id: 'kb5', produto_id: 'PROD-103', maquina_id: 'm2', ordem: 2, status: 'concluido', data_entrada: '2026-05-22 17:15', data_saida: '2026-05-25 15:00' },
  { id: 'kb6', produto_id: 'PROD-103', maquina_id: 'm3', ordem: 1, status: 'em_processo', data_entrada: '2026-05-25 15:10' }
];

export const INITIAL_APONTAMENTOS: Appnto[] = [
  // 2026-05-22
  { id: 'apt1', maquina_id: 'm1', operador_id: 'op1', produto_id: 'PROD-101', data_inicio: '2026-05-22T08:00:00.000Z', data_fim: '2026-05-22T12:00:00.000Z', quantidade_produzida: 3000, quantidade_refugo: 120, tempo_parado: 15, tipo: 'producao' },
  { id: 'apt2', maquina_id: 'm2', operador_id: 'op2', produto_id: 'PROD-101', data_inicio: '2026-05-22T13:00:00.000Z', data_fim: '2026-05-22T17:00:00.000Z', quantidade_produzida: 2500, quantidade_refugo: 80, tempo_parado: 20, tipo: 'producao' },
  { id: 'apt3', maquina_id: 'm3', operador_id: 'op3', produto_id: 'PROD-103', data_inicio: '2026-05-22T18:00:00.000Z', data_fim: '2026-05-22T22:00:00.000Z', quantidade_produzida: 2000, quantidade_refugo: 50, tempo_parado: 10, tipo: 'producao' },

  // 2026-05-23
  { id: 'apt4', maquina_id: 'm1', operador_id: 'op1', produto_id: 'PROD-101', data_inicio: '2026-05-23T08:00:00.000Z', data_fim: '2026-05-23T12:00:00.000Z', quantidade_produzida: 4000, quantidade_refugo: 150, tempo_parado: 0, tipo: 'producao' },
  { id: 'apt5', maquina_id: 'm2', operador_id: 'op2', produto_id: 'PROD-101', data_inicio: '2026-05-23T13:00:00.000Z', data_fim: '2026-05-23T17:00:00.000Z', quantidade_produzida: 3500, quantidade_refugo: 90, tempo_parado: 15, tipo: 'producao' },
  { id: 'apt6', maquina_id: 'm3', operador_id: 'op3', produto_id: 'PROD-103', data_inicio: '2026-05-23T18:00:00.000Z', data_fim: '2026-05-23T22:00:00.000Z', quantidade_produzida: 3000, quantidade_refugo: 60, tempo_parado: 30, tipo: 'producao' },

  // 2026-05-24
  { id: 'apt7', maquina_id: 'm1', operador_id: 'op1', produto_id: 'PROD-102', data_inicio: '2026-05-24T09:00:00.000Z', data_fim: '2026-05-24T12:00:00.000Z', quantidade_produzida: 2000, quantidade_refugo: 110, tempo_parado: 10, tipo: 'producao' },
  { id: 'apt8', maquina_id: 'm2', operador_id: 'op2', produto_id: 'PROD-101', data_inicio: '2026-05-24T13:00:00.000Z', data_fim: '2026-05-24T16:00:00.000Z', quantidade_produzida: 1800, quantidade_refugo: 40, tempo_parado: 5, tipo: 'producao' },
  { id: 'apt9', maquina_id: 'm3', operador_id: 'op3', produto_id: 'PROD-103', data_inicio: '2026-05-24T17:00:00.000Z', data_fim: '2026-05-24T20:00:00.000Z', quantidade_produzida: 1500, quantidade_refugo: 30, tempo_parado: 12, tipo: 'producao' },

  // 2026-05-25
  { id: 'apt10', maquina_id: 'm1', operador_id: 'op1', produto_id: 'PROD-102', data_inicio: '2026-05-25T08:00:00.000Z', data_fim: '2026-05-25T13:00:00.000Z', quantidade_produzida: 5000, quantidade_refugo: 200, tempo_parado: 40, tipo: 'producao' },
  { id: 'apt11', maquina_id: 'm2', operador_id: 'op2', produto_id: 'PROD-101', data_inicio: '2026-05-25T13:30:00.000Z', data_fim: '2026-05-25T18:30:00.000Z', quantidade_produzida: 4200, quantidade_refugo: 130, tempo_parado: 15, tipo: 'producao' },
  { id: 'apt12', maquina_id: 'm3', operador_id: 'op3', produto_id: 'PROD-103', data_inicio: '2026-05-25T18:45:00.000Z', data_fim: '2026-05-25T23:45:00.000Z', quantidade_produzida: 4000, quantidade_refugo: 70, tempo_parado: 8, tipo: 'producao' },

  // 2026-05-26
  { id: 'apt13', maquina_id: 'm1', operador_id: 'op1', produto_id: 'PROD-102', data_inicio: '2026-05-26T08:00:00.000Z', data_fim: '2026-05-26T14:00:00.000Z', quantidade_produzida: 6000, quantidade_refugo: 180, tempo_parado: 25, tipo: 'producao' },
  { id: 'apt14', maquina_id: 'm2', operador_id: 'op2', produto_id: 'PROD-101', data_inicio: '2026-05-26T14:30:00.000Z', data_fim: '2026-05-26T20:30:00.000Z', quantidade_produzida: 5500, quantidade_refugo: 140, tempo_parado: 10, tipo: 'producao' },
  { id: 'apt15', maquina_id: 'm3', operador_id: 'op3', produto_id: 'PROD-103', data_inicio: '2026-05-26T18:00:00.000Z', data_fim: '2026-05-26T23:00:00.000Z', quantidade_produzida: 5000, quantidade_refugo: 90, tempo_parado: 15, tipo: 'producao' },

  // 2026-05-27
  { id: 'apt16', maquina_id: 'm1', operador_id: 'op1', produto_id: 'PROD-102', data_inicio: '2026-05-27T08:00:00.000Z', data_fim: '2026-05-27T15:00:00.000Z', quantidade_produzida: 7500, quantidade_refugo: 220, tempo_parado: 35, tipo: 'producao' },
  { id: 'apt17', maquina_id: 'm2', operador_id: 'op2', produto_id: 'PROD-101', data_inicio: '2026-05-27T13:00:00.000Z', data_fim: '2026-05-27T20:00:00.000Z', quantidade_produzida: 6800, quantidade_refugo: 190, tempo_parado: 12, tipo: 'producao' },
  { id: 'apt18', maquina_id: 'm3', operador_id: 'op3', produto_id: 'PROD-103', data_inicio: '2026-05-27T18:00:00.000Z', data_fim: '2026-05-27T23:30:00.000Z', quantidade_produzida: 6500, quantidade_refugo: 110, tempo_parado: 20, tipo: 'producao' },

  // 2026-05-28
  { id: 'apt19', maquina_id: 'm1', operador_id: 'op1', produto_id: 'PROD-102', data_inicio: '2026-05-28T08:00:00.000Z', data_fim: '2026-05-28T13:00:00.000Z', quantidade_produzida: 5000, quantidade_refugo: 140, tempo_parado: 15, tipo: 'producao' },
  { id: 'apt20', maquina_id: 'm2', operador_id: 'op2', produto_id: 'PROD-101', data_inicio: '2026-05-28T13:30:00.000Z', data_fim: '2026-05-28T18:30:00.000Z', quantidade_produzida: 4800, quantidade_refugo: 100, tempo_parado: 5, tipo: 'producao' },
  { id: 'apt21', maquina_id: 'm3', operador_id: 'op3', produto_id: 'PROD-103', data_inicio: '2026-05-28T18:45:00.000Z', data_fim: '2026-05-28T23:00:00.000Z', quantidade_produzida: 4500, quantidade_refugo: 80, tempo_parado: 10, tipo: 'producao' }
];

export const INITIAL_MOVIMENTOS: InsumoMovimento[] = [];
