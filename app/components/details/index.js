import React, { Fragment } from 'react';
import styles from './details.scss';

const HeroRow = ({ start, size, heroes }) => {
  if (start >= heroes.length) {
    return null;
  }
  return (
    <div className={styles['hero-row']}>
      {heroes.slice(start, start + size).map((hero, idx) => (
        <div key={`${hero.name}${idx}`} className={styles.hero}>
          <div className={styles.name}>{hero.name} ({hero.level})</div>
          <img src={hero.image} />
        </div>
      ))}
    </div>
  );
};

export const Details = ({ results }) => {
  const rows = results.reduce((rows, row, idx) => {
    rows[idx] = [].concat(row.board.heroes, row.bench.top.heroes, row.bench.bottom.heroes);
    return rows;
  }, []);

  return (
    <Fragment>
      <div>Details are not done yet</div>
      <div className={styles.container}>
        {rows.map((row, idx) => (
          <div key={idx} className={styles.row}>
            <div className={styles.title}>Row {idx}</div>
            <div className={styles['hero-container']}>
              <HeroRow start={0} size={3} heroes={row} />
              <HeroRow start={3} size={3} heroes={row} />
              <HeroRow start={6} size={3} heroes={row} />
              <HeroRow start={9} size={3} heroes={row} />
            </div>
          </div>
        ))}
      </div>
    </Fragment>
  )
};