import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './app/App';
import { watchBuildUpdates } from './lib/buildUpdates';
import './styles.css';

async function start() {
  if (import.meta.env.PROD && await watchBuildUpdates().check()) return;
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode><BrowserRouter><App /></BrowserRouter></React.StrictMode>,
  );
}
void start();
