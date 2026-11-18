const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  screen,
  Tray,
  Menu,
  nativeImage,
  Notification,
  shell,
} = require('electron');
const path = require('path');
const http = require('http');

// porta fixa do retorno do login com Google; precisa estar cadastrada no
// Supabase em Authentication > URL Configuration > Redirect URLs
const PORTA_LOGIN = 47811;

// A janela tem SEMPRE o tamanho do painel. Recolhida, só a pílula (no topo,
// centralizada) recebe o mouse; o resto é transparente e deixa o clique passar.
// Assim não existe setBounds/resize na troca: sem flicker e sem o bug de
// tamanho que vai "crescendo" em escala de tela diferente de 100%.
const JANELA = { largura: 440, altura: 620 };
const MARGEM_TOPO = 6;
const ATALHO = 'CommandOrControl+Shift+Space';
const ICONE = path.join(__dirname, '..', 'build', 'icon.png');
const ICONE_TRAY = path.join(__dirname, '..', 'build', 'tray.png');

let janela = null;
let tray = null;
let expandida = false;
let pilulaVisivel = true;
let recolhidaPorBlurEm = 0;

// só deixa abrir uma instância; se abrir de novo, mostra a que já existe
if (!app.requestSingleInstanceLock()) app.exit(0);

// no Windows o toast só aparece se o AppUserModelId bater com o atalho do
// menu Iniciar; em dev não há atalho, então usa o caminho do electron.exe
app.setAppUserModelId(app.isPackaged ? 'com.focoaprova.desktop' : process.execPath);

function posicaoNoTopo() {
  const { workArea } = screen.getPrimaryDisplay();
  return {
    x: Math.round(workArea.x + (workArea.width - JANELA.largura) / 2),
    y: workArea.y + MARGEM_TOPO,
  };
}

function reposicionar() {
  if (!janela) return;
  const { x, y } = posicaoNoTopo();
  janela.setPosition(x, y);
}

// o Windows às vezes "esquece" o topmost depois de esconder/mostrar
// ou quando um app em tela cheia ganha foco; reaplica sempre que mostra
function garantirNoTopo() {
  janela.setAlwaysOnTop(true, 'screen-saver');
}

// recolhida: ignora o mouse, mas continua recebendo o movimento (forward)
// pra interface saber quando o cursor entra na pílula
function deixarCliquePassar(passar) {
  if (!janela) return;
  if (passar) janela.setIgnoreMouseEvents(true, { forward: true });
  else janela.setIgnoreMouseEvents(false);
}

function setExpandida(valor) {
  if (!janela) return;
  expandida = valor;
  deixarCliquePassar(!expandida);

  if (expandida) {
    garantirNoTopo();
    janela.show();
    janela.focus();
    janela.webContents.focus(); // foco do teclado no conteúdo (Esc, campos)
  } else if (!pilulaVisivel) {
    janela.hide();
  }
  janela.webContents.send('janela:estado', expandida);
}

function criarJanela() {
  const { x, y } = posicaoNoTopo();

  janela = new BrowserWindow({
    x,
    y,
    width: JANELA.largura,
    height: JANELA.altura,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    thickFrame: false, // sem borda/sombra nativa do Windows em volta da área transparente
    alwaysOnTop: true,
    show: false,
    backgroundColor: '#00000000',
    icon: ICONE,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // o timer não pode "dormir" com a janela sem foco
    },
  });

  // nível 'screen-saver' fica por cima até de app em tela cheia (sem bordas)
  garantirNoTopo();
  deixarCliquePassar(true);

  if (process.env.VITE_DEV_SERVER_URL) {
    janela.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    janela.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // showInactive: a pílula aparece sem roubar o foco de quem está digitando
  janela.once('ready-to-show', () => janela.showInactive());

  // Esc recolhe; tratado aqui pra funcionar mesmo sem foco no DOM
  janela.webContents.on('before-input-event', (evento, input) => {
    if (expandida && input.type === 'keyDown' && input.key === 'Escape') {
      evento.preventDefault();
      setExpandida(false);
    }
  });

  // clicou fora do painel, ele recolhe de volta pra pílula
  janela.on('blur', () => {
    if (!expandida) return;
    recolhidaPorBlurEm = Date.now();
    setExpandida(false);
  });
}

function setPilulaVisivel(visivel) {
  pilulaVisivel = visivel;
  if (visivel) {
    garantirNoTopo();
    janela.showInactive();
  } else if (!expandida) {
    janela.hide();
  }
}

// clicar no ícone da bandeja tira o foco do painel (blur) antes do clique
// chegar; sem isso o painel fecharia e abriria de novo na mesma hora
function alternarPeloTray() {
  if (Date.now() - recolhidaPorBlurEm < 400) return;
  setExpandida(!expandida);
}

