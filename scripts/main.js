// main.js
// Application initialization and orchestration

const Main = (function() {
    'use strict';
    
    // Initialize the application
    function init() {
        console.log('Initializing Election Visualizer...');
        
        // 1. Setup canvas
        const canvas = document.getElementById('electionCanvas');
        if (!canvas) {
            console.error('Canvas element not found');
            return;
        }
        Rendering.initialize(canvas);
        
        // 2. Initialize or load state
        State.initialize();
        const state = State.getState();
        
        // 3. Initialize candidates if needed
        if (state.candidates.length === 0) {
            state.candidates = Candidates.initializeCandidates(state.numCandidates);
        }
        
        // 4. Initialize distributions if needed
        if (state.distributions.length === 0) {
            state.distributions = Distributions.initializeDistributions(state.numDistributions);
        }
        
        // 5. Generate voters for all distributions (Mode 1)
        if (state.mode === 'one-election') {
            Distributions.generateAllDistributions(state.distributions);
        }
        
        // 6. Setup UI controls and event listeners
        UIControls.setupEventListeners();
        UIControls.updateUIFromState();
        
        // 7. Setup state change listener to trigger re-render
        State.addListener(onStateChange);
        
        // 8. Run initial calculation based on mode
        if (state.mode === 'one-election') {
            triggerElection();
        } else {
            triggerWinnerMapGeneration();
        }
        
        // 9. Initial render
        Rendering.render();
        
        console.log('Election Visualizer initialized successfully');
    }
    
    // Handle state changes
    function onStateChange(state) {
        // State changed, but don't auto-trigger recalculation
        // (that's handled by specific UI actions)
    }
    
    // Trigger election calculation (Mode 1)
    function triggerElection() {
        const state = State.getState();
        
        if (state.mode !== 'one-election') {
            return;
        }
        
        console.log('Running election...');
        
        // Ensure voters are generated
        state.distributions.forEach(distribution => {
            if (!distribution.voters || distribution.voters.length === 0) {
                Distributions.generateDistribution(distribution);
            }
        });

        
        // Run election
        const results = Election.runElection();
        
        // Display results
        if (results) {
            Election.displayResults(results);
        }
        
        // Re-render canvas
        Rendering.render();
    }
    
    // Trigger winner map generation (Mode 2)
    function triggerWinnerMapGeneration() {
        const state = State.getState();
        
        if (state.mode !== 'multiple-elections') {
            return;
        }
        
        console.log('Generating winner map...');
        
        // Show progress message
        const resultsContainer = document.getElementById('results');
        if (resultsContainer) {
            resultsContainer.innerHTML = '<p>Generating winner map...</p>';
        }
        
        // Generate winner map with progress callback
        setTimeout(() => {
            WinnerMap.generateWinnerMap((progress) => {
                if (resultsContainer) {
                    resultsContainer.innerHTML = `<p>Generating winner map... ${Math.round(progress)}%</p>`;
                }
            });
            
            // Clear results message
            if (resultsContainer) {
                resultsContainer.innerHTML = '<p>Winner map generated. Drag candidates to see how territories change.</p>';
            }
            
            // Re-render canvas
            Rendering.render();
        }, 100);
    }
    
    // Public API
    return {
        init,
        triggerElection,
        triggerWinnerMapGeneration
    };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Main.init);
} else {
    Main.init();
}

// Make Main globally available
if (typeof window !== 'undefined') {
    window.Main = Main;
}