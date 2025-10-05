// winner-map.js
// Generate victory territory map for Mode 2

const WinnerMap = (function() {
    'use strict';
    
    // Check if cached winner map is still valid
    function isCacheValid() {
        const state = State.getState();
        
        // No cache exists
        if (!state.winnerMapCache || !state.winnerMapCandidateSnapshot || !state.winnerMapMethodSnapshot) {
            return false;
        }
        
        // Check if candidate positions have changed
        if (state.candidates.length !== state.winnerMapCandidateSnapshot.length) {
            return false;
        }
        
        for (let i = 0; i < state.candidates.length; i++) {
            const current = state.candidates[i];
            const cached = state.winnerMapCandidateSnapshot[i];
            
            if (current.id !== cached.id || current.x !== cached.x || current.y !== cached.y) {
                return false;
            }
        }
        
        // Check if voting method has changed
        if (state.votingMethod !== state.winnerMapMethodSnapshot.method) {
            return false;
        }
        
        // Check if method-specific parameters have changed
        const params = state.winnerMapMethodSnapshot.params;
        
        if (state.votingMethod === 'approval') {
            if (state.approvalRadius !== params.approvalRadius || 
                state.approvalStrategy !== params.approvalStrategy) {
                return false;
            }
        } else if (state.votingMethod === 'star') {
            if (state.starMaxDistance !== params.starMaxDistance) {
                return false;
            }
        } else if (state.votingMethod === 'score') {
            if (state.scoreMaxDistance !== params.scoreMaxDistance) {
                return false;
            }
        }
        
        // Cache is valid
        return true;
    }
    
    // Save cache metadata (candidate positions and method settings)
    function saveCacheMetadata() {
        const state = State.getState();
        
        // Snapshot candidate positions
        const candidateSnapshot = state.candidates.map(c => ({
            id: c.id,
            x: c.x,
            y: c.y
        }));
        
        // Snapshot method and relevant parameters
        const methodSnapshot = {
            method: state.votingMethod,
            params: {}
        };
        
        if (state.votingMethod === 'approval') {
            methodSnapshot.params.approvalRadius = state.approvalRadius;
            methodSnapshot.params.approvalStrategy = state.approvalStrategy;
        } else if (state.votingMethod === 'star') {
            methodSnapshot.params.starMaxDistance = state.starMaxDistance;
        } else if (state.votingMethod === 'score') {
            methodSnapshot.params.scoreMaxDistance = state.scoreMaxDistance;
        }
        
        State.updateState({
            winnerMapCandidateSnapshot: candidateSnapshot,
            winnerMapMethodSnapshot: methodSnapshot
        });
    }

    // Generate winner map by simulating elections across canvas grid
    function generateWinnerMap(onProgress) {
        const state = State.getState();
        
        // Check if cache is valid - if so, use it
        if (isCacheValid()) {
            console.log('Using cached winner map');
            
            // Update state.winnerMap with the cached data so rendering works
            State.updateState({ winnerMap: state.winnerMapCache });
            
            if (onProgress) {
                onProgress(100);
            }
            return state.winnerMapCache;
        }
        
        console.log('Generating new winner map...');

        const gridSize = CONFIG.WINNER_MAP_GRID_SIZE;
        
        const width = CONFIG.CANVAS_WIDTH;
        const height = CONFIG.CANVAS_HEIGHT;
        
        const cols = Math.ceil(width / gridSize);
        const rows = Math.ceil(height / gridSize);
        
        // Initialize 2D array to store winner at each grid point
        const winnerGrid = [];
        
        let processedCells = 0;
        const totalCells = cols * rows;
        
        // Get or generate Gaussian offsets ONCE for reuse across all cells
        const distribution = state.distributions[0];
        Distributions.ensureOffsetsExist(distribution);
        const offsets = distribution.offsets;
        
        // Generate winner map by simulating elections at each grid point
        for (let row = 0; row < rows; row++) {
            winnerGrid[row] = [];
            for (let col = 0; col < cols; col++) {
                const centerX = col * gridSize + gridSize / 2;
                const centerY = row * gridSize + gridSize / 2;
                
                // Simulate election at this point to determine winner
                // Pass pre-generated offsets for performance
                const winner = simulatePointWinner(centerX, centerY, offsets);
                winnerGrid[row][col] = winner;
                
                processedCells++;
                
                // Report progress every 100 cells
                if (onProgress && processedCells % 100 === 0) {
                    const progress = (processedCells / totalCells) * 100;
                    onProgress(progress);
                }
            }
        }
        
        const mapData = {
            grid: winnerGrid,
            gridSize: gridSize,
            cols: cols,
            rows: rows
        };
        
        // Cache the winner map
        State.updateState({ 
            winnerMap: mapData,
            winnerMapCache: mapData 
        });
        
        // Save cache metadata
        saveCacheMetadata();
        
        if (onProgress) {
            onProgress(100);
        }
        
        return mapData;
    }
    
    // Simulate election at a specific point
    // Accepts optional pre-generated offsets for performance
    function simulatePointWinner(x, y, offsets = null) {
        // Use Election module's simulateElectionAt function
        return Election.simulateElectionAt(x, y, offsets);
    }
    
    // Render winner map as colored rectangles/pixels
    function renderWinnerMap(ctx, mapData) {
        if (!mapData || !mapData.grid) {
            return;
        }
        
        const state = State.getState();
        const gridSize = mapData.gridSize;
        
        // Draw each cell
        for (let row = 0; row < mapData.rows; row++) {
            for (let col = 0; col < mapData.cols; col++) {
                const winnerId = mapData.grid[row][col];
                
                if (winnerId === null || winnerId === undefined) {
                    continue;
                }
                
                // Get winner's color
                const color = CONFIG.CANDIDATE_COLORS[winnerId];
                
                // Draw rectangle with slight transparency to see grid
                ctx.fillStyle = color + '80'; // Add alpha for transparency
                ctx.fillRect(
                    col * gridSize,
                    row * gridSize,
                    gridSize,
                    gridSize
                );
            }
        }
    }
    
    // Check if winner map needs regeneration
    function needsRegeneration() {
        return !isCacheValid();
    }
    
    // Clear cached winner map and metadata
    function clearCache() {
        State.updateState({ 
            winnerMap: null,
            winnerMapCache: null,
            winnerMapCandidateSnapshot: null,
            winnerMapMethodSnapshot: null
        });
    }
    
    // Get winner at a specific canvas coordinate
    function getWinnerAt(x, y) {
        const state = State.getState();
        const mapData = state.winnerMap;
        
        if (!mapData || !mapData.grid) {
            return null;
        }
        
        const col = Math.floor(x / mapData.gridSize);
        const row = Math.floor(y / mapData.gridSize);
        
        if (row >= 0 && row < mapData.rows && col >= 0 && col < mapData.cols) {
            return mapData.grid[row][col];
        }
        
        return null;
    }
    
    // Public API
    return {
        generateWinnerMap,
        simulatePointWinner,
        renderWinnerMap,
        needsRegeneration,
        isCacheValid,
        clearCache,
        getWinnerAt
    };
})();

// Make WinnerMap globally available
if (typeof window !== 'undefined') {
    window.WinnerMap = WinnerMap;
}