import { UPDATE_CONFIG } from '../actions/updateConfig';

export default function updateConfig(state = {}, action) {
  switch (action.type) {
    case UPDATE_CONFIG:
      return Object.assign({}, state, { config: action.data });
    default:
      return state;
  }
}
