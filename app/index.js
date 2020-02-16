import React, { Fragment } from 'react';
import { render } from 'react-dom';
import { AppContainer as ReactHotAppContainer } from 'react-hot-loader';
import Root from './containers/root';
import { configureStore, history } from './store/configureStore';
import './app.global.css';
import * as interact from 'interactjs';
import { ipcRenderer, desktopCapturer, remote } from 'electron';
import * as screenShotActions from './actions/screenshot';
import * as processStatusActions from './actions/processStatus';
import * as updateConfigActions from './actions/updateConfig';
import logger from './utils/logging';

const log = logger('Renderer Index');
// const log = remote.require('electron-log');
const store = configureStore();
const AppContainer = process.env.PLAIN_HMR ? Fragment : ReactHotAppContainer;

const root = document.getElementById('root');
const { innerWidth, innerHeight } = window;

let config; // Placeholder for passed in config

// Handle pass through events for fullscreen transparency
const win = remote.getCurrentWindow();
root.addEventListener('mouseenter', (event) => {
  win.setIgnoreMouseEvents(false);
}, true);
root.addEventListener('mouseleave', (event) => {
  win.setIgnoreMouseEvents(true, { forward: true });
}, true);

// Handle moving around screen
interact(root).draggable(true)
  .on('dragged', ({ target }) => {
    const x = parseInt(target.getAttribute('data-x'), 10);
    const y = parseInt(target.getAttribute('data-y'), 10);

    root.style.webkitTransform = root.style.transform = `translate(${x}px,${y}px)`;
    root.setAttribute('data-x', x);
    root.setAttribute('data-y', y);
  })
  .on('dragmove', ({ dx, dy, target }) => {
    let x = (parseFloat(target.getAttribute('data-x')) || 0) + dx;
    let y = (parseFloat(target.getAttribute('data-y')) || 0) + dy;

    x = Math.min(Math.max(0, x), innerWidth - root.clientWidth);
    y = Math.min(Math.max(0, y), innerHeight - root.clientHeight);

    root.style.webkitTransform = root.style.transform = `translate(${x}px,${y}px)`;
    root.setAttribute('data-x', x);
    root.setAttribute('data-y', y);
  });

render(
  <AppContainer>
    <Root store={store} history={history} />
  </AppContainer>,
  root
);

ipcRenderer.on('capture-ss', () => {
  log.debug('Capturing SS');
  store.dispatch(screenShotActions.takeScreenShot());
  setTimeout(() => {
    // Hidde mouse when taking screenshot (only works if mouse in app)
    root.parentNode.style.cursor = '-webkit-grab';
    // Hide app when taking screenshot
    root.style.display = 'none';
    desktopCapturer.getSources({ types: ['screen'] }, (_, sources) => {
      log.debug(`Detected ${sources.length} input sources`);
      const sourceId = config.screenshotWindow || sources[0].id;
      log.debug(`Using source ${sourceId}`);
      navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId
          }
        }
      }).then(stream => {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.onloadedmetadata = (e) => {
          video.play();
          const canvas = document.createElement('canvas');
          const { width, height } = stream.getVideoTracks()[0].getSettings();
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, width, height);

          const image = canvas.toDataURL('image/png');
          ipcRenderer.send('process-ss', image);
          store.dispatch(screenShotActions.capturedScreenShot(image));
          win.show();

          stream.getTracks()[0].stop();
        };
      }).catch(e => {
        log.error('Error Capturing Screenshot');
        log.error(e);
      }).finally(() => {
        root.parentNode.style.cursor = '';
        root.style.display = 'block';
      });
    })
  }, 150);
});

ipcRenderer.on('noop', (_, reason) => {
  log.debug('Received noop', reason);
  store.dispatch(processStatusActions.ignoreNoop(reason));
});

ipcRenderer.on('show-ss', (_, image) => {
  log.debug('Displaying SS');
  store.dispatch(screenShotActions.capturedScreenShot(image));
});

ipcRenderer.on('ss-results', (_, { image, data }) => {
  log.debug('Received SS results');
  store.dispatch(screenShotActions.capturedScreenShot(image));
  store.dispatch(processStatusActions.recieveResults(data));
});

ipcRenderer.on('error', () => {
  store.dispatch({ type: 'ERROR' });
});

ipcRenderer.on('update-config', (_, region, { global, processing }) => {
  config = global;
  store.dispatch(updateConfigActions.updateConfig(processing.poolConfig));
})