import React from 'react';
import { Provider } from 'react-redux';
import { ConnectedRouter } from 'connected-react-router';
import { hot } from 'react-hot-loader/root';
import HomePage from './homePage';


const Root = ({ store, history }) => (
  <Provider store={store}>
    <ConnectedRouter history={history}>
      <HomePage />
    </ConnectedRouter>
  </Provider>
);

export default hot(Root);
