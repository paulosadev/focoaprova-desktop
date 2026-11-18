const { contextBridge, ipcRenderer } = require('electron');

// ponte mínima entre a interface e o processo principal
contextBridge.exposeInMainWorld('desktop', {
  expandir: () => ipcRenderer.send('janela:expandir'),
  recolher: () => ipcRenderer.send('janela:recolher'),
  alternar: () => ipcRenderer.send('janela:alternar'),
  loginGoogle: (url) => ipcRenderer.invoke('auth:google', url),
  mouseNaPilula: (dentro) => ipcRenderer.send('janela:mouse-na-pilula', dentro),
  notificar: (titulo, corpo) => ipcRenderer.send('notificar', titulo, corpo),
  menu: () => ipcRenderer.send('janela:menu'),
  sair: () => ipcRenderer.send('app:sair'),
  aoMudarEstado: (callback) => {
    const ouvinte = (_evento, expandida) => callback(expandida);
    ipcRenderer.on('janela:estado', ouvinte);
    return () => ipcRenderer.removeListener('janela:estado', ouvinte);
  },
});
