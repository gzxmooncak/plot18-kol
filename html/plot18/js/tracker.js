/**
 * Lymn KOL Referral Tracking System
 * Extracts the URL parameter '?community=xxx' and reports purchases to the backend.
 */

function logKolTrackerInfo(message, details) {
    if (typeof console !== "undefined" && typeof console.info === "function") {
        console.info(message, details);
    }
}

function logKolTrackerWarn(message, details) {
    if (typeof console !== "undefined" && typeof console.warn === "function") {
        console.warn(message, details);
    }
}

window.trackKolPurchase = function(txHash, userAddress) {
    try {
        const communityParam = new URLSearchParams(window.location.search).get("community");
        if (!communityParam) {
            logKolTrackerInfo("[KOL Tracker] Skip report: missing community parameter", {
                pageUrl: window.location.href
            });
            return; // No community param, nothing to track
        }

        const kolUrl = window.location.href.split("?")[0] + "?community=" + communityParam;
        const payload = {
            txHash: txHash,
            kolUrl: kolUrl,
            address: userAddress,
            status: 2 // Status for backend cron job parsing
        };

        logKolTrackerInfo("[KOL Tracker] Submitted payload", payload);

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
        const fallbackApiUrl = "http://127.0.0.1:8080/analysis/bsc/kolBuy/public";
        const appConfig = window.APP_CONFIG || null;
        const configuredApiUrl = appConfig && appConfig.kolApiUrl ? appConfig.kolApiUrl : "";
        const apiUrl = configuredApiUrl || fallbackApiUrl;
        const diagnostics = {
            apiUrl: apiUrl,
            usingFallback: !configuredApiUrl,
            appConfigLoaded: !!appConfig,
            appEnv: appConfig && appConfig.env ? appConfig.env : null,
            isMainnet: appConfig && typeof appConfig.IS_MAINNET !== "undefined" ? appConfig.IS_MAINNET : null,
            configuredKolApiUrl: configuredApiUrl || null,
            fallbackApiUrl: fallbackApiUrl,
            pageUrl: window.location.href,
            community: communityParam
        };

        logKolTrackerInfo("[KOL Tracker] Resolved API URL", diagnostics);

        if (!configuredApiUrl) {
            logKolTrackerWarn("[KOL Tracker] Using fallback API URL", diagnostics);
        }

        const requestBody = JSON.stringify({ data: encryptedStr });

        logKolTrackerInfo("[KOL Tracker] Submitted encrypted body", {
            apiUrl: apiUrl,
            body: requestBody
        });

        fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: requestBody,
            keepalive: true // Fire-and-forget, don't block page redirect
        })
            .then(function (response) {
                response.text()
                    .then(function (responseText) {
                        logKolTrackerInfo("[KOL Tracker] API response", {
                            status: response.status,
                            ok: response.ok,
                            responseText: responseText
                        });
                    })
                    .catch(function (textError) {
                        logKolTrackerWarn("[KOL Tracker] Failed to read API response body", textError);
                    });
            })
            .catch(e => console.warn("[KOL Tracker] Report failed:", e));

    } catch (err) {
        console.warn("[KOL Tracker] Unexpected error:", err);
    }
};
