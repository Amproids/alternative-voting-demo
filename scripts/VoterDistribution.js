// VoterDistribution.js
// Manages voter generation and distribution management

class VoterDistribution {
    constructor(config = {}) {
        this.canvasSize = config.canvasSize || 600;
        this.maxDistributions = config.maxDistributions || 6;
        this.distributionColors = config.distributionColors || ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#EEEEEE'];
        
        // Default distribution for multiple-elections mode (invisible)
        this.defaultDistribution = null;
        
        // Multiple distributions for one-election mode
        this.distributions = [];
        
        this.init();
    }

    init() {
        this.initializeDefaultDistribution();
        this.initializeDistributions();
    }

    initializeDefaultDistribution() {
        // Create default distribution for multiple-elections mode (invisible)
        this.defaultDistribution = {
            centerX: this.canvasSize / 2,
            centerY: this.canvasSize / 2,
            radius: 200,
            voterCount: 2000,
            voters: []
        };
        
        this.generateVotersForDistribution(this.defaultDistribution);
    }

    initializeDistributions() {
        if (this.distributions.length === 0) {
            // Create default distributions in different positions
            const center = this.canvasSize / 2;
            const offset = 80;
            
            const defaultPositions = [
                { x: center, y: center },
                { x: center - offset, y: center - offset },
                { x: center + offset, y: center - offset },
                { x: center - offset, y: center + offset },
                { x: center + offset, y: center + offset },
                { x: center, y: center - offset * 1.5 }
            ];
            
            for (let i = 0; i < this.maxDistributions; i++) {
                this.distributions.push({
                    id: i,
                    centerX: defaultPositions[i].x,
                    centerY: defaultPositions[i].y,
                    voters: [],
                    radius: 200,
                    voterCount: 1000,
                    color: this.distributionColors[i],
                    label: (i + 1).toString()
                });
            }
        }
        
        // Generate voters for all distributions
        for (let i = 0; i < this.maxDistributions; i++) {
            this.generateVotersForDistribution(this.distributions[i]);
        }
    }

    generateVotersForDistribution(distribution) {
        distribution.voters = [];
        
        for (let i = 0; i < distribution.voterCount; i++) {
            // Box-Muller transform for normal distribution
            const u1 = Math.random();
            const u2 = Math.random();
            const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
            
            // Store the original offset (not clamped)
            const offsetX = z0 * distribution.radius / 3;
            const offsetY = z1 * distribution.radius / 3;
            
            // Calculate initial position (can be outside canvas bounds)
            const voterX = distribution.centerX + offsetX;
            const voterY = distribution.centerY + offsetY;
            
            // Only clamp for display purposes
            const clampedX = Math.max(2, Math.min(this.canvasSize - 2, voterX));
            const clampedY = Math.max(2, Math.min(this.canvasSize - 2, voterY));
            
            distribution.voters.push({
                x: clampedX,
                y: clampedY,
                offsetX: offsetX, // Store original offset, not clamped
                offsetY: offsetY,
                preferredCandidate: null, // Will be calculated during election
                voteColor: distribution.color // Default color, will change based on preference
            });
        }
    }

    updateDistributionVoters(distribution) {
        // Update voter positions when distribution center moves
        distribution.voters.forEach(voter => {
            voter.x = distribution.centerX + voter.offsetX;
            voter.y = distribution.centerY + voter.offsetY;
            voter.x = Math.max(2, Math.min(this.canvasSize - 2, voter.x));
            voter.y = Math.max(2, Math.min(this.canvasSize - 2, voter.y));
        });
    }

    regenerateDistributionVoters(distributionIndex) {
        if (distributionIndex >= 0 && distributionIndex < this.distributions.length) {
            this.generateVotersForDistribution(this.distributions[distributionIndex]);
        }
    }

    regenerateAllVoters(numDistributions) {
        // Regenerate voters for active distributions
        for (let i = 0; i < numDistributions && i < this.distributions.length; i++) {
            this.generateVotersForDistribution(this.distributions[i]);
        }
    }

    updateDistributionRadius(distributionIndex, radius) {
        if (distributionIndex >= 0 && distributionIndex < this.distributions.length) {
            this.distributions[distributionIndex].radius = radius;
            this.generateVotersForDistribution(this.distributions[distributionIndex]);
        }
    }

    updateDistributionVoterCount(distributionIndex, voterCount) {
        if (distributionIndex >= 0 && distributionIndex < this.distributions.length) {
            this.distributions[distributionIndex].voterCount = voterCount;
            this.generateVotersForDistribution(this.distributions[distributionIndex]);
        }
    }

    getAllVoters(numDistributions) {
        // Get all voters from active distributions
        const allVoters = [];
        for (let i = 0; i < numDistributions && i < this.distributions.length; i++) {
            allVoters.push(...this.distributions[i].voters);
        }
        return allVoters;
    }

    resetDistributions() {
        // Reset to default positions and settings
        const center = this.canvasSize / 2;
        const offset = 80;
        
        const defaultPositions = [
            { x: center, y: center },
            { x: center - offset, y: center - offset },
            { x: center + offset, y: center - offset },
            { x: center - offset, y: center + offset },
            { x: center + offset, y: center + offset },
            { x: center, y: center - offset * 1.5 }
        ];
        
        for (let i = 0; i < this.distributions.length; i++) {
            this.distributions[i].centerX = defaultPositions[i].x;
            this.distributions[i].centerY = defaultPositions[i].y;
            this.distributions[i].radius = 200;
            this.distributions[i].voterCount = 1000;
            this.generateVotersForDistribution(this.distributions[i]);
        }
        
        // Regenerate default distribution
        this.defaultDistribution.centerX = this.canvasSize / 2;
        this.defaultDistribution.centerY = this.canvasSize / 2;
        this.defaultDistribution.radius = 200;
        this.defaultDistribution.voterCount = 2000;
        this.generateVotersForDistribution(this.defaultDistribution);
    }

    // Getters
    getDistributions() {
        return this.distributions;
    }

    getDefaultDistribution() {
        return this.defaultDistribution;
    }

    getDistribution(index) {
        if (index >= 0 && index < this.distributions.length) {
            return this.distributions[index];
        }
        return null;
    }

    // Setters for loading from storage
    setDistributionState(index, state) {
        if (index >= 0 && index < this.distributions.length) {
            this.distributions[index].centerX = state.centerX;
            this.distributions[index].centerY = state.centerY;
            this.distributions[index].radius = state.radius;
            this.distributions[index].voterCount = state.voterCount;
            this.generateVotersForDistribution(this.distributions[index]);
        }
    }

    getDistributionState() {
        return this.distributions.map(d => ({
            id: d.id,
            centerX: d.centerX,
            centerY: d.centerY,
            radius: d.radius,
            voterCount: d.voterCount,
            color: d.color,
            label: d.label
        }));
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoterDistribution;
}