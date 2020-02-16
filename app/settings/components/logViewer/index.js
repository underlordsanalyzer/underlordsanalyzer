import React from 'react';
import styles from './logViewer.scss';

export const LogViewer = ({ goBack, clearLog, text }) => {
  // Scroll to bottom of log on load
  setTimeout(() => {
    const textarea = document.querySelector('textarea');
    textarea.scrollTop = textarea.scrollHeight;
  }, 0);
  return (
    <div className={styles['log-container']}>
      <div className={styles['button-container']}>
        <button type="button" onClick={goBack}>Go Back</button>
        <button type="button" onClick={clearLog}>Clear Log</button>
      </div>
      <textarea disabled value={text}></textarea>
    </div>
  )
};
