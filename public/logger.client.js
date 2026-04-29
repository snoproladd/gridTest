// public/logger.client.js
export const log = (...args) => {
  if (window.__IS_DEV__ === true) {
    console.log(...args);
  }
};
