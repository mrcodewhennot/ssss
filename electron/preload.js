const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  createUser: (u) => ipcRenderer.invoke('create-user', u),
  authenticate: (c) => ipcRenderer.invoke('authenticate', c),
  listUsers: () => ipcRenderer.invoke('list-users'),
  deleteUser: (id) => ipcRenderer.invoke('delete-user', id)
});
