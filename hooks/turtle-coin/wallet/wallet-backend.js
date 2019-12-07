const {workerData: config, parentPort: parent, isMainThread} = require('worker_threads');
const invoke = require('lodash/invoke');
const BackendWrapper = require('./BackendWrapper');

if (isMainThread) throw new Error('This process should be a child');

const send = (method, payload, event) => parent.postMessage({method, payload, event});

const backendWrapper = new BackendWrapper(config, send);

(async () => {
  await backendWrapper.startWallet();

  backendWrapper.getWalletStatus();

  backendWrapper.onHeightChange(true, false);

  const addressMap = backendWrapper.getPublicKeyToAddressMap();
  backendWrapper.onTransaction(addressMap, true, true);

  parent.on('message', action => {
    invoke(backendWrapper, action.method, action);
  });

})();




