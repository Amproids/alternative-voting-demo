const config = {
    CANVAS_SIZE: 600,
    GRID_SPACING: 30,
    POINT_COUNT: 5000,
    STD_DEV: 200,
    VOTER_SIZE: 2,
    CONTROL_SIZE: 7,
    APPROVAL_RADIUS: 150,
    MARGIN: 200,
    STAR_RADII: [400, 320, 240, 160, 80, 40],  // Radii for scores 0-5
    STAR_OPACITY: 0.1,  // Opacity for the scoring rings
};

const PARTY_COLORS = ['red', 'blue', 'lime', 'yellow', 'cyan', 'magenta'];

class ElectionVisualizer {
    constructor() {
        this.canvas = document.getElementById('electionCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        
        this.candidates = [];
        this.voters = [];
        this.voterOffsets = [];
        this.center = { x: 0, y: 0 };
        this.numCandidates = 2;
        
        this.isDragging = false;
        this.dragTarget = null;
        
        this.setupEventListeners();
        this.regenerateElection();
        // Add requestAnimationFrame handling
        this.animationFrameId = null;
        this.isUpdatePending = false;
    }

    scheduleUpdate() {
        if (!this.isUpdatePending) {
            this.isUpdatePending = true;
            this.animationFrameId = requestAnimationFrame(() => {
                this.drawAll();
                this.isUpdatePending = false;
            });
        }
    }
    
    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        
        // Set display size
        this.canvas.style.width = `${config.CANVAS_SIZE}px`;
        this.canvas.style.height = `${config.CANVAS_SIZE}px`;
        
        // Set actual size in memory
        this.canvas.width = config.CANVAS_SIZE * dpr;
        this.canvas.height = config.CANVAS_SIZE * dpr;
        
        // Scale context to match DPR
        this.ctx.scale(dpr, dpr);
        this.ctx.imageSmoothingEnabled = false;
    }
    
setupEventListeners() {
    // Canvas event listeners
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    
    // Button event listeners
    document.getElementById('newElection').addEventListener('click', () => this.regenerateElection());
    document.getElementById('tabulateButton').addEventListener('click', () => this.tabulateVotes());
    document.getElementById('hexagonLayout').addEventListener('click', () => this.setHexagonLayout());
    
    // Slider event listener
    document.getElementById('candidateSlider').addEventListener('input', (e) => {
        this.numCandidates = parseInt(e.target.value);
        document.getElementById('candidateCount').textContent = this.numCandidates;
        this.drawAll();
    });

    // Radio button event listeners
    document.querySelectorAll('input[name="electionType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.getElementById('approvalOptions').style.display = 
                e.target.value === 'approval' ? 'block' : 'none';
            this.tabulateVotes();
        });
    });

    document.querySelectorAll('input[name="distributionType"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const currentCenter = this.center;
            this.generateDistribution();
            this.center = currentCenter;
            this.updateVoterPositions();
            this.tabulateVotes();
        });
    });
}

    setHexagonLayout() {
        // Calculate radius for the hexagon - make it about 1/4 of the canvas size
        const radius = config.CANVAS_SIZE / 4;
        
        // Calculate center point of the canvas
        const centerX = config.CANVAS_SIZE / 2;
        const centerY = config.CANVAS_SIZE / 2;
        
        // Set the voter distribution center to the middle
        this.center = {
            x: centerX,
            y: centerY
        };
        
        // Define the order of colors starting from top going clockwise:
        // magenta(5), red(0), yellow(2), green(3), cyan(4), blue(1)
        const colorOrder = [0, 1, 2, 3, 4, 5];  // Indices from PARTY_COLORS
        
        // Position 6 candidates in a regular hexagon
        for (let i = 0; i < 6; i++) {
            // Calculate angle for each point (60 degrees apart, starting from top)
            const angle = (i * Math.PI / 3) - (Math.PI / 2);  // Start from -90° (top)
            
            // Calculate position
            this.candidates[colorOrder[i]] = {
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle)
            };
        }
        
        // Update the number of candidates to show all 6
        this.numCandidates = 6;
        document.getElementById('candidateSlider').value = '6';
        document.getElementById('candidateCount').textContent = '6';
        
        // Update voter positions based on new center
        this.updateVoterPositions();
        
        // Redraw and recalculate votes
        this.drawAll();
        this.tabulateVotes();
    }
    
    normalRandom(mean, stdDev) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        return z0 * stdDev + mean;
    }
    
    generateRandomPositions() {
        this.candidates = Array.from({ length: 6 }, () => ({
            x: Math.random() * (config.CANVAS_SIZE - 2 * config.MARGIN) + config.MARGIN,
            y: Math.random() * (config.CANVAS_SIZE - 2 * config.MARGIN) + config.MARGIN,
        }));
        
        this.center = {
            x: Math.random() * (config.CANVAS_SIZE - 2 * config.MARGIN) + config.MARGIN,
            y: Math.random() * (config.CANVAS_SIZE - 2 * config.MARGIN) + config.MARGIN,
        };
    }
    
    generateDistribution() {
        const distributionType = document.querySelector('input[name="distributionType"]:checked').value;
        
        if (distributionType === 'gaussian') {
            // Existing Gaussian distribution
            this.voterOffsets = Array.from({ length: config.POINT_COUNT }, () => ({
                x: this.normalRandom(0, config.STD_DEV),
                y: this.normalRandom(0, config.STD_DEV)
            }));
        } else {
            // Uniform random distribution within a circle
            const radius = config.STD_DEV * 2; // Use a larger radius for uniform distribution
            this.voterOffsets = Array.from({ length: config.POINT_COUNT }, () => {
                // Generate random point in a circle using rejection sampling
                while (true) {
                    const x = (Math.random() * 2 - 1) * radius;
                    const y = (Math.random() * 2 - 1) * radius;
                    // Check if point is within circle
                    if (x*x + y*y <= radius*radius) {
                        return { x, y };
                    }
                }
            });
        }
        
        this.voters = this.voterOffsets.map(offset => ({
            x: this.center.x + offset.x,
            y: this.center.y + offset.y,
            color: 'gray'
        }));
    }
    
    updateVoterPositions() {
        this.voters = this.voterOffsets.map(offset => ({
            x: this.center.x + offset.x,
            y: this.center.y + offset.y,
            color: this.voters[0]?.color || 'gray'
        }));
        this.scheduleUpdate();
    }
    
    drawGrid() {
        this.ctx.strokeStyle = '#666666';
        this.ctx.lineWidth = 0.5;
        
        for (let x = 0; x <= config.CANVAS_SIZE; x += config.GRID_SPACING) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, config.CANVAS_SIZE);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= config.CANVAS_SIZE; y += config.GRID_SPACING) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(config.CANVAS_SIZE, y);
            this.ctx.stroke();
        }
    }
    
    drawAxes() {
        const mid = config.CANVAS_SIZE / 2;
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1.5;
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, mid);
        this.ctx.lineTo(config.CANVAS_SIZE, mid);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(mid, 0);
        this.ctx.lineTo(mid, config.CANVAS_SIZE);
        this.ctx.stroke();
    }
    
    drawVoters() {
        this.voters.forEach(voter => {
            this.ctx.fillStyle = voter.color;
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 0.5;
            this.ctx.beginPath();
            this.ctx.arc(voter.x, voter.y, config.VOTER_SIZE, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.stroke();
        });

        this.ctx.fillStyle = 'black';
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(this.center.x, this.center.y, config.CONTROL_SIZE, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();
    }
    
    drawCandidates() {
        const electionType = document.querySelector('input[name="electionType"]:checked').value;
        
        this.candidates.slice(0, this.numCandidates).forEach((candidate, i) => {
            if (electionType === 'star') {
                // Draw scoring rings
                config.STAR_RADII.forEach((radius, score) => {
                    this.ctx.strokeStyle = PARTY_COLORS[i];
                    this.ctx.fillStyle = PARTY_COLORS[i];
                    this.ctx.globalAlpha = config.STAR_OPACITY;
                    this.ctx.beginPath();
                    this.ctx.arc(candidate.x, candidate.y, radius, 0, 2 * Math.PI);
                    this.ctx.fill();
                    this.ctx.globalAlpha = 1;
                });
            } else if (electionType === 'approval') {
                // Draw approval radius
                this.ctx.strokeStyle = PARTY_COLORS[i];
                this.ctx.lineWidth = 1.5;
                this.ctx.beginPath();
                this.ctx.arc(candidate.x, candidate.y, config.APPROVAL_RADIUS, 0, 2 * Math.PI);
                this.ctx.stroke();
            }

            // Draw candidate dot
            this.ctx.fillStyle = PARTY_COLORS[i];
            this.ctx.strokeStyle = '#333333';
            this.ctx.beginPath();
            this.ctx.arc(candidate.x, candidate.y, config.CONTROL_SIZE, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.stroke();
        });
    }
    
    drawAll() {
        if (this.ctx) {
            this.ctx.clearRect(0, 0, config.CANVAS_SIZE, config.CANVAS_SIZE);
            this.drawGrid();
            this.drawAxes();
            this.drawVoters();
            this.drawCandidates();
        }
    }
    
    getClickedObject(x, y) {
        const centerDist = Math.sqrt(
            Math.pow(x - this.center.x, 2) + Math.pow(y - this.center.y, 2)
        );
        if (centerDist <= config.CONTROL_SIZE) {
            return { type: 'center' };
        }
        
        for (let i = 0; i < this.numCandidates; i++) {
            const candidateDist = Math.sqrt(
                Math.pow(x - this.candidates[i].x, 2) + 
                Math.pow(y - this.candidates[i].y, 2)
            );
            if (candidateDist <= config.CONTROL_SIZE) {
                return { type: 'candidate', index: i };
            }
        }
        
        return null;
    }
    
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scale = config.CANVAS_SIZE / rect.width;
        const x = (e.clientX - rect.left) * scale;
        const y = (e.clientY - rect.top) * scale;
        
        const clickedObject = this.getClickedObject(x, y);
        if (clickedObject) {
            this.isDragging = true;
            this.dragTarget = clickedObject;
        }
    }
    
    handleMouseMove(e) {
        if (!this.isDragging || !this.dragTarget) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const scale = config.CANVAS_SIZE / rect.width;
        const x = (e.clientX - rect.left) * scale;
        const y = (e.clientY - rect.top) * scale;
        
        if (this.dragTarget.type === 'center') {
            this.center = { x, y };
            this.updateVoterPositions();
            this.tabulateVotes(); // Add this line
        } else if (this.dragTarget.type === 'candidate') {
            this.candidates[this.dragTarget.index] = { x, y };
            this.drawAll();
            this.tabulateVotes(); // Add this line
        }
    }
    
    handleMouseUp() {
        this.isDragging = false;
        this.dragTarget = null;
    }
    
    tabulateVotes() {
        const electionType = document.querySelector('input[name="electionType"]:checked').value;
        document.getElementById('results').innerHTML = '';
        
        switch(electionType) {
            case 'plurality':
                this.tabulatePlurality();
                break;
            case 'instant_runoff':
                this.tabulateInstantRunoff();
                break;
            case 'approval':
                this.tabulateApproval();
                break;
            case 'star':
                this.tabulateSTAR();
                break;
        }
    }

    tabulatePlurality() {
        const tally = new Array(this.numCandidates).fill(0);
        
        // Create a throttled results update function if it doesn't exist
        if (!this._throttledUpdate) {
            this._throttledUpdate = this.throttle((results, winner) => {
                document.getElementById('results').innerHTML = 
                    `${results}<br><br><strong>Winner: ${winner}</strong>`;
            }, 50);
        }
        
        this.voters = this.voters.map(voter => {
            const distances = this.candidates
                .slice(0, this.numCandidates)
                .map(candidate => {
                    const dx = candidate.x - voter.x;
                    const dy = candidate.y - voter.y;
                    return Math.sqrt(dx * dx + dy * dy);
                });
            const closestCandidate = distances.indexOf(Math.min(...distances));
            tally[closestCandidate]++;
            return { ...voter, color: PARTY_COLORS[closestCandidate] };
        });

        const winnerIndex = tally.indexOf(Math.max(...tally));
        const results = tally
            .map((count, i) => `${PARTY_COLORS[i]}: ${count} (${((count/config.POINT_COUNT)*100).toFixed(1)}%)`)
            .join('<br>');
        
        this._throttledUpdate(results, PARTY_COLORS[winnerIndex]);
        this.drawAll();
    }

    tabulateInstantRunoff() {
        let remainingCandidates = Array.from({ length: this.numCandidates }, (_, i) => i);
        let round = 1;
        let resultsHTML = '';
        
        // Calculate full preference rankings for each voter
        const voterPreferences = this.voters.map(voter => {
            const distances = this.candidates
                .slice(0, this.numCandidates)
                .map((candidate, idx) => {
                    const dx = candidate.x - voter.x;
                    const dy = candidate.y - voter.y;
                    return { 
                        distance: Math.sqrt(dx * dx + dy * dy),
                        candidateIndex: idx 
                    };
                })
                .sort((a, b) => a.distance - b.distance)
                .map(item => item.candidateIndex);
            return distances;
        });

        while (remainingCandidates.length > 1) {
            // Count first preferences
            const tally = new Array(this.numCandidates).fill(0);
            
            voterPreferences.forEach(preferences => {
                // Find the first preference that's still in the race
                const firstChoice = preferences.find(p => remainingCandidates.includes(p));
                if (firstChoice !== undefined) {
                    tally[firstChoice]++;
                }
            });

            // Calculate percentages for remaining candidates
            const totalVotes = remainingCandidates.reduce((sum, i) => sum + tally[i], 0);
            const percentages = tally.map(votes => (votes / totalVotes) * 100);

            // Add round results to display
            resultsHTML += `<strong>Round ${round}:</strong><br>`;
            remainingCandidates.forEach(i => {
                resultsHTML += `${PARTY_COLORS[i]}: ${tally[i]} (${percentages[i].toFixed(1)}%)<br>`;
            });
            resultsHTML += '<br>';

            // Check for majority winner
            const leader = remainingCandidates.reduce((a, b) => tally[a] > tally[b] ? a : b);
            if (tally[leader] > totalVotes / 2) {
                // Color voters based on their current first preference
                this.voters = this.voters.map((voter, i) => ({
                    ...voter,
                    color: PARTY_COLORS[voterPreferences[i].find(p => remainingCandidates.includes(p))]
                }));
                
                resultsHTML += `<strong>Winner: ${PARTY_COLORS[leader]}</strong>`;
                document.getElementById('results').innerHTML = resultsHTML;
                this.drawAll();
                return;
            }

            // Eliminate candidate with fewest votes
            const loser = remainingCandidates.reduce((a, b) => tally[a] < tally[b] ? a : b);
            remainingCandidates = remainingCandidates.filter(c => c !== loser);
            resultsHTML += `Eliminated: ${PARTY_COLORS[loser]}<br><br>`;
            
            round++;
        }

        // Color voters based on their final preference
        this.voters = this.voters.map((voter, i) => ({
            ...voter,
            color: PARTY_COLORS[voterPreferences[i].find(p => remainingCandidates.includes(p))]
        }));

        if (remainingCandidates.length === 1) {
            resultsHTML += `<strong>Winner: ${PARTY_COLORS[remainingCandidates[0]]}</strong>`;
        }
        
        document.getElementById('results').innerHTML = resultsHTML;
        this.drawAll();
    }
    
    tabulateApproval() {
        const approvalType = document.querySelector('input[name="approvalType"]:checked').value;
        const tally = new Array(this.numCandidates).fill(0);
        
        // Calculate distances and approvals for each voter
        this.voters = this.voters.map(voter => {
            const distances = this.candidates
                .slice(0, this.numCandidates)
                .map((candidate, idx) => {
                    const dx = candidate.x - voter.x;
                    const dy = candidate.y - voter.y;
                    return {
                        distance: Math.sqrt(dx * dx + dy * dy),
                        candidateIndex: idx
                    };
                });
            
            // Set voter color based on approval type
            const approvedCandidates = this.getApprovedCandidates(distances, approvalType);
            const voterColor = this.getVoterColor(approvedCandidates);
            
            // Update tally
            approvedCandidates.forEach(candidateIndex => {
                tally[candidateIndex]++;
            });

            return { ...voter, color: voterColor };
        });

        this.displayApprovalResults(tally);
        this.drawAll();
    }

    getApprovedCandidates(distances, approvalType) {
        const approvedCandidates = new Set();
        
        if (approvalType === 'honest') {
            // Simply approve everyone within radius
            distances.forEach(({ distance, candidateIndex }) => {
                if (distance <= config.APPROVAL_RADIUS) {
                    approvedCandidates.add(candidateIndex);
                }
            });
        } else if (approvalType === 'strategic') {
            const withinRadius = distances.filter(d => d.distance <= config.APPROVAL_RADIUS);
            
            if (withinRadius.length === this.numCandidates) {
                // If ALL candidates are in range, approve all except least favorite (furthest)
                const furthest = withinRadius.reduce((max, curr) => 
                    curr.distance > max.distance ? curr : max
                );
                withinRadius
                    .filter(d => d.candidateIndex !== furthest.candidateIndex)
                    .forEach(({ candidateIndex }) => approvedCandidates.add(candidateIndex));
            } else if (withinRadius.length > 0) {
                // If any candidates in range (but not all), approve all of them
                withinRadius.forEach(({ candidateIndex }) => {
                    approvedCandidates.add(candidateIndex);
                });
            } else {
                // If no candidates in range, vote for closest
                const closest = distances.reduce((min, curr) => 
                    curr.distance < min.distance ? curr : min
                );
                approvedCandidates.add(closest.candidateIndex);
            }
        }
        
        return approvedCandidates;
    }

    tabulateSTAR() {
        const scores = new Array(this.numCandidates).fill(0);
        const voterScores = [];
        
        // Calculate scores for each voter
        this.voters = this.voters.map(voter => {
            const candidateScores = this.candidates
                .slice(0, this.numCandidates)
                .map((candidate, idx) => {
                    const dx = candidate.x - voter.x;
                    const dy = candidate.y - voter.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Convert distance to score (5-0)
                    let score = 5;
                    for (let i = 0; i < config.STAR_RADII.length; i++) {
                        if (distance > config.STAR_RADII[i]) {
                            score = i;
                            break;
                        }
                    }
                    
                    scores[idx] += score;
                    return { candidateIndex: idx, score };
                });
            
            voterScores.push(candidateScores);
            
            // Color voter based on their highest scored candidate(s)
            const maxScore = Math.max(...candidateScores.map(c => c.score));
            const topCandidates = candidateScores
                .filter(c => c.score === maxScore)
                .map(c => c.candidateIndex);
            
            return {
                ...voter,
                color: topCandidates.length === 1 ? 
                    PARTY_COLORS[topCandidates[0]] : 
                    this.blendColors(topCandidates.map(i => PARTY_COLORS[i]))
            };
        });

        // Find top two candidates
        const averageScores = scores.map(s => s / config.POINT_COUNT);
        const sortedCandidates = averageScores
            .map((score, idx) => ({ score, idx }))
            .sort((a, b) => b.score - a.score);
        
        const finalists = sortedCandidates.slice(0, 2).map(c => c.idx);
        
        // Runoff between top two
        let runoffTally = [0, 0];
        voterScores.forEach(scores => {
            const finalist1Score = scores.find(s => s.candidateIndex === finalists[0]).score;
            const finalist2Score = scores.find(s => s.candidateIndex === finalists[1]).score;
            if (finalist1Score > finalist2Score) runoffTally[0]++;
            if (finalist2Score > finalist1Score) runoffTally[1]++;
        });

            // Display results in stages
        let resultsHTML = '<strong>STAR Voting Results</strong><br><br>';
        
        // Stage 1: Score totals
        resultsHTML += '<div id="scoring-stage">';
        resultsHTML += '<strong>Total Scores:</strong><br>';
        
        // Find max score for scaling the bars
        const maxTotalScore = Math.max(...scores);
        
        scores.forEach((score, i) => {
            const percentage = (score / maxTotalScore) * 100;
            resultsHTML += `
                <div style="margin: 10px 0;">
                    ${PARTY_COLORS[i]}:<br>
                    <div class="score-bar-container">
                        <div class="score-bar" 
                            style="width: ${percentage}%; background-color: ${PARTY_COLORS[i]};">
                        </div>
                    </div>
                    ${score} (${(score/(config.POINT_COUNT * 5) * 100).toFixed(1)}%)
                </div>`;
        });
        resultsHTML += '</div>';

        // Stage 2: Runoff (initially hidden)
        resultsHTML += '<div id="runoff-stage" class="runoff-stage">';
        resultsHTML += '<strong>Runoff between top two scorers:</strong><br>';
        
        const totalRunoffVotes = runoffTally[0] + runoffTally[1];
        const runoffPercentages = runoffTally.map(votes => 
            (votes/totalRunoffVotes * 100).toFixed(1));
        
        [0, 1].forEach(i => {
            resultsHTML += `
                <div style="margin: 10px 0;">
                    ${PARTY_COLORS[finalists[i]]}:<br>
                    <div class="score-bar-container">
                        <div class="score-bar" 
                            style="width: ${runoffPercentages[i]}%; background-color: ${PARTY_COLORS[finalists[i]]};">
                        </div>
                    </div>
                    ${runoffTally[i]} votes (${runoffPercentages[i]}%)
                </div>`;
        });

        const winner = runoffTally[0] > runoffTally[1] ? finalists[0] : finalists[1];
        resultsHTML += `<br><strong>Winner: ${PARTY_COLORS[winner]}</strong>`;
        resultsHTML += '</div>';
        
        document.getElementById('results').innerHTML = resultsHTML;

        // Show runoff stage after a delay
        setTimeout(() => {
            const runoffStage = document.getElementById('runoff-stage');
            if (runoffStage) {
                runoffStage.classList.add('show-stage');
            }
        }, 1000);

        this.drawAll();
    }

    getVoterColor(approvedCandidates) {
        if (approvedCandidates.size === 0) {
            return 'gray';
        } else if (approvedCandidates.size === 1) {
            // If only one approval, use that candidate's color
            return PARTY_COLORS[[...approvedCandidates][0]];
        } else {
            // Blend the colors of all approved candidates
            return this.blendColors([...approvedCandidates].map(i => PARTY_COLORS[i]));
        }
    }

    hexToRgb(hex) {
        // Convert shorthand hex (#RGB) to full hex (#RRGGBB)
        if (hex.length === 4) {
            hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        }
        
        const r = parseInt(hex.substring(1, 3), 16);
        const g = parseInt(hex.substring(3, 5), 16);
        const b = parseInt(hex.substring(5, 7), 16);
        return [r, g, b];
    }

    blendColors(colors) {
        // Convert special color names to hex
        const colorMap = {
            'red': '#FF0000',
            'blue': '#0000FF',
            'lime': '#00FF00',  
            'yellow': '#FFFF00',
            'cyan': '#00FFFF',
            'magenta': '#FF00FF'
        };

        // Convert colors to RGB arrays
        const rgbColors = colors.map(color => 
            this.hexToRgb(colorMap[color] || color)
        );
        
        // Average the RGB values
        const blended = rgbColors.reduce(
            (acc, [r, g, b]) => [acc[0] + r, acc[1] + g, acc[2] + b],
            [0, 0, 0]
        ).map(sum => Math.round(sum / colors.length));
        
        return `rgb(${blended[0]}, ${blended[1]}, ${blended[2]})`;
    }

    displayApprovalResults(tally) {
        const totalVoters = config.POINT_COUNT;
        const winnerIndex = tally.indexOf(Math.max(...tally));
        const approvalType = document.querySelector('input[name="approvalType"]:checked').value;
        
        let resultsHTML = '<strong>Approval Voting Results</strong><br>';
        resultsHTML += `<em>${approvalType.charAt(0).toUpperCase() + approvalType.slice(1)} Voting</em><br><br>`;
        
        tally.forEach((votes, i) => {
            const percentage = (votes / totalVoters * 100).toFixed(1);
            resultsHTML += `${PARTY_COLORS[i]}: ${votes} (${percentage}%)<br>`;
        });
        
        resultsHTML += `<br><strong>Winner: ${PARTY_COLORS[winnerIndex]}</strong>`;
        
        document.getElementById('results').innerHTML = resultsHTML;
    }
    
    regenerateElection() {
        this.generateRandomPositions();
        this.generateDistribution();
        document.getElementById('results').innerHTML = '';
        this.drawAll();
    }

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }
}

// Initialize the visualizer when the page loads
window.addEventListener('load', () => {
    new ElectionVisualizer();
});