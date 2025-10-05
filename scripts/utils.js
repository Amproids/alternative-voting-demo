// utils.js
// Helper functions and utilities

const Utils = (function() {
    'use strict';
    
    // Calculate Euclidean distance between two points
    function distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Generate Gaussian random number using Box-Muller transform
    function gaussianRandom() {
        let u1, u2;
        do {
            u1 = Math.random();
            u2 = Math.random();
        } while (u1 === 0); // Converting [0,1) to (0,1)
        
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        return z0;
    }
    
    // Generate Gaussian-distributed points around a center
    // spreadRadius is the user-facing parameter; internally converted to standard deviation
    function generateGaussianPoints(centerX, centerY, spreadRadius, count) {
        const sigma = spreadRadius / CONFIG.SIGMA_DIVISOR; // Convert to standard deviation
        const points = [];
        
        for (let i = 0; i < count; i++) {
            // Generate offset using Gaussian distribution
            const offsetX = gaussianRandom() * sigma;
            const offsetY = gaussianRandom() * sigma;
            
            // Calculate actual position
            const x = centerX + offsetX;
            const y = centerY + offsetY;
            
            // Clamp display position to canvas bounds (with margin)
            const displayX = clamp(x, CONFIG.CANVAS_MARGIN, CONFIG.CANVAS_WIDTH - CONFIG.CANVAS_MARGIN);
            const displayY = clamp(y, CONFIG.CANVAS_MARGIN, CONFIG.CANVAS_HEIGHT - CONFIG.CANVAS_MARGIN);
            
            points.push({
                x: displayX,
                y: displayY,
                offsetX: offsetX, // Store original offset for distribution movement
                offsetY: offsetY,
                voteColor: CONFIG.VOTER_DEFAULT_COLOR, // Default black, updated after election
                preferredCandidate: null // Updated after election
            });
        }
        
        return points;
    }
    
    // Get canvas coordinates from mouse/touch event
    function getCanvasCoordinates(canvas, event) {
        const rect = canvas.getBoundingClientRect();
        
        let clientX, clientY;
        
        if (event.touches && event.touches.length > 0) {
            // Touch event
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            // Mouse event
            clientX = event.clientX;
            clientY = event.clientY;
        }
        
        // Calculate coordinates relative to the logical canvas size
        // (not the physical pixel size)
        const x = (clientX - rect.left) * (CONFIG.CANVAS_WIDTH / rect.width);
        const y = (clientY - rect.top) * (CONFIG.CANVAS_HEIGHT / rect.height);
        
        return { x, y };
    }
    
    // Clamp a value between min and max
    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    
    // Format number for display (with commas)
    function formatNumber(num) {
        return num.toLocaleString();
    }
    
    // Format percentage for display
    function formatPercentage(value, total) {
        if (total === 0) return '0.0%';
        return ((value / total) * 100).toFixed(1) + '%';
    }
    
    // Convert RGB hex to HSL
    function hexToHSL(hex) {
        // Parse hex
        const r = parseInt(hex.substr(1, 2), 16) / 255;
        const g = parseInt(hex.substr(3, 2), 16) / 255;
        const b = parseInt(hex.substr(5, 2), 16) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        
        let h = 0, s = 0, l = (max + min) / 2;
        
        if (diff !== 0) {
            s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
            
            switch (max) {
                case r: h = ((g - b) / diff + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / diff + 2) / 6; break;
                case b: h = ((r - g) / diff + 4) / 6; break;
            }
        }
        
        return { h: h * 360, s: s * 100, l: l * 100 };
    }
    
    // Convert HSL to RGB hex
    function hslToHex(h, s, l) {
        h = h / 360;
        s = s / 100;
        l = l / 100;
        
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        const toHex = x => {
            const hex = Math.round(x * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    
    // Get proportional color based on candidate weights
    // candidateWeights: object/map of {candidateId: weight}
    // Returns blended RGB color with saturation boost, or grey if no discriminatory preference
    function getProportionalColor(candidateWeights) {
        const weights = Object.values(candidateWeights);
        const candidateIds = Object.keys(candidateWeights).map(id => parseInt(id));
        
        // Check if all weights are zero or equal (no preference)
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        
        if (totalWeight === 0) {
            return CONFIG.VOTER_GREY_COLOR;
        }
        
        // Check if all non-zero weights are equal
        const nonZeroWeights = weights.filter(w => w > 0);
        if (nonZeroWeights.length > 0) {
            const allEqual = nonZeroWeights.every(w => w === nonZeroWeights[0]);
            if (allEqual && nonZeroWeights.length === weights.length) {
                // All weights are equal and non-zero
                return CONFIG.VOTER_GREY_COLOR;
            }
        }
        
        // Normalize weights
        const normalizedWeights = weights.map(w => w / totalWeight);
        
        // Blend RGB colors
        let r = 0, g = 0, b = 0;
        
        candidateIds.forEach((candidateId, index) => {
            const weight = normalizedWeights[index];
            const color = CONFIG.CANDIDATE_COLORS[candidateId];
            
            // Parse hex color
            const hexR = parseInt(color.substr(1, 2), 16);
            const hexG = parseInt(color.substr(3, 2), 16);
            const hexB = parseInt(color.substr(5, 2), 16);
            
            r += hexR * weight;
            g += hexG * weight;
            b += hexB * weight;
        });
        
        // Round RGB values
        r = Math.round(r);
        g = Math.round(g);
        b = Math.round(b);
        
        // Convert to hex
        const blendedHex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        
        // Apply saturation boost for better visibility
        const hsl = hexToHSL(blendedHex);
        hsl.s = Math.min(100, hsl.s * CONFIG.COLOR_BLEND_SATURATION_BOOST);
        
        return hslToHex(hsl.h, hsl.s, hsl.l);
    }
    
    // Random choice from array (for tie-breaking)
    function randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    
    // Shuffle array in place (Fisher-Yates algorithm)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    // Public API
    return {
        distance,
        gaussianRandom,
        generateGaussianPoints,
        getCanvasCoordinates,
        clamp,
        formatNumber,
        formatPercentage,
        hexToHSL,
        hslToHex,
        getProportionalColor,
        randomChoice,
        shuffleArray
    };
})();

// Make Utils globally available
if (typeof window !== 'undefined') {
    window.Utils = Utils;
}