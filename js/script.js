/**
 * Silicon Love - Dodging "No" Button Logic
 * The No button runs away when you try to click it!
 */

(function() {
    'use strict';

    // DOM Elements
    const noButton = document.getElementById('noButton');
    const hintText = document.getElementById('hintText');
    const buttonContainer = document.querySelector('.button-container');

    // State
    let dodgeCount = 0;
    let isDodging = false;
    let isFixed = false;

    // Configuration
    const config = {
        triggerDistance: 100,       // Distance in px to trigger dodge
        mobileTriggerDistance: 80,  // Smaller trigger on mobile
        padding: 20,                // Padding from viewport edges
        maxDodges: 5,               // After this many dodges, show message and shrink
        animationDuration: 200,     // ms for dodge animation
    };

    // Hints to show after dodges
    const hints = [
        "Nice try! 😏",
        "The button doesn't want to be clicked!",
        "Almost got it... not!",
        "Keep trying! (It won't help)",
        "Okay okay, just click YES! 💕"
    ];

    /**
     * Check if device is mobile/touch
     */
    function isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    /**
     * Get viewport dimensions
     */
    function getViewport() {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    /**
     * Get button dimensions and position
     */
    function getButtonRect() {
        return noButton.getBoundingClientRect();
    }

    /**
     * Calculate distance between point and element center
     */
    function getDistance(x, y, rect) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        return Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    }

    /**
     * Generate a random position within viewport bounds
     */
    function getRandomPosition() {
        const viewport = getViewport();
        const buttonRect = getButtonRect();
        const padding = config.padding;

        // Calculate safe bounds
        const maxX = viewport.width - buttonRect.width - padding;
        const maxY = viewport.height - buttonRect.height - padding;

        // Generate random position
        const x = padding + Math.random() * (maxX - padding);
        const y = padding + Math.random() * (maxY - padding);

        return { x, y };
    }

    /**
     * Move button to a new position away from the pointer
     */
    function moveButton(pointerX, pointerY) {
        if (isDodging || isFixed) return;

        isDodging = true;
        dodgeCount++;

        // Make button fixed position if not already
        if (!noButton.classList.contains('dodging')) {
            const rect = getButtonRect();
            noButton.style.left = rect.left + 'px';
            noButton.style.top = rect.top + 'px';
            noButton.classList.add('dodging');
        }

        // Get new position away from pointer
        let newPos = getRandomPosition();
        let attempts = 0;
        const maxAttempts = 10;

        // Try to find a position away from the pointer
        while (attempts < maxAttempts) {
            const distance = Math.sqrt(
                Math.pow(newPos.x - pointerX, 2) +
                Math.pow(newPos.y - pointerY, 2)
            );

            if (distance > config.triggerDistance * 1.5) {
                break;
            }

            newPos = getRandomPosition();
            attempts++;
        }

        // Animate to new position
        noButton.style.left = newPos.x + 'px';
        noButton.style.top = newPos.y + 'px';

        // Update hint text
        if (dodgeCount <= hints.length) {
            hintText.textContent = hints[dodgeCount - 1];
            hintText.style.opacity = '1';
        }

        // After max dodges, shrink the button
        if (dodgeCount >= config.maxDodges) {
            noButton.classList.add('shrinking');
            isFixed = true;
            hintText.textContent = "Just click YES already! 💕";
        }

        // Reset dodging flag after animation
        setTimeout(() => {
            isDodging = false;
        }, config.animationDuration);
    }

    /**
     * Handle mouse movement
     */
    function handleMouseMove(e) {
        if (isFixed) return;

        const rect = getButtonRect();
        const distance = getDistance(e.clientX, e.clientY, rect);
        const triggerDist = isTouchDevice() ?
            config.mobileTriggerDistance :
            config.triggerDistance;

        if (distance < triggerDist) {
            moveButton(e.clientX, e.clientY);
        }
    }

    /**
     * Handle touch start - prevent default and dodge
     */
    function handleTouchStart(e) {
        if (isFixed) return;

        // Prevent the click from registering
        e.preventDefault();

        const touch = e.touches[0];
        moveButton(touch.clientX, touch.clientY);
    }

    /**
     * Handle touch move
     */
    function handleTouchMove(e) {
        if (isFixed) return;

        const touch = e.touches[0];
        const rect = getButtonRect();
        const distance = getDistance(touch.clientX, touch.clientY, rect);

        if (distance < config.mobileTriggerDistance) {
            moveButton(touch.clientX, touch.clientY);
        }
    }

    /**
     * Handle window resize - keep button in bounds
     */
    function handleResize() {
        if (!noButton.classList.contains('dodging')) return;

        const viewport = getViewport();
        const rect = getButtonRect();
        const padding = config.padding;

        let x = parseFloat(noButton.style.left);
        let y = parseFloat(noButton.style.top);

        // Clamp to viewport
        x = Math.max(padding, Math.min(x, viewport.width - rect.width - padding));
        y = Math.max(padding, Math.min(y, viewport.height - rect.height - padding));

        noButton.style.left = x + 'px';
        noButton.style.top = y + 'px';
    }

    /**
     * Initialize event listeners
     */
    function init() {
        // Mouse events for desktop
        document.addEventListener('mousemove', handleMouseMove, { passive: true });

        // Touch events for mobile
        noButton.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: true });

        // Window resize
        window.addEventListener('resize', handleResize, { passive: true });

        // Prevent click on no button (just in case they manage to click it)
        noButton.addEventListener('click', function(e) {
            if (!isFixed || dodgeCount < config.maxDodges) {
                e.preventDefault();
                moveButton(e.clientX, e.clientY);
            }
        });

        // Add some fun console messages
        console.log('%c💜 Silicon Love Protocol Initiated 💜',
            'font-size: 16px; color: #FFD700; background: #1A1A2E; padding: 10px;');
        console.log('%cThe "No" button is feeling shy today...',
            'font-size: 12px; color: #6B5B95;');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
