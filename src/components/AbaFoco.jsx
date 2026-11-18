import { formatarRelogio, minutosParaHHMM } from '../lib/data';
import { ROTULOS } from '../lib/usePomodoro';
import { IconePausa, IconePlay } from './Pilula';

// mesma estrutura do Timer do app: relógio, Iniciar/Pausar + Reiniciar,
// avanço automático e configuração dos tempos
export default function AbaFoco({ pomodoro }) {
  const { modo, rodando, segundos, progresso, ciclos, config } = pomodoro;

  const pontos = Array.from({ length: config.ciclosParaLonga }, (_, i) => i < ciclos % config.ciclosParaLonga);

  // anel de progresso em volta do tempo
  const raio = 92;
  const circunferencia = 2 * Math.PI * raio;

  return (
    <div className="aba-foco">
      <section className="cartao cartao-timer">
        <div className={`relogio relogio-${modo}`}>
          <svg viewBox="0 0 200 200" className="relogio-anel">
            <circle cx="100" cy="100" r={raio} className="anel-fundo" />
            <circle
              cx="100"
              cy="100"
              r={raio}
              className="anel-progresso"
              strokeDasharray={circunferencia}
              strokeDashoffset={circunferencia * (1 - progresso)}
            />
          </svg>
          <div className="relogio-centro">
            <span className="relogio-modo">{ROTULOS[modo]}</span>
            <span className="relogio-tempo">{formatarRelogio(segundos)}</span>
            <div className="pontos">
              {pontos.map((cheio, i) => (
                <span key={i} className={cheio ? 'ponto cheio' : 'ponto'} />
              ))}
            </div>
          </div>
        </div>

        <div className="controles">
          <button className="botao botao-primario botao-grande" onClick={pomodoro.alternar}>
            {rodando ? <IconePausa /> : <IconePlay />}
            {rodando ? 'Pausar' : 'Iniciar'}
          </button>
          <button className="botao botao-secundario botao-grande" onClick={pomodoro.reiniciar}>
            Reiniciar
          </button>
        </div>
      </section>

      <label className="cartao linha-interruptor">
        <div>
          <strong>Avançar automaticamente</strong>
          <span>Segue direto pra próxima etapa até a pausa longa, sem precisar clicar em Iniciar</span>
        </div>
        <input
          type="checkbox"
          className="interruptor"
          checked={config.avancoAutomatico}
          onChange={pomodoro.alternarAvancoAutomatico}
        />
      </label>

      <section className="cartao">
        <h3 className="titulo-cartao">Configurar tempos</h3>
        <SeletorDuracao rotulo="Foco" minutos={config.focoMin} onAlterar={(v) => pomodoro.alterarConfig('focoMin', v)} />
        <SeletorDuracao rotulo="Pausa" minutos={config.pausaMin} onAlterar={(v) => pomodoro.alterarConfig('pausaMin', v)} />
        <SeletorDuracao
          rotulo="Pausa longa"
          minutos={config.pausaLongaMin}
          onAlterar={(v) => pomodoro.alterarConfig('pausaLongaMin', v)}
        />
      </section>

      <p className="dica centro">Cada bloco de foco concluído é salvo no seu Progresso, no app também.</p>
    </div>
  );
}

// duração em HH:MM, igual ao seletor do app (na web ele também é um input de horário).
// Lido como duração, nunca como horário do dia; 00:00 é ignorado
function SeletorDuracao({ rotulo, minutos, onAlterar }) {
  function alterar(e) {
    const [h, m] = e.target.value.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return;
    const total = h * 60 + m;
    if (total > 0) onAlterar(total);
  }

  return (
    <label className="seletor-duracao">
      <span>{rotulo}</span>
      <input type="time" value={minutosParaHHMM(minutos)} onChange={alterar} />
    </label>
  );
}
