const ethers = require("ethers");

async function main() {
    const provider = new ethers.providers.JsonRpcProvider("https://data-seed-prebsc-1-s1.binance.org:8545");
    const txHash = "0xc9571759dd108c98fb8a0f0adeaf4688158db56e876b63110a99b43c33c088d5";
    
    const tx = await provider.getTransaction(txHash);
    if (!tx) {
        console.log("Tx not found.");
        return;
    }
    
    try {
        let result = await provider.call(tx, tx.blockNumber);
        console.log("Call result:", result);
    } catch (err) {
        console.log("Call failed. Revert reason:");
        console.log(err.reason);
        console.log("Error details:", err);
    }
}

main().catch(console.error);
