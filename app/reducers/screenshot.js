import { TAKE_SCREENSHOT, CAPTURED_SCREENSHOT } from '../actions/screenshot';
import { NOOP_IGNORED } from '../actions/processStatus';

import { desktopCapturer } from 'electron';

import logger from '../utils/logging';
const log = logger('Screenshot Reducer');
// const log = require('electron').remote.require('electron-log');

export default function screenshot(state = {}, action) {
  switch (action.type) {
    case TAKE_SCREENSHOT:
      return Object.assign({}, state, { isCapturing: true, image: null });
    case CAPTURED_SCREENSHOT:
      log.debug('Captured SS');
      return Object.assign({}, state, { isCapturing: false, image: action.image });
    case NOOP_IGNORED:
      log.debug('Handling NOOP_IGNRED', action);
      return Object.assign({}, state, { isCapturing: false, image: null });
    default:
      return state;
  }
}
