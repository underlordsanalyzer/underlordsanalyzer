import React from 'react';
import styles from './home.scss';
import { Results } from './results';

export const Home = ({ screenshot, processStatus, config, errorStatus }) => (
  <div className={styles.container} data-tid="container">
    {errorStatus ? <div>Error while processing.<br />Please reload...</div> : null}
    {screenshot.isCapturing ? <div className={styles.spinner} /> : (!!screenshot.image && !processStatus.results ? <img src={screenshot.image} /> : null)}
    {processStatus.ignored ? <div className={styles.ignored}>{processStatus.reason}</div> : null}
    {processStatus.results ? <Results results={processStatus.results} config={config} /> : null}
  </div>
);
