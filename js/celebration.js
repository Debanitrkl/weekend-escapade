/**
 * Silicon Love - Celebration Page Effects
 * Confetti, sparkles, and happy animations!
 */

(function() {
    'use strict';

    // Canvas setup
    const canvas = document.getElementById('confettiCanvas');
    const ctx = canvas.getContext('2d');

    // Resize canvas to full viewport
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Confetti configuration
    const confettiConfig = {
        particleCount: 150,
        colors: [
            '#FFD700',  // Gold
            '#6B5B95',  // Purple
            '#4A90D9',  // Blue
            '#FFB6C1',  // Pink
            '#4ADE80',  // Green
            '#FFFFFF',  // White
        ],
        shapes: ['square', 'circle', 'heart', 'chip'],
        gravity: 0.3,
        terminalVelocity: 5,
        drag: 0.075,
        duration: 5000,  // ms
    };

    // Particle class
    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            // Start from top of screen
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * -canvas.height;

            // Size
            this.size = Math.random() * 8 + 4;

            // Velocity
            this.vx = (Math.random() - 0.5) * 4;
            this.vy = Math.random() * 3 + 2;

            // Rotation
            this.rotation = Math.random() * 360;
            this.rotationSpeed = (Math.random() - 0.5) * 10;

            // Appearance
            this.color = confettiConfig.colors[
                Math.floor(Math.random() * confettiConfig.colors.length)
            ];
            this.shape = confettiConfig.shapes[
                Math.floor(Math.random() * confettiConfig.shapes.length)
            ];

            // Wobble
            this.wobble = Math.random() * 10;
            this.wobbleSpeed = Math.random() * 0.1 + 0.05;

            // Opacity
            this.opacity = 1;
        }

        update() {
            // Apply gravity
            this.vy += confettiConfig.gravity;

            // Apply drag
            this.vy = Math.min(this.vy, confettiConfig.terminalVelocity);

            // Update position
            this.x += this.vx + Math.sin(this.wobble) * 2;
            this.y += this.vy;

            // Update rotation
            this.rotation += this.rotationSpeed;

            // Update wobble
            this.wobble += this.wobbleSpeed;

            // Fade out near bottom
            if (this.y > canvas.height - 100) {
                this.opacity = Math.max(0, (canvas.height - this.y) / 100);
            }

            // Reset if off screen
            if (this.y > canvas.height + 50 || this.x < -50 || this.x > canvas.width + 50) {
                this.reset();
            }
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation * Math.PI / 180);
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = this.color;

            switch (this.shape) {
                case 'square':
                    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
                    break;

                case 'circle':
                    ctx.beginPath();
                    ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'heart':
                    this.drawHeart();
                    break;

                case 'chip':
                    this.drawChip();
                    break;
            }

            ctx.restore();
        }

        drawHeart() {
            const s = this.size / 2;
            ctx.beginPath();
            ctx.moveTo(0, s * 0.3);
            ctx.bezierCurveTo(-s, -s * 0.5, -s, s * 0.5, 0, s);
            ctx.bezierCurveTo(s, s * 0.5, s, -s * 0.5, 0, s * 0.3);
            ctx.fill();
        }

        drawChip() {
            const s = this.size;
            // Chip body
            ctx.fillRect(-s / 2, -s / 2, s, s);
            // Chip pins
            ctx.fillStyle = '#333';
            const pinSize = s / 6;
            for (let i = 0; i < 3; i++) {
                // Top pins
                ctx.fillRect(-s / 2 + (i + 0.5) * (s / 3) - pinSize / 2, -s / 2 - pinSize, pinSize, pinSize);
                // Bottom pins
                ctx.fillRect(-s / 2 + (i + 0.5) * (s / 3) - pinSize / 2, s / 2, pinSize, pinSize);
            }
        }
    }

    // Create particles
    const particles = [];
    for (let i = 0; i < confettiConfig.particleCount; i++) {
        particles.push(new Particle());
    }

    // Animation state
    let isAnimating = true;
    let startTime = Date.now();

    // Animation loop
    function animate() {
        if (!isAnimating) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update and draw particles
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });

        // Slow down after duration
        const elapsed = Date.now() - startTime;
        if (elapsed > confettiConfig.duration) {
            // Gradually reduce gravity to let particles settle
            confettiConfig.gravity = Math.max(0.05, confettiConfig.gravity - 0.005);
        }

        requestAnimationFrame(animate);
    }

    // Burst effect - more particles at start
    function burst() {
        particles.forEach((particle, i) => {
            // Stagger the start
            setTimeout(() => {
                particle.y = -10;
                particle.x = canvas.width / 2 + (Math.random() - 0.5) * 200;
                particle.vy = Math.random() * 5 + 3;
                particle.vx = (Math.random() - 0.5) * 15;
            }, i * 10);
        });
    }

    // Start animation
    function init() {
        burst();
        animate();

        // Add celebration console message
        console.log('%c🎉 YAYY! Kerala Trip is ON! 🎉',
            'font-size: 20px; color: #4ADE80; background: #1A1A2E; padding: 15px;');
        console.log('%c💕 Connection established. Love signal: MAXIMUM 💕',
            'font-size: 14px; color: #FFB6C1;');
    }

    // Start when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Add click to burst more confetti
    document.addEventListener('click', () => {
        if (isAnimating) {
            confettiConfig.gravity = 0.3; // Reset gravity
            startTime = Date.now(); // Reset timer
            burst();
        }
    });
})();
