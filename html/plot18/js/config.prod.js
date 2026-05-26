/**
 * Plot18 Production Environment Configuration
 */
(function () {
    window.APP_ENV_CONFIGS = window.APP_ENV_CONFIGS || {};

    window.APP_ENV_CONFIGS.prod = {
        chainId: "0x38", // 56
        chainName: "Binance Smart Chain Mainnet",
        rpcUrls: ["https://bsc-mainnet.nodereal.io/v1/edb58fd795ef4815a8b8c51d9309c63c"],
        fallbackRpcUrl: "https://bsc-dataseed1.defibit.io/",
        blockExplorerUrls: ["https://bscscan.com/"],

        // Contracts
        factoryAddress: "0x55D4c011814778bF78D3f608FDc6BBd275C689B9",
        platformTokenAddress: "0xbABdA6BA4b77bD6060127bAAA7De38cb1ae159b8",

        // Token Info for Wallet Import
        platformTokenSymbol: "MM88",
        platformTokenDecimals: 18,

        // Backend KOL Tracker URL
        kolApiUrl: "https://www.plot18.com/analysis/bsc/kolBuy/public"
    };
})();
