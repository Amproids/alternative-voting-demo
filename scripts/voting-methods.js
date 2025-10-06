// voting-methods.js
// Implementation of all voting methods (with Mode 2 optimizations)

const VotingMethods = (function() {
    'use strict';
    
    // PLURALITY VOTING
    // Each voter votes for nearest candidate
    function runPlurality(voters, candidates, skipVoterStates = false) {
        const voteCounts = new Array(candidates.length).fill(0);
        const voterStates = skipVoterStates ? null : [];
        
        // Each voter votes for their nearest candidate
        voters.forEach(voter => {
            // Use optimized nearest candidate finder (no sqrt)
            const nearestCandidate = Utils.findNearestCandidate(voter.x, voter.y, candidates);
            
            // Record vote
            voteCounts[nearestCandidate]++;
            
            // Store voter state only if needed (Mode 1)
            if (!skipVoterStates) {
                voterStates.push({
                    voteColor: CONFIG.CANDIDATE_COLORS[nearestCandidate],
                    preferredCandidate: nearestCandidate
                });
            }
        });
        
        // Determine winner (single pass - track max and ties together)
        let maxVotes = voteCounts[0];
        let tiedCandidates = [0];
        
        for (let i = 1; i < voteCounts.length; i++) {
            if (voteCounts[i] > maxVotes) {
                maxVotes = voteCounts[i];
                tiedCandidates = [i];
            } else if (voteCounts[i] === maxVotes) {
                tiedCandidates.push(i);
            }
        }
        
        // Pick winner (random if tied)
        const winner = tiedCandidates.length > 1 ? Utils.randomChoice(tiedCandidates) : tiedCandidates[0];
        
        // Skip breakdown if not needed (Mode 2)
        const breakdown = skipVoterStates ? null : createPluralityBreakdown(candidates, voteCounts, voters.length);
        
        const results = {
            method: 'plurality',
            winner: winner,
            breakdown: breakdown,
            voterStates: voterStates
        };
        
        return results;
    }
    
    // Helper function to create plurality breakdown
    function createPluralityBreakdown(candidates, voteCounts, totalVotes) {
        const breakdown = candidates.map((candidate, index) => ({
            candidateId: index,
            name: candidate.name,
            votes: voteCounts[index],
            percentage: totalVotes > 0 ? ((voteCounts[index] / totalVotes) * 100).toFixed(1) : '0.0'
        }));
        
        // Sort breakdown by votes (descending)
        breakdown.sort((a, b) => b.votes - a.votes);
        
        return breakdown;
    }
    
    // APPROVAL VOTING
    // Voters approve candidates based on strategic or honest rules
    function runApproval(voters, candidates, approvalRadius, strategy, skipVoterStates = false) {
        const approvalCounts = new Array(candidates.length).fill(0);
        const voterStates = skipVoterStates ? null : [];
        
        // Pre-calculate squared radius for comparisons
        const radiusSquared = approvalRadius * approvalRadius;
        
        // Each voter approves candidates based on strategy
        voters.forEach(voter => {
            let approvedCandidates = [];
            
            if (strategy === 'honest') {
                // HONEST MODE: Approve all candidates within approval radius
                // Optimized: no array creation, no sorting, direct radius check
                for (let i = 0; i < candidates.length; i++) {
                    if (Utils.isWithinRadius(voter.x, voter.y, candidates[i].x, candidates[i].y, approvalRadius)) {
                        approvedCandidates.push(i);
                    }
                }
                
            } else {
                // STRATEGIC MODE: Ultra-optimized (no sorting, minimal allocations)
                // Single pass: calculate distances and track nearest/furthest
                let withinCount = 0;
                let nearestId = 0;
                let nearestDistSq = Infinity;
                let furthestId = 0;
                let furthestDistSq = -1;
                
                const candidateDistances = new Array(candidates.length);
                
                for (let i = 0; i < candidates.length; i++) {
                    const distSq = Utils.distanceSquared(voter.x, voter.y, candidates[i].x, candidates[i].y);
                    candidateDistances[i] = distSq;
                    
                    const isWithin = distSq <= radiusSquared;
                    if (isWithin) {
                        withinCount++;
                        if (distSq > furthestDistSq) {
                            furthestDistSq = distSq;
                            furthestId = i;
                        }
                    }
                    
                    if (distSq < nearestDistSq) {
                        nearestDistSq = distSq;
                        nearestId = i;
                    }
                }
                
                // Determine approvals based on count (no sorting needed!)
                if (withinCount === 0) {
                    // Case 1: None in radius - approve only nearest
                    approvedCandidates = [nearestId];
                    
                } else if (withinCount === candidates.length) {
                    // Case 2: All in radius - approve all except furthest
                    // If multiple tied for furthest, pick one randomly
                    const tiedFurthest = [];
                    for (let i = 0; i < candidates.length; i++) {
                        if (candidateDistances[i] === furthestDistSq) {
                            tiedFurthest.push(i);
                        }
                    }
                    const toExclude = tiedFurthest.length > 1 ? Utils.randomChoice(tiedFurthest) : furthestId;
                    
                    approvedCandidates = [];
                    for (let i = 0; i < candidates.length; i++) {
                        if (i !== toExclude) {
                            approvedCandidates.push(i);
                        }
                    }
                    
                } else {
                    // Case 3: Some in radius - approve those within
                    approvedCandidates = [];
                    for (let i = 0; i < candidates.length; i++) {
                        if (candidateDistances[i] <= radiusSquared) {
                            approvedCandidates.push(i);
                        }
                    }
                }
            }
            
            // Record approvals
            approvedCandidates.forEach(candidateId => {
                approvalCounts[candidateId]++;
            });
            
            // Only calculate voter states if needed (Mode 1)
            if (!skipVoterStates) {
                // For voter color, we need distances again (only in Mode 1)
                const distances = candidates.map((candidate, index) => ({
                    candidateId: index,
                    distance: Utils.distance(voter.x, voter.y, candidate.x, candidate.y)
                }));
                distances.sort((a, b) => a.distance - b.distance);
                
                // Determine voter color based on approvals
                let voteColor;
                let preferredCandidate = null;
                
                if (approvedCandidates.length === 0) {
                    // No approvals - grey
                    voteColor = CONFIG.VOTER_GREY_COLOR;
                    
                } else if (approvedCandidates.length === candidates.length) {
                    // All candidates approved - grey (no discriminatory preference)
                    voteColor = CONFIG.VOTER_GREY_COLOR;
                    preferredCandidate = distances[0].candidateId; // Track nearest for reference
                    
                } else if (approvedCandidates.length === 1) {
                    // Single approval - pure candidate color
                    voteColor = CONFIG.CANDIDATE_COLORS[approvedCandidates[0]];
                    preferredCandidate = approvedCandidates[0];
                    
                } else {
                    // Multiple approvals (but not all) - proportional blend with equal weights
                    const weights = {};
                    
                    // Initialize weights for ALL candidates (0 for non-approved)
                    for (let i = 0; i < candidates.length; i++) {
                        weights[i] = 0;
                    }
                    
                    // Set weight of 1 for approved candidates
                    approvedCandidates.forEach(candidateId => {
                        weights[candidateId] = 1;
                    });
                    
                    voteColor = Utils.getProportionalColor(weights);
                    preferredCandidate = distances[0].candidateId; // Nearest overall
                }
                
                voterStates.push({
                    voteColor: voteColor,
                    preferredCandidate: preferredCandidate,
                    approvedCandidates: approvedCandidates
                });
            }
        });
        
        // Determine winner (single pass - track max and ties together)
        let maxApprovals = approvalCounts[0];
        let tiedCandidates = [0];
        
        for (let i = 1; i < approvalCounts.length; i++) {
            if (approvalCounts[i] > maxApprovals) {
                maxApprovals = approvalCounts[i];
                tiedCandidates = [i];
            } else if (approvalCounts[i] === maxApprovals) {
                tiedCandidates.push(i);
            }
        }
        
        // Pick winner (random if tied)
        const winner = tiedCandidates.length > 1 ? Utils.randomChoice(tiedCandidates) : tiedCandidates[0];
        
        // Skip breakdown if not needed (Mode 2)
        const breakdown = skipVoterStates ? null : createApprovalBreakdown(candidates, approvalCounts, voters.length);
        
        const results = {
            method: 'approval',
            winner: winner,
            strategy: strategy,
            breakdown: breakdown,
            voterStates: voterStates
        };
        
        return results;
    }
    
    // Helper function to create approval breakdown
    function createApprovalBreakdown(candidates, approvalCounts, totalVoters) {
        const breakdown = candidates.map((candidate, index) => ({
            candidateId: index,
            name: candidate.name,
            approvals: approvalCounts[index],
            percentage: totalVoters > 0 ? ((approvalCounts[index] / totalVoters) * 100).toFixed(1) : '0.0'
        }));
        
        // Sort breakdown by approvals (descending)
        breakdown.sort((a, b) => b.approvals - a.approvals);
        
        return breakdown;
    }
    
    // TWO-ROUND SYSTEM
    // Plurality vote, then runoff between top 2 if no majority
    function runTwoRound(voters, candidates, skipVoterStates = false) {
        const rounds = [];
        
        // ROUND 1: Plurality voting (reuse optimized logic)
        const voteCounts = new Array(candidates.length).fill(0);
        const round1VoterStates = skipVoterStates ? null : [];
        
        // Each voter votes for their nearest candidate
        voters.forEach(voter => {
            const nearestCandidate = Utils.findNearestCandidate(voter.x, voter.y, candidates);
            voteCounts[nearestCandidate]++;
            
            if (!skipVoterStates) {
                round1VoterStates.push({
                    voteColor: CONFIG.CANDIDATE_COLORS[nearestCandidate],
                    preferredCandidate: nearestCandidate
                });
            }
        });
        
        // Find top 2 candidates (single pass, efficient)
        let first = 0, second = 1;
        if (voteCounts[1] > voteCounts[0]) {
            first = 1;
            second = 0;
        }
        
        for (let i = 2; i < candidates.length; i++) {
            if (voteCounts[i] > voteCounts[first]) {
                second = first;
                first = i;
            } else if (voteCounts[i] > voteCounts[second]) {
                second = i;
            }
        }
        
        // Create Round 1 breakdown and add to rounds
        const round1Breakdown = skipVoterStates ? null : createPluralityBreakdown(candidates, voteCounts, voters.length);
        
        rounds.push({
            roundNumber: 1,
            roundName: 'First Round',
            breakdown: round1Breakdown,
            voterStates: round1VoterStates
        });
        
        // Check if winner has majority (>50%)
        const totalVotes = voters.length;
        const majorityThreshold = totalVotes / 2;
        
        let winner;
        
        if (voteCounts[first] > majorityThreshold) {
            // First round winner has majority - no runoff needed
            winner = first;
        } else {
            // ROUND 2: Runoff between top 2 candidates
            const runoffVotes = [0, 0]; // votes for [first, second]
            const round2VoterStates = skipVoterStates ? null : [];
            
            voters.forEach(voter => {
                // Calculate squared distances to the two finalists (no sqrt needed)
                const distSqFirst = Utils.distanceSquared(voter.x, voter.y, candidates[first].x, candidates[first].y);
                const distSqSecond = Utils.distanceSquared(voter.x, voter.y, candidates[second].x, candidates[second].y);
                
                // Vote for closer candidate (handle ties randomly)
                let votesFor;
                if (distSqFirst < distSqSecond) {
                    votesFor = 0; // Vote for first
                } else if (distSqSecond < distSqFirst) {
                    votesFor = 1; // Vote for second
                } else {
                    votesFor = Math.random() < 0.5 ? 0 : 1; // Random tie break
                }
                
                runoffVotes[votesFor]++;
                
                if (!skipVoterStates) {
                    const preferredCandidate = votesFor === 0 ? first : second;
                    round2VoterStates.push({
                        voteColor: CONFIG.CANDIDATE_COLORS[preferredCandidate],
                        preferredCandidate: preferredCandidate
                    });
                }
            });
            
            // Determine runoff winner
            if (runoffVotes[0] > runoffVotes[1]) {
                winner = first;
            } else if (runoffVotes[1] > runoffVotes[0]) {
                winner = second;
            } else {
                // Tie - random winner
                winner = Math.random() < 0.5 ? first : second;
            }
            
            // Create Round 2 breakdown (only if needed)
            const round2Breakdown = skipVoterStates ? null : [
                {
                    candidateId: first,
                    name: candidates[first].name,
                    votes: runoffVotes[0],
                    percentage: totalVotes > 0 ? ((runoffVotes[0] / totalVotes) * 100).toFixed(1) : '0.0'
                },
                {
                    candidateId: second,
                    name: candidates[second].name,
                    votes: runoffVotes[1],
                    percentage: totalVotes > 0 ? ((runoffVotes[1] / totalVotes) * 100).toFixed(1) : '0.0'
                }
            ].sort((a, b) => b.votes - a.votes);
            
            rounds.push({
                roundNumber: 2,
                roundName: 'Runoff',
                breakdown: round2Breakdown,
                voterStates: round2VoterStates
            });
        }
        
        return {
            method: 'two-round',
            winner: winner,
            rounds: rounds
        };
    }
    
    // SCORE VOTING
    // Voters score candidates 0-5 based on distance
    function runScore(voters, candidates, maxDistance, skipVoterStates = false) {
        const MAX_SCORE = 5;
        const totalScores = new Array(candidates.length).fill(0);
        const voterStates = skipVoterStates ? null : [];
        
        // Pre-calculate squared maxDistance for normalization
        const maxDistanceSquared = maxDistance * maxDistance;
        
        // Each voter scores all candidates
        voters.forEach(voter => {
            const scores = new Array(candidates.length);
            let maxScore = 0;
            let nearestCandidate = 0;
            
            // Calculate scores for all candidates (optimized with squared distances)
            for (let i = 0; i < candidates.length; i++) {
                const distSq = Utils.distanceSquared(voter.x, voter.y, candidates[i].x, candidates[i].y);
                
                // Convert distance to score: closer = higher score
                // score = MAX_SCORE * (1 - sqrt(distSq) / maxDistance)
                // Optimized: score = MAX_SCORE * (1 - sqrt(distSq / maxDistanceSquared))
                const normalizedDist = Math.sqrt(distSq / maxDistanceSquared);
                const score = Math.max(0, MAX_SCORE * (1 - normalizedDist));
                
                scores[i] = score;
                totalScores[i] += score;
                
                // Track highest score for voter state
                if (score > maxScore) {
                    maxScore = score;
                    nearestCandidate = i;
                }
            }
            
            // Only calculate voter states if needed (Mode 1)
            if (!skipVoterStates) {
                // Determine voter color based on score distribution
                let voteColor;
                let preferredCandidate = nearestCandidate;
                
                // Check if all scores are equal (within small tolerance)
                const firstScore = scores[0];
                const allEqual = scores.every(s => Math.abs(s - firstScore) < 0.01);
                
                if (allEqual) {
                    // All candidates scored equally - grey (no preference)
                    voteColor = CONFIG.VOTER_GREY_COLOR;
                    
                } else {
                    // Check for single max score
                    const candidatesWithMaxScore = [];
                    for (let i = 0; i < scores.length; i++) {
                        if (Math.abs(scores[i] - maxScore) < 0.01) {
                            candidatesWithMaxScore.push(i);
                        }
                    }
                    
                    if (candidatesWithMaxScore.length === 1 && maxScore > 0) {
                        // Check if all others have score 0
                        const allOthersZero = scores.every((s, i) => 
                            i === candidatesWithMaxScore[0] || s < 0.01
                        );
                        
                        if (allOthersZero) {
                            // Pure preference for one candidate
                            voteColor = CONFIG.CANDIDATE_COLORS[candidatesWithMaxScore[0]];
                        } else {
                            // Proportional blend based on scores
                            const weights = {};
                            for (let i = 0; i < candidates.length; i++) {
                                weights[i] = scores[i];
                            }
                            voteColor = Utils.getProportionalColor(weights);
                        }
                    } else {
                        // Multiple candidates with same max score, or general distribution
                        // Use proportional blend
                        const weights = {};
                        for (let i = 0; i < candidates.length; i++) {
                            weights[i] = scores[i];
                        }
                        voteColor = Utils.getProportionalColor(weights);
                    }
                }
                
                voterStates.push({
                    voteColor: voteColor,
                    preferredCandidate: preferredCandidate,
                    scores: scores
                });
            }
        });
        
        // Determine winner (single pass - track max and ties together)
        let maxTotal = totalScores[0];
        let tiedCandidates = [0];
        
        for (let i = 1; i < totalScores.length; i++) {
            if (totalScores[i] > maxTotal) {
                maxTotal = totalScores[i];
                tiedCandidates = [i];
            } else if (Math.abs(totalScores[i] - maxTotal) < 0.01) {
                tiedCandidates.push(i);
            }
        }
        
        // Pick winner (random if tied)
        const winner = tiedCandidates.length > 1 ? Utils.randomChoice(tiedCandidates) : tiedCandidates[0];
        
        // Skip breakdown if not needed (Mode 2)
        const breakdown = skipVoterStates ? null : createScoreBreakdown(candidates, totalScores, voters.length);
        
        const results = {
            method: 'score',
            winner: winner,
            maxDistance: maxDistance,
            breakdown: breakdown,
            voterStates: voterStates
        };
        
        return results;
    }
    
    // Helper function to create score breakdown
    function createScoreBreakdown(candidates, totalScores, totalVoters) {
        const breakdown = candidates.map((candidate, index) => ({
            candidateId: index,
            name: candidate.name,
            totalScore: totalScores[index],
            averageScore: totalVoters > 0 ? (totalScores[index] / totalVoters) : 0
        }));
        
        // Sort breakdown by total score (descending)
        breakdown.sort((a, b) => b.totalScore - a.totalScore);
        
        return breakdown;
    } 
    
    // BORDA COUNT
    // Voters rank all candidates, points awarded by rank
    function runBorda(voters, candidates, skipVoterStates = false) {
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
            voterStates: skipVoterStates ? null : voters.map(voter => ({
                voteColor: CONFIG.CANDIDATE_COLORS[0],
                preferredCandidate: 0
            }))
        };
        
        return results;
    }
    
    // INSTANT RUNOFF VOTING (IRV)
    // Iteratively eliminate candidate with fewest votes
    function runIRV(voters, candidates, skipVoterStates = false) {
        const rounds = [];
        const totalVotes = voters.length;
        const majorityThreshold = totalVotes / 2;
        
        // Pre-calculate all voter preferences (rankings by distance) - done once upfront
        // Each voter gets an array of candidate IDs sorted by preference (nearest first)
        const voterRankings = voters.map(voter => {
            // Calculate squared distances to all candidates (no sqrt needed)
            const candidateDistances = candidates.map((candidate, index) => ({
                candidateId: index,
                distSq: Utils.distanceSquared(voter.x, voter.y, candidate.x, candidate.y)
            }));
            
            // Sort by distance (ascending) - nearest is most preferred
            candidateDistances.sort((a, b) => a.distSq - b.distSq);
            
            // Return just the candidate IDs in preference order
            return candidateDistances.map(cd => cd.candidateId);
        });
        
        // Track which candidates are still active (boolean array for O(1) lookup)
        const activeCandidates = new Array(candidates.length).fill(true);
        let activeCount = candidates.length;
        
        let roundNumber = 0;
        let winner = null;
        
        // Run elimination rounds until we have a winner
        while (winner === null && activeCount > 1) {
            roundNumber++;
            
            // Count first-choice votes among active candidates
            const voteCounts = new Array(candidates.length).fill(0);
            const roundVoterStates = skipVoterStates ? null : [];
            
            // Each voter votes for their top remaining choice
            voters.forEach((voter, voterIndex) => {
                // Find this voter's top choice among active candidates
                const rankings = voterRankings[voterIndex];
                let topChoice = null;
                
                // Scan rankings until we find an active candidate
                for (let i = 0; i < rankings.length; i++) {
                    const candidateId = rankings[i];
                    if (activeCandidates[candidateId]) {
                        topChoice = candidateId;
                        break;
                    }
                }
                
                // Record vote for top choice
                if (topChoice !== null) {
                    voteCounts[topChoice]++;
                    
                    // Store voter state only if needed (Mode 1)
                    if (!skipVoterStates) {
                        roundVoterStates.push({
                            voteColor: CONFIG.CANDIDATE_COLORS[topChoice],
                            preferredCandidate: topChoice
                        });
                    }
                }
            });
            
            // Find candidate with most votes (single pass)
            let maxVotes = 0;
            let maxCandidate = null;
            
            for (let i = 0; i < candidates.length; i++) {
                if (activeCandidates[i] && voteCounts[i] > maxVotes) {
                    maxVotes = voteCounts[i];
                    maxCandidate = i;
                }
            }
            
            // Create round breakdown (only if needed - Mode 2 optimization)
            const roundBreakdown = skipVoterStates ? null : candidates
                .map((candidate, index) => ({
                    candidateId: index,
                    name: candidate.name,
                    votes: voteCounts[index],
                    percentage: totalVotes > 0 ? ((voteCounts[index] / totalVotes) * 100).toFixed(1) : '0.0',
                    active: activeCandidates[index]
                }))
                .filter(c => c.active)
                .sort((a, b) => b.votes - a.votes);
            
            let eliminated = null;
            
            if (maxVotes > majorityThreshold) {
                // We have a winner with majority!
                winner = maxCandidate;
                
            } else if (activeCount === 2) {
                // Only 2 candidates left - highest vote count wins (even without majority)
                winner = maxCandidate;
                
            } else {
                // Find candidate(s) with fewest votes to eliminate (single pass)
                let minVotes = Infinity;
                const candidatesWithMinVotes = [];
                
                for (let i = 0; i < candidates.length; i++) {
                    if (activeCandidates[i]) {
                        if (voteCounts[i] < minVotes) {
                            minVotes = voteCounts[i];
                            candidatesWithMinVotes.length = 0; // Clear array efficiently
                            candidatesWithMinVotes.push(i);
                        } else if (voteCounts[i] === minVotes) {
                            candidatesWithMinVotes.push(i);
                        }
                    }
                }
                
                // If multiple candidates tied for last, pick one randomly
                eliminated = candidatesWithMinVotes.length > 1 
                    ? Utils.randomChoice(candidatesWithMinVotes) 
                    : candidatesWithMinVotes[0];
                
                // Eliminate the candidate
                activeCandidates[eliminated] = false;
                activeCount--;
            }
            
            // Store round data
            rounds.push({
                roundNumber: roundNumber,
                roundName: `Round ${roundNumber}`,
                eliminated: eliminated,
                breakdown: roundBreakdown,
                voterStates: roundVoterStates
            });
        }
        
        // Handle edge case: single candidate from start
        if (winner === null && activeCount === 1) {
            for (let i = 0; i < candidates.length; i++) {
                if (activeCandidates[i]) {
                    winner = i;
                    break;
                }
            }
        }
        
        return {
            method: 'irv',
            winner: winner,
            rounds: rounds
        };
    }
    
    // STAR VOTING (Score Then Automatic Runoff)
    // Score candidates 0-5, then runoff between top 2
    function runSTAR(voters, candidates, maxDistance, skipVoterStates = false) {
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
                    voterStates: skipVoterStates ? null : voters.map(voter => ({
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
                    voterStates: skipVoterStates ? null : voters.map(voter => ({
                        voteColor: CONFIG.CANDIDATE_COLORS[0],
                        preferredCandidate: 0
                    }))
                }
            ]
        };
        
        return results;
    }
    
    // Main function to run election based on current voting method
    function runElection(votingMethod, voters, candidates, params, skipVoterStates = false) {
        switch (votingMethod) {
            case 'plurality':
                return runPlurality(voters, candidates, skipVoterStates);
            
            case 'approval':
                return runApproval(voters, candidates, params.approvalRadius, params.approvalStrategy, skipVoterStates);
            
            case 'two-round':
                return runTwoRound(voters, candidates, skipVoterStates);
            
            case 'score':
                return runScore(voters, candidates, params.scoreMaxDistance, skipVoterStates);
            
            case 'borda':
                return runBorda(voters, candidates, skipVoterStates);
            
            case 'irv':
                return runIRV(voters, candidates, skipVoterStates);
            
            case 'star':
                return runSTAR(voters, candidates, params.starMaxDistance, skipVoterStates);
            
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