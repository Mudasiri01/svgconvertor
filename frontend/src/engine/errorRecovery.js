/**
 * Error Recovery Engine — Production-grade error handling for SVG rendering.
 *
 * Provides:
 *  - SVG input validation (structure, security, size)
 *  - Frame retry tracking with exponential backoff info
 *  - Stalled animation detection with actionable diagnostics
 */
class ErrorRecovery {
    constructor() {
        this.failedFrames = new Map(); // frame → { attempts, lastError }
        this.retryLimit = 3;
        this.stalledFrames = [];
    }

    /**
     * Validate SVG content before rendering.
     * Throws on invalid input, warns on risky content.
     * @param {string} svgString - Raw SVG content
     * @returns {object} Validation result with warnings
     */
    validateSvg(svgString) {
        const warnings = [];

        if (!svgString || typeof svgString !== 'string') {
            throw new Error('Invalid SVG: Empty or not a string.');
        }

        if (svgString.length > 10 * 1024 * 1024) {
            throw new Error('SVG exceeds 10MB limit. Large SVGs cause memory issues during rendering.');
        }

        if (!svgString.includes('<svg')) {
            throw new Error('Content does not contain an <svg> element.');
        }

        // Security checks
        if (svgString.includes('<script')) {
            warnings.push(
                'SVG contains <script> tags. JavaScript animations are not deterministically ' +
                'supported by Remotion SSR. They will be stripped during rendering.'
            );
        }

        if (svgString.includes('<foreignObject')) {
            warnings.push(
                'SVG contains <foreignObject> elements. These may not render consistently ' +
                'across different Chrome versions.'
            );
        }

        // Structural validation via DOMParser (only in browser context)
        if (typeof DOMParser !== 'undefined') {
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgString, 'image/svg+xml');
            const parseError = doc.querySelector('parsererror');
            if (parseError) {
                throw new Error(`SVG parse error: ${parseError.textContent.slice(0, 200)}`);
            }
        }

        // Log warnings
        warnings.forEach((w) => console.warn(`[SVG Validation] ⚠️ ${w}`));

        return { valid: true, warnings };
    }

    /**
     * Track and decide whether to retry a failed frame.
     * @param {number} frame - Frame index
     * @param {Error} error - The error that occurred
     * @returns {boolean} Whether a retry should be attempted
     */
    shouldRetryFrame(frame, error) {
        const entry = this.failedFrames.get(frame) || { attempts: 0, lastError: null };
        entry.attempts++;
        entry.lastError = error.message;
        this.failedFrames.set(frame, entry);

        if (entry.attempts > this.retryLimit) {
            console.error(
                `[ErrorRecovery] ❌ Frame ${frame} failed ${entry.attempts} times. ` +
                `Giving up. Last error: ${error.message}`
            );
            return false;
        }

        const backoffMs = Math.pow(2, entry.attempts) * 100; // 200ms, 400ms, 800ms
        console.warn(
            `[ErrorRecovery] ⚠️ Frame ${frame} failed (attempt ${entry.attempts}/${this.retryLimit}). ` +
            `Suggested backoff: ${backoffMs}ms. Error: ${error.message}`
        );
        return true;
    }

    /**
     * Handle detection of stalled animation (frames not changing).
     * @param {number} frame - The frame at which stalling was detected
     */
    handleStalledAnimation(frame) {
        this.stalledFrames.push({ frame, timestamp: Date.now() });

        // Only log every 60 frames to avoid spam
        if (this.stalledFrames.length % 60 === 0) {
            console.error(
                `[ErrorRecovery] 🔴 Animation stalled at frame ${frame}. ` +
                `Total stall events: ${this.stalledFrames.length}. ` +
                `This usually means svgParser.js is not computing different values per frame — ` +
                `check that the SVG has actual [animate] attributes or SMIL <animate> elements.`
            );
        }
    }

    /**
     * Get a summary of all errors encountered during the render.
     * @returns {object} Error summary
     */
    getSummary() {
        return {
            failedFrames: Object.fromEntries(this.failedFrames),
            totalStalls: this.stalledFrames.length,
            stalledAt: this.stalledFrames.slice(-5), // Last 5 stall events
        };
    }

    /**
     * Reset state for a new render session.
     */
    reset() {
        this.failedFrames.clear();
        this.stalledFrames = [];
    }
}

export const errorRecovery = new ErrorRecovery();
