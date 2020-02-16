
import React, { useReducer } from 'react';
import styles from './header.scss';

export const Header = ({ title, description, children }) => {
  return (
    <div className={styles.container}>
      <h1>{title}</h1>
      <span className={styles.description}>{description}</span>
      <div className={styles.bar}>
        <hr />
      </div>
      {children}
    </div >
  )
}