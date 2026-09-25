export type UserRole = 'admin' | 'supervisor' | 'operador' | 'vendedor';

export interface UserPermissions {
  dashboard: 'nenhum' | 'ler' | 'escrever';
  pedidos: 'nenhum' | 'ler' | 'escrever';
  custos: 'nenhum' | 'ler' | 'escrever';
  orcamentos?: 'nenhum' | 'vendedor' | 'ler' | 'escrever';
  kanban: 'nenhum' | 'ler' | 'escrever';
  apontamento: 'nenhum' | 'ler' | 'escrever';
  estoque: 'nenhum' | 'ler' | 'escrever';
  cadastros: 'nenhum' | 'ler' | 'escrever';
}

export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  turno?: string;
  aprovado?: boolean;
  permissoes?: UserPermissions;
}

export interface Cliente {
  id: string;
  nome: string;
  contato: string;
  email: string;
  telefone: string;
  codigo?: string;
}

export interface Pedido {
  id: string; // Ex: PED-1001
  cliente_id: string;
  data_entrega: string; // YYYY-MM-DD
  status: 'pendente' | 'producao' | 'concluido' | 'cancelado';
  prioridade: 'alta' | 'media' | 'baixa';
  data_criacao: string;
  prioridade_sequencia?: number; // PRIORIDADE EM SEQUÊNCIA (Ex: 1, 2, 3...)
}

export interface ProdutoInsumoFicha {
  insumo_id: string;
  nome: string;
  rendimento: number;
  fator_consumo: number;
  largura_original?: number;
  altura_original?: number;
  largura_refilada?: number;
  altura_refilada?: number;
  formato_refilamento?: string;
}

export interface GradeItem {
  codigo: string;
  descricao: string;
  contatos: number;
}

export interface Produto {
  id: string;
  pedido_id: string;
  descricao: string;
  quantidade: number;
  dimensoes: string; // Ex: "30x20x10 cm"
  material: string; // Ex: "Papel Cartão Duplex 250g"
  fator_consumo: number; // folhas de papel cartão consumido por unidade produzida. Ex: 0.12 folhas/unidade
  roteiro: string[]; // Sequência de IDs de máquina para produção (Ex: ['m1', 'm2', 'm3'])
  maquina_atual_idx: number; // Índice no roteiro (-1 se pendente, length se concluído)
  cores_quantidade?: number; // Qtd de cores de impressão
  cores_frente?: number; // Qtd Cores Impressão FRENTE
  cores_verso?: number; // Qtd cores Impressão verso
  pantones?: any; // Pantones utilizados
  tipo_produto?: 'embalagem' | 'manual' | 'bolacha';
  contatos_faca?: number;
  medida_faca?: string;
  pontos_cola?: number; // Pontos de cola: 1, 2, 3, 4, 5, 6
  insumos_ficha?: ProdutoInsumoFicha[];
  faca_pdf_url?: string;
  faca_pdf_nome?: string;
  arte_pdf_url?: string;
  arte_pdf_nome?: string;
  grade_itens?: GradeItem[];
  informacoes_importantes?: string;
  observacoes?: string;
}

export interface ProdutoModelo {
  id: string;
  descricao: string;
  dimensoes: string;
  material: string;
  fator_consumo: number;
  roteiro: string[];
  codigo?: string;
  cores_quantidade?: number; // Qtd de cores de impressão
  cores_frente?: number; // Qtd Cores Impressão FRENTE
  cores_verso?: number; // Qtd cores Impressão verso
  pantones?: any; // Pantones utilizados
  tipo_produto?: 'embalagem' | 'manual' | 'bolacha';
  contatos_faca?: number;
  medida_faca?: string;
  pontos_cola?: number; // Pontos de cola: 1, 2, 3, 4, 5, 6
  insumos_ficha?: ProdutoInsumoFicha[];
  faca_pdf_url?: string;
  faca_pdf_nome?: string;
  arte_pdf_url?: string;
  arte_pdf_nome?: string;
  grade_itens?: GradeItem[];
  informacoes_importantes?: string;
  observacoes?: string;
}

export interface Maquina {
  id: string;
  nome: string;
  tipo: 'Impressão' | 'Corte' | 'Acabamento';
  capacidade_hora: number; // nominal speed (unid/hora)
  status_atual: 'operando' | 'parada' | 'manutencao' | 'ociosa';
  codigo?: string;
  custo_setup?: number; // Custo de setup/preparação em R$
  custo_hora?: number;  // Custo de operação por hora em R$
  tempo_setup?: number; // Tempo de setup em minutos
  setup_cores?: number; // Tempo de setup cores adicionais em minutos
  valor_aquisicao?: number; // Valor de aquisição para depreciação em R$
  vida_util_anos?: number;  // Vida útil em anos
  depreciacao_mensal?: number; // Depreciação mensal calculada ou customizada
  operador_id?: string; // ID do operador vinculado
  capacidade_embalagem?: number;
  capacidade_manual?: number;
  capacidade_bolacha?: number;
  tipo_velocidade?: 'unidade' | 'folha';
  participa_rateio?: boolean;
  horas_mensais_custo_fixo?: number;
}

