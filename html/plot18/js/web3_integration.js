// Load dynamic config from window.APP_CONFIG (set in js/config.js)
let FACTORY_ADDRESS = window.APP_CONFIG.factoryAddress;
const PLATFORM_TOKEN_ADDRESS = window.APP_CONFIG.platformTokenAddress;


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

function closeSettingsModal() {
  const modal = document.getElementById("settings-modal");
  if (modal) modal.classList.add("hidden");
}

function saveSettings() {
  const input = document.getElementById("setting-factory-addr");
  if (!input) return;

  const newAddr = input.value.trim();
  if (!ethers.utils.isAddress(newAddr)) {
    showToast("Invalid Address Format", "error");
    return;
  }

  localStorage.setItem("customFactoryAddress", newAddr);
  FACTORY_ADDRESS = newAddr;

  showToast("Settings Saved. Reloading...", "success");
  closeSettingsModal();
  setTimeout(() => window.location.reload(), 500);
}

function resetSettings() {
  localStorage.removeItem("customFactoryAddress");
  FACTORY_ADDRESS = window.APP_CONFIG.factoryAddress;
  showToast("Reset to Default", "info");
  setTimeout(() => window.location.reload(), 500);
}

// ================== VARIABLES ==================
const ASSET_POOL = [
  {
    img: "images/springs88.jpg",
    title: "SPRINGS 88",
    desc: "Simp-to-God Power Fantasy",
  },
  {
    img: "images/zero.jpg",
    title: "STUDIO ZERO",
    desc: "Freely Controllable AI Maid Robot",
  },
];

// ================== PROJECT METADATA MAPPING ==================
/**
 * Whitelist for mapping contract addresses to specific assets.
 * Keys MUST be in lower-case.
 */
const PROJECT_METADATA_MAP = {
  "0x16a5673307d4b42decb7b08cf45cab0603c30529": {
    img: "images/springs88.jpg",
    img_mobile: "images/springs88_mobile.jpg",
    title: "SPRINGS 88",
    desc: "Simp-to-God Power Fantasy",
  },
  // New Mapping for Zero Project
  "0xd3f0ec860c4f10f51c804968161c3c54369c82eb": {
    img: "images/zero.jpg",
    img_mobile: "images/zero_mobile.jpg",
    title: "STUDIO ZERO",
    desc: "Freely Controllable AI Maid Robot",
  },
  // Add more mappings here as needed
};

/**
 * Helper to get project metadata (Image, Title, Desc)
 * Falls back to deterministic random mapping if not in whitelist.
 * @param {string} address
 */
function getProjectMetadata(address) {
  if (!address) return ASSET_POOL[0];

  const lowerAddr = address.toLowerCase();

  // 1. Check Whitelist Map
  if (PROJECT_METADATA_MAP[lowerAddr]) {
    console.log(`[Metadata] Whitelist match found for ${address}`);
    return PROJECT_METADATA_MAP[lowerAddr];
  }

  // 2. Fallback: Hash-based random assignment from ASSET_POOL
  const hashChar = lowerAddr.substring(lowerAddr.length - 1);
  const hashIndex = parseInt(hashChar, 16) % ASSET_POOL.length;
  return ASSET_POOL[hashIndex];
}

// ================== VARIABLES ==================
let factoryContract;
let isLoadingProjects = false; // Guard for concurrency safety



/**
 * Initialize Factory Contract
 * Supports Read-Only if Signer not available but Provider is
 */
async function initFactory() {
  window.initFactory = initFactory; // Bind for external access
  // Ensure we are on BSC if using injected provider
  if (typeof window.ethereum !== "undefined" && !signer) {
    const isCorrect = await switchToBSC();
    if (!isCorrect) {
      console.warn(
        "initFactory: User rejected network switch. Falling back to Guest Mode.",
      );
      // Fall through to guest mode logic below
    }
  }

  // Guest Mode / Fallback Initialization
  if (!signer && !provider) {
    if (typeof window.ethereum !== "undefined") {
      try {
        // Try to use browser provider first (even if mainnet, logic will handle mismatch later or user sees empty)
        // But generally for guest mode in 'loadProjects' we need a working provider.
        // If browser provider is on wrong net, getCode might fail.
        // So we might want to be smarter here? For now, stick to standard pattern:
        provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      } catch (e) {
        provider = new ethers.providers.JsonRpcProvider(FALLBACK_RPC_URL);
      }
    } else {
      provider = new ethers.providers.JsonRpcProvider(FALLBACK_RPC_URL);
    }
    console.log("initFactory: Initialized Provider (Guest/Read-Only)");
  }

  if (!signer && !provider) {
    // Should not happen with fallback, but safety check
    console.warn("initFactory: No Signer or Provider");
    return;
  }

  // 1. Define Runner & Provider
  // runner is for the contract (Signer or Provider)
  // finalProvider is for the getCode call (always a Provider)
  const runner = signer || provider;
  const finalProvider = signer ? signer.provider : provider;

  try {
    // 2. Verify Deployment Exists
    const code = await finalProvider.getCode(FACTORY_ADDRESS);
    if (code === "0x") {
      // Network Mismatch Check - If using Injected Provider, try Fallback?
      const network = await finalProvider.getNetwork();
      console.warn(`Contract not found on ChainID: ${network.chainId}.`);

      // Auto-Switch to Guest Mode if on Injected Provider and Contract Missing
      if (
        !finalProvider.connection ||
        finalProvider.connection.url !== FALLBACK_RPC_URL
      ) {
        console.log("Attempting switch to Guest Mode (Fallback RPC)...");
        // CRITICAL FIX: Clear signer/user to force usage of new Provider
        signer = null;
        userAddress = null;
        provider = new ethers.providers.JsonRpcProvider(FALLBACK_RPC_URL);
        return initFactory(); // Retry recursively
      }

      const msg = `FATAL: No Smart Contract found at ${FACTORY_ADDRESS}. Check your config or network.`;
      console.error(msg);
      showToast("Contract Not Found! Check Console.", "error");
      const container = document.getElementById("project-list-container");
      if (container) {
        container.innerHTML = `<div class="col-span-full text-center text-red-500 font-terminal p-4 border border-red-900 bg-red-900/10">
                        <div class="mb-2 font-bold">SYSTEM ERROR: CONTRACT NOT FOUND</div>
                        <div class="text-xs text-gray-400 mb-4">Target: ${FACTORY_ADDRESS}<br>Network: ${(await finalProvider.getNetwork()).chainId}</div>
                        <button onclick="openSettingsModal()" class="btn-standard btn-primary px-4 py-1 text-xs mx-auto bg-red-500 text-black hover:bg-white border-none">
                            <i class="fa-solid fa-gear mr-2"></i> CONFIGURE ADDRESS
                        </button>
                     </div>`;
      }
      return;
    }

    factoryContract = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, runner);
    window.factoryContract = factoryContract; // Expose for testing and external access
    console.log("Factory Contract Initialized at:", FACTORY_ADDRESS);

    // Trigger load
    await loadProjects();
    window.web3Initialized = true; // Signal ready for other modules
  } catch (e) {
    console.error("Factory Init Failed:", e);
    showToast("Init Failed: " + (e.reason || e.message), "error");
  }
}

/**
 * Load all projects from the factory and render them
 */