// mesmo menu na bandeja e no botão direito da pílula
function montarMenu() {
  return Menu.buildFromTemplate([
    { label: 'Abrir painel', click: () => setExpandida(true) },
    {
      label: 'Mostrar pílula',
      type: 'checkbox',
      checked: pilulaVisivel,
      click: (item) => setPilulaVisivel(item.checked),
    },
    { type: 'separator' },
    {
      label: 'Iniciar com o Windows',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      enabled: app.isPackaged, // em dev registraria o electron.exe "pelado"
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
    },
    { type: 'separator' },
    { label: 'Fechar o FocoAprova', click: () => app.quit() },
  ]);
}

function criarTray() {
  tray = new Tray(nativeImage.createFromPath(ICONE_TRAY));
  tray.setToolTip('FocoAprova');

  tray.on('click', alternarPeloTray);
  tray.on('right-click', () => tray.popUpContextMenu(montarMenu()));
}

// Login com Google: abre o navegador padrão na URL do Supabase e sobe um
// servidorzinho local que só espera o ?code= voltar. Devolve o code pra
// interface trocar pela sessão (fluxo PKCE).
let servidorLogin = null;

function paginaRetorno(titulo, texto) {
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>${titulo}</title>
  <body style="margin:0;height:100vh;display:grid;place-items:center;background:#0c131b;color:#e4edf7;font-family:Segoe UI,sans-serif">
  <div style="text-align:center"><h2 style="color:#9bcbff;margin:0 0 8px">${titulo}</h2>
  <p style="color:#93aac2;margin:0">${texto}</p></div></body></html>`;
}

ipcMain.handle('auth:google', (_evento, urlLogin) => {
  if (servidorLogin) servidorLogin.close();

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      encerrar();
      resolve({ erro: 'Tempo esgotado. Tente entrar de novo.' });
    }, 5 * 60 * 1000);

    function encerrar() {
      clearTimeout(timeout);
      if (servidorLogin) servidorLogin.close();
      servidorLogin = null;
    }

    servidorLogin = http.createServer((req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${PORTA_LOGIN}`);
      if (url.pathname !== '/callback') {
        res.writeHead(404).end();
        return;
      }

      const code = url.searchParams.get('code');
      const erro = url.searchParams.get('error_description') || url.searchParams.get('error');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

      if (code) {
        res.end(paginaRetorno('Login concluído', 'Pode fechar esta aba e voltar pro FocoAprova.'));
        resolve({ code });
      } else {
        res.end(paginaRetorno('Não deu certo', erro || 'O login foi cancelado.'));
        resolve({ erro: erro || 'Login cancelado.' });
      }

      encerrar();
      if (janela) setExpandida(true);
    });

    servidorLogin.on('error', (err) => {
      encerrar();
      resolve({ erro: `Não consegui abrir a porta ${PORTA_LOGIN} (${err.code}).` });
    });

    servidorLogin.listen(PORTA_LOGIN, '127.0.0.1', () => shell.openExternal(urlLogin));
  });
});

ipcMain.on('janela:expandir', () => setExpandida(true));
ipcMain.on('janela:recolher', () => setExpandida(false));
ipcMain.on('janela:alternar', () => setExpandida(!expandida));

// sem ícone na barra de tarefas, a pílula e o painel também dão acesso ao menu e ao "Fechar"
ipcMain.on('janela:menu', () => montarMenu().popup({ window: janela }));
ipcMain.on('app:sair', () => app.quit());

// a interface avisa quando o mouse entra/sai da pílula
ipcMain.on('janela:mouse-na-pilula', (_evento, dentro) => {
  if (!expandida) deixarCliquePassar(!dentro);
});

// notificação nativa do Windows (a do navegador não mostra ícone de arquivo local)
ipcMain.on('notificar', (_evento, titulo, corpo) => {
  if (!Notification.isSupported()) return;
  const aviso = new Notification({ title: titulo, body: corpo, icon: ICONE, silent: true });
  aviso.on('failed', (_e, erro) => console.warn('Notificação falhou:', erro));
  aviso.show();
});

app.on('second-instance', () => {
  if (!janela) return;
  setPilulaVisivel(true);
  setExpandida(true);
});

app.whenReady().then(() => {
  criarJanela();
  criarTray();

  // se mudar resolução/escala/monitor, recentraliza (só posição, tamanho é fixo)
  screen.on('display-metrics-changed', reposicionar);
  screen.on('display-added', reposicionar);
  screen.on('display-removed', reposicionar);

  const ok = globalShortcut.register(ATALHO, () => setExpandida(!expandida));
  if (!ok) console.warn('Não consegui registrar o atalho', ATALHO);
});

app.on('will-quit', () => globalShortcut.unregisterAll());

// sem janela visível o app continua vivo na bandeja
app.on('window-all-closed', (e) => e.preventDefault());
