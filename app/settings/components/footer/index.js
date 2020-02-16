import React, { useReducer } from 'react';
import styles from './footer.scss';

export const Footer = ({ goBack, save, extra }) => {
  return (
    <div className={styles.container}>
      <button type="button" onClick={goBack.bind()}>Go Back</button>
      <div className={styles.spacer}></div>
      {!!extra ? (<button type="button" className={styles['extra-button']} onClick={extra.action}>{extra.text}</button>) : null}
      {<button type="button" onClick={save}>Save</button>}
    </div>
  )
}