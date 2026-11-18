import { useState } from 'react';
import { diaSemanaHoje, diasRestantes } from '../lib/data';
import { fraseDoDia } from '../lib/frases';

// mesma estrutura da tela Início do app
export default function AbaHoje({ hoje, irParaTimer }) {
  const [perguntandoAssunto, setPerguntandoAssunto] = useState(null);
  const [assunto, setAssunto] = useState('');

  if (hoje.carregando) return <p className="dica centro">Carregando seu dia…</p>;

  const frase = fraseDoDia();
  const faltam = diasRestantes(hoje.perfil?.data_prova);
  const pendentes = hoje.anotacoesPendentes;

  function alternar(materia) {
    if (hoje.concluidas[materia.id]) {
      hoje.desmarcar(materia.id);
    } else {
      // marcar como estudado pergunta o assunto (pode pular)
      setAssunto('');
      setPerguntandoAssunto(materia.id);
    }
  }

  function confirmar(pular) {
    hoje.marcarEstudada(perguntandoAssunto, pular ? null : assunto);
    setPerguntandoAssunto(null);
  }

  return (
    <div className="aba-hoje">
      <section className="cartao cartao-frase">
        <p className="frase">&ldquo;{frase.texto}&rdquo;</p>
        <p className="frase-autor">— {frase.autor}</p>
      </section>

      {/* sem data ou prova já passou: em vez de contar pra trás, pede a próxima data */}
      {faltam === null || faltam < 0 ? (
        <section className="cartao cartao-sem-prova">Defina a data da sua próxima prova no app.</section>
      ) : (
        <section className="cartao cartao-contagem">
          <strong>{faltam === 0 ? 'Hoje!' : faltam}</strong>
          <span>{faltam === 0 ? 'é o dia da prova' : faltam === 1 ? 'dia para a prova' : 'dias para a prova'}</span>
        </section>
      )}

      <section className="cartao">
        <h3 className="titulo-cartao">Hoje é {diaSemanaHoje()}</h3>

        {hoje.materiasHoje.length === 0 && <p className="vazio">Nenhuma disciplina cadastrada pra hoje.</p>}

        <ul className="materias">
          {hoje.materiasHoje.map((m) => {
            const feita = !!hoje.concluidas[m.id];
            return (
              <li key={m.id}>
                <label className="linha-materia">
                  <input type="checkbox" className="interruptor" checked={feita} onChange={() => alternar(m)} />
                  <div className="coluna-materia">
                    <span className={feita ? 'nome-materia feita' : 'nome-materia'}>{m.nome}</span>
                    {hoje.ultimoAssunto[m.id] && (
                      <span className="ultimo-assunto">Último assunto estudado: {hoje.ultimoAssunto[m.id]}</span>
                    )}
                  </div>
                </label>

                {perguntandoAssunto === m.id && (
                  <div className="assunto">
                    <input
                      autoFocus
                      placeholder="Qual assunto você estudou?"
                      value={assunto}
                      onChange={(e) => setAssunto(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && confirmar(false)}
                    />
                    <div>
                      <button className="link" onClick={() => confirmar(true)}>
                        Pular
                      </button>
                      <button className="botao botao-primario botao-pequeno" onClick={() => confirmar(false)}>
                        Salvar
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="cartao">
        <div className="linha-titulo-cartao">
          <h3 className="titulo-cartao">Para revisar hoje</h3>
          {pendentes.length > 0 && <span className="contador-ambar">{pendentes.length}</span>}
        </div>

        {pendentes.length === 0 && <p className="vazio">Nada pendente de revisão hoje.</p>}

        {pendentes.slice(0, 5).map((item) => (
          <div key={item.id} className="item-anotacao">
            {item.disciplina_nome || 'Sem disciplina'}
            {item.assunto ? ` · ${item.assunto}` : ''}
          </div>
        ))}

        {pendentes.length > 5 && (
          <p className="mais-texto">+{pendentes.length - 5} outra(s) — veja tudo no app, em Revisar → Questões</p>
        )}
      </section>

      <button className="botao botao-primario" onClick={irParaTimer}>
        Iniciar Timer
      </button>
    </div>
  );
}
