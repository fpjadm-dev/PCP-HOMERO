import React, { useState } from 'react';
import { usePCP } from '../context/PCPContext';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Activity, 
  Settings, 
  Timer, 
  Sparkles,
  Gauge,
  PackageCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export const DashboardView: React.FC = () => {
  const { 
    pedidos, 
    produtos, 
    maquinas, 
    insumos, 
    apontamentos, 
    getOEEParaMaquina,
    resetarParaDadosPadrao,
    limparBancoDeDados,
    currentUser,
    loadingSnapshot
  } = usePCP();

  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  // 1. Cálculos de Pedidos
  const totalPedidos = pedidos.length;
  const pedidosProducao = pedidos.filter(p => p.status === 'producao').length;
  const pedidosConcluidos = pedidos.filter(p => p.status === 'concluido').length;
  
  // Calcular pedidos atrasados em relação a '2026-05-28' (data fictícia do sistema)
  const HOJE = '2026-05-28';
  const pedidosAtrasados = pedidos.filter(p => p.status === 'producao' && p.data_entrega < HOJE).length;

  // 2. Produção do Dia (Sum of produced on 2026-05-26 or 2026-05-27 in our mock)
  const producaoDoDia = apontamentos.reduce((acc, curr) => acc + curr.quantidade_produzida, 0);

  // 3. Insumos Críticos
  const insumosCriticos = insumos.filter(i => i.estoque_atual < i.estoque_minimo);

  // 4. Calcular OEE Médio de todas as máquinas
  const oeeMaquinas = maquinas.map(m => ({
    id: m.id,
    nome: m.nome,
    metricas: getOEEParaMaquina(m.id)
  }));

  const oeeMedioGeral = Math.round(
    oeeMaquinas.reduce((acc, curr) => acc + curr.metricas.oee, 0) / oeeMaquinas.length
  );

  // 5. Agrupamento para Gráfico de Barras SVG (unidades produzidas por máquina)
  const chartData = oeeMaquinas.map(item => ({
    id: item.id,
    name: item.nome.split(' ')[0] + ' ' + (item.nome.split(' ')[1] || ''), // nome abreviado (Ex: Impressora Offset)
    full_name: item.nome,
    produzido: item.metricas.produzido,
    refugo: item.metricas.refugo,
    oee: item.metricas.oee
  }));

  const maxProducaoValue = Math.max(...chartData.map(d => d.produzido + d.refugo), 5000);

  // Helper de OEE Badges
  const getOEEClass = (oee: number) => {
    if (oee >= 85) return 'text-emerald-600 border-emerald-200 bg-emerald-50';
    if (oee >= 65) return 'text-amber-600 border-amber-200 bg-amber-50';
    return 'text-rose-600 border-rose-200 bg-rose-50';
  };

  // 6. Dados para Evolução de Produtividade Diária (Recharts) nos últimos 7 dias
  // Encontra a data de referência (ou 2026-05-28, ou a data mais recente nos apontamentos)
  let refDateStr = '2026-05-28';
  if (apontamentos.length > 0) {
    const maxAptDate = apontamentos.reduce((max, apt) => {
      const dateStr = apt.data_inicio.split('T')[0];
      return dateStr > max ? dateStr : max;
    }, '2026-05-28');
    refDateStr = maxAptDate;
  }

  // Gera a lista dos últimos 7 dias terminando em refDateStr
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(refDateStr + 'T12:00:00');
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  // Agrupa a produção diária de cada máquina
  const chartLineData = last7Days.map(date => {
    const dayData: any = {
      date,
      formattedDate: date.split('-').reverse().slice(0, 2).join('/'), // "2026-05-22" -> "22/05"
    };

    maquinas.forEach(maq => {
      const totalProduced = apontamentos
        .filter(apt => {
          const aptDate = apt.data_inicio.split('T')[0];
          return apt.maquina_id === maq.id && aptDate === date && apt.tipo === 'producao';
        })
        .reduce((sum, apt) => sum + apt.quantidade_produzida, 0);

      dayData[maq.id] = totalProduced;
    });

    return dayData;
  });

  const getMachineColor = (index: number) => {
    const colors = ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'];
    return colors[index % colors.length];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-950/95 p-3 text-3xs text-white shadow-lg backdrop-blur-xs font-sans">
          <p className="font-bold border-b border-slate-800 pb-1.5 mb-1.5 text-slate-300">
            Dia {label.split('-').reverse().join('/')}
          </p>
          <div className="space-y-1.5">
            {payload.map((pld: any) => {
              const maq = maquinas.find(m => m.id === pld.dataKey || m.nome === pld.name);
              return (
                <div key={pld.dataKey} className="flex items-center justify-between gap-4 font-semibold">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pld.color }} />
                    {maq ? maq.nome.split(' ')[0] + ' ' + (maq.nome.split(' ')[1] || '') : pld.name}
                  </span>
                  <span className="font-mono text-white">
                    {pld.value.toLocaleString('pt-BR')} un
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      
      {/* TÍTULO E SUBTÍTULO */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-sans text-xl font-bold tracking-tight text-gray-950">Visão Geral da Fábrica</h2>
          <p className="font-sans text-xs text-gray-500">
            Painel de OEE, produção em tempo real e status de suprimentos estruturado sobre o dia <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-semibold">28/05/2026</span>
          </p>
        </div>
      </div>

      {/* CARDS COM METRICAS PRINCIPAIS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* CARD OEE MÉDIO GERAL */}
        <div className="sleek-card sleek-card-hover p-5 font-sans">
          <div className="flex items-center justify-between">
            <span className="font-mono text-3xs font-bold uppercase tracking-widest text-gray-400">OEE Médio da Planta</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-xs">
              <Gauge size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-sans text-3xl font-bold tracking-tight text-gray-900">{oeeMedioGeral}%</span>
            <span className={`border text-4xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${getOEEClass(oeeMedioGeral)}`}>
              {oeeMedioGeral >= 85 ? 'Classe Mundial' : oeeMedioGeral >= 65 ? 'Estável' : 'Abaixo da Média'}
            </span>
          </div>
          <p className="mt-1 text-4xs text-gray-400 font-sans tracking-wide">Média ponderada do OEE de todas as mídias da planta.</p>
        </div>

        {/* PRODUÇÃO TOTAL REGISTRADA (DO MOCK) */}
        <div className="sleek-card sleek-card-hover p-5 font-sans">
          <div className="flex items-center justify-between">
            <span className="font-mono text-3xs font-bold uppercase tracking-widest text-gray-400">Produção Faturada</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 shadow-xs">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-sans text-3xl font-bold tracking-tight text-gray-900">
              {producaoDoDia.toLocaleString('pt-BR')}
            </span>
            <span className="font-sans text-3xs font-medium text-gray-500">Unidades</span>
          </div>
          <p className="mt-1 text-4xs text-gray-400 font-sans tracking-wide">Soma total das embalagens apontadas nas máquinas.</p>
        </div>

        {/* PEDIDOS ATRASADOS */}
        <div className="sleek-card sleek-card-hover p-5 font-sans">
          <div className="flex items-center justify-between">
            <span className="font-mono text-3xs font-bold uppercase tracking-widest text-gray-400">Gargalo / Atrasados</span>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg shadow-xs ${
              pedidosAtrasados > 0 ? 'bg-rose-100 text-rose-800' : 'bg-gray-100 text-gray-400'
            }`}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`font-sans text-3xl font-bold tracking-tight ${pedidosAtrasados > 0 ? 'text-rose-600' : 'text-gray-900'}`}>
              {pedidosAtrasados}
            </span>
            <span className="font-sans text-3xs font-medium text-gray-500">Lotes</span>
          </div>
          <p className="mt-1 text-4xs text-gray-400 font-sans tracking-wide">Pedidos ativos cuja data prevista é inferior à atual.</p>
        </div>

        {/* ESTOQUE CRÍTICO */}
        <div className="sleek-card sleek-card-hover p-5 font-sans">
          <div className="flex items-center justify-between">
            <span className="font-mono text-3xs font-bold uppercase tracking-widest text-gray-400">Insumos Críticos</span>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg shadow-xs ${
              insumosCriticos.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-400'
            }`}>
              <PackageCheck size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className={`font-sans text-3xl font-bold tracking-tight ${insumosCriticos.length > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
              {insumosCriticos.length}
            </span>
            <span className="font-sans text-2xs uppercase font-bold text-gray-400 tracking-wider">Itens</span>
          </div>
          <p className="mt-1 text-4xs text-gray-400 font-sans tracking-wide">
            {insumosCriticos.length > 0 
              ? `${insumosCriticos.map(i => i.nome.split(' ')[0]).join(', ')} abaixo do min.`
              : 'Todos os suprimentos acima do mínimo seguro'
            }
          </p>
        </div>

      </div>

      {/* GRAFICOS INDEPENDENTES / SEÇÕES */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* COLUNA 1 & 2: MONITOR DE MÁQUINAS COM OEE LIVE */}
        <div className="sleek-card p-5 lg:col-span-2 space-y-5 font-sans">
          <div>
            <span className="font-mono text-3xs font-bold uppercase tracking-widest text-gray-400 block">Linha de Produção Realtime</span>
            <h3 className="font-sans text-sm font-semibold text-gray-905">Overall Equipment Effectiveness (OEE) por Equipamento</h3>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {oeeMaquinas.map(item => {
              const maquina_doc = maquinas.find(m => m.id === item.id);
              return (
                <div key={item.id} className="relative rounded-xl border border-gray-100 bg-gray-25/50 p-4 shadow-3xs hover:border-slate-350 transition-all">
                  <div className="flex items-start justify-between border-b border-gray-100 pb-2.5">
                    <div>
                      <h4 className="font-sans text-2xs font-bold text-gray-900 line-clamp-1" title={item.nome}>
                        {item.nome}
                      </h4>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className={`h-2.5 w-2.5 rounded-full ${
                          maquina_doc?.status_atual === 'operando' ? 'bg-emerald-500 animate-pulse' :
                          maquina_doc?.status_atual === 'ociosa' ? 'bg-gray-300' :
                          maquina_doc?.status_atual === 'parada' ? 'bg-amber-450 animate-pulse' : 'bg-rose-500'
                        }`} />
                        <span className="font-mono text-3xs uppercase text-gray-500 tracking-wide font-medium">
                          {maquina_doc?.status_atual || 'ociosa'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* RADIAL OEE VALUE E METRICAS */}
                  <div className="mt-4 text-center">
                    <span className="font-mono text-3xs font-bold uppercase tracking-wider text-gray-400 block">Eficiência OEE</span>
                    <span className="font-sans text-3xl font-extrabold text-slate-900">{item.metricas.oee}%</span>
                  </div>

                  {/* METRICAS DO OEE */}
                  <div className="mt-4 space-y-2 text-2xs">
                    {/* DISPONIBILIDADE */}
                    <div>
                      <div className="flex justify-between font-mono text-3xs text-gray-500 mb-1">
                        <span>Disponibilidade</span>
                        <span className="font-bold text-gray-800">{item.metricas.disp}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.metricas.disp}%` }} />
                      </div>
                    </div>

                    {/* PERFORMANCE */}
                    <div>
                      <div className="flex justify-between font-mono text-3xs text-gray-500 mb-1">
                        <span>Performance</span>
                        <span className="font-bold text-gray-800">{item.metricas.perf}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${item.metricas.perf}%` }} />
                      </div>
                    </div>

                    {/* QUALIDADE */}
                    <div>
                      <div className="flex justify-between font-mono text-3xs text-gray-500 mb-1">
                        <span>Qualidade</span>
                        <span className="font-bold text-gray-800">{item.metricas.qual}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.metricas.qual}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 border-t border-dashed border-gray-100 pt-3 flex justify-between font-mono text-3xs text-gray-400">
                    <span>Produzido: <strong className="text-gray-700">{item.metricas.produzido}</strong></span>
                    <span>Refugo: <strong className="text-rose-600">{item.metricas.refugo}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUNA 3: CONTROLE DE ALERTA DE INSUMOS E PAPÉIS */}
        <div className="sleek-card p-5 space-y-4 font-sans">
          <div>
            <span className="font-mono text-3xs font-bold uppercase tracking-widest text-gray-400 block">Controle Físico de Papéis</span>
            <h3 className="font-sans text-sm font-semibold text-gray-905">Principais Estoques e Alertas</h3>
          </div>

          <div className="space-y-3.5">
            {insumos.map(ins => {
              const porcentagem = Math.min(100, (ins.estoque_atual / (ins.estoque_minimo * 3.5)) * 100);
              const isCritico = ins.estoque_atual < ins.estoque_minimo;
              return (
                <div key={ins.id} className="text-2xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-sans font-bold text-gray-800 break-words max-w-[130px]">{ins.nome}</span>
                    <span className={`font-mono font-bold text-3xs px-2 py-0.5 rounded ${
                      isCritico ? 'bg-rose-100 text-rose-800 border-rose-200 border' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {ins.estoque_atual.toLocaleString('pt-BR')} / {ins.estoque_minimo} {ins.unidade}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-105 overflow-hidden">
                    <div className={`h-full rounded-full ${
                      isCritico ? 'bg-rose-500' : 'bg-slate-800'
                    }`} style={{ width: `${porcentagem}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {insumosCriticos.length > 0 && (
            <div className="rounded-lg bg-rose-50 p-3 border border-rose-100 text-3xs text-rose-800 flex gap-2">
              <AlertTriangle size={14} className="shrink-0 text-rose-600" />
              <div>
                <strong className="font-sans font-semibold">Suprimentos em Falta ou abaixo do mínimo:</strong>
                <p className="mt-0.5">Sugere-se faturar nova Ordem de Compra para: {insumosCriticos.map(i => i.nome).join(', ')}.</p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* COMPONENTE DO GRÁFICO DE PRODUÇÃO REALIZADO POR MÁQUINA */}
      <div className="sleek-card p-5 font-sans">
        <div className="mb-4">
          <span className="font-mono text-3xs font-bold uppercase tracking-widest text-gray-400 block">Capacidade do Parque Fabril</span>
          <h3 className="font-sans text-sm font-semibold text-gray-905">Unidades Registradas VS Amostras de Descarte (Refugos)</h3>
        </div>

        {/* GRÁFICO INTERATIVO CUSTOMIZADO EM SVG */}
        <div className="relative w-full h-64 border border-gray-100 rounded-xl bg-gray-25/40 p-3 flex flex-col justify-end">
          {/* Grid lines */}
          <div className="absolute inset-x-0 bottom-10 top-6 flex flex-col justify-between border-b border-gray-150 z-0">
            {[1, 2, 3, 4].map(line => (
              <div key={line} className="w-full border-t border-dashed border-gray-100" />
            ))}
          </div>

          {/* Barras do Gráfico */}
          <div className="relative z-10 flex h-48 w-full items-end justify-around px-4 md:px-12">
            {chartData.map(data => {
              const totalMesa = data.produzido + data.refugo;
              const barHeightPct = totalMesa > 0 ? (totalMesa / maxProducaoValue) * 85 : 0;
              const refugoHeightPct = totalMesa > 0 ? (data.refugo / totalMesa) * 100 : 0;
              
              const isHovered = hoveredBar === data.id;

              return (
                <div 
                  key={data.id} 
                  className="flex flex-col items-center w-24 group relative"
                  onMouseEnter={() => setHoveredBar(data.id)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {/* Tooltip */}
                  {isHovered && (
                    <div className="absolute -top-16 z-30 w-44 rounded-lg bg-slate-900 p-2 text-center text-3xs text-white shadow-lg">
                      <p className="font-sans font-semibold">{data.full_name}</p>
                      <div className="mt-1 flex justify-between px-1">
                        <span>Bom: {data.produzido}</span>
                        <span className="text-rose-400">Descarte: {data.refugo}</span>
                      </div>
                    </div>
                  )}

                  {/* Barra Principal (Unidade e Refugo) */}
                  <div 
                    className="w-12 rounded-t-md overflow-hidden bg-slate-800 hover:bg-slate-755 transition-all shadow-xs cursor-pointer flex flex-col justify-end"
                    style={{ height: `${Math.max(10, barHeightPct)}%` }}
                  >
                    {/* Top refugo slice */}
                    <div 
                      className="bg-rose-500 w-full" 
                      style={{ height: `${refugoHeightPct}%` }}
                      title={`Refugos: ${data.refugo} un`}
                    />
                  </div>

                  {/* Legenda do Eixo X */}
                  <span className="mt-2 text-center font-sans text-3xs font-bold text-gray-700 leading-tight">
                    {data.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legenda de cores */}
          <div className="mt-4 flex items-center justify-center gap-6 font-mono text-3xs border-t border-gray-105 pt-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-slate-800" />
              <span>Peças Boas (Produção Útil)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-rose-500" />
              <span>Refugo / Aparas de Papel</span>
            </div>
          </div>
        </div>
      </div>

      {/* COMPONENTE DO GRÁFICO DE EVOLUÇÃO DA PRODUTIVIDADE DIÁRIA (RECHARTS) */}
      <div className="sleek-card p-5 font-sans" id="productivity-evolution-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <span className="font-mono text-3xs font-bold uppercase tracking-widest text-gray-400 block">Performance Histórica</span>
            <h3 className="font-sans text-sm font-semibold text-gray-905">Evolução da Produtividade Diária por Máquina</h3>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-3xs bg-slate-50 border border-slate-100 rounded px-2 py-1 text-slate-500">
            <Activity size={12} className="text-indigo-600" />
            <span>Últimos 7 dias</span>
          </div>
        </div>

        <div className="w-full h-80 bg-gray-25/40 border border-gray-100 rounded-xl p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartLineData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="formattedDate" 
                stroke="#94a3b8" 
                fontSize={10}
                fontWeight={500}
                fontFamily="JetBrains Mono, monospace"
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={10}
                fontWeight={500}
                fontFamily="JetBrains Mono, monospace"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                iconSize={8}
                formatter={(value, entry: any) => {
                  const maq = maquinas.find(m => m.id === entry.dataKey);
                  return (
                    <span className="font-sans text-3xs font-bold text-gray-600 hover:text-gray-900 transition-colors uppercase tracking-wide">
                      {maq ? maq.nome.split(' ')[0] + ' ' + (maq.nome.split(' ')[1] || '') : value}
                    </span>
                  );
                }}
              />
              {maquinas.map((maq, idx) => (
                <Line
                  key={`${maq.id || 'maq'}-${idx}`}
                  type="monotone"
                  dataKey={maq.id}
                  name={maq.nome}
                  stroke={getMachineColor(idx)}
                  strokeWidth={2.5}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  dot={{ r: 4, strokeWidth: 1 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PAINEL DE CONTROLE DE SINCRONIZAÇÃO EM NUVEM (ADMIN) */}
      {currentUser?.role === 'admin' && (
        <div className="sleek-card p-6 bg-white border border-slate-200 rounded-2xl shadow-xs font-sans">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-mono text-3xs font-bold uppercase tracking-widest text-[#4285f4]">Firebase NoSQL Ativo</span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mt-1 tracking-tight">Gerenciamento da Nuvem Firestore</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                O aplicativo está operando com banco de dados real em tempo real. Você pode alternar os canais de simulação para povoar as tabelas industriais ou limpar os registros para entrada manual pura de dados industriais.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5 shrink-0">
              <button
                type="button"
                onClick={resetarParaDadosPadrao}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white font-semibold text-xs px-4 py-2.5 hover:bg-slate-800 transition-all cursor-pointer shadow-sm active:scale-95"
                id="sync-seed-db"
              >
                <Sparkles size={14} />
                Popular Dados de Demonstração
              </button>

              <button
                type="button"
                onClick={limparBancoDeDados}
                className="flex items-center justify-center gap-2 rounded-xl border border-rose-200 text-rose-600 bg-rose-50 font-semibold text-xs px-4 py-2.5 hover:bg-rose-100 transition-all cursor-pointer shadow-2xs active:scale-95"
                id="sync-clear-db"
              >
                <AlertTriangle size={14} />
                Esvaziar Fábrica (Zerar Firestore)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
