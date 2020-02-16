import { NOOP_IGNORED, RECIEVED_RESULTS } from '../actions/processStatus';
import { TAKE_SCREENSHOT } from '../actions/screenshot';

import logger from '../utils/logging';
const log = logger('ProcessStatus Reducer');

export default function processStatus(state = {}, action) {
  switch (action.type) {
    case NOOP_IGNORED:
      log.debug('Handling NOOP_IGNORED', action);
      return Object.assign({}, state, { ignored: true, reason: action.data });
    case RECIEVED_RESULTS:
      return Object.assign({}, state, { ignored: false, results: action.data})
    case TAKE_SCREENSHOT:
      return {};
    default:
      return state;
  }
};
