import { combineReducers } from 'redux';
import { connectRouter } from 'connected-react-router';
import screenshot from './screenshot';
import processStatus from './processStatus';
import updateConfig from './updateConfig';

export default function createRootReducer(history) {
  return combineReducers({
    router: connectRouter(history),
    screenshot,
    processStatus,
    config: updateConfig,
    errorStatus: (state = false, action) => {
      if (action.type === 'ERROR') {
        return true;
      }
      return state;
    }
  });
}
