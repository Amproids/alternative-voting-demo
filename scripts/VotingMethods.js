// VotingMethods.js
// Election calculation methods for different voting systems

class VotingMethods {
    constructor(config = {}) {
        this.candidateColors = config.candidateColors || ['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#00FFFF', '#FF00FF'];
    }

    // Calculate plurality voting (First Past the Post)
    // Each voter votes for their closest candidate
    // Candidate with most votes wins
    calculatePlurality(voters, candidates, numCandidates) {
        // Reset election results
        const results = {
            method: 'plurality',
            candidateVotes: new Array(numCandidates).fill(0),
            totalVotes: 0,
            winner: null
        };

        // Calculate each voter's preferred candidate (closest by Euclidean distance)
        voters.forEach(voter => {
            let closestCandidate = 0;
            let closestDistance = Infinity;

            for (let i = 0; i < numCandidates; i++) {
                const candidate = candidates[i];
                const dx = voter.x - candidate.x;
                const dy = voter.y - candidate.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestCandidate = i;
                }
            }

            voter.preferredCandidate = closestCandidate;
            voter.voteColor = this.candidateColors[closestCandidate];
            results.candidateVotes[closestCandidate]++;
            results.totalVotes++;
        });

        // Determine winner (candidate with most votes)
        let maxVotes = -1;
        let winner = 0;
        for (let i = 0; i < numCandidates; i++) {
            if (results.candidateVotes[i] > maxVotes) {
                maxVotes = results.candidateVotes[i];
                winner = i;
            }
        }
        results.winner = winner;

