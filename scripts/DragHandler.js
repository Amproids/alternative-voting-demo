// DragHandler.js
// Handles drag and drop interactions for candidates and distributions

class DragHandler {
    constructor(canvas, config = {}) {
        this.canvas = canvas;
        this.canvasSize = config.canvasSize || 600;
        
        // Drag state
        this.isDragging = false;
        this.draggedCandidate = null;
        this.draggedDistribution = null;
        this.mousePos = { x: 0, y: 0 };
        this.dragOffset = { x: 0, y: 0 };
        
        // Hit test radii
        this.candidateRadius = 8;
        this.centerRadius = 10;
        
        // Callbacks - will be set by the main visualizer
        this.onDragStart = null;
        this.onDragMove = null;
        this.onDragEnd = null;
        this.getState = null; // Function to get current state (mode, candidates, distributions)
        
        this.init();
    }

    init() {
        this.setupMouseEvents();
        this.setupTouchEvents();
    }

    setupMouseEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
    }

    setupTouchEvents() {
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mousePos.x = e.clientX - rect.left;
        this.mousePos.y = e.clientY - rect.top;
        
        const state = this.getState ? this.getState() : null;
        if (!state) return;
        
        // Check for distribution centers first (if in the right mode)
        if (state.currentMode === 'one-election-multiple-distributions') {
            const distribution = this.getDistributionAt(this.mousePos.x, this.mousePos.y, state);
            if (distribution) {
                this.isDragging = true;
                this.draggedDistribution = distribution;
                this.dragOffset.x = this.mousePos.x - distribution.centerX;
                this.dragOffset.y = this.mousePos.y - distribution.centerY;
                this.canvas.style.cursor = 'grabbing';
                
                if (this.onDragStart) {
                    this.onDragStart('distribution', distribution);
                }
                return;
            }
        }
        
        // Check for candidates
        const candidate = this.getCandidateAtPosition(this.mousePos.x, this.mousePos.y, state);
        if (candidate) {
            this.isDragging = true;
            this.draggedCandidate = candidate;
            this.dragOffset.x = this.mousePos.x - candidate.x;
            this.dragOffset.y = this.mousePos.y - candidate.y;
            this.canvas.style.cursor = 'grabbing';
            
            if (this.onDragStart) {
                this.onDragStart('candidate', candidate);
            }
        }
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mousePos.x = e.clientX - rect.left;
        this.mousePos.y = e.clientY - rect.top;
        
        if (this.isDragging) {
            if (this.draggedDistribution) {
                // Update distribution center position
                this.draggedDistribution.centerX = Math.max(10, Math.min(this.canvasSize - 10, this.mousePos.x - this.dragOffset.x));
                this.draggedDistribution.centerY = Math.max(10, Math.min(this.canvasSize - 10, this.mousePos.y - this.dragOffset.y));
                
                if (this.onDragMove) {
                    this.onDragMove('distribution', this.draggedDistribution);
                }
            } else if (this.draggedCandidate) {
                // Update candidate position
                this.draggedCandidate.x = Math.max(8, Math.min(this.canvasSize - 8, this.mousePos.x - this.dragOffset.x));
                this.draggedCandidate.y = Math.max(8, Math.min(this.canvasSize - 8, this.mousePos.y - this.dragOffset.y));
                
                if (this.onDragMove) {
                    this.onDragMove('candidate', this.draggedCandidate);
                }
            }
        } else {
            // Update cursor based on hover state
            this.updateCursor();
        }
    }

    handleMouseUp(e) {
        if (this.isDragging) {
            const type = this.draggedDistribution ? 'distribution' : 'candidate';
            const item = this.draggedDistribution || this.draggedCandidate;
            
            this.isDragging = false;
            this.draggedCandidate = null;
            this.draggedDistribution = null;
            this.canvas.style.cursor = 'default';
            
            if (this.onDragEnd) {
                this.onDragEnd(type, item);
            }
        }
    }

    handleMouseLeave(e) {
        if (this.isDragging) {
            const type = this.draggedDistribution ? 'distribution' : 'candidate';
            const item = this.draggedDistribution || this.draggedCandidate;
            
            this.isDragging = false;
            this.draggedCandidate = null;
            this.draggedDistribution = null;
            this.canvas.style.cursor = 'default';
            
            if (this.onDragEnd) {
                this.onDragEnd(type, item);
            }
        }
    }

    handleTouchStart(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        this.mousePos.x = touch.clientX - rect.left;
        this.mousePos.y = touch.clientY - rect.top;
        
        const state = this.getState ? this.getState() : null;
        if (!state) return;
        
        // Check for distribution centers first
        if (state.currentMode === 'one-election-multiple-distributions') {
            const distribution = this.getDistributionAt(this.mousePos.x, this.mousePos.y, state);
            if (distribution) {
                this.isDragging = true;
                this.draggedDistribution = distribution;
                this.dragOffset.x = this.mousePos.x - distribution.centerX;
                this.dragOffset.y = this.mousePos.y - distribution.centerY;
                
                if (this.onDragStart) {
                    this.onDragStart('distribution', distribution);
                }
                return;
            }
        }
        
        // Check for candidates
        const candidate = this.getCandidateAtPosition(this.mousePos.x, this.mousePos.y, state);
        if (candidate) {
            this.isDragging = true;
            this.draggedCandidate = candidate;
            this.dragOffset.x = this.mousePos.x - candidate.x;
            this.dragOffset.y = this.mousePos.y - candidate.y;
            
            if (this.onDragStart) {
                this.onDragStart('candidate', candidate);
            }
        }
    }

    handleTouchMove(e) {
        e.preventDefault();
        if (this.isDragging) {
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.mousePos.x = touch.clientX - rect.left;
            this.mousePos.y = touch.clientY - rect.top;
            
            if (this.draggedDistribution) {
                this.draggedDistribution.centerX = Math.max(10, Math.min(this.canvasSize - 10, this.mousePos.x - this.dragOffset.x));
                this.draggedDistribution.centerY = Math.max(10, Math.min(this.canvasSize - 10, this.mousePos.y - this.dragOffset.y));
                
                if (this.onDragMove) {
                    this.onDragMove('distribution', this.draggedDistribution);
                }
            } else if (this.draggedCandidate) {
                this.draggedCandidate.x = Math.max(8, Math.min(this.canvasSize - 8, this.mousePos.x - this.dragOffset.x));
                this.draggedCandidate.y = Math.max(8, Math.min(this.canvasSize - 8, this.mousePos.y - this.dragOffset.y));
                
                if (this.onDragMove) {
                    this.onDragMove('candidate', this.draggedCandidate);
                }
            }
        }
    }

    handleTouchEnd(e) {
        e.preventDefault();
        if (this.isDragging) {
            const type = this.draggedDistribution ? 'distribution' : 'candidate';
            const item = this.draggedDistribution || this.draggedCandidate;
            
            this.isDragging = false;
            this.draggedCandidate = null;
            this.draggedDistribution = null;
            
            if (this.onDragEnd) {
                this.onDragEnd(type, item);
            }
        }
    }

    updateCursor() {
        const state = this.getState ? this.getState() : null;
        if (!state) return;
        
        // Check for distribution centers
        if (state.currentMode === 'one-election-multiple-distributions') {
            const distribution = this.getDistributionAt(this.mousePos.x, this.mousePos.y, state);
            if (distribution) {
                this.canvas.style.cursor = 'grab';
                return;
            }
        }
        
        // Check for candidates
        const candidate = this.getCandidateAtPosition(this.mousePos.x, this.mousePos.y, state);
        this.canvas.style.cursor = candidate ? 'grab' : 'default';
    }

    getDistributionAt(x, y, state) {
        if (!state.distributions || !state.numDistributions) return null;
        
        for (let i = 0; i < state.numDistributions; i++) {
            const dist = state.distributions[i];
            const dx = x - dist.centerX;
            const dy = y - dist.centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= this.centerRadius) {
                return dist;
            }
        }
        return null;
    }

    getCandidateAtPosition(x, y, state) {
        if (!state.candidates || !state.numCandidates) return null;
        
        return state.candidates.slice(0, state.numCandidates).find(candidate => {
            const dx = x - candidate.x;
            const dy = y - candidate.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= this.candidateRadius;
        });
    }

    // Getters for current drag state
    getDraggedCandidate() {
        return this.draggedCandidate;
    }

    getDraggedDistribution() {
        return this.draggedDistribution;
    }

    getIsDragging() {
        return this.isDragging;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DragHandler;
}