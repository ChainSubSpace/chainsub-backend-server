const { Worker } = require("worker_threads");
const EventEmitter = require("events");
const uuidv4 = require("uuid/v4");
const invoke = require("lodash/invoke");

const Wallet = require("./wallet/Wallet");

const config = {
  name: "Turtle Coin",
  walletPath: "../turtle.wallet",
  walletPassword: "AxdnerESDAndeawEndOin#$ndersAerNKNESn!2",
  plugin: "crypto",
  inTransactionsModel: { model: "inturtletransaction", plugin: "crypto" },
  outTransactionsModel: { model: "outturtletransaction", plugin: "crypto" },
  walletsModel: { model: "turtlewallet", plugin: "crypto" }
};

const worker = new Worker("./hooks/turtle-coin/wallet/wallet-backend.js", {
  workerData: config
});

const eventEmitter = new EventEmitter();
const resolveMessage = event =>
  new Promise(resolve => {
    eventEmitter.once(event, payload => {
      resolve(payload);
    });
  });

module.exports = strapi => {
  // noinspection SpellCheckingInspection
  return {
    defaults: config,

    async initialize() {
      const wallet = new Wallet(this.defaults, strapi);

      worker.on("message", action => {
        if (action.event) {
          eventEmitter.emit(action.event, action.payload);
          return;
        }

        invoke(wallet, action.method, action.payload);
      });
    },
    async addUserWallet(authorId) {
      worker.postMessage({ method: "addUserWallet", authorId });
    },
    async addPostWallet(postId) {
      worker.postMessage({ method: "addPostWallet", postId });
    },
    async updateBalance(address) {
      worker.postMessage({ method: "updateBalance", address });
    },
    async getBalance(address) {
      const event = uuidv4();
      worker.postMessage({ method: "getBalance", address, event });

      return resolveMessage(event);
    },
    async withdraw(withdrawRequest) {
      const event = uuidv4();
      worker.postMessage({ method: "withdraw", withdrawRequest, event });

      return resolveMessage(event);
    }
  };
};