        return results;
    }

    // Calculate Approval Voting
    // Voters approve all candidates within a certain distance threshold
    // Candidate with most approvals wins
    calculateApproval(voters, candidates, numCandidates, approvalRadius, isStrategic) {
        const results = {
            method: 'approval',
            candidateApprovals: new Array(numCandidates).fill(0),
            totalVoters: voters.length,
            winner: null,
            approvalRadius: approvalRadius || 150
        };

        voters.forEach(voter => {
            // Calculate distances to all candidates
            const candidateDistances = [];
            for (let i = 0; i < numCandidates; i++) {
                const distance = this.calculateDistance(voter, candidates[i]);
                candidateDistances.push({ index: i, distance: distance });
            }

            // Find candidates within approval radius
            const withinRadius = candidateDistances.filter(c => c.distance <= approvalRadius);

            let approvedCandidates = [];

            if (isStrategic) {
                // Strategic voting
                if (withinRadius.length === numCandidates) {
                    // Approves ALL candidates: vote for all EXCEPT furthest (strategic exclusion)
                    withinRadius.sort((a, b) => a.distance - b.distance);
                    approvedCandidates = withinRadius.slice(0, -1).map(c => c.index);
                } else if (withinRadius.length > 0) {
                    // Approves SOME candidates: vote for all within radius (no exclusion)
                    approvedCandidates = withinRadius.map(c => c.index);
                } else {
                    // Approves NO candidates: vote for closest only (strategic inclusion)
                    candidateDistances.sort((a, b) => a.distance - b.distance);
                    approvedCandidates = [candidateDistances[0].index];
                }
            } else {
                // Honest voting
                if (withinRadius.length > 0) {
                    approvedCandidates = withinRadius.map(c => c.index);
                }
                // If none in radius, vote for none (approvedCandidates stays empty)
            }

            // Record approvals
            approvedCandidates.forEach(index => {
                results.candidateApprovals[index]++;
            });

            // Store voter's approved candidates for color mixing
            voter.approvedCandidates = approvedCandidates;
            
            // Calculate voter color based on approved candidates
            if (approvedCandidates.length === numCandidates) {
                // Approved all candidates: grey
                voter.voteColor = '#808080';
            } else if (approvedCandidates.length === 0) {
                // Approved none: black
                voter.voteColor = '#000000';
            } else if (approvedCandidates.length === 1) {
                // Approved one: that candidate's color
                voter.voteColor = this.candidateColors[approvedCandidates[0]];
            } else {
                // Approved multiple: blend with equal weights
                const colors = approvedCandidates.map(i => this.candidateColors[i]);
                const weights = new Array(approvedCandidates.length).fill(1);
                voter.voteColor = this.blendColors(colors, weights);
            }
        });

        // Determine winner (candidate with most approvals)
        let maxApprovals = -1;
        let winner = 0;
        for (let i = 0; i < numCandidates; i++) {
            if (results.candidateApprovals[i] > maxApprovals) {
                maxApprovals = results.candidateApprovals[i];
                winner = i;
            }
        }
        results.winner = winner;

        return results;
    }

    // Blend multiple colors together with weights (weighted average of RGB values)
    blendColors(colors, weights = null) {
        if (colors.length === 0) {
            return '#000000';
        }
        
        // If no weights provided, use equal weights
        if (!weights) {
            weights = new Array(colors.length).fill(1);
        }
        
        // Filter out colors with zero weight
        const validIndices = weights.map((w, i) => ({ w, i }))
            .filter(item => item.w > 0);
        
        if (validIndices.length === 0) {
            return '#000000'; // No colors to blend
        }
        
        let r = 0, g = 0, b = 0;
        let totalWeight = 0;
        
        validIndices.forEach(item => {
            const color = colors[item.i];
            const weight = item.w;
            
            // Parse hex color
            const hex = color.replace('#', '');
            r += parseInt(hex.substr(0, 2), 16) * weight;
            g += parseInt(hex.substr(2, 2), 16) * weight;
            b += parseInt(hex.substr(4, 2), 16) * weight;
            
            totalWeight += weight;
        });

        // Weighted average
        r = Math.round(r / totalWeight);
        g = Math.round(g / totalWeight);
        b = Math.round(b / totalWeight);

        // Convert back to hex
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    // Calculate Instant Runoff Voting (IRV)
    // Voters rank candidates by preference
    // If no candidate has majority, eliminate candidate with fewest first-choice votes
    // Redistribute their votes to next preferences
    // Repeat until someone has majority
    calculateIRV(voters, candidates, numCandidates) {
        const results = {
            method: 'irv',
            rounds: [],
            totalVotes: voters.length,
            winner: null,
            eliminated: []
        };

        // Get each voter's ranked preferences (by distance)
        const voterPreferences = voters.map(voter => ({
            voter: voter,
            preferences: this.getRankedPreferences(voter, candidates, numCandidates)
        }));

        // Track which candidates are still active
        const activeCandidates = new Array(numCandidates).fill(true);
        let roundNumber = 0;

        while (true) {
            roundNumber++;
            const roundVotes = new Array(numCandidates).fill(0);
            
            // Count votes for each active candidate based on highest-ranked active preference
            voterPreferences.forEach(vp => {
                // Find first active candidate in this voter's preference list
                for (let i = 0; i < vp.preferences.length; i++) {
                    const candidateIndex = vp.preferences[i];
                    if (activeCandidates[candidateIndex]) {
                        roundVotes[candidateIndex]++;
                        vp.voter.preferredCandidate = candidateIndex;
                        vp.voter.voteColor = this.candidateColors[candidateIndex];
                        break;
                    }
                }
            });

            // Store round results including voter states
            const activeCount = activeCandidates.filter(a => a).length;
            const voterStates = voterPreferences.map(vp => ({
                voterId: vp.voter,
                currentVote: vp.voter.preferredCandidate,
                voteColor: vp.voter.voteColor
            }));
            
            results.rounds.push({
                round: roundNumber,
                votes: [...roundVotes],
                activeCandidates: [...activeCandidates],
                activeCount: activeCount,
                voterStates: voterStates
            });

            // Check for majority winner (>50% of total votes)
            const majority = voters.length / 2;
            for (let i = 0; i < numCandidates; i++) {
                if (activeCandidates[i] && roundVotes[i] > majority) {
                    results.winner = i;
                    return results;
                }
            }

            // If only one candidate remains, they win
            if (activeCount === 1) {
                for (let i = 0; i < numCandidates; i++) {
                    if (activeCandidates[i]) {
                        results.winner = i;
                        return results;
                    }
                }
            }

            // Find candidate(s) with fewest votes to eliminate
            let minVotes = Infinity;
            let candidatesToEliminate = [];
            
            for (let i = 0; i < numCandidates; i++) {
                if (activeCandidates[i]) {
                    if (roundVotes[i] < minVotes) {
                        minVotes = roundVotes[i];
                        candidatesToEliminate = [i];
                    } else if (roundVotes[i] === minVotes) {
                        candidatesToEliminate.push(i);
                    }
                }
            }

            // Eliminate candidate(s) with fewest votes
            candidatesToEliminate.forEach(candidateIndex => {
                activeCandidates[candidateIndex] = false;
                results.eliminated.push({
                    candidateIndex: candidateIndex,
                    round: roundNumber,
                    votes: roundVotes[candidateIndex]
                });
            });
        }
    }

    // Calculate STAR Voting (Score Then Automatic Runoff)
    // Voters score candidates (0-5) based on distance
    // Top two candidates advance to automatic runoff
    // Winner is candidate preferred by more voters
    calculateSTAR(voters, candidates, numCandidates, maxDistance = 500) {
        const results = {
            method: 'star',
            rounds: [],
            candidateScores: new Array(numCandidates).fill(0),
            totalVoters: voters.length,
            maxDistance: maxDistance,
            topTwo: [],
            winner: null
        };

        // Calculate each voter's scores for all candidates
        const voterScores = voters.map(voter => {
            const scores = [];
            for (let i = 0; i < numCandidates; i++) {
                const distance = this.calculateDistance(voter, candidates[i]);
                const score = this.distanceToScore(distance, maxDistance);
                scores.push(score);
            }
            return { voter: voter, scores: scores };
        });

        // ROUND 1: Scoring Round
        // Sum all scores for each candidate
        voterScores.forEach(vs => {
            vs.scores.forEach((score, candidateIndex) => {
                results.candidateScores[candidateIndex] += score;
            });
            
            // Color voter by weighted blend of all scores
            const colors = [];
            const weights = [];
            for (let i = 0; i < numCandidates; i++) {
                if (vs.scores[i] > 0) {
                    colors.push(this.candidateColors[i]);
                    weights.push(vs.scores[i]);
                }
            }
            
            if (colors.length > 0) {
                vs.voter.voteColor = this.blendColors(colors, weights);
            } else {
                vs.voter.voteColor = '#000000'; // No scores given
            }
            
            vs.voter.preferredCandidate = null; // Will be set in runoff
        });

        // Store scoring round voter states
        const scoringVoterStates = voterScores.map(vs => ({
            voterId: vs.voter,
            scores: [...vs.scores],
            voteColor: vs.voter.voteColor
        }));

        results.rounds.push({
            round: 1,
            name: 'Scoring Round',
            scores: [...results.candidateScores],
            voterStates: scoringVoterStates
        });

        // Find top two candidates by total score
        const candidateScorePairs = results.candidateScores.map((score, index) => ({
            index: index,
            score: score
        }));
        candidateScorePairs.sort((a, b) => b.score - a.score);
        
        const finalist1 = candidateScorePairs[0].index;
        const finalist2 = candidateScorePairs[1].index;
        results.topTwo = [finalist1, finalist2];

        // ROUND 2: Automatic Runoff
        // Count how many voters prefer each finalist
        let finalist1Votes = 0;
        let finalist2Votes = 0;
        let tiedVotes = 0;

        voterScores.forEach(vs => {
            const score1 = vs.scores[finalist1];
            const score2 = vs.scores[finalist2];

            if (score1 > score2) {
                finalist1Votes++;
                vs.voter.preferredCandidate = finalist1;
                vs.voter.voteColor = this.candidateColors[finalist1];
            } else if (score2 > score1) {
                finalist2Votes++;
                vs.voter.preferredCandidate = finalist2;
                vs.voter.voteColor = this.candidateColors[finalist2];
            } else {
                // Tied - scored them the same
                tiedVotes++;
                vs.voter.preferredCandidate = null;
                vs.voter.voteColor = '#808080'; // Grey for tied
            }
        });

        // Store runoff round voter states
        const runoffVoterStates = voterScores.map(vs => ({
            voterId: vs.voter,
            currentVote: vs.voter.preferredCandidate,
            voteColor: vs.voter.voteColor
        }));

        // Determine winner
        const runoffResults = {
            finalist1: finalist1,
            finalist2: finalist2,
            finalist1Votes: finalist1Votes,
            finalist2Votes: finalist2Votes,
            tiedVotes: tiedVotes
        };

        if (finalist1Votes > finalist2Votes) {
            results.winner = finalist1;
        } else if (finalist2Votes > finalist1Votes) {
            results.winner = finalist2;
        } else {
            // Tie in runoff - use total scores as tiebreaker
            results.winner = results.candidateScores[finalist1] >= results.candidateScores[finalist2] ? 
                finalist1 : finalist2;
        }

        results.rounds.push({
            round: 2,
            name: 'Automatic Runoff',
            runoffResults: runoffResults,
            voterStates: runoffVoterStates
        });

        return results;
    }

    // Helper: Convert distance to STAR score (0-5)
    // Score ranges: 5 stars (0-100), 4 stars (100-200), 3 stars (200-300), 
    //               2 stars (300-400), 1 star (400-500), 0 stars (>500)
    distanceToScore(distance, maxDistance = 500) {
        const ringSize = maxDistance / 5;
        
        if (distance <= ringSize) return 5;
        if (distance <= ringSize * 2) return 4;
        if (distance <= ringSize * 3) return 3;
        if (distance <= ringSize * 4) return 2;
        if (distance <= ringSize * 5) return 1;
        return 0;
    }

    // TODO: Calculate Ranked Choice Voting (similar to IRV but different counting)
    calculateRankedChoice(voters, candidates, numCandidates) {
        // TODO: Implement if needed (may be same as IRV)
        console.log('Ranked Choice voting not yet implemented');
        
        return {
            method: 'ranked-choice',
            candidateVotes: new Array(numCandidates).fill(0),
            totalVotes: voters.length,
            winner: null
        };
    }

    // TODO: Calculate Borda Count
    // Voters rank all candidates
    // Points awarded based on ranking position
    // Candidate with most points wins
    calculateBorda(voters, candidates, numCandidates) {
        // TODO: Implement Borda Count
        console.log('Borda Count not yet implemented');
        
        return {
            method: 'borda',
            candidatePoints: new Array(numCandidates).fill(0),
            totalVoters: voters.length,
            winner: null
        };
    }

    // Helper: Calculate distance between voter and candidate
    calculateDistance(voter, candidate) {
        const dx = voter.x - candidate.x;
        const dy = voter.y - candidate.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Helper: Get voter's ranked preferences by distance
    getRankedPreferences(voter, candidates, numCandidates) {
        const preferences = [];
        
        for (let i = 0; i < numCandidates; i++) {
            const distance = this.calculateDistance(voter, candidates[i]);
            preferences.push({ candidateIndex: i, distance: distance });
        }
        
        // Sort by distance (closest first)
        preferences.sort((a, b) => a.distance - b.distance);
        
        return preferences.map(p => p.candidateIndex);
    }

    // Helper: Reset voter colors to default
    resetVoterColors(voters, defaultColor) {
        voters.forEach(voter => {
            voter.voteColor = defaultColor;
            voter.preferredCandidate = null;
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VotingMethods;
}