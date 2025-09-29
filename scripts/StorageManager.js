// StorageManager.js
// Handles localStorage persistence and state management

class StorageManager {
    constructor(config = {}) {
        this.storageKey = config.storageKey || 'electionVisualizerData';
        this.useLocalStorage = this.checkLocalStorageAvailable();
        
        // Fallback in-memory storage
        this.memoryData = null;
    }

    checkLocalStorageAvailable() {
        try {
            if (typeof localStorage !== 'undefined') {
                // Test if we can actually write to localStorage
                const testKey = '__localStorage_test__';
                localStorage.setItem(testKey, 'test');
                localStorage.removeItem(testKey);
                return true;
            }
        } catch (error) {
            console.warn('localStorage not available, using in-memory storage');
        }
        return false;
    }

    // Save current state to storage
    save(state) {
        const data = {
            currentMode: state.currentMode,
            currentVotingMethod: state.currentVotingMethod,
            numCandidates: state.numCandidates,
            numDistributions: state.numDistributions,
            candidates: state.candidates.map(c => ({
                x: c.x,
                y: c.y,
                color: c.color,
                id: c.id
            })),
            distributions: state.distributions.map(d => ({
                id: d.id,
                centerX: d.centerX,
                centerY: d.centerY,
                radius: d.radius,
                voterCount: d.voterCount,
                color: d.color,
                label: d.label
            }))
        };

        try {
            if (this.useLocalStorage) {
                localStorage.setItem(this.storageKey, JSON.stringify(data));
            } else {
                this.memoryData = data;
            }
            return true;
        } catch (error) {
            console.error('Error saving to storage:', error);
            // Fallback to memory
            this.memoryData = data;
            return false;
        }
    }

    // Load state from storage
    load() {
        let data = null;
        
        try {
            if (this.useLocalStorage) {
                const stored = localStorage.getItem(this.storageKey);
                if (stored) {
                    data = JSON.parse(stored);
                }
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            data = this.memoryData;
        }

        // Fallback to in-memory storage if localStorage failed
        if (!data && this.memoryData) {
            data = this.memoryData;
        }

        return data;
    }

    // Clear all stored data
    clear() {
        try {
            if (this.useLocalStorage) {
                localStorage.removeItem(this.storageKey);
            }
        } catch (error) {
            console.error('Error clearing localStorage:', error);
        }
        
        this.memoryData = null;
    }

    // Check if there is saved data
    hasSavedData() {
        try {
            if (this.useLocalStorage) {
                return localStorage.getItem(this.storageKey) !== null;
            }
        } catch (error) {
            // Ignore
        }
        
        return this.memoryData !== null;
    }

    // Get raw data without parsing (for debugging)
    getRawData() {
        try {
            if (this.useLocalStorage) {
                return localStorage.getItem(this.storageKey);
            }
        } catch (error) {
            // Ignore
        }
        
        return this.memoryData ? JSON.stringify(this.memoryData) : null;
    }

    // Check if localStorage is available
    isLocalStorageAvailable() {
        return this.useLocalStorage;
    }

    // Get storage type being used
    getStorageType() {
        return this.useLocalStorage ? 'localStorage' : 'memory';
    }

    // Export data as JSON string (for user download/backup)
    exportData() {
        const data = this.load();
        if (data) {
            return JSON.stringify(data, null, 2);
        }
        return null;
    }

    // Import data from JSON string (for user upload/restore)
    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            // Basic validation
            if (data && typeof data === 'object') {
                if (this.useLocalStorage) {
                    localStorage.setItem(this.storageKey, jsonString);
                } else {
                    this.memoryData = data;
                }
                return true;
            }
        } catch (error) {
            console.error('Error importing data:', error);
        }
        return false;
    }

    // Migrate old storage format (if needed in future)
    migrate(oldData) {
        // TODO: Implement if storage format changes
        // For now, just return the data as-is
        return oldData;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}