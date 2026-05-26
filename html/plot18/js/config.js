/**
 * Lymn / Plot18 Global Configuration
 * Contains network settings, RPC endpoints, and contract addresses.
 */

// ==========================================
// ENVIRONMENT SWITCH
// ==========================================
// Set to true for Production (BSC Mainnet)
// Set to false for Testing (BSC Testnet)
const IS_MAINNET = false;

// ==========================================
// NETWORK CONFIGURATIONS
// ==========================================
const NETWORKS = {
    mainnet: {
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
        platformTokenDecimals: 18
    },
    testnet: {
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
        // Replaced with actual testnet USDT address provided by user
        platformTokenAddress: "0x3AE1C82462d9F3b073AF95b3a8f71B4F07A263F8",
        
        // Token Info for Wallet Import
        platformTokenSymbol: "MM88 (TEST)",
        platformTokenDecimals: 18
    },

    // Backend KOL Tracker URL
    // TODO: MUST update this to your production backend URL before going live
    kolApiUrl: IS_MAINNET 
        ? "https://www.plot18.com/analysis/bsc/kolBuy/public" 
        : "https://test.plot18.com/stage-api/analysis/bsc/kolBuy/public"
};

// ==========================================
// EXPORT ACTIVE CONFIGURATION
// ==========================================
window.APP_CONFIG = IS_MAINNET ? NETWORKS.mainnet : NETWORKS.testnet;
window.APP_CONFIG.IS_MAINNET = IS_MAINNET;

// Optional: Allow LocalStorage override for custom Factory Address (Useful for admin testing)
const customFactory = localStorage.getItem("customFactoryAddress");
if (customFactory && customFactory.trim() !== "") {
    window.APP_CONFIG.factoryAddress = customFactory.trim();
    console.warn("⚠️ Using Custom Factory Address from LocalStorage:", window.APP_CONFIG.factoryAddress);
}
