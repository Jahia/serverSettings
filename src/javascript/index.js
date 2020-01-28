import React from 'react';
import ReactDOM from 'react-dom';
import ServerSettingsRegistrationComponent from './serverSettings';

var mountElement = document.createElement('div');
ReactDOM.render(<ServerSettingsRegistrationComponent/>, mountElement);

console.log('%c Server Settings routes have been registered', 'color: #3c8cba');
