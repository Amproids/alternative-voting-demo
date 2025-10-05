// election.js
// Execute elections and format results

const Election = (function() {
    'use strict';
    
    // Run election based on current mode and settings
    function runElection() {
        const state = State.getState();
        
        if (state.mode === 'one-election') {
            return runModeOneElection();
        } else {
            // Mode 2 doesn't run a single election, it generates a winner map
            return null;
        }
    }
    
    // Run election for Mode 1 (One Election, Multiple Distributions)
    function runModeOneElection() {
        const state = State.getState();
        
        // Get all voters from all distributions
        const allVoters = Distributions.getAllVoters(state.distributions);
        
        if (allVoters.length === 0) {
            return {
                error: 'No voters generated',
                message: 'Please ensure distributions have voters.'
            };
        }
        
        // Prepare parameters for voting method
        const params = {
            approvalRadius: state.approvalRadius,
            approvalStrategy: state.approvalStrategy,
            starMaxDistance: state.starMaxDistance,
            scoreMaxDistance: state.scoreMaxDistance
        };
        
        // Run the election using the selected voting method
        const results = VotingMethods.runElection(
            state.votingMethod,
            allVoters,
            state.candidates,
            params
        );
        
        if (!results) {
            return {
                error: 'Election failed',
                message: 'Unable to compute election results.'
            };
        }
        
        // Update voter colors based on results
        updateVoterColors(results, state.distributions);
        
        // Store results in state
        State.updateState({ electionResults: results });
        
        return results;
    }
    
    // Update voter colors based on election results
    function updateVoterColors(results, distributions) {
        // Get the appropriate voter states based on method and selected round
        let voterStates;
        
        if (results.rounds) {
            // Multi-round method (IRV, STAR, Two-Round)
            const state = State.getState();
            const roundIndex = state.selectedRound || 0;
            
            if (results.rounds[roundIndex]) {
                voterStates = results.rounds[roundIndex].voterStates;
            } else {
                voterStates = results.rounds[0].voterStates;
            }
        } else {
            // Single-round method
            voterStates = results.voterStates;
        }
        
        if (!voterStates) {
            return;
        }
        
        // Update each voter's color
        let voterIndex = 0;
        distributions.forEach(distribution => {
            distribution.voters.forEach(voter => {
                if (voterIndex < voterStates.length) {
                    voter.voteColor = voterStates[voterIndex].voteColor;
                    voter.preferredCandidate = voterStates[voterIndex].preferredCandidate;
                    voterIndex++;
                }
            });
        });
    }
    
    // Format results for display in the UI
    function formatResults(results) {
        if (!results) {
            return '<p>No results available.</p>';
        }
        
        if (results.error) {
            return `<p class="error">${results.message}</p>`;
        }
        
        const state = State.getState();
        const winner = state.candidates[results.winner];
        
        let html = `<h3>Winner: ${winner.name}</h3>`;
        
        // Format based on method type
        if (results.rounds) {
            // Multi-round methods (IRV, STAR, Two-Round)
            html += formatMultiRoundResults(results, state.candidates);
        } else {
            // Single-round methods
            html += formatSingleRoundResults(results);
        }
        
        return html;
    }
    
    // Format single-round election results
    function formatSingleRoundResults(results) {
        const state = State.getState();
        let html = '<div class="results-breakdown">';
        
        results.breakdown.forEach((item, index) => {
            // Get candidate color
            const candidate = state.candidates[item.candidateId];
            const color = candidate ? candidate.color : '#999';
            
            html += `<div class="result-item" data-candidate-color="${color}" style="border-left-color: ${color}">`;
            html += `<span class="candidate-name">${item.name}:</span> `;
            
            if (results.method === 'plurality' || results.method === 'approval') {
                const label = results.method === 'approval' ? 'approvals' : 'votes';
                const value = results.method === 'approval' ? item.approvals : item.votes;
                html += `${Utils.formatNumber(value)} ${label} (${item.percentage}%)`;
            } else if (results.method === 'score') {
                html += `${Utils.formatNumber(item.totalScore)} points (avg: ${item.averageScore.toFixed(2)})`;
            } else if (results.method === 'borda') {
                html += `${Utils.formatNumber(item.bordaPoints)} Borda points`;
            }
            
            html += `</div>`;
        });
        
        html += '</div>';
        
        return html;
    }
    
    // Format multi-round election results (with accordion)
    function formatMultiRoundResults(results, candidates) {
        let html = '<div class="rounds-container">';
        
        results.rounds.forEach((round, index) => {
            const isExpanded = index === 0; // First round expanded by default
            
            html += `<div class="round-section">`;
            html += `<div class="round-header ${isExpanded ? 'expanded' : ''}" data-round="${index}">`;
            html += `<span class="round-arrow">${isExpanded ? '▼' : '▶'}</span> `;
            html += `${round.roundName}`;
            html += `</div>`;
            
            html += `<div class="round-content" style="display: ${isExpanded ? 'block' : 'none'};">`;
            
            // Display round results
            round.breakdown.forEach(item => {
                // Get candidate color
                const candidate = candidates[item.candidateId];
                const color = candidate ? candidate.color : '#999';
                
                html += `<div class="result-item" data-candidate-color="${color}" style="border-left-color: ${color}">`;
                html += `<span class="candidate-name">${item.name}:</span> `;
                
                if (item.votes !== undefined) {
                    html += `${Utils.formatNumber(item.votes)} votes (${item.percentage}%)`;
                } else if (item.totalScore !== undefined) {
                    html += `${Utils.formatNumber(item.totalScore)} points (avg: ${item.averageScore.toFixed(2)})`;
                }
                
                if (item.active === false) {
                    html += ` <em>(eliminated)</em>`;
                }
                
                html += `</div>`;
            });
            
            if (round.eliminated !== null && round.eliminated !== undefined) {
                const eliminated = candidates[round.eliminated];
                html += `<p class="elimination-notice">Eliminated: ${eliminated.name}</p>`;
            }
            
            html += `</div>`;
            html += `</div>`;
        });
        
        html += '</div>';
        
        return html;
    }
    
    // Display results in the DOM
    function displayResults(results) {
        const resultsContainer = document.getElementById('results');
        
        if (!resultsContainer) {
            console.error('Results container not found');
            return;
        }
        
        const formattedHTML = formatResults(results);
        resultsContainer.innerHTML = formattedHTML;
        
        // Attach event listeners for round accordion (if multi-round)
        attachRoundAccordionListeners();
    }
    
    // Attach click listeners to round headers for accordion behavior
    function attachRoundAccordionListeners() {
        const roundHeaders = document.querySelectorAll('.round-header');
        
        roundHeaders.forEach(header => {
            header.addEventListener('click', function() {
                const roundIndex = parseInt(this.dataset.round);
                const content = this.nextElementSibling;
                const arrow = this.querySelector('.round-arrow');
                
                // Toggle this round
                const isCurrentlyExpanded = this.classList.contains('expanded');
                
                // Close all rounds
                document.querySelectorAll('.round-header').forEach(h => {
                    h.classList.remove('expanded');
                    h.querySelector('.round-arrow').textContent = '▶';
                    h.nextElementSibling.style.display = 'none';
                });
                
                // Open clicked round if it wasn't already open
                if (!isCurrentlyExpanded) {
                    this.classList.add('expanded');
                    arrow.textContent = '▼';
                    content.style.display = 'block';
                    
                    // Update selected round in state and re-render voters
                    State.updateState({ selectedRound: roundIndex });
                    
                    // Update voter colors for this round
                    const state = State.getState();
                    if (state.electionResults) {
                        updateVoterColors(state.electionResults, state.distributions);
                        // Trigger re-render
                        if (window.Rendering) {
                            Rendering.render();
                        }
                    }
                }
            });
        });
    }
    
    // Simulate election at a specific point (for Mode 2 winner map)
    // Accepts optional pre-generated offsets for performance
    function simulateElectionAt(centerX, centerY, offsets = null) {
        const state = State.getState();
        
        // Use the first distribution's parameters for Mode 2
        const distribution = state.distributions[0];
        
        // Generate voters at this center position
        let voters;
        if (offsets) {
            // Reuse pre-generated offsets (fast path for winner map)
            voters = Utils.applyOffsetsToCenter(
                centerX,
                centerY,
                offsets,
                distribution.spreadRadius
            );
        } else {
            // Generate new voters (fallback for individual simulations)
            voters = Utils.generateGaussianPoints(
                centerX,
                centerY,
                distribution.spreadRadius,
                distribution.voterCount
            );
        }
        
        // Prepare parameters
        const params = {
            approvalRadius: state.approvalRadius,
            approvalStrategy: state.approvalStrategy,
            starMaxDistance: state.starMaxDistance,
            scoreMaxDistance: state.scoreMaxDistance
        };
        
        // Run election with skipVoterStates=true for performance
        // Winner map only needs winner ID, not voter colors
        const results = VotingMethods.runElection(
            state.votingMethod,
            voters,
            state.candidates,
            params,
            true  // skipVoterStates - critical performance optimization
        );
        
        return results ? results.winner : null;
    }
    
    // Public API
    return {
        runElection,
        formatResults,
        displayResults,
        simulateElectionAt,
        updateVoterColors
    };
})();

// Make Election globally available
if (typeof window !== 'undefined') {
    window.Election = Election;
}