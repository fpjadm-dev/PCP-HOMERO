import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Cliente, Pedido, Produto, ProdutoModelo, Maquina, Operador, Insumo, Appnto, KanbanItem, InsumoMovimento, User, UserRole, CustoGeral, TaxasLucroPresumido, UserPermissions, OrcamentoSalvo 
} from '../types';
import { 
  INITIAL_CLIENTES, INITIAL_MAQUINAS, INITIAL_OPERADORES, INITIAL_INSUMOS, INITIAL_PEDIDOS, INITIAL_PRODUTOS, INITIAL_KANBAN, INITIAL_APONTAMENTOS, INITIAL_MOVIMENTOS, INITIAL_CUSTOS_GERAIS, DEFAULT_TAXAS_PRESUMIDO 
} from '../mockData';
import { 
  collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, writeBatch, getDoc 
} from 'firebase/firestore';
import { 
  onAuthStateChanged, signInAnonymously, signInWithPopup, signOut 
} from 'firebase/auth';
import { 
  db, auth, googleProvider, handleFirestoreError, OperationType 
} from '../firebase';

function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = (obj as any)[key];
        if (val !== undefined) {
          cleaned[key] = cleanUndefined(val);
        }
      }
    }
    return cleaned as T;
  }
  return obj;
}

function safeLocalStorageSetItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // If quota is exceeded, clear heavy caches to reclaim quota space immediately
    try {
      localStorage.removeItem('pcp_orcamentosSalvos');
      localStorage.removeItem('pcp_produtosModelos');
      localStorage.removeItem('pcp_produtos');
      localStorage.removeItem('pcp_apontamentos');
      localStorage.removeItem('pcp_movimentos');
      // Retry once after eviction
      localStorage.setItem(key, value);
    } catch {
      // Silently fall back; state is always preserved in memory and Firebase Firestore
    }
  }
}

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  timestamp: string;
}

