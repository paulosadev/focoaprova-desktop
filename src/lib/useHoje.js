import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { dataLocalISO, diaSemanaHoje } from './data';

const VAZIO = {
  carregando: true,
  perfil: null,
  materiasHoje: [],
  concluidas: {},
  ultimoAssunto: {},
  anotacoesPendentes: [],
};

// mesmos dados da tela Início do app, lidos das mesmas tabelas
export function useHoje(session, painelAberto) {
  const [dados, setDados] = useState(VAZIO);

  const carregar = useCallback(async () => {
    if (!session) return;
    const hoje = dataLocalISO();

    const [perfil, materias, checklist, ultimos, notas] = await Promise.all([
      supabase.from('profiles').select('nome, data_prova').eq('id', session.user.id).single(),
      supabase.from('disciplinas').select('id, nome').eq('dia_semana', diaSemanaHoje()).order('nome'),
      supabase.from('checklist').select('disciplina_id').eq('data', hoje),
      // último assunto estudado por disciplina, pra mostrar "onde parou"
      supabase
        .from('checklist')
        .select('disciplina_id, assunto_estudado, data')
        .not('assunto_estudado', 'is', null)
        .order('data', { ascending: false }),
      supabase
        .from('anotacoes_erro')
        .select('id, disciplina_nome, assunto, proxima_revisao')
        .lte('proxima_revisao', hoje)
        .order('proxima_revisao'),
    ]);

    const concluidas = {};
    (checklist.data || []).forEach((c) => (concluidas[c.disciplina_id] = true));

    const ultimoAssunto = {};
    (ultimos.data || []).forEach((item) => {
      if (!item.assunto_estudado?.trim()) return;
      if (!ultimoAssunto[item.disciplina_id]) ultimoAssunto[item.disciplina_id] = item.assunto_estudado;
    });

    setDados({
      carregando: false,
      perfil: perfil.data,
      materiasHoje: materias.data || [],
      concluidas,
      ultimoAssunto,
      anotacoesPendentes: notas.data || [],
    });
  }, [session]);

  // carrega ao entrar, ao abrir o painel e a cada minuto com ele aberto
  useEffect(() => {
    if (!session) {
      setDados(VAZIO);
      return;
    }
    carregar();
  }, [session, carregar]);

  useEffect(() => {
    if (!painelAberto) return;
    carregar();
    const id = setInterval(carregar, 60 * 1000);
    return () => clearInterval(id);
  }, [painelAberto, carregar]);

  async function marcarEstudada(disciplinaId, assunto) {
    setDados((d) => ({ ...d, concluidas: { ...d.concluidas, [disciplinaId]: true } }));
    await supabase.from('checklist').insert({
      user_id: session.user.id,
      disciplina_id: disciplinaId,
      data: dataLocalISO(),
      concluido: true,
      assunto_estudado: assunto?.trim() ? assunto.trim() : null,
    });
    carregar();
  }

  // igual ao app: desmarcar não pergunta nada, só desmarca
  async function desmarcar(disciplinaId) {
    setDados((d) => {
      const concluidas = { ...d.concluidas };
      delete concluidas[disciplinaId];
      return { ...d, concluidas };
    });
    await supabase.from('checklist').delete().eq('disciplina_id', disciplinaId).eq('data', dataLocalISO());
    carregar();
  }

  return { ...dados, carregar, marcarEstudada, desmarcar };
}