async function loadProjects() {
  if (isLoadingProjects) {
    console.warn("loadProjects already in progress. Ignoring request.");
    return;
  }

  console.log("Starting loadProjects...");
  if (!factoryContract) {
    console.error("No Factory Contract Instance");
    return;
  }

  isLoadingProjects = true; // Lock

  // Snapshot environment to prevent race conditions during rapid clicks
  const activeProvider = provider;
  const activeUser = userAddress;

  const container = document.getElementById("project-list-container");
  // Ensure container matches full screen style if we are on invest page
  if (container) {
    // Initial Loading State (Full Screen)
    container.innerHTML = `
        <div class="h-screen w-full flex flex-col items-center justify-center snap-start">
            <i class="fa-solid fa-circle-notch fa-spin text-5xl text-bullish-green mb-6 shadow-[0_0_30px_#00FF41]"></i>
            <div class="text-white font-terminal text-lg tracking-widest animate-pulse">SCANNING BLOCKCHAIN...</div>
        </div>`;
  }

  try {
    // Init Factory
    if (!factoryContract) {
      factoryContract = new ethers.Contract(
        FACTORY_ADDRESS,
        FACTORY_ABI,
        provider,
      );
    }

    // Log the call
    console.log("Calling getAllProjectlist on", factoryContract.address);

    let projectAddresses = [];
    try {
      projectAddresses = await factoryContract.getAllProjectlist();
    } catch (callErr) {
      console.error("Critical Call Error:", callErr);

      // Check specific CALL_EXCEPTION
      if (callErr.code === "CALL_EXCEPTION") {
        if (container) {
          container.innerHTML = `
                    <div class="h-screen w-full flex flex-col items-center justify-center snap-start p-10 text-center">
                        <div class="text-3xl text-red-500 mb-4"><i class="fa-solid fa-triangle-exclamation"></i> CONNECTION FAILED</div>
                        <p class="text-gray-400 font-terminal mb-6">Contract Address Invalid or Wrong Network</p>
                        <div class="text-xs font-mono bg-gray-900/50 p-3 mb-6 border border-gray-800 text-gray-300 rounded">${FACTORY_ADDRESS}</div>
                        <button onclick="openSettingsModal()" class="btn-standard btn-primary px-8 py-3 bg-red-600 text-white hover:bg-white hover:text-black">
                            UPDATE SETTINGS
                        </button>
                    </div>`;
        }
        return; // Stop execution
      }
      throw callErr;
    }

    console.log("Projects Found:", projectAddresses);
    window.allProjects = projectAddresses;

    if (projectAddresses.length === 0) {
      if (container) {
        container.innerHTML = `
                  <div class="h-screen w-full flex flex-col items-center justify-center snap-start">
                      <div class="w-24 h-24 border-2 border-gray-800 rounded-full flex items-center justify-center mb-6 text-gray-700">
                          <i class="fa-solid fa-folder-open text-4xl"></i>
                      </div>
                      <h3 class="text-4xl font-impact text-gray-600 uppercase tracking-widest mb-2">NO PROJECTS</h3>
                      <p class="text-sm text-gray-500 font-terminal mb-8">The fundraising queue is currently empty.</p>
                      <button onclick="loadProjects()" class="text-bullish-green hover:text-white font-terminal hover:scale-110 transition-transform">
                          <i class="fa-solid fa-rotate-right mr-2"></i> REFRESH SYSTEM
                      </button>
                  </div>
              `;
      }
      return;
    }
    let html = "";
    // Add Tab Filters System UI (only if on an invest page, determined by layout context)
    // We inject this once before the loop
    html += `
    <div id="launchpad-filters" class="fixed top-[100px] left-1/2 transform -translate-x-1/2 z-40 flex items-center justify-center gap-2 bg-black/80 p-2 rounded-full border border-gray-800 backdrop-blur-md shadow-lg transition-all hidden md:flex">
        <button onclick="filterProjects('ALL')" class="filter-btn active px-4 py-1 text-xs font-terminal font-bold text-black bg-bullish-green rounded-full transition-colors">ALL</button>
        <button onclick="filterProjects('ACTIVE')" class="filter-btn px-4 py-1 text-xs font-terminal font-bold text-gray-400 hover:text-white transition-colors">ACTIVE</button>
        <button onclick="filterProjects('UPCOMING')" class="filter-btn px-4 py-1 text-xs font-terminal font-bold text-gray-400 hover:text-white transition-colors">UPCOMING</button>
        <button onclick="filterProjects('ENDED')" class="filter-btn px-4 py-1 text-xs font-terminal font-bold text-gray-400 hover:text-white transition-colors">ENDED</button>
    </div>
    
    <!-- Filter styles and logic injected inline for speed -->
    <style>
        .filter-btn.active { background-color: #00FF41 !important; color: black !important; border: 1px solid #00FF41; }
    </style>
    `;
    const currentBlock = await activeProvider.getBlockNumber();
    const blockEl = document.getElementById("currentBlockNum");
    if (blockEl) blockEl.innerText = currentBlock;

    // --- BEGIN CHUNKING OPTIMIZATION ---
    // Chunk size for parallel requests to avoid HTTP 429 Too Many Requests
    const CHUNK_SIZE = 5;

    for (let i = 0; i < projectAddresses.length; i += CHUNK_SIZE) {
      // Abort if environment has changed
      if (userAddress !== activeUser) break;
      if (!activeProvider) break;

      const chunk = projectAddresses.slice(i, i + CHUNK_SIZE);

      // Process a chunk in parallel
      const chunkPromises = chunk.map(async (addr) => {
        const asset = getProjectMetadata(addr);
        const displayTitle = asset.title;

        try {
          // Fetch Data
          const projectContract = new ethers.Contract(
            addr,
            FUNDRAISING_PROJECT_ABI,
            activeProvider,
          );

          // Parallel fetch for this specific contract
          const [productData, settingData] = await Promise.all([
            projectContract.product(),
            projectContract.setting(),
          ]);

          // Contracts for Metadata/Decimals
          const baseTokenContractForDec = new ethers.Contract(
            productData.baseToken,
            ERC20_ABI_EXTENDED,
            activeProvider,
          );
          const presaleTokenContractForDec = new ethers.Contract(
            productData.presaleToken,
            ERC20_ABI_EXTENDED,
            activeProvider,
          );

          // Parallel fetch for Symbols and Decimals
          const [
            baseTokenSymbol,
            presaleTokenSymbol,
            baseDecimals,
            presaleDecimals
          ] = await Promise.all([
            baseTokenContractForDec.symbol().catch(() => "USDT"),
            presaleTokenContractForDec.symbol().catch(() => "TOK"),
            baseTokenContractForDec.decimals().catch(() => 18),
            presaleTokenContractForDec.decimals().catch(() => 18),
          ]);

          // Parse Data
          const state = getProjectState(productData, settingData, currentBlock);
          // HIGH-02 Fix: Pass actual presaleDecimals instead of relying on hardcoded default 18
          const progressPercent = calculateProgress(
            productData.saleAmount,
            productData.presaleAmount,
            presaleDecimals,
          );
          const softCap = ethers.utils.formatUnits(
            productData.presaleAmount.div(2),
            presaleDecimals,
          ); // Approx
          const hardCap = ethers.utils.formatUnits(
            productData.presaleAmount,
            presaleDecimals,
          );
          const exchangeRate = parseFloat(
            ethers.utils.formatUnits(productData.exchangeRate, baseDecimals),
          ).toString(); // Format for `updateEstimate` & UI displays
          const minBuy = settingData.minPerBuy;
          const maxBuy = settingData.maxBuy;

          // Calculate accurate remaining cap for the input max attribute
          const remainingWei = productData.presaleAmount.sub(
            productData.saleAmount,
          );
          const actualMaxBuyWei = maxBuy.lt(remainingWei)
            ? maxBuy
            : remainingWei;
          const actualMaxBuyUI = ethers.utils.formatUnits(
            actualMaxBuyWei,
            presaleDecimals,
          );

          // Fetch User Balance for the UI
          let userBalText = "--";
          if (activeUser && activeProvider) {
            try {
              const baseTokenContract = new ethers.Contract(
                productData.baseToken,
                ERC20_ABI_EXTENDED,
                activeProvider,
              );
              const balBN = await baseTokenContract.balanceOf(activeUser);
              const balFtd = ethers.utils.formatUnits(balBN, baseDecimals);
              // Convert to float and fix to 2 decimals or 0 if exactly 0
              userBalText =
                parseFloat(balFtd) > 0 ? parseFloat(balFtd).toFixed(2) : "0.00";
            } catch (e) {
              console.warn("Could not fetch user balance", e);
            }
          }

          // Build HTML (RESPONSIVE IMMERSIVE)
          // Added data-status for filtering
          return `
                <section id="${asset.title.replace(/\s+/g, '-').toLowerCase()}" class="project-card-section h-screen w-full snap-start relative flex flex-col justify-end overflow-hidden bg-black group" data-status="${state.text}">
                    
                    <!-- Background Image (Responsive) -->
                    <div class="absolute inset-0 z-0 select-none">
                        <picture>
                             <source media="(max-width: 768px)" srcset="${asset.img_mobile || asset.img}">
                             <img src="${asset.img}" class="w-full h-full object-cover opacity-80" alt="${asset.title}">
                        </picture>
                    </div>

                    <!-- Gradient Overlay (Visibility) -->
                    <div class="absolute inset-0 z-10 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none"></div>
                    <!-- Secondary Bottom Gradient for Mobile Text Readability -->
                    <div class="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black via-black/40 to-transparent md:hidden pointer-events-none z-10"></div>

                    <!-- Main Content Layer -->
                    <div class="relative z-20 w-full max-w-7xl mx-auto px-6 pt-[20vh] pb-[calc(2rem+var(--mobile-bottom-nav-height,0px))] md:pt-0 md:pb-24 flex flex-col md:flex-row items-end md:items-center justify-between gap-6 md:gap-10">
                        
                        <!-- Left: Info & Story -->
                        <div class="flex-1 w-full md:max-w-2xl mb-2 md:mb-0">
                             <!-- Status Badge -->
                            <div class="inline-flex items-center gap-2 px-2 py-0.5 bg-${state.color}/20 border border-${state.color}/50 text-${state.color} text-[10px] md:text-xs font-bold font-terminal mb-2 md:mb-4 tracking-wider backdrop-blur-sm">
                                <span class="animate-pulse">●</span> ${state.text}
                            </div>

                            <h2 class="text-4xl md:text-7xl font-impact text-white uppercase tracking-wide leading-none md:leading-tight mb-2 drop-shadow-lg">
                                ${asset.title}
                            </h2>
                            <div class="font-mono text-bullish-green text-[10px] md:text-sm mb-3 md:mb-6 opacity-80 pl-1">
                                [ CONTRACT: <a href="${TARGET_EXPLORER_URL}address/${addr}" target="_blank" class="hover:text-white hover:underline transition-colors items-center inline-flex gap-1" title="View on Block Explorer">
                                    ${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}
                                    <i class="fa-solid fa-up-right-from-square text-[8px] md:text-[10px] opacity-70"></i>
                                </a> ]
                            </div>
                            
                            <!-- Description (Compact on Mobile) -->
                            <p class="text-gray-400 text-xs md:text-xl font-body leading-relaxed max-w-xl text-shadow-sm border-l-2 border-bullish-green/50 pl-4 mb-4 md:mb-0 line-clamp-2 md:line-clamp-none">
                                ${asset.desc}
                            </p>

                            <!-- Details Grid (Blocks & Limits) - Compact on Mobile -->
                            <div class="flex md:grid md:grid-cols-4 gap-4 md:gap-4 mt-4 md:mt-8 font-terminal text-[9px] md:text-xs text-gray-500 overflow-x-auto no-scrollbar">
                                <div class="flex-shrink-0 md:bg-black/30 md:p-2 md:border md:border-gray-800">
                                    <div class="text-gray-600 mb-0.5 md:mb-1 uppercase tracking-tighter md:tracking-normal">Start</div>
                                    <div class="text-gray-300 md:text-white font-mono">${productData.startBlock}</div>
                                </div>
                                <div class="flex-shrink-0 md:bg-black/30 md:p-2 md:border md:border-gray-800">
                                    <div class="text-gray-600 mb-0.5 md:mb-1 uppercase tracking-tighter md:tracking-normal">End</div>
                                    <div class="text-gray-300 md:text-white font-mono">${productData.endBlock}</div>
                                </div>
                                <div class="flex-shrink-0 md:bg-black/30 md:p-2 md:border md:border-gray-800">
                                    <div class="text-gray-600 mb-0.5 md:mb-1 uppercase tracking-tighter md:tracking-normal">Min Buy</div>
                                    <div class="text-gray-300 md:text-white font-mono">${ethers.utils.formatUnits(settingData.minPerBuy, presaleDecimals)}</div>
                                </div>
                                <div class="flex-shrink-0 md:bg-black/30 md:p-2 md:border md:border-gray-800">
                                    <div class="text-gray-600 mb-0.5 md:mb-1 uppercase tracking-tighter md:tracking-normal">Max Buy</div>
                                    <div class="text-gray-300 md:text-white font-mono">${ethers.utils.formatUnits(settingData.maxBuy, presaleDecimals)}</div>
                                </div>
                            </div>
                        </div>

                        <!-- Right: Action Module -->
                        <div class="w-full md:w-96 bg-black/60 md:bg-black/40 backdrop-blur-md border border-white/10 p-4 md:p-6 rounded-lg shadow-2xl relative overflow-hidden group-hover:border-white/30 transition-colors">
                            <!-- Progress -->
                            <div class="mb-4 md:mb-6">
                                <div class="flex justify-between text-xs font-terminal text-gray-400 mb-1 md:mb-2">
                                    <span>PROGRESS</span>
                                    ${progressPercent >= 80 && progressPercent < 100 ? `<span class="text-xs text-desire-pink animate-pulse bg-desire-pink/10 px-2 py-0.5 rounded border border-desire-pink/50 mr-2">[ ALMOST SOLD OUT ]</span>` : ""}
                                    <span class="text-bullish-green">${progressPercent}%</span>
                                </div>
                                <div class="h-2 md:h-4 w-full bg-gray-900 rounded-lg overflow-hidden border border-gray-800 relative">
                                    <!-- FOMO Zebra Stripes for > 80% -->
                                    <div class="h-full bg-gradient-to-r from-bullish-green to-desire-pink relative ${progressPercent >= 80 ? "animate-progress-stripe shadow-[0_0_20px_#FF00FF]" : "shadow-[0_0_10px_#00FF41]"}" 
                                         style="width: ${progressPercent}%; ${progressPercent >= 80 ? "background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.2) 10px, rgba(255,255,255,0.2) 20px);" : ""}">
                                        <div class="absolute right-0 top-0 bottom-0 w-[1px] bg-white shadow-[0_0_10px_white]"></div>
                                    </div>
                                </div>
                            </div>

                            <!-- Inputs & Action Module Wrapper (for locking) -->
                            <div id="action-wrapper-${addr}" class="transition-opacity duration-300">
                                <div class="mb-4">
                                    <label class="text-xs text-bullish-green font-bold mb-1 block">ENTER TOKEN AMOUNT TO BUY:</label>
                                    <div class="relative">
                                        <input type="number" 
                                            id="buy-amount-${addr}"
                                            class="w-full bg-black/60 border border-gray-600 focus:border-bullish-green text-white font-mono text-lg p-3 outline-none transition-colors no-spinner"
                                            placeholder="Min: ${ethers.utils.formatUnits(minBuy, presaleDecimals)} Tokens"
                                            data-rate="${exchangeRate}"
                                            data-min="${minBuy}"
                                            data-presale-decimals="${presaleDecimals}"
                                            data-base-decimals="${baseDecimals}"
                                            step="any"
                                            min="0"
                                            max="${actualMaxBuyUI}"
                                            oninput="updateEstimate(this, '${exchangeRate}'); if(this.value < 0) this.value = 0; if(parseFloat(this.value) > parseFloat(this.max)) this.value = this.max;"
                                            onkeydown="if(event.key === 'Enter') document.getElementById('buy-btn-${addr}').click();"
                                        >
                                        <div class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">${presaleTokenSymbol}</div>
                                    </div>
                                    <div class="flex justify-between text-[10px] font-terminal text-gray-500 mt-2 px-1">
                                        <span>EST COST: <span id="est-${addr}" class="text-white font-bold">0</span> ${baseTokenSymbol}</span>
                                        <span>YOUR BAL: <span id="bal-${addr}" class="text-bullish-green">${userBalText}</span></span>
                                    </div>
                                </div>

                                <!-- Buttons -->
                                <div class="grid grid-cols-1 gap-3">
                                    <button id="buy-btn-${addr}" onclick="buyToken('${addr}', '${productData.baseToken}')" 
                                        class="btn-standard btn-primary py-4 text-base font-bold shadow-[0_0_15px_rgba(0,255,65,0.3)] hover:shadow-[0_0_25px_rgba(0,255,65,0.6)] uppercase tracking-wider">
                                        ACQUIRE ALLOCATION
                                    </button>

                                    <!-- Import Token (New Feature) -->
                                    <button onclick="importTokenToWallet('${productData.presaleToken}', '${presaleTokenSymbol}', ${presaleDecimals})" 
                                        class="btn-standard btn-primary py-3 text-xs font-bold bg-desire-pink text-white hover:bg-white hover:text-black shadow-[0_0_15px_rgba(255,0,255,0.3)] hover:shadow-[0_0_25px_rgba(255,0,255,0.6)] uppercase tracking-widest border-none">
                                        <i class="fa-solid fa-plus-circle mr-2"></i> IMPORT $${presaleTokenSymbol} TO YOUR WALLET
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- Scroll Hint (Bottom Center) -->
                    <div class="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-white/50 text-xs font-terminal animate-bounce pointer-events-none flex flex-col items-center gap-1 z-30 hidden md:flex">
                        <span>SCROLL</span>
                        <i class="fa-solid fa-chevron-down"></i>
                    </div>

                </section>
                `;
        } catch (err) {
          console.error("Error loading project " + addr, err);
          return `
                <section class="h-screen w-full snap-start relative flex items-center justify-center bg-black border-y border-red-900/30">
                     <div class="text-center">
                        <div class="text-red-500 font-mono text-xl mb-2">DATA CORRUPTION DETECTED</div>
                        <div class="text-gray-600 text-xs font-mono max-w-md mx-auto p-4 border border-red-900/50 bg-red-900/10">
                            TARGET: ${addr}<br>
                            ERROR: ${err.message ? err.message.substring(0, 100) : "Unknown Error"}...
                        </div>
                     </div>
                </section>`;
        }
      });

      // Resolve the entire chunk and append to HTML
      const chunkResults = await Promise.all(chunkPromises);
      html += chunkResults.join("");
    }
    // --- END CHUNKING OPTIMIZATION ---

    if (container) {
      container.innerHTML = html;
      
      // Auto-scroll logic for anchor links
      if (window.location.hash) {
        const targetId = window.location.hash.substring(1);
        setTimeout(() => {
          const targetElement = document.getElementById(targetId);
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
          }
        }, 500); // Small delay to ensure rendering is complete
      }
    }
  } catch (err) {
    console.error("Failed to load projects:", err);
    // Container error
    const container = document.getElementById("project-list-container");
    if (container)
      container.innerHTML = `
        <div class="h-screen w-full flex flex-col items-center justify-center snap-start text-red-500">
             <i class="fa-solid fa-bug text-4xl mb-4"></i>
             <div class="font-bold font-terminal">SYSTEM FAILURE</div>
             <div class="text-xs mt-2 opacity-70">${err.message || err.reason}</div>
        </div>`;
  } finally {
    isLoadingProjects = false; // Release lock
  }
}