interface PCPContextType {
  // Autenticação
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  usersList: User[];
  dbUsers: User[];
  salvarUsuario: (userObj: User) => Promise<void>;
  excluirUsuario: (email: string) => Promise<void>;
  login: (email: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  loginWithGoogle: () => Promise<void>;

  // Banco de Dados States
  clientes: Cliente[];
  pedidos: Pedido[];
  produtos: Produto[];
  maquinas: Maquina[];
  operadores: Operador[];
  insumos: Insumo[];
  apontamentos: Appnto[];
  kanban: KanbanItem[];
  movimentos: InsumoMovimento[];
  notifications: Notification[];
  custosGerais: CustoGeral[];
  taxasPresumido: TaxasLucroPresumido;
  produtosModelos: ProdutoModelo[];
  orcamentosSalvos: OrcamentoSalvo[];

  // CRUD Clientes
  adicionarCliente: (cliente: Omit<Cliente, 'id'>) => void;
  excluirCliente: (id: string) => void;
  editarCliente: (cliente: Cliente) => void;

  // CRUD Operadores
  adicionarOperador: (operador: Omit<Operador, 'id'>) => void;
  excluirOperador: (id: string) => void;
  editarOperador: (operador: Operador) => void;

  // CRUD Custos Gerais (Despesas)
  adicionarCustoGeral: (custo: Omit<CustoGeral, 'id'>) => void;
  excluirCustoGeral: (id: string) => void;

  // Atualizar Impostos
  atualizarTaxasPresumido: (taxas: TaxasLucroPresumido) => void;

  // CRUD Máquinas
  adicionarMaquina: (maquina: Omit<Maquina, 'id'>) => void;
  excluirMaquina: (maquinaId: string) => void;
  vincularOperadorMaquina: (maquinaId: string, operadorId: string | undefined) => void;
  editarMaquina: (maquina: Maquina) => void;

  // CRUD Pedidos + Produtos
  adicionarPedido: (pedido: Omit<Pedido, 'id' | 'data_criacao' | 'status'>, prods: Omit<Produto, 'id' | 'pedido_id' | 'maquina_atual_idx'>[]) => void;
  excluirPedido: (pedidoId: string) => void;
  liberarPedidoParaProducao: (pedidoId: string) => boolean;
  cancelarPedido: (pedidoId: string) => void;
  editarPedidoPrioridadeSequencia: (pedidoId: string, sequencia: number | undefined) => Promise<void>;

  // Kanban Controls
  moverCardKanban: (produtoId: string, origemMaquinaId: string, destinoMaquinaId: string, novoStatus: 'aguardando' | 'em_processo' | 'concluido') => { success: boolean; message: string };
  alterarOrdemLote: (produtoId: string, maquinaId: string, novaOrdem: number) => Promise<void>;
  atualizarCheckInsumosKanban: (produtoId: string, maquinaId: string, checks: { check_chapa?: boolean; check_faca?: boolean; check_papel?: boolean }) => Promise<void>;

  // Apontamento Controls
  registrarApontamento: (apontamento: Omit<Appnto, 'id'>) => { success: boolean; message: string };
  excluirApontamento: (id: string) => Promise<void>;
  verificarSobreposicaoMaquina: (maquinaId: string, inicio: Date, fim: Date) => boolean;

  // Estoque Controls
  registrarEntradaEstoque: (insumoId: string, qtd: number, fornecedor: string, motivo: string) => void;
  registrarSaidaEstoque: (insumoId: string, qtd: number, motivo: string) => boolean;
  adicionarInsumo: (insumo: Omit<Insumo, 'id'>) => void;
  excluirInsumo: (id: string) => void;
  editarInsumo: (insumo: Insumo) => void;
  
  // CRUD Modelos de Produtos (Catálogo de Fábrica Reutilizável)
  adicionarProdutoModelo: (modelo: Omit<ProdutoModelo, 'id'>) => void;
  excluirProdutoModelo: (modeloId: string) => void;
  editarProdutoModelo: (modelo: ProdutoModelo) => void;

  // CRUD Orçamentos Salvos
  adicionarOrcamentoSalvo: (orcamento: Omit<OrcamentoSalvo, 'id' | 'data_criacao'>) => Promise<void>;
  excluirOrcamentoSalvo: (id: string) => Promise<void>;
  editarOrcamentoSalvo: (orcamento: OrcamentoSalvo) => Promise<void>;

  // Helpers & Analytics
  getOEEParaMaquina: (maquinaId: string) => { oee: number; disp: number; perf: number; qual: number; tempoAtivo: number; tempoParado: number; produzido: number; refugo: number };
  notificationsClear: () => void;
  addNotification: (type: 'success' | 'warning' | 'error' | 'info', message: string) => void;

  // Backup and Seed
  resetarParaDadosPadrao: () => Promise<void>;
  limparBancoDeDados: () => Promise<void>;
  loadingSnapshot: boolean;
  isQuotaExceeded: boolean;

  // Kanban persistent stages sequence
  kanbanColIds: string[];
  salvarSequenciaKanban: (ids: string[]) => Promise<void>;
}

const PCPContext = createContext<PCPContextType | undefined>(undefined);

export const PCPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Autenticação States
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('pcp_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [loadingSnapshot, setLoadingSnapshot] = useState(true);

  const [dbUsers, setDbUsers] = useState<User[]>(() => {
    try {
      const cached = localStorage.getItem('pcp_usuarios');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const usersList: User[] = dbUsers;

  // Database states with LocalStorage caching as a fallback for offline/quota-exceeded environments
  const [clientes, setClientes] = useState<Cliente[]>(() => {
    try {
      const cached = localStorage.getItem('pcp_clientes');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [pedidos, setPedidos] = useState<Pedido[]>(() => {
    try {
      const cached = localStorage.getItem('pcp_pedidos');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [produtos, setProdutos] = useState<Produto[]>(() => {
    try {
      const cached = localStorage.getItem('pcp_produtos');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [produtosModelos, setProdutosModelos] = useState<ProdutoModelo[]>(() => {
    try {
      const cached = localStorage.getItem('pcp_produtosModelos');
      if (cached && cached.length > 500000) {
        try { localStorage.removeItem('pcp_produtosModelos'); } catch {}
        return [];
      }
      return cached ? JSON.parse(cached) : [];
    } catch { 
      try { localStorage.removeItem('pcp_produtosModelos'); } catch {}
      return []; 
    }
  });
  const [orcamentosSalvos, setOrcamentosSalvos] = useState<OrcamentoSalvo[]>(() => {
    try {
      const cached = localStorage.getItem('pcp_orcamentosSalvos');
      if (cached && cached.length > 300000) {
        try { localStorage.removeItem('pcp_orcamentosSalvos'); } catch {}
        return [];
      }
      return cached ? JSON.parse(cached) : [];
    } catch { 
      try { localStorage.removeItem('pcp_orcamentosSalvos'); } catch {}
      return []; 
    }
  });
  const [maquinas, setMaquinas] = useState<Maquina[]>(() => {
    try {
      const cached = localStorage.getItem('pcp_maquinas');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [operadores, setOperadores] = useState<Operador[]>(() => {
    try {
      const cached = localStorage.getItem('pcp_operadores');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [insumos, setInsumos] = useState<Insumo[]>(() => {
    try {
      const cached = localStorage.getItem('pcp_insumos');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [apontamentos, setApontamentos] = useState<Appnto[]>(() => {
    try {
      const cached = localStorage.getItem('pcp_apontamentos');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [kanban, setKanban] = useState<KanbanItem[]>(() => {
    try {
      const cached = localStorage.getItem('pcp_kanban');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [movimentos, setMovimentos] = useState<InsumoMovimento[]>(() => {
    try {
      const cached = localStorage.getItem('pcp_movimentos');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [custosGerais, setCustosGerais] = useState<CustoGeral[]>(() => {
    try {
      const cached = localStorage.getItem('pcp_custosGerais');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [taxasPresumido, setTaxasPresumido] = useState<TaxasLucroPresumido>(() => {
    try {
      const cached = localStorage.getItem('pcp_taxas');
      return cached ? JSON.parse(cached) : DEFAULT_TAXAS_PRESUMIDO;
    } catch { return DEFAULT_TAXAS_PRESUMIDO; }
  });
  const [kanbanColIds, setKanbanColIds] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('pcp_kanban_col_ids');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });

  // Keep local cache in sync safely
  useEffect(() => {
    safeLocalStorageSetItem('pcp_usuarios', JSON.stringify(dbUsers));
  }, [dbUsers]);

  useEffect(() => {
    safeLocalStorageSetItem('pcp_clientes', JSON.stringify(clientes));
  }, [clientes]);

  useEffect(() => {
    safeLocalStorageSetItem('pcp_pedidos', JSON.stringify(pedidos));
  }, [pedidos]);

  useEffect(() => {
    safeLocalStorageSetItem('pcp_produtos', JSON.stringify(produtos));
  }, [produtos]);

  useEffect(() => {
    try {
      // Exclude heavy base64 data URLs from localStorage
      const lightweightModelos = produtosModelos.map(m => {
        if (!m.faca_pdf_url?.startsWith('data:') && !m.arte_pdf_url?.startsWith('data:') && (!m.fotos || m.fotos.every(f => !f.startsWith('data:')))) return m;
        return {
          ...m,
          faca_pdf_url: m.faca_pdf_url?.startsWith('data:') ? undefined : m.faca_pdf_url,
          arte_pdf_url: m.arte_pdf_url?.startsWith('data:') ? undefined : m.arte_pdf_url,
          fotos: (m.fotos || []).filter(f => !f.startsWith('data:') && f.length < 500)
        };
      });
      safeLocalStorageSetItem('pcp_produtosModelos', JSON.stringify(lightweightModelos));
    } catch {
      try { localStorage.removeItem('pcp_produtosModelos'); } catch {}
    }
  }, [produtosModelos]);

  useEffect(() => {
    try {
      // Exclude heavy base64 photos from localStorage to stay well below the 5MB browser quota
      const lightweightOrcamentos = orcamentosSalvos.map(orc => {
        if (!orc.fotos || orc.fotos.length === 0) return orc;
        return {
          ...orc,
          fotos: orc.fotos.filter(f => !f.startsWith('data:') && f.length < 500)
        };
      });
      safeLocalStorageSetItem('pcp_orcamentosSalvos', JSON.stringify(lightweightOrcamentos));
    } catch {
      try { localStorage.removeItem('pcp_orcamentosSalvos'); } catch {}
    }
  }, [orcamentosSalvos]);

  useEffect(() => {
    safeLocalStorageSetItem('pcp_maquinas', JSON.stringify(maquinas));
  }, [maquinas]);

  useEffect(() => {
    safeLocalStorageSetItem('pcp_operadores', JSON.stringify(operadores));
  }, [operadores]);

  useEffect(() => {
    safeLocalStorageSetItem('pcp_insumos', JSON.stringify(insumos));
  }, [insumos]);

  useEffect(() => {
    safeLocalStorageSetItem('pcp_apontamentos', JSON.stringify(apontamentos));
  }, [apontamentos]);

  useEffect(() => {
    safeLocalStorageSetItem('pcp_kanban', JSON.stringify(kanban));
  }, [kanban]);

  useEffect(() => {
    safeLocalStorageSetItem('pcp_movimentos', JSON.stringify(movimentos));
  }, [movimentos]);

  useEffect(() => {
    safeLocalStorageSetItem('pcp_custosGerais', JSON.stringify(custosGerais));
  }, [custosGerais]);

  useEffect(() => {
    safeLocalStorageSetItem('pcp_taxas', JSON.stringify(taxasPresumido));
  }, [taxasPresumido]);

  const [firebaseUserId, setFirebaseUserId] = useState<string | null>(null);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuotaExceeded = () => {
      setIsQuotaExceeded(true);
    };
    window.addEventListener('firestore-quota-exceeded', handleQuotaExceeded);
    return () => {
      window.removeEventListener('firestore-quota-exceeded', handleQuotaExceeded);
    };
  }, []);

  const defaultPermsAdmin: UserPermissions = {
    dashboard: 'escrever',
    pedidos: 'escrever',
    custos: 'escrever',
    kanban: 'escrever',
    apontamento: 'escrever',
    estoque: 'escrever',
    cadastros: 'escrever'
  };

  const defaultPermsSupervisor: UserPermissions = {
    dashboard: 'escrever',
    pedidos: 'escrever',
    custos: 'ler',
    kanban: 'escrever',
    apontamento: 'escrever',
    estoque: 'escrever',
    cadastros: 'ler'
  };

  const defaultPermsOperador: UserPermissions = {
    dashboard: 'ler',
    pedidos: 'ler',
    custos: 'nenhum',
    kanban: 'escrever',
    apontamento: 'escrever',
    estoque: 'ler',
    cadastros: 'nenhum'
  };

  const defaultPermsVendedor: UserPermissions = {
    dashboard: 'nenhum',
    pedidos: 'nenhum',
    custos: 'nenhum',
    orcamentos: 'vendedor',
    kanban: 'nenhum',
    apontamento: 'nenhum',
    estoque: 'nenhum',
    cadastros: 'nenhum'
  };

  // 1. Escuta alterações no Firebase Authentication
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        if (fbUser.isAnonymous) {
          const stored = localStorage.getItem('pcp_current_user');
          if (stored) {
            try {
              const userObj = JSON.parse(stored) as User;
              if (userObj.email) {
                const emailLower = userObj.email.toLowerCase().trim();
                if (emailLower === 'fpjadm@gmail.com' || emailLower === 'admin@homero.com.br') {
                  setCurrentUser(userObj);
                  setFirebaseUserId(fbUser.uid);
                  return;
                }
                
                try {
                  const userSnap = await getDoc(doc(db, 'usuarios', emailLower));
                  if (userSnap.exists() && userSnap.data().aprovado === true) {
                    const dbUser = userSnap.data() as User;
                    userObj.role = dbUser.role || 'operador';
                    userObj.permissoes = dbUser.permissoes || defaultPermsOperador;
                    userObj.nome = dbUser.nome || userObj.nome;
                    setCurrentUser(userObj);
                    safeLocalStorageSetItem('pcp_current_user', JSON.stringify(userObj));
                    setFirebaseUserId(fbUser.uid);
                  } else {
                    await signOut(auth);
                    setCurrentUser(null);
                    localStorage.removeItem('pcp_current_user');
                    setFirebaseUserId(null);
                    addNotification('error', 'Sessão encerrada: Cadastro não liberado ou removido.');
                  }
                } catch (getDocErr) {
                  // If Firestore has quota issues or is offline, but we already have an approved cached user, let them continue!
                  if (userObj.aprovado) {
                    console.warn("Firestore error during anonymous auth check, using cached approved user:", getDocErr);
                    setCurrentUser(userObj);
                    setFirebaseUserId(fbUser.uid);
                  } else {
                    await signOut(auth);
                    setCurrentUser(null);
                    localStorage.removeItem('pcp_current_user');
                    setFirebaseUserId(null);
                  }
                }
              } else {
                await signOut(auth);
                setCurrentUser(null);
                localStorage.removeItem('pcp_current_user');
                setFirebaseUserId(null);
              }
            } catch (err) {
              await signOut(auth);
              setCurrentUser(null);
              localStorage.removeItem('pcp_current_user');
              setFirebaseUserId(null);
            }
          } else {
            await signOut(auth);
            setCurrentUser(null);
            localStorage.removeItem('pcp_current_user');
            setFirebaseUserId(null);
          }
        } else {
          const uEmail = fbUser.email || '';
          const emailLower = uEmail.toLowerCase().trim();
          
          try {
            if (emailLower === 'fpjadm@gmail.com' || emailLower === 'admin@homero.com.br') {
              const userObj: User = {
                id: fbUser.uid,
                nome: fbUser.displayName || (emailLower === 'fpjadm@gmail.com' ? 'Francisco P. Junior' : 'PPCP Admin'),
                email: uEmail,
                role: 'admin',
                aprovado: true,
                permissoes: defaultPermsAdmin
              };
              setCurrentUser(userObj);
              safeLocalStorageSetItem('pcp_current_user', JSON.stringify(userObj));
              setFirebaseUserId(fbUser.uid);
              try {
                await setDoc(doc(db, 'usuarios', emailLower), userObj, { merge: true });
              } catch (e) {
                console.warn("Could not save admin user to Firestore (quota or offline), using local fallback", e);
              }
            } else {
              try {
                const userSnap = await getDoc(doc(db, 'usuarios', emailLower));
                if (userSnap.exists() && userSnap.data().aprovado === true) {
                  const dbUser = userSnap.data() as User;
                  const userObj: User = {
                    id: fbUser.uid,
                    nome: dbUser.nome || fbUser.displayName || emailLower.split('@')[0],
                    email: uEmail,
                    role: dbUser.role || 'operador',
                    aprovado: true,
                    permissoes: dbUser.permissoes || defaultPermsOperador
                  };
                  setCurrentUser(userObj);
                  safeLocalStorageSetItem('pcp_current_user', JSON.stringify(userObj));
                  setFirebaseUserId(fbUser.uid);
                } else {
                  if (!userSnap.exists()) {
                    const pendingUser: User = {
                      id: fbUser.uid,
                      nome: fbUser.displayName || emailLower.split('@')[0],
                      email: emailLower,
                      role: 'operador',
                      aprovado: false,
                      permissoes: defaultPermsOperador
                    };
                    try {
                      await setDoc(doc(db, 'usuarios', emailLower), pendingUser);
                      addNotification('info', `Novo login pendente registrado: ${emailLower}`);
                    } catch (e) {
                      console.warn("Could not register pending user to Firestore", e);
                    }
                  }
                  await signOut(auth);
                  setCurrentUser(null);
                  localStorage.removeItem('pcp_current_user');
                  setFirebaseUserId(null);
                  addNotification('error', `Acesso negado: O e-mail "${uEmail}" está pendente de aprovação.`);
                }
              } catch (err) {
                // If getDoc failed (e.g. quota limit exceeded or offline)
                // Check if we have a valid cached user in localStorage
                const stored = localStorage.getItem('pcp_current_user');
                if (stored) {
                  try {
                    const cachedUser = JSON.parse(stored) as User;
                    if (cachedUser.email?.toLowerCase().trim() === emailLower && cachedUser.aprovado) {
                      setCurrentUser(cachedUser);
                      setFirebaseUserId(fbUser.uid);
                      console.warn("Firestore error during auth, using cached approved user", err);
                      return;
                    }
                  } catch {}
                }
                
                // Fallback for primary admins even if getDoc fails and no cache exists (just in case)
                if (emailLower === 'fpjadm@gmail.com' || emailLower === 'admin@homero.com.br') {
                  const adminObj: User = {
                    id: fbUser.uid,
                    nome: fbUser.displayName || 'Francisco P. Junior (Offline)',
                    email: uEmail,
                    role: 'admin',
                    aprovado: true,
                    permissoes: defaultPermsAdmin
                  };
                  setCurrentUser(adminObj);
                  safeLocalStorageSetItem('pcp_current_user', JSON.stringify(adminObj));
                  setFirebaseUserId(fbUser.uid);
                  console.warn("Firestore error during admin auth, bypassed with default admin permissions", err);
                } else {
                  await signOut(auth);
                  setCurrentUser(null);
                  localStorage.removeItem('pcp_current_user');
                  setFirebaseUserId(null);
                  addNotification('error', 'Erro de banco de dados ao verificar usuário. Tente novamente mais tarde.');
                }
              }
            }
          } catch (outerErr) {
            console.error("Critical error in onAuthStateChanged wrapper:", outerErr);
          }
        }
      } else {
        setFirebaseUserId(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Conexão em tempo real (Realtime Sync) com Firestore para todas as tabelas
  useEffect(() => {
    if (!currentUser) {
      setLoadingSnapshot(false);
      return;
    }

    setLoadingSnapshot(true);

    const checkAndStopLoading = () => {
      setLoadingSnapshot(false);
    };

    // To prevent stuck load screens if some reads fail (e.g. quota limits)
    const loadTimeout = setTimeout(() => {
      setLoadingSnapshot(false);
    }, 1500);

    const unsubscribers = [
      onSnapshot(collection(db, 'usuarios'), (snap) => {
        const list: User[] = [];
        snap.forEach(doc => list.push(doc.data() as User));
        setDbUsers(list);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'usuarios');
        checkAndStopLoading();
      }),

      onSnapshot(collection(db, 'clientes'), (snap) => {
        const list: Cliente[] = [];
        snap.forEach(doc => list.push(doc.data() as Cliente));
        setClientes(list);
        checkAndStopLoading();
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'clientes');
        checkAndStopLoading();
      }),

      onSnapshot(collection(db, 'pedidos'), (snap) => {
        const list: Pedido[] = [];
        snap.forEach(doc => list.push(doc.data() as Pedido));
        setPedidos(list);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'pedidos');
        checkAndStopLoading();
      }),

      onSnapshot(collection(db, 'produtos'), (snap) => {
        const list: Produto[] = [];
        snap.forEach(doc => list.push(doc.data() as Produto));
        setProdutos(list);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'produtos');
        checkAndStopLoading();
      }),

      onSnapshot(collection(db, 'produtosModelos'), (snap) => {
        const list: ProdutoModelo[] = [];
        snap.forEach(doc => list.push(doc.data() as ProdutoModelo));
        setProdutosModelos(list);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'produtosModelos');
        checkAndStopLoading();
      }),

      onSnapshot(collection(db, 'maquinas'), (snap) => {
        const list: Maquina[] = [];
        snap.forEach(doc => list.push(doc.data() as Maquina));
        setMaquinas(list);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'maquinas');
        checkAndStopLoading();
      }),

      onSnapshot(collection(db, 'operadores'), (snap) => {
        const list: Operador[] = [];
        snap.forEach(doc => list.push(doc.data() as Operador));
        setOperadores(list);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'operadores');
        checkAndStopLoading();
      }),

      onSnapshot(collection(db, 'insumos'), (snap) => {
        const list: Insumo[] = [];
        snap.forEach(doc => list.push(doc.data() as Insumo));
        setInsumos(list);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'insumos');
        checkAndStopLoading();
      }),

      onSnapshot(collection(db, 'apontamentos'), (snap) => {
        const list: Appnto[] = [];
        snap.forEach(doc => list.push(doc.data() as Appnto));
        setApontamentos(list);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'apontamentos');
        checkAndStopLoading();
      }),

      onSnapshot(collection(db, 'kanban'), (snap) => {
        const list: KanbanItem[] = [];
        snap.forEach(doc => list.push(doc.data() as KanbanItem));
        setKanban(list);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'kanban');
        checkAndStopLoading();
      }),

      onSnapshot(collection(db, 'movimentos'), (snap) => {
        const list: InsumoMovimento[] = [];
        snap.forEach(doc => list.push(doc.data() as InsumoMovimento));
        setMovimentos(list);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'movimentos');
        checkAndStopLoading();
      }),

      onSnapshot(collection(db, 'custosGerais'), (snap) => {
        const list: CustoGeral[] = [];
        snap.forEach(doc => list.push(doc.data() as CustoGeral));
        setCustosGerais(list);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'custosGerais');
        checkAndStopLoading();
      }),

      onSnapshot(collection(db, 'orcamentosSalvos'), (snap) => {
        const list: OrcamentoSalvo[] = [];
        snap.forEach(doc => list.push(doc.data() as OrcamentoSalvo));
        setOrcamentosSalvos(list);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'orcamentosSalvos');
        checkAndStopLoading();
      }),

      onSnapshot(doc(db, 'settings', 'taxas'), (snap) => {
        if (snap.exists()) {
          const val = snap.data() as TaxasLucroPresumido;
          setTaxasPresumido(val);
        } else {
          // Initialize default taxes on first load if missing
          setDoc(doc(db, 'settings', 'taxas'), DEFAULT_TAXAS_PRESUMIDO).catch(console.error);
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'settings/taxas');
        checkAndStopLoading();
      }),

      onSnapshot(doc(db, 'settings', 'kanban_config'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data && Array.isArray(data.columnIds)) {
            setKanbanColIds(data.columnIds);
            safeLocalStorageSetItem('pcp_kanban_col_ids', JSON.stringify(data.columnIds));
          }
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'settings/kanban_config');
        checkAndStopLoading();
      })
    ];

    // Salvar notificações localmente
    const savedNotifications = localStorage.getItem('pcp_notifications');
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications));
    }

    return () => {
      clearTimeout(loadTimeout);
      unsubscribers.forEach(unsub => unsub());
    };
  }, [currentUser?.id]);

  // Persistir notificações locally
  useEffect(() => {
    safeLocalStorageSetItem('pcp_notifications', JSON.stringify(notifications.slice(-30)));
  }, [notifications]);

  // Salvar e Excluir Usuários (CRUD para o painel de administração)
  const salvarUsuario = async (userObj: User) => {
    try {
      const emailLower = userObj.email.toLowerCase().trim();
      const cleanUser = {
        ...userObj,
        email: emailLower
      };
      await setDoc(doc(db, 'usuarios', emailLower), cleanUser);
      addNotification('success', `Usuário "${userObj.nome}" / [${emailLower}] atualizado.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `usuarios/${userObj.email}`);
    }
  };

  const excluirUsuario = async (email: string) => {
    try {
      const emailLower = email.toLowerCase().trim();
      await deleteDoc(doc(db, 'usuarios', emailLower));
      addNotification('warning', `Usuário "${emailLower}" removido.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `usuarios/${email}`);
    }
  };

  // Autenticação Real e Simulada
  const login = async (email: string): Promise<{ success: boolean; message: string }> => {
    const emailLower = email.toLowerCase().trim();
    
    if (emailLower === 'fpjadm@gmail.com' || emailLower === 'admin@homero.com.br') {
      const userObj: User = {
        id: `usr_super_${Date.now()}`,
        nome: emailLower === 'fpjadm@gmail.com' ? 'Francisco P. Junior' : 'PPCP Admin',
        email: emailLower,
        role: 'admin',
        aprovado: true,
        permissoes: defaultPermsAdmin
      };
      setCurrentUser(userObj);
      safeLocalStorageSetItem('pcp_current_user', JSON.stringify(userObj));
      addNotification('success', `Acesso PCP: Bem-vindo, Proprietário!`);
      
      // Forçar criação no banco para aparecer na listagem
      await setDoc(doc(db, 'usuarios', emailLower), userObj, { merge: true });
      
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.warn('Anonymous sign-in skipped:', e);
      }
      return { success: true, message: 'Sucesso' };
    }
    
    try {
      const userSnap = await getDoc(doc(db, 'usuarios', emailLower));
      if (userSnap.exists()) {
        const dbUser = userSnap.data() as User;
        if (dbUser.aprovado === true) {
          const userObj: User = {
            id: dbUser.id || `usr_sim_${Date.now()}`,
            nome: dbUser.nome || emailLower.split('@')[0],
            email: emailLower,
            role: dbUser.role || 'operador',
            aprovado: true,
            permissoes: dbUser.permissoes || defaultPermsOperador
          };
          setCurrentUser(userObj);
          safeLocalStorageSetItem('pcp_current_user', JSON.stringify(userObj));
          addNotification('success', `Acesso PCP: Bem-vindo, ${userObj.nome}!`);
          
          try {
            await signInAnonymously(auth);
          } catch (e) {
            console.warn('Anonymous sign-in skipped:', e);
          }
          return { success: true, message: 'Sucesso' };
        } else {
          return { success: false, message: 'Acesso Pendente: Este e-mail aguarda liberação do administrador.' };
        }
      } else {
        const pendingUser: User = {
          id: `usr_pend_${Date.now()}`,
          nome: emailLower.split('@')[0],
          email: emailLower,
          role: 'operador',
          aprovado: false,
          permissoes: defaultPermsOperador
        };
        await setDoc(doc(db, 'usuarios', emailLower), pendingUser);
        addNotification('info', `Novo cadastro pendente adicionado: ${emailLower}`);
        return { success: false, message: 'Cadastro enviado: Seu e-mail foi registrado para aprovação do administrador.' };
      }
    } catch (e) {
      console.error(e);
      return { success: false, message: 'Erro de conexão com o banco de dados.' };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const emailLower = result.user.email?.toLowerCase().trim() || '';
      
      if (!emailLower) {
        addNotification('error', 'Não foi possível ler o e-mail da conta do Google.');
        await signOut(auth);
        return;
      }

      if (emailLower === 'fpjadm@gmail.com' || emailLower === 'admin@homero.com.br') {
        const userObj: User = {
          id: result.user.uid,
          nome: result.user.displayName || 'Francisco P. Junior',
          email: emailLower,
          role: 'admin',
          aprovado: true,
          permissoes: defaultPermsAdmin
        };
        setCurrentUser(userObj);
        safeLocalStorageSetItem('pcp_current_user', JSON.stringify(userObj));
        await setDoc(doc(db, 'usuarios', emailLower), userObj, { merge: true });
        addNotification('success', `Logado via Google: ${userObj.nome}`);
        return;
      }

      const userSnap = await getDoc(doc(db, 'usuarios', emailLower));
      if (userSnap.exists() && userSnap.data().aprovado === true) {
        const dbUser = userSnap.data() as User;
        const userObj: User = {
          id: result.user.uid,
          nome: dbUser.nome || result.user.displayName || emailLower.split('@')[0],
          email: emailLower,
          role: dbUser.role || 'operador',
          aprovado: true,
          permissoes: dbUser.permissoes || defaultPermsOperador
        };
        setCurrentUser(userObj);
        safeLocalStorageSetItem('pcp_current_user', JSON.stringify(userObj));
        addNotification('success', `Logado via Google: ${userObj.nome}`);
      } else {
        if (!userSnap.exists()) {
          const pendingUser: User = {
            id: result.user.uid,
            nome: result.user.displayName || emailLower.split('@')[0],
            email: emailLower,
            role: 'operador',
            aprovado: false,
            permissoes: defaultPermsOperador
          };
          await setDoc(doc(db, 'usuarios', emailLower), pendingUser);
          addNotification('info', `Novo cadastro pendente: ${emailLower}`);
        }
        await signOut(auth);
        setCurrentUser(null);
        localStorage.removeItem('pcp_current_user');
        addNotification('warning', `Acesso Pendente: O e-mail "${emailLower}" aguarda aprovação.`);
      }
    } catch (e) {
      addNotification('error', `Falha no Google Auth: ${e instanceof Error ? e.message : 'Tente de novo.'}`);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Falha ao efetuar signout no Firebase');
    }
    setCurrentUser(null);
    localStorage.removeItem('pcp_current_user');
    addNotification('info', 'Sessão encerrada com sucesso.');
  };

  // Notificações helper
  const addNotification = (type: 'success' | 'warning' | 'error' | 'info', message: string) => {
    const newNotif: Notification = {
      id: `not_${Date.now()}`,
      type,
      message,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
    setNotifications(prev => [newNotif, ...prev.slice(0, 19)]);
  };

  const notificationsClear = () => {
    setNotifications([]);
  };

  const checkWritePermission = (moduloId: string): boolean => {
    if (!currentUser) return false;
    
    const emailLower = currentUser.email?.toLowerCase().trim();
    if (emailLower === 'fpjadm@gmail.com' || emailLower === 'admin@homero.com.br') return true;

    if (currentUser.permissoes) {
      const perm = currentUser.permissoes[moduloId as keyof UserPermissions];
      return perm === 'escrever';
    }

    // Default legacy roles fallback
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'supervisor') {
      return ['dashboard', 'pedidos', 'kanban', 'apontamento', 'estoque'].includes(moduloId);
    }
    return ['kanban', 'apontamento'].includes(moduloId);
  };

  // CRUD Clientes
  const adicionarCliente = async (cli: Omit<Cliente, 'id'>) => {
    const newId = `cli_${Date.now()}`;
    const newCli: Cliente = { ...cli, id: newId };
    setClientes(prev => [...prev, newCli]);
    try {
      await setDoc(doc(db, 'clientes', newId), cleanUndefined(newCli));
      addNotification('success', `Cliente "${newCli.nome}" cadastrado com sucesso.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `clientes/${newId}`);
    }
  };

  const excluirCliente = async (id: string) => {
    setClientes(prev => prev.filter(c => c.id !== id));
    try {
      await deleteDoc(doc(db, 'clientes', id));
      addNotification('warning', 'Cliente removido.');
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `clientes/${id}`);
    }
  };

  const editarCliente = async (updated: Cliente) => {
    setClientes(prev => prev.map(c => c.id === updated.id ? updated : c));
    try {
      await setDoc(doc(db, 'clientes', updated.id), cleanUndefined(updated));
      addNotification('success', `Cliente "${updated.nome}" atualizado.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `clientes/${updated.id}`);
    }
  };

  // CRUD Operadores
  const adicionarOperador = async (op: Omit<Operador, 'id'>) => {
    const newId = `op_${Date.now()}`;
    const newOp: Operador = { ...op, id: newId };
    setOperadores(prev => [...prev, newOp]);
    try {
      await setDoc(doc(db, 'operadores', newId), cleanUndefined(newOp));
      addNotification('success', `Operador "${newOp.nome}" cadastrado com sucesso.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `operadores/${newId}`);
    }
  };

  const excluirOperador = async (id: string) => {
    setOperadores(prev => prev.filter(o => o.id !== id));
    try {
      await deleteDoc(doc(db, 'operadores', id));
      addNotification('warning', 'Operador removido do quadro.');
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `operadores/${id}`);
    }
  };

  const editarOperador = async (updated: Operador) => {
    setOperadores(prev => prev.map(o => o.id === updated.id ? updated : o));
    try {
      await setDoc(doc(db, 'operadores', updated.id), cleanUndefined(updated));
      addNotification('success', `Operador "${updated.nome}" atualizado.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `operadores/${updated.id}`);
    }
  };

  // CRUD Custos Gerais (Despesas)
  const adicionarCustoGeral = async (cost: Omit<CustoGeral, 'id'>) => {
    const newId = `cg_${Date.now()}`;
    const newCost: CustoGeral = { ...cost, id: newId };
    setCustosGerais(prev => [...prev, newCost]);
    try {
      await setDoc(doc(db, 'custosGerais', newId), cleanUndefined(newCost));
      addNotification('success', `Despesa "${newCost.descricao}" registrada no PCP.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `custosGerais/${newId}`);
    }
  };

  const excluirCustoGeral = async (id: string) => {
    setCustosGerais(prev => prev.filter(c => c.id !== id));
    try {
      await deleteDoc(doc(db, 'custosGerais', id));
      addNotification('warning', 'Despesa removida.');
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `custosGerais/${id}`);
    }
  };

  // Atualizar Impostos
  const atualizarTaxasPresumido = async (taxas: TaxasLucroPresumido) => {
    setTaxasPresumido(taxas);
    try {
      await setDoc(doc(db, 'settings', 'taxas'), taxas);
      addNotification('success', 'Tributos (Lucro Presumido) reajustados para orçamentos.');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'settings/taxas');
    }
  };

  // Salvar Sequência do Kanban persistente
  const salvarSequenciaKanban = async (ids: string[]) => {
    setKanbanColIds(ids);
    safeLocalStorageSetItem('pcp_kanban_col_ids', JSON.stringify(ids));
    try {
      await setDoc(doc(db, 'settings', 'kanban_config'), { columnIds: ids });
      addNotification('success', 'Sequência das etapas do Kanban fixada e salva com sucesso!');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'settings/kanban_config');
    }
  };

  // CRUD Máquinas
  const adicionarMaquina = async (maq: Omit<Maquina, 'id'>) => {
    const newId = (maq.codigo?.trim().toLowerCase() || `m_${Date.now()}`).replace(/[\/\\]/g, '-');
    const newMaq: Maquina = {
      ...maq,
      id: newId,
      status_atual: 'ociosa'
    };
    setMaquinas(prev => [...prev, newMaq]);
    try {
      await setDoc(doc(db, 'maquinas', newId), cleanUndefined(newMaq));
      addNotification('success', `Máquina "${newMaq.nome}" adicionada com sucesso.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `maquinas/${newId}`);
    }
  };

  const excluirMaquina = async (maquinaId: string) => {
    setMaquinas(prev => prev.filter(m => m.id !== maquinaId));
    try {
      await deleteDoc(doc(db, 'maquinas', maquinaId));
      addNotification('warning', `Máquina #${maquinaId} removida.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `maquinas/${maquinaId}`);
    }
  };

  const editarMaquina = async (updated: Maquina) => {
    setMaquinas(prev => prev.map(m => m.id === updated.id ? updated : m));
    try {
      await setDoc(doc(db, 'maquinas', updated.id), cleanUndefined(updated));
      addNotification('success', `Máquina "${updated.nome}" atualizada.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `maquinas/${updated.id}`);
    }
  };

  const vincularOperadorMaquina = async (maquinaId: string, operadorId: string | undefined) => {
    const cleanOpId = operadorId || '';
    setMaquinas(prev => prev.map(m => m.id === maquinaId ? { ...m, operador_id: cleanOpId } : m));
    try {
      await updateDoc(doc(db, 'maquinas', maquinaId), { operador_id: cleanOpId });
      const op = operadores.find(o => o.id === operadorId);
      if (op) {
        addNotification('success', `Operador "${op.nome}" vinculado com sucesso.`);
      } else {
        addNotification('info', `Vínculo desfeito para a máquina.`);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `maquinas/${maquinaId}/vincularOp`);
    }
  };

  // CRUD Pedidos
  const adicionarPedido = async (
    ped: Omit<Pedido, 'id' | 'data_criacao' | 'status'>, 
    prods: Omit<Produto, 'id' | 'pedido_id' | 'maquina_atual_idx'>[]
  ) => {
    const pedId = `PED-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPedido: Pedido = {
      ...ped,
      id: pedId,
      status: 'pendente',
      data_criacao: new Date().toISOString().split('T')[0]
    };

    // Pre-build products with unique IDs for consistent local & server sync
    const newProductsList: Produto[] = prods.map((p, idx) => ({
      ...p,
      id: `PROD-${Math.floor(100 + Math.random() * 900)}-${idx}`,
      pedido_id: pedId,
      maquina_atual_idx: -1
    }));

    // Optimistic local update
    setPedidos(prev => [...prev, newPedido]);
    setProdutos(prev => [...prev, ...newProductsList]);

    try {
      // 1. Grava Pedido no Firestore
      await setDoc(doc(db, 'pedidos', pedId), cleanUndefined(newPedido));

      // 2. Grava Produtos correspondentes no Firestore
      for (const newProd of newProductsList) {
        await setDoc(doc(db, 'produtos', newProd.id), cleanUndefined(newProd));
      }

      addNotification('success', `Pedido ${pedId} criado com ${prods.length} produto(s) no Firebase.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `pedidos/${pedId}`);
    }
  };

  const excluirPedido = async (pedidoId: string) => {
    // Optimistic local update
    setPedidos(prev => prev.filter(p => p.id !== pedidoId));
    setProdutos(prev => prev.filter(p => p.pedido_id !== pedidoId));
    setKanban(prev => prev.filter(k => {
      const pr = produtos.find(p => p.id === k.produto_id);
      return pr ? pr.pedido_id !== pedidoId : true;
    }));

    try {
      // 1. Deleta Pedido
      await deleteDoc(doc(db, 'pedidos', pedidoId));

      // 2. Deleta Produtos relacionados
      const prodList = produtos.filter(p => p.pedido_id === pedidoId);
      for (const p of prodList) {
        await deleteDoc(doc(db, 'produtos', p.id));
      }

      // 3. Deleta do Kanban
      const kanbanList = kanban.filter(k => {
        const pr = produtos.find(p => p.id === k.produto_id);
        return pr ? pr.pedido_id === pedidoId : false;
      });
      for (const k of kanbanList) {
        await deleteDoc(doc(db, 'kanban', k.id));
      }

      addNotification('warning', `Pedido ${pedidoId} e seus itens foram deletados do Firebase.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `pedidos/${pedidoId}`);
    }
  };

  const cancelarPedido = async (pedidoId: string) => {
    // Optimistic local update
    setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, status: 'cancelado' as const } : p));
    try {
      await updateDoc(doc(db, 'pedidos', pedidoId), { status: 'cancelado' });
      addNotification('info', `Pedido ${pedidoId} marcado como cancelado.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `pedidos/${pedidoId}`);
    }
  };

  const editarPedidoPrioridadeSequencia = async (pedidoId: string, sequencia: number | undefined) => {
    const parsedSeq = (sequencia === undefined || isNaN(Number(sequencia))) ? null : Number(sequencia);
    
    // Optimistic local update
    setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, prioridade_sequencia: parsedSeq } : p));
    setKanban(prev => prev.map(k => {
      const pr = produtos.find(p => p.id === k.produto_id);
      if (pr && pr.pedido_id === pedidoId) {
        return { ...k, prioridade_sequencia: parsedSeq };
      }
      return k;
    }));

    try {
      await updateDoc(doc(db, 'pedidos', pedidoId), { 
        prioridade_sequencia: parsedSeq 
      });

      // Also update related kanban items
      const prodsDoPedido = produtos.filter(p => p.pedido_id === pedidoId);
      for (const p of prodsDoPedido) {
        const relatedKanbans = kanban.filter(k => k.produto_id === p.id);
        for (const k of relatedKanbans) {
          await updateDoc(doc(db, 'kanban', k.id), { 
            prioridade_sequencia: parsedSeq 
          });
        }
      }
      addNotification('success', `Pedido ${pedidoId}: prioridade em sequência atualizada para ${parsedSeq ?? 'nenhuma'}.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `pedidos/${pedidoId}/prioridade_sequencia`);
    }
  };

  const resequenciarAposFinalizacao = async (pedidoFinalizadoId: string) => {
    // 1. Atualização otimista do estado local
    // O pedido finalizado perde a prioridade_sequencia (fica undefined/null)
    // Os outros pedidos ativos (não concluídos/cancelados) que têm prioridade serão resequenciados sequencialmente a partir de 1
    let pedidosParaAtualizar: { id: string; novaSeq: number | null }[] = [];

    setPedidos(prevPeds => {
      const ativosSequenciados = prevPeds
        .filter(p => p.id !== pedidoFinalizadoId && p.status !== 'concluido' && p.status !== 'cancelado' && p.prioridade_sequencia !== undefined && p.prioridade_sequencia !== null)
        .sort((a, b) => (a.prioridade_sequencia || 0) - (b.prioridade_sequencia || 0));

      const novosValores = new Map<string, number | null>();
      novosValores.set(pedidoFinalizadoId, null);

      ativosSequenciados.forEach((p, idx) => {
        novosValores.set(p.id, idx + 1);
      });

      pedidosParaAtualizar = Array.from(novosValores.entries()).map(([id, novaSeq]) => ({ id, novaSeq }));

      return prevPeds.map(p => {
        if (novosValores.has(p.id)) {
          const val = novosValores.get(p.id);
          return { ...p, prioridade_sequencia: val === null ? undefined : val };
        }
        return p;
      });
    });

    setKanban(prevKanban => {
      return prevKanban.map(k => {
        const prod = produtos.find(p => p.id === k.produto_id);
        if (prod) {
          const itemUpdate = pedidosParaAtualizar.find(up => up.id === prod.pedido_id);
          if (itemUpdate) {
            return { ...k, prioridade_sequencia: itemUpdate.novaSeq === null ? undefined : itemUpdate.novaSeq };
          }
        }
        return k;
      });
    });

    // 2. Atualização no Firestore
    try {
      // 1. Atualizar o pedido finalizado para null no banco
      await updateDoc(doc(db, 'pedidos', pedidoFinalizadoId), { prioridade_sequencia: null });

      const prodsDoPedFinalizado = produtos.filter(p => p.pedido_id === pedidoFinalizadoId);
      for (const p of prodsDoPedFinalizado) {
        const related = kanban.filter(k => k.produto_id === p.id);
        for (const r of related) {
          await updateDoc(doc(db, 'kanban', r.id), { prioridade_sequencia: null });
        }
      }

      // 2. Atualizar todos os outros que sofreram resequenciamento
      for (const item of pedidosParaAtualizar) {
        if (item.id === pedidoFinalizadoId) continue;

        await updateDoc(doc(db, 'pedidos', item.id), { prioridade_sequencia: item.novaSeq });

        const prodsDoPed = produtos.filter(p => p.pedido_id === item.id);
        for (const p of prodsDoPed) {
          const related = kanban.filter(k => k.produto_id === p.id);
          for (const r of related) {
            await updateDoc(doc(db, 'kanban', r.id), { prioridade_sequencia: item.novaSeq });
          }
        }
      }

      console.log(`[Resequencer] Sequência de produção reorganizada após a finalização do Pedido ${pedidoFinalizadoId}`);
    } catch (e) {
      console.error("Erro ao resequenciar sequência de produção no Firestore", e);
    }
  };

  const liberarPedidoParaProducao = (pedidoId: string): boolean => {
    const prodsDoPedido = produtos.filter(p => p.pedido_id === pedidoId);
    if (!prodsDoPedido.length) return false;

    // Retrieve order's sequence priority to inherit
    const parentPedido = pedidos.find(p => p.id === pedidoId);
    const prioridadeSeq = parentPedido?.prioridade_sequencia;

    // --- OPTIMISTIC LOCAL STATE UPDATE ---
    const dataHoraAtual = new Date().toISOString().replace('T', ' ').substring(0, 16);
    
    // 1. Atualizar status do pedido para produção localmente
    setPedidos(prev => {
      const updated = prev.map(p => p.id === pedidoId ? { ...p, status: 'producao' as const } : p);
      return updated;
    });

    // 2. Mover produtos do pedido para o primeiro maquinário do roteiro localmente
    setProdutos(prev => {
      const updated = prev.map(p => p.pedido_id === pedidoId ? { ...p, maquina_atual_idx: 0 } : p);
      return updated;
    });

    // 3. Cadastrar itens na fila do Kanban localmente
    setKanban(prev => {
      const updatedKanban = [...prev];
      for (const p of prodsDoPedido) {
        if (p.roteiro && p.roteiro.length > 0) {
          const primeiraMaquinaId = p.roteiro[0];
          const filaMaquina = updatedKanban.filter(k => k.maquina_id === primeiraMaquinaId && k.status !== 'concluido');
          const novaOrdem = filaMaquina.length + 1;
          const kbId = `kb_${Math.random().toString(36).substring(2, 11)}`;

          const newItem: KanbanItem = {
            id: kbId,
            produto_id: p.id,
            maquina_id: primeiraMaquinaId,
            ordem: novaOrdem,
            status: 'aguardando',
            data_entrada: dataHoraAtual,
            check_chapa: false,
            check_faca: false,
            check_papel: false,
            prioridade_sequencia: prioridadeSeq
          };
          updatedKanban.push(newItem);
        }
      }
      return updatedKanban;
    });

    const processLiberar = async () => {
      try {
        // 1. Atualizar status do pedido para produção
        await updateDoc(doc(db, 'pedidos', pedidoId), { status: 'producao' });

        // 2. Mover produtos do pedido para o primeiro maquinário do roteiro
        for (const p of prodsDoPedido) {
          await updateDoc(doc(db, 'produtos', p.id), { maquina_atual_idx: 0 });

          if (p.roteiro && p.roteiro.length > 0) {
            const primeiraMaquinaId = p.roteiro[0];
            const filaMaquina = kanban.filter(k => k.maquina_id === primeiraMaquinaId && k.status !== 'concluido');
            const novaOrdem = filaMaquina.length + 1;
            const kbId = `kb_${Math.random().toString(36).substring(2, 11)}`;

            await setDoc(doc(db, 'kanban', kbId), {
              id: kbId,
              produto_id: p.id,
              maquina_id: primeiraMaquinaId,
              ordem: novaOrdem,
              status: 'aguardando',
              data_entrada: new Date().toISOString().replace('T', ' ').substring(0, 16),
              prioridade_sequencia: prioridadeSeq || null
            } as KanbanItem);
          }
        }
        addNotification('success', `Pedido ${pedidoId} liberado! Itens enviados à esteira de produção.`);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `pedidos/${pedidoId}/liberar`);
      }
    };

    processLiberar();
    return true;
  };

  // Kanban Drag-and-Touch Engine
  const moverCardKanban = (
    produtoId: string, 
    origemMaquinaId: string, 
    destinoMaquinaId: string, 
    novoStatus: 'aguardando' | 'em_processo' | 'concluido'
  ): { success: boolean; message: string } => {
    const prod = produtos.find(p => p.id === produtoId);
    if (!prod) return { success: false, message: 'Produto não encontrado.' };

    const roteiro = prod.roteiro;
    const atualIdx = prod.maquina_atual_idx;
    
    // Encontrar todos os índices no roteiro que correspondem ao destinoMaquinaId
    const candidates = roteiro.map((mId, idx) => mId === destinoMaquinaId ? idx : -1).filter(idx => idx !== -1);
    
    let targetIdx = -1;
    if (destinoMaquinaId !== 'concluido') {
      if (candidates.length === 0) {
        return { 
          success: false, 
          message: `Esta máquina não faz parte da sequência do produto (${prod.descricao}).` 
        };
      }

      // Determinar qual o índice de destino correto dentre os candidatos baseando-se no atualIdx
      if (candidates.includes(atualIdx + 1)) {
        // Passo adjacente à frente
        targetIdx = atualIdx + 1;
      } else if (candidates.includes(atualIdx - 1)) {
        // Passo adjacente para trás
        targetIdx = atualIdx - 1;
      } else {
        // Rollback não-adjacente (retrabalho para alguma etapa anterior)
        const rollbacks = candidates.filter(c => c < atualIdx);
        if (rollbacks.length > 0) {
          // Escolher o mais próximo para trás
          targetIdx = rollbacks[rollbacks.length - 1];
        } else {
          // Avanço (tentativa de pular etapas)
          const advances = candidates.filter(c => c > atualIdx);
          targetIdx = advances[0] !== undefined ? advances[0] : candidates[0];
        }
      }
    }

    // Regra industrial: Processo sequencial rígido
    if (destinoMaquinaId === 'concluido') {
      const ultimaMaquinaDoRoteiro = roteiro[roteiro.length - 1];
      if (origemMaquinaId !== ultimaMaquinaDoRoteiro) {
        return { 
          success: false, 
          message: 'Não é possível concluir. O produto possui etapas intermediárias pendentes.' 
        };
      }
    } else {
      if (targetIdx > atualIdx) {
        if (targetIdx !== atualIdx + 1) {
          return { 
            success: false, 
            message: 'Avanço Inválido: Não é permitido pular processos gráficos pendentes.' 
          };
        }
      }
    }

    // Validação de Controle de Insumos (Chapa, Faca, Papel) ao avançar
    // Regra: Só deve ser exigido no fluxo do controle de insumos (ou seja, quando está saindo do primeiro processo do roteiro: atualIdx === 0)
    const isAdvancing = (destinoMaquinaId === 'concluido') || (targetIdx > atualIdx);
    if (isAdvancing && atualIdx === 0) {
      const activeItem = kanban.find(k => k.produto_id === produtoId && k.maquina_id === origemMaquinaId && k.status !== 'concluido');
      if (activeItem) {
        const checkChapa = activeItem.check_chapa === true;
        const checkFaca = activeItem.check_faca === true;
        const checkPapel = activeItem.check_papel === true;
        if (!checkChapa || !checkFaca || !checkPapel) {
          return {
            success: false,
            message: 'Controle de Insumos Pendente: Confirme a checagem de Chapa, Faca e Papel antes de avançar para a próxima etapa.'
          };
        }
      }
    }

    // --- OPTIMISTIC LOCAL STATE UPDATE ---
    let novoIdx = atualIdx;
    if (destinoMaquinaId === 'concluido') {
      novoIdx = roteiro.length;
    } else {
      novoIdx = targetIdx;
    }

    const dataHoraAtual = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const itemOrigem = kanban.find(k => k.produto_id === produtoId && k.maquina_id === origemMaquinaId && k.status !== 'concluido');
    const prevChapa = itemOrigem ? (itemOrigem.check_chapa || false) : false;
    const prevFaca = itemOrigem ? (itemOrigem.check_faca || false) : false;
    const prevPapel = itemOrigem ? (itemOrigem.check_papel || false) : false;

    // 1. Atualizar produto localmente
    setProdutos(prev => {
      const updated = prev.map(p => p.id === produtoId ? { ...p, maquina_atual_idx: novoIdx } : p);
      return updated;
    });

    // 2. Concluir card no Kanban de origem localmente
    setKanban(prev => {
      let updatedKanban = prev.map(k => {
        if (k.produto_id === produtoId && k.maquina_id === origemMaquinaId && k.status !== 'concluido') {
          return { ...k, status: 'concluido' as const, data_saida: dataHoraAtual };
        }
        return k;
      });

      // 3. Cadastrar ou reabrir card no Kanban de destino localmente
      if (destinoMaquinaId !== 'concluido') {
        const existeDestino = updatedKanban.some(k => k.produto_id === produtoId && k.maquina_id === destinoMaquinaId && k.status !== 'concluido');
        if (!existeDestino) {
          const filaDestino = updatedKanban.filter(k => k.maquina_id === destinoMaquinaId && k.status !== 'concluido');
          const novaOrdem = filaDestino.length + 1;
          const kbId = `kb_${Math.random().toString(36).substring(2, 11)}`;

          const newItem: KanbanItem = {
            id: kbId,
            produto_id: produtoId,
            maquina_id: destinoMaquinaId,
            ordem: novaOrdem,
            status: novoStatus,
            data_entrada: dataHoraAtual,
            check_chapa: prevChapa,
            check_faca: prevFaca,
            check_papel: prevPapel
          };
          updatedKanban.push(newItem);
        }
      }

      return updatedKanban;
    });

    // 4. Se todos os produtos do mesmo pedido foram finalizados, marcaremos o pedido como concluído localmente
    const pid = prod.pedido_id;
    setTimeout(() => {
      setProdutos(currentProds => {
        const prodsDoPed = currentProds.filter(p => p.pedido_id === pid);
        const todosConcluidos = prodsDoPed.every(p => p.maquina_atual_idx === p.roteiro.length);
        if (todosConcluidos) {
          setPedidos(prevPeds => {
            const updatedPeds = prevPeds.map(pe => pe.id === pid ? { ...pe, status: 'concluido' as const } : pe);
            return updatedPeds;
          });
          addNotification('success', `Pedido ${pid} finalizado e enviado para expedição de faturamento!`);
          resequenciarAposFinalizacao(pid);
        }
        return currentProds;
      });
    }, 1500);

    // Processamento Assíncrono no Firestore
    const processMover = async () => {
      try {
        // 1. Atualizar produto
        await updateDoc(doc(db, 'produtos', produtoId), { maquina_atual_idx: novoIdx });

        // 2. Concluir card no Kanban de origem
        if (itemOrigem) {
          await updateDoc(doc(db, 'kanban', itemOrigem.id), {
            status: 'concluido',
            data_saida: dataHoraAtual
          });
        }

        // 3. Cadastrar ou reabrir card no Kanban de destino
        if (destinoMaquinaId !== 'concluido') {
          const existeDestino = kanban.some(k => k.produto_id === produtoId && k.maquina_id === destinoMaquinaId && k.status !== 'concluido');
          if (!existeDestino) {
            const filaDestino = kanban.filter(k => k.maquina_id === destinoMaquinaId && k.status !== 'concluido');
            const novaOrdem = filaDestino.length + 1;
            const kbId = `kb_${Math.random().toString(36).substring(2, 11)}`;

            await setDoc(doc(db, 'kanban', kbId), {
              id: kbId,
              produto_id: produtoId,
              maquina_id: destinoMaquinaId,
              ordem: novaOrdem,
              status: novoStatus,
              data_entrada: dataHoraAtual,
              check_chapa: prevChapa,
              check_faca: prevFaca,
              check_papel: prevPapel
            } as KanbanItem);
          }
        }

        // 4. Se todos os produtos do mesmo pedido foram finalizados, marcaremos o pedido como concluído
        const freshProdsSnapshot = produtos;
        const prodsDoPed = freshProdsSnapshot.filter(p => p.pedido_id === pid);
        const todosConcluidos = prodsDoPed.every(p => {
          if (p.id === produtoId) return novoIdx === p.roteiro.length;
          return p.maquina_atual_idx === p.roteiro.length;
        });

        if (todosConcluidos) {
          await updateDoc(doc(db, 'pedidos', pid), { status: 'concluido' });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `produtos/${produtoId}/mover`);
      }
    };

    processMover();
    return { success: true, message: 'Card movimentado com sucesso.' };
  };

  const alterarOrdemLote = async (produtoId: string, maquinaId: string, novaOrdem: number) => {
    // --- OPTIMISTIC LOCAL STATE UPDATE ---
    let fallbackCreatedId = '';
    const activeItems = kanban
      .filter(k => k.maquina_id === maquinaId && k.status !== 'concluido')
      .sort((a, b) => a.ordem - b.ordem);

    const targetItem = activeItems.find(k => k.produto_id === produtoId);
    
    setKanban(prev => {
      let updatedList = [...prev];
      if (!targetItem) {
        const kbId = `kb_${Math.random().toString(36).substring(2, 11)}`;
        fallbackCreatedId = kbId;
        const dataHoraAtual = new Date().toISOString().replace('T', ' ').substring(0, 16);
        const newItem: KanbanItem = {
          id: kbId,
          produto_id: produtoId,
          maquina_id: maquinaId,
          ordem: novaOrdem,
          status: 'aguardando',
          data_entrada: dataHoraAtual,
          check_chapa: false,
          check_faca: false,
          check_papel: false
        };
        updatedList = [...updatedList, newItem];
      } else {
        const remainingItems = activeItems.filter(k => k.produto_id !== produtoId);
        const insertIndex = Math.max(0, Math.min(remainingItems.length, novaOrdem - 1));
        remainingItems.splice(insertIndex, 0, targetItem);
        
        // Update ordens locally
        const updatedOrdensMap = new Map(remainingItems.map((item, index) => [item.id, index + 1]));
        updatedList = prev.map(k => {
          if (updatedOrdensMap.has(k.id)) {
            return { ...k, ordem: updatedOrdensMap.get(k.id)! };
          }
          return k;
        });
      }
      return updatedList;
    });

    try {
      if (!targetItem) {
        const kbId = fallbackCreatedId || `kb_${Math.random().toString(36).substring(2, 11)}`;
        const dataHoraAtual = new Date().toISOString().replace('T', ' ').substring(0, 16);
        await setDoc(doc(db, 'kanban', kbId), {
          id: kbId,
          produto_id: produtoId,
          maquina_id: maquinaId,
          ordem: novaOrdem,
          status: 'aguardando',
          data_entrada: dataHoraAtual
        });
        addNotification('success', `Lote adicionado na fila na posição #${novaOrdem}.`);
        return;
      }

      const remainingItems = activeItems.filter(k => k.produto_id !== produtoId);
      const insertIndex = Math.max(0, Math.min(remainingItems.length, novaOrdem - 1));
      remainingItems.splice(insertIndex, 0, targetItem);

      const batch = writeBatch(db);
      remainingItems.forEach((item, index) => {
        const itemRef = doc(db, 'kanban', item.id);
        batch.update(itemRef, { ordem: index + 1 });
      });

      await batch.commit();
      addNotification('success', `Sequência atualizada. Lote movido para posição #${insertIndex + 1} na fila.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `kanban/${maquinaId}/reordenar`);
    }
  };

  const atualizarCheckInsumosKanban = async (produtoId: string, maquinaId: string, checks: { check_chapa?: boolean; check_faca?: boolean; check_papel?: boolean }) => {
    // --- OPTIMISTIC LOCAL STATE UPDATE ---
    const activeItem = kanban.find(k => k.produto_id === produtoId && k.maquina_id === maquinaId && k.status !== 'concluido');
    let updatedId = '';
    
    setKanban(prev => {
      let updatedList = [...prev];
      if (activeItem) {
        updatedList = prev.map(k => k.id === activeItem.id ? { ...k, ...checks } : k);
      } else {
        const kbId = `kb_${Math.random().toString(36).substring(2, 11)}`;
        updatedId = kbId;
        const dataHoraAtual = new Date().toISOString().replace('T', ' ').substring(0, 16);
        const newItem: KanbanItem = {
          id: kbId,
          produto_id: produtoId,
          maquina_id: maquinaId,
          ordem: 1,
          status: 'aguardando',
          data_entrada: dataHoraAtual,
          check_chapa: false,
          check_faca: false,
          check_papel: false,
          ...checks
        };
        updatedList = [...updatedList, newItem];
      }
      return updatedList;
    });

    try {
      if (activeItem) {
        await updateDoc(doc(db, 'kanban', activeItem.id), checks);
      } else {
        const kbId = updatedId || `kb_${Math.random().toString(36).substring(2, 11)}`;
        const dataHoraAtual = new Date().toISOString().replace('T', ' ').substring(0, 16);
        await setDoc(doc(db, 'kanban', kbId), {
          id: kbId,
          produto_id: produtoId,
          maquina_id: maquinaId,
          ordem: 1,
          status: 'aguardando',
          data_entrada: dataHoraAtual,
          ...checks
        });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `kanban/${produtoId}/${maquinaId}/checks`);
    }
  };

  const verificarSobreposicaoMaquina = (maquinaId: string, inicio: Date, fim: Date): boolean => {
    return apontamentos.some(apt => {
      if (apt.maquina_id !== maquinaId) return false;
      const aptInicio = new Date(apt.data_inicio);
      const aptFim = new Date(apt.data_fim);
      return (aptFim > inicio && fim > aptInicio);
    });
  };

  // Registro de Apontamento + Dedutores automáticos de Estoque (Firestore-backed)
  const registrarApontamento = (apt: Omit<Appnto, 'id'>): { success: boolean; message: string } => {
    const dtInicio = new Date(apt.data_inicio);
    const dtFim = new Date(apt.data_fim);

    if (dtFim <= dtInicio) {
      return { success: false, message: 'A data/hora de término deve ser posterior à data/hora de início.' };
    }

    if (verificarSobreposicaoMaquina(apt.maquina_id, dtInicio, dtFim)) {
      return { 
        success: false, 
        message: 'Conflito de Cronograma: Horário coincide com outro apontamento na mesma máquina!' 
      };
    }

    const aptId = `apt_${Date.now()}`;
    const rawApt: any = { ...apt, id: aptId };
    
    // Sanitize object to remove undefined values for Firestore compatibility
    const novoApt = Object.keys(rawApt).reduce((acc: any, key) => {
      if (rawApt[key] !== undefined) {
        acc[key] = rawApt[key];
      }
      return acc;
    }, {}) as Appnto;

    // --- OPTIMISTIC LOCAL STATE UPDATE ---
    // 1. Gravar registro de apontamento localmente
    setApontamentos(prev => {
      const updated = [...prev, novoApt];
      return updated;
    });

    // 2. Alterar status temporário da máquina para ociosa localmente
    setMaquinas(prev => {
      const updated = prev.map(m => m.id === apt.maquina_id ? { ...m, status_atual: 'ociosa' as const } : m);
      return updated;
    });

    // 3. Deduzir Insumo de Estoque localmente
    const prod = produtos.find(p => p.id === apt.produto_id);
    if (prod) {
      const listInsumosFicha = prod.insumos_ficha && prod.insumos_ficha.length > 0
        ? prod.insumos_ficha
        : [{
            insumo_id: '',
            nome: prod.material,
            fator_consumo: prod.fator_consumo,
            rendimento: prod.fator_consumo > 0 ? 1 / prod.fator_consumo : 0
          }];

      const localMovs: InsumoMovimento[] = [];

      setInsumos(prevInsumos => {
        let currentInsumos = [...prevInsumos];
        
        for (const itemFicha of listInsumosFicha) {
          if (!itemFicha.nome) continue;
          const idx = currentInsumos.findIndex(i => i.nome === itemFicha.nome || i.id === itemFicha.insumo_id || i.codigo === itemFicha.insumo_id);
          if (idx !== -1) {
            const insumoPrincipal = currentInsumos[idx];
            const pesoConsumido = Number((apt.quantidade_produzida * itemFicha.fator_consumo).toFixed(4));
            const novoEstoque = Math.max(0, Number((insumoPrincipal.estoque_atual - pesoConsumido).toFixed(4)));

            currentInsumos[idx] = {
              ...insumoPrincipal,
              estoque_atual: novoEstoque
            };

            // Alerta se necessário
            if (insumoPrincipal.estoque_minimo > novoEstoque) {
              addNotification('warning', `ALERTA DE REPOSIÇÃO: O insumo "${insumoPrincipal.nome}" está abaixo do estoque mínimo (${novoEstoque} ${insumoPrincipal.unidade}).`);
            }

            const randSuffix = Math.floor(Math.random() * 1000);
            const movId = `mov_${Date.now()}_${randSuffix}`;
            localMovs.push({
              id: movId,
              insumo_id: insumoPrincipal.id,
              tipo: 'saida',
              quantidade: pesoConsumido,
              data: new Date().toISOString().split('T')[0],
              motivo: `Consumo automático Produção ${prod.descricao} (Ref. Apont. #${aptId})`,
              produto_id: prod.id
            } as InsumoMovimento);
          }
        }

        // Se for máquina de Impressão, deduzir tintas CMYK
        const maquina = maquinas.find(m => m.id === apt.maquina_id);
        if (maquina && maquina.tipo === 'Impressão') {
          currentInsumos = currentInsumos.map(i => {
            if (i.tipo === 'tinta') {
              const tintaConsumo = Number((apt.quantidade_produzida * 0.0002).toFixed(3));
              const novoEstoqueTinta = Math.max(0, Number((i.estoque_atual - tintaConsumo).toFixed(3)));
              return { ...i, estoque_atual: novoEstoqueTinta };
            }
            return i;
          });
        }

        // Deduzir folhas
        if (apt.quantidade_folhas_utilizadas && apt.insumo_folhas_id) {
          const idxFolha = currentInsumos.findIndex(i => i.id === apt.insumo_folhas_id);
          if (idxFolha !== -1) {
            const insumoFolha = currentInsumos[idxFolha];
            const novoEstoqueFolhas = Math.max(0, Number((insumoFolha.estoque_atual - apt.quantidade_folhas_utilizadas).toFixed(4)));
            currentInsumos[idxFolha] = {
              ...insumoFolha,
              estoque_atual: novoEstoqueFolhas
            };

            if (insumoFolha.estoque_minimo > novoEstoqueFolhas) {
              addNotification('warning', `ALERTA DE REPOSIÇÃO: O insumo "${insumoFolha.nome}" está abaixo do estoque mínimo (${novoEstoqueFolhas} ${insumoFolha.unidade}).`);
            }

            const randSuffix = Math.floor(Math.random() * 1000);
            const movId = `mov_${Date.now()}_sheet_${randSuffix}`;
            const maqNome = maquina ? maquina.nome : apt.maquina_id;
            localMovs.push({
              id: movId,
              insumo_id: insumoFolha.id,
              tipo: 'saida',
              quantidade: apt.quantidade_folhas_utilizadas,
              data: new Date().toISOString().split('T')[0],
              motivo: `Baixa automática de folhas no Apontamento da máquina ${maqNome} (Ref. Apont. #${aptId})`,
              produto_id: apt.produto_id
            } as InsumoMovimento);
          }
        }

        return currentInsumos;
      });

      if (localMovs.length > 0) {
        setMovimentos(prev => {
          const updated = [...prev, ...localMovs];
          return updated;
        });
      }
    }

    // 4. Promover Kanban para 'em_processo' caso estivesse em fila localmente
    setKanban(prev => {
      const updated = prev.map(k => {
        if (k.produto_id === apt.produto_id && k.maquina_id === apt.maquina_id && k.status === 'aguardando') {
          return { ...k, status: 'em_processo' as const };
        }
        return k;
      });
      return updated;
    });

    const processApontamento = async () => {
      try {
        // 1. Gravar registro de apontamento
        await setDoc(doc(db, 'apontamentos', aptId), novoApt);

        // 2. Alterar status temporário da máquina para ociosa para novos trabalhos
        await updateDoc(doc(db, 'maquinas', apt.maquina_id), { status_atual: 'ociosa' });

        // 3. Deduzir Insumo de Estoque com base nas Fórmulas por Produto
        if (prod) {
          const listInsumosFicha = prod.insumos_ficha && prod.insumos_ficha.length > 0
            ? prod.insumos_ficha
            : [{
                insumo_id: '',
                nome: prod.material,
                fator_consumo: prod.fator_consumo,
                rendimento: prod.fator_consumo > 0 ? 1 / prod.fator_consumo : 0
              }];

          for (const itemFicha of listInsumosFicha) {
            if (!itemFicha.nome) continue;
            const insumoPrincipal = insumos.find(i => i.nome === itemFicha.nome || i.id === itemFicha.insumo_id || i.codigo === itemFicha.insumo_id);
            if (insumoPrincipal) {
              const pesoConsumido = Number((apt.quantidade_produzida * itemFicha.fator_consumo).toFixed(4));
              const novoEstoque = Math.max(0, Number((insumoPrincipal.estoque_atual - pesoConsumido).toFixed(4)));

              // Registrar dedução no estoque
              await updateDoc(doc(db, 'insumos', insumoPrincipal.id), { estoque_atual: novoEstoque });

              // Gravar histórico de movimentação
              const randSuffix = Math.floor(Math.random() * 1000);
              const movId = `mov_${Date.now()}_${randSuffix}`;
              await setDoc(doc(db, 'movimentos', movId), {
                id: movId,
                insumo_id: insumoPrincipal.id,
                tipo: 'saida',
                quantidade: pesoConsumido,
                data: new Date().toISOString().split('T')[0],
                motivo: `Consumo automático Produção ${prod.descricao} (Ref. Apont. #${aptId})`,
                produto_id: prod.id
              } as InsumoMovimento);
            }
          }

          // Se for máquina de Impressão, deduzir tintas CMYK
          const maquina = maquinas.find(m => m.id === apt.maquina_id);
          if (maquina && maquina.tipo === 'Impressão') {
            const tintasOffset = insumos.filter(i => i.tipo === 'tinta');
            for (const tinta of tintasOffset) {
              const tintaConsumo = Number((apt.quantidade_produzida * 0.0002).toFixed(3));
              const novoEstoqueTinta = Math.max(0, Number((tinta.estoque_atual - tintaConsumo).toFixed(3)));
              await updateDoc(doc(db, 'insumos', tinta.id), { estoque_atual: novoEstoqueTinta });
            }
          }
        }

        // 3.5. Deduzir folhas de insumos caso o apontamento inclua folhas utilizadas
        if (apt.quantidade_folhas_utilizadas && apt.insumo_folhas_id) {
          const insumoFolha = insumos.find(i => i.id === apt.insumo_folhas_id);
          if (insumoFolha) {
            const novoEstoqueFolhas = Math.max(0, Number((insumoFolha.estoque_atual - apt.quantidade_folhas_utilizadas).toFixed(4)));
            await updateDoc(doc(db, 'insumos', insumoFolha.id), { estoque_atual: novoEstoqueFolhas });

            const randSuffix = Math.floor(Math.random() * 1000);
            const movId = `mov_${Date.now()}_sheet_${randSuffix}`;
            const maquinaObj = maquinas.find(m => m.id === apt.maquina_id);
            const maqNome = maquinaObj ? maquinaObj.nome : apt.maquina_id;
            await setDoc(doc(db, 'movimentos', movId), {
              id: movId,
              insumo_id: insumoFolha.id,
              tipo: 'saida',
              quantidade: apt.quantidade_folhas_utilizadas,
              data: new Date().toISOString().split('T')[0],
              motivo: `Baixa automática de folhas no Apontamento da máquina ${maqNome} (Ref. Apont. #${aptId})`,
              produto_id: apt.produto_id
            } as InsumoMovimento);
          }
        }

        // 4. Promover Kanban para 'em_processo' caso estivesse em fila
        const kbCard = kanban.find(k => k.produto_id === apt.produto_id && k.maquina_id === apt.maquina_id && k.status === 'aguardando');
        if (kbCard) {
          await updateDoc(doc(db, 'kanban', kbCard.id), { status: 'em_processo' });
        }

        addNotification('success', `Apontamento de ${apt.quantidade_produzida} unidades efetuado com sucesso no Firebase.`);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `apontamentos/${apt.maquina_id}`);
      }
    };

    processApontamento();
    return { success: true, message: 'Apontamento registrado com sucesso!' };
  };

  // Excluir Apontamento e Estornar Estoque (somente admin/gerência)
  const excluirApontamento = async (id: string) => {
    try {
      const apt = apontamentos.find(a => a.id === id);
      if (!apt) {
        addNotification('error', 'Apontamento não encontrado.');
        return;
      }

      // 1. Deletar apontamento do Firestore
      await deleteDoc(doc(db, 'apontamentos', id));

      // 2. Estornar insumo de estoque (Múltiplos Insumos suportados)
      const prod = produtos.find(p => p.id === apt.produto_id);
      if (prod) {
        const listInsumosFicha = prod.insumos_ficha && prod.insumos_ficha.length > 0
          ? prod.insumos_ficha
          : [{
              insumo_id: '',
              nome: prod.material,
              fator_consumo: prod.fator_consumo,
              rendimento: prod.fator_consumo > 0 ? 1 / prod.fator_consumo : 0
            }];

        for (const itemFicha of listInsumosFicha) {
          if (!itemFicha.nome) continue;
          const insumoPrincipal = insumos.find(i => i.nome === itemFicha.nome || i.id === itemFicha.insumo_id || i.codigo === itemFicha.insumo_id);
          if (insumoPrincipal) {
            const pesoConsumido = Number((apt.quantidade_produzida * itemFicha.fator_consumo).toFixed(4));
            const novoEstoque = Number((insumoPrincipal.estoque_atual + pesoConsumido).toFixed(4));

            await updateDoc(doc(db, 'insumos', insumoPrincipal.id), { estoque_atual: novoEstoque });

            // Gravar estorno na movimentação
            const randSuffix = Math.floor(Math.random() * 1000);
            const movId = `mov_${Date.now()}_${randSuffix}`;
            await setDoc(doc(db, 'movimentos', movId), {
              id: movId,
              insumo_id: insumoPrincipal.id,
              tipo: 'entrada',
              quantidade: pesoConsumido,
              data: new Date().toISOString().split('T')[0],
              motivo: `Devolução por Estorno de Apontamento #${id}`,
              produto_id: prod.id
            } as InsumoMovimento);
          }
        }

        // Estornar tintas se for impressão
        const maquina = maquinas.find(m => m.id === apt.maquina_id);
        if (maquina && maquina.tipo === 'Impressão') {
          const tintasOffset = insumos.filter(i => i.tipo === 'tinta');
          for (const tinta of tintasOffset) {
            const tintaConsumo = Number((apt.quantidade_produzida * 0.0002).toFixed(3));
            const novoEstoqueTinta = Number((tinta.estoque_atual + tintaConsumo).toFixed(3));
            await updateDoc(doc(db, 'insumos', tinta.id), { estoque_atual: novoEstoqueTinta });
          }
        }
      }

      // Estornar folhas de insumos caso o apontamento excluído possua folhas utilizadas
      if (apt.quantidade_folhas_utilizadas && apt.insumo_folhas_id) {
        const insumoFolha = insumos.find(i => i.id === apt.insumo_folhas_id);
        if (insumoFolha) {
          const novoEstoqueFolhas = Number((insumoFolha.estoque_atual + apt.quantidade_folhas_utilizadas).toFixed(4));
          await updateDoc(doc(db, 'insumos', insumoFolha.id), { estoque_atual: novoEstoqueFolhas });

          const randSuffix = Math.floor(Math.random() * 1000);
          const movId = `mov_${Date.now()}_sheet_${randSuffix}`;
          await setDoc(doc(db, 'movimentos', movId), {
            id: movId,
            insumo_id: insumoFolha.id,
            tipo: 'entrada',
            quantidade: apt.quantidade_folhas_utilizadas,
            data: new Date().toISOString().split('T')[0],
            motivo: `Devolução por Estorno de Apontamento #${id} (Folhas Utilizadas)`,
            produto_id: apt.produto_id
          } as InsumoMovimento);
        }
      }

      addNotification('success', `Apontamento #${id} estornado e excluído com sucesso!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `apontamentos/${id}/excluir`);
    }
  };

  // Entrada de Estoque Manual
  const registrarEntradaEstoque = async (insumoId: string, qtd: number, fornecedor: string, motivo: string) => {
    const insumo = insumos.find(i => i.id === insumoId);
    if (!insumo) return;

    const novoEstoque = Number((insumo.estoque_atual + qtd).toFixed(2));
    const movId = `mov_${Date.now()}`;
    const newMov: InsumoMovimento = {
      id: movId,
      insumo_id: insumoId,
      tipo: 'entrada',
      quantidade: qtd,
      data: new Date().toISOString().split('T')[0],
      motivo: motivo || `Entrada manual (${fornecedor})`
    };

    // Optimistic local update
    setInsumos(prev => prev.map(i => i.id === insumoId ? { ...i, estoque_atual: novoEstoque } : i));
    setMovimentos(prev => [...prev, newMov]);

    try {
      await updateDoc(doc(db, 'insumos', insumoId), { estoque_atual: novoEstoque });
      await setDoc(doc(db, 'movimentos', movId), newMov);

      addNotification('success', `Estoque abastecido: +${qtd} ${insumo.unidade}.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `insumos/${insumoId}/entrada`);
    }
  };

  // Saída de Estoque Manual
  const registrarSaidaEstoque = (insumoId: string, qtd: number, motivo: string): boolean => {
    const insumo = insumos.find(i => i.id === insumoId);
    if (!insumo || qtd > insumo.estoque_atual) {
      addNotification('error', 'Saldo inadequado para essa operação.');
      return false;
    }

    const novoEstoque = Number((insumo.estoque_atual - qtd).toFixed(2));
    const movId = `mov_${Date.now()}`;
    const newMov: InsumoMovimento = {
      id: movId,
      insumo_id: insumoId,
      tipo: 'saida',
      quantidade: qtd,
      data: new Date().toISOString().split('T')[0],
      motivo: motivo || 'Saída manual'
    };

    // Optimistic local update
    setInsumos(prev => prev.map(i => i.id === insumoId ? { ...i, estoque_atual: novoEstoque } : i));
    setMovimentos(prev => [...prev, newMov]);

    const processSaida = async () => {
      try {
        await updateDoc(doc(db, 'insumos', insumoId), { estoque_atual: novoEstoque });
        await setDoc(doc(db, 'movimentos', movId), newMov);

        addNotification('warning', `Registrada retirada manual de estoque.`);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `insumos/${insumoId}/saida`);
      }
    };

    processSaida();
    return true;
  };

  // Cadastro de Novo Insumo
  const adicionarInsumo = async (insumo: Omit<Insumo, 'id'>) => {
    const newId = (insumo.codigo?.trim().toLowerCase() || `ins_${Date.now()}`).replace(/[\/\\]/g, '-');
    const newInsumo: Insumo = { ...insumo, id: newId };
    setInsumos(prev => [...prev, newInsumo]);
    try {
      await setDoc(doc(db, 'insumos', newId), cleanUndefined(newInsumo));
      addNotification('success', `Material "${newInsumo.nome}" adicionado.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `insumos/${newId}`);
    }
  };

  const excluirInsumo = async (id: string) => {
    setInsumos(prev => prev.filter(i => i.id !== id));
    try {
      await deleteDoc(doc(db, 'insumos', id));
      addNotification('warning', `Insumo deletado do depósito.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `insumos/${id}`);
    }
  };

  const editarInsumo = async (updated: Insumo) => {
    setInsumos(prev => prev.map(i => i.id === updated.id ? updated : i));
    try {
      await setDoc(doc(db, 'insumos', updated.id), cleanUndefined(updated));
      addNotification('success', `Suprimento "${updated.nome}" atualizado.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `insumos/${updated.id}`);
    }
  };

  // Catálogo de Embalagens / Fichas Técnicas Reutilizáveis
  const adicionarProdutoModelo = async (modelo: Omit<ProdutoModelo, 'id'>) => {
    const existe = produtosModelos.some(m => m.descricao.toLowerCase().trim() === modelo.descricao.toLowerCase().trim());
    if (existe) {
      addNotification('warning', `Este modelo já se encontra em nosso catálogo de engenharia.`);
      return;
    }

    const newId = (modelo.codigo?.trim().toLowerCase() || `mod_${Date.now()}`).replace(/[\/\\]/g, '-');
    const newModelo: ProdutoModelo = { ...modelo, id: newId };
    setProdutosModelos(prev => [...prev, newModelo]);
    try {
      await setDoc(doc(db, 'produtosModelos', newId), cleanUndefined(newModelo));
      addNotification('success', `Ficha técnica de "${modelo.descricao}" gravada com sucesso.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `produtosModelos/${newId}`);
    }
  };

  const excluirProdutoModelo = async (modeloId: string) => {
    setProdutosModelos(prev => prev.filter(m => m.id !== modeloId));
    try {
      await deleteDoc(doc(db, 'produtosModelos', modeloId));
      addNotification('warning', 'Ficha técnica excluída do catálogo.');
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `produtosModelos/${modeloId}`);
    }
  };

