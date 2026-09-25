import React, { useState } from 'react';
import { usePCP } from '../context/PCPContext';
import { LogIn, Key, Mail, Lock } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, loginWithGoogle } = usePCP();
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Por favor, informe seu e-mail de acesso corporativo.');
      return;
    }
    
    setErrorMsg('');
    setIsLoading(true);
    
    try {
      const result = await login(email);
      if (!result.success) {
        setErrorMsg(result.message);
      }
    } catch (err) {
      setErrorMsg('Falha ao conectar com o servidor de autenticação.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full flex-col items-center justify-center bg-[#f8fafc] px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl ring-1 ring-black/5 md:p-8">
        
        {/* LOGO E SEÇÃO DE APRESENTAÇÃO */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0f172a] text-white font-mono text-2xl font-black shadow-lg">
            H
          </div>
          <h2 className="mt-5 font-sans text-xl font-bold tracking-tight text-[#0f172a]">Homero Embalagens</h2>
          <p className="mt-2 font-sans text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Painel de Planejamento e Controle (PCP)
          </p>
          <div className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-[10px] font-semibold text-slate-600 border border-slate-100 max-w-fit mx-auto">
            <Lock size={12} className="text-slate-400" />
            Acesso Restrito a Colaboradores
          </div>
        </div>

        {window.location.search.includes('vendedor=true') && (
          <div className="mt-5 rounded-xl bg-purple-50 p-3.5 text-xs font-semibold text-purple-900 border border-purple-200 space-y-1">
            <p className="font-extrabold flex items-center gap-1.5 text-purple-950">
              <span className="bg-purple-600 text-white text-[9px] font-mono px-1.5 py-0.5 rounded uppercase">Acesso Vendedor</span>
              Portal de Preços Orçados
            </p>
            <p className="text-[11px] text-purple-700 font-normal">
              Você está acessando a visão exclusiva para vendedores. Faça login abaixo para visualizar fotos, dimensões, materiais e tabela de preços por lotes.
            </p>
          </div>
        )}

        {/* ERROS */}
        {errorMsg && (
          <div className="mt-5 rounded-xl bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 border border-rose-100">
            {errorMsg}
          </div>
        )}

        {/* FORMULÁRIO */}
        <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block font-sans text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              E-mail de Operação Cadastrado
            </label>
            <div className="relative rounded-lg shadow-2xs">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Mail size={15} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome.sobrenome@homero.com.br"
                className="block w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-xs placeholder:text-slate-400 focus:border-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#0f172a] bg-slate-50/30 transition-all font-medium text-slate-800"
                id="login-email-input"
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f172a] py-3 font-sans text-xs font-semibold text-white hover:bg-slate-800 transition-all cursor-pointer shadow-md disabled:bg-slate-400"
            id="login-submit-btn"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verificando...
              </span>
            ) : (
              <>
                <LogIn size={15} />
                Entrar no PCP
              </>
            )}
          </button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2.5 font-sans text-[10px] font-bold text-slate-400">Ou autenticação Google</span>
            </div>
          </div>

          <button
            type="button"
            onClick={loginWithGoogle}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 font-sans text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-3xs hover:border-slate-300"
            id="login-google-btn"
            disabled={isLoading}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M21.35,11.1H12v2.7h5.38c-.24,1.28-.96,2.37-2.05,3.1l3.2,2.48c1.87-1.72,2.95-4.25,2.95-7.22l-.18-1.06Z" fill="#4285f4"/>
              <path d="M12,20.6c2.43,0,4.47-.8,5.96-2.2l-3.2-2.48c-.89,.6-2.03,.95-3.1,.95-2.39,0-4.41-1.61-5.13-3.78l-3.32,2.57c1.48,2.94,4.52,4.94,8.79,4.94Z" fill="#34a853"/>
              <path d="M6.87,13.09c-.18-.54-.28-1.12-.28-1.72s.1-1.18,.28-1.72l-3.32-2.57c-.63,1.26-.98,2.69-.98,4.29s.35,3.03,.98,4.29l3.32-2.57Z" fill="#fbbc05"/>
              <path d="M12,6.13c1.32,0,2.51,.45,3.44,1.34l2.58-2.58C16.46,3.42,14.42,2.6,12,2.6,7.73,2.6,4.69,4.6,3.21,7.54l3.32,2.57c.72-2.17,2.74-3.78,5.13-3.78Z" fill="#ea4335"/>
            </svg>
            Entrar com o Google
          </button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 text-center">Atalhos de Acesso Rápido (Demonstração):</p>
          <div className="flex gap-2 justify-center flex-wrap">
            <button
              type="button"
              onClick={() => { setEmail('vendedor@homero.com.br'); login('vendedor@homero.com.br'); }}
              className="text-[10px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
            >
              Vendedor Comercial
            </button>
            <button
              type="button"
              onClick={() => { setEmail('fpjadm@gmail.com'); login('fpjadm@gmail.com'); }}
              className="text-[10px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
            >
              PPCP Admin
            </button>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4 text-center">
          <p className="font-sans text-[10px] text-slate-400 font-medium leading-relaxed">
            Caso seu e-mail não esteja cadastrado, tente fazer login para encaminhar uma solicitação de aprovação ao administrador do sistema.
          </p>
        </div>

      </div>

      <div className="mt-8 text-center font-sans text-[9px] text-slate-400 uppercase tracking-widest font-bold max-w-sm" id="login-footer-credits">
        Desenvolvido por Francisco P. Junior • Todos os direitos reservados
      </div>
    </div>
  );
};