/**
 * Filter projects in Launchpad view
 */
function filterProjects(status) {
  // Update UI buttons
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.remove("active", "bg-bullish-green", "text-black");
    btn.classList.add("text-gray-400");
    if (btn.innerText === status) {
      btn.classList.add("active", "bg-bullish-green", "text-black");
      btn.classList.remove("text-gray-400");
    }
  });

  // Filter project sections
  const projects = document.querySelectorAll(".project-card-section");
  projects.forEach((p) => {
    if (status === "ALL") {
      p.style.display = "flex";
    } else {
      if (
        p.dataset.status === status ||
        (status === "ENDED" && p.dataset.status === "SOLD OUT")
      ) {
        p.style.display = "flex";
      } else {
        p.style.display = "none";
      }
    }
  });
}

/**
 * Helper: Calculate Project State
 */
function getProjectState(productData, settingData, currentBlock) {
  if (settingData.paused) return { text: "PAUSED", color: "yellow-500" };
  if (settingData.blocked) return { text: "BLOCKED", color: "red-600" };

  // Check Blocks
  if (currentBlock < productData.startBlock)
    return { text: "UPCOMING", color: "blue-500" };
  if (currentBlock > productData.endBlock)
    return { text: "ENDED", color: "gray-500" };

  // Check Sold Out
  const progress = calculateProgress(
    productData.saleAmount,
    productData.presaleAmount,
  );
  if (progress >= 100) return { text: "SOLD OUT", color: "desire-pink" };

  return { text: "ACTIVE", color: "bullish-green" };
}

/**
 * Helper: Calculate Progress Percentage
 */
function calculateProgress(saleAmount, totalAmount, decimals = 18) {
  if (!totalAmount || totalAmount.eq(0)) return 0;
  // Convert from ethers BigNumber to normal floats to avoid large BN precision issues
  const sale = parseFloat(ethers.utils.formatUnits(saleAmount, decimals));
  const total = parseFloat(ethers.utils.formatUnits(totalAmount, decimals));
  if (total === 0) return 0;

  const percentage = (sale / total) * 100;
  return Math.min(100, Math.floor(percentage)); // Floor to avoid rounding up 99.9% to 100%
}

/**
 * Buy tokens from a fundraising project
 * @param {string} projectAddr
 * @param {string} baseTokenAddr
 */
async function buyToken(projectAddr, baseTokenAddr) {
  // Robust check for signer
  if (!signer) {
    // Try to recover
    if (typeof window.ethereum !== "undefined" && userAddress) {
      provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      signer = provider.getSigner();
    } else {
      showToast("Please Connect Wallet First", "error");
      // Optional: trigger connect
      connectWallet();
      return;
    }
  }

  // Ensure userAddress is set
  if (!userAddress && signer) {
    try {
      userAddress = await signer.getAddress();
    } catch (e) {
      console.error("Addr fetch failed", e);
    }
  }

  const amountInput = document.getElementById(`buy-amount-${projectAddr}`);
  if (!amountInput || !amountInput.value) {
    showToast("Enter Amount", "error");
    return;
  }

  const amountVal = amountInput.value;
  const buyBtn = document.getElementById(`buy-btn-${projectAddr}`);
  const originalBtnContent = buyBtn.innerHTML;

  // Helper to reset button
  const resetBtn = () => {
    if (buyBtn) {
      buyBtn.disabled = false;
      buyBtn.innerHTML = originalBtnContent;
    }

    // Unlock UI
    const wrapper = document.getElementById(`action-wrapper-${projectAddr}`);
    if (wrapper) {
      wrapper.classList.remove("pointer-events-none", "opacity-50");
    }
  };

  try {
    // 1. Pre-flight UI Lock
    buyBtn.disabled = true;
    buyBtn.innerHTML =
      '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i> PROCESSING...';

    // Lock entire action area to prevent double submissions or input edits
    const wrapper = document.getElementById(`action-wrapper-${projectAddr}`);
    if (wrapper) {
      wrapper.classList.add("pointer-events-none", "opacity-50");
    }

    // 2. Init Contract
    const project = new ethers.Contract(
      projectAddr,
      FUNDRAISING_PROJECT_ABI,
      signer,
    );

    // 3. Status Checks first to get productData and presaleToken address
    const [productData, settingData] = await Promise.all([
      project.product(),
      project.setting(),
    ]);

    // 4. Setup Variables for Token Amount instead of Base Amount ($)
    // The user input 'amountVal' is the number of Presale Tokens they want to buy.
    const presaleTokenDecimals = await new ethers.Contract(
      productData.presaleToken,
      ERC20_ABI_EXTENDED,
      signer,
    ).decimals();
    // amountWei now represents the Presale Token amount in its lowest unit
    const amountWei = ethers.utils.parseUnits(amountVal, presaleTokenDecimals);

    // Enforce Minimum Buy Limit based on contract setting
    if (amountWei.lt(settingData.minPerBuy)) {
      const readableMin = ethers.utils.formatUnits(
        settingData.minPerBuy,
        presaleTokenDecimals,
      );
      showToast(
        `Minimum purchase amount is ${parseFloat(readableMin).toFixed(0)} tokens!`,
        "error",
      );
      resetBtn();
      return;
    }

    // Timing Check
    const currentBlock = await provider.getBlockNumber();
    if (currentBlock < productData.startBlock.toNumber()) {
      showToast(`Sale Not Started`, "error");
      resetBtn();
      return;
    }
    if (currentBlock > productData.endBlock.toNumber()) {
      showToast(`Sale Ended`, "error");
      resetBtn();
      return;
    }

    // Project Status Check
    if (settingData.paused || settingData.blocked) {
      showToast(`Project Paused/Blocked`, "error");
      resetBtn();
      return;
    }

    // Balance Check - Calculate actual Base Token (USDT) cost exactly like the smart contract does:
    // uint256 numerator = tokenAmount * product.exchangeRate;
    // uint256 requiredBase = (numerator + denominator - 1) / denominator;
    const baseToken = new ethers.Contract(
      baseTokenAddr,
      ERC20_ABI_EXTENDED,
      signer,
    );
    const baseDecimals = await baseToken.decimals();
    const denominator = ethers.BigNumber.from(10).pow(presaleTokenDecimals);
    const numerator = amountWei.mul(productData.exchangeRate);
    // Ceil division
    const requiredBase = numerator.add(denominator).sub(1).div(denominator);

    const userBalance = await baseToken.balanceOf(userAddress);
    if (userBalance.lt(requiredBase)) {
      const readableBal = ethers.utils.formatUnits(userBalance, baseDecimals);
      const readableCost = ethers.utils.formatUnits(requiredBase, baseDecimals);
      showToast(
        `Insufficient Balance: Cost is ${parseFloat(readableCost).toFixed(2)}, you have ${parseFloat(readableBal).toFixed(2)}`,
        "error",
      );
      resetBtn();
      return;
    }

    // Check remaining maxBuy quota for this specific user
    const buyerInfo = await project.buyers(userAddress);
    const tokensAlreadyOwed = buyerInfo.tokensOwed;
    const newTotalTokens = tokensAlreadyOwed.add(amountWei);

    if (newTotalTokens.gt(settingData.maxBuy)) {
      const remainingQuota = settingData.maxBuy.sub(tokensAlreadyOwed);
      const readableQuota = ethers.utils.formatUnits(
        remainingQuota,
        presaleTokenDecimals,
      );
      showToast(
        `Quota Exceeded! You can only buy ${parseFloat(readableQuota).toFixed(0)} more tokens.`,
        "error",
      );
      resetBtn();
      return;
    }

    // 5. Allowance & Approval based on requiredBase (cost in USDT)
    // HIGH-01 Fix: Approve exact requiredBase amount instead of MaxUint256
    // This follows the Principle of Least Privilege and limits exposure if the project contract is ever compromised.
    const allowance = await baseToken.allowance(userAddress, projectAddr);
    if (allowance.lt(requiredBase)) {
      buyBtn.innerHTML =
        '<i class="fa-solid fa-shield-halved fa-spin mr-2"></i> APPROVING...';
      showToast("Approving Token...", "info");
      const approveTx = await baseToken.approve(
        projectAddr,
        requiredBase, // Approve exact amount for this transaction only
      );
      await approveTx.wait();
      showToast("Approval Successful!", "success");
    }

    // 6. Final Purchase
    buyBtn.innerHTML =
      '<i class="fa-solid fa-cart-shopping fa-spin mr-2"></i> BUYING...';
    showToast("Transaction Sent...", "info");

    const tx = await project.buyToken(amountWei, { gasLimit: 800000 });
    const receipt = await tx.wait();

    showToast("Purchase Successful!", "success");

    // ── KOL Referral Tracking ──
    if (typeof window.trackKolPurchase === 'function') {
        window.trackKolPurchase(receipt.transactionHash, window.WalletState.userAddress);
    }

    // Redirect to Dividends correctly without reloading Launchpad
    setTimeout(() => {
      window.location.href = "my-dividends.html";
    }, 1500);
  } catch (err) {
    console.error("Buy Failed object:", err);
    let errorMsg = "Transaction Failed";

    // Enhanced Error Parsing Strategy
    let technicalMsg = "";
    if (err.reason) technicalMsg = err.reason;
    else if (err.data && err.data.message) technicalMsg = err.data.message;
    else if (err.error && err.error.data && err.error.data.message)
      technicalMsg = err.error.data.message;
    else if (err.message) technicalMsg = err.message;

    technicalMsg = technicalMsg.toLowerCase();

    // Friendly parsing of common revert reasons
    const reasonMap = {
      "insufficient allowance": "Insufficient Allowance",
      "insufficient balance": "Insufficient Balance",
      "sale not started": "Sale Not Started",
      "sale ended": "Sale Ended",
      paused: "Project Paused",
      blocked: "Project Blocked",
      "min limit": "Below Min Limit",
      "max limit": "Above Max Limit",
      "user denied": "User Canceled Transaction",
      "user rejected": "User Canceled Transaction",
      action_rejected: "User Canceled Transaction",
    };

    for (const [key, friendly] of Object.entries(reasonMap)) {
      if (technicalMsg.includes(key)) {
        errorMsg = friendly;
        break;
      }
    }

    // Checking ethers.js specific ACTION_REJECTED code
    if (err.code === "ACTION_REJECTED") {
      errorMsg = "User Canceled Transaction";
    }

    showToast(errorMsg, "error");
  } finally {
    resetBtn();
  }
}

