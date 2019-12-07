const crypto = require("crypto");
const walletBackend = require("turtlecoin-wallet-backend");

class BackendWrapper {
  blocksSinceLastSave = 0;

  constructor(config, send) {
    this.config = config;
    this.send = send;

    // const daemon = new WB.Daemon('node-chukwa-02.cryptocatalyst.net', 11898);
    this.daemon = new walletBackend.Daemon("localhost", 11898);

    let [wallet, error] = walletBackend.WalletBackend.openWalletFromFile(
      this.daemon,
      this.config.walletPath,
      this.config.walletPassword
    );

    if (error) {
      this.send("log.error", `failed to open wallet: ${error.toString()}`);

      this.send("log.info", "creating wallet");

      wallet = walletBackend.WalletBackend.createWallet(this.daemon);

      this.send("log.info", "saving wallet");

      wallet.saveWalletToFile(
        this.config.walletPath,
        this.config.walletPassword
      );
    }

    this.wallet = wallet;

    this.send("log.debug", "wallet file is loaded");
  }

  async startWallet() {
    if (!this.walletIsStarted) {
      await this.wallet.start();
      this.walletIsStarted = true;
      this.send("log.debug", "wallet is started");
    } else {
      this.send("log.debug", "wallet already started");
    }
  }

  saveWallet() {
    this.wallet.saveWalletToFile(
      this.config.walletPath,
      this.config.walletPassword
    );
  }

  getWalletStatus() {
    const wallet = this.wallet;

    const [
      walletBlockCount,
      localDaemonBlockCount,
      networkBlockCount
    ] = wallet.getSyncStatus();
    const address = wallet.getPrimaryAddress();
    const [unlockedBalance, lockedBalance] = wallet.getBalance();
    const subWalletsCount = wallet.getWalletCount();

    this.send("log.info", `walletBlockCount: ${walletBlockCount}`);
    this.send("log.info", `localDaemonBlockCount: ${localDaemonBlockCount}`);
    this.send("log.info", `networkBlockCount: ${networkBlockCount}`);

    this.send("log.info", `networkBlockCount: primary address: ${address}`);
    this.send("log.info", `unlockedBalance: ${unlockedBalance}`);
    this.send("log.info", `lockedBalance: ${lockedBalance}`);
    this.send("log.info", `subWalletsCount: ${subWalletsCount}`);
  }

  onHeightChange(autoSave = true, logBlocks = true) {
    this.wallet.on(
      "heightchange",
      (walletBlockCount, localDaemonBlockCount, networkBlockCount) => {
        this.blocksSinceLastSave += 1;

        if (logBlocks)
          this.send(
            "log.info",
            `${walletBlockCount}/${localDaemonBlockCount}/${networkBlockCount}`
          );

        if (this.blocksSinceLastSave >= 20 && autoSave) {
          this.blocksSinceLastSave = 0;

          this.send(
            "log.info",
            `saving wallet at block: ${walletBlockCount} network block: ${networkBlockCount}`
          );
          this.saveWallet();
        }
      }
    );
  }

  getPublicKeyToAddressMap() {
    const publicKeyToAddressMap = new Map();

    for (const address of this.wallet.getAddresses()) {
      publicKeyToAddressMap.set(this.wallet.getSpendKeys(address)[0], address);
    }

    return publicKeyToAddressMap;
  }

  onTransaction(addressMap, saveToDB = true, processTransfers = true) {
    if (processTransfers) {
      this.wallet.on("transaction", async tx => {
        for (const [publicKey, amount] of tx.transfers) {
          const transfer = {
            blockHeight: tx.blockHeight,
            fee: tx.fee,
            hash: tx.hash,
            paymentID: tx.paymentID,
            timestamp: tx.timestamp,
            unlockTime: tx.unlockTime,
            amount: amount,
            wallet: addressMap.get(publicKey),
            index: crypto
              .createHash("md5")
              .update(`${publicKey}${tx.hash}`)
              .digest("hex")
          };

          const direction = transfer.amount > 0 ? "In" : "Out";
          if (saveToDB) {
            this.send(`add${direction}Transfer`, transfer);
            this.saveWallet();
            this.updateBalance({ address: transfer.wallet });
          }

          this.send(
            "log.debug",
            `${direction}: wallet: ${transfer.wallet} amount: ${transfer.amount} hash: ${transfer.hash}`
          );
        }
      });
    }
  }

  updateBalance({ address }) {
    const method = "updateBalance";

    try {
      const [unlockedBalance, lockedBalance] = this.wallet.getBalance([
        address
      ]);
      this.send(method, { unlockedBalance, lockedBalance, address });
      return { unlockedBalance, lockedBalance };
    } catch (error) {
      this.send("log.error", `failed to get balance: ${address}`);
      return null;
    }
  }

  getSpendKeys(address) {
    const [publicSpendKey, privateSpendKey, error] = this.wallet.getSpendKeys(
      address
    );

    if (error) this.send("log.error", `can't get SpendKey for ${address}`);

    return !error ? { publicSpendKey, privateSpendKey } : null;
  }

  addSubWallet() {
    const [address, error] = this.wallet.addSubWallet();

    if (error) {
      this.send("log.error", `failed to create address: ${error.toString()}`);
    } else {
      this.saveWallet();
    }

    return !error ? address : null;
  }

  addWallet(owner) {
    const [blockHeight] = this.wallet.getSyncStatus();

    const address = this.addSubWallet();

    const spendKeys = this.getSpendKeys(address);

    return address && spendKeys
      ? {
          address,
          blockHeight,
          ...spendKeys,
          ...owner
        }
      : null;
  }

  addUserWallet({ method, authorId }) {
    const wallet = this.addWallet({ authorId });
    if (wallet) this.send(method, wallet);
  }

  addPostWallet({ method, postId }) {
    const wallet = this.addWallet({ postId });
    if (wallet) this.send(method, wallet);
  }

  getBalance({ address, method, event }) {
    try {
      const [unlockedBalance, lockedBalance] = this.wallet.getBalance([
        address
      ]);
      this.send(method, { unlockedBalance, lockedBalance }, event);
    } catch (error) {
      this.send("log.error", `failed to get balance: ${address}`);
      this.send(method, null, event);
    }
  }

  async withdraw({ method, withdrawRequest, event }) {
    const { from, to, amount } = withdrawRequest;
    let balance = this.updateBalance({ address: from });
    let hash;
    let error;

    console.log(withdrawRequest);

    if (balance) {
      if (balance.unlockedBalance < amount - 10)
        error = `Error: insufficient balance`;
    } else {
      error = `Error: can't get balance`;
    }

    if (error) {
      this.send(method, { error }, event);
      return;
    }

    try {
      hash = await this.wallet.sendTransactionAdvanced(
        [[to, amount]],
        undefined,
        10,
        undefined,
        [from],
        from
      );
    } catch (error) {
      this.send(method, { error: "Error: transaction failed" }, event);
      return;
    }

    balance = this.updateBalance({ address: from });

    this.send(method, { hash, ...balance }, event);

    this.saveWallet();
  }
}

module.exports = BackendWrapper;
