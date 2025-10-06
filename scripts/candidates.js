// candidates.js
// Candidate management and interaction

const Candidates = (function() {
    'use strict';
    
    // Initialize candidates with default positions
    function initializeCandidates(count) {
        const positions = CONFIG.getCandidateDefaultPositions(count);
        const candidates = [];
        
        for (let i = 0; i < count; i++) {
            candidates.push({
                id: i,
                x: positions[i].x,
                y: positions[i].y,
                name: CONFIG.CANDIDATE_NAMES[i],
                color: CONFIG.CANDIDATE_COLORS[i]
            });
        }
        
        return candidates;
    }
    
    // Check if a point is within hit detection range of a candidate
    function getCandidateAt(x, y, candidates) {
        for (let i = candidates.length - 1; i >= 0; i--) {
            const candidate = candidates[i];
            const dist = Utils.distance(x, y, candidate.x, candidate.y);
            
            if (dist <= CONFIG.CANDIDATE_HIT_RADIUS) {
                return candidate;
            }
        }
        
        return null;
    }
    
    // Move a candidate to a new position
    function moveCandidateTo(candidateId, x, y) {
        const state = State.getState();
        const candidate = state.candidates.find(c => c.id === candidateId);
        
        if (!candidate) {
            return;
        }
        
        // Clamp to canvas bounds
        candidate.x = Utils.clamp(x, CONFIG.CANVAS_MARGIN, CONFIG.CANVAS_WIDTH - CONFIG.CANVAS_MARGIN);
        candidate.y = Utils.clamp(y, CONFIG.CANVAS_MARGIN, CONFIG.CANVAS_HEIGHT - CONFIG.CANVAS_MARGIN);
        
        State.saveState();
    }
    
    // Render candidates on canvas
    function renderCandidates(ctx, candidates, draggedItem, hoveredItem, electionResults = null, selectedRound = 0) {
        // Determine which candidates are eliminated or not participating in this round
        const eliminatedCandidates = new Set();
        
        if (electionResults && electionResults.rounds) {
            const method = electionResults.method;
            
            if (method === 'irv') {
                // IRV: Collect all candidates eliminated BEFORE the selected round
                for (let i = 0; i < selectedRound && i < electionResults.rounds.length; i++) {
                    const round = electionResults.rounds[i];
                    if (round.eliminated !== null && round.eliminated !== undefined) {
                        eliminatedCandidates.add(round.eliminated);
                    }
                }
                
            } else if (method === 'two-round') {
                // Two-Round: In Round 2 (runoff), show all candidates except top 2 as eliminated
                if (selectedRound === 1 && electionResults.rounds.length > 1) {
                    const round2 = electionResults.rounds[1];
                    // Round 2 breakdown only has the 2 finalists
                    const finalistIds = new Set(round2.breakdown.map(item => item.candidateId));
                    
                    // Mark all non-finalists as eliminated
                    candidates.forEach(candidate => {
                        if (!finalistIds.has(candidate.id)) {
                            eliminatedCandidates.add(candidate.id);
                        }
                    });
                }
                
            } else if (method === 'star') {
                // STAR: In Round 2 (automatic runoff), show all candidates except top 2 as eliminated
                if (selectedRound === 1 && electionResults.rounds.length > 1) {
                    const round2 = electionResults.rounds[1];
                    
                    // STAR Round 2 has a 'finalists' array
                    if (round2.finalists && round2.finalists.length === 2) {
                        const finalistIds = new Set(round2.finalists);
                        
                        // Mark all non-finalists as eliminated
                        candidates.forEach(candidate => {
                            if (!finalistIds.has(candidate.id)) {
                                eliminatedCandidates.add(candidate.id);
                            }
                        });
                    } else {
                        // Fallback: check breakdown for finalists
                        const finalistIds = new Set(round2.breakdown.map(item => item.candidateId));
                        
                        candidates.forEach(candidate => {
                            if (!finalistIds.has(candidate.id)) {
                                eliminatedCandidates.add(candidate.id);
                            }
                        });
                    }
                }
            }
        }
        
        candidates.forEach(candidate => {
            const isDragged = draggedItem && draggedItem.type === 'candidate' && draggedItem.id === candidate.id;
            const isHovered = hoveredItem && hoveredItem.type === 'candidate' && hoveredItem.id === candidate.id;
            const isEliminated = eliminatedCandidates.has(candidate.id);
            
            // Draw halo if dragged or hovered
            if (isDragged || isHovered) {
                ctx.fillStyle = CONFIG.CANDIDATE_DRAG_HALO_COLOR;
                ctx.beginPath();
                ctx.arc(candidate.x, candidate.y, CONFIG.CANDIDATE_DRAG_HALO_RADIUS, 0, Math.PI * 2);
                ctx.fill();
            }
            
            if (isEliminated) {
                // Use eliminated rendering style
                renderCandidateEliminated(ctx, candidate);
            } else {
                // Draw candidate circle normally
                ctx.fillStyle = candidate.color;
                ctx.strokeStyle = CONFIG.CANDIDATE_BORDER_COLOR;
                ctx.lineWidth = CONFIG.CANDIDATE_BORDER_WIDTH;
                ctx.beginPath();
                ctx.arc(candidate.x, candidate.y, CONFIG.CANDIDATE_RADIUS, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
        });
    }
    
    // Render candidate with elimination styling (for IRV/STAR visualization)
    function renderCandidateEliminated(ctx, candidate) {
        // Semi-transparent fill
        ctx.globalAlpha = CONFIG.CANDIDATE_ELIMINATED_OPACITY;
        ctx.fillStyle = candidate.color;
        ctx.beginPath();
        ctx.arc(candidate.x, candidate.y, CONFIG.CANDIDATE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        
        // Grey border
        ctx.strokeStyle = CONFIG.CANDIDATE_ELIMINATED_BORDER_COLOR;
        ctx.lineWidth = CONFIG.CANDIDATE_BORDER_WIDTH;
        ctx.beginPath();
        ctx.arc(candidate.x, candidate.y, CONFIG.CANDIDATE_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Get default positions for a given number of candidates
    function getDefaultPositions(count) {
        return CONFIG.getCandidateDefaultPositions(count);
    }
    
    // Reset all candidates to default positions
    function resetPositions() {
        const state = State.getState();
        const defaultPositions = getDefaultPositions(state.numCandidates);
        
        state.candidates.forEach((candidate, index) => {
            candidate.x = defaultPositions[index].x;
            candidate.y = defaultPositions[index].y;
        });
        
        State.saveState();
    }
    
    // Update candidate count (add or remove candidates)
    function updateCandidateCount(newCount) {
        const state = State.getState();
        const currentCount = state.candidates.length;
        
        if (newCount === currentCount) {
            return;
        }
        
        if (newCount > currentCount) {
            // Add new candidates
            const defaultPositions = getDefaultPositions(newCount);
            for (let i = currentCount; i < newCount; i++) {
                state.candidates.push({
                    id: i,
                    x: defaultPositions[i].x,
                    y: defaultPositions[i].y,
                    color: CONFIG.CANDIDATE_COLORS[i],
                    name: CONFIG.CANDIDATE_NAMES[i]
                });
            }
        } else {
            // Remove candidates
            state.candidates = state.candidates.slice(0, newCount);
        }
        
        State.updateState({ 
            numCandidates: newCount,
            candidates: state.candidates 
        });
    }
    
    // Public API
    return {
        initializeCandidates,
        getCandidateAt,
        moveCandidateTo,
        renderCandidates,
        renderCandidateEliminated,
        getDefaultPositions,
        resetPositions,
        updateCandidateCount
    };
})();

// Make Candidates globally available
if (typeof window !== 'undefined') {
    window.Candidates = Candidates;
}