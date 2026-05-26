// ================== WALLET STATE & GLOBALS ==================
window.WalletState = {
  provider: null,
  signer: null,
  userAddress: null,
  web3Initialized: false
};

// Explicitly bind to window for cross-script reliability
window.provider = null;
window.signer = null;
window.userAddress = null;
window.web3Initialized = false;

// BUG-25 Fix: connectWallet alias
window.connectWallet = function connectWallet() {
  if (typeof openWalletModal === 'function') openWalletModal();
};

const TARGET_CHAIN_ID = window.APP_CONFIG.chainId;
const TARGET_CHAIN_NAME = window.APP_CONFIG.chainName;
const TARGET_EXPLORER_URL = window.APP_CONFIG.blockExplorerUrls[0];
const TARGET_RPC_URL = window.APP_CONFIG.rpcUrls[0];
const FALLBACK_RPC_URL = window.APP_CONFIG.fallbackRpcUrl;


let isReloading = false;
window.safeReload = function () {
  if (isReloading) return;
  isReloading = true;
  setTimeout(() => window.location.reload(), 500);
};

if (typeof window.ethereum !== "undefined") {
  window.ethereum.on("accountsChanged", (accounts) => {
    if (accounts.length === 0) disconnectWallet();
    else {
      // Reload to re-init everything safely
      window.safeReload();
    }
  });

  window.ethereum.on("chainChanged", () => {
    window.safeReload();
  });

  window.ethereum.on("disconnect", (error) => {
    console.warn("Wallet disconnected:", error);
    disconnectWallet();
    window.safeReload();
  });
}

// ================== ABIs ==================
// ABIs are now loaded from js/abis.js

// ================== SETTINGS UI ==================

function openSettingsModal() {
  // Check if exists
  let modal = document.getElementById("settings-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "settings-modal";
    modal.className =
      "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm";
    modal.innerHTML = `
            <div class="cyber-panel p-8 bg-black border border-bullish-green w-96 max-w-full shadow-[0_0_50px_rgba(0,255,65,0.2)]">
                <h2 class="text-xl font-impact text-white uppercase mb-4 tracking-wider">SYSTEM CONFIG</h2>
                
                <div class="mb-4">
                    <label class="block text-gray-500 font-terminal text-xs uppercase mb-1">Factory Contract Address</label>
                    <input type="text" id="setting-factory-addr" class="w-full bg-gray-900 border border-gray-700 text-bullish-green font-mono text-xs p-2 focus:border-bullish-green outline-none" value="${FACTORY_ADDRESS}">
                    <p class="text-[10px] text-gray-600 mt-1">Default: ${window.APP_CONFIG.factoryAddress.substring(0, 6)}...</p>
                </div>

                <div class="flex gap-2 mt-6">
                    <button onclick="saveSettings()" class="flex-1 btn-standard btn-primary py-2 text-xs font-bold text-black bg-bullish-green hover:bg-white hover:text-black">SAVE & RELOAD</button>
                    <button onclick="closeSettingsModal()" class="flex-1 border border-gray-700 text-gray-400 font-terminal text-xs hover:text-white hover:border-white py-2">CANCEL</button>
                </div>
                
                <div class="mt-4 pt-4 border-t border-gray-800 text-center">
                    <button onclick="resetSettings()" class="text-[10px] text-red-500 hover:underline">RESET TO DEFAULTS</button>
                </div>
            </div>
        `;
    document.body.appendChild(modal);
  } else {
    // Update value just in case
    const input = document.getElementById("setting-factory-addr");
    if (input) input.value = FACTORY_ADDRESS;
    modal.classList.remove("hidden");
  }
}

// ================== SHARED WALLET LOGIC ==================

/**
 * Switch Network to BSC Testnet (or Mainnet)
 */
async function switchToBSC() {
  if (typeof window.ethereum === "undefined") return false;

  try {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    if (chainId === TARGET_CHAIN_ID) return true;

    console.log(`Switching network from ${chainId} to ${TARGET_CHAIN_ID}...`);
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: TARGET_CHAIN_ID }],
      });
      return true;
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: TARGET_CHAIN_ID,
                chainName: TARGET_CHAIN_NAME,
                rpcUrls: [TARGET_RPC_URL],
                blockExplorerUrls: [TARGET_EXPLORER_URL],
                nativeCurrency: {
                  name: "BNB",
                  symbol: "BNB",
                  decimals: 18,
                },
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error("Failed to add BSC network:", addError);
          return false;
        }
      }
      console.error("Failed to switch BSC network:", switchError);
      return false;
    }
  } catch (err) {
    console.error("switchToBSC Error:", err);
    return false;
  }
}



