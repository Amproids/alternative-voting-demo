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
            voter.voteColor = this.calculateApprovalColor(
                approvedCandidates, 
                numCandidates, 
                isStrategic
            );
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

    // Calculate color for voter based on approved candidates
    calculateApprovalColor(approvedCandidates, numCandidates, isStrategic) {
        // If honest voting and approved ALL candidates: dark gray
        if (!isStrategic && approvedCandidates.length === numCandidates) {
            return '#444444'; // Dark gray
        }

        // If approved none: black (default)
        if (approvedCandidates.length === 0) {
            return '#000000';
        }

        // If approved only one: that candidate's color
        if (approvedCandidates.length === 1) {
            return this.candidateColors[approvedCandidates[0]];
        }

        // If approved multiple: blend the colors
        return this.blendColors(approvedCandidates.map(i => this.candidateColors[i]));
    }

    // Blend multiple colors together (average RGB values)
    blendColors(colors) {
        let r = 0, g = 0, b = 0;
        
        colors.forEach(color => {
            // Parse hex color
            const hex = color.replace('#', '');
            r += parseInt(hex.substr(0, 2), 16);
            g += parseInt(hex.substr(2, 2), 16);
            b += parseInt(hex.substr(4, 2), 16);
        });

        // Average
        r = Math.round(r / colors.length);
        g = Math.round(g / colors.length);
        b = Math.round(b / colors.length);

        // Convert back to hex
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    // TODO: Calculate Instant Runoff Voting (IRV)
    // Voters rank candidates by preference
    // If no candidate has majority, eliminate candidate with fewest first-choice votes
    // Redistribute their votes to next preferences
    // Repeat until someone has majority
    calculateIRV(voters, candidates, numCandidates) {
        // TODO: Implement IRV
        // For now, return placeholder results
        console.log('IRV voting not yet implemented');
        
        return {
            method: 'irv',
            rounds: [],
            candidateVotes: new Array(numCandidates).fill(0),
            totalVotes: voters.length,
            winner: null,
            eliminated: []
        };
    }

    // TODO: Calculate STAR Voting (Score Then Automatic Runoff)
    // Voters score candidates (0-5) based on distance
    // Top two candidates advance to automatic runoff
    // Winner is candidate preferred by more voters
    calculateSTAR(voters, candidates, numCandidates) {
        // TODO: Implement STAR voting
        // Score candidates based on distance (closer = higher score)
        // Take top 2 by total score
        // Run automatic runoff between top 2
        console.log('STAR voting not yet implemented');
        
        return {
            method: 'star',
            candidateScores: new Array(numCandidates).fill(0),
            totalVoters: voters.length,
            topTwo: [],
            runoffResults: null,
            winner: null
        };
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