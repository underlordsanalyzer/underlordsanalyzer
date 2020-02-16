import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Home } from '../components/home';

export default connect(
  (state) => ({
    screenshot: state.screenshot,
    processStatus: state.processStatus,
    config: state.config,
    errorStatus: state.errorStatus
  })
)(Home);