/**
 * Token Import Logic with Fallback
 */
let pendingTokenImportAddr = "";

async function importTokenToWallet(tokenAddr, symbol, decimals) {
  // Use the active provider if available, otherwise fallback to window.ethereum
  const activeProvider = window.ethereum || (window.provider && window.provider.provider);

  if (!activeProvider) {
    showToast("No Web3 Provider Found", "error");
    return;
  }

  // Set pending address for fallback copy
  pendingTokenImportAddr = tokenAddr;

  try {
    showToast(`Requesting import for ${symbol}...`, "info");
    
    // EIP-747: wallet_watchAsset
    const wasAdded = await activeProvider.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: tokenAddr,
          symbol: symbol.substring(0, 11), // Specs limit to 11 chars
          decimals: decimals || 18,
          // image: 'https://plot18.com/images/logo.png', // Optional
        },
      },
    });

    if (wasAdded) {
      showToast(`${symbol} added to wallet!`, "success");
    } else {
      // User cancelled – guide them to manual import instead as a fallback
      console.log("User cancelled token add");
      openImportModal();
    }
  } catch (error) {
    // BUG-26 Fix: Do not show error toast or console error if user simply rejected (code 4001)
    if (error.code === 4001) {
      console.log("User rejected token import.");
    } else {
      console.error("Token Import Error:", error);
    }
    // Explicitly handle rejection or generic failure
    openImportModal();
  }
}



function confirmAndCopyTokenAddress() {
  if (!pendingTokenImportAddr) return;
  
  // Use existing copy utility or direct navigator.clipboard
  navigator.clipboard.writeText(pendingTokenImportAddr).then(() => {
    showToast("Address Copied! Please import manually.", "success");
    closeImportModal();
  }).catch(err => {
    console.error("Copy failed", err);
    showToast("Copy failed. Please copy manually.", "error");
  });
}



/**
 * Handle Multi-Wallet Selection & Deep Linking
 */
// Make handleWalletSelection available globally
window.handleWalletSelection = handleWalletSelection;
async function handleWalletSelection(walletType) {
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  let providerToUse = null;

  // 1. Detect Available Providers
  const hasMetaMask = window.ethereum && window.ethereum.isMetaMask;
  const hasOKX = window.okxwallet !== undefined;
  const hasCoinbase =
    (window.ethereum && window.ethereum.isCoinbaseWallet) ||
    window.coinbaseWalletExtension;
  const hasTokenPocket = window.ethereum && window.ethereum.isTokenPocket;
  const hasTrust = (window.ethereum && (window.ethereum.isTrust || window.ethereum.isTrustWallet)) || window.trustwallet;
  const hasSafePal = window.safepal !== undefined;

  // 2. Mobile Deep Link Logic (Fallback if App not detected natively)
  if (isMobile) {
    const currentUrl = encodeURIComponent(window.location.href);
    const hostPath = window.location.host + window.location.pathname; // For metamask dapp link

    showToast("Opening Wallet App...", "info");
    
    // Setup a mechanism to cancel the download modal if the user successfully leaves the page (i.e., app opens)
    let downloadTimeout;
    const cancelDownloadOnBlur = () => {
      clearTimeout(downloadTimeout);
      document.removeEventListener("visibilitychange", visibilityHandler);
      window.removeEventListener("pagehide", cancelDownloadOnBlur);
    };
    const visibilityHandler = () => {
      if (document.visibilityState === "hidden") {
        cancelDownloadOnBlur();
      }
    };
    document.addEventListener("visibilitychange", visibilityHandler);
    window.addEventListener("pagehide", cancelDownloadOnBlur);

    const triggerFallback = (wallet) => {
      downloadTimeout = setTimeout(() => {
        openDownloadModal(wallet);
        document.removeEventListener("visibilitychange", visibilityHandler);
        window.removeEventListener("pagehide", cancelDownloadOnBlur);
      }, 2500); // Slightly increased to 2.5s to give apps more time to open
    };

    if (walletType === "metamask" && !hasMetaMask) {
      window.location.href = `https://metamask.app.link/dapp/${hostPath}`;
      triggerFallback("metamask");
      return;
    } else if (walletType === "okx" && !hasOKX) {
      window.location.href = `okx://wallet/dapp/url?dappUrl=${currentUrl}`;
      triggerFallback("okx");
      return;
    } else if (walletType === "coinbase" && !hasCoinbase) {
      window.location.href = `cbwallet://dapp?url=${currentUrl}`;
      triggerFallback("coinbase");
      return;
    } else if (walletType === "tokenpocket" && !hasTokenPocket) {
      window.location.href = `tpdapp://open?params={"url": "${currentUrl}"}`;
      triggerFallback("tokenpocket");
      return;
    } else if (walletType === "trustwallet" && !hasTrust) {
      window.location.href = `trust://open_url?url=${currentUrl}`;
      triggerFallback("trustwallet");
      return;
    } else if (walletType === "safepal" && !hasSafePal) {
      window.location.href = `safepalwallet://back?url=${currentUrl}`;
      triggerFallback("safepal");
      return;
    }
    
    // Clean up if we didn't trigger a redirect
    cancelDownloadOnBlur();
  }

  // 3. Desktop / In-App Browser Logic
  if (walletType === "metamask") {
    if (hasMetaMask) providerToUse = window.ethereum;
    else if (window.ethereum) providerToUse = window.ethereum;
    else return openDownloadModal("metamask");
  } else if (walletType === "okx") {
    if (hasOKX) providerToUse = window.okxwallet;
    else if (window.ethereum) providerToUse = window.ethereum; // Fallback to injected generic Provider
    else return openDownloadModal("okx");
  } else if (walletType === "coinbase") {
    if (hasCoinbase) providerToUse = window.coinbaseWalletExtension || window.ethereum;
    else if (window.ethereum) providerToUse = window.ethereum; // Fallback
    else return openDownloadModal("coinbase");
  } else if (walletType === "tokenpocket") {
    if (hasTokenPocket) providerToUse = window.ethereum;
    else if (window.ethereum) providerToUse = window.ethereum;
    else return openDownloadModal("tokenpocket");
  } else if (walletType === "trustwallet") {
    if (hasTrust) providerToUse = window.trustwallet || window.ethereum;
    else if (window.ethereum) providerToUse = window.ethereum;
    else return openDownloadModal("trustwallet");
  } else if (walletType === "safepal") {
    if (hasSafePal) providerToUse = window.safepal || window.ethereum;
    else if (window.ethereum) providerToUse = window.ethereum;
    else return openDownloadModal("safepal");
  }

  // 4. Final Verification
  if (!providerToUse) {
    showToast("No Wallet Extension Found", "error");
    return;
  }

  // 5. Connect and Close Modal
  closeWalletModal();
  await connectSpecificProvider(providerToUse);
}

