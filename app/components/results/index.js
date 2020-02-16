import React, { Fragment, useState } from 'react';
import styles from './results.scss';

import { Details } from '../details';

const titleCase = (str) => str.charAt(0).toUpperCase() + str.slice(1);

const getCounts = (data) => (
  data.heroes.reduce((counts, cur) => {
    if (!counts.hasOwnProperty(cur.name)) {
      counts[cur.name] = 0;
    }
    const num = Math.pow(3, (cur.level - 1));
    counts[cur.name] += num;
    return counts;
  }, {})
);

const getNextMode = (curMode) => curMode === 'results' ? 'details' : 'results';

const ResultRow = ({ label, data }) => (
  <div className={styles['result-row']}>
    <label>{label}</label>
    <div className={styles['result-data']}>{data.heroes.map(h => h.name).join(', ')}</div>
  </div>
);

export const Results = ({ results, config }) => {
  const [mode, setMode] = useState('results');

  const counts = results.reduce((counts, cur) => {
    const boardCount = getCounts(cur.board);
    const benchTopCount = getCounts(cur.bench.top);
    const benchBottomCount = getCounts(cur.bench.bottom);
    for (let count of [boardCount, benchTopCount, benchBottomCount]) {
      for (let name of Object.keys(count)) {
        if (!counts.hasOwnProperty(name)) {
          counts[name] = 0;
        }
        counts[name] += count[name];
      }
    }
    return counts;
  }, {});

  const changeMode = () => setMode(getNextMode(mode));

  return (
    <div className={styles['results-container']}>
      <div className={styles['title-container']}>
        <div className={styles.title}>{titleCase(mode)}</div>
        <button type="button" onClick={changeMode}>Show {titleCase(getNextMode(mode))}</button>
      </div>
      {mode === 'results' ? (
        <div className={styles['results-table']}>
          <div className={styles['results-headers']}>
            <div className={styles['results-header']}>Name</div>
            <div className={styles['results-header']}>Count</div>
          </div>
          <div className={styles['results']}>
            {Object.keys(counts).sort().map(name => (
              <div key={name} className={styles['results-row']}>
                <div className={styles['results-data']}>{name}</div>
                <div className={styles['results-data']}>{counts[name]}</div>
              </div>
            ))}
          </div>
        </div>
      ) : <Details results={results} />}
    </div>
  )
};