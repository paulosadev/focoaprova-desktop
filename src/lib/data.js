// mesmas regras de data do app: sempre data local, nunca toISOString()
export const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export function dataLocalISO(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function diaSemanaHoje() {
  return DIAS[(new Date().getDay() + 6) % 7];
}

export function formatarTimer(segundos) {
  const s = Math.max(segundos, 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mmss = `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

// dias até a data da prova (mesma conta do app): positivo = faltam, 0 = hoje
export function diasRestantes(dataISO) {
  if (!dataISO) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(dataISO + 'T00:00:00');
  return Math.round((alvo - hoje) / 86400000);
}

// "HH:MM:SS" sempre com hora, igual ao display do Timer do app
export function formatarRelogio(segundos) {
  const s = Math.max(segundos, 0);
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

// minutos <-> "HH:MM" do campo de duração
export function minutosParaHHMM(minutos) {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
}
