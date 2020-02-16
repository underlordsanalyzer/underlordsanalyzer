import React, { useReducer, Fragment } from 'react';
import styles from './heroConfig.scss';
import * as heroes from '../../../processor/assets/heroes';
import { parseHeroName } from '../../../utils/heroes';
import { HERO_TEMPLATE_SETTINGS } from '../../../processor/constants';
import { Footer } from '../footer';

const accuracyThreshold = 10000;

export const HeroConfig = ({ goBack, save, state: initialState }) => {
  const [config, updateConfig] = useReducer((state, { heroId, threshold }) => {
    if (!heroId) {
      return {};
    }
    return Object.assign({}, state, { [heroId]: Number.parseInt(threshold) * accuracyThreshold });
  }, initialState);

  const getConfig = (heroId) => Number.parseInt(config && config.hasOwnProperty(heroId) ? config[heroId] : HERO_TEMPLATE_SETTINGS.threshold) / accuracyThreshold;

  const hasChanged = (heroId) => {
    const setting = getConfig(heroId);
    return setting !== HERO_TEMPLATE_SETTINGS.threshold / accuracyThreshold;
  };

  return (
    <Fragment>
      <div className={styles['hero-container']}>
        {Object.keys(heroes).map(heroId => (
          <div className={`${styles['hero-row']} ${hasChanged(heroId) ? styles.changed : null}`} key={heroId}>
            <label htmlFor={heroId}>{`${hasChanged(heroId) ? '*' : ''}${parseHeroName(heroId)}${hasChanged(heroId) ? '*' : ''}`}</label>
            <div className={styles['number-container']}>
              <input type="number" id={heroId}
                className={hasChanged(heroId) ? styles.changed : null}
                value={getConfig(heroId)}
                onChange={({ target }) => updateConfig({ heroId, threshold: target.value })} />
              {hasChanged(heroId) ? <span>*</span> : null}
            </div>
          </div>
        ))}
      </div>
      <Footer
        goBack={goBack}
        save={save.bind(null, config)}
        extra={{ text: 'Reset to defaults', action: updateConfig.bind() }}
      />
    </Fragment>
  )
};
