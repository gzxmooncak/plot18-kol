/**
 * UI Components Logic
 * Extracted from web3_integration.js to separate pure UI layer from Web3 business logic.
 */

// ==========================================
// 1. Modal UI Interactions
// ==========================================

function openWalletModal() {
    const modal = document.getElementById("walletSelectModal");
    if (modal) {
        modal.classList.remove("hidden");
        // Small delay to allow display:flex to apply before adding active class for animation
        setTimeout(() => {
            modal.classList.add("active");
        }, 10);
    }
}

function closeWalletModal() {
    const modal = document.getElementById("walletSelectModal");
    if (modal) {
        modal.classList.remove("active");
        setTimeout(() => {
            modal.classList.add("hidden");
        }, 300); // Wait for transition
    }
}

function openImportModal() {
    const modal = document.getElementById("importTokenModal");
    if (modal) {
        modal.classList.remove("hidden");
        setTimeout(() => {
            modal.classList.add("active");
        }, 10);
    }
}

function closeImportModal() {
    const modal = document.getElementById("importTokenModal");
    if (modal) {
        modal.classList.remove("active");
        setTimeout(() => {
            modal.classList.add("hidden");
        }, 300);
    }
}

function openDownloadModal(walletType) {
    closeWalletModal();
    const modal = document.getElementById("walletDownloadModal");
    const downloadText = document.getElementById("downloadModalText");
    const downloadBtn = document.getElementById("downloadModalBtn");

    if (modal && downloadText && downloadBtn) {
        let appName = "";
        let downloadLink = "";

        if (walletType === "metamask") {
            appName = "MetaMask";
            downloadLink = "https://metamask.io/download/";
        } else if (walletType === "okx") {
            appName = "OKX Wallet";
            downloadLink = "https://www.okx.com/download";
        } else if (walletType === "coinbase") {
            appName = "Coinbase Wallet";
            downloadLink = "https://www.coinbase.com/wallet/downloads";
        } else if (walletType === "tokenpocket") {
            appName = "TokenPocket";
            downloadLink = "https://www.tokenpocket.pro/en/download/app";
        } else if (walletType === "trustwallet") {
            appName = "Trust Wallet";
            downloadLink = "https://trustwallet.com/download";
        } else if (walletType === "safepal") {
            appName = "SafePal";
            downloadLink = "https://www.safepal.com/download";
        }

        downloadText.innerHTML = `It looks like you don't have <strong>${appName}</strong> installed on your device. Please download it first, or use a desktop browser.`;
        downloadBtn.href = downloadLink;

        modal.classList.remove("hidden");
        setTimeout(() => {
            modal.classList.add("active");
        }, 10);
    }
}

function closeDownloadModal() {
    const modal = document.getElementById("walletDownloadModal");
    if (modal) {
        modal.classList.remove("active");
        setTimeout(() => {
            modal.classList.add("hidden");
        }, 300);
    }
}

// Make them available globally
window.openWalletModal = openWalletModal;
window.closeWalletModal = closeWalletModal;
window.openImportModal = openImportModal;
window.closeImportModal = closeImportModal;
window.openDownloadModal = openDownloadModal;
window.closeDownloadModal = closeDownloadModal;

// ==========================================
// 2. Mobile Menus
// ==========================================

window.toggleMobileDocsMenu = function(event) {
    if (event) event.stopPropagation();
    const docsMenu = document.getElementById('mobileDocsMenu');
    if (docsMenu && docsMenu.classList.contains('hidden')) {
        docsMenu.classList.remove('hidden');
        setTimeout(() => {
            docsMenu.classList.remove('opacity-0', 'translate-y-2');
            docsMenu.classList.add('opacity-100', 'translate-y-0');
        }, 10);
    } else if (docsMenu) {
        docsMenu.classList.remove('opacity-100', 'translate-y-0');
        docsMenu.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => {
            docsMenu.classList.add('hidden');
        }, 200);
    }
};

document.addEventListener('click', function(event) {
    const docsMenu = document.getElementById('mobileDocsMenu');
    if (docsMenu && !docsMenu.classList.contains('hidden')) {
        const isClickInside = docsMenu.contains(event.target) || event.target.closest('[onclick="toggleMobileDocsMenu(event)"]');
        if (!isClickInside) {
            window.toggleMobileDocsMenu();
        }
    }
});

