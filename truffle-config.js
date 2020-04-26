var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

module.exports = {
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "http://localhost:8545/", 0, 50);
      },
      network_id: '*',
      gas: 4712388,
      gasPrice: 100000000000
    },
    rinkeby: {
      provider: () => new HDWalletProvider(mnemonic, `https://rinkeby.infura.io/v3/68f8b0a660724f6591e553247b2efbcd`),
      network_id: 4,       // rinkeby's id
      // gas: 6721975,        // rinkeby has a lower block limit than mainnet
      gasPrice: 21000000000
    }
  }
};