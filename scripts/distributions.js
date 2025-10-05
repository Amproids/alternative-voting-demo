// distributions.js
// Voter distribution generation and rendering

const Distributions = (function() {
    'use strict';
    
    // Initialize distributions with default positions
    function initializeDistributions(count) {
        const positions = CONFIG.getDistributionDefaultPositions(count);
        const distributions = [];
        
        for (let i = 0; i < count; i++) {
            distributions.push({
                id: i,
                centerX: positions[i].x,
                centerY: positions[i].y,
                spreadRadius: CONFIG.DEFAULT_SPREAD_RADIUS,
                voterCount: CONFIG.DEFAULT_VOTER_COUNT,
                voters: [],
                offsets: null
            });
        }
        
        return distributions;
    }
    
    // Generate Gaussian offsets for a distribution (persistent)
    function generateOffsets(distribution) {
        distribution.offsets = Utils.generateGaussianOffsets(distribution.voterCount);
        State.saveState();
    }
    
    // Ensure offsets exist for a distribution, generate if missing
    function ensureOffsetsExist(distribution) {
        if (!distribution.offsets || distribution.offsets.length !== distribution.voterCount) {
            generateOffsets(distribution);
        }
    }
    
    // Generate voters for a single distribution
    function generateDistribution(distribution) {
        distribution.voters = Utils.generateGaussianPoints(
            distribution.centerX,
            distribution.centerY,
            distribution.spreadRadius,
            distribution.voterCount
        );
    }
    
    // Generate voters for all distributions
    function generateAllDistributions(distributions) {
        distributions.forEach(distribution => {
            generateDistribution(distribution);
        });
    }
    
    // Get all voters from all distributions combined
    function getAllVoters(distributions) {
        const allVoters = [];
        
        distributions.forEach(distribution => {
            allVoters.push(...distribution.voters);
        });
        
        return allVoters;
    }
    
    // Check if a point is within hit detection range of a distribution center
    function getDistributionAt(x, y, distributions) {
        for (let i = distributions.length - 1; i >= 0; i--) {
            const distribution = distributions[i];
            const dist = Utils.distance(x, y, distribution.centerX, distribution.centerY);
            
            if (dist <= CONFIG.DISTRIBUTION_HIT_RADIUS) {
                return distribution;
            }
        }
        
        return null;
    }
    
    // Move a distribution center to a new position
    function moveDistributionTo(distributionId, x, y) {
        const state = State.getState();
        const distribution = state.distributions.find(d => d.id === distributionId);
        
        if (!distribution) {
            return;
        }
        
        // Calculate how much the center moved
        const deltaX = x - distribution.centerX;
        const deltaY = y - distribution.centerY;
        
        // Update center position (clamped to canvas)
        distribution.centerX = Utils.clamp(x, CONFIG.CANVAS_MARGIN, CONFIG.CANVAS_WIDTH - CONFIG.CANVAS_MARGIN);
        distribution.centerY = Utils.clamp(y, CONFIG.CANVAS_MARGIN, CONFIG.CANVAS_HEIGHT - CONFIG.CANVAS_MARGIN);
        
        // Update all voter positions based on their stored offsets
        distribution.voters.forEach(voter => {
            const newX = distribution.centerX + voter.offsetX;
            const newY = distribution.centerY + voter.offsetY;
            
            // Clamp display position
            voter.x = Utils.clamp(newX, CONFIG.CANVAS_MARGIN, CONFIG.CANVAS_WIDTH - CONFIG.CANVAS_MARGIN);
            voter.y = Utils.clamp(newY, CONFIG.CANVAS_MARGIN, CONFIG.CANVAS_HEIGHT - CONFIG.CANVAS_MARGIN);
        });
        
        State.saveState();
    }
    
    // Render distribution centers
    function renderDistributionCenters(ctx, distributions, draggedItem, hoveredItem) {
        distributions.forEach(distribution => {
            const isDragged = draggedItem && draggedItem.type === 'distribution' && draggedItem.id === distribution.id;
            const isHovered = hoveredItem && hoveredItem.type === 'distribution' && hoveredItem.id === distribution.id;
            
            // Draw halo if dragged or hovered
            if (isDragged || isHovered) {
                ctx.fillStyle = CONFIG.DISTRIBUTION_DRAG_HALO_COLOR;
                ctx.beginPath();
                ctx.arc(distribution.centerX, distribution.centerY, CONFIG.DISTRIBUTION_DRAG_HALO_RADIUS, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Draw center marker circle
            ctx.fillStyle = CONFIG.DISTRIBUTION_CENTER_FILL;
            ctx.strokeStyle = CONFIG.DISTRIBUTION_CENTER_BORDER_COLOR;
            ctx.lineWidth = CONFIG.DISTRIBUTION_CENTER_BORDER_WIDTH;
            ctx.beginPath();
            ctx.arc(distribution.centerX, distribution.centerY, CONFIG.DISTRIBUTION_CENTER_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Draw label (distribution number)
            ctx.fillStyle = CONFIG.DISTRIBUTION_CENTER_LABEL_COLOR;
            ctx.font = CONFIG.DISTRIBUTION_CENTER_LABEL_FONT;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText((distribution.id + 1).toString(), distribution.centerX, distribution.centerY);
        });
    }
    
    // Render all voters as dots
    function renderVoters(ctx, distributions) {
        distributions.forEach(distribution => {
            distribution.voters.forEach(voter => {
                // Draw voter dot
                ctx.fillStyle = voter.voteColor;
                ctx.strokeStyle = CONFIG.CANDIDATE_BORDER_COLOR;
                ctx.lineWidth = CONFIG.VOTER_BORDER_WIDTH;
                ctx.beginPath();
                ctx.arc(voter.x, voter.y, CONFIG.VOTER_RADIUS, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });
        });
    }
    
    // Render distribution boundaries (optional debug/visualization)
    function renderDistributionCircles(ctx, distributions) {
        distributions.forEach(distribution => {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(distribution.centerX, distribution.centerY, distribution.spreadRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        });
    }
    
    // Update distribution count (add or remove distributions)
    function updateDistributionCount(newCount) {
        const state = State.getState();
        const currentCount = state.distributions.length;
        
        if (newCount === currentCount) {
            return;
        }
        
        if (newCount > currentCount) {
            // Add new distributions
            const defaultPositions = CONFIG.getDistributionDefaultPositions(newCount);
            for (let i = currentCount; i < newCount; i++) {
                state.distributions.push({
                    id: i,
                    centerX: defaultPositions[i].x,
                    centerY: defaultPositions[i].y,
                    spreadRadius: CONFIG.DEFAULT_SPREAD_RADIUS,
                    voterCount: CONFIG.DEFAULT_VOTER_COUNT,
                    voters: [],
                    offsets: null
                });
            }
        } else {
            // Remove distributions
            state.distributions = state.distributions.slice(0, newCount);
        }
        
        State.updateState({
            numDistributions: newCount,
            distributions: state.distributions
        });
    }
    
    // Update distribution parameters (spread radius or voter count)
    function updateDistributionParams(distributionId, params) {
        const state = State.getState();
        const distribution = state.distributions.find(d => d.id === distributionId);
        
        if (!distribution) {
            return;
        }
        
        let needsRegeneration = false;
        
        if (params.spreadRadius !== undefined && params.spreadRadius !== distribution.spreadRadius) {
            distribution.spreadRadius = params.spreadRadius;
            needsRegeneration = true;
        }
        
        if (params.voterCount !== undefined && params.voterCount !== distribution.voterCount) {
            distribution.voterCount = params.voterCount;
            // Clear offsets when voter count changes - they need to be regenerated
            distribution.offsets = null;
            needsRegeneration = true;
        }
        
        if (needsRegeneration) {
            generateDistribution(distribution);
        }
        
        State.saveState();
    }
    
    // Reset all distributions to default positions
    function resetPositions() {
        const state = State.getState();
        const defaultPositions = CONFIG.getDistributionDefaultPositions(state.numDistributions);
        
        state.distributions.forEach((distribution, index) => {
            distribution.centerX = defaultPositions[index].x;
            distribution.centerY = defaultPositions[index].y;
            
            // Regenerate voters at new position
            generateDistribution(distribution);
        });
        
        State.saveState();
    }
    
    // Public API
    return {
        initializeDistributions,
        generateOffsets,
        ensureOffsetsExist,
        generateDistribution,
        generateAllDistributions,
        getAllVoters,
        getDistributionAt,
        moveDistributionTo,
        renderDistributionCenters,
        renderVoters,
        renderDistributionCircles,
        updateDistributionCount,
        updateDistributionParams,
        resetPositions
    };
})();

// Make Distributions globally available
if (typeof window !== 'undefined') {
    window.Distributions = Distributions;
}