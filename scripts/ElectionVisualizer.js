// ElectionVisualizer.js
// Main orchestrator - ties all modules together

class ElectionVisualizer {
    constructor() {
        // Configuration
        this.canvasSize = 600;
        this.candidateColors = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#00FFFF', '#FF00FF'];
        this.distributionColors = ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#EEEEEE'];
        this.maxDistributions = 6;
        this.candidateSpreadRadius = 150;
        
        // State
        this.currentMode = 'multiple-elections-one-distribution';
        this.currentVotingMethod = 'plurality';
        this.numCandidates = 2;
        this.numDistributions = 1;
        this.candidates = [];
        this.electionResults = null;
        
        // Approval voting settings
        this.approvalRadius = 150;
        this.isStrategicVoting = true; // true = strategic, false = honest
        
        // Initialize modules
        this.initializeModules();
        
        // Start the application
        this.init();
    }

    initializeModules() {
        const config = {
            canvasSize: this.canvasSize,
            candidateColors: this.candidateColors,
            distributionColors: this.distributionColors,
            maxDistributions: this.maxDistributions,
            storageKey: 'electionVisualizerData'
        };

        // Create module instances
        this.renderer = new CanvasRenderer('electionCanvas', config);
        this.ui = new UIController(config);
        this.voterDistribution = new VoterDistribution(config);
        this.votingMethods = new VotingMethods(config);
        this.storage = new StorageManager(config);
        this.dragHandler = new DragHandler(this.renderer.getCanvas(), config);
        
        // Set up callbacks
        this.setupCallbacks();
    }

    setupCallbacks() {
        // UI Controller callbacks
        this.ui.onModeChange = (mode) => this.handleModeChange(mode);
        this.ui.onVotingMethodChange = (method) => this.handleVotingMethodChange(method);
        this.ui.onCandidateCountChange = (count) => this.handleCandidateCountChange(count);
        this.ui.onDistributionCountChange = (count) => this.handleDistributionCountChange(count);
        this.ui.onDistributionRadiusChange = (index, radius) => this.handleDistributionRadiusChange(index, radius);
        this.ui.onDistributionVotersChange = (index, count) => this.handleDistributionVotersChange(index, count);
        this.ui.onApprovalRadiusChange = (radius) => this.handleApprovalRadiusChange(radius);
        this.ui.onVotingStrategyChange = (isStrategic) => this.handleVotingStrategyChange(isStrategic);
        this.ui.onResetClick = () => this.handleReset();

        // Drag Handler callbacks
        this.dragHandler.getState = () => this.getState();
        this.dragHandler.onDragStart = (type, item) => this.handleDragStart(type, item);
        this.dragHandler.onDragMove = (type, item) => this.handleDragMove(type, item);
        this.dragHandler.onDragEnd = (type, item) => this.handleDragEnd(type, item);
    }

    init() {
        // Load saved state
        this.loadState();
        
        // Initialize UI
        this.ui.init();
        
        // Generate candidates
        this.generateCandidates();
        
        // Set initial mode
        this.updateMode();
        
        // Calculate election if needed
        this.calculateElectionIfNeeded();
        
        // Initial draw
        this.draw();
    }

    // State Management
    getState() {
        return {
            currentMode: this.currentMode,
            currentVotingMethod: this.currentVotingMethod,
            numCandidates: this.numCandidates,
            numDistributions: this.numDistributions,
            candidates: this.candidates,
            distributions: this.voterDistribution.getDistributions(),
            draggedCandidate: this.dragHandler.getDraggedCandidate(),
            draggedDistribution: this.dragHandler.getDraggedDistribution(),
            shouldCalculateElection: this.shouldCalculateElection(),
            electionResults: this.electionResults,
            approvalRadius: this.approvalRadius,
            isStrategicVoting: this.isStrategicVoting
        };
    }

