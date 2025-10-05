// ui-controls.js
// Handle all UI interactions

const UIControls = (function() {
    'use strict';
    
    // Initialize all event listeners
    function setupEventListeners() {
        setupModeControls();
        setupVotingMethodControls();
        setupCandidateControls();
        setupDistributionControls();
        setupMethodSpecificControls();
        setupResetButton();
        setupCanvasInteractions();
    }
    
    // Setup mode toggle buttons
    function setupModeControls() {
        const oneElectionBtn = document.getElementById('one-election-multiple-distributions');
        const multipleElectionsBtn = document.getElementById('multiple-elections-one-distribution');
        
        if (oneElectionBtn) {
            oneElectionBtn.addEventListener('click', () => switchMode('one-election'));
        }
        
        if (multipleElectionsBtn) {
            multipleElectionsBtn.addEventListener('click', () => switchMode('multiple-elections'));
        }
    }
    
    // Switch between modes
    function switchMode(newMode) {
        const state = State.getState();
        
        if (state.mode === newMode) {
            return;
        }
        
        State.updateState({ mode: newMode });
        
        // Update UI to reflect mode
        updateModeUI(newMode);
        
        // Clear cached data from previous mode
        if (newMode === 'multiple-elections') {
            // Clear election results, will generate winner map
            State.updateState({ electionResults: null });
            WinnerMap.clearCache();
            
            // Trigger winner map generation
            if (window.Main && window.Main.triggerWinnerMapGeneration) {
                window.Main.triggerWinnerMapGeneration();
            }
        } else {
            // Clear winner map, will run election
            WinnerMap.clearCache();
            
            // Ensure voters are generated
            Distributions.generateAllDistributions(state.distributions);
            
            // Trigger election
            if (window.Main && window.Main.triggerElection) {
                window.Main.triggerElection();
            }
        }
        
        // Re-render
        Rendering.render();
    }
    
    // Update UI elements based on mode
    function updateModeUI(mode) {
        const oneElectionBtn = document.getElementById('one-election-multiple-distributions');
        const multipleElectionsBtn = document.getElementById('multiple-elections-one-distribution');
        const oneElectionSection = document.querySelector('.one-election-multiple-distributions-mode');
        const multipleElectionsSection = document.querySelector('.multiple-elections-one-distribution-mode');
        
        if (mode === 'one-election') {
            oneElectionBtn?.classList.add('active');
            multipleElectionsBtn?.classList.remove('active');
            
            if (oneElectionSection) oneElectionSection.style.display = 'block';
            if (multipleElectionsSection) multipleElectionsSection.style.display = 'none';
        } else {
            oneElectionBtn?.classList.remove('active');
            multipleElectionsBtn?.classList.add('active');
            
            if (oneElectionSection) oneElectionSection.style.display = 'none';
            if (multipleElectionsSection) multipleElectionsSection.style.display = 'block';
        }
    }
    
    // Setup voting method radio buttons
    function setupVotingMethodControls() {
        const radioButtons = document.querySelectorAll('input[name="electionType"]');
        
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    changeVotingMethod(e.target.value);
                }
            });
        });
    }
    
    // Change voting method
    function changeVotingMethod(method) {
        State.updateState({ votingMethod: method });
        
        // Show/hide method-specific controls
        showMethodControls(method);
        
        // Clear winner map cache if in Mode 2
        const state = State.getState();
        if (state.mode === 'multiple-elections') {
            WinnerMap.clearCache();
            if (window.Main && window.Main.triggerWinnerMapGeneration) {
                window.Main.triggerWinnerMapGeneration();
            }
        } else {
            // Re-run election
            if (window.Main && window.Main.triggerElection) {
                window.Main.triggerElection();
            }
        }
        
        Rendering.render();
    }
    
    // Show/hide method-specific control sections
    function showMethodControls(method) {
        // Hide all method-specific controls
        document.querySelectorAll('.method-controls').forEach(section => {
            section.style.display = 'none';
        });
        
        // Show controls for selected method
        const controlsMap = {
            'approval': 'approval-controls',
            'star': 'star-controls',
            'score': 'score-controls'
        };
        
        const controlId = controlsMap[method];
        if (controlId) {
            const controlSection = document.getElementById(controlId);
            if (controlSection) {
                controlSection.style.display = 'block';
            }
        }
    }
    
    // Setup candidate count slider
    function setupCandidateControls() {
        const slider = document.getElementById('candidateSlider');
        const valueDisplay = document.getElementById('candidateValue');
        
        if (slider) {
            slider.addEventListener('input', (e) => {
                const count = parseInt(e.target.value);
                if (valueDisplay) {
                    valueDisplay.textContent = count;
                }
            });
            
            slider.addEventListener('change', (e) => {
                const count = parseInt(e.target.value);
                Candidates.updateCandidateCount(count);
                
                // Re-run election or regenerate winner map
                triggerRecalculation();
            });
        }
    }
    
    // Setup distribution controls
    function setupDistributionControls() {
        const distributionSlider = document.getElementById('distributionSlider');
        const distributionValue = document.getElementById('distributionValue');
        
        if (distributionSlider) {
            distributionSlider.addEventListener('input', (e) => {
                const count = parseInt(e.target.value);
                if (distributionValue) {
                    distributionValue.textContent = count;
                }
            });
            
            distributionSlider.addEventListener('change', (e) => {
                const count = parseInt(e.target.value);
                updateDistributionCount(count);
            });
        }
        
        // Setup individual distribution parameter controls
        for (let i = 1; i <= CONFIG.MAX_DISTRIBUTIONS; i++) {
            setupDistributionParamControls(i);
        }
    }
    
    // Update distribution count
    function updateDistributionCount(count) {
        Distributions.updateDistributionCount(count);
        updateDistributionSections(count);
        
        // Generate voters for all distributions
        const state = State.getState();
        Distributions.generateAllDistributions(state.distributions);
        
        // Re-run election
        triggerRecalculation();
    }
    
    // Show/hide distribution sections based on count
    function updateDistributionSections(count) {
        for (let i = 1; i <= CONFIG.MAX_DISTRIBUTIONS; i++) {
            const section = document.getElementById(`distribution-${i}`);
            if (section) {
                section.style.display = i <= count ? 'block' : 'none';
            }
        }
    }
    
    // Setup controls for individual distribution parameters
    function setupDistributionParamControls(distributionNum) {
        const radiusSlider = document.getElementById(`radius-${distributionNum}`);
        const radiusValue = document.getElementById(`radius-value-${distributionNum}`);
        const votersSlider = document.getElementById(`voters-${distributionNum}`);
        const votersValue = document.getElementById(`voters-value-${distributionNum}`);
        
        if (radiusSlider) {
            radiusSlider.addEventListener('input', (e) => {
                if (radiusValue) {
                    radiusValue.textContent = e.target.value;
                }
            });
            
            radiusSlider.addEventListener('change', (e) => {
                const spreadRadius = parseInt(e.target.value);
                Distributions.updateDistributionParams(distributionNum - 1, { spreadRadius });
                triggerRecalculation();
            });
        }
        
        if (votersSlider) {
            votersSlider.addEventListener('input', (e) => {
                if (votersValue) {
                    votersValue.textContent = e.target.value;
                }
            });
            
            votersSlider.addEventListener('change', (e) => {
                const voterCount = parseInt(e.target.value);
                Distributions.updateDistributionParams(distributionNum - 1, { voterCount });
                triggerRecalculation();
            });
        }
    }
    
    // Setup method-specific controls (approval, STAR, score)
    function setupMethodSpecificControls() {
        // Approval controls
        setupApprovalControls();
        
        // STAR controls
        setupStarControls();
        
        // Score controls
        setupScoreControls();
    }
    
    // Setup approval voting controls
    function setupApprovalControls() {
        const radiusSlider = document.getElementById('approvalRadiusSlider');
        const radiusValue = document.getElementById('approvalRadiusValue');
        const strategyRadios = document.querySelectorAll('input[name="votingStrategy"]');
        
        if (radiusSlider) {
            radiusSlider.addEventListener('input', (e) => {
                if (radiusValue) {
                    radiusValue.textContent = e.target.value;
                }
            });
            
            radiusSlider.addEventListener('change', (e) => {
                const radius = parseInt(e.target.value);
                State.updateState({ approvalRadius: radius });
                triggerRecalculation();
            });
        }
        
        strategyRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    State.updateState({ approvalStrategy: e.target.value });
                    triggerRecalculation();
                }
            });
        });
    }
    
    // Setup STAR voting controls
    function setupStarControls() {
        const maxDistanceSlider = document.getElementById('starMaxDistanceSlider');
        const maxDistanceValue = document.getElementById('starMaxDistanceValue');
        const displayRangesCheckbox = document.getElementById('displayStarRanges');
        
        if (maxDistanceSlider) {
            maxDistanceSlider.addEventListener('input', (e) => {
                if (maxDistanceValue) {
                    maxDistanceValue.textContent = e.target.value;
                }
            });
            
            maxDistanceSlider.addEventListener('change', (e) => {
                const maxDistance = parseInt(e.target.value);
                State.updateState({ starMaxDistance: maxDistance });
                triggerRecalculation();
            });
        }
        
        if (displayRangesCheckbox) {
            displayRangesCheckbox.addEventListener('change', (e) => {
                State.updateState({ displayStarRanges: e.target.checked });
                Rendering.render();
            });
        }
    }
    
    // Setup score voting controls
    function setupScoreControls() {
        const maxDistanceSlider = document.getElementById('scoreMaxDistanceSlider');
        const maxDistanceValue = document.getElementById('scoreMaxDistanceValue');
        const displayRangesCheckbox = document.getElementById('displayScoreRanges');
        
        if (maxDistanceSlider) {
            maxDistanceSlider.addEventListener('input', (e) => {
                if (maxDistanceValue) {
                    maxDistanceValue.textContent = e.target.value;
                }
            });
            
            maxDistanceSlider.addEventListener('change', (e) => {
                const maxDistance = parseInt(e.target.value);
                State.updateState({ scoreMaxDistance: maxDistance });
                triggerRecalculation();
            });
        }
        
        if (displayRangesCheckbox) {
            displayRangesCheckbox.addEventListener('change', (e) => {
                State.updateState({ displayScoreRanges: e.target.checked });
                Rendering.render();
            });
        }
    }
    
    // Setup reset button
    function setupResetButton() {
        const resetBtn = document.getElementById('resetButton');
        
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                Candidates.resetPositions();
                Distributions.resetPositions();
                triggerRecalculation();
            });
        }
    }
    
    // Setup canvas interactions (mouse and touch)
    function setupCanvasInteractions() {
        const canvas = Rendering.getCanvas();
        
        if (!canvas) {
            return;
        }
        
        // Mouse events
        canvas.addEventListener('mousedown', handleInteractionStart);
        canvas.addEventListener('mousemove', handleInteractionMove);
        canvas.addEventListener('mouseup', handleInteractionEnd);
        canvas.addEventListener('mouseleave', handleInteractionEnd);
        
        // Touch events
        canvas.addEventListener('touchstart', handleInteractionStart);
        canvas.addEventListener('touchmove', handleInteractionMove);
        canvas.addEventListener('touchend', handleInteractionEnd);
        canvas.addEventListener('touchcancel', handleInteractionEnd);
    }
    
    // Handle interaction start (mousedown/touchstart)
    function handleInteractionStart(e) {
        e.preventDefault();
        
        const canvas = Rendering.getCanvas();
        const coords = Utils.getCanvasCoordinates(canvas, e);
        const state = State.getState();
        
        // Check if clicking on a candidate
        const candidate = Candidates.getCandidateAt(coords.x, coords.y, state.candidates);
        if (candidate) {
            State.updateState({ draggedItem: { type: 'candidate', id: candidate.id } });
            updateCursor('grabbing');
            return;
        }
        
        // Check if clicking on a distribution center (Mode 1 only)
        if (state.mode === 'one-election') {
            const distribution = Distributions.getDistributionAt(coords.x, coords.y, state.distributions);
            if (distribution) {
                State.updateState({ draggedItem: { type: 'distribution', id: distribution.id } });
                updateCursor('grabbing');
                return;
            }
        }
    }
    
    // Handle interaction move (mousemove/touchmove)
    function handleInteractionMove(e) {
        e.preventDefault();
        
        const canvas = Rendering.getCanvas();
        const coords = Utils.getCanvasCoordinates(canvas, e);
        const state = State.getState();
        
        // Handle dragging
        if (state.draggedItem) {
            if (state.draggedItem.type === 'candidate') {
                Candidates.moveCandidateTo(state.draggedItem.id, coords.x, coords.y);
            } else if (state.draggedItem.type === 'distribution') {
                Distributions.moveDistributionTo(state.draggedItem.id, coords.x, coords.y);
            }
            
            Rendering.render();
            return;
        }
        
        // Handle hovering (update cursor)
        const candidate = Candidates.getCandidateAt(coords.x, coords.y, state.candidates);
        if (candidate) {
            State.updateState({ hoveredItem: { type: 'candidate', id: candidate.id } });
            updateCursor('grab');
            Rendering.render();
            return;
        }
        
        if (state.mode === 'one-election') {
            const distribution = Distributions.getDistributionAt(coords.x, coords.y, state.distributions);
            if (distribution) {
                State.updateState({ hoveredItem: { type: 'distribution', id: distribution.id } });
                updateCursor('grab');
                Rendering.render();
                return;
            }
        }
        
        // No hover item
        if (state.hoveredItem) {
            State.updateState({ hoveredItem: null });
            updateCursor('default');
            Rendering.render();
        }
    }
    
    // Handle interaction end (mouseup/touchend)
    function handleInteractionEnd(e) {
        const state = State.getState();
        
        if (state.draggedItem) {
            // Drag completed - trigger recalculation
            State.updateState({ draggedItem: null });
            updateCursor('default');
            triggerRecalculation();
        }
    }
    
    // Update cursor style
    function updateCursor(cursorType) {
        const canvas = Rendering.getCanvas();
        if (canvas) {
            canvas.style.cursor = cursorType;
        }
    }
    
    // Trigger recalculation based on mode
    function triggerRecalculation() {
        const state = State.getState();
        
        if (state.mode === 'one-election') {
            if (window.Main && window.Main.triggerElection) {
                window.Main.triggerElection();
            }
        } else {
            WinnerMap.clearCache();
            if (window.Main && window.Main.triggerWinnerMapGeneration) {
                window.Main.triggerWinnerMapGeneration();
            }
        }
        
        Rendering.render();
    }
    
    // Update UI from current state (for initialization)
    function updateUIFromState() {
        const state = State.getState();
        
        // Update mode buttons
        updateModeUI(state.mode);
        
        // Update voting method radio
        const methodRadio = document.getElementById(state.votingMethod);
        if (methodRadio) {
            methodRadio.checked = true;
        }
        showMethodControls(state.votingMethod);
        
        // Update candidate slider
        const candidateSlider = document.getElementById('candidateSlider');
        const candidateValue = document.getElementById('candidateValue');
        if (candidateSlider) {
            candidateSlider.value = state.numCandidates;
        }
        if (candidateValue) {
            candidateValue.textContent = state.numCandidates;
        }
        
        // Update distribution slider
        const distributionSlider = document.getElementById('distributionSlider');
        const distributionValue = document.getElementById('distributionValue');
        if (distributionSlider) {
            distributionSlider.value = state.numDistributions;
        }
        if (distributionValue) {
            distributionValue.textContent = state.numDistributions;
        }
        updateDistributionSections(state.numDistributions);
        
        // Update distribution parameters
        state.distributions.forEach((dist, index) => {
            const radiusSlider = document.getElementById(`radius-${index + 1}`);
            const radiusValue = document.getElementById(`radius-value-${index + 1}`);
            const votersSlider = document.getElementById(`voters-${index + 1}`);
            const votersValue = document.getElementById(`voters-value-${index + 1}`);
            
            if (radiusSlider) radiusSlider.value = dist.spreadRadius;
            if (radiusValue) radiusValue.textContent = dist.spreadRadius;
            if (votersSlider) votersSlider.value = dist.voterCount;
            if (votersValue) votersValue.textContent = dist.voterCount;
        });
        
        // Update method-specific controls
        updateApprovalUI(state);
        updateStarUI(state);
        updateScoreUI(state);
    }
    
    // Update approval UI from state
    function updateApprovalUI(state) {
        const radiusSlider = document.getElementById('approvalRadiusSlider');
        const radiusValue = document.getElementById('approvalRadiusValue');
        const strategyRadio = document.querySelector(`input[name="votingStrategy"][value="${state.approvalStrategy}"]`);
        
        if (radiusSlider) radiusSlider.value = state.approvalRadius;
        if (radiusValue) radiusValue.textContent = state.approvalRadius;
        if (strategyRadio) strategyRadio.checked = true;
    }
    
    // Update STAR UI from state
    function updateStarUI(state) {
        const maxDistanceSlider = document.getElementById('starMaxDistanceSlider');
        const maxDistanceValue = document.getElementById('starMaxDistanceValue');
        const displayRangesCheckbox = document.getElementById('displayStarRanges');
        
        if (maxDistanceSlider) maxDistanceSlider.value = state.starMaxDistance;
        if (maxDistanceValue) maxDistanceValue.textContent = state.starMaxDistance;
        if (displayRangesCheckbox) displayRangesCheckbox.checked = state.displayStarRanges;
    }
    
    // Update Score UI from state
    function updateScoreUI(state) {
        const maxDistanceSlider = document.getElementById('scoreMaxDistanceSlider');
        const maxDistanceValue = document.getElementById('scoreMaxDistanceValue');
        const displayRangesCheckbox = document.getElementById('displayScoreRanges');
        
        if (maxDistanceSlider) maxDistanceSlider.value = state.scoreMaxDistance;
        if (maxDistanceValue) maxDistanceValue.textContent = state.scoreMaxDistance;
        if (displayRangesCheckbox) displayRangesCheckbox.checked = state.displayScoreRanges;
    }
    
    // Public API
    return {
        setupEventListeners,
        updateUIFromState,
        switchMode,
        changeVotingMethod,
        updateCursor,
        triggerRecalculation
    };
})();

// Make UIControls globally available
if (typeof window !== 'undefined') {
    window.UIControls = UIControls;
}