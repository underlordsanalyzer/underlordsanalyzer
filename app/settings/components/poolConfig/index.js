
import React, { useReducer, Fragment } from 'react';
import styles from './poolConfig.scss';
import { Footer } from '../footer';

const defaults = {
  'tier-1': 45,
  'tier-2': 30,
  'tier-3': 25,
  'tier-4': 20,
  'tier-5': 10
}

export const PoolConfig = ({ goBack, save, state: initialState }) => {
  const [config, updateConfig] = useReducer((state, { tier, poolSize }) => {
    console.log('Updating Pool Config', state);
    if (!tier) {
      return defaults;
    }
    return Object.assign({}, state, { [tier]: Number.parseInt(poolSize) });
  }, initialState || defaults);


  return (
    <Fragment>
      <div className={styles.container}>
        <div className={styles.settings}>
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
        </div>
      </div>
      <Footer
        goBack={goBack}
        save={save.bind(null, config)}
        extra={{text: 'Reset to defaults', action: updateConfig.bind()}}
      />
    </Fragment>
  )
};