/**
 * Get current block number
 */
async function getCurrentBlock() {
  return await provider.getBlockNumber();
}

/**
 * Create a new Project
 * Calls PeSaleFactory.createProject with checks
 */
async function createProjectFromUI() {
  if (!signer || !factoryContract) {
    showToast("Wallet Not Connected", "error");
    return;
  }

  // 1. Get Form Values
  const presaleTokenAddr = document
    .getElementById("cp-presale-token")
    .value.trim();
  const baseTokenAddr = document.getElementById("cp-base-token").value.trim();
  const presaleAmountRaw = document.getElementById("cp-amount").value.trim();
  const rateRaw = document.getElementById("cp-rate").value.trim();
  const startBlockStr = document.getElementById("cp-start-block").value.trim();
  const endBlockStr = document.getElementById("cp-end-block").value.trim();
  const adminAddr = document.getElementById("cp-admin").value.trim();
  const minHoldRaw = document.getElementById("cp-min-hold").value.trim() || "0";

  // 2. Validations
  if (
    !ethers.utils.isAddress(presaleTokenAddr) ||
    !ethers.utils.isAddress(baseTokenAddr) ||
    !ethers.utils.isAddress(adminAddr)
  ) {
    showToast("Invalid Address Format", "error");
    return;
  }
  // B-03 Fix: Prevent presale token and payment token from being the same address
  if (presaleTokenAddr.toLowerCase() === baseTokenAddr.toLowerCase()) {
    showToast(
      "预售代币和支付代币地址不能相同 (Presale and Base token cannot be identical)",
      "error",
    );
    return;
  }
  if (!presaleAmountRaw || !rateRaw || !startBlockStr || !endBlockStr) {
    showToast("Missing Required Fields", "error");
    return;
  }

  const startBlock = parseInt(startBlockStr);
  const endBlock = parseInt(endBlockStr);

  if (endBlock <= startBlock) {
    showToast("End Block must be greater than Start Block", "error");
    return;
  }

  // MED-01 Fix: Increased buffer from +15 to +30 to better account for network congestion
  // Contract requires: _startBlock > block.number
  // We add a 30-block buffer to ensure the tx is confirmed before startBlock is reached.
  const currentBlock = await provider.getBlockNumber();
  if (startBlock <= currentBlock + 30) {
    showToast(
      `Start Block (${startBlock}) is too close to current block (${currentBlock}). Please set it at least 30 blocks in the future to allow for transaction confirmation time.`,
      "error",
    );
    return;
  }

  // UI Feedback
  const btn = document.getElementById("btn-create-project");
  const originalText = btn.innerText;
  btn.disabled = true;

  try {
    btn.innerText = "PREPARING CONTRACT...";

    // A. Parse Amount with Decimals
    const presaleToken = new ethers.Contract(
      presaleTokenAddr,
      ERC20_ABI_EXTENDED,
      signer,
    );
    const decimals = await presaleToken.decimals();
    const amountWei = ethers.utils.parseUnits(presaleAmountRaw, decimals);

    // BUG-17 FIX: Parse minHold with decimals
    const minHoldWei = ethers.utils.parseUnits(minHoldRaw || "0", decimals);

    // BUG-20 FIX: Check if creator has enough presale tokens
    const userBalance = await presaleToken.balanceOf(userAddress);
    if (userBalance.lt(amountWei)) {
      showToast("Insufficient Presale Token Balance", "error");
      btn.innerText = originalText;
      btn.disabled = false;
      return;
    }

    // Parse the Exchange Rate with Base Token Decimals
    const baseTokenContract = new ethers.Contract(
      baseTokenAddr,
      ERC20_ABI_EXTENDED,
      signer,
    );
    const baseDecimals = await baseTokenContract.decimals();
    const rateWei = ethers.utils.parseUnits(rateRaw, baseDecimals);

    // B. Check & Execute Allowance
    // Factory requires transfer of 'amountWei' from creator to Project
    console.log(
      "Checking Allowance for:",
      FACTORY_ADDRESS,
      "Amount:",
      amountWei.toString(),
    );
    const allowance = await presaleToken.allowance(
      userAddress,
      FACTORY_ADDRESS,
    );

    if (allowance.lt(amountWei)) {
      btn.innerText = "APPROVING TOKEN...";
      showToast("Please confirm approval in your wallet", "info");

      try {
        const approveTx = await presaleToken.approve(
          FACTORY_ADDRESS,
          amountWei,
        );
        showToast("Approval sent, waiting for confirmation...", "info");
        await approveTx.wait();
        showToast("Token Approval Successful", "success");
      } catch (authErr) {
        console.error(authErr);
        throw new Error("Token Approval Failed or Rejected");
      }
    }

    // C. Call Factory createProject
    // Method Signature: createProject(uint256,uint256,address,uint256,address,uint256,address,uint256)
    btn.innerText = "CREATING PROJECT...";
    showToast("Please confirm transaction in your wallet", "info");

    console.log("Calling Factory createProject with:", {
      startBlock,
      endBlock,
      presaleTokenAddr,
      amountWei: amountWei.toString(),
      baseTokenAddr,
      rateWei: rateWei.toString(),
      adminAddr,
      minHoldRaw,
    });

    const tx = await factoryContract.createProject(
      startBlock,
      endBlock,
      presaleTokenAddr,
      amountWei, // _presaleAmount
      baseTokenAddr,
      rateWei, // _tokenExchangeRate (scaled to precision)
      adminAddr,
      minHoldWei, // _minHeldNum (scaled to precision)
      { gasLimit: 5000000 }, // Safety gas limit for expensive factory ops
    );

    showToast("Transaction sent, waiting for confirmation...", "info");
    await tx.wait();

    // D. Success
    showToast("Project Creation Successful!", "success");
    btn.innerText = "DEPLOYED!";

    // Redirect after delay
    setTimeout(() => {
      window.location.href = "index.html#launchpad";
    }, 1500);
  } catch (err) {
    console.error("Create Project Error:", err);
    // Parse common errors if possible
    let msg = err.reason || err.message || "Unknown error";
    if (msg.includes("user rejected")) msg = "User Rejected Transaction";
    else if (msg.includes("Not whitelisted")) msg = "You are not Whitelisted!";
    else if (msg.includes("Limit reached")) msg = "Project Limit Reached";

    showToast("Error: " + msg, "error");
    btn.innerText = "RETRY DEPLOY";
  } finally {
    btn.disabled = false;
    if (btn.innerText !== "DEPLOYED!") {
      setTimeout(() => (btn.innerText = originalText), 3000);
    }
  }
}

// NOTE: loadProjectDetails() and handleInvest() have been removed.
// loadProjectDetails was a zombie function (no HTML page calls it).
// handleInvest was deprecated dead code (returned immediately on line 1).

/**
 * Load Projects for Admin Dashboard (admin/index.html)
 */
