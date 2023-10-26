require("@nomicfoundation/hardhat-toolbox");
// require("@nomicfoundation/hardhat-verify");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.18",
  networks: {
    mainnet: {
      url: "https://eth.llamarpc.com",
      // accounts: [""],
    },
    goerli: {
      url: "https://eth-goerli.api.onfinality.io/public",
      // accounts: [""],
      gasPrice: 10000000000,
    },
    arb: {
      url: "https://arb1.arbitrum.io/rpc",
    },
    mumbai: {
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: [""],
    },
  },
  etherscan: {
    apiKey: {
      mainnet: "",
      goerli: "",
      arbitrumOne: "",
      bscTestnet: "",
      bsc:"",
      polygonMumbai: "4WVX9YHEFGR3WY196D512KSW91KZ698HJ2"
    },
  },
};
