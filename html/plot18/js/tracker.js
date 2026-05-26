/**
 * Lymn KOL Referral Tracking System
 * Extracts the URL parameter '?community=xxx' and reports purchases to the backend.
 */

window.trackKolPurchase = function(txHash, userAddress) {
    try {
        const communityParam = new URLSearchParams(window.location.search).get("community");
        if (!communityParam) return; // No community param, nothing to track

        const kolUrl = window.location.href.split("?")[0] + "?community=" + communityParam;
        const payload = {
            txHash: txHash,
            kolUrl: kolUrl,
            address: userAddress,
            status: 2 // Status for backend cron job parsing
        };

        const rawJson = JSON.stringify(payload);
        let encryptedStr = "";

        // Verify CryptoJS is loaded
        if (typeof CryptoJS !== 'undefined') {
            // Backend unified private key (First 16 chars)
            const key = CryptoJS.enc.Utf8.parse("PloT18_Kol_SecKeY".substring(0, 16));
            const encrypted = CryptoJS.AES.encrypt(rawJson, key, {
                mode: CryptoJS.mode.ECB,
                padding: CryptoJS.pad.Pkcs7
            });
            encryptedStr = encrypted.toString();
        } else {
            console.warn("[KOL Tracker] CryptoJS library is missing. Tracking aborted.");
            return;
        }

        // Use configured API URL or fallback to the local/dev one
        const apiUrl = (window.APP_CONFIG && window.APP_CONFIG.kolApiUrl) 
            ? window.APP_CONFIG.kolApiUrl 
            : "http://127.0.0.1:8080/analysis/bsc/kolBuy/public";

        fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: encryptedStr }),
            keepalive: true // Fire-and-forget, don't block page redirect
        }).catch(e => console.warn("[KOL Tracker] Report failed:", e));

    } catch (err) {
        console.warn("[KOL Tracker] Unexpected error:", err);
    }
};