async function loadAdminProjects() {
  // UPDATED: Now targeting Grid Container
  const gridContainer = document.getElementById("admin-project-cards");
  if (!gridContainer) return;

  if (!factoryContract) {
    await initFactory();
    if (!factoryContract) return;
  }

  // Update Stats
  document.getElementById("admin-factory-addr").innerText = FACTORY_ADDRESS;
  if (userAddress) {
    document.getElementById("admin-user-addr").innerText = userAddress;
  }
  // Check Platform Owner (for Settings Button)
  let cachedOwner = null;
  try {
    const owner = await factoryContract.owner();
    cachedOwner = owner.toLowerCase();
    const btn = document.getElementById("btn-platform-settings");
    if (btn) {
      if (userAddress && cachedOwner === userAddress.toLowerCase()) {
        btn.classList.remove("hidden");
      } else {
        btn.classList.add("hidden");
      }
    }
  } catch (e) {
    console.warn("Owner Check Error", e);
  }

  gridContainer.innerHTML = `<div class="col-span-full py-20 text-center text-bullish-green font-terminal animate-pulse">SCANNING BLOCKCHAIN...</div>`;

  try {
    const projectAddresses = await factoryContract.getAllProjectlist();
    document.getElementById("admin-total-projects").innerText =
      projectAddresses.length;

    if (projectAddresses.length === 0) {
      gridContainer.innerHTML = `<div class="col-span-full py-20 text-center text-gray-500 font-terminal">NO PROJECTS FOUND</div>`;
      return;
    }

    let html = "";
    const currentBlock = await provider.getBlockNumber();

    // --- GLOBAL DASHBOARD CALCULATION ---
    let totalRaisedUSDT = 0;
    let totalProjectsCount = projectAddresses.length;
    // ------------------------------------

    // --- BEGIN CHUNKING OPTIMIZATION FOR ADMIN ---
    const CHUNK_SIZE = 5;

    // Load project data in chunks
    for (let i = 0; i < projectAddresses.length; i += CHUNK_SIZE) {
      const chunk = projectAddresses.slice(i, i + CHUNK_SIZE);

      const chunkPromises = chunk.map(async (addr) => {
        // Asset Match
        const asset = getProjectMetadata(addr);

        try {
          const proj = new ethers.Contract(
            addr,
            FUNDRAISING_PROJECT_ABI,
            provider,
          );

          // Parallel fetch for product and setting
          const [info, setting] = await Promise.all([
            proj.product(),
            proj.setting(),
          ]);

          // Token Info for display
          const presaleTokenContract = new ethers.Contract(
            info.presaleToken,
            ERC20_ABI_EXTENDED,
            provider,
          );
          const baseTokenContract = new ethers.Contract(
            info.baseToken,
            ERC20_ABI_EXTENDED,
            provider,
          );

          const bDec = await baseTokenContract.decimals().catch(() => 18);
          const pDec = await presaleTokenContract.decimals().catch(() => 18);

          const formattedRate = parseFloat(
            ethers.utils.formatUnits(info.exchangeRate, bDec),
          );

          // --- CALC TOTAL RAISED ---
          // BUG-01 Fix: Use on-chain `baseAmount` (the exact sum of USDT paid) instead of
          // manual saleAmount * rate multiplication, which can drift due to ceil-rounding.
          const baseRaised = parseFloat(
            ethers.utils.formatUnits(info.baseAmount, bDec),
          );
          totalRaisedUSDT += baseRaised;
          // -------------------------

          let presaleSymbol = "TKN";
          try {
            presaleSymbol = await presaleTokenContract.symbol();
          } catch {}
          let baseSymbol = "ETH";
          try {
            baseSymbol = await baseTokenContract.symbol();
          } catch {}

          // Calc Progress
          const dec = await presaleTokenContract.decimals().catch(() => 18);
          const sold = parseFloat(
            ethers.utils.formatUnits(info.saleAmount, dec),
          );
          const total = parseFloat(
            ethers.utils.formatUnits(info.presaleAmount, dec),
          );
          let percent = total > 0 ? (sold / total) * 100 : 0;

          // Status Logic
          let status = "ACTIVE";
          let statusColor = "text-bullish-green";
          let borderColor = "border-gray-800"; // default border

          if (setting.paused) {
            status = "PAUSED";
            statusColor = "text-yellow-500";
            borderColor = "border-yellow-900";
          } else if (setting.blocked) {
            status = "BLOCKED";
            statusColor = "text-red-500";
            borderColor = "border-red-900";
          } else if (currentBlock < info.startBlock) {
            status = "UPCOMING";
            statusColor = "text-blue-500";
            borderColor = "border-blue-900";
          } else if (currentBlock > info.endBlock) {
            status = "ENDED";
            statusColor = "text-gray-500";
            borderColor = "border-gray-800";
          } else if (percent >= 100) {
            status = "SOLD OUT";
            statusColor = "text-desire-pink";
            borderColor = "border-desire-pink";
          }

          // Title Truncate
          const displayTitle =
            asset.title.length > 20
              ? asset.title.substring(0, 18) + ".."
              : asset.title;

          // Check if user is Factory Owner (Platform Admin)
          let platformAdminBtn = "";
          try {
            if (
              userAddress &&
              cachedOwner &&
              cachedOwner === userAddress.toLowerCase()
            ) {
              platformAdminBtn = `
                         <button onclick="window.location.href='/admin/platform_project.html?address=${addr}'" class="mt-2 w-full btn-standard bg-black border border-blue-500 text-blue-500 hover:bg-blue-900 hover:text-white py-2 font-bold uppercase transition-all text-[10px]">
                            <i class="fa-solid fa-shield-halved mr-1"></i> PLATFORM ADMIN
                         </button>
                         `;
            }
          } catch (e) {
            console.warn("Check Owner Error", e);
          }

          // Calculate Estimated End Time (Assuming ~3s per block on BSC)
          let endDateStr = "";
          if (info.endBlock > currentBlock) {
            const blocksRemaining = info.endBlock - currentBlock;
            const secondsRemaining = blocksRemaining * 3;
            const endDate = new Date(Date.now() + secondsRemaining * 1000);
            const y = endDate.getFullYear();
            const m = (endDate.getMonth() + 1).toString().padStart(2, "0");
            const d = endDate.getDate().toString().padStart(2, "0");
            const h = endDate.getHours().toString().padStart(2, "0");
            const min = endDate.getMinutes().toString().padStart(2, "0");
            endDateStr = `预估: ${y}.${m}.${d} ${h}:${min} (仅供参考)`;
          } else {
            endDateStr = "已结束";
          }

          return `
                <div class="cyber-panel bg-black group hover:bg-gray-900 transition-all duration-300 flex flex-row h-full border ${borderColor}">
                    <!-- Image Header (Left) -->
                    <div style="cursor:pointer" onclick="window.location.href='/admin/project.html?address=${addr}'" class="w-1/3 md:w-1/3 overflow-hidden relative border-r border-gray-800 group-hover:border-bullish-green/30 transition-colors flex-shrink-0">
                        <img src="../${asset.img}" class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700">
                        <div class="absolute top-2 right-2 bg-black/80 border border-gray-700 px-2 py-1 backdrop-blur-sm">
                            <span class="${statusColor} font-bold font-terminal text-[10px] md:text-xs animate-pulse">● ${status}</span>
                        </div>
                        <div class="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded-sm backdrop-blur-sm hidden md:block">
                             <div class="text-[10px] font-mono text-white">ID: ${addr.substring(0, 6)}...${addr.substring(38)}</div>
                        </div>
                    </div>

                    <!-- Content (Right) -->
                    <div class="p-4 md:p-6 flex-grow flex flex-col w-2/3 md:w-2/3">
                        <div class="flex justify-between items-start mb-2">
                            <h3 style="cursor:pointer" onclick="window.location.href='/admin/project.html?address=${addr}'" class="text-sm md:text-xl font-impact text-white uppercase tracking-wide truncate pr-2 hover:text-bullish-green transition-colors">${displayTitle}</h3>
                        </div>
                        
                        <p class="text-xs md:text-sm text-gray-400 font-mono mb-4 line-clamp-2 border-l-2 border-bullish-green/50 pl-2 md:pl-3">
                            ${asset.desc}
                        </p>

                        <!-- Progress Bar -->
                        <div class="mb-4">
                            <div class="flex justify-between text-[10px] md:text-xs font-terminal mb-1 uppercase tracking-wider">
                                <span class="text-bullish-green">募资进度</span>
                                <span class="text-white">${sold.toFixed(0)} / ${total.toFixed(0)} ${presaleSymbol}</span>
                            </div>
                            <div class="w-full h-1 bg-gray-800 relative">
                                <div class="h-full bg-bullish-green shadow-[0_0_10px_#00FF41]" style="width: ${percent}%"></div>
                            </div>
                            <div class="text-right text-[10px] md:text-xs text-gray-500 mt-1 font-mono">${percent.toFixed(2)}%</div>
                        </div>

                        <!-- Data Grid (Expanded to 4 cols) -->
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-800 mb-4 border border-gray-800">
                            <div class="bg-black p-2 md:p-3">
                                <div class="text-[10px] md:text-xs text-gray-500 font-terminal uppercase mb-1">兑换率 (Token:U)</div>
                                <div class="text-xs md:text-sm text-white font-bold">1 : ${formattedRate}</div>
                            </div>
                            <div class="bg-black p-2 md:p-3">
                                <div class="text-[10px] md:text-xs text-gray-500 font-terminal uppercase mb-1">开始区块</div>
                                <div class="text-xs md:text-sm text-white font-mono">${info.startBlock.toString()}</div>
                            </div>
                             <div class="bg-black p-2 md:p-3">
                                <div class="text-[10px] md:text-xs text-gray-500 font-terminal uppercase mb-1">结束区块</div>
                                <div class="text-xs md:text-sm text-white font-mono">${info.endBlock.toString()}</div>
                                <div class="text-[9px] md:text-[10px] text-bullish-green mt-1 tracking-widest">${endDateStr}</div>
                            </div>
                             <div class="bg-black p-2 md:p-3">
                                <div class="text-[10px] md:text-xs text-gray-500 font-terminal uppercase mb-1">管理员</div>
                                <div class="text-xs md:text-sm text-white font-mono truncate" title="${info.adminAddress}">${info.adminAddress.substring(0, 6)}..</div>
                            </div>
                        </div>

                        <!-- Admin Action -->
                        <div class="mt-auto space-y-2 flex gap-2 flex-row">
                            <button onclick="window.location.href='/admin/project.html?address=${addr}'" class="flex-1 btn-standard bg-gray-900 border border-bullish-green text-bullish-green hover:bg-bullish-green hover:text-black py-2 font-bold uppercase transition-all shadow-[0_0_10px_rgba(0,255,65,0.1)] hover:shadow-[0_0_20px_rgba(0,255,65,0.4)] text-[10px] md:text-xs">
                                <i class="fa-solid fa-gear mr-1 md:mr-2"></i> 管理
                            </button>
                            ${platformAdminBtn.replace("mt-2 w-full", "md:w-auto w-1/3").replace("PLATFORM ADMIN", "风控介入")}
                        </div>
                    </div>
                </div>
                `;
        } catch (e) {
          console.error("Card Row Error", e);
          return ""; // Skip gracefully on single project failure
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      html += chunkResults.join("");
    }
    // --- END CHUNKING OPTIMIZATION FOR ADMIN ---
    gridContainer.innerHTML = html;

    // --- RENDER GLOBAL DASHBOARD ---
    // We check if the dashboard container exists (should be added in index.html)
    const dashboardEl = document.getElementById("admin-global-dashboard-value");
    if (dashboardEl) {
      // Format nicely: $1,234,567.89
      dashboardEl.innerText = `$${totalRaisedUSDT.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    // -------------------------------
  } catch (err) {
    console.error("Admin List Error", err);
    gridContainer.innerHTML = `<div class="col-span-full border border-red-500 p-4 text-red-500">ERROR: ${err.message}</div>`;
  }
}

/**
 * Load Project for Admin Management (admin/project.html)
 */
async function loadAdminProjectDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectAddr = urlParams.get("address");

  if (!projectAddr || !ethers.utils.isAddress(projectAddr)) {
    document.getElementById("loading-container").innerHTML =
      `<div class="text-red-500">INVALID ADDRESS</div>`;
    return;
  }

  // Context Global
  window.adminContext = {
    address: projectAddr,
  };

  // Wait for provider to be ready (from initFactory)
  // We wait for window.web3Initialized to ensure initFactory has finished its
  // network checks and fallback switching logic.
  let attempts = 0;
  while (!window.web3Initialized && attempts < 40) {
    await new Promise((r) => setTimeout(r, 100));
    attempts++;
  }

  if (!provider) {
    // If still no provider (weird), we try init, but be careful
    if (window.ethereum)
      provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    else
      try {
        provider = new ethers.providers.JsonRpcProvider(FALLBACK_RPC_URL);
      } catch {}
  }

  try {
    const contract = new ethers.Contract(
      projectAddr,
      ADMIN_PROJECT_ABI,
      provider,
    );
    const [info, setting, currentBlock] = await Promise.all([
      contract.product(),
      contract.setting(),
      provider.getBlockNumber(),
    ]);

    // Token Decimals
    const presaleToken = new ethers.Contract(
      info.presaleToken,
      ERC20_ABI_EXTENDED,
      provider,
    );
    const decimals = await presaleToken.decimals();
    window.adminContext.decimals = decimals;
    // BUG-26 Fix: Also read baseToken decimals for correct log amount display
    const baseTokenContractForDec = new ethers.Contract(
      info.baseToken,
      ERC20_ABI_EXTENDED,
      provider,
    );
    const baseDecimalsForContext = await baseTokenContractForDec
      .decimals()
      .catch(() => 18);
    window.adminContext.baseDecimals = baseDecimalsForContext;
    window.adminContext.presaleToken = info.presaleToken;
    window.adminContext.paused = setting.paused;
    window.adminContext.blocked = setting.blocked;
    window.adminContext.endBlock = info.endBlock.toNumber(); // for withdraw check

    // Display Info
    const asset = getProjectMetadata(projectAddr);

    document.getElementById("project-img").src = `../${asset.img}`;
    document.getElementById("project-title").innerText = asset.title;
    document.getElementById("project-addr").innerText = projectAddr;

    // Status Badge
    let status = "ACTIVE";
    let statusClass = "text-bullish-green";
    if (setting.paused) {
      status = "PAUSED";
      statusClass = "text-yellow-500";
    } else if (setting.blocked) {
      status = "BLOCKED";
      statusClass = "text-red-500";
    } else if (currentBlock > info.endBlock) {
      status = "ENDED";
      statusClass = "text-gray-500";
    }

    const sb = document.getElementById("status-badge");
    sb.innerText = status;
    sb.className = `text-xs font-bold ${statusClass}`;

    // Admin Badge
    const ab = document.getElementById("is-admin-badge");
    if (
      userAddress &&
      info.adminAddress.toLowerCase() === userAddress.toLowerCase()
    ) {
      ab.innerText = "AUTHORIZED (YOU)";
      ab.className = "text-xs font-bold text-bullish-green";
    } else {
      ab.innerText = "READ ONLY (NOT ADMIN)";
      ab.className = "text-xs font-bold text-red-500";
    }

    // Vault Balance (Current Contract Balance of Presale Token)
    const vaultBal = await presaleToken.balanceOf(projectAddr);
    document.getElementById("vault-balance").innerText =
      ethers.utils.formatUnits(vaultBal, decimals);

    // Update User Wallet Balance of Presale Token
    if (userAddress) {
      const userHeld = await presaleToken.balanceOf(userAddress);
      const userHeldEl = document.getElementById("admin-wallet-balance");
      if (userHeldEl)
        userHeldEl.innerText = ethers.utils.formatUnits(userHeld, decimals);
    }

    // Fill Forms
    document.getElementById("curr-start").innerText =
      info.startBlock.toString();
    document.getElementById("curr-end").innerText = info.endBlock.toString();
    // pre-fill inputs
    document.getElementById("new-start-block").value =
      info.startBlock.toString();
    document.getElementById("new-end-block").value = info.endBlock.toString();

    // Rate element removed from UI, so we skip population
    // document.getElementById('curr-rate').innerText = info.exchangeRate.toString();
    // document.getElementById('new-rate').value = info.exchangeRate.toString();

    const decStr = decimals.toString(); // assuming presale token decimals for limits? Wait, limits depend on definition.
    // In contract buyToken:
    // tokens = amount * exchangeRate.
    // require(tokens >= setting.minPerBuy).
    // So minPerBuy is in PRESALE TOKEN AMOUNT.
    // buyers[msg.sender].tokensOwed <= setting.maxBuy.
    // maxBuy is in PRESALE TOKEN AMOUNT.

    document.getElementById("curr-min").innerText = ethers.utils.formatUnits(
      setting.minPerBuy,
      decimals,
    );
    document.getElementById("new-min").value = ethers.utils.formatUnits(
      setting.minPerBuy,
      decimals,
    );

    document.getElementById("curr-max").innerText = ethers.utils.formatUnits(
      setting.maxBuy,
      decimals,
    );
    document.getElementById("new-max").value = ethers.utils.formatUnits(
      setting.maxBuy,
      decimals,
    );

    // --- Load Purchase Logs ---
    loadPurchaseLogs(projectAddr, info.startBlock.toNumber());

    // Show
    document.getElementById("loading-container").classList.add("hidden");
    document
      .getElementById("admin-detail-container")
      .classList.remove("hidden");
  } catch (err) {
    console.error("Admin Load Error", err);
    document.getElementById("loading-container").innerHTML =
      `<div class="text-red-500">ERROR: ${err.message}</div>`;
  }
}

// ---------------------- LOGS ----------------------

// Display 50 per page client-side from the full fetched set
const LOG_PAGE_SIZE = 50;

let logState = {
  projectAddr: null,
  startBlock: 0,
  allEvents: [], // All fetched events (newest-first)
  displayedCount: 0, // How many are showing on screen
};

async function loadPurchaseLogs(projectAddr, startBlock) {
  const body = document.getElementById("purchase-logs-body");
  if (!body) return;

  logState.projectAddr = projectAddr;
  logState.startBlock = startBlock;
  logState.allEvents = [];
  logState.displayedCount = 0;

  try {
    const logProvider = new ethers.providers.JsonRpcProvider(TARGET_RPC_URL);
    const latest = await logProvider.getBlockNumber();

    // Safety check: If project hasn't started yet, don't fetch
    if (startBlock > latest) {
      body.innerHTML = `<tr><td colspan="4" class="p-10 text-center text-gray-500 italic">项目尚未开始 (Not Started Yet)</td></tr>`;
      document.getElementById("log-count").innerText = `Total Loaded: 0`;
      document.getElementById("load-more-container").classList.add("hidden");
      return;
    }

    body.innerHTML = `<tr><td colspan="4" class="p-10 text-center text-gray-500 italic font-mono">正在获取全部记录 (Fetching All History)...</td></tr>`;

    // NodeReal allows max 50,000 blocks per getLogs query. Auto-chunk if range is larger.
    const MAX_CHUNK = 50000;
    const project = new ethers.Contract(
      projectAddr,
      FUNDRAISING_PROJECT_ABI,
      logProvider,
    );
    const filter = project.filters.TokenPurchased();

    let allEvents = [];
    let chunkStart = startBlock;
    while (chunkStart <= latest) {
      const chunkEnd = Math.min(chunkStart + MAX_CHUNK - 1, latest);
      const chunkEvents = await project.queryFilter(
        filter,
        chunkStart,
        chunkEnd,
      );
      allEvents = allEvents.concat(chunkEvents);
      chunkStart = chunkEnd + 1;
    }

    // Sort newest first and store
    logState.allEvents = allEvents.reverse();

    // Render first page
    renderLogsPage(true);
  } catch (e) {
    console.error("Logs Load Error", e);
    body.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-500">加载失败: ${e.message}</td></tr>`;
    document.getElementById("load-more-container").classList.add("hidden");
  }
}

async function refreshPurchaseLogs() {
  if (logState.projectAddr) {
    document.getElementById("purchase-logs-body").innerHTML =
      `<tr><td colspan="4" class="p-10 text-center text-gray-500 italic font-mono">正在刷新...</td></tr>`;
    await loadPurchaseLogs(logState.projectAddr, logState.startBlock);
  }
}

function renderLogsPage(clear = false) {
  const body = document.getElementById("purchase-logs-body");
  const container = document.getElementById("load-more-container");

  if (clear) {
    body.innerHTML = "";
    logState.displayedCount = 0;
  }

  const slice = logState.allEvents.slice(
    logState.displayedCount,
    logState.displayedCount + LOG_PAGE_SIZE,
  );
  renderLogs(slice, logState.displayedCount === 0);
  logState.displayedCount += slice.length;

  // Hide "Load More" if all displayed
  if (logState.displayedCount >= logState.allEvents.length) {
    container.classList.add("hidden");
  } else {
    container.classList.remove("hidden");
  }

  document.getElementById("log-count").innerText =
    `Total Loaded: ${logState.allEvents.length}`;
}

async function loadMoreLogs() {
  const btn = document.getElementById("btn-load-more");
  btn.innerText = "数据处理中 (PROCESSING...)";
  btn.disabled = true;
  renderLogsPage(false);
  btn.innerText = "加载更多 (LOAD MORE)";
  btn.disabled = false;
}

function renderLogs(events, clear = false) {
  const body = document.getElementById("purchase-logs-body");
  if (clear) body.innerHTML = "";

  if (events.length === 0 && clear) {
    body.innerHTML = `<tr><td colspan="4" class="p-10 text-center text-gray-500 italic">暂无购买记录 (No History)</td></tr>`;
    return;
  }

  const baseDec = window.adminContext.baseDecimals || 18;
  const preDec = window.adminContext.decimals || 18;

  events.forEach((ev) => {
    const { user, payAmount, gainAmount } = ev.args;
    const blockNum = ev.blockNumber;

    const row = document.createElement("tr");
    row.className =
      "hover:bg-blue-900/10 transition-colors border-b border-blue-900/10 last:border-0";

    const uVal = ethers.utils.formatUnits(payAmount, baseDec);
    const cVal = ethers.utils.formatUnits(gainAmount, preDec);

    row.innerHTML = `
      <td class="p-3 text-gray-500">#${blockNum}</td>
      <td class="p-3">
        <div class="flex items-center gap-2">
          <span class="text-white select-all">${user}</span>
          <button onclick="copyToClipboard('${user}', this)" class="text-blue-500 hover:text-white transition-all">
            <i class="fa-regular fa-copy"></i>
          </button>
        </div>
      </td>
      <td class="p-3 text-bullish-green font-bold">${parseFloat(uVal).toLocaleString()}</td>
      <td class="p-3 text-blue-400 font-bold">${parseFloat(cVal).toLocaleString()}</td>
    `;
    body.appendChild(row);
  });
}

function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const icon = btn.querySelector("i");
    const originalClass = icon.className;
    icon.className = "fa-solid fa-check text-green-500";
    showToast("Address Copied!", "success");
    setTimeout(() => {
      icon.className = originalClass;
    }, 1500);
  });
}

// ---------------------- ACTIONS ----------------------

async function getAdminContract() {
  if (!signer) {
    showToast("Connect Wallet As Admin", "error");
    return null;
  }
  const addr = window.adminContext?.address;
  if (!addr) return null;
  return new ethers.Contract(addr, ADMIN_PROJECT_ABI, signer);
}

async function adminAction_Pause() {
  const c = await getAdminContract();
  if (!c) return;
  try {
    const tx = await c.pauseProject();
    showToast("正在执行熔断(Pause)...", "info");
    await tx.wait();
    showToast("✅ 项目已熔断 (Paused)", "success");
    setTimeout(() => location.reload(), 1000);
  } catch (e) {
    showToast("错误: " + (e.reason || e.message), "error");
  }
}

async function adminAction_Resume() {
  const c = await getAdminContract();
  if (!c) return;
  try {
    const tx = await c.resumeProject();
    showToast("正在恢复项目...", "info");
    await tx.wait();
    showToast("✅ 项目已恢复 (Resumed)", "success");
    setTimeout(() => location.reload(), 1000);
  } catch (e) {
    showToast("错误: " + (e.reason || e.message), "error");
  }
}

async function adminAction_UpdateTimes() {
  const c = await getAdminContract();
  if (!c) return;

  // Contact requires PAUSED state (Frontend lock removed for testing)
  // if (!window.adminContext.paused) {
  //   showToast("操作失败: 必须先熔断合约才能修改时间。", "error");
  //   return;
  // }

  // BUG-03 Fix: Parse DOM string values to integers, reject NaN inputs early.
  const s = parseInt(document.getElementById("new-start-block").value, 10);
  const e = parseInt(document.getElementById("new-end-block").value, 10);

  if (isNaN(s) || isNaN(e)) {
    showToast("错误: 区块号不能为空或非整数", "error");
    return;
  }

  // A-05 Fix: Read live block number from chain instead of potentially stale DOM value
  const currBlock = await provider.getBlockNumber();
  if (e <= currBlock) {
    showToast("错误: 结束区块必须大于当前高度", "error");
    return;
  }
  if (e <= s) {
    showToast("错误: 结束区块必须大于开始区块", "error");
    return;
  }

  try {
    const tx = await c.updateProduct(s, e);
    showToast("正在更新时间配置...", "info");
    await tx.wait();
    showToast("✅ 时间已更新", "success");
    window.location.reload();
  } catch (err) {
    showToast("错误: " + (err.reason || err.message), "error");
  }
}

async function adminAction_RefundAll() {
  if (!signer) {
    showToast("请连接钱包 (Connect Wallet)", "error");
    return;
  }

  const c = await getAdminContract();
  if (!c) return;

  try {
    // MED-03 Fix: First read the amount, THEN show a confirmation with the exact number
    // Check if end block is reached
    const currBlock = await getCurrentBlock();
    const product = await c.product();

    if (currBlock <= product.endBlock) {
      showToast(
        "操作受限：您必须等待项目结束（当前区块超过结束区块）才能提取未售出的代币",
        "error",
      );
      return;
    }

    // Get current remain
    const available = product.presaleAmount.sub(product.saleAmount);
    if (available.lte(0)) {
      showToast("项目中已没有剩余代币可提取", "error");
      return;
    }

    // MED-03 Fix: Fetch presale token decimals for a human-readable confirmation amount
    let presaleDecimals = 18;
    try {
      const presaleTokenContract = new ethers.Contract(
        product.presaleToken,
        ["function decimals() view returns (uint8)"],
        provider,
      );
      presaleDecimals = await presaleTokenContract.decimals();
    } catch (e) {
      console.warn("Could not fetch presale token decimals, defaulting to 18", e);
    }

    const readableAmount = parseFloat(
      ethers.utils.formatUnits(available, presaleDecimals),
    ).toLocaleString();

    // Show confirmation with the exact amount to be withdrawn
    if (
      !confirm(
        `⚠️ 警告：即将退回所有未售出的预售代币。\n\n` +
        `退回数量: ${readableAmount} 个代币\n` +
        `目标地址: 管理员钱包\n\n` +
        `此操作不可撤销，确定要继续吗？`,
      )
    )
      return;

    showToast("正在请求提取剩余代币...", "info");
    const tx = await c.withdrawCandy(available);
    await tx.wait();
    showToast("✅ 代币提取成功！", "success");
    setTimeout(() => location.reload(), 1500);
  } catch (err) {
    console.error("Withdraw Error", err);
    showToast("错误: " + (err.reason || err.message), "error");
  }
}


async function adminAction_UpdateLimits() {
  // Contract requires PAUSED state
  if (!window.adminContext.paused) {
    showToast("操作失败: 必须先熔断合约才能修改限额。", "error");
    console.error("Update Limits Failed: Contract is not paused.");
    return;
  }
  const c = await getAdminContract();
  if (!c) return;

  const minVal = document.getElementById("new-min").value;
  const maxVal = document.getElementById("new-max").value;
  const decimals = window.adminContext.decimals;

  try {
    const minWei = ethers.utils.parseUnits(minVal, decimals);
    const maxWei = ethers.utils.parseUnits(maxVal, decimals);

    const tx = await c.updateSetting(maxWei, minWei);
    showToast("正在更新限额...", "info");
    await tx.wait();
    showToast("✅ 限额已更新", "success");
    window.location.reload();
  } catch (err) {
    showToast("Error: " + (err.reason || err.message), "error");
  }
}

async function adminAction_AddCandy() {
  const amountVal = document.getElementById("fund-amount").value;
  if (!amountVal) return;

  if (!signer) {
    showToast("请连接钱包", "error");
    return;
  }

  // Contract requires NOT BLOCKED state
  if (window.adminContext.blocked) {
    showToast("操作失败: 项目已被平台封禁，无法充值资金。", "error");
    return;
  }

  // Check pause? No, addCandy does NOT require pause. But checks blocked.
  // Logic:
  // 1. Approve Token
  // 2. Call addCandy

  try {
    const tokenAddr = window.adminContext.presaleToken;
    const projAddr = window.adminContext.address;
    const decimals = window.adminContext.decimals;
    const amountWei = ethers.utils.parseUnits(amountVal, decimals);

    const token = new ethers.Contract(tokenAddr, ERC20_ABI_EXTENDED, signer);

    // Check Allowance
    const allowance = await token.allowance(userAddress, projAddr);
    if (allowance.lt(amountWei)) {
      showToast("正在授权代币...", "info");
      const txApp = await token.approve(projAddr, amountWei);
      await txApp.wait();
      showToast("✅ 授权成功", "success");
    }

    const project = await getAdminContract();
    const tx = await project.addCandy(amountWei);
    showToast("正在充值资金...", "info");
    await tx.wait();
    showToast("✅ 充值成功", "success");
    window.location.reload();
  } catch (err) {
    showToast("Error: " + (err.reason || err.message), "error");
  }
}

async function adminAction_WithdrawCandy() {
  const amountVal = document.getElementById("fund-amount").value;
  if (!amountVal) return;

  // Logic from Contract:
  // require(block.number > product.endBlock , "Sale not ended");

  // A-04 Fix: Read live block number from chain instead of potentially stale/empty DOM value
  // (DOM value can be "..." or empty, causing parseInt to return NaN and bypass the check)
  const currBlock = await provider.getBlockNumber();
  // Check basic constraints client side
  if (currBlock <= window.adminContext.endBlock) {
    showToast("销售尚未结束 (Sale not ended)", "error");
    return;
  }
  // Pause check removed to align with latest contract logic.

  try {
    const c = await getAdminContract();
    const decimals = window.adminContext.decimals;
    const amountWei = ethers.utils.parseUnits(amountVal, decimals);

    const tx = await c.withdrawCandy(amountWei);
    showToast("正在提取资金...", "info");
    await tx.wait();
    showToast("✅ 提取成功", "success");
    window.location.reload();
  } catch (err) {
    showToast("Error: " + (err.reason || err.message), "error");
  }
}
// =============================================================================
// PLATFORM ADMIN FUNCTIONS
// =============================================================================

const FACTORY_ADMIN_EXT_ABI = [
  "function owner() view returns (address)",
  "function factoryActive() view returns (bool)",
  "function maxProjectsPerPublisher() view returns (uint256)",
  "function getAllWhitelist() view returns (address[])",
  "function setFactoryStatus(bool active) external",
  "function updateMaxPublisherProject(uint256 newLimit) external",
  "function addToWhitelist(address user) external",
  "function removeFromWhitelist(address user) external",
  "function blockProject(address project) external",
  "function recoverProject(address project) external",
  "function updateProductExchangeRate(address project, uint256 rate) external",
];

// ... existing getFactoryAdminContract ...

// ... existing loadPlatformSettings ...

// ... existing adminAction_ToggleFactory ...
// ... adminAction_UpdateMaxProjects ...
// ... adminAction_AddWhitelist ...
// ... adminAction_RemoveWhitelist ...

// NEW: Platform Project Control (admin/platform_project.html)

async function loadPlatformProjectDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectAddr = urlParams.get("address");
  if (!projectAddr) return;

  // 1. Basic Info (via Project Contract)
  window.adminContext = { address: projectAddr };

  // 2. Load basic info same as other page but lighter
  try {
    const proj = new ethers.Contract(
      projectAddr,
      FUNDRAISING_PROJECT_ABI,
      provider,
    );
    const [info, setting] = await Promise.all([proj.product(), proj.setting()]);

    // Asset Display
    const asset = getProjectMetadata(projectAddr);

    document.getElementById("project-title").innerText = asset.title;
    document.getElementById("project-addr").innerText = projectAddr;
    document.getElementById("project-img").src = `../${asset.img}`;

    // Status
    let status = "ACTIVE";
    if (setting.blocked) status = "BLOCKED (Platform)";
    else if (setting.paused) status = "PAUSED (Project)";
    document.getElementById("status-text").innerText = status;

    const baseTokenContract = new ethers.Contract(
      info.baseToken,
      ERC20_ABI_EXTENDED,
      provider,
    );
    const bDec = await baseTokenContract.decimals().catch(() => 18);
    window.adminContext.baseDecimals = bDec;
    const formattedRate = parseFloat(
      ethers.utils.formatUnits(info.exchangeRate, bDec),
    );

    // Current Rate
    document.getElementById("curr-rate").innerText = formattedRate;
    document.getElementById("new-rate").value = formattedRate;
  } catch (e) {
    console.error("Load PP Error", e);
  }
}