export interface Operador {
  id: string;
  nome: string;
  turno: 'Manhã' | 'Tarde' | 'Noite';
  custo_hora?: number;   // Custo por hora produtiva em R$
  custo_mensal?: number; // Custo total folha/salários mensal em R$
  cargo?: string;        // Cargo/Função (Ex: Ajudante, Impressor A, Operador de Bobst)
  horas_mensais?: number; // Custo total horas mensais trabalhadas em h
}

export interface Insumo {
  id: string;
  nome: string;
  tipo: 'papel_cartao' | 'tinta' | 'cola' | 'verniz' | 'outro';
  unidade: 'folhas' | 'litros' | 'unidades';
  estoque_atual: number;
  estoque_minimo: number;
  fornecedor: string;
  codigo?: string;
}

export interface Appnto {
  id: string;
  maquina_id: string;
  operador_id: string;
  produto_id: string;
  data_inicio: string; // ISO string ou timestamp
  data_fim: string; // ISO string ou timestamp
  quantidade_produzida: number;
  quantidade_refugo: number; // scrap
  tempo_parado: number; // em minutos
  motivo_parada?: string; // Ex: "Troca de clichê", "Ajuste de faca", "Manutenção preventiva"
  tipo?: 'setup' | 'producao' | 'parada_manutencao' | 'parada_repouso' | 'outros';
  justificativa?: string;
  quantidade_folhas_utilizadas?: number;
  insumo_folhas_id?: string;
}

export interface KanbanItem {
  id: string;
  produto_id: string;
  maquina_id: string; // ID da máquina ou "concluido"
  ordem: number; // Posição na fila
  status: 'aguardando' | 'em_processo' | 'concluido';
  data_entrada: string;
  data_saida?: string;
  check_chapa?: boolean;
  check_faca?: boolean;
  check_papel?: boolean;
  prioridade_sequencia?: number; // PRIORIDADE EM SEQUÊNCIA (Ex: 1, 2, 3...)
}

export interface InsumoMovimento {
  id: string;
  insumo_id: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  data: string;
  motivo: string; // "Compra", "Consumo automático", "Ajuste manual", etc.
  produto_id?: string; // Se consumido na produção de um produto
}

export interface CustoGeral {
  id: string;
  descricao: string;
  valor: number;
  recorrencia: 'Mensal' | 'Anual' | 'Único';
  categoria: 'Aluguel' | 'Energia S/A' | 'Água/Saneamento' | 'Pro-labore/Adm' | 'Seguros' | 'Manutenção Geral' | 'Internet/Nuvem' | 'Outros';
  data_vencimento?: string; // YYYY-MM-DD
}

export interface TaxasLucroPresumido {
  pis: number;      // % Ex: 0.65
  cofins: number;   // % Ex: 3.00
  iss: number;      // % Ex: 5.00
  irpj: number;     // % Ex: 4.80 (32% de presunção * 15%)
  csll: number;     // % Ex: 2.88 (32% de presunção * 9%)
}

export interface OrcamentoPrecoLote {
  quantidade: number;
  precoVendaUnitario: number;
  custoTotal: number;
}

export interface OrcamentoSalvo {
  id: string;
  codigo?: string;
  descricao: string;
  dimensoes?: string;
  material?: string;
  cores_quantidade?: number;
  tipo_produto?: 'embalagem' | 'manual' | 'bolacha';
  contatos_faca?: number;
  medida_papel_facas?: string;
  data_criacao: string;
  markup: number;
  fotos?: string[]; // list of photo URLs or base64 data URLs
  observacoes?: string;
  resultados: OrcamentoPrecoLote[];
  roteiro?: string[];
  insumos_ficha?: ProdutoInsumoFicha[];
  adicional_acabamento_nome?: string;
  adicional_acabamento_valor?: number;
  folhas_acerto?: number;
  opcoes?: {
    id: string;
    nome: string;
    tipo_produto?: 'embalagem' | 'manual' | 'bolacha';
    cores_quantidade?: number;
    contatos_faca?: number;
    roteiro?: string[];
    resultados: OrcamentoPrecoLote[];
    adicional_acabamento_nome?: string;
    adicional_acabamento_valor?: number;
    folhas_acerto?: number;
  }[];
}