    saveState() {
        const state = {
            currentMode: this.currentMode,
            currentVotingMethod: this.currentVotingMethod,
            numCandidates: this.numCandidates,
            numDistributions: this.numDistributions,
            candidates: this.candidates,
            distributions: this.voterDistribution.getDistributionState(),
            approvalRadius: this.approvalRadius,
            isStrategicVoting: this.isStrategicVoting
        };
        
        this.storage.save(state);
    }

    loadState() {
        const savedState = this.storage.load();
        
        if (savedState) {
            this.currentMode = savedState.currentMode || this.currentMode;
            this.currentVotingMethod = savedState.currentVotingMethod || this.currentVotingMethod;
            this.numCandidates = savedState.numCandidates || this.numCandidates;
            this.numDistributions = savedState.numDistributions || this.numDistributions;
            this.approvalRadius = savedState.approvalRadius || this.approvalRadius;
            this.isStrategicVoting = savedState.isStrategicVoting !== undefined ? savedState.isStrategicVoting : this.isStrategicVoting;
            
            // Restore distribution states
            if (savedState.distributions) {
                savedState.distributions.forEach((dist, index) => {
                    this.voterDistribution.setDistributionState(index, dist);
                });
            }
            
            // Restore candidates after they're generated
            this.savedCandidates = savedState.candidates;
            
            // Update UI to reflect loaded state
            this.ui.updateSliderValues({
                numCandidates: this.numCandidates,
                numDistributions: this.numDistributions,
                currentVotingMethod: this.currentVotingMethod,
                approvalRadius: this.approvalRadius,
                isStrategicVoting: this.isStrategicVoting
            });
        }
    }

    // Candidate Management
    generateCandidates() {
        if (this.candidates.length === 0) {
            const center = this.canvasSize / 2;
            const radius = this.candidateSpreadRadius;
            
            const positions = [
                { x: center + radius, y: center },
                { x: center - radius, y: center },
                { x: center - radius / 2, y: center - radius * 0.86 },
                { x: center + radius / 2, y: center + radius * 0.86 },
                { x: center - radius / 2, y: center + radius * 0.86 },
                { x: center + radius / 2, y: center - radius * 0.86 }
            ];
            
            for (let i = 0; i < 6; i++) {
                this.candidates.push({
                    x: positions[i].x,
                    y: positions[i].y,
                    color: this.candidateColors[i],
                    id: i
                });
            }
        }
        
        // Restore saved candidate positions if available
        if (this.savedCandidates) {
            this.savedCandidates.forEach(savedCandidate => {
                if (savedCandidate.id < this.candidates.length) {
                    this.candidates[savedCandidate.id].x = savedCandidate.x;
                    this.candidates[savedCandidate.id].y = savedCandidate.y;
                }
            });
            this.savedCandidates = null;
        }
        
        this.saveState();
    }

    // Election Management
    shouldCalculateElection() {
        return this.currentMode === 'one-election-multiple-distributions' && 
               (this.currentVotingMethod === 'plurality' || this.currentVotingMethod === 'approval');
    }

    calculateElectionIfNeeded() {
        if (this.shouldCalculateElection()) {
            const voters = this.voterDistribution.getAllVoters(this.numDistributions);
            
            if (this.currentVotingMethod === 'plurality') {
                this.electionResults = this.votingMethods.calculatePlurality(
                    voters, 
                    this.candidates, 
                    this.numCandidates
                );
                this.ui.displayPluralityResults(this.electionResults, this.numCandidates);
            } else if (this.currentVotingMethod === 'approval') {
                this.electionResults = this.votingMethods.calculateApproval(
                    voters,
                    this.candidates,
                    this.numCandidates,
                    this.approvalRadius,
                    this.isStrategicVoting
                );
                this.ui.displayApprovalResults(this.electionResults, this.numCandidates);
            }
            // TODO: Add other voting methods when implemented
        } else {
            this.clearElectionResults();
        }
    }

