import fs, { stat } from 'fs';
import React, { Fragment, useReducer } from 'react';
import { render } from 'react-dom';
import { AppContainer as ReactHotAppContainer } from 'react-hot-loader';
import { ipcRenderer, remote } from 'electron';

import './settings.global.scss';
import styles from './settings.scss';
import { Header } from './components/header';
import { LogViewer } from './components/logViewer';
import { DebugRow } from './components/debugRow';
import { HeroConfig } from './components/heroConfig';
import { PoolConfig } from './components/poolConfig';
import { ScreenshotConfig } from './components/screenshotConfig';
import { TierChance } from './components/tierChance';

import logger from '../utils/logging';
const log = logger('Settings');
const AppContainer = process.env.PLAIN_HMR ? Fragment : ReactHotAppContainer;

let watcher;
log.info('Execution');

const Actions = {
  INITIALIZE: 'INITIALIZE',
  KEY_CODE_TEST: 'KEY_CODE_TEST',

  UPDATE_LOG_LEVEL: 'UPDATE_LOG_LEVEL',
  UPDATE_LOG_TEXT: 'UPDATE_LOG_TEXT',
  UPDATE_LISTENER: 'UPDATE_LISTENER',
  UPDATE_CONFIG: 'UPDATE_CONFIG',
  UPDATE_KEY_CODE: 'UPDATE_KEY_CODE',
  UPDATE_SCREENSHOT: 'UPDATE_SCREENSHOT',

  UPDATE_DEBUG_SETTING: 'UPDATE DEBUG_SETTING',
  UPDATE_DEBUG_ROW: 'UPDATE_DEBUG_ROW',

  CLEAR_LOG: 'CLEAR_LOG',
  VIEW_LOG: 'VIEW_LOG',
  VIEW_SETTINGS: 'VIEW_SETTINGS',
  VIEW_HERO_CONFIG: 'VIEW_HERO_CONFIG',
  VIEW_POOL_CONFIG: 'VIEW_POOL_CONFIG',
  VIEW_SCREENSHOT_CONFIG: 'VIEW_SCREENSHOT_CONFIG',
  VIEW_TIER_CHANCE: 'VIEW_TIER_CHANCE',

  SAVE_HERO_CONFIG: 'SAVE_HERO_CONFIG',
  SAVE_POOL_CONFIG: 'SAVE_POOL_CONFIG',
  SAVE_SCREENSHOT_CONFIG: 'SAVE_SCREENSHOT_CONFIG',
  SAVE_TIER_CHANCE: 'SAVE_TIER_CHANCE',
  APPLY_CHANGES: 'APPLY_CHANGES',
  SUBMIT: 'SUBMIT'
};

const intialState = {
  global: {},
  settings: {
    mode: 'SETTINGS',
    keyCodeTest: ''
  },
  processing: {
    debug: {
      row: {
        enabled: false
      }
    },
    heroConfig: {}
  }
};

const promptClear = (clearLog) => {
  remote.dialog.showMessageBox(remote.getCurrentWindow(), {
    type: 'question',
    title: 'Clear Log?',
    buttons: ['Ok', 'Cancel'],
    message: 'Are you sure you want to clear the log?'
  }, button => button === 0 ? clearLog() : null);
};

const watchLog = (logLocation, dispatch) => {
  try {
    watcher = fs.watch(logLocation, { persistent: false }, (event, filename) => {
      if (event !== 'change') {
        return;
      }
      try {
        dispatch({ type: Actions.UPDATE_LOG_TEXT, data: fs.readFileSync(logLocation, 'utf8') });
      } catch (e) {
        watcher.close();
      }
    });
  } catch (e) {
    if (watcher) {
      watcher.close();
    }
  }
};

