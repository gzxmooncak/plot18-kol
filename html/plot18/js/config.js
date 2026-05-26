/**
 * Plot18 Global Configuration
 * Keeps shared project settings and activates the selected environment file.
 */
(function () {
    // Set to "prod" for production, or "test" for the test environment.
    const ACTIVE_ENV = "test";

    const PROJECT_CONFIG = {
        appName: "Plot18",
        supportedEnvironments: ["test", "prod"]
    };

    window.APP_ENV_CONFIGS = window.APP_ENV_CONFIGS || {};

    function getConfigBasePath() {
        const currentScript = document.currentScript;
        const src = currentScript && currentScript.getAttribute
            ? currentScript.getAttribute("src")
            : "";
        const lastSlashIndex = src.lastIndexOf("/");

        return lastSlashIndex === -1 ? "" : src.slice(0, lastSlashIndex + 1);
    }

    function getEnvironmentScriptPath(env) {
        return getConfigBasePath() + "config." + env + ".js";
    }

    function applyCustomFactoryOverride(appConfig) {
        const customFactory = localStorage.getItem("customFactoryAddress");

        if (customFactory && customFactory.trim() !== "") {
            appConfig.factoryAddress = customFactory.trim();
            console.warn("Using custom factory address from localStorage:", appConfig.factoryAddress);
        }
    }

    window.activateAppConfig = function () {
        const environmentConfig = window.APP_ENV_CONFIGS[ACTIVE_ENV];

        if (!environmentConfig) {
            throw new Error("Missing APP environment config: " + ACTIVE_ENV);
        }

        const appConfig = Object.assign({}, PROJECT_CONFIG, environmentConfig, {
            env: ACTIVE_ENV,
            IS_MAINNET: ACTIVE_ENV === "prod"
        });

        applyCustomFactoryOverride(appConfig);
        window.APP_CONFIG = appConfig;
    };

    function loadEnvironmentConfig(env) {
        const scriptPath = getEnvironmentScriptPath(env);

        if (document.readyState === "loading" && typeof document.write === "function") {
            document.write(
                '<script src="' + scriptPath + '"></script>' +
                '<script>window.activateAppConfig();</script>'
            );
            return;
        }

        throw new Error("config.js must be loaded while the document is loading.");
    }

    loadEnvironmentConfig(ACTIVE_ENV);
})();