    clearElectionResults() {
        this.ui.clearElectionResults();
        this.electionResults = null;
        
        // Reset voter colors if in one-election mode
        if (this.currentMode === 'one-election-multiple-distributions') {
            const distributions = this.voterDistribution.getDistributions();
            for (let i = 0; i < this.numDistributions; i++) {
                const dist = distributions[i];
                dist.voters.forEach(voter => {
                    voter.voteColor = this.distributionColors[0];
                    voter.preferredCandidate = null;
                });
            }
        }
    }

    // Event Handlers
    handleModeChange(mode) {
        this.currentMode = mode;
        this.updateMode();
        this.calculateElectionIfNeeded();
        this.draw();
        this.saveState();
    }

    handleVotingMethodChange(method) {
        this.currentVotingMethod = method;
        this.calculateElectionIfNeeded();
        this.draw();
        this.saveState();
    }

    handleCandidateCountChange(count) {
        this.numCandidates = count;
        this.calculateElectionIfNeeded();
        this.draw();
        this.saveState();
    }

    handleDistributionCountChange(count) {
        this.numDistributions = count;
        this.voterDistribution.regenerateAllVoters(count);
        this.ui.updateDistributionSections(count, this.voterDistribution.getDistributions());
        this.calculateElectionIfNeeded();
        this.draw();
        this.saveState();
    }

    handleDistributionRadiusChange(index, radius) {
        this.voterDistribution.updateDistributionRadius(index, radius);
        this.calculateElectionIfNeeded();
        this.draw();
        this.saveState();
    }

    handleDistributionVotersChange(index, count) {
        this.voterDistribution.updateDistributionVoterCount(index, count);
        this.calculateElectionIfNeeded();
        this.draw();
        this.saveState();
    }

    handleApprovalRadiusChange(radius) {
        this.approvalRadius = radius;
        this.calculateElectionIfNeeded();
        this.draw();
        this.saveState();
    }

    handleVotingStrategyChange(isStrategic) {
        this.isStrategicVoting = isStrategic;
        this.calculateElectionIfNeeded();
        this.draw();
        this.saveState();
    }

    handleDragStart(type, item) {
        // Optional: Add visual feedback when drag starts
    }

    handleDragMove(type, item) {
        if (type === 'distribution') {
            this.voterDistribution.updateDistributionVoters(item);
        }
        this.draw();
    }

    handleDragEnd(type, item) {
        this.calculateElectionIfNeeded();
        this.draw();
        this.saveState();
    }

    handleReset() {
        // Clear storage
        this.storage.clear();
        
        // Reset candidates to default positions
        const center = this.canvasSize / 2;
        const radius = this.candidateSpreadRadius;
        
        const positions = [
            { x: center + radius, y: center },
            { x: center - radius, y: center },
            { x: center - radius / 2, y: center - radius * 0.86 },
            { x: center + radius / 2, y: center + radius * 0.86 },
            { x: center - radius / 2, y: center + radius * 0.86 },
            { x: center + radius / 2, y: center - radius * 0.86 }
        ];
        
        for (let i = 0; i < this.candidates.length; i++) {
            this.candidates[i].x = positions[i].x;
            this.candidates[i].y = positions[i].y;
        }
        
        // Reset distributions
        this.voterDistribution.resetDistributions();
        
        // Update UI
        this.ui.updateDistributionSections(this.numDistributions, this.voterDistribution.getDistributions());
        
        // Recalculate and redraw
        this.calculateElectionIfNeeded();
        this.draw();
        this.saveState();
    }

    // Mode Management
    updateMode() {
        this.ui.updateModeButtons(this.currentMode);
        this.ui.updateModeDisplay(this.currentMode);
        
        if (this.currentMode === 'one-election-multiple-distributions') {
            this.ui.updateDistributionSections(this.numDistributions, this.voterDistribution.getDistributions());
        }
    }

    // Drawing
    draw() {
        this.renderer.draw(this.getState());
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const visualizer = new ElectionVisualizer();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ElectionVisualizer;
}