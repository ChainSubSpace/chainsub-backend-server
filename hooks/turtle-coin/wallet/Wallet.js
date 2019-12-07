class Wallet {
  log = {
    error: message =>
      this.logger.error(`${this.config.name}: ${message.toString()}`),
    info: message =>
      this.logger.info(`${this.config.name}: ${message.toString()}`),
    debug: message =>
      this.logger.debug(`${this.config.name}: ${message.toString()}`)
  };

  constructor(config, strapi) {
    this.config = config;
    this.logger = strapi.log;
    this.db = strapi.plugins[this.config.plugin].services.database;
    this.strapi = strapi;

    this.log.debug("wallet class is ready");
  }

  async addUserWallet(wallet) {
    try {
      const { id } = await strapi
        .query("turtlewallet", "crypto")
        .create(wallet);

      const { username } = await this.strapi
        .query("author", "blog")
        .update({ id: wallet.authorId }, { turtleWallet: id });

      this.log.debug(`user: ${username} assigned address: ${wallet.address}`);
    } catch (error) {
      this.log.error(error.message);
    }
  }

  async addPostWallet(wallet) {
    try {
      const { id } = await strapi
        .query("turtlewallet", "crypto")
        .create(wallet);

      const { slug } = await this.strapi
        .query("post", "blog")
        .update({ id: wallet.postId }, { turtleWallet: id });

      this.log.debug(`article: ${slug} assigned address: ${wallet.address}`);
    } catch (error) {
      this.log.error(error.message);
    }
  }

  async addTransfer(transfer, config) {
    try {
      const { hash, index } = await this.db.add(transfer, config);

      let total =
        transfer.amount > 0
          ? { totalReceived: +transfer.amount }
          : { totalSent: -transfer.amount };

      const data = await strapi
        .query("turtlewallet", "crypto")
        .model.findOneAndUpdate(
          { address: transfer.wallet },
          { $inc: total },
          { new: true, lean: true }
        );

      this.log.debug(`transaction: ${hash} saved to DB Index: ${index} `);
    } catch (error) {
      this.log.error(error.message);
    }
  }

  async addInTransfer(transfer) {
    this.addTransfer(transfer, this.config.inTransactionsModel);
  }

  async addOutTransfer(transfer) {
    this.addTransfer(transfer, this.config.outTransactionsModel);
  }

  async updateBalance(wallet) {
    const {
      address,
      unlockedBalance,
      lockedBalance
    } = await this.db.findAndUpdate(
      { address: wallet.address },
      wallet,
      this.config.walletsModel
    );

    this.log.debug(
      `balance updated: [U:${unlockedBalance}/L:${lockedBalance}] ${address}`
    );
  }
}

module.exports = Wallet;
