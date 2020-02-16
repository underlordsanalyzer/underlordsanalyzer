import React, { useState, useEffect, Fragment } from 'react';
import { desktopCapturer, remote } from 'electron';
import styles from './screenshotConfig.scss';
import { Footer } from '../footer';

export const ScreenshotConfig = ({ goBack, save, current }) => {
  const [windows, updateWindows] = useState([]);
  const [selected, updateSelected] = useState(null);

  useEffect(() => {
    desktopCapturer.getSources({ types: ['screen'] }, (_, sources) => {
      console.log('Updating Windows');
      updateWindows(sources);
      sources.forEach((source, idx) => {
        if (current ? source.id === current : idx === 0) {
          updateSelected(source.id);
        }
      })
    });
  }, []);



  return (
    <Fragment>
      <div className={styles.container}>
        {windows.map((window, idx) => (
          <label className={`${styles['window-row']} ${window.id === selected ? styles.selected : ''}`} key={idx}>
            <div className={styles.label}>{window.name} ({window.id})</div>
            <img src={window.thumbnail.toDataURL()} />
            <div className={styles['radio-container']}>
              <input type="radio" name="windowChoice" value={window.id} checked={window.id === selected} onChange={updateSelected.bind(null, window.id)} />
            </div>
          </label>
        ))}
      </div>
      <div className={styles.spacer}></div>
      <Footer
        goBack={goBack}
        save={save.bind(null, selected)}
      />
    </Fragment>
  )
};
