// UIController.js
// Handles all DOM interactions and UI updates

class UIController {
    constructor(config = {}) {
        this.candidateColors = config.candidateColors || ['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#00FFFF', '#FF00FF'];
        this.maxDistributions = config.maxDistributions || 6;
        
        // Callbacks - will be set by the main visualizer
        this.onModeChange = null;
        this.onVotingMethodChange = null;
        this.onCandidateCountChange = null;
        this.onDistributionCountChange = null;
        this.onDistributionRadiusChange = null;
        this.onDistributionVotersChange = null;
        this.onApprovalRadiusChange = null;
        this.onVotingStrategyChange = null;
        this.onResetClick = null;
    }

    // Initialize all UI elements
    init() {
        this.setupModeButtons();
        this.setupVotingMethodButtons();
        this.setupSliders();
        this.setupApprovalControls();
        this.setupResetButton();
    }

    setupModeButtons() {
        const multipleElectionsBtn = document.getElementById('multiple-elections-one-distribution');
        const oneElectionBtn = document.getElementById('one-election-multiple-distributions');

        if (multipleElectionsBtn) {
            multipleElectionsBtn.addEventListener('click', () => {
                if (this.onModeChange) {
                    this.onModeChange('multiple-elections-one-distribution');
                }
            });
        }

        if (oneElectionBtn) {
            oneElectionBtn.addEventListener('click', () => {
                if (this.onModeChange) {
                    this.onModeChange('one-election-multiple-distributions');
                }
            });
        }
    }

