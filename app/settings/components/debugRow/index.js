import React, { Fragment, } from 'react';
import styles from './debugRow.scss';
import * as heroes from '../../../processor/assets/heroes';
import { parseHeroName } from '../../../utils/heroes';

const isModeActive = (mode, desiredMode) => mode === 'both' || mode === desiredMode;

const ModeSelector = ({ value, onChange }) => (
  <div className={styles.settings}>
    <label htmlFor="debugRowMode">Debug Row Mode</label>
    <select id="debugRowMode" value={value} onChange={({ target }) => onChange({ prop: 'mode', value: target.value })}>
      <option value="all">All</option>
      <option value="both">Both</option>
      <option value="name">Hero Name</option>
      <option value="number">Row Number</option>
    </select>
  </div>
);

const RowPartSelector = ({ value, onChange }) => (
  <div className={styles.settings}>
    <label htmlFor="debugRowPart">Which part of row</label>
    <select id="debugRowPart" value={value} onChange={({ target }) => onChange({ prop: 'part', value: target.value })}>
      <option value="all">All</option>
      <option value="board">Board Only</option>
      <option value="bench">Full Bench</option>
      <option value="benchtop">Top Bench</option>
      <option value="benchbottom">Bottom Bench</option>
    </select>
  </div>
)

const RowNum = ({ value, onChange }) => (
  <div className={styles.settings}>
    <label htmlFor="debugRowNum">Debug Row Number</label>
    <input type="number" id="debugRowNum" value={value} onChange={({ target }) => onChange({ prop: 'number', value: Number.parseInt(target.value, 10) })} />
  </div>
);

const HeroName = ({ value, onChange }) => {
  const heroNames = Object.keys(heroes).map(parseHeroName);
  return (<div className={styles.settings}>
    <label htmlFor="debugRowName">Debug Row by Hero Name</label>
    <select value={value} onChange={({ target }) => onChange({ prop: 'name', value: target.value })}>
      {heroNames.map(hero => <option key={hero} value={hero}>{hero}</option>)}
    </select>
  </div>
  );
};

export const DebugRow = ({ state, onChange }) => {
  const { enabled, mode, part, bench, number, name } = state;
  return (
    <Fragment>
      <div className={styles.settings}>
        <label htmlFor='enableDebugRow'>Enable Row Debugging</label>
        <input type="checkbox" id="enableDebugRow" checked={!!enabled} onChange={({ target }) => onChange({ prop: 'enabled', value: target.checked })} />
      </div>
      {enabled ? (
        <Fragment>
          <ModeSelector value={mode} onChange={onChange} />
          {isModeActive(mode, 'name') ? <HeroName value={name} onChange={onChange} /> : null}
          {isModeActive(mode, 'number') ? (
            <Fragment>
              <RowNum value={number} onChange={onChange} />
              <RowPartSelector value={part} onChange={onChange} />
            </Fragment>
          ) : null}
        </Fragment>
      ) : null}
      {/* {enabled ? <ModeSelector value={mode} onChange={onChange} /> : null}
      {enabled && isModeActive(mode, 'name') ? <HeroName value={name} onChange={onChange} /> : null}
      {enabled && isModeActive(mode, 'number') ? <RowNum value={number} onChange={onChange} /> : null}
      {enabled && isModeActive(mode, 'number') ? <RowPartSelector value={part} onChange={onChange} /> : null}
      {enabled && isModeActive(mode, 'number') && isModeActive(part, 'bench') ? <BenchPartSelector value={bench} onChange={onChange} /> : null} */}
    </Fragment >
  );
};
