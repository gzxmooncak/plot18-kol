/**
 * Global Toast Notification Component
 * Usage: showToast("Message", "success" | "error" | "info")
 */

// Ensure container exists and has correct styles
function ensureToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    
    // Force styles to ensure it's always fixed and correctly positioned
    // This overrides any static positioning from bare HTML tags
    container.className = 'fixed top-24 right-6 z-[9999] flex flex-col gap-3 pointer-events-none w-full max-w-[320px] md:max-w-[400px]';
    
    return container;
}

window.showToast = function (message, type = 'info') {
    const container = ensureToastContainer();

    // Create Toast Element
    const toast = document.createElement('div');

    // Base Styles & Icons
    let theme = {
        color: 'border-white text-white',
        icon: 'fa-info-circle',
        glow: 'rgba(255,255,255,0.2)',
        bar: 'bg-white'
    };

    if (type === 'error') {
        theme = {
            color: 'border-red-500 text-red-500',
            icon: 'fa-triangle-exclamation',
            glow: 'rgba(239,68,68,0.3)',
            bar: 'bg-red-500'
        };
    } else if (type === 'success') {
        theme = {
            color: 'border-bullish-green text-bullish-green',
            icon: 'fa-check-circle',
            glow: 'rgba(0,255,65,0.3)',
            bar: 'bg-bullish-green'
        };
    }

    // High-end Cyberpunk Style with Glassmorphism
    toast.className = `relative flex items-center gap-4 px-6 py-5 border-l-4 ${theme.color} bg-black/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] font-terminal text-[11px] transition-all duration-500 transform translate-x-full opacity-0 pointer-events-auto overflow-hidden group`;
    toast.style.boxShadow = `inset 0 0 20px ${theme.glow}, 0 8px 32px rgba(0,0,0,0.8)`;
    
    toast.innerHTML = `
        <i class="fa-solid ${theme.icon} text-lg"></i>
        <div class="flex-1 flex flex-col gap-0.5">
            <span class="uppercase tracking-[0.2em] font-black">${type}</span>
            <span class="text-white/90 tracking-wider">${message.toUpperCase()}</span>
        </div>
        <!-- Progress Bar -->
        <div class="absolute bottom-0 left-0 h-[2px] ${theme.bar} transition-all duration-[4000ms] linear w-full" id="toast-bar"></div>
    `;

    container.appendChild(toast);

    // Initial State Trigger
    requestAnimationFrame(() => {
        toast.classList.remove('translate-x-full', 'opacity-0');
        // Animate the progress bar
        const bar = toast.querySelector('#toast-bar');
        if (bar) {
            setTimeout(() => {
                bar.style.width = '0%';
            }, 10);
        }
    });

    // Auto Remove
    const duration = 4000;
    setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => {
            if (toast.parentElement) toast.remove();
        }, 500);
    }, duration);
}
