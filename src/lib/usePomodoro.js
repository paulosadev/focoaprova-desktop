import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';
import { dataLocalISO } from './data';

const CHAVE_CONFIG = 'fa:config';
const CHAVE_TIMER = 'fa:timer';
const CHAVE_PENDENTES = 'fa:pendentes';

const CONFIG_PADRAO = {
  focoMin: 50,
  pausaMin: 10,
  pausaLongaMin: 20,
  ciclosParaLonga: 4,
  avancoAutomatico: true, // igual ao app: segue sozinho até a pausa longa
};

export const ROTULOS = { foco: 'Foco', pausa: 'Pausa curta', pausaLonga: 'Pausa longa' };

function ler(chave, padrao) {
  try {
    const valor = localStorage.getItem(chave);
    return valor ? { ...padrao, ...JSON.parse(valor) } : padrao;
  } catch {
    return padrao;
  }
}

function salvar(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // sem espaço/bloqueado: o timer segue funcionando só em memória
  }
}

function duracaoDoModo(modo, config) {
  if (modo === 'pausa') return config.pausaMin * 60;
  if (modo === 'pausaLonga') return config.pausaLongaMin * 60;
  return config.focoMin * 60;
}

const somAlerta = typeof Audio !== 'undefined' ? new Audio('./beep.wav') : null;

function avisar(titulo, corpo) {
  if (somAlerta) {
    somAlerta.currentTime = 0;
    // play() devolve promise; se o áudio falhar, segue sem som
    somAlerta.play().catch(() => {});
  }
  // notificação nativa pelo processo principal (toast do Windows)
  if (window.desktop?.notificar) {
    window.desktop.notificar(titulo, corpo);
    return;
  }
  try {
    new Notification(titulo, { body: corpo, silent: true });
  } catch {
    /* notificações desligadas no Windows */
  }
}

// sessão que não conseguiu subir (sem internet) fica na fila e tenta de novo
async function enviarSessao(sessao) {
  const { error } = await supabase.from('sessoes_estudo').insert(sessao);
  if (error) {
    const fila = JSON.parse(localStorage.getItem(CHAVE_PENDENTES) || '[]');
    fila.push(sessao);
    localStorage.setItem(CHAVE_PENDENTES, JSON.stringify(fila));
    return false;
  }
  return true;
}

async function reenviarPendentes() {
  const fila = JSON.parse(localStorage.getItem(CHAVE_PENDENTES) || '[]');
  if (fila.length === 0) return;
  localStorage.setItem(CHAVE_PENDENTES, '[]');
  for (const sessao of fila) await enviarSessao(sessao);
}

export function usePomodoro(session, aoSalvarSessao) {
  const [config, setConfig] = useState(() => ler(CHAVE_CONFIG, CONFIG_PADRAO));
  const [timer, setTimer] = useState(() =>
    ler(CHAVE_TIMER, {
      modo: 'foco',
      rodando: false,
      fimEm: null,
      restante: CONFIG_PADRAO.focoMin * 60,
      ciclos: 0,
    }),
  );
  const [agora, setAgora] = useState(Date.now());
  const finalizandoRef = useRef(false);

  useEffect(() => salvar(CHAVE_CONFIG, config), [config]);
  useEffect(() => salvar(CHAVE_TIMER, timer), [timer]);

  useEffect(() => {
    if (session) reenviarPendentes();
  }, [session]);

  // o tempo é calculado pelo horário de término, então não atrasa
  // mesmo se o Windows segurar o setInterval
  const segundos = timer.rodando
    ? Math.max(Math.ceil((timer.fimEm - agora) / 1000), 0)
    : timer.restante;
  const total = duracaoDoModo(timer.modo, config);
  const progresso = total > 0 ? 1 - segundos / total : 0;

  useEffect(() => {
    if (!timer.rodando) return;
    const id = setInterval(() => setAgora(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer.rodando]);

  const finalizarBloco = useCallback(async () => {
    if (finalizandoRef.current) return;
    finalizandoRef.current = true;

    const eraFoco = timer.modo === 'foco';
    const novosCiclos = eraFoco ? timer.ciclos + 1 : timer.ciclos;
    const proximo = eraFoco
      ? novosCiclos % config.ciclosParaLonga === 0
        ? 'pausaLonga'
        : 'pausa'
      : 'foco';
    // a pausa longa fecha o ciclo: mesmo no automático, para e espera o usuário
    const automatico = config.avancoAutomatico && timer.modo !== 'pausaLonga';
    const duracao = duracaoDoModo(proximo, config);

    setTimer((t) => ({
      ...t,
      modo: proximo,
      rodando: automatico,
      fimEm: automatico ? Date.now() + duracao * 1000 : null,
      restante: duracao,
      ciclos: novosCiclos,
    }));
    setAgora(Date.now());

    if (eraFoco) {
      avisar('Bloco de foco concluído', automatico ? 'Começando a pausa.' : 'Hora da pausa.');
      if (session) {
        await enviarSessao({
          user_id: session.user.id,
          minutos: config.focoMin,
          tipo: 'foco',
          data: dataLocalISO(),
        });
        aoSalvarSessao?.();
      }
    } else if (timer.modo === 'pausaLonga') {
      avisar('Ciclo completo!', 'Pausa longa concluída. Clique em Iniciar quando quiser continuar.');
    } else {
      avisar('Pausa concluída', automatico ? 'Voltando ao foco.' : 'Hora de voltar ao foco.');
    }

    finalizandoRef.current = false;
  }, [timer.modo, timer.ciclos, config, session, aoSalvarSessao]);

  useEffect(() => {
    if (timer.rodando && segundos <= 0) finalizarBloco();
  }, [timer.rodando, segundos, finalizarBloco]);

  function iniciar() {
    const inicio = Date.now();
    setAgora(inicio);
    setTimer((t) => ({ ...t, rodando: true, fimEm: inicio + t.restante * 1000 }));
  }

  function pausar() {
    setTimer((t) => ({
      ...t,
      rodando: false,
      fimEm: null,
      restante: Math.max(Math.ceil((t.fimEm - Date.now()) / 1000), 0),
    }));
  }

  function alternar() {
    if (timer.rodando) pausar();
    else iniciar();
  }

  function reiniciar() {
    setTimer((t) => ({
      ...t,
      modo: 'foco',
      rodando: false,
      fimEm: null,
      restante: config.focoMin * 60,
      ciclos: 0,
    }));
  }

  function alterarConfig(campo, minutos) {
    // até 23:59, o mesmo limite do seletor de duração do app
    const valor = Math.min(Math.max(Number(minutos) || 1, 1), 1439);
    const nova = { ...config, [campo]: valor };
    setConfig(nova);
    // se estiver parado no início do bloco, já reflete o novo tempo
    if (!timer.rodando && timer.restante === duracaoDoModo(timer.modo, config)) {
      setTimer((t) => ({ ...t, restante: duracaoDoModo(t.modo, nova) }));
    }
  }

  function alternarAvancoAutomatico() {
    setConfig((c) => ({ ...c, avancoAutomatico: !c.avancoAutomatico }));
  }

  return {
    ...timer,
    segundos,
    progresso,
    config,
    iniciar,
    pausar,
    alternar,
    reiniciar,
    alterarConfig,
    alternarAvancoAutomatico,
  };
}
