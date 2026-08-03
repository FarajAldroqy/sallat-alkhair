"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  getTransactions: (params) => electron.ipcRenderer.invoke("db:get-transactions", params),
  createTransaction: (payload) => electron.ipcRenderer.invoke("db:create-transaction", payload),
  getStats: () => electron.ipcRenderer.invoke("db:get-stats"),
  getChartData: (params) => electron.ipcRenderer.invoke("db:get-chart-data", params),
  togglePin: (id) => electron.ipcRenderer.invoke("db:toggle-pin", id),
  deleteTransaction: (id) => electron.ipcRenderer.invoke("db:delete-transaction", id),
  archiveTransaction: (id) => electron.ipcRenderer.invoke("db:archive-transaction", id)
});
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
});
