require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: { version: "0.8.20", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: {
    arc_testnet: {
      url: "https://rpc.testnet.arc.network",
      chainId: 5042002,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: { arc_testnet: process.env.ARCSCAN_API_KEY || "placeholder" },
    customChains: [{
      network: "arc_testnet",
      chainId: 5042002,
      urls: {
        apiURL: "https://testnet.arcscan.app/api",
        browserURL: "https://testnet.arcscan.app",
      },
    }],
  },
};
