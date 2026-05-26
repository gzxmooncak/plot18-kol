/**
 * Lymn / Plot18 Contract ABIs
 * Extracted from web3_integration.js to keep logic clean.
 */

const FACTORY_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "addToWhitelist",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "project",
        type: "address",
      },
    ],
    name: "blockProject",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_startBlock",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_endBlock",
        type: "uint256",
      },
      {
        internalType: "contract IERC20",
        name: "_presaleToken",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_presaleAmount",
        type: "uint256",
      },
      {
        internalType: "contract IERC20",
        name: "_baseToken",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_tokenExchangeRate",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "_adminAddress",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_minHeldNum",
        type: "uint256",
      },
    ],
    name: "createProject",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
    ],
    name: "SafeERC20FailedOperation",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "project",
        type: "address",
      },
    ],
    name: "BlockProject",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "project",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "presaleToken",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "baseToken",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "startBlock",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "endBlock",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "presaleAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "exchangeRate",
        type: "uint256",
      },
    ],
    name: "ProjectCreated",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "project",
        type: "address",
      },
    ],
    name: "recoverProject",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "project",
        type: "address",
      },
    ],
    name: "RecoverProject",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "removeFromWhitelist",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bool",
        name: "active",
        type: "bool",
      },
    ],
    name: "setFactoryStatus",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newLimit",
        type: "uint256",
      },
    ],
    name: "updateMaxPublisherProject",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "project",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "rate",
        type: "uint256",
      },
    ],
    name: "updateProductExchangeRate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "project",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "rate",
        type: "uint256",
      },
    ],
    name: "UpdateProductExchangeRate",
    type: "event",
  },
  {
    inputs: [],
    name: "factoryActive",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllProjectlist",
    outputs: [
      {
        internalType: "address[]",
        name: "",
        type: "address[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllWhitelist",
    outputs: [
      {
        internalType: "address[]",
        name: "",
        type: "address[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getBlockNum",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "isWhitelisted",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "maxProjectsPerPublisher",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "projectOwner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "publisherProjectCount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const PLATFORM_TOKEN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

const FUNDRAISING_PROJECT_ABI = [
  "function product() view returns (uint256 startBlock, uint256 endBlock, address presaleToken, address baseToken, uint256 presaleAmount, uint256 saleAmount, uint256 baseAmount, uint256 exchangeRate, address adminAddress, uint256 minHeldNum)",
  "function setting() view returns (uint256 maxBuy, uint256 minPerBuy, bool paused, bool blocked)",
  "function buyToken(uint256 amount) external",
  "function buyers(address) view returns (uint256 basePay, uint256 tokensOwed)",
  // Admin functions
  "function pauseProject() external",
  "function resumeProject() external",
  "function updateProduct(uint256 _startBlock, uint256 _endBlock) external",
  "function updateExchangeRate(uint256 newRate) external",
  "function updateSetting(uint256 _maxBuy, uint256 _minPerBuy) external",
  "function addCandy(uint256 amount) external",
  "function withdrawCandy(uint256 amount) external",
  "function recoverProject() external",
  "function blockProject() external",
  "function updateAdmin(address newAdmin) external",
  "function transferOwnership(address newOwner) external",
  // Events
  "event TokenPurchased(address indexed user, address indexed payToken, uint256 indexed payAmount, uint256 gainAmount)",
];

const ERC20_ABI_EXTENDED = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

// Provide alias for admin usage
const ADMIN_PROJECT_ABI = [...FUNDRAISING_PROJECT_ABI];

// Attach to window so web3_integration.js can access them
window.FACTORY_ABI = FACTORY_ABI;
window.PLATFORM_TOKEN_ABI = PLATFORM_TOKEN_ABI;
window.FUNDRAISING_PROJECT_ABI = FUNDRAISING_PROJECT_ABI;
window.ERC20_ABI_EXTENDED = ERC20_ABI_EXTENDED;
window.ADMIN_PROJECT_ABI = ADMIN_PROJECT_ABI;