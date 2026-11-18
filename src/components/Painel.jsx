import { useState } from 'react';
import { configurado, supabase } from '../supabase';
import Login from './Login';
import AbaFoco from './AbaFoco';
import AbaHoje from './AbaHoje';

export default function Painel({ session, pomodoro, hoje, fechando }) {
  const [aba, setAba] = useState('foco');
  const recolher = () => window.desktop?.recolher();

  const nome = hoje.perfil?.nome;

  return (
    <div className={fechando ? 'painel fechando' : 'painel'}>
      {/* faixa de cima (saudação + abas) separada do conteúdo, como o rodapé */}
      <div className="painel-faixa-topo">
        <header className="painel-topo">
          <img src="./logo.png" className="painel-logo" alt="" />
          <div className="painel-titulo">
            <strong>{session ? `Olá${nome ? `, ${nome}` : ''}!` : 'FocoAprova'}</strong>
            <span>{session ? 'Bora manter o foco hoje.' : 'Seu companheiro de estudo no PC'}</span>
          </div>
          <button
            className="botao-icone"
            onClick={recolher}
            title="Recolher (Esc ou Ctrl+Shift+Espaço)"
            aria-label="Recolher"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 15l6-6 6 6" />
            </svg>
          </button>
        </header>

        {configurado && session && (
          <nav className="abas">
            <button className={aba === 'foco' ? 'ativa' : ''} onClick={() => setAba('foco')}>
              Foco
            </button>
            <button className={aba === 'hoje' ? 'ativa' : ''} onClick={() => setAba('hoje')}>
              Hoje
            </button>
          </nav>
        )}
      </div>

      {!configurado ? (
        <div className="aviso">
          Falta configurar o Supabase. Crie o arquivo <code>.env</code> a partir do <code>.env.example</code> com os
          mesmos valores do app e rode de novo.
        </div>
      ) : !session ? (
        <Login />
      ) : (
        <main className="painel-conteudo">
          {aba === 'foco' ? (
            <AbaFoco pomodoro={pomodoro} />
          ) : (
            <AbaHoje hoje={hoje} irParaTimer={() => setAba('foco')} />
          )}
        </main>
      )}

      {/* o app não aparece na barra de tarefas, então o "Fechar" fica sempre à vista aqui */}
      <footer className="painel-rodape">
        <button className="botao botao-web" onClick={() => window.desktop?.abrirWeb()} title="focoaprova.vercel.app">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 4h6v6" />
            <path d="M20 4l-9 9" />
            <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
          </svg>
          Abrir na web
        </button>
        <div className="rodape-acoes">
          {session && (
            <button className="link" onClick={() => supabase.auth.signOut()}>
              Sair da conta
            </button>
          )}
          <button className="link" onClick={() => window.desktop?.sair()}>
            Fechar o app
          </button>
        </div>
      </footer>
    </div>
  );
}