/**
 * Perform actual connection using a determined provider
 */
async function connectSpecificProvider(selectedProvider) {
  try {
    // 1. Request Accounts FIRST (This is standard flow and prevents errors)
    const accounts = await selectedProvider.request({
      method: "eth_requestAccounts",
    });

    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found.");
    }

    userAddress = accounts[0];
    window.userAddress = userAddress;
    window.WalletState.userAddress = userAddress;

    // 2. Initialize Ethers Provider (Any Network Context)
    // We intentionally SKIP proactive network switching here because it breaks
    // MetaMask's promise chain on Desktop, leading to silent connection failure.
    window.ethereum = selectedProvider;
    provider = new ethers.providers.Web3Provider(selectedProvider, "any");
    window.provider = provider;
    signer = provider.getSigner();
    window.signer = signer;

    // 3. Request Signature verify identity
    const message =
      "Welcome to Plot18!\n\nPlease sign this message to verify your identity.\nThis operation is free and costs zero Gas.";
    try {
      const signature = await signer.signMessage(message);
      console.log("User verified via signature:", signature);
    } catch (signErr) {
      console.warn("User rejected signature:", signErr);
      showToast("Signature Rejected", "error");
      disconnectWallet();
      return;
    }

    // 4. Success - Update UI and Storage
    localStorage.setItem("walletConnected", "true");
    localStorage.removeItem("walletDisconnected");

    updateWalletUI(userAddress);
    showToast("Wallet Connected", "success");

    if (typeof initFactory === "function") {
      await initFactory();
    }
    if (typeof loadUserBalances === "function") {
      loadUserBalances();
    }

    // Force reload after a small delay to ensure all components recognize the new state
    if (typeof window.safeReload === "function") {
      window.safeReload();
    } else {
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  } catch (err) {
    console.error("Connection Error:", err);
    showToast("Connection Rejected", "error");
    disconnectWallet();
  }
}

/**
 * Disconnect / Reset Wallet State
 * Note: Cannot effectively disconnect from metamask side, but we clear local state
 */
