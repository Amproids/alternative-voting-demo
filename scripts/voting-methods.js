// voting-methods.js
// Implementation of all voting methods (stubbed for scaffolding)

const VotingMethods = (function() {
    'use strict';
    
    // PLURALITY VOTING
    // Each voter votes for nearest candidate
    function runPlurality(voters, candidates) {
        const voteCounts = new Array(candidates.length).fill(0);
        const voterStates = [];
        
        // Each voter votes for their nearest candidate
        voters.forEach(voter => {
            let nearestCandidate = 0;
            let minDistance = Infinity;
            
            // Find nearest candidate
            candidates.forEach((candidate, index) => {
                const dist = Utils.distance(voter.x, voter.y, candidate.x, candidate.y);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestCandidate = index;
                }
            });
            
            // Record vote
            voteCounts[nearestCandidate]++;
            
            // Store voter state (color matches candidate they voted for)
            voterStates.push({
                voteColor: CONFIG.CANDIDATE_COLORS[nearestCandidate],
                preferredCandidate: nearestCandidate
            });
        });
        
        // Determine winner (candidate with most votes)
        let winner = 0;
        let maxVotes = voteCounts[0];
        
        for (let i = 1; i < voteCounts.length; i++) {
            if (voteCounts[i] > maxVotes) {
                maxVotes = voteCounts[i];
                winner = i;
            }
        }
        
        // Handle ties - if multiple candidates have the same max votes, pick randomly
        const tiedCandidates = [];
        for (let i = 0; i < voteCounts.length; i++) {
            if (voteCounts[i] === maxVotes) {
                tiedCandidates.push(i);
            }
        }
        
        if (tiedCandidates.length > 1) {
            winner = Utils.randomChoice(tiedCandidates);
        }
        
        // Calculate total votes
        const totalVotes = voters.length;
        
        // Create breakdown
        const breakdown = candidates.map((candidate, index) => ({
            candidateId: index,
            name: candidate.name,
            votes: voteCounts[index],
            percentage: totalVotes > 0 ? ((voteCounts[index] / totalVotes) * 100).toFixed(1) : '0.0'
        }));
        
        // Sort breakdown by votes (descending)
        breakdown.sort((a, b) => b.votes - a.votes);
        console.log(`Winner: ${candidates[winner].name}`);
        const results = {
            method: 'plurality',
            winner: winner,
            breakdown: breakdown,
            voterStates: voterStates
        };
        
        return results;
    }
    
    // APPROVAL VOTING
    // Voters approve all candidates within radius
    function runApproval(voters, candidates, approvalRadius, strategy) {
        // TODO: Implement actual approval logic
        // For now, return stub data
        
        const results = {
            method: 'approval',
            winner: 0,
            strategy: strategy,
            breakdown: candidates.map((candidate, index) => ({
                candidateId: index,
                name: candidate.name,
                approvals: 0,
                percentage: 0
            })),
            voterStates: voters.map(voter => ({
                voteColor: CONFIG.CANDIDATE_COLORS[0],
                preferredCandidate: 0
            }))
        };
        
        return results;
    }
    
    // TWO-ROUND SYSTEM
    // Plurality vote, then runoff between top 2 if no majority
    function runTwoRound(voters, candidates) {
        // TODO: Implement actual two-round logic
        // For now, return stub data
        
        const results = {
            method: 'two-round',
            winner: 0,
            rounds: [
                {
                    roundNumber: 1,
                    roundName: 'First Round',
                    breakdown: candidates.map((candidate, index) => ({
                        candidateId: index,
                        name: candidate.name,
                        votes: 0,
                        percentage: 0
                    })),
                    voterStates: voters.map(voter => ({
                        voteColor: CONFIG.CANDIDATE_COLORS[0],
                        preferredCandidate: 0
                    }))
                },
                {
                    roundNumber: 2,
                    roundName: 'Runoff',
                    breakdown: [
                        {
                            candidateId: 0,
                            name: candidates[0].name,
                            votes: 0,
                            percentage: 0
                        },
                        {
                            candidateId: 1,
                            name: candidates[1].name,
                            votes: 0,
                            percentage: 0
                        }
                    ],
                    voterStates: voters.map(voter => ({
                        voteColor: CONFIG.CANDIDATE_COLORS[0],
                        preferredCandidate: 0
                    }))
                }
            ]
        };
        
        return results;
    }
    
    // SCORE VOTING
    // Voters score candidates 0-5 based on distance
    function runScore(voters, candidates, maxDistance) {
        // TODO: Implement actual score voting logic
        // For now, return stub data
        
        const results = {
            method: 'score',
            winner: 0,
            maxDistance: maxDistance,
            breakdown: candidates.map((candidate, index) => ({
                candidateId: index,
                name: candidate.name,
                totalScore: 0,
                averageScore: 0
            })),
            voterStates: voters.map(voter => ({
                voteColor: CONFIG.CANDIDATE_COLORS[0],
                preferredCandidate: 0
            }))
        };
        
        return results;
    }
    
    // BORDA COUNT
    // Voters rank all candidates, points awarded by rank
    function runBorda(voters, candidates) {
        // TODO: Implement actual Borda count logic
        // For now, return stub data
        
        const results = {
            method: 'borda',
            winner: 0,
            breakdown: candidates.map((candidate, index) => ({
                candidateId: index,
                name: candidate.name,
                bordaPoints: 0
            })),
            voterStates: voters.map(voter => ({
                voteColor: CONFIG.CANDIDATE_COLORS[0],
                preferredCandidate: 0
            }))
        };
        
        return results;
    }
    
    // INSTANT RUNOFF VOTING (IRV)
    // Iteratively eliminate candidate with fewest votes
    function runIRV(voters, candidates) {
        // TODO: Implement actual IRV logic
        // For now, return stub data with multiple rounds
        
        const results = {
            method: 'irv',
            winner: 0,
            rounds: [
                {
                    roundNumber: 1,
                    roundName: 'Round 1',
                    eliminated: null,
                    breakdown: candidates.map((candidate, index) => ({
                        candidateId: index,
                        name: candidate.name,
                        votes: 0,
                        percentage: 0,
                        active: true
                    })),
                    voterStates: voters.map(voter => ({
                        voteColor: CONFIG.CANDIDATE_COLORS[0],
                        preferredCandidate: 0
                    }))
                }
            ]
        };
        
        return results;
    }
    
    // STAR VOTING (Score Then Automatic Runoff)
    // Score candidates 0-5, then runoff between top 2
    function runSTAR(voters, candidates, maxDistance) {
        // TODO: Implement actual STAR voting logic
        // For now, return stub data
        
        const results = {
            method: 'star',
            winner: 0,
            maxDistance: maxDistance,
            rounds: [
                {
                    roundNumber: 1,
                    roundName: 'Scoring Round',
                    breakdown: candidates.map((candidate, index) => ({
                        candidateId: index,
                        name: candidate.name,
                        totalScore: 0,
                        averageScore: 0
                    })),
                    voterStates: voters.map(voter => ({
                        voteColor: CONFIG.CANDIDATE_COLORS[0],
                        preferredCandidate: 0
                    }))
                },
                {
                    roundNumber: 2,
                    roundName: 'Automatic Runoff',
                    finalists: [0, 1],
                    breakdown: [
                        {
                            candidateId: 0,
                            name: candidates[0].name,
                            votes: 0,
                            percentage: 0
                        },
                        {
                            candidateId: 1,
                            name: candidates[1].name,
                            votes: 0,
                            percentage: 0
                        }
                    ],
                    voterStates: voters.map(voter => ({
                        voteColor: CONFIG.CANDIDATE_COLORS[0],
                        preferredCandidate: 0
                    }))
                }
            ]
        };
        
        return results;
    }
    
    // Main function to run election based on current voting method
    function runElection(votingMethod, voters, candidates, params) {
        switch (votingMethod) {
            case 'plurality':
                return runPlurality(voters, candidates);
            
            case 'approval':
                return runApproval(voters, candidates, params.approvalRadius, params.approvalStrategy);
            
            case 'two-round':
                return runTwoRound(voters, candidates);
            
            case 'score':
                return runScore(voters, candidates, params.scoreMaxDistance);
            
            case 'borda':
                return runBorda(voters, candidates);
            
            case 'irv':
                return runIRV(voters, candidates);
            
            case 'star':
                return runSTAR(voters, candidates, params.starMaxDistance);
            
            default:
                console.error('Unknown voting method:', votingMethod);
                return null;
        }
    }
    
    // Public API
    return {
        runElection,
        runPlurality,
        runApproval,
        runTwoRound,
        runScore,
        runBorda,
        runIRV,
        runSTAR
    };
})();

// Make VotingMethods globally available
if (typeof window !== 'undefined') {
    window.VotingMethods = VotingMethods;
}