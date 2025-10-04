// CanvasRenderer.js
// Handles all canvas drawing operations

class CanvasRenderer {
    constructor(canvasId, config = {}) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Configuration
        this.canvasSize = config.canvasSize || 600;
        this.gridSpacing = this.canvasSize / 20;
        this.candidateColors = config.candidateColors || ['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#00FFFF', '#FF00FF'];
        this.distributionColors = config.distributionColors || ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#EEEEEE'];
        
        this.setupCanvas();
    }

    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.canvasSize * dpr;
        this.canvas.height = this.canvasSize * dpr;
        this.canvas.style.width = this.canvasSize + 'px';
        this.canvas.style.height = this.canvasSize + 'px';
        this.ctx.scale(dpr, dpr);
    }

    // Main draw method - orchestrates all drawing
    draw(state) {
        this.drawPoliticalSpace();
        this.drawApprovalCircles(state);
        this.drawScoreRings(state);
        this.drawVoters(state);
        this.drawCandidates(state);
        this.drawCenterPoints(state);
    }

    drawPoliticalSpace() {
        const ctx = this.ctx;
        const size = this.canvasSize;
        const spacing = this.gridSpacing;
        
        ctx.clearRect(0, 0, size, size);
        
        // Draw grid lines
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        
        for (let x = 0; x <= size; x += spacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, size);
            ctx.stroke();
        }
        
        for (let y = 0; y <= size; y += spacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(size, y);
            ctx.stroke();
        }
        
        // Draw main axis lines
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(size / 2, 0);
        ctx.lineTo(size / 2, size);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, size / 2);
        ctx.lineTo(size, size / 2);
        ctx.stroke();
    }

    drawApprovalCircles(state) {
        const ctx = this.ctx;
        const {
            currentMode,
            currentVotingMethod,
            candidates,
            numCandidates,
            approvalRadius
        } = state;

        // Only draw approval circles with approval voting
        if (currentVotingMethod !== 'approval') {
            return;
        }

        // Draw approval radius circle around each active candidate
        candidates.slice(0, numCandidates).forEach(candidate => {
            ctx.strokeStyle = candidate.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(candidate.x, candidate.y, approvalRadius, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.globalAlpha = 1.0; // Reset alpha
        });
    }

    drawScoreRings(state) {
        const ctx = this.ctx;
        const {
            currentMode,
            currentVotingMethod,
            candidates,
            numCandidates,
            starMaxDistance,
            displayStarRanges
        } = state;

        // Only draw score rings with STAR voting and if enabled
        if (currentVotingMethod !== 'star' || !displayStarRanges) {
            return;
        }

        const maxDistance = starMaxDistance || 300;
        const ringSize = maxDistance / 5;

        // Draw 5 concentric rings around each active candidate
        candidates.slice(0, numCandidates).forEach(candidate => {
            ctx.strokeStyle = candidate.color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.3;

            // Draw 5 rings (for scores 5, 4, 3, 2, 1)
            for (let i = 1; i <= 5; i++) {
                ctx.beginPath();
                ctx.arc(candidate.x, candidate.y, ringSize * i, 0, 2 * Math.PI);
                ctx.stroke();
            }

            ctx.globalAlpha = 1.0; // Reset alpha
        });
    }

    drawVoters(state) {
        const ctx = this.ctx;
        const {
            currentMode,
            numDistributions,
            distributions,
            shouldCalculateElection
        } = state;
        
        if (currentMode === 'multiple-elections-one-distribution') {
            // Don't draw voters in multiple elections mode - they're invisible
            return;
        } else {
            // Draw multiple distributions
            for (let i = 0; i < numDistributions; i++) {
                const dist = distributions[i];
                
                dist.voters.forEach(voter => {
                    // Use vote color if election has been calculated, otherwise use uniform color
                    const color = shouldCalculateElection && voter.voteColor ? 
                        voter.voteColor : this.distributionColors[0];
                    
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(voter.x, voter.y, 1.5, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    // Add thin black border for better visibility
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 0.3;
                    ctx.stroke();
                });
            }
        }
    }

    drawCenterPoints(state) {
        const ctx = this.ctx;
        const {
            currentMode,
            numDistributions,
            distributions,
            draggedDistribution
        } = state;
        
        if (currentMode === 'multiple-elections-one-distribution') {
            // Don't draw center point in multiple elections mode
            return;
        } else {
            // Draw multiple distribution centers - all use the same color as distribution 1
            const uniformColor = this.distributionColors[0];
            
            for (let i = 0; i < numDistributions; i++) {
                const dist = distributions[i];
                
                if (draggedDistribution === dist) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.beginPath();
                    ctx.arc(dist.centerX, dist.centerY, 14, 0, 2 * Math.PI);
                    ctx.fill();
                }
                
                ctx.fillStyle = uniformColor;
                ctx.beginPath();
                ctx.arc(dist.centerX, dist.centerY, 10, 0, 2 * Math.PI);
                ctx.fill();
                
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(dist.label, dist.centerX, dist.centerY);
            }
        }
    }

    drawCandidates(state) {
        const ctx = this.ctx;
        const {
            candidates,
            numCandidates,
            draggedCandidate,
            electionResults,
            currentVotingMethod,
            selectedIRVRound,
            selectedSTARRound
        } = state;
        
        // Determine which candidates are eliminated (for IRV)
        let eliminatedCandidates = new Array(numCandidates).fill(false);
        if (currentVotingMethod === 'irv' && electionResults && electionResults.rounds) {
            const round = electionResults.rounds.find(r => r.round === selectedIRVRound);
            if (round && round.activeCandidates) {
                for (let i = 0; i < numCandidates; i++) {
                    eliminatedCandidates[i] = !round.activeCandidates[i];
                }
            }
        }

        // Determine which candidates are not in runoff (for STAR)
        if (currentVotingMethod === 'star' && electionResults && electionResults.topTwo && selectedSTARRound === 2) {
            for (let i = 0; i < numCandidates; i++) {
                if (!electionResults.topTwo.includes(i)) {
                    eliminatedCandidates[i] = true;
                }
            }
        }
        
        candidates.slice(0, numCandidates).forEach((candidate, index) => {
            const isEliminated = eliminatedCandidates[index];
            
            if (candidate === draggedCandidate) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.beginPath();
                ctx.arc(candidate.x, candidate.y, 12, 0, 2 * Math.PI);
                ctx.fill();
            }
            
            // Draw with reduced opacity if eliminated
            if (isEliminated) {
                ctx.globalAlpha = 0.3;
            }
            
            ctx.fillStyle = candidate.color;
            ctx.beginPath();
            ctx.arc(candidate.x, candidate.y, 8, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.strokeStyle = isEliminated ? '#888' : '#000';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Reset alpha
            ctx.globalAlpha = 1.0;
        });
    }

    getCanvas() {
        return this.canvas;
    }

    getCanvasSize() {
        return this.canvasSize;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CanvasRenderer;
}