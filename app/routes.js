import React from 'react';
import { Switch, Route } from 'react-router';
import routes from './constants/routes';
import App from './containers/app';
import HomePage from './containers/homePage';

export default () => (
  <App>
    <Switch>
      <Route path={routes.HOME} component={HomePage} />
    </Switch>
  </App>
);