const reducer = (state, action) => {
  if (action.type !== Actions.UPDATE_LOG_TEXT) {
    log.debug('Handling Action', action);
  }
  switch (action.type) {
    case Actions.INITIALIZE:
      return Object.assign({}, action.data, { settings: state.settings });
    case Actions.UPDATE_LOG_LEVEL:
      return Object.assign({}, state, { global: Object.assign({}, state.global, { logLevel: !!action.data ? 'debug' : 'warn' }) });
    case Actions.UPDATE_LISTENER:
      return Object.assign({}, state, { global: Object.assign({}, state.global, { keyListener: !action.data }) });
    case Actions.UPDATE_CONFIG:
      return Object.assign({}, state, { [action.data.prop]: action.data.value });
    case Actions.UPDATE_KEY_CODE:
      return Object.assign({}, state, { global: Object.assign({}, state.global, { keyCode: Number.parseInt(action.data, 10) }) });
    case Actions.UPDATE_SCREENSHOT:
      return Object.assign({}, state, { global: Object.assign({}, state.global, { screenshotDebugging: !!action.data }) });
    case Actions.UPDATE_LOG_TEXT:
      return Object.assign({}, state, { settings: Object.assign({}, state.settings, { logText: action.data }) });
    case Actions.VIEW_LOG:
      let logText = '';
      try {
        logText = fs.readFileSync(state.global.logLocation);
      } catch (e) { }
      return Object.assign({}, state, { settings: Object.assign({}, state.settings, { mode: 'LOG', logText }) });
    case Actions.VIEW_SETTINGS:
      if (watcher) {
        watcher.close();
      }
      return Object.assign({}, state, { settings: Object.assign({}, state.settings, { mode: 'SETTINGS', logText: '' }) });
    case Actions.VIEW_HERO_CONFIG:
      return Object.assign({}, state, { settings: Object.assign({}, state.settings, { mode: 'HERO' }) });
    case Actions.VIEW_POOL_CONFIG:
      return Object.assign({}, state, { settings: Object.assign({}, state.settings, { mode: 'POOL' }) });
    case Actions.VIEW_SCREENSHOT_CONFIG:
      return Object.assign({}, state, { settings: Object.assign({}, state.settings, { mode: 'SCREENSHOT' }) });
    case Actions.VIEW_TIER_CHANCE:
      return Object.assign({}, state, { settings: Object.assign({}, state.settings, { mode: 'TIER' }) });
    case Actions.CLEAR_LOG:
      ipcRenderer.send('clear-log');
      return Object.assign({}, state, { settings: Object.assign({}, state.settings, { logText: '' }) });
    case Actions.KEY_CODE_TEST:
      log.debug('Turned on KeyCodeTest');
      const newState = Object.assign({}, state, { settings: Object.assign({}, state.settings, { keyCodeTest: action.data, keyCodeTestCode: '' }) });
      ipcRenderer.send('update-config', 'settings', newState.settings);
      return newState;
    case Actions.UPDATE_DEBUG_SETTING:
      const debug = Object.assign({}, state.processing.debug, { [action.data.prop]: action.data.value });
      return Object.assign({}, state, { processing: Object.assign({}, state.processing, { debug }) });
    case Actions.UPDATE_DEBUG_ROW:
      const debugRow = Object.assign({}, state.processing.debug.row, { [action.data.prop]: action.data.value });
      log.info('Debug Row', debugRow);
      return Object.assign({}, state, { processing: Object.assign({}, state.processing, { debug: Object.assign({}, state.processing.debug, { row: debugRow }) }) });
    case Actions.SAVE_HERO_CONFIG:
      return Object.assign({}, state, {
        processing: Object.assign({}, state.processing, { heroConfig: action.data }),
        settings: Object.assign({}, state.settings, { mode: 'SETTINGS' })
      });
    case Actions.SAVE_POOL_CONFIG:
      return Object.assign({}, state, {
        processing: Object.assign({}, state.processing, { poolConfig: action.data }),
        settings: Object.assign({}, state.settings, { mode: 'SETTINGS' })
      });
    case Actions.SAVE_SCREENSHOT_CONFIG:
      return Object.assign({}, state, {
        global: Object.assign({}, state.global, { screenshotWindow: action.data }),
        settings: Object.assign({}, state.settings, { mode: 'SETTINGS' })
      });
    case Actions.SAVE_TIER_CHANCE:
      return Object.assign({}, state, {
        processing: Object.assign({}, state.processing, { tierChance: action.data }),
        settings: Object.assign({}, state.settings, { mode: 'SETTINGS' })
      });
    case Actions.APPLY_CHANGES:
    case Actions.SUBMIT:
      ipcRenderer.send('update-config', 'global', state.global);
      ipcRenderer.send('update-config', 'settings', state.settings);
      ipcRenderer.send('update-config', 'processing', state.processing);
      if (action.type === Actions.SUBMIT) {
        remote.getCurrentWindow().close();
      }
      return state;
    default:
      return state;
  }
};

