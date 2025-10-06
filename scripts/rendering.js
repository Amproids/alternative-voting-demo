// rendering.js
// Canvas drawing and visualization

const Rendering = (function() {
    'use strict';
    
    let canvas = null;
    let ctx = null;
    
    // Initialize rendering with canvas reference
    function initialize(canvasElement) {
        canvas = canvasElement;
        ctx = canvas.getContext('2d');
        
        // Set up high-DPI rendering
        const dpr = window.devicePixelRatio || 1;
        canvas.width = CONFIG.CANVAS_WIDTH * dpr;
        canvas.height = CONFIG.CANVAS_HEIGHT * dpr;
        canvas.style.width = CONFIG.CANVAS_WIDTH + 'px';
        canvas.style.height = CONFIG.CANVAS_HEIGHT + 'px';
        ctx.scale(dpr, dpr);
    }
    
    // Get canvas element
    function getCanvas() {
        return canvas;
    }
    
    // Get canvas context
    function getContext() {
        return ctx;
    }
    
    // Clear canvas
    function clearCanvas() {
        ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    }
    
    // Render background grid with center axes
    function renderBackground() {
        const gridSpacing = CONFIG.GRID_SPACING;
        const width = CONFIG.CANVAS_WIDTH;
        const height = CONFIG.CANVAS_HEIGHT;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Draw grid lines
        ctx.strokeStyle = CONFIG.GRID_LINE_COLOR;
        ctx.lineWidth = CONFIG.GRID_LINE_WIDTH;
        
        // Vertical lines
        for (let x = 0; x <= width; x += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= height; y += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Draw center axes (darker)
        ctx.strokeStyle = CONFIG.CENTER_AXIS_COLOR;
        ctx.lineWidth = CONFIG.CENTER_AXIS_WIDTH;
        
        // Vertical center line
        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, height);
        ctx.stroke();
        
        // Horizontal center line
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
    }
    
    // Render approval voting circles
    function renderApprovalCircles() {
        const state = State.getState();
        
        if (state.votingMethod !== 'approval') {
            return;
        }
        
        const radius = state.approvalRadius;
        
        ctx.lineWidth = CONFIG.APPROVAL_CIRCLE_WIDTH;
        ctx.globalAlpha = CONFIG.APPROVAL_CIRCLE_OPACITY;
        
        state.candidates.forEach(candidate => {
            ctx.strokeStyle = candidate.color;
            ctx.beginPath();
            ctx.arc(candidate.x, candidate.y, radius, 0, Math.PI * 2);
            ctx.stroke();
        });
        
        ctx.globalAlpha = 1.0;
    }
    
    // Render STAR/Score voting rings
    function renderScoreRings(maxDistance, displayRanges) {
        const state = State.getState();
        
        if (!displayRanges) {
            return;
        }
        
        const ringSize = maxDistance / CONFIG.SCORE_NUM_RINGS;
        
        ctx.lineWidth = CONFIG.SCORE_RING_WIDTH;
        ctx.globalAlpha = CONFIG.SCORE_RING_OPACITY;
        
        state.candidates.forEach(candidate => {
            ctx.strokeStyle = candidate.color;
            
            // Draw 5 concentric rings
            for (let i = 1; i <= CONFIG.SCORE_NUM_RINGS; i++) {
                ctx.beginPath();
                ctx.arc(candidate.x, candidate.y, ringSize * i, 0, Math.PI * 2);
                ctx.stroke();
            }
        });
        
        ctx.globalAlpha = 1.0;
    }
    
    // Render method-specific overlays
    function renderMethodSpecificOverlays() {
        const state = State.getState();
        
        switch (state.votingMethod) {
            case 'approval':
                renderApprovalCircles();
                break;
            
            case 'star':
                if (state.displayStarRanges) {
                    renderScoreRings(state.starMaxDistance, true);
                }
                break;
            
            case 'score':
                if (state.displayScoreRanges) {
                    renderScoreRings(state.scoreMaxDistance, true);
                }
                break;
        }
    }
    
    // Render Mode 1 (One Election, Multiple Distributions)
    function renderMode1() {
        const state = State.getState();
        
        // 1. Clear and draw background
        clearCanvas();
        renderBackground();
        
        // 2. Render method-specific overlays (approval circles, score rings)
        renderMethodSpecificOverlays();
        
        // 3. Render voters
        if (state.distributions.length > 0) {
            Distributions.renderVoters(ctx, state.distributions);
        }
        
        // 4. Render distribution centers
        Distributions.renderDistributionCenters(
            ctx,
            state.distributions,
            state.draggedItem,
            state.hoveredItem
        );
        
        // 5. Render candidates (pass election results for eliminated candidate styling)
        Candidates.renderCandidates(
            ctx,
            state.candidates,
            state.draggedItem,
            state.hoveredItem,
            state.electionResults,  // ADD THIS
            state.selectedRound     // ADD THIS
        );
    }
    
    // Render Mode 2 (Multiple Elections, One Distribution)
    function renderMode2() {
        const state = State.getState();
        
        // 1. Clear and draw background
        clearCanvas();
        renderBackground();
        
        // 2. Render winner map if available
        if (state.winnerMap) {
            WinnerMap.renderWinnerMap(ctx, state.winnerMap);
        }
        
        // 3. Render candidates (no voters or distributions in Mode 2)
        Candidates.renderCandidates(
            ctx,
            state.candidates,
            state.draggedItem,
            state.hoveredItem
        );
    }
    
    // Main render function - orchestrates rendering based on mode
    function render() {
        const state = State.getState();
        
        if (!canvas || !ctx) {
            console.error('Canvas not initialized');
            return;
        }
        
        if (state.mode === 'one-election') {
            renderMode1();
        } else if (state.mode === 'multiple-elections') {
            renderMode2();
        }
    }
    
    // Render with animation frame (for smooth updates)
    function renderAnimated() {
        requestAnimationFrame(render);
    }
    
    // Public API
    return {
        initialize,
        getCanvas,
        getContext,
        clearCanvas,
        renderBackground,
        renderApprovalCircles,
        renderScoreRings,
        renderMethodSpecificOverlays,
        renderMode1,
        renderMode2,
        render,
        renderAnimated
    };
})();

// Make Rendering globally available
if (typeof window !== 'undefined') {
    window.Rendering = Rendering;
}