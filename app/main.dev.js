/* eslint global-require: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 *
 */
import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } from 'electron';
import log from 'electron-log';
import settings from 'electron-settings';
import path from 'path';
import iohook from 'iohook';

console.log('Location', log.transports.file.findLogPath());
app.disableHardwareAcceleration();

let trayContext = null;
let tray = null;
let mainWindow = null;
let processorWindow = null;
let settingsWindow = null;
let isKeyDown = false;
let config = {
  global: {
    keyListener: false,
    keyCode: 15, // TAB
    logLevel: 'warn',
    logLocation: log.transports.file.findLogPath()
  },
  settings: {
    keyCodeTest: false
  },
  processing: {
    debug: {
      roster: false,
      bench: false,
      row: {
        enabled: false
      }
    },
    heroConfig: {}
  }
};
const configListeners = [];

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return Promise.all(
    extensions.map(name => installer.default(installer[name], forceDownload))
  ).catch(console.log);
};

const setLogLevel = (level) => {
  log.transports.file.level = level;
};

const getScreenshotLocation = () => path.join(app.getPath('home'), 'screenshot.png');

// Load global config from settings file
const loadConfig = (initialState) => {
  const config = Object.assign({}, initialState, settings.get('config'));
  setLogLevel(config.global.logLevel);
  if (!config.global.screenshotLocation) {
    config.global.screenshotLocation = getScreenshotLocation();
  }
  log.debug('Loaded config', config);
  return config;
};

// Save current settings for next load
// Filter out settings that session based
const saveConfig = (config) => {
  log.debug('Saving config', config);
  settings.set('config', Object.assign({}, config, {
    settings: Object.assign({}, config.settings, {
      keyCodeTest: false,
      keyCodeTestCode: undefined
    })
  }));
  setLogLevel(config.global.logLevel);
};

const updateConfig = (region, change) => {
  log.debug('Updating config', region, change);
  log.debug('Config Listeners Length', configListeners.length);
  if (region) {
    config = Object.assign({}, config, { [region]: Object.assign({}, config[region], change) });
  } else {
    config = Object.assign({}, config, change);
  }
  log.debug('Config updated', config);
  for (let i = 0; i < configListeners.length; i++) {
    try {
      log.debug('Sending', i);
      configListeners[i].send('update-config', region, config);
    } catch (e) {
      log.debug('Failed');
      configListeners.splice(i--, 1);
    }
  }
  trayContext.getMenuItemById('disable_check').checked = !config.global.keyListener;
  saveConfig(config);
};

const buildMenu = () => {
  const menuContext = [{
    label: 'Underlords Analyzer',
    enabled: false
  }, {
    type: 'separator'
  }, {
    label: 'Disable Key Listener',
    id: 'disable_check',
    type: 'checkbox',
    checked: !config.global.keyListener,
    click: (e) => {
      updateConfig('global', { keyListener: !e.checked });
    }
  }, {
    label: 'Settings',
    click: () => {
      if (!settingsWindow) {
        settingsWindow = new BrowserWindow();
        settingsWindow.setTitle('Settings');
        settingsWindow.setMenu(null);
        configListeners.push(settingsWindow.webContents);
        settingsWindow.loadURL(`file://${__dirname}/settings/index.html`);
        settingsWindow.webContents.on('did-finish-load', () => settingsWindow.webContents.send('update-config', null, config)); // Force config push
        settingsWindow.on('closed', () => {
          settingsWindow = null;
          // Disable keyCodeTest if left running
          updateConfig('settings', { keyCodeTest: false });
        });
      } else {
        settingsWindow.focus();
      }
    }
  }, {
    label: 'Quit',
    click: app.quit
  }];
  return Menu.buildFromTemplate(menuContext);
}

const hasLock = app.requestSingleInstanceLock();

if (!hasLock) {
  // Only allow single instance to run
  app.quit();
} else {
  /**
   * Add event listeners...
   */

  app.on('window-all-closed', () => {
    // Respect the OSX convention of having the application in memory even
    // after all windows have been closed
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('ready', async () => {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
    ) {
      log.info('Installing extensions');
      await installExtensions();
    }
    iohook.start();
    config = loadConfig(config);
    trayContext = buildMenu();

    tray = new Tray(nativeImage.createFromPath(path.join(__dirname, '..', 'resources', 'icon.ico')));
    tray.setToolTip('Underlords Analyzer');
    tray.setContextMenu(trayContext);
    tray.on('click', tray.popUpContextMenu);

    // START MAIN WINDOW
    const { screen } = require('electron');
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    mainWindow = new BrowserWindow({
      show: false,
      width,
      height,
      transparent: true,
      frame: false
    });

    configListeners.push(mainWindow.webContents);
    mainWindow.loadURL(`file://${__dirname}/app.html`);

    mainWindow.webContents.on('did-finish-load', () => {
      if (!mainWindow) {
        throw new Error('"mainWindow" is not defined');
      }
      mainWindow.show();
      mainWindow.focus();

      mainWindow.setIgnoreMouseEvents(true, {
        forward: true
      });
      mainWindow.setAlwaysOnTop(true);
      mainWindow.webContents.send('update-config', null, config); // Force config push
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
    // END MAIN WINDOW

    // START PROCESSOR WINDOW
    processorWindow = new BrowserWindow();
    processorWindow.setTitle('Processor');
    configListeners.push(processorWindow);
    processorWindow.hide();
    processorWindow.loadURL(`file://${__dirname}/processor/index.html`);

    processorWindow.webContents.on('did-finish-load', () => processorWindow.send('update-config', 'processing', config)); // Force config push
    processorWindow.on('crashed', event => {
      log.error('mainThread | processorWindow just crashed, will try to reload window');
      log.error(event);
      processorWindow.webContents.reload();
      mainWindow.webContents.send('error');
    });

    processorWindow.on('unresponsive', event => {
      log.warn('mainThread | processorWindow is unresponsive');
      log.warn(event);
    });

    processorWindow.on('responsive', event => {
      log.warn('mainThread | processorWindow is responsive again');
      log.warn(event);
    });
    // END PROCESSOR WINDOW
  });

  // START IPC HANDLING
  ipcMain.on('process-ss', (_, image) => {
    log.debug('Processing SS');
    processorWindow.send('process-ss', image);
  });

  ipcMain.on('noop', (_, reason) => {
    log.debug('Noop', reason);
    mainWindow.webContents.send('noop', reason);
  });

  ipcMain.on('processed-ss', (_, results) => {
    mainWindow.webContents.send('ss-results', results);
  });

  ipcMain.on('update-config', (_, region, change) => {
    updateConfig(region, change);
  });

  ipcMain.on('clear-log', () => {
    log.transports.file.clear();
    log.warn('Cleared Log');
  });
  // END IPC HANDLING

  // START KEY PRESS HANDLING
  iohook.on('keydown', event => {
    if (config.settings.keyCodeTest) {
      updateConfig('settings', { keyCodeTestCode: event.keycode });
    }
    if (!config.global.keyListener) {
      return;
    }
    if (event.keycode === config.global.keyCode && !isKeyDown) {
      // Ensures only one event is fired while key is held down
      isKeyDown = true;
      mainWindow.webContents.send('capture-ss');
    }
  });

  iohook.on('keyup', event => {
    if (event.keycode === config.global.keyCode) {
      isKeyDown = false;
    }
  });
  // END KEY PRESS HANDLING
}