async function factoryAction_BlockProject() {
  const c = await getFactoryAdminContract();
  if (!c) return;
  if (
    !confirm(
      "DANGER: This will BLOCK the project permanently or until recovered. Continue?",
    )
  )
    return;

  try {
    const tx = await c.blockProject(window.adminContext.address);
    showToast("Blocking Project...", "info");
    await tx.wait();
    showToast("Project BLOCKED", "success");
    setTimeout(() => location.reload(), 1000);
  } catch (e) {
    showToast("Error: " + (e.reason || e.message), "error");
  }
}

async function factoryAction_RecoverProject() {
  const c = await getFactoryAdminContract();
  if (!c) return;

  try {
    const tx = await c.recoverProject(window.adminContext.address);
    showToast("Recovering Project...", "info");
    await tx.wait();
    showToast("Project Active", "success");
    setTimeout(() => location.reload(), 1000);
  } catch (e) {
    showToast("Error: " + (e.reason || e.message), "error");
  }
}

async function factoryAction_UpdateRate() {
  const c = await getFactoryAdminContract();
  if (!c) return;

  const rate = document.getElementById("new-rate").value;
  if (!rate || rate <= 0) return;

  try {
    const proj = new ethers.Contract(
      window.adminContext.address,
      FUNDRAISING_PROJECT_ABI,
      provider,
    );
    const setting = await proj.setting();
    if (!setting.blocked) {
      showToast(
        "操作被拒绝：安全风控要求修改兑换比率前，必须首先在上方将项目设置为『封禁 (Blocked)』状态。",
        "error",
      );
      return;
    }
  } catch (e) {
    console.error("Failed to fetch project setting", e);
  }

  if (!confirm("FORCE UPDATE RATE: This overrides project settings. Confirm?"))
    return;

  try {
    const bDec = window.adminContext.baseDecimals || 18;
    const rateWei = ethers.utils.parseUnits(rate.toString(), bDec);

    const tx = await c.updateProductExchangeRate(
      window.adminContext.address,
      rateWei,
    );
    showToast("Updating Rate (Force)...", "info");
    await tx.wait();
    showToast("Rate Updated", "success");
    setTimeout(() => location.reload(), 1000);
  } catch (e) {
    showToast("Error: " + (e.reason || e.message), "error");
  }
}

