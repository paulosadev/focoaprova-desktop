import { useEffect, useState } from 'react';
import { configurado, supabase } from './supabase';
import { usePomodoro } from './lib/usePomodoro';
import { useHoje } from './lib/useHoje';
import Pilula from './components/Pilula';
import Painel from './components/Painel';

export default function App() {
  const [session, setSession] = useState(null);
  const [pronto, setPronto] = useState(!configurado);
  const [expandida, setExpandida] = useState(false);

  useEffect(() => {
    if (!configurado) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setPronto(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, nova) => setSession(nova));
    return () => data.subscription.unsubscribe();
  }, []);

  // quem decide se está aberto é o processo principal (atalho, bandeja, blur)
  useEffect(() => window.desktop?.aoMudarEstado(setExpandida), []);

  // ao recolher, o painel ainda fica na tela o tempo da animação de fechar
  const [fechando, setFechando] = useState(false);
  const [painelNaTela, setPainelNaTela] = useState(false);
  useEffect(() => {
    if (expandida) {
      setPainelNaTela(true);
      setFechando(false);
      return;
    }
    if (!painelNaTela) return;
    setFechando(true);
    const id = setTimeout(() => {
      setPainelNaTela(false);
      setFechando(false);
    }, 160);
    return () => clearTimeout(id);
  }, [expandida]); // eslint-disable-line react-hooks/exhaustive-deps

  const hoje = useHoje(session, expandida);
  const pomodoro = usePomodoro(session, hoje.carregar);

  if (!pronto) return null;

  return painelNaTela ? (
    <Painel session={session} pomodoro={pomodoro} hoje={hoje} fechando={fechando} />
  ) : (
    <Pilula session={session} pomodoro={pomodoro} />
  );
}