function disconnectWallet() {
  userAddress = null;
  window.userAddress = null;
  window.WalletState.userAddress = null;
  provider = null;
  window.provider = null;
  signer = null;
  window.signer = null;
  factoryContract = null;
  window.allProjects = null;
  window.web3Initialized = false;

  localStorage.removeItem("walletConnected");
  localStorage.setItem("walletDisconnected", "true"); // Persist manual disconnect state

  // Reset UI
  resetWalletUI();

  showToast("Wallet Disconnected", "info");

  // Optional: Refresh page to clear data if needed, or just clear container
  // window.location.reload();
}

/**
 * Update Wallet UI elements if they exist
 */
/**
 * Update Wallet UI elements if they exist (Defensive & Standardized)
 */
function updateWalletUI(address) {
  if (!address) {
    resetWalletUI();
    return;
  }

  const shortAddr = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  const displayAddr = `[ ${shortAddr} ]`;

  // 1. Desktop Button
  const btn = document.getElementById("connectWalletBtn");
  if (btn) {
    btn.innerHTML = `<i class="fa-solid fa-wallet mr-2"></i> ${shortAddr}`;
    btn.classList.add("bg-bullish-green", "text-black", "border-transparent");
    btn.classList.remove("text-bullish-green", "border-bullish-green");
    btn.onclick = null; // Address button just shows info now
  }

  // Handle Global Disconnect Button (New)
  const disconnectBtn = document.getElementById("disconnectBtn");
  if (disconnectBtn) {
    disconnectBtn.classList.remove("hidden");
    disconnectBtn.onclick = disconnectWallet;
  }

  // 2. Mobile Buttons (Menu)
  const mobileBtn = document.getElementById("connectWalletBtnMobile");
  if (mobileBtn) {
    mobileBtn.innerHTML = `<i class="fa-solid fa-wallet mr-2"></i> ${shortAddr}`;
    mobileBtn.classList.add("bg-bullish-green/20", "text-bullish-green");
    mobileBtn.onclick = disconnectWallet;
  }

  // 3. Mobile Nav Button (Top Bar - Optional Disconnect)
  const mobileNavBtn = document.getElementById("connectWalletBtnMobileNav");
  if (mobileNavBtn) {
    mobileNavBtn.innerHTML = `<i class="fa-solid fa-power-off"></i>`;
    mobileNavBtn.className =
      "text-black bg-bullish-green w-10 h-10 flex items-center justify-center rounded-sm transition-all shadow-[0_0_10px_rgba(0,255,65,0.4)]";
    mobileNavBtn.classList.add("text-red-500", "border-red-500/30");
    mobileNavBtn.classList.remove("text-bullish-green", "border-bullish-green");
    mobileNavBtn.onclick = disconnectWallet;
  }

  // 4. Hero Button
  const heroBtn = document.getElementById("heroConnectBtn");
  if (heroBtn && typeof enterDashboard === "function") {
    // If user is connected, hero button goes to App
    heroBtn.innerHTML =
      "ENTER DAPP <i class='fa-solid fa-arrow-right ml-2'></i>";
    heroBtn.onclick = enterDashboard;
  } else if (heroBtn) {
    heroBtn.innerHTML = `${shortAddr}`;
    heroBtn.classList.remove("btn-primary");
    heroBtn.classList.add(
      "bg-dark-gray",
      "text-bullish-green",
      "border",
      "border-bullish-green",
    );
    heroBtn.onclick = () => (window.location.href = "invest.html");
  }

  const heroAirdrop = document.getElementById("heroAirdropText");
  if (heroAirdrop) heroAirdrop.innerText = "[+ STATUS: ELIGIBLE]";
}

/**
 * Reset all UI elements to disconnected state
 */
