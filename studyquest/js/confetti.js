/**
 * ============================================
 * StudyQuest — confetti.js
 * Canvas-based confetti burst animation.
 * Spawns 80 colorful particles from a given
 * position with gravity, rotation, and fade.
 * ============================================
 */

/* ── Confetti Configuration ── */
const CONFETTI_COLORS = [
    '#4F8EF7', '#3ECF8E', '#FFD166', '#A78BFA',
    '#F87171', '#FB923C', '#F472B6', '#38BDF8',
    '#34D399', '#FBBF24', '#C084FC', '#60A5FA'
];

const CONFETTI_COUNT = 80;
const CONFETTI_DURATION = 1500; // ms

/* ── Fire Confetti Burst ── */
const fireConfetti = (originX, originY) => {
    // Create a canvas overlay for the confetti
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
        position: fixed; inset: 0; width: 100vw; height: 100vh;
        pointer-events: none; z-index: 9999;
    `;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    // Generate particles with random velocities and properties
    const particles = Array.from({ length: CONFETTI_COUNT }, () => ({
        x: originX,
        y: originY,
        vx: (Math.random() - 0.5) * 16,       // Horizontal velocity
        vy: (Math.random() - 0.7) * 14 - 4,    // Upward initial velocity
        w: Math.random() * 8 + 4,               // Width of rectangle
        h: Math.random() * 6 + 3,               // Height of rectangle
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,   // Rotation speed
        gravity: 0.12 + Math.random() * 0.08,   // Gravity strength
        opacity: 1,
        decay: 0.008 + Math.random() * 0.008    // Opacity decay rate
    }));

    const startTime = Date.now();

    /* ── Animation Loop ── */
    const animate = () => {
        const elapsed = Date.now() - startTime;

        // Stop animation after duration
        if (elapsed > CONFETTI_DURATION) {
            canvas.remove();
            return;
        }

        // Clear canvas each frame
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            // Apply physics: gravity pulls down, velocity moves particle
            p.vy += p.gravity;
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += p.rotSpeed;
            p.opacity -= p.decay;

            // Skip if fully transparent
            if (p.opacity <= 0) return;

            // Draw rotated rectangle
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.globalAlpha = Math.max(p.opacity, 0);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        });

        requestAnimationFrame(animate);
    };

    animate();
};