async function getFactoryAdminContract() {
  if (!signer) {
    showToast("Connect Wallet As Admin", "error");
    return null;
  }
  return new ethers.Contract(FACTORY_ADDRESS, FACTORY_ADMIN_EXT_ABI, signer);
}

async function loadPlatformSettings() {
  const container = document.getElementById("platform-settings-container");
  if (!container) return; // Only run if on admin page with this container

  if (!provider && window.ethereum)
    provider = new ethers.providers.Web3Provider(window.ethereum, "any");
  // Use provider for reading to avoid signer requirement for just viewing
  const factoryRead = new ethers.Contract(
    FACTORY_ADDRESS,
    FACTORY_ADMIN_EXT_ABI,
    provider,
  );

  try {
    const [active, maxProj, whitelist] = await Promise.all([
      factoryRead.factoryActive(),
      factoryRead.maxProjectsPerPublisher(),
      factoryRead.getAllWhitelist(),
    ]);

    // 1. Status Switch
    const statusEl = document.getElementById("platform-status-text");
    const statusToggle = document.getElementById("platform-status-toggle");

    if (active) {
      statusEl.innerText = "RUNNING";
      statusEl.className = "text-bullish-green font-bold";
      statusToggle.checked = true;
    } else {
      statusEl.innerText = "PAUSED";
      statusEl.className = "text-red-500 font-bold";
      statusToggle.checked = false;
    }

    // 2. Max Projects
    document.getElementById("platform-max-projects").value = maxProj.toString();

    // 3. Whitelist
    const wlContainer = document.getElementById("whitelist-container");
    if (whitelist.length === 0) {
      wlContainer.innerHTML =
        '<div class="text-gray-500 text-xs italic p-4 text-center">No whitelisted addresses found.</div>';
    } else {
      let html = "";
      whitelist.forEach((addr) => {
        html += `
                <div class="flex justify-between items-center bg-gray-900 border border-gray-800 p-3 mb-2 hover:border-blue-500 transition-colors group">
                    <div class="flex items-center gap-3">
                        <div class="w-2 h-2 rounded-full bg-bullish-green animate-pulse"></div>
                        <span class="text-xs font-mono text-gray-300 group-hover:text-white transition-colors">${addr}</span>
                    </div>
                    <button onclick="adminAction_RemoveWhitelist('${addr}')" class="text-red-500 hover:text-white text-[10px] uppercase border border-red-900 hover:bg-red-600 px-3 py-1 transition-colors font-bold">
                        <i class="fa-solid fa-trash mr-1"></i> REMOVE
                    </button>
                </div>`;
      });
      wlContainer.innerHTML = html;
    }

    // Counter Update (Safe Check)
    const countEl = document.getElementById("whitelist-count");
    if (countEl) countEl.innerText = whitelist.length;
  } catch (err) {
    console.error("Platform Settings Load Error", err);
    showToast("Error loading platform settings", "error");
  }
}

