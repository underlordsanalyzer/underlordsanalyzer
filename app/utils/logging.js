const log = require('electron').remote.require('electron-log');

const prefixCalls = obj => prefix => {
  const prefixed = Object.keys(obj).reduce((res, cur) => {
    if (typeof obj[cur] === 'function') {
      res[cur] = (...args) => obj[cur](`${prefix} | `, ...args);
    }
    return res;
  }, {});
  prefixed.prefix = p => prefixCalls(prefixed)(p);
  return prefixed;
};

export default prefixCalls(log);