function resetWalletUI() {
  const btnText = "[ Connect_Wallet ]";

  // 1. Desktop
  const btn = document.getElementById("connectWalletBtn");
  if (btn) {
    btn.innerHTML = btnText;
    btn.onclick = openWalletModal;
    btn.className =
      "text-bullish-green border border-bullish-green hover:bg-bullish-green hover:text-black px-6 py-2 font-terminal text-xs font-bold transition-all shadow-[0_0_10px_rgba(0,255,65,0.2)] hover:shadow-[0_0_20px_rgba(0,255,65,0.6)] rounded-sm whitespace-nowrap min-w-[160px] flex items-center justify-center";
  }

  const disconnectBtn = document.getElementById("disconnectBtn");
  if (disconnectBtn) {
    disconnectBtn.classList.add("hidden");
  }

  // 2. Mobile Menu
  const mobileBtn = document.getElementById("connectWalletBtnMobile");
  if (mobileBtn) {
    mobileBtn.innerHTML = "[ CONNECT WALLET ]";
    mobileBtn.classList.remove("bg-bullish-green/20", "text-bullish-green");
    mobileBtn.onclick = () => {
      if (typeof toggleMobileMenu === "function") toggleMobileMenu();
      openWalletModal();
    };
  }

  // 3. Mobile Nav
  const mobileNavBtn = document.getElementById("connectWalletBtnMobileNav");
  if (mobileNavBtn) {
    mobileNavBtn.innerHTML = '<i class="fa-solid fa-link"></i>';
    mobileNavBtn.className =
      "text-bullish-green border border-bullish-green w-10 h-10 flex items-center justify-center rounded-sm transition-all hover:bg-bullish-green hover:text-black";
    mobileNavBtn.onclick = openWalletModal;
  }

  // 4. Hero
  const heroBtn = document.getElementById("heroConnectBtn");
  if (heroBtn) {
    heroBtn.innerText = "WEB 3.0";
    heroBtn.classList.add("btn-primary");
    heroBtn.classList.remove(
      "bg-dark-gray",
      "text-bullish-green",
      "border",
      "border-bullish-green",
    );
    heroBtn.onclick = connectWallet;
  }

  const heroAirdrop = document.getElementById("heroAirdropText");
  if (heroAirdrop) heroAirdrop.innerText = "[+ SECURE AIRDROP]";
}

// Auto-Connect Detection on Load
// Auto-Connect Detection on Load
window.addEventListener("load", async () => {
  // Start Block Watcher
  startBlockWatcher();

  if (typeof window.ethereum !== "undefined") {
    // Respect manual disconnect flag
    const hasDisconnected =
      localStorage.getItem("walletDisconnected") === "true";

    if (!hasDisconnected) {
      // Check if previously connected or just check accounts quietly
      try {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (accounts.length > 0) {
          userAddress = accounts[0];
          window.userAddress = userAddress;
          window.WalletState.userAddress = userAddress;
          provider = new ethers.providers.Web3Provider(window.ethereum, "any");
          window.provider = provider;
          signer = provider.getSigner();
          window.signer = signer;

          updateWalletUI(userAddress);
          if (typeof initFactory === "function") {
            await initFactory(); // Allow silent load
          }
        } else {
          // Not connected: Try Factory Read-Only Init
          if (typeof initFactory === "function") {
            // Ensure provider is set for read-only
            provider = new ethers.providers.Web3Provider(
              window.ethereum,
              "any",
            );
            await initFactory();
          }
        }
      } catch (err) {
        console.warn("Auto-connect check failed", err);
        await initFactory(); // Fallback to Guest Mode
      }
    } else {
      // Manually disconnected previously: Read-Only mode only
      if (typeof initFactory === "function") {
        provider = new ethers.providers.Web3Provider(window.ethereum, "any");
        await initFactory();
      }
    }
  } else {
    // No Wallet Found -> Guest Mode (Fallback RPC)
    console.log("No Wallet Detected. Initializing Guest Mode...");
    if (typeof initFactory === "function") {
      await initFactory();
    }
  }
});

let blockWatcherInterval;
let isBlockWatcherRunning = false;

/**
 * Global Block Watcher
 */
async function startBlockWatcher() {
  if (isBlockWatcherRunning) return; // Prevent race conditions
  isBlockWatcherRunning = true;

  if (blockWatcherInterval) clearInterval(blockWatcherInterval);

  const update = async () => {
    // Prioritize existing provider, then window.ethereum, then Fallback
    if (!provider) {
      if (typeof window.ethereum !== "undefined") {
        provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      } else {
        provider = new ethers.providers.JsonRpcProvider(FALLBACK_RPC_URL);
      }
    }

    if (provider) {
      try {
        const block = await provider.getBlockNumber();
        const el = document.getElementById("currentBlockNum");
        if (el) el.innerText = block;
      } catch (e) {
        console.warn("Block Fetch Error", e);
      }
    }
  };

  await update();
  blockWatcherInterval = setInterval(update, 5000); // Update every 5s
}


// Expose functions to window
window.switchToBSC = switchToBSC;
window.importTokenToWallet = importTokenToWallet;
window.confirmAndCopyTokenAddress = confirmAndCopyTokenAddress;
window.handleWalletSelection = handleWalletSelection;
window.connectSpecificProvider = connectSpecificProvider;
window.disconnectWallet = disconnectWallet;
window.updateWalletUI = updateWalletUI;
window.resetWalletUI = resetWalletUI;
window.startBlockWatcher = startBlockWatcher;