const SettingsPage = () => {
  const [state, dispatch] = useReducer(reducer, intialState);
  const debuggers = ['roster', 'bench', 'player', 'grid']

  ipcRenderer.removeAllListeners('update-config');
  ipcRenderer.on('update-config', (_, region, config) => {
    if (!region) {
      log.debug('Settings Page Received config', region, config);
      dispatch({ type: Actions.INITIALIZE, data: config });
    } else {
      dispatch({ type: Actions.UPDATE_CONFIG, data: { prop: region, value: config[region] } });
    }
  });

  const settingsMode = (
    <div>
      <h1>Settings</h1>
      <span className={styles.description}>Changes will not take effect until after you press Save</span>
      <div className={styles.bar}>
        <hr />
      </div>
      <form name="settingsForm" onSubmit={dispatch.bind(null, { type: Actions.SUBMIT })}>
        <div className={styles['settings-container']}>
          <div className={styles['settings-half']}>
            <div className={styles.settings}>
              <label htmlFor="enableDebug">Enable Debug Logging</label>
              <input type="checkbox" id="enableDebug" checked={state.global.logLevel === 'debug'} onChange={({ target }) => dispatch({ type: Actions.UPDATE_LOG_LEVEL, data: target.checked })} />
            </div>
            <div className={styles.settings}>
              <label htmlFor="enableScreenshot">Enable Screenshot Debugging</label>
              <input type="checkbox" id="enableScreenshot" checked={state.global.screenshotDebugging} onChange={({ target }) => dispatch({ type: Actions.UPDATE_SCREENSHOT, data: target.checked })} />
            </div>
            {state.global.screenshotDebugging ? (<div className={styles.settings}>
              <input type="text" id="screenshotLocation" value={state.global.screenshotLocation} disabled />
            </div>) : null}
            <div className={styles.settings}>
              <label htmlFor="disableListener">Disable Key Listener</label>
              <input type="checkbox" id="disableListener" checked={!state.global.keyListener} onChange={({ target }) => dispatch({ type: Actions.UPDATE_LISTENER, data: target.checked })} />
            </div>
            <div className={styles.settings}>
              <label htmlFor="keyCode">Trigger Key Code</label>
              <input type="text" id="keyCode" value={state.global.keyCode} onChange={({ target }) => dispatch({ type: Actions.UPDATE_KEY_CODE, data: target.value })} />
            </div>
            <div className={styles.settings}>
              <label htmlFor="keyCodeTest">Test Key Codes</label>
              <input type="checkBox" id="keyCodeTest" value={state.settings.keyCodeTest} onChange={({ target }) => dispatch({ type: Actions.KEY_CODE_TEST, data: target.checked })} />
            </div>
            {state.settings.keyCodeTest ? (<div className={styles.settings}><label>Press any key to see the key code</label>
              <input type="text" disabled value={state.settings.keyCodeTestCode} /></div>) :
              null}
            <div className={styles.settings}>
              <button type="button" onClick={() => dispatch({ type: Actions.VIEW_SCREENSHOT_CONFIG })}>Configure Screenshot Window</button>
            </div>
          </div>
          <div className={styles['settings-half']}>
            {debuggers.map(prop => (
              <div className={styles.settings}>
                <label htmlFor={`enableDebug${prop}`}>Enable {`${prop[0].toUpperCase()}${prop.slice(1)}`} Debugging</label>
                <input type="checkbox" id={`enableDebug${prop}`} checked={!!state.processing.debug[prop]} onChange={({ target }) => dispatch({ type: Actions.UPDATE_DEBUG_SETTING, data: { prop, value: target.checked } })} />
              </div>
            ))}
            <DebugRow state={state.processing.debug.row} onChange={(data) => dispatch({ type: Actions.UPDATE_DEBUG_ROW, data })} />
          </div>
        </div>
        <div className={styles.spacer}></div>
        <div className={styles['submit-container']}>
          <button type="button" className={styles['log-button']} onClick={() => { watchLog(state.global.logLocation, dispatch); dispatch({ type: Actions.VIEW_LOG }); }}>View log file</button>
          <button type="button" className={styles['hero-button']} onClick={() => dispatch({ type: Actions.VIEW_HERO_CONFIG })}>Configure Heroes</button>
          <button type="button" className={styles['pool-button']} onClick={() => dispatch({ type: Actions.VIEW_POOL_CONFIG })}>Configure Hero Pool</button>
          <button type="button" className={styles['tier-button']} onClick={() => dispatch({ type: Actions.VIEW_TIER_CHANCE })}>Configure Tier Chances</button>
          <div className={styles.spacer}></div>
          <button type="button" className={styles['apply-button']} onClick={() => dispatch({ type: Actions.APPLY_CHANGES })}>Apply</button>
          <button>Save</button>
        </div>
      </form>
    </div>
  );

  switch (state.settings.mode) {
    case 'SETTINGS':
      return settingsMode;
    case 'LOG':
      return <LogViewer text={state.settings.logText}
        goBack={dispatch.bind(null, { type: Actions.VIEW_SETTINGS })}
        clearLog={promptClear.bind(null, dispatch.bind(null, { type: Actions.CLEAR_LOG }))}
      />;
    case 'HERO':
      return <Header
        title="Hero Config"
        description="Higher numbers means less likely to match">
        <HeroConfig
          goBack={dispatch.bind(null, { type: Actions.VIEW_SETTINGS })}
          save={(data) => dispatch({ type: Actions.SAVE_HERO_CONFIG, data })}
          state={state.processing.heroConfig} />
      </Header>;
    case 'POOL':
      return <Header
        title="Pool Config"
        description="How many of each hero are in the pool">
        <PoolConfig
          goBack={dispatch.bind(null, { type: Actions.VIEW_SETTINGS })}
          save={(data) => dispatch({ type: Actions.SAVE_POOL_CONFIG, data })}
          state={state.processing.poolConfig} />
      </Header>;
    case 'SCREENSHOT':
      return <Header
        title="Screenshot Config"
        description="Select which screen the game will appear on">
        <ScreenshotConfig
          goBack={dispatch.bind(null, { type: Actions.VIEW_SETTINGS })}
          save={(data) => dispatch({ type: Actions.SAVE_SCREENSHOT_CONFIG, data })}
          current={state.global.screenshotWindow} />
      </Header>
    case 'TIER':
      return <Header
        title="Tier Chance Config"
        description="Chance of rolling given tier unit for given level">
        <TierChance
          goBack={dispatch.bind(null, { type: Actions.VIEW_SETTINGS })}
          save={(data) => dispatch({ type: Actions.SAVE_TIER_CHANCE, data })}
          state={state.processing.tierChance}
        />
      </Header>
    default:
      log.debug(`Unknown Mode: '${state.settings.mode}'`);
      return <div>Unknown Mode {state.settings.mode}</div>
  }
};

render(
  <AppContainer>
    <SettingsPage></SettingsPage>
  </AppContainer>,
  document.getElementById('root')
);
