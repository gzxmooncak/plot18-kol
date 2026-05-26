/**
 * Plot18 Test Environment Configuration
 */
(function () {
    window.APP_ENV_CONFIGS = window.APP_ENV_CONFIGS || {};

    window.APP_ENV_CONFIGS.test = {
        chainId: "0x61", // 97
        chainName: "Binance Smart Chain Testnet",
        rpcUrls: [
            "https://data-seed-prebsc-1-s1.binance.org:8545",
            "https://data-seed-prebsc-2-s1.binance.org:8545",
            "https://bsc-testnet.publicnode.com"
        ],
        fallbackRpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545",
        blockExplorerUrls: ["https://testnet.bscscan.com/"],

        // Contracts
        factoryAddress: "0x0618d42bd847E6F1EEBB9F260A242708582B81be",
        platformTokenAddress: "0x3AE1C82462d9F3b073AF95b3a8f71B4F07A263F8",

        // Token Info for Wallet Import
        platformTokenSymbol: "MM88 (TEST)",
        platformTokenDecimals: 18,

        // Backend KOL Tracker URL
        kolApiUrl: "https://test.plot18.com/stage-api/analysis/bsc/kolBuy/public"
    };
})();