  const editarProdutoModelo = async (updated: ProdutoModelo) => {
    const oldModelo = produtosModelos.find(m => m.id === updated.id);
    const oldDesc = oldModelo ? oldModelo.descricao : updated.descricao;

    setProdutosModelos(prev => prev.map(m => m.id === updated.id ? updated : m));
    
    // Also update matched products locally
    const matchingProdutos = produtos.filter(p => p.descricao === oldDesc);
    if (matchingProdutos.length > 0) {
      setProdutos(prev => prev.map(prod => {
        if (prod.descricao !== oldDesc) return prod;
        let newIdx = prod.maquina_atual_idx;
        if (newIdx > updated.roteiro.length) {
          newIdx = updated.roteiro.length;
        }
        return {
          ...prod,
          descricao: updated.descricao,
          dimensoes: updated.dimensoes,
          material: updated.material,
          fator_consumo: updated.fator_consumo,
          roteiro: updated.roteiro,
          cores_quantidade: updated.cores_quantidade,
          cores_frente: updated.cores_frente,
          cores_verso: updated.cores_verso,
          pantones: updated.pantones,
          tipo_produto: updated.tipo_produto,
          contatos_faca: updated.contatos_faca,
          medida_faca: updated.medida_faca,
          pontos_cola: updated.pontos_cola,
          insumos_ficha: updated.insumos_ficha,
          faca_pdf_url: updated.faca_pdf_url,
          faca_pdf_nome: updated.faca_pdf_nome,
          arte_pdf_url: updated.arte_pdf_url,
          arte_pdf_nome: updated.arte_pdf_nome,
          grade_itens: updated.grade_itens,
          informacoes_importantes: updated.informacoes_importantes,
          observacoes: updated.observacoes,
          maquina_atual_idx: newIdx
        };
      }));
    }

    try {
      await setDoc(doc(db, 'produtosModelos', updated.id), cleanUndefined(updated));
      addNotification('success', `Modelo "${updated.descricao}" atualizado.`);

      // Buscar produtos correspondentes nos pedidos emitidos (por descrição antiga do modelo)
      if (matchingProdutos.length > 0) {
        let updatedCount = 0;
        for (const prod of matchingProdutos) {
          const updatedProd: Partial<Produto> = {
            descricao: updated.descricao,
            dimensoes: updated.dimensoes,
            material: updated.material,
            fator_consumo: updated.fator_consumo,
            roteiro: updated.roteiro,
          };

          if (updated.cores_quantidade !== undefined) updatedProd.cores_quantidade = updated.cores_quantidade;
          if (updated.cores_frente !== undefined) updatedProd.cores_frente = updated.cores_frente;
          if (updated.cores_verso !== undefined) updatedProd.cores_verso = updated.cores_verso;
          if (updated.pantones !== undefined) updatedProd.pantones = updated.pantones;
          if (updated.tipo_produto !== undefined) updatedProd.tipo_produto = updated.tipo_produto;
          if (updated.contatos_faca !== undefined) updatedProd.contatos_faca = updated.contatos_faca;
          if (updated.medida_faca !== undefined) updatedProd.medida_faca = updated.medida_faca;
          if (updated.pontos_cola !== undefined) updatedProd.pontos_cola = updated.pontos_cola;
          if (updated.insumos_ficha !== undefined) updatedProd.insumos_ficha = updated.insumos_ficha;
          if (updated.faca_pdf_url !== undefined) updatedProd.faca_pdf_url = updated.faca_pdf_url;
          if (updated.faca_pdf_nome !== undefined) updatedProd.faca_pdf_nome = updated.faca_pdf_nome;
          if (updated.arte_pdf_url !== undefined) updatedProd.arte_pdf_url = updated.arte_pdf_url;
          if (updated.arte_pdf_nome !== undefined) updatedProd.arte_pdf_nome = updated.arte_pdf_nome;
          if (updated.grade_itens !== undefined) updatedProd.grade_itens = updated.grade_itens;
          if (updated.informacoes_importantes !== undefined) updatedProd.informacoes_importantes = updated.informacoes_importantes;
          if (updated.observacoes !== undefined) updatedProd.observacoes = updated.observacoes;
 
          // Ajustar maquina_atual_idx se a nova rota for menor
          let newIdx = prod.maquina_atual_idx;
          if (newIdx > updated.roteiro.length) {
            newIdx = updated.roteiro.length;
          }
          if (newIdx !== prod.maquina_atual_idx) {
            updatedProd.maquina_atual_idx = newIdx;
          }
 
          await updateDoc(doc(db, 'produtos', prod.id), cleanUndefined(updatedProd));
          updatedCount++;
        }
        if (updatedCount > 0) {
          addNotification('info', `${updatedCount} produto(s) nos pedidos emitidos foram atualizados para sincronizar com as alterações.`);
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `produtosModelos/${updated.id}`);
    }
  };

  // CRUD de Orçamentos Salvos
  const adicionarOrcamentoSalvo = async (orc: Omit<OrcamentoSalvo, 'id' | 'data_criacao'>) => {
    const newId = `orc_${Date.now()}`;
    const newOrc: OrcamentoSalvo = {
      ...orc,
      id: newId,
      data_criacao: new Date().toISOString()
    };
    setOrcamentosSalvos(prev => [...prev, newOrc]);
    try {
      await setDoc(doc(db, 'orcamentosSalvos', newId), cleanUndefined(newOrc));
      addNotification('success', `Orçamento de "${orc.descricao}" salvo com sucesso.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `orcamentosSalvos/${newId}`);
    }
  };

  const excluirOrcamentoSalvo = async (id: string) => {
    setOrcamentosSalvos(prev => prev.filter(o => o.id !== id));
    try {
      await deleteDoc(doc(db, 'orcamentosSalvos', id));
      addNotification('warning', `Orçamento removido do histórico.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `orcamentosSalvos/${id}`);
    }
  };

  const editarOrcamentoSalvo = async (updated: OrcamentoSalvo) => {
    setOrcamentosSalvos(prev => prev.map(o => o.id === updated.id ? updated : o));
    try {
      await setDoc(doc(db, 'orcamentosSalvos', updated.id), cleanUndefined(updated));
      addNotification('success', `Orçamento "${updated.descricao}" atualizado com sucesso.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `orcamentosSalvos/${updated.id}`);
    }
  };

  // Métricas OEE Calculadas em tempo real pelas frentes Firebase
  const getOEEParaMaquina = (maquinaId: string) => {
    const aptsDaMaquina = apontamentos.filter(a => a.maquina_id === maquinaId);
    const maquina = maquinas.find(m => m.id === maquinaId);
    
    if (!aptsDaMaquina.length || !maquina) {
      return { oee: 85, disp: 90, perf: 95, qual: 98, tempoAtivo: 0, tempoParado: 0, produzido: 0, refugo: 0 };
    }

    let tempoTotalTrabalhado = 0; 
    let tempoParadoTotal = 0; 
    let totalProduzido = 0;
    let totalRefugo = 0;
    let capacidadeTeoricaAcumulada = 0;

    aptsDaMaquina.forEach(a => {
      const msDiff = new Date(a.data_fim).getTime() - new Date(a.data_inicio).getTime();
      const minTrabalhados = Math.max(0, Math.floor(msDiff / 60000));
      tempoTotalTrabalhado += minTrabalhados;
      const tParado = Number(a.tempo_parado || 0);
      tempoParadoTotal += tParado;
      totalProduzido += Number(a.quantidade_produzida || 0);
      totalRefugo += Number(a.quantidade_refugo || 0);

      // Metrificação de capacidade teórica específica por tipo de produto apontado
      const aAtivoHoras = Math.max(0, minTrabalhados - tParado) / 60;
      const prodInApt = produtos.find(p => p.id === a.produto_id);
      let capHora = maquina.capacidade_hora || 5000;
      if (prodInApt) {
        if (prodInApt.tipo_produto === 'bolacha') {
          capHora = maquina.capacidade_bolacha || (maquina.capacidade_hora * 2) || 10000;
        } else if (prodInApt.tipo_produto === 'manual') {
          capHora = maquina.capacidade_manual || Math.round(maquina.capacidade_hora / 2) || 2500;
        } else {
          capHora = maquina.capacidade_embalagem || maquina.capacidade_hora || 5000;
        }

        if (maquina.tipo_velocidade === 'folha') {
          capHora = capHora * (prodInApt.contatos_faca || 1);
        }
      }
      capacidadeTeoricaAcumulada += aAtivoHoras * capHora;
    });

    if (tempoTotalTrabalhado === 0) {
      return { oee: 85, disp: 90, perf: 95, qual: 98, tempoAtivo: 0, tempoParado: 0, produzido: 0, refugo: 0 };
    }

    const tempoAtivo = Math.max(0, tempoTotalTrabalhado - tempoParadoTotal);
    const disp = tempoTotalTrabalhado > 0 ? (tempoAtivo / tempoTotalTrabalhado) * 100 : 0;

    let perf = capacidadeTeoricaAcumulada > 0 ? (totalProduzido / capacidadeTeoricaAcumulada) * 100 : 100;
    if (perf > 100) perf = 100; 

    const totalBom = Math.max(0, totalProduzido - totalRefugo);
    const qual = totalProduzido > 0 ? (totalBom / totalProduzido) * 100 : 100;

    const oee = (disp / 100) * (perf / 100) * (qual / 100) * 100;

    return {
      oee: Math.round(oee),
      disp: Math.round(disp),
      perf: Math.round(perf),
      qual: Math.round(qual),
      tempoAtivo,
      tempoParado: tempoParadoTotal,
      produzido: totalProduzido,
      refugo: totalRefugo
    };
  };

  // Semeador / Inicializador de dados de demonstração no Firebase
  const resetarParaDadosPadrao = async () => {
    try {
      addNotification('info', 'Sincronizando dados padrão no Firebase Firestore...');

      // 0. Usuários padrão de homologação (pré-aprovados com permissões)
      const defaultUsersToSeed: User[] = [
        {
          id: 'usr1',
          nome: 'Homero Neto (PPCP Admin)',
          email: 'admin@homero.com.br',
          role: 'admin',
          aprovado: true,
          permissoes: {
            dashboard: 'escrever',
            pedidos: 'escrever',
            custos: 'escrever',
            kanban: 'escrever',
            apontamento: 'escrever',
            estoque: 'escrever',
            cadastros: 'escrever'
          }
        },
        {
          id: 'usr2',
          nome: 'Sérgio Ramos (Supervisor)',
          email: 'supervisor@homero.com.br',
          role: 'supervisor',
          turno: 'Manhã',
          aprovado: true,
          permissoes: {
            dashboard: 'escrever',
            pedidos: 'escrever',
            custos: 'ler',
            kanban: 'escrever',
            apontamento: 'escrever',
            estoque: 'escrever',
            cadastros: 'ler'
          }
        },
        {
          id: 'usr3',
          nome: 'Marcos Operador (Corte)',
          email: 'operador1@homero.com.br',
          role: 'operador',
          turno: 'Manhã',
          aprovado: true,
          permissoes: {
            dashboard: 'ler',
            pedidos: 'nenhum',
            custos: 'nenhum',
            kanban: 'escrever',
            apontamento: 'escrever',
            estoque: 'ler',
            cadastros: 'nenhum'
          }
        },
        {
          id: 'usr4',
          nome: 'Carla Aluna (Coladeira)',
          email: 'operador2@homero.com.br',
          role: 'operador',
          turno: 'Tarde',
          aprovado: true,
          permissoes: {
            dashboard: 'ler',
            pedidos: 'nenhum',
            custos: 'nenhum',
            kanban: 'escrever',
            apontamento: 'escrever',
            estoque: 'ler',
            cadastros: 'nenhum'
          }
        },
        {
          id: 'usr5',
          nome: 'Carlos Vendedor (Comercial)',
          email: 'vendedor@homero.com.br',
          role: 'vendedor',
          aprovado: true,
          permissoes: defaultPermsVendedor
        }
      ];

      for (const u of defaultUsersToSeed) {
        await setDoc(doc(db, 'usuarios', u.email.toLowerCase().trim()), u);
      }

      // 1. Clientes
      for (const cli of INITIAL_CLIENTES) {
        await setDoc(doc(db, 'clientes', cli.id), cli);
      }

      // 2. Operadores
      for (const op of INITIAL_OPERADORES) {
        await setDoc(doc(db, 'operadores', op.id), op);
      }

      // 3. Máquinas
      for (const maq of INITIAL_MAQUINAS) {
        await setDoc(doc(db, 'maquinas', maq.id), {
          ...maq,
          status_atual: maq.id === 'm1' ? 'ociosa' : maq.id === 'm2' ? 'ociosa' : 'ociosa'
        });
      }

      // 4. Insumos/Estoque
      for (const ins of INITIAL_INSUMOS) {
        await setDoc(doc(db, 'insumos', ins.id), ins);
      }

      // 5. Modelos de Fichas Técnicas
      const defaultModelos: ProdutoModelo[] = [
        {
          id: 'mod1',
          descricao: 'Caixa de Trufas Recheadas Imperial (Duplex)',
          dimensoes: '22x14x6 cm',
          material: 'Papel Cartão Duplex 250g (Folhas)',
          fator_consumo: 0.08,
          cores_quantidade: 4,
          cores_frente: 4,
          cores_verso: 0,
          roteiro: ['m1', 'm2', 'm3']
        },
        {
          id: 'mod2',
          descricao: 'Estojo Batom Matte Luxo (Duplex)',
          dimensoes: '4x4x10 cm',
          material: 'Papel Cartão Duplex 250g (Folhas)',
          fator_consumo: 0.02,
          cores_quantidade: 3,
          cores_frente: 3,
          cores_verso: 0,
          roteiro: ['m1', 'm2', 'm3']
        },
        {
          id: 'mod3',
          descricao: 'Cartucho Café Imperial Espresso 1kg (Triplex)',
          dimensoes: '15x10x28 cm',
          material: 'Papel Cartão Triplex 300g (Folhas)',
          fator_consumo: 0.12,
          cores_quantidade: 2,
          cores_frente: 2,
          cores_verso: 0,
          roteiro: ['m1', 'm2', 'm3']
        }
      ];
      for (const mod of defaultModelos) {
        await setDoc(doc(db, 'produtosModelos', mod.id), mod);
      }

      // 6. Pedidos
      for (const ped of INITIAL_PEDIDOS) {
        await setDoc(doc(db, 'pedidos', ped.id), ped);
      }

      // 7. Produtos
      for (const prod of INITIAL_PRODUTOS) {
        await setDoc(doc(db, 'produtos', prod.id), prod);
      }

      // 8. Kanban
      for (const item of INITIAL_KANBAN) {
        await setDoc(doc(db, 'kanban', item.id), item);
      }

      // 9. Apontamentos
      for (const apt of INITIAL_APONTAMENTOS) {
        await setDoc(doc(db, 'apontamentos', apt.id), apt);
      }

      // 10. Movimentos de Estoque
      for (const mov of INITIAL_MOVIMENTOS) {
        await setDoc(doc(db, 'movimentos', mov.id), mov);
      }

      // 11. Custos Gerais
      for (const cg of INITIAL_CUSTOS_GERAIS) {
        await setDoc(doc(db, 'custosGerais', cg.id), cg);
      }

      // 12. Impostos/Taxas
      await setDoc(doc(db, 'settings', 'taxas'), DEFAULT_TAXAS_PRESUMIDO);

      addNotification('success', 'Base de dados Firestore populada com dados iniciais com sucesso!');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'seeder/reset');
    }
  };

  const limparBancoDeDados = async () => {
    try {
      addNotification('warning', 'Limpando coleções do Firebase...');

      // Limpa dados locais removendo todos os registros conhecidos
      for (const c of clientes) await deleteDoc(doc(db, 'clientes', c.id));
      for (const p of pedidos) await deleteDoc(doc(db, 'pedidos', p.id));
      for (const pr of produtos) await deleteDoc(doc(db, 'produtos', pr.id));
      for (const m of produtosModelos) await deleteDoc(doc(db, 'produtosModelos', m.id));
      for (const maq of maquinas) await deleteDoc(doc(db, 'maquinas', maq.id));
      for (const op of operadores) await deleteDoc(doc(db, 'operadores', op.id));
      for (const ins of insumos) await deleteDoc(doc(db, 'insumos', ins.id));
      for (const apt of apontamentos) await deleteDoc(doc(db, 'apontamentos', apt.id));
      for (const k of kanban) await deleteDoc(doc(db, 'kanban', k.id));
      for (const mov of movimentos) await deleteDoc(doc(db, 'movimentos', mov.id));
      for (const cg of custosGerais) await deleteDoc(doc(db, 'custosGerais', cg.id));

      addNotification('success', 'Todas as tabelas do PCP foram esvaziadas no Firebase.');
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'backup/clear');
    }
  };

  return (
    <PCPContext.Provider value={{
      currentUser,
      setCurrentUser,
      usersList,
      dbUsers,
      salvarUsuario,
      excluirUsuario,
      login,
      logout,
      loginWithGoogle,
      clientes,
      pedidos,
      produtos,
      maquinas,
      operadores,
      insumos,
      apontamentos,
      kanban,
      movimentos,
      notifications,
      custosGerais,
      taxasPresumido,
      adicionarCliente,
      excluirCliente,
      editarCliente,
      adicionarOperador,
      excluirOperador,
      editarOperador,
      adicionarCustoGeral,
      excluirCustoGeral,
      atualizarTaxasPresumido,
      adicionarMaquina,
      excluirMaquina,
      vincularOperadorMaquina,
      editarMaquina,
      adicionarPedido,
      excluirPedido,
      cancelarPedido,
      liberarPedidoParaProducao,
      editarPedidoPrioridadeSequencia,
      moverCardKanban,
      alterarOrdemLote,
      atualizarCheckInsumosKanban,
      registrarApontamento,
      excluirApontamento,
      verificarSobreposicaoMaquina,
      registrarEntradaEstoque,
      registrarSaidaEstoque,
      adicionarInsumo,
      excluirInsumo,
      editarInsumo,
      produtosModelos,
      adicionarProdutoModelo,
      excluirProdutoModelo,
      editarProdutoModelo,
      orcamentosSalvos,
      adicionarOrcamentoSalvo,
      excluirOrcamentoSalvo,
      editarOrcamentoSalvo,
      getOEEParaMaquina,
      notificationsClear,
      addNotification,
      resetarParaDadosPadrao,
      limparBancoDeDados,
      loadingSnapshot,
      isQuotaExceeded,
      kanbanColIds,
      salvarSequenciaKanban
    }}>
      {children}
    </PCPContext.Provider>
  );
};

export const usePCP = () => {
  const context = useContext(PCPContext);
  if (context === undefined) {
    throw new Error('usePCP deve ser usado dentro de um PCPProvider');
  }
  return context;
};
