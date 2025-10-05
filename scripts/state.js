// state.js
// Application state management and persistence

const State = (function() {
    'use strict';
    
    // Private state object
    let state = {
        // Current mode
        mode: CONFIG.DEFAULT_MODE, // 'one-election' or 'multiple-elections'
        
        // Voting method
        votingMethod: CONFIG.DEFAULT_VOTING_METHOD,
        
        // Candidates
        numCandidates: CONFIG.DEFAULT_CANDIDATES,
        candidates: [], // Array of {id, x, y, color, name}
        
        // Distributions (for Mode 1)
        numDistributions: CONFIG.DEFAULT_DISTRIBUTIONS,
        distributions: [], // Array of {id, centerX, centerY, spreadRadius, voterCount, voters, offsets}
        
        // Method-specific settings
        approvalRadius: CONFIG.DEFAULT_APPROVAL_RADIUS,
        approvalStrategy: CONFIG.DEFAULT_APPROVAL_STRATEGY,
        starMaxDistance: CONFIG.DEFAULT_STAR_MAX_DISTANCE,
        displayStarRanges: CONFIG.DEFAULT_DISPLAY_STAR_RANGES,
        scoreMaxDistance: CONFIG.DEFAULT_SCORE_MAX_DISTANCE,
        displayScoreRanges: CONFIG.DEFAULT_DISPLAY_SCORE_RANGES,
        
        // Round selection for multi-round methods
        selectedRound: 0,
        
        // UI state
        draggedItem: null, // {type: 'candidate'|'distribution', id: number}
        hoveredItem: null,
        
        // Election results
        electionResults: null,
        
        // Winner map (for Mode 2)
        winnerMap: null,
        winnerMapCache: null,
        
        // Winner map cache metadata (for validation)
        winnerMapCandidateSnapshot: null, // Array of {id, x, y}
        winnerMapMethodSnapshot: null // {method, params}
    };
    
    // Change listeners
    const listeners = [];
    
    // Initialize state with defaults
    function initialize() {
        // Try to load from localStorage first
        const loaded = loadState();
        
        if (!loaded) {
            // No saved state, use defaults
            resetToDefaults();
        }
        
        return state;
    }
    
    // Get current state (returns a copy to prevent direct mutation)
    function getState() {
        return state;
    }
    
    // Update state with new values
    function updateState(updates) {
        // Merge updates into state
        Object.assign(state, updates);
        
        // Save to localStorage
        saveState();
        
        // Notify all listeners
        notifyListeners();
    }
    
    // Add a change listener
    function addListener(callback) {
        listeners.push(callback);
    }
    
    // Remove a change listener
    function removeListener(callback) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }
    
    // Notify all listeners of state change
    function notifyListeners() {
        listeners.forEach(callback => callback(state));
    }
    
    // Reset candidate positions to defaults
    function resetCandidatePositions() {
        const defaultPositions = CONFIG.getCandidateDefaultPositions(state.numCandidates);
        
        state.candidates.forEach((candidate, index) => {
            candidate.x = defaultPositions[index].x;
            candidate.y = defaultPositions[index].y;
        });
        
        saveState();
        notifyListeners();
    }
    
    // Reset distribution positions to defaults
    function resetDistributionPositions() {
        const defaultPositions = CONFIG.getDistributionDefaultPositions(state.numDistributions);
        
        state.distributions.forEach((distribution, index) => {
            distribution.centerX = defaultPositions[index].x;
            distribution.centerY = defaultPositions[index].y;
        });
        
        saveState();
        notifyListeners();
    }
    
    // Reset entire state to defaults
    function resetToDefaults() {
        state.mode = CONFIG.DEFAULT_MODE;
        state.votingMethod = CONFIG.DEFAULT_VOTING_METHOD;
        state.numCandidates = CONFIG.DEFAULT_CANDIDATES;
        state.numDistributions = CONFIG.DEFAULT_DISTRIBUTIONS;
        
        // Initialize candidates with default positions
        const candidatePositions = CONFIG.getCandidateDefaultPositions(CONFIG.DEFAULT_CANDIDATES);
        state.candidates = candidatePositions.map((pos, index) => ({
            id: index,
            x: pos.x,
            y: pos.y,
            color: CONFIG.CANDIDATE_COLORS[index],
            name: CONFIG.CANDIDATE_NAMES[index]
        }));
        
        // Initialize distributions with default positions
        const distributionPositions = CONFIG.getDistributionDefaultPositions(CONFIG.DEFAULT_DISTRIBUTIONS);
        state.distributions = distributionPositions.map((pos, index) => ({
            id: index,
            centerX: pos.x,
            centerY: pos.y,
            spreadRadius: CONFIG.DEFAULT_SPREAD_RADIUS,
            voterCount: CONFIG.DEFAULT_VOTER_COUNT,
            voters: [],
            offsets: null
        }));
        
        // Reset method-specific settings
        state.approvalRadius = CONFIG.DEFAULT_APPROVAL_RADIUS;
        state.approvalStrategy = CONFIG.DEFAULT_APPROVAL_STRATEGY;
        state.starMaxDistance = CONFIG.DEFAULT_STAR_MAX_DISTANCE;
        state.displayStarRanges = CONFIG.DEFAULT_DISPLAY_STAR_RANGES;
        state.scoreMaxDistance = CONFIG.DEFAULT_SCORE_MAX_DISTANCE;
        state.displayScoreRanges = CONFIG.DEFAULT_DISPLAY_SCORE_RANGES;
        
        // Reset UI state
        state.selectedRound = 0;
        state.draggedItem = null;
        state.hoveredItem = null;
        state.electionResults = null;
        state.winnerMap = null;
        state.winnerMapCache = null;
        
        // Reset cache metadata
        state.winnerMapCandidateSnapshot = null;
        state.winnerMapMethodSnapshot = null;
        
        saveState();
        notifyListeners();
    }
    
    // Save state to localStorage
    function saveState() {
        try {
            // Create a serializable copy (exclude voters array if too large)
            const stateToSave = {
                mode: state.mode,
                votingMethod: state.votingMethod,
                numCandidates: state.numCandidates,
                candidates: state.candidates,
                numDistributions: state.numDistributions,
                distributions: state.distributions.map(d => ({
                    id: d.id,
                    centerX: d.centerX,
                    centerY: d.centerY,
                    spreadRadius: d.spreadRadius,
                    voterCount: d.voterCount,
                    offsets: d.offsets
                })),
                approvalRadius: state.approvalRadius,
                approvalStrategy: state.approvalStrategy,
                starMaxDistance: state.starMaxDistance,
                displayStarRanges: state.displayStarRanges,
                scoreMaxDistance: state.scoreMaxDistance,
                displayScoreRanges: state.displayScoreRanges
            };
            
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (e) {
            console.warn('Failed to save state to localStorage:', e);
            // Graceful degradation - continue without persistence
        }
    }
    
    // Load state from localStorage
    function loadState() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
            
            if (!saved) {
                return false;
            }
            
            const parsed = JSON.parse(saved);
            
            // Validate and restore state
            state.mode = parsed.mode || CONFIG.DEFAULT_MODE;
            state.votingMethod = parsed.votingMethod || CONFIG.DEFAULT_VOTING_METHOD;
            state.numCandidates = parsed.numCandidates || CONFIG.DEFAULT_CANDIDATES;
            state.candidates = parsed.candidates || [];
            state.numDistributions = parsed.numDistributions || CONFIG.DEFAULT_DISTRIBUTIONS;
            
            // Restore distributions (voters will be regenerated)
            state.distributions = (parsed.distributions || []).map(d => ({
                ...d,
                voters: [],
                offsets: d.offsets || null
            }));
            
            // Restore method-specific settings
            state.approvalRadius = parsed.approvalRadius !== undefined ? parsed.approvalRadius : CONFIG.DEFAULT_APPROVAL_RADIUS;
            state.approvalStrategy = parsed.approvalStrategy || CONFIG.DEFAULT_APPROVAL_STRATEGY;
            state.starMaxDistance = parsed.starMaxDistance !== undefined ? parsed.starMaxDistance : CONFIG.DEFAULT_STAR_MAX_DISTANCE;
            state.displayStarRanges = parsed.displayStarRanges !== undefined ? parsed.displayStarRanges : CONFIG.DEFAULT_DISPLAY_STAR_RANGES;
            state.scoreMaxDistance = parsed.scoreMaxDistance !== undefined ? parsed.scoreMaxDistance : CONFIG.DEFAULT_SCORE_MAX_DISTANCE;
            state.displayScoreRanges = parsed.displayScoreRanges !== undefined ? parsed.displayScoreRanges : CONFIG.DEFAULT_DISPLAY_SCORE_RANGES;
            
            return true;
        } catch (e) {
            console.warn('Failed to load state from localStorage:', e);
            return false;
        }
    }
    
    // Clear saved state from localStorage
    function clearStorage() {
        try {
            localStorage.removeItem(CONFIG.STORAGE_KEY);
        } catch (e) {
            console.warn('Failed to clear localStorage:', e);
        }
    }
    
    // Public API
    return {
        initialize,
        getState,
        updateState,
        addListener,
        removeListener,
        resetCandidatePositions,
        resetDistributionPositions,
        resetToDefaults,
        saveState,
        loadState,
        clearStorage
    };
})();

// Make State globally available
if (typeof window !== 'undefined') {
    window.State = State;
}