async function adminAction_ToggleFactory(isChecked) {
  const c = await getFactoryAdminContract();
  if (!c) {
    // Revert toggle visually if no signer
    document.getElementById("platform-status-toggle").checked = !isChecked;
    return;
  }

  try {
    const tx = await c.setFactoryStatus(isChecked);
    showToast(
      isChecked ? "Activating Platform..." : "Pausing Platform...",
      "info",
    );
    await tx.wait();
    showToast("Status Updated", "success");
    loadPlatformSettings();
  } catch (err) {
    showToast("Error: " + (err.reason || err.message), "error");
    document.getElementById("platform-status-toggle").checked = !isChecked;
  }
}

async function adminAction_UpdateMaxProjects() {
  const c = await getFactoryAdminContract();
  if (!c) return;

  const val = document.getElementById("platform-max-projects").value;
  if (!val || val <= 0) return;

  try {
    const tx = await c.updateMaxPublisherProject(val);
    showToast("Updating Limit...", "info");
    await tx.wait();
    showToast("Limit Updated", "success");
    loadPlatformSettings();
  } catch (err) {
    showToast("Error: " + (err.reason || err.message), "error");
  }
}

async function adminAction_AddWhitelist() {
  const c = await getFactoryAdminContract();
  if (!c) return;

  const addrInput = document.getElementById("new-whitelist-addr");
  const addr = addrInput.value;

  if (!ethers.utils.isAddress(addr)) {
    showToast("Invalid Address", "error");
    return;
  }

  try {
    const tx = await c.addToWhitelist(addr);
    showToast("Adding to Whitelist...", "info");
    await tx.wait();
    showToast("Added Successfully", "success");
    addrInput.value = "";
    loadPlatformSettings();
  } catch (err) {
    showToast("Error: " + (err.reason || err.message), "error");
  }
}

async function adminAction_RemoveWhitelist(addr) {
  const c = await getFactoryAdminContract();
  if (!c) return;

  if (!confirm("Remove " + addr + " from whitelist?")) return;

  try {
    const tx = await c.removeFromWhitelist(addr);
    showToast("Removing...", "info");
    await tx.wait();
    showToast("Removed Successfully", "success");
    loadPlatformSettings();
  } catch (err) {
    showToast("Error: " + (err.reason || err.message), "error");
  }
}

/**
 * Helper: Real-time Estimate Calculation
 */
function updateEstimate(inputEl, rate) {
  const val = parseFloat(inputEl.value);
  const addr = inputEl.id.replace("buy-amount-", "");
  const estEl = document.getElementById(`est-${addr}`);

  if (isNaN(val) || val < 0) {
    if (estEl) estEl.innerText = "0";
    return;
  }

  // Calculate Estimate: Amount * Rate
  const estimate = val * parseFloat(rate);
  if (estEl)
    estEl.innerText = estimate.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
}

/**
 * Helper: Load User Balances for Invest Cards
 * Call this after wallet connection or project load
 */
async function loadUserBalances(projectList) {
  if (!userAddress || !provider) return;

  console.log("Loading user balances for projects...");

  // We need to loop through rendered inputs to find which projects are on screen
  const balanceEls = document.querySelectorAll('[id^="bal-"]');
  balanceEls.forEach(async (el) => {
    const addr = el.id.replace("bal-", "");
    // A better way: The buyToken button has the token address!
    const btn = document.querySelector(`button[onclick*="'${addr}'"]`);
    if (btn) {
      const match = btn
        .getAttribute("onclick")
        .match(/buyToken\('0x.*?',\s*'(0x.*?)'\)/);
      if (match && match[1]) {
        const baseTokenAddr = match[1];
        try {
          const tokenContract = new ethers.Contract(
            baseTokenAddr,
            [
              "function balanceOf(address) view returns (uint256)",
              "function decimals() view returns (uint8)",
            ],
            provider,
          );
          const bal = await tokenContract.balanceOf(userAddress);
          const decimals = await tokenContract.decimals(); // Cache this ideally
          const formatted = parseFloat(
            ethers.utils.formatUnits(bal, decimals),
          ).toFixed(2);
          el.innerText = formatted;
          el.classList.add("text-bullish-green");
        } catch (e) {
          console.warn("Balance fetch fail", e);
        }
      }
    }
  });
}

// ================== PLATFORM UI HELPERS (Modal & Token) ==================

async function updatePlatformTokenBalance(addr) {
  if (!addr || !provider || !PLATFORM_TOKEN_ADDRESS) return;
  try {
    const contract = new ethers.Contract(
      PLATFORM_TOKEN_ADDRESS,
      PLATFORM_TOKEN_ABI,
      provider,
    );
    const balance = await contract.balanceOf(addr);
    const formatted = parseFloat(ethers.utils.formatUnits(balance, 18)).toFixed(
      2,
    );

    // Update Modal if exists
    const modalBalEl = document.getElementById("modalBalance");
    if (modalBalEl) modalBalEl.innerText = formatted;

    return formatted;
  } catch (e) {
    console.warn("Platform Token Check Failed", e);
    return "0.00";
  }
}

function openAccountModal() {
  if (!userAddress) return;
  // Trigger balance update when opening
  updatePlatformTokenBalance(userAddress);

  const modalAddr = document.getElementById("modalAddress");
  if (modalAddr) modalAddr.innerText = userAddress;

  // Short Display
  const short = `${userAddress.substring(0, 10)}...${userAddress.substring(30)}`;
  const displayEl = document.getElementById("modalAddressDisplay");
  if (displayEl) displayEl.innerText = short;

  const modal = document.getElementById("accountModal");
  if (modal) modal.classList.remove("hidden");
}

function closeAccountModal() {
  const modal = document.getElementById("accountModal");
  if (modal) modal.classList.add("hidden");
}

// A-01 Fix: Duplicate function definitions removed (were at L3320-L3434).
// The canonical implementations of loadPlatformSettings, adminAction_ToggleFactory,
// adminAction_UpdateMaxProjects, and adminAction_AddWhitelist are defined above
// at L3056-L3204, where they use FACTORY_ADMIN_EXT_ABI and accept correct parameter types
// (e.g., adminAction_ToggleFactory(isChecked: bool) matching platform.html's this.checked).

// Ensure load calls when page is ready. It hooks onto DOMContentLoaded elsewhere.
window.closeAccountModal = closeAccountModal;