    setupVotingMethodButtons() {
        const votingMethodInputs = document.querySelectorAll('input[name="electionType"]');
        
        votingMethodInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                if (this.onVotingMethodChange) {
                    this.onVotingMethodChange(e.target.value);
                }
                
                // Update approval controls visibility
                this.updateApprovalControlsVisibility(e.target.value);
            });
        });
        
        // Initial check on page load
        const selectedMethod = document.querySelector('input[name="electionType"]:checked');
        if (selectedMethod) {
            this.updateApprovalControlsVisibility(selectedMethod.value);
        }
    }

    updateApprovalControlsVisibility(votingMethod) {
        const approvalControls = document.getElementById('approval-controls');
        if (approvalControls) {
            if (votingMethod === 'approval') {
                approvalControls.style.display = 'block';
            } else {
                approvalControls.style.display = 'none';
            }
        }
    }

    setupSliders() {
        // Candidate slider
        const candidateSlider = document.getElementById('candidateSlider');
        const candidateValue = document.getElementById('candidateValue');
        
        if (candidateSlider && candidateValue) {
            candidateSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                candidateValue.textContent = value;
                if (this.onCandidateCountChange) {
                    this.onCandidateCountChange(value);
                }
            });
        }

        // Distribution slider
        const distributionSlider = document.getElementById('distributionSlider');
        const distributionValue = document.getElementById('distributionValue');
        
        if (distributionSlider && distributionValue) {
            distributionSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                distributionValue.textContent = value;
                if (this.onDistributionCountChange) {
                    this.onDistributionCountChange(value);
                }
            });
        }

        // Set up individual distribution sliders
        this.setupDistributionSliders();
    }

    setupDistributionSliders() {
        for (let i = 1; i <= this.maxDistributions; i++) {
            const radiusSlider = document.getElementById(`radius-${i}`);
            const radiusValue = document.getElementById(`radius-value-${i}`);
            const votersSlider = document.getElementById(`voters-${i}`);
            const votersValue = document.getElementById(`voters-value-${i}`);

            if (radiusSlider && radiusValue) {
                radiusSlider.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    radiusValue.textContent = value;
                    if (this.onDistributionRadiusChange) {
                        this.onDistributionRadiusChange(i - 1, value);
                    }
                });
            }

            if (votersSlider && votersValue) {
                votersSlider.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    votersValue.textContent = value;
                    if (this.onDistributionVotersChange) {
                        this.onDistributionVotersChange(i - 1, value);
                    }
                });
            }
        }
    }

    setupApprovalControls() {
        // Approval radius slider
        const approvalRadiusSlider = document.getElementById('approvalRadiusSlider');
        const approvalRadiusValue = document.getElementById('approvalRadiusValue');
        
        if (approvalRadiusSlider && approvalRadiusValue) {
            approvalRadiusSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                approvalRadiusValue.textContent = value;
                if (this.onApprovalRadiusChange) {
                    this.onApprovalRadiusChange(value);
                }
            });
        }

        // Voting strategy radio buttons
        const strategyInputs = document.querySelectorAll('input[name="votingStrategy"]');
        strategyInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                if (this.onVotingStrategyChange) {
                    // Strategic = true, Honest = false
                    this.onVotingStrategyChange(e.target.value === 'strategic');
                }
            });
        });
    }

    setupResetButton() {
        const resetButton = document.getElementById('resetButton');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                if (this.onResetClick) {
                    this.onResetClick();
                }
            });
        }
    }

    // Update UI to reflect current state
    updateModeButtons(currentMode) {
        const multipleElectionsBtn = document.getElementById('multiple-elections-one-distribution');
        const oneElectionBtn = document.getElementById('one-election-multiple-distributions');

        if (multipleElectionsBtn) multipleElectionsBtn.classList.remove('active');
        if (oneElectionBtn) oneElectionBtn.classList.remove('active');

        if (currentMode === 'multiple-elections-one-distribution') {
            if (multipleElectionsBtn) multipleElectionsBtn.classList.add('active');
        } else {
            if (oneElectionBtn) oneElectionBtn.classList.add('active');
        }
    }

    updateModeDisplay(currentMode) {
        const multipleElectionsMode = document.querySelector('.multiple-elections-one-distribution-mode');
        const oneElectionMode = document.querySelector('.one-election-multiple-distributions-mode');

        if (multipleElectionsMode && oneElectionMode) {
            if (currentMode === 'multiple-elections-one-distribution') {
                multipleElectionsMode.style.display = 'block';
                oneElectionMode.style.display = 'none';
            } else {
                multipleElectionsMode.style.display = 'none';
                oneElectionMode.style.display = 'block';
            }
        }
    }

    updateDistributionSections(numDistributions, distributions) {
        for (let i = 1; i <= this.maxDistributions; i++) {
            const section = document.getElementById(`distribution-${i}`);
            if (section) {
                if (i <= numDistributions) {
                    section.style.display = 'block';
                    
                    // Update slider values
                    const radiusSlider = document.getElementById(`radius-${i}`);
                    const radiusValue = document.getElementById(`radius-value-${i}`);
                    const votersSlider = document.getElementById(`voters-${i}`);
                    const votersValue = document.getElementById(`voters-value-${i}`);
                    
                    if (radiusSlider && radiusValue && distributions[i-1]) {
                        radiusSlider.value = distributions[i-1].radius;
                        radiusValue.textContent = distributions[i-1].radius;
                    }
                    if (votersSlider && votersValue && distributions[i-1]) {
                        votersSlider.value = distributions[i-1].voterCount;
                        votersValue.textContent = distributions[i-1].voterCount;
                    }
                } else {
                    section.style.display = 'none';
                }
            }
        }
    }

    // Update slider values (for loading from storage)
    updateSliderValues(state) {
        const candidateSlider = document.getElementById('candidateSlider');
        const candidateValue = document.getElementById('candidateValue');
        const distributionSlider = document.getElementById('distributionSlider');
        const distributionValue = document.getElementById('distributionValue');
        
        if (candidateSlider && candidateValue) {
            candidateSlider.value = state.numCandidates;
            candidateValue.textContent = state.numCandidates;
        }
        
        if (distributionSlider && distributionValue) {
            distributionSlider.value = state.numDistributions;
            distributionValue.textContent = state.numDistributions;
        }
        
        // Set voting method radio button
        const votingMethodInput = document.querySelector(`input[name="electionType"][value="${state.currentVotingMethod}"]`);
        if (votingMethodInput) {
            votingMethodInput.checked = true;
        }

        // Set approval radius slider
        const approvalRadiusSlider = document.getElementById('approvalRadiusSlider');
        const approvalRadiusValue = document.getElementById('approvalRadiusValue');
        if (approvalRadiusSlider && approvalRadiusValue && state.approvalRadius !== undefined) {
            approvalRadiusSlider.value = state.approvalRadius;
            approvalRadiusValue.textContent = state.approvalRadius;
        }

        // Set voting strategy radio button
        if (state.isStrategicVoting !== undefined) {
            const strategyValue = state.isStrategicVoting ? 'strategic' : 'honest';
            const strategyInput = document.querySelector(`input[name="votingStrategy"][value="${strategyValue}"]`);
            if (strategyInput) {
                strategyInput.checked = true;
            }
        }
    }

    // Display election results
    displayPluralityResults(electionResults, numCandidates) {
        const resultsDiv = document.getElementById('results');
        if (!resultsDiv || !electionResults) return;

        let html = '<h3>Plurality Voting Results</h3>';
        html += `<p><strong>Total Votes:</strong> ${electionResults.totalVotes.toLocaleString()}</p>`;
        
        // Create candidate results
        for (let i = 0; i < numCandidates; i++) {
            const votes = electionResults.candidateVotes[i];
            const percentage = electionResults.totalVotes > 0 ? 
                (votes / electionResults.totalVotes * 100).toFixed(1) : 0;
            const isWinner = i === electionResults.winner;
            
            html += `<div class="candidate-result ${isWinner ? 'winner' : ''}">`;
            html += `<span class="candidate-color" style="background-color: ${this.candidateColors[i]}"></span>`;
            html += `<span class="candidate-info">Candidate ${i + 1}: ${votes.toLocaleString()} votes (${percentage}%)</span>`;
            if (isWinner) {
                html += ' <strong>🏆 WINNER</strong>';
            }
            html += '</div>';
        }

        resultsDiv.innerHTML = html;
    }

    displayApprovalResults(electionResults, numCandidates) {
        const resultsDiv = document.getElementById('results');
        if (!resultsDiv || !electionResults) return;

        let html = '<h3>Approval Voting Results</h3>';
        html += `<p><strong>Total Voters:</strong> ${electionResults.totalVoters.toLocaleString()}</p>`;
        html += `<p><strong>Approval Radius:</strong> ${electionResults.approvalRadius}px</p>`;
        
        // Create candidate results
        for (let i = 0; i < numCandidates; i++) {
            const approvals = electionResults.candidateApprovals[i];
            const percentage = electionResults.totalVoters > 0 ? 
                (approvals / electionResults.totalVoters * 100).toFixed(1) : 0;
            const isWinner = i === electionResults.winner;
            
            html += `<div class="candidate-result ${isWinner ? 'winner' : ''}">`;
            html += `<span class="candidate-color" style="background-color: ${this.candidateColors[i]}"></span>`;
            html += `<span class="candidate-info">Candidate ${i + 1}: ${approvals.toLocaleString()} approvals (${percentage}%)</span>`;
            if (isWinner) {
                html += ' <strong>🏆 WINNER</strong>';
            }
            html += '</div>';
        }

        resultsDiv.innerHTML = html;
    }

    // TODO: Display IRV results
    displayIRVResults(electionResults, numCandidates) {
        // TODO: Implement when IRV is added
    }

    // TODO: Display STAR results
    displaySTARResults(electionResults, numCandidates) {
        // TODO: Implement when STAR is added
    }

    clearElectionResults() {
        const resultsDiv = document.getElementById('results');
        if (resultsDiv) {
            resultsDiv.innerHTML = 'Select "One Election, Multiple Distributions" mode and "Plurality" voting to see results.';
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIController;
}