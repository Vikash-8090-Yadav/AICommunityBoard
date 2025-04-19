export const communityAddress = "0x2C8e10de89319BEdD4535fe668B659e6e1dF5593"

export const networks = {
  rootstockTestnet: {
    chainId: `0x${Number(31).toString(16)}`,
    chainName: "Rootstock Testnet",
    nativeCurrency: {
      name: "tRBTC",
      symbol: "tRBTC",
      decimals: 18
    },
    rpcUrls: ["https://public-node.testnet.rsk.co"],
    blockExplorerUrls: ['https://explorer.testnet.rootstock.io/']
  }
};
