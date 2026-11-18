import { useEffect } from 'react';
import { formatarTimer } from '../lib/data';

// avisa o Electron pra parar de deixar o clique passar enquanto o mouse está na pílula
const mouseNaPilula = (dentro) => window.desktop?.mouseNaPilula(dentro);

// pílula fechada no topo da tela: só logo, luz de status e o tempo.
// Clicar em qualquer lugar abre o painel; os controles ficam lá dentro.
export default function Pilula({ session, pomodoro }) {
  const abrir = () => window.desktop?.expandir();

  // se o cursor sair da janela rápido demais, o mouseleave da pílula pode não vir
  useEffect(() => {
    const saiu = () => mouseNaPilula(false);
    document.addEventListener('mouseleave', saiu);
    return () => document.removeEventListener('mouseleave', saiu);
  }, []);

  let estado = 'parado';
  let texto = 'FocoAprova';

  if (session) {
    const { modo, rodando, segundos, restante, config } = pomodoro;
    const emAndamento = rodando || restante < config.focoMin * 60 || modo !== 'foco';
    if (rodando) estado = modo === 'foco' ? 'foco' : 'pausa';
    if (emAndamento) texto = formatarTimer(segundos);
  }

  return (
    <div className="pilula-area">
      <div
        className={`pilula pilula-${estado}`}
        onClick={abrir}
        onContextMenu={(e) => {
          e.preventDefault();
          window.desktop?.menu(); // botão direito: menu com "Fechar o FocoAprova"
        }}
        onMouseEnter={() => mouseNaPilula(true)}
        onMouseLeave={() => mouseNaPilula(false)}
        title={session ? 'Abrir (Ctrl+Shift+Espaço) · botão direito: menu' : 'Entrar no FocoAprova · botão direito: menu'}
      >
        <img src="./logo.png" className="pilula-logo" alt="" />
        <span className="pilula-texto">{texto}</span>
        <span className={`pilula-ponto ponto-${estado}`} />
        {session && pomodoro.rodando && (
          <div className="pilula-barra" style={{ transform: `scaleX(${pomodoro.progresso})` }} />
        )}
      </div>
    </div>
  );
}

export function IconePlay() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" />
    </svg>
  );
}

export function IconePausa() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}
