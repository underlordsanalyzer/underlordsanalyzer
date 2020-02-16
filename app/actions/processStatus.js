
export const NOOP_IGNORED = 'NOOP_IGNORED';
export const PROCESS_SECTION = 'PROCESS_SECTION';
export const RECIEVED_RESULTS = 'RECIEVED_RESULTS';

export const ignoreNoop = (reason) => ({
  type: NOOP_IGNORED,
  data: reason
});

export const processSection = () => ({
  type: PROCESS_SECTION
});

export const recieveResults = (results) => ({
  type: RECIEVED_RESULTS,
  data: results
});
