import React, { useReducer, Fragment } from 'react';
import styles from './tierChance.scss';
import { Footer } from '../footer';
import { Accelerator } from 'electron';

const defaults = [
  {
    tier: 1,
    levels: {
      1: 100,
      2: 70,
      3: 60,
      4: 50,
      5: 40,
      6: 33,
      7: 30,
      8: 24,
      9: 22,
      10: 19,
      '10+': 10
    }
  }, {
    tier: 2,
    levels: {
      1: 0,
      2: 30,
      3: 35,
      4: 35,
      5: 35,
      6: 30,
      7: 30,
      8: 30,
      9: 30,
      10: 25,
      '10+': 15
    }
  }, {
    tier: 3,
    levels: {
      1: 0,
      2: 0,
      3: 5,
      4: 15,
      5: 23,
      6: 30,
      7: 30,
      8: 30,
      9: 25,
      10: 25,
      '10+': 30
    }
  }, {
    tier: 4,
    levels: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 2,
      6: 7,
      7: 10,
      8: 15,
      9: 20,
      10: 25,
      '10+': 30
    }
  }, {
    tier: 5,
    levels: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
      8: 1,
      9: 3,
      10: 6,
      '10+': 15
    }
  }
];

export const TierChance = ({ goBack, save, state: initialState }) => {
  const [config, updateConfig] = useReducer((state, { tier, level, value }) => {
    if (!tier) {
      return defaults;
    }
    const valNum = Number.parseInt(value);
    if (!valNum && valNum !== 0) {
      return state;
    }
    const idx = state.findIndex((cur) => cur.tier === tier);
    if (idx >= 0) {
      return state.slice(0, idx).concat(Object.assign({}, state[idx], { levels: Object.assign({}, state[idx].levels, { [level]: valNum }) }), state.slice(idx + 1));
    }
    return state;
  }, initialState || defaults);

  const getTierDescription = (num) => {
    switch (num) {
      case 1:
        return 'Tier One';
      case 2:
        return 'Tier Two';
      case 3:
        return 'Tier Three';
      case 4:
        return 'Tier Four';
      case 5:
        return 'Ace Tier';
    }
  }

  return (
    <Fragment>
      <div className={styles.container}>
        <div className={styles['header-row']}>
          <div className={styles.spacer}></div>
          {Object.keys(config[0].levels).map(level => {
            return <div key={level}>{level}</div>
          })}
        </div>
        {config.map(({ tier, levels }) => {
          return (<div className={styles['tier-row']} key={`tier${tier}`}>
            <label>{getTierDescription(tier)}</label>
            {Object.keys(levels).map((level) => {
              return <input type="text"
                key={`level${level}`}
                value={levels[level]}
                onChange={({ target }) => updateConfig({ tier, level, value: target.value })}
              />
            })}
          </div>);
        })}
        {/* <div className={styles.settings}>
          <label htmlFor="tier-1">Tier One</label>
          <input type="text" id="tier-1" value={config['tier-1']} onChange={({ target }) => updateConfig({ tier: 'tier-1', poolSize: target.value })} />
        </div>
        <div className={styles.settings}>
          <label htmlFor="tier-2">Tier Two</label>
          <input type="text" id="tier-2" value={config['tier-2']} onChange={({ target }) => updateConfig({ tier: 'tier-2', poolSize: target.value })} />
        </div>
        <div className={styles.settings}>
          <label htmlFor="tier-3">Tier Three</label>
          <input type="text" id="tier-3" value={config['tier-3']} onChange={({ target }) => updateConfig({ tier: 'tier-3', poolSize: target.value })} />
        </div>
        <div className={styles.settings}>
          <label htmlFor="tier-4">Tier Four</label>
          <input type="text" id="tier-4" value={config['tier-4']} onChange={({ target }) => updateConfig({ tier: 'tier-4', poolSize: target.value })} />
        </div>
        <div className={styles.settings}>
          <label htmlFor="tier-5">Ace Tier</label>
          <input type="text" id="tier-5" value={config['tier-5']} onChange={({ target }) => updateConfig({ tier: 'tier-5', poolSize: target.value })} />
        </div> */}
      </div>
      <Footer
        goBack={goBack}
        save={save.bind(null, config)}
        extra={{ text: 'Reset to defaults', action: updateConfig.bind() }}
      />
    </Fragment>
  )
};
