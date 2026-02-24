/**
 * The Drive — For Ayushi
 * Pixel-perfect canvas animation matching the reference design.
 * Phase 1: Driving scene (continuous until 18s)
 * Phase 2: Crossfade to bouquet (18-21s)
 * Phase 3: Bouquet with idle sway (21s+)
 */
(function () {
    'use strict';

    var canvas = document.getElementById('sceneryCanvas');
    var ctx = canvas.getContext('2d');
    var stage = document.getElementById('artStage');
    var restartBtn = document.getElementById('restartBtn');
    var captureBtn = document.getElementById('captureBtn');

    var width, height;
    var animationId;
    var frameCount = 0;
    var startTime = 0;

    // Mobile detection
    var mobileQuery = window.matchMedia('(max-width: 767px)');
    var isMobile = mobileQuery.matches;
    mobileQuery.addEventListener('change', function(e) {
        isMobile = e.matches;
        start();
    });

    // Mobile scroll state
    var scrollProgress = 0;
    var MOBILE_DRIVE_THRESHOLD = 0.85;
    var TOTAL_DRIVE_FRAMES = 600;

    // Timing
    var DRIVE_END = 10;
    var FADE_DURATION = 3;
    var BOUQUET_START = DRIVE_END + FADE_DURATION;

    // Palette — night drive theme
    var PALETTE = {
        ink: '#D25F3E',
        paper: '#F9F7F2',
        hills1: 'rgba(30, 45, 35, 0.7)',
        hills2: 'rgba(20, 35, 28, 0.85)',
        hills3: 'rgba(15, 28, 22, 0.9)',
        road: '#2a2a2e',
        roadSurface: '#333338',
        skyTop: '#0a0e1a',
        skyMid: '#141828',
        skyBot: '#1e2236'
    };

    var scrollSpeed = 2;
    var trees = [];
    var roadMarkers = [];

    // ─── Resize (DPI-aware) ──────────────────────────────────
    function resize() {
        var rect = stage.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        var dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        initWorld();
    }

    // ─── Palm Tree ───────────────────────────────────────────
    function PalmTree(x) {
        this.x = x;
        this.height = Math.random() * 60 + 80;
        this.lean = Math.random() * 20 - 10;
        this.segments = Math.floor(Math.random() * 5) + 6;
    }

    PalmTree.prototype.update = function (speed) {
        this.x -= speed;
    };

    PalmTree.prototype.computeX = function (fc) {
        var totalShift = fc * scrollSpeed;
        var cycle = width + 200;
        var x = this.origX - (totalShift % cycle);
        while (x < -50) x += cycle;
        return x;
    };

    PalmTree.prototype.draw = function (groundY) {
        ctx.save();
        ctx.translate(this.x, groundY);

        // Segmented trunk
        var cx = 0, cy = 0;
        ctx.strokeStyle = '#2a1f18';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        for (var i = 0; i < this.segments; i++) {
            var nx = cx + (this.lean / this.segments);
            var ny = cy - (this.height / this.segments);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(nx, ny);
            ctx.stroke();
            cx = nx;
            cy = ny;
        }

        // Crown of leaves
        ctx.translate(cx, cy);
        var leaves = 7;
        for (var l = 0; l < leaves; l++) {
            ctx.save();
            var angle = (Math.PI + (l * Math.PI / (leaves - 1))) + Math.sin(frameCount * 0.05 + l) * 0.1;
            ctx.rotate(angle + Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(15, -10, 35, 5);
            ctx.strokeStyle = 'rgba(40, 65, 45, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();
    };

    // ─── Road Marker ─────────────────────────────────────────
    function RoadMarker(x) {
        this.x = x;
        this.w = 40;
    }

    RoadMarker.prototype.update = function (speed) {
        this.x -= speed;
    };

    RoadMarker.prototype.computeX = function (fc) {
        var totalShift = fc * scrollSpeed * 2.5;
        var cycle = width + 100;
        var x = this.origX - (totalShift % cycle);
        while (x < -this.w) x += cycle;
        return x;
    };

    RoadMarker.prototype.draw = function (y) {
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.9;
        ctx.fillRect(this.x, y, this.w, 4);
        ctx.globalAlpha = 1.0;
    };

    // ─── Triquetra ───────────────────────────────────────────
    function drawTriquetra(x, y, baseSize) {
        // Scale relative to canvas so it stays subtle at any viewport
        var size = Math.min(width, height) * 0.04;
        ctx.save();
        ctx.translate(x, y + size * 1.2);
        ctx.strokeStyle = '#f5e6c8';
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.08;
        for (var i = 0; i < 3; i++) {
            ctx.rotate((Math.PI * 2) / 3);
            ctx.beginPath();
            ctx.arc(0, -size / 2, size, Math.PI * 0.66, Math.PI * 2.34);
            ctx.stroke();
        }
        ctx.restore();
    }

    // ─── Init World ──────────────────────────────────────────
    function initWorld() {
        trees = [];
        roadMarkers = [];
        for (var i = 0; i < width + 200; i += 150) {
            if (Math.random() > 0.3) {
                var t = new PalmTree(i);
                t.origX = t.x;
                trees.push(t);
            }
        }
        for (var j = 0; j < width + 100; j += 80) {
            var m = new RoadMarker(j);
            m.origX = m.x;
            roadMarkers.push(m);
        }
        initStars();
    }

    // ─── Hills ───────────────────────────────────────────────
    function drawHill(amplitude, period, speed, color, yOffset) {
        var timeOffset = frameCount * speed;
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (var x = 0; x <= width; x += 10) {
            var y = Math.sin((x + timeOffset) * period) * amplitude + (height - yOffset);
            ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        // Thin outline stroke
        ctx.beginPath();
        for (var x2 = 0; x2 <= width; x2 += 10) {
            var y2 = Math.sin((x2 + timeOffset) * period) * amplitude + (height - yOffset);
            if (x2 === 0) ctx.moveTo(x2, y2);
            else ctx.lineTo(x2, y2);
        }
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.08)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    }

    // ─── Car (night drive) ─────────────────────────────────
    function drawCar(x, y) {
        ctx.save();
        ctx.translate(x, y);

        // Bounce
        var bounce = Math.sin(frameCount * 0.2) * 1.5;
        ctx.translate(0, bounce);

        // Headlight beams — projected forward on the road
        ctx.save();
        var beamGrad = ctx.createRadialGradient(55, 5, 2, 80, 5, 120);
        beamGrad.addColorStop(0, 'rgba(255, 230, 150, 0.25)');
        beamGrad.addColorStop(0.5, 'rgba(255, 230, 150, 0.08)');
        beamGrad.addColorStop(1, 'rgba(255, 230, 150, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(50, -2);
        ctx.lineTo(180, -18);
        ctx.lineTo(180, 28);
        ctx.lineTo(50, 12);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(15, 25, 35, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body — rounded bezier shape
        ctx.fillStyle = PALETTE.ink;
        ctx.strokeStyle = PALETTE.ink;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-20, 10);
        ctx.quadraticCurveTo(-20, -15, 10, -15);
        ctx.quadraticCurveTo(40, -15, 50, 10);
        ctx.quadraticCurveTo(55, 15, 55, 20);
        ctx.lineTo(-25, 20);
        ctx.quadraticCurveTo(-25, 15, -20, 10);
        ctx.fill();

        // Windshield — warm interior glow at night
        ctx.fillStyle = '#2a1f18';
        ctx.beginPath();
        ctx.moveTo(-5, 8);
        ctx.lineTo(30, 8);
        ctx.quadraticCurveTo(25, -10, 10, -10);
        ctx.quadraticCurveTo(-5, -10, -5, 8);
        ctx.fill();

        // Warm interior glow
        var interiorGrad = ctx.createRadialGradient(12, 0, 2, 12, 0, 18);
        interiorGrad.addColorStop(0, 'rgba(255, 200, 120, 0.15)');
        interiorGrad.addColorStop(1, 'rgba(255, 200, 120, 0)');
        ctx.fillStyle = interiorGrad;
        ctx.beginPath();
        ctx.moveTo(-5, 8);
        ctx.lineTo(30, 8);
        ctx.quadraticCurveTo(25, -10, 10, -10);
        ctx.quadraticCurveTo(-5, -10, -5, 8);
        ctx.fill();

        // Two people — sitting close together
        ctx.fillStyle = '#1a1210';
        // Driver
        ctx.beginPath();
        ctx.ellipse(6, -1, 3.5, 5, -0.1, 0, Math.PI * 2);
        ctx.fill();
        // Passenger — leaning slightly toward driver
        ctx.beginPath();
        ctx.ellipse(18, -1, 3.5, 5, 0.15, 0, Math.PI * 2);
        ctx.fill();

        // Headlights — bright at night
        ctx.fillStyle = '#ffe68a';
        ctx.shadowColor = '#ffe68a';
        ctx.shadowBlur = 8;
        ctx.fillRect(52, -2, 4, 7);
        ctx.shadowBlur = 0;

        // Tail lights — red glow
        ctx.fillStyle = '#ff4444';
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 5;
        ctx.fillRect(-27, 5, 3, 6);
        ctx.shadowBlur = 0;

        // Wheels
        drawWheel(-10, 20);
        drawWheel(40, 20);

        ctx.restore();
    }

    function drawWheel(wx, wy) {
        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(frameCount * 0.2);

        // Tire
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#333';
        ctx.fill();

        // Hub
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ddd';
        ctx.fill();

        // Cross spokes
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.lineTo(5, 0);
        ctx.moveTo(0, -5);
        ctx.lineTo(0, 5);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }

    // ─── Moon ────────────────────────────────────────────────
    function drawMoon() {
        var moonR = Math.min(width, height) * 0.045;
        var glowR = moonR * 3;
        var mx = width * 0.82;
        var my = height * 0.13;

        ctx.save();
        ctx.translate(mx, my);

        // Outer glow — soft warm halo
        ctx.fillStyle = '#E9967A';
        ctx.globalAlpha = 0.08;
        ctx.beginPath();
        ctx.arc(0, 0, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Middle glow
        ctx.fillStyle = '#ffe4c9';
        ctx.globalAlpha = 0.12;
        ctx.beginPath();
        ctx.arc(0, 0, glowR * 0.55, 0, Math.PI * 2);
        ctx.fill();

        // Moon disc — pale warm white
        ctx.fillStyle = '#f5e6c8';
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(0, 0, moonR, 0, Math.PI * 2);
        ctx.fill();

        // Crescent shadow — makes it look like a moon
        ctx.fillStyle = PALETTE.skyTop;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(moonR * 0.3, -moonR * 0.1, moonR * 0.75, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ─── Stars ───────────────────────────────────────────────
    var stars = [];
    function initStars() {
        stars = [];
        for (var i = 0; i < 60; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height * 0.55,
                r: Math.random() * 1.2 + 0.3,
                twinkleSpeed: Math.random() * 2 + 1,
                twinklePhase: Math.random() * Math.PI * 2
            });
        }
    }

    function drawStars() {
        for (var i = 0; i < stars.length; i++) {
            var s = stars[i];
            var alpha = 0.3 + Math.sin(frameCount * 0.02 * s.twinkleSpeed + s.twinklePhase) * 0.25;
            ctx.fillStyle = '#f5e6c8';
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // ─── Full Drive Scene ────────────────────────────────────
    function drawDriveScene() {
        // Night sky gradient
        var skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.7);
        skyGrad.addColorStop(0, PALETTE.skyTop);
        skyGrad.addColorStop(0.5, PALETTE.skyMid);
        skyGrad.addColorStop(1, PALETTE.skyBot);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height);

        // Stars
        drawStars();

        // Moon + Triquetra
        drawMoon();
        drawTriquetra(width * 0.82, height * 0.13);

        // Hills (3 parallax layers)
        drawHill(30, 0.005, 0.5, PALETTE.hills1, 150);
        drawHill(20, 0.01, 1, PALETTE.hills2, 80);

        // Ground / road area
        var groundY = height - 40;

        // Trees (drawn on ground before road markers)
        for (var i = trees.length - 1; i >= 0; i--) {
            if (isMobile) {
                trees[i].x = trees[i].computeX(frameCount);
            } else {
                trees[i].update(scrollSpeed);
                if (trees[i].x < -50) {
                    trees.splice(i, 1);
                    var nt = new PalmTree(width + Math.random() * 100);
                    nt.origX = nt.x;
                    trees.push(nt);
                }
            }
            trees[i].draw(groundY);
        }

        // Road surface — dark grey asphalt
        ctx.fillStyle = PALETTE.road;
        ctx.fillRect(0, groundY, width, 40);
        // Road top edge — subtle on night
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(width, groundY);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Road dashed center markers — white
        for (var j = roadMarkers.length - 1; j >= 0; j--) {
            if (isMobile) {
                roadMarkers[j].x = roadMarkers[j].computeX(frameCount);
            } else {
                roadMarkers[j].update(scrollSpeed * 2.5);
                if (roadMarkers[j].x < -roadMarkers[j].w) {
                    roadMarkers[j].x = width;
                }
            }
            roadMarkers[j].draw(height - 20);
        }

        // Car — positioned on road
        var carY = isMobile ? height - 55 : height - 75;
        drawCar(width * 0.3, carY);
    }

    // ─── Bouquet ─────────────────────────────────────────────
    // Sun position (origin point for the morph)
    var sunOriginX, sunOriginY;
    var bouquetFlowers = [];

    function initBouquet() {
        bouquetFlowers = [];
        // Sun is at (width*0.82, height*0.13) — all flowers originate from there
        sunOriginX = width * 0.82;
        sunOriginY = height * 0.13;

        // Bouquet center (where it settles)
        var cx = width * 0.5;
        var cy = height * 0.42;
        var spread = Math.min(width, height) * 0.28;

        var arrangements = [
            { ax: -0.15, ay: -0.35, type: 'rose', color: '#D25F3E', scale: 1.1 },
            { ax: 0.18, ay: -0.32, type: 'rose', color: '#c9543a', scale: 1.0 },
            { ax: -0.32, ay: -0.15, type: 'daisy', color: '#f5efe6', scale: 0.9 },
            { ax: 0.34, ay: -0.12, type: 'daisy', color: '#f5efe6', scale: 0.85 },
            { ax: 0.0, ay: -0.42, type: 'rose', color: '#e07a5e', scale: 1.15 },
            { ax: -0.22, ay: -0.48, type: 'rose', color: '#b84a2e', scale: 0.9 },
            { ax: 0.25, ay: -0.46, type: 'rose', color: '#D25F3E', scale: 0.95 },
            { ax: -0.4, ay: -0.32, type: 'daisy', color: '#f0e8d8', scale: 0.8 },
            { ax: 0.42, ay: -0.28, type: 'rose', color: '#c9543a', scale: 0.85 },
            { ax: 0.05, ay: -0.55, type: 'rose', color: '#e07a5e', scale: 1.0 },
            { ax: -0.1, ay: -0.22, type: 'daisy', color: '#f5efe6', scale: 0.75 },
            { ax: 0.12, ay: -0.18, type: 'daisy', color: '#f0e8d8', scale: 0.8 }
        ];

        for (var i = 0; i < arrangements.length; i++) {
            var a = arrangements[i];
            bouquetFlowers.push({
                type: a.type,
                color: a.color,
                scale: a.scale,
                targetX: cx + a.ax * spread,
                targetY: cy + a.ay * spread,
                // All flowers start from the sun position
                startX: sunOriginX + (Math.random() - 0.5) * 20,
                startY: sunOriginY + (Math.random() - 0.5) * 20,
                delay: i * 0.04,
                swayPhase: Math.random() * Math.PI * 2,
                swaySpeed: 0.5 + Math.random() * 0.5
            });
        }
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function shiftColor(hex, amount) {
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        r = Math.max(0, Math.min(255, r + amount));
        g = Math.max(0, Math.min(255, g + amount));
        b = Math.max(0, Math.min(255, b + amount));
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    function drawWrapping(cx, cy, spread, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        var s = spread / 100;

        // Paper cone
        ctx.fillStyle = '#e8dcc8';
        ctx.beginPath();
        ctx.moveTo(cx - 55 * s, cy - 10 * s);
        ctx.lineTo(cx + 55 * s, cy - 10 * s);
        ctx.lineTo(cx + 20 * s, cy + 80 * s);
        ctx.lineTo(cx - 20 * s, cy + 80 * s);
        ctx.closePath();
        ctx.fill();

        // Paper fold
        ctx.strokeStyle = '#d4c4a8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 40 * s, cy);
        ctx.lineTo(cx + 40 * s, cy);
        ctx.stroke();

        // Texture lines
        ctx.strokeStyle = 'rgba(180, 160, 130, 0.3)';
        ctx.lineWidth = 0.5;
        for (var i = 0; i < 3; i++) {
            var yy = cy + (15 + i * 18) * s;
            ctx.beginPath();
            ctx.moveTo(cx - (45 - i * 10) * s, yy);
            ctx.lineTo(cx + (45 - i * 10) * s, yy);
            ctx.stroke();
        }

        // Ribbon
        ctx.fillStyle = PALETTE.ink;
        ctx.globalAlpha = alpha * 0.8;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 5 * s, 30 * s, 6 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bow loops
        ctx.globalAlpha = alpha * 0.7;
        ctx.beginPath();
        ctx.ellipse(cx - 18 * s, cy - 2 * s, 14 * s, 8 * s, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 18 * s, cy - 2 * s, 14 * s, 8 * s, 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Tails
        ctx.strokeStyle = PALETTE.ink;
        ctx.lineWidth = 2 * s;
        ctx.globalAlpha = alpha * 0.6;
        ctx.beginPath();
        ctx.moveTo(cx - 8 * s, cy + 8 * s);
        ctx.quadraticCurveTo(cx - 20 * s, cy + 30 * s, cx - 12 * s, cy + 45 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 8 * s, cy + 8 * s);
        ctx.quadraticCurveTo(cx + 22 * s, cy + 28 * s, cx + 14 * s, cy + 42 * s);
        ctx.stroke();

        ctx.restore();
    }

    function drawStems(cx, cy, flowers, progress, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#5a8a4a';
        ctx.lineWidth = 2;
        for (var i = 0; i < flowers.length; i++) {
            var f = flowers[i];
            var p = Math.max(0, Math.min(1, (progress - f.delay) / 0.8));
            p = easeOutCubic(p);
            var fx = f.startX + (f.targetX - f.startX) * p;
            var fy = f.startY + (f.targetY - f.startY) * p;
            ctx.beginPath();
            ctx.moveTo(cx, cy + 20);
            ctx.quadraticCurveTo(cx + (fx - cx) * 0.3, cy + (fy - cy) * 0.2 + 15, fx, fy);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawLeaves(cx, cy, spread, progress, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        var leafPositions = [
            { sx: -0.25, sy: -0.08 }, { sx: 0.28, sy: -0.05 },
            { sx: -0.35, sy: -0.22 }, { sx: 0.38, sy: -0.18 },
            { sx: -0.18, sy: -0.38 }, { sx: 0.2, sy: -0.35 },
            { sx: -0.08, sy: -0.12 }, { sx: 0.1, sy: -0.1 }
        ];
        for (var i = 0; i < leafPositions.length; i++) {
            var lp = leafPositions[i];
            var p = Math.max(0, Math.min(1, (progress - i * 0.03) / 0.7));
            p = easeOutCubic(p);
            if (p <= 0) continue;
            var lx = cx + lp.sx * spread;
            var ly = cy + lp.sy * spread;
            var angle = Math.atan2(ly - cy, lx - cx) + Math.PI * 0.3;
            var leafSize = 14;
            ctx.save();
            ctx.translate(lx, ly);
            ctx.rotate(angle);
            ctx.scale(p, p);
            ctx.fillStyle = i % 2 === 0 ? '#5a8a4a' : '#4a7a3a';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(leafSize * 0.4, -leafSize * 0.3, leafSize, 0);
            ctx.quadraticCurveTo(leafSize * 0.4, leafSize * 0.3, 0, 0);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(leafSize * 0.85, 0);
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    }

    function drawRose(x, y, scale, color, alpha) {
        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = alpha;
        var s = 10 * scale;
        var petalColors = [color, shiftColor(color, 15), shiftColor(color, -10)];
        for (var ring = 0; ring < 3; ring++) {
            var petals = 5 + ring;
            var radius = s * (0.4 + ring * 0.3);
            ctx.fillStyle = petalColors[ring % 3];
            for (var p = 0; p < petals; p++) {
                var angle = (p / petals) * Math.PI * 2 + ring * 0.3;
                ctx.save();
                ctx.rotate(angle);
                ctx.beginPath();
                ctx.ellipse(radius * 0.5, 0, radius * 0.45, radius * 0.28, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
        ctx.fillStyle = shiftColor(color, -25);
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawDaisy(x, y, scale, color, alpha) {
        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = alpha;
        var s = 9 * scale;
        var petalCount = 10;
        ctx.fillStyle = color;
        for (var p = 0; p < petalCount; p++) {
            var angle = (p / petalCount) * Math.PI * 2;
            ctx.save();
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.ellipse(s * 0.55, 0, s * 0.4, s * 0.15, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        ctx.fillStyle = '#e8c060';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d4a840';
        for (var d = 0; d < 5; d++) {
            var da = (d / 5) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(Math.cos(da) * s * 0.12, Math.sin(da) * s * 0.12, 1, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function drawBouquet(elapsed, assemblyProgress, alpha) {
        var cx = width * 0.5;
        var cy = height * 0.55;
        var spread = Math.min(width, height) * 0.28;

        var breathe = 1;
        var swayX = 0;
        if (assemblyProgress >= 1) {
            breathe = 0.98 + Math.sin(elapsed * 1.5) * 0.02;
            swayX = Math.sin(elapsed * 0.8) * 1.5;
        }

        ctx.save();
        ctx.translate(swayX, 0);
        ctx.translate(cx, cy);
        ctx.scale(breathe, breathe);
        ctx.translate(-cx, -cy);

        drawWrapping(cx, cy, spread, alpha);
        drawStems(cx, cy, bouquetFlowers, assemblyProgress, alpha);
        drawLeaves(cx, cy, spread, assemblyProgress, alpha);

        for (var i = 0; i < bouquetFlowers.length; i++) {
            var f = bouquetFlowers[i];
            var p = Math.max(0, Math.min(1, (assemblyProgress - f.delay) / 0.8));
            p = easeOutCubic(p);
            var fx = f.startX + (f.targetX - f.startX) * p;
            var fy = f.startY + (f.targetY - f.startY) * p;
            var fAlpha = alpha * Math.min(1, p * 2);

            if (assemblyProgress >= 1) {
                fx += Math.sin(elapsed * f.swaySpeed + f.swayPhase) * 1.5;
                fy += Math.cos(elapsed * f.swaySpeed * 0.7 + f.swayPhase) * 1;
            }

            if (f.type === 'rose') {
                drawRose(fx, fy, f.scale, f.color, fAlpha);
            } else {
                drawDaisy(fx, fy, f.scale, f.color, fAlpha);
            }
        }

        ctx.restore();
    }

    // ─── Draw the expanding moon glow during morph ─────────
    function drawMoonMorph(t) {
        // t goes 0→1 during transition
        // Moon expands from its small size into a full-canvas wash of paper color
        var mx = sunOriginX;
        var my = sunOriginY;
        var baseR = Math.min(width, height) * 0.045;
        var maxR = Math.sqrt(width * width + height * height);
        var r = baseR + (maxR - baseR) * easeOutCubic(t);

        ctx.save();
        var grad = ctx.createRadialGradient(mx, my, 0, mx, my, r);
        // Warm moonlight expanding to paper
        grad.addColorStop(0, PALETTE.paper);
        grad.addColorStop(0.2, 'rgba(249, 247, 242, 0.97)');
        grad.addColorStop(0.5, 'rgba(245, 230, 200, ' + (0.9 - t * 0.3) + ')');
        grad.addColorStop(0.8, 'rgba(30, 34, 54, ' + (1 - t) * 0.5 + ')');
        grad.addColorStop(1, 'rgba(10, 14, 26, ' + (1 - t) + ')');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // ─── Mobile Scroll Tracking ─────────────────────────────
    function updateScrollProgress() {
        var docH = document.documentElement.scrollHeight - window.innerHeight;
        scrollProgress = docH > 0 ? Math.min(1, Math.max(0, window.scrollY / docH)) : 0;
    }

    // ─── Animation Loop ──────────────────────────────────────
    function animate(timestamp) {
        if (!startTime) startTime = timestamp;
        var elapsed = (timestamp - startTime) / 1000;

        ctx.clearRect(0, 0, width, height);

        if (elapsed < DRIVE_END) {
            // Phase 1: Drive
            drawDriveScene();
            frameCount++;
        } else if (elapsed < BOUQUET_START) {
            // Phase 2: Sun morphs into bouquet
            var fadeT = (elapsed - DRIVE_END) / FADE_DURATION;

            // Draw the drive scene underneath (it stays still, no more scrolling)
            drawDriveScene();

            // Moon expands outward as a radial wash, covering the scene
            drawMoonMorph(fadeT);

            // Bouquet flowers emerge from the sun position, assembling outward
            drawBouquet(elapsed, fadeT, Math.min(1, fadeT * 1.5));

            frameCount++;
        } else {
            // Phase 3: Bouquet idle on paper background
            var assemblyElapsed = elapsed - DRIVE_END;
            var assemblyProgress = Math.min(1, assemblyElapsed / FADE_DURATION);

            ctx.fillStyle = PALETTE.paper;
            ctx.fillRect(0, 0, width, height);
            drawBouquet(elapsed, assemblyProgress, 1);
        }

        animationId = requestAnimationFrame(animate);
    }

    // ─── Mobile Animation Loop (scroll-driven) ──────────────
    var mobileIdleStart = 0;
    function animateMobile(timestamp) {
        ctx.clearRect(0, 0, width, height);

        if (scrollProgress < MOBILE_DRIVE_THRESHOLD) {
            // Drive phase — scroll controls progress
            frameCount = Math.round((scrollProgress / MOBILE_DRIVE_THRESHOLD) * TOTAL_DRIVE_FRAMES);
            drawDriveScene();
        } else {
            // Morph phase
            var morphT = Math.min(1, (scrollProgress - MOBILE_DRIVE_THRESHOLD) / (1 - MOBILE_DRIVE_THRESHOLD));
            frameCount = TOTAL_DRIVE_FRAMES;

            if (morphT < 1) {
                drawDriveScene();
                drawMoonMorph(morphT);
                drawBouquet(morphT * 3, morphT, Math.min(1, morphT * 1.5));
                mobileIdleStart = 0;
            } else {
                // Full bouquet — idle breathing using timestamp
                if (!mobileIdleStart) mobileIdleStart = timestamp;
                var idleElapsed = (timestamp - mobileIdleStart) / 1000;
                ctx.fillStyle = PALETTE.paper;
                ctx.fillRect(0, 0, width, height);
                drawBouquet(idleElapsed + 3, 1, 1);
            }
        }

        animationId = requestAnimationFrame(animateMobile);
    }

    // ─── Controls ────────────────────────────────────────────
    function start() {
        startTime = 0;
        frameCount = 0;
        scrollProgress = 0;
        mobileIdleStart = 0;
        initWorld();
        initBouquet();
        if (animationId) cancelAnimationFrame(animationId);
        if (isMobile) {
            updateScrollProgress();
            animationId = requestAnimationFrame(animateMobile);
        } else {
            animationId = requestAnimationFrame(animate);
        }
    }

    restartBtn.addEventListener('click', function () {
        if (isMobile) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        start();
    });

    // Full-screen capture using html2canvas
    captureBtn.addEventListener('click', function () {
        // Temporarily hide buttons for clean capture
        var btnContainer = captureBtn.parentElement;
        btnContainer.style.display = 'none';

        html2canvas(document.body, {
            backgroundColor: '#EAE8E0',
            scale: window.devicePixelRatio || 2,
            useCORS: true,
            logging: false
        }).then(function (screenshotCanvas) {
            btnContainer.style.display = '';
            var link = document.createElement('a');
            link.download = 'our-drive-ayushi.png';
            link.href = screenshotCanvas.toDataURL('image/png');
            link.click();
        }).catch(function () {
            btnContainer.style.display = '';
            // Fallback: just capture the canvas
            var link = document.createElement('a');
            link.download = 'our-drive-ayushi.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    });

    window.addEventListener('resize', resize);
    window.addEventListener('scroll', updateScrollProgress, { passive: true });

    // Boot
    resize();
    start();

    console.log(
        '%cThe Drive — For Ayushi',
        'font-size: 14px; color: #D25F3E; background: #F9F7F2; padding: 8px;'
    );
})();