// ==========================================
// 3. Flagship Slider Logic (index.html)
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    const slider = document.getElementById('flagship-slider');
    if (!slider) return; // Not on index page or slider missing

    const slides = slider.querySelectorAll('.snap-center');
    const dots = document.querySelectorAll('.slider-dot');
    const prevBtn = document.getElementById('prev-slide');
    const nextBtn = document.getElementById('next-slide');
    
    // Mobile Sticky Nav Elements
    const stickyNav = document.getElementById('mobile-sticky-nav');
    const mobileNavTitle = document.getElementById('mobile-nav-title');
    const mobilePrev = document.getElementById('mobile-prev');
    const mobileNext = document.getElementById('mobile-next');
    const flagshipSection = document.getElementById('flagship');

    let currentSlideIndex = 0;
    let isTransitioning = false;
    
    // Scroll Handler
    let scrollTimeout;
    slider.addEventListener('scroll', () => {
        if (isTransitioning) return;
        
        const scrollLeft = slider.scrollLeft;
        const slideWidth = slider.clientWidth;
        const totalSlides = slides.length;
        
        // 1. Update active dot dynamically during scroll
        const index = Math.round(scrollLeft / slideWidth);
        if (index > 0 && index < totalSlides - 1 && index !== currentSlideIndex) {
            currentSlideIndex = index;
            updateDots(index);
        }

        // 2. Infinite Loop: Wait for scrolling to completely stop before snapping
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const finalScroll = slider.scrollLeft;
            const threshold = 10; // Allow 10px margin of error for sub-pixel rendering
            
            // Reached right clone
            if (finalScroll >= slideWidth * (totalSlides - 1) - threshold) {
                isTransitioning = true;
                slider.scrollTo({ left: slideWidth, behavior: 'instant' });
                currentSlideIndex = 1;
                updateDots(1);
                setTimeout(() => { isTransitioning = false; }, 50);
            }
            // Reached left clone
            else if (finalScroll <= threshold) {
                isTransitioning = true;
                slider.scrollTo({ left: slideWidth * (totalSlides - 2), behavior: 'instant' });
                currentSlideIndex = totalSlides - 2;
                updateDots(totalSlides - 2);
                setTimeout(() => { isTransitioning = false; }, 50);
            }
        }, 150); // 150ms debounce ensures CSS snap/smooth scroll has completely finished
    });

    // Helper: Update Active Dot (adjusted for clones)
    function updateDots(index) {
        // Map DOM index (1 to N-2) to logical dot index (0 to N-3)
        const logicalIndex = index - 1;
        
        dots.forEach((dot, i) => {
            if (i === logicalIndex) {
                dot.classList.add('active', 'bg-bullish-green');
                dot.classList.remove('bg-gray-600', 'hover:bg-gray-400');
            } else {
                dot.classList.remove('active', 'bg-bullish-green');
                dot.classList.add('bg-gray-600', 'hover:bg-gray-400');
            }
        });
        
        // Update Mobile Nav Title
        if (slides[index] && mobileNavTitle) {
            const title = slides[index].getAttribute('data-title');
            if (title) mobileNavTitle.textContent = title;
        }
        
        currentSlideIndex = index;
    }

    // Check activeIndex to jump to the correct starting slide immediately
    const urlParams = new URLSearchParams(window.location.search);
    let initialIndex = 0; // Default to first real slide
    if (urlParams.has('slide')) {
        initialIndex = parseInt(urlParams.get('slide'), 10);
    }
    
    const totalSlides = slider.querySelectorAll('.snap-center').length;
    // We prepended one clone, so DOM index 1 is logical slide 0
    let targetDOMIndex = initialIndex + 1;
    if (targetDOMIndex >= 0 && targetDOMIndex < totalSlides) {
        currentSlideIndex = targetDOMIndex;
        // Using setTimeout to ensure DOM has painted its dimensions
        setTimeout(() => {
            slider.scrollTo({
                left: targetDOMIndex * slider.clientWidth,
                behavior: 'instant'
            });
            updateDots(targetDOMIndex);
        }, 50);
    }

    // Navigation Functions
    window.prevSlide = function() {
        if (isTransitioning) return;
        const slideWidth = slider.clientWidth;
        let newIndex = currentSlideIndex - 1;
        
        slider.scrollTo({
            left: newIndex * slideWidth,
            behavior: 'smooth'
        });
    };

    window.nextSlide = function() {
        if (isTransitioning) return;
        const slideWidth = slider.clientWidth;
        let newIndex = currentSlideIndex + 1;
        
        slider.scrollTo({
            left: newIndex * slideWidth,
            behavior: 'smooth'
        });
    };

    // Desktop Buttons
    if (prevBtn) prevBtn.addEventListener('click', () => { window.prevSlide(); window.resetAutoSlide(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { window.nextSlide(); window.resetAutoSlide(); });

    // Mobile Sticky Nav Buttons
    if (mobilePrev) mobilePrev.addEventListener('click', () => { window.prevSlide(); window.resetAutoSlide(); });
    if (mobileNext) mobileNext.addEventListener('click', () => { window.nextSlide(); window.resetAutoSlide(); });

    // Bottom Dots Click
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            if (isTransitioning) return;
            // Map logical dot index (0,1,2) back to DOM index (1,2,3)
            const targetDOMIndex = index + 1;
            slider.scrollTo({
                left: slider.clientWidth * targetDOMIndex,
                behavior: 'smooth'
            });
            window.resetAutoSlide();
        });
    });

    // Auto-play Logic
    let autoSlideInterval;
    const AUTO_SLIDE_DELAY = 5000; // 5 seconds

    window.startAutoSlide = function() {
        if (autoSlideInterval) clearInterval(autoSlideInterval);
        autoSlideInterval = setInterval(() => {
            window.nextSlide();
        }, AUTO_SLIDE_DELAY);
    };

    window.resetAutoSlide = function() {
        window.startAutoSlide(); // Restart the timer
    };

    // Pause on hover
    if (slider) {
        slider.addEventListener('mouseenter', () => clearInterval(autoSlideInterval));
        slider.addEventListener('mouseleave', window.startAutoSlide);
        slider.addEventListener('touchstart', () => clearInterval(autoSlideInterval), {passive: true});
        slider.addEventListener('touchend', window.startAutoSlide, {passive: true});
    }

    // Start auto-play initially (with a slight delay to ensure layout is ready)
    setTimeout(() => {
        window.startAutoSlide();
    }, 1000);

    // Sticky HUD Intersection Observer
    if (stickyNav && flagshipSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Show HUD
                    stickyNav.classList.remove('translate-y-20', 'opacity-0');
                } else {
                    // Hide HUD
                    stickyNav.classList.add('translate-y-20', 'opacity-0');
                }
            });
        }, {
            threshold: 0.1, // Show when 10% of flagship is visible
            rootMargin: "-100px 0px -100px 0px" // Optional: Adjust trigger area
        });

        observer.observe(flagshipSection);
    }
});
