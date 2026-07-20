

/**
 * Deterministic, frame-exact SVG animation parser.
 *
 * Rules:
 *  - NO CSS runtime animations are trusted (they are killed in SvgComposition).
 *  - ALL motion is computed mathematically from: progress = frame / durationInFrames
 *  - progress is always in range [0, 1] mapping frame 0 → 0% and last frame → 100%.
 *  - Motion is EVENLY distributed — no delay, no looping, no end-clustering.
 *  - Handles: proprietary `animate` attr, SMIL <animate> children, and `transform` attrs.
 *  - IMPORTANT: We work on a CLONED DOM — the original SVG string is never mutated.
 */

// --- Easing helpers (all input t in [0,1], output in [0,1]) ---
const easeInOut = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
const linear    = (t) => t;
const halfSine  = (t) => Math.sin(t * Math.PI);                   // 0→1→0 arc

// --- Interpolate between two numbers ---
const lerp = (a, b, t) => a + (b - a) * t;

// --- CSS property name conversion: e.g. 'fill-opacity' → 'fillOpacity' ---
const toCamelCase = (str) => str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

export const parseSvgToReact = (svgString, frame, fps, durationInFrames = 60) => {
    if (!svgString || typeof svgString !== 'string') {
        return <div style={{ color: 'red' }}>Invalid SVG</div>;
    }

    // ── 1. Parse SVG string into a DOM ──────────────────────────────────────
    // CRITICAL: Each call gets a FRESH parse from the original string.
    // We never cache/mutate the parsed DOM across frames — this prevents
    // the bug where SMIL elements were .remove()'d and subsequent frames
    // saw a mutated DOM.
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = doc.documentElement;

    const parseError = svgElement.querySelector('parsererror');
    if (parseError || svgElement.tagName.toLowerCase() !== 'svg') {
        // Fallback: inject as raw HTML
        return <div style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: svgString }} />;
    }

    // ── 2. Compute normalized progress [0→1] evenly across full video ───────
    // This is the SINGLE source of truth for ALL animations.
    // frame=0 → progress=0.0 (start)
    // frame=durationInFrames-1 → progress≈1.0 (just before end)
    // We use (frame / (durationInFrames - 1)) so last frame reaches exactly 1.0
    const totalFrames = Math.max(1, durationInFrames - 1);
    const progress = Math.min(1.0, Math.max(0.0, frame / totalFrames));

    // ── 3. Process PROPRIETARY `animate="..."` attributes ───────────────────
    // These are custom attributes (not standard SVG/CSS) found in sample.svg.
    // We compute the exact visual state and bake it into inline styles.
    svgElement.querySelectorAll('[animate]').forEach(el => {
        const animType = el.getAttribute('animate');

        // Ensure transform-origin is centered for all transforms
        el.setAttribute('transform-origin', 'center');
        el.style.transformOrigin = 'center';
        el.style.transformBox = 'fill-box';
        // Remove the browser-ignored proprietary attribute so it doesn't confuse renderers
        el.removeAttribute('animate');
        el.removeAttribute('dur');

        switch (animType) {
            case 'rotate': {
                // Full 360° rotation across entire video duration. Frame 0 = 0°, last frame = 360°.
                const degrees = linear(progress) * 360;
                el.style.transform = `rotate(${degrees.toFixed(4)}deg)`;
                break;
            }
            case 'scale': {
                // Smooth pulse: 1.0 at start, peaks at 1.5 at midpoint, back to 1.0 at end.
                const scale = 1 + 0.5 * halfSine(progress);
                el.style.transform = `scale(${scale.toFixed(4)})`;
                break;
            }
            case 'opacity': {
                // Fade out then fade in: opaque at start, transparent at midpoint, opaque at end.
                const opacity = 1 - halfSine(progress);
                el.style.opacity = opacity.toFixed(4);
                break;
            }
            case 'translate-x': {
                const x = lerp(0, 100, easeInOut(progress));
                el.style.transform = `translateX(${x.toFixed(2)}px)`;
                break;
            }
            case 'translate-y': {
                const y = lerp(0, 100, easeInOut(progress));
                el.style.transform = `translateY(${y.toFixed(2)}px)`;
                break;
            }
            case 'fade-in': {
                el.style.opacity = easeInOut(progress).toFixed(4);
                break;
            }
            case 'fade-out': {
                el.style.opacity = (1 - easeInOut(progress)).toFixed(4);
                break;
            }
            case 'orbit': {
                // Orbital motion around center
                const angle = linear(progress) * Math.PI * 2;
                const radius = 120;
                // Read the parent SVG viewBox to find center
                const viewBox = svgElement.getAttribute('viewBox');
                let cx = 400, cy = 300;
                if (viewBox) {
                    const parts = viewBox.split(/\s+/).map(Number);
                    if (parts.length >= 4) {
                        cx = parts[0] + parts[2] / 2;
                        cy = parts[1] + parts[3] / 2;
                    }
                }
                const ox = cx + radius * Math.cos(angle);
                const oy = cy + radius * Math.sin(angle);
                el.setAttribute('cx', ox.toFixed(2));
                el.setAttribute('cy', oy.toFixed(2));
                break;
            }
            default: {
                // Unknown type: do a generic opacity fade as a safe default
                el.style.opacity = easeInOut(progress).toFixed(4);
            }
        }
    });

    // ── 4. Process SMIL <animate> child elements ─────────────────────────────
    // Bake their `from`/`to` values at the current frame into the parent's style.
    // NOTE: We work on a freshly-parsed DOM, so .remove() here does NOT affect
    // future frames (each frame gets a fresh parse from svgString).
    svgElement.querySelectorAll('animate, animateTransform, animateMotion').forEach(anim => {
        const parent = anim.parentElement;
        if (!parent) return;

        const attrName = anim.getAttribute('attributeName');
        const from     = anim.getAttribute('from') || anim.getAttribute('values')?.split(';')[0] || null;
        const to       = anim.getAttribute('to')   || anim.getAttribute('values')?.split(';').pop() || null;
        const type     = anim.getAttribute('type'); // for animateTransform: rotate, scale, translate

        if (!attrName && !type) return;

        const fromNum = parseFloat(from);
        const toNum   = parseFloat(to);
        const value   = lerp(fromNum, toNum, easeInOut(progress));

        if (!isNaN(fromNum) && !isNaN(toNum)) {
            if (anim.tagName === 'animateTransform' && type) {
                switch (type) {
                    case 'rotate':
                        parent.style.transformOrigin = 'center';
                        parent.style.transformBox = 'fill-box';
                        parent.style.transform = `rotate(${value.toFixed(4)}deg)`;
                        break;
                    case 'scale':
                        parent.style.transformOrigin = 'center';
                        parent.style.transformBox = 'fill-box';
                        parent.style.transform = `scale(${value.toFixed(4)})`;
                        break;
                    case 'translate':
                        parent.style.transform = `translateX(${value.toFixed(2)}px)`;
                        break;
                }
            } else if (attrName === 'opacity') {
                parent.style.opacity = value.toFixed(4);
            } else if (attrName === 'r' || attrName === 'rx' || attrName === 'ry') {
                parent.setAttribute(attrName, value.toFixed(4));
            } else if (attrName === 'cx' || attrName === 'cy' || attrName === 'x' || attrName === 'y') {
                parent.setAttribute(attrName, value.toFixed(4));
            } else if (attrName === 'fill-opacity' || attrName === 'stroke-opacity') {
                // FIX: Use proper camelCase conversion
                // Before: 'fill-opacity'.replace('-', 'Opacity'.slice(0)) → 'fillOpacityopacity' (BUG!)
                // After:  toCamelCase('fill-opacity') → 'fillOpacity'
                const cssProp = toCamelCase(attrName);
                parent.style[cssProp] = value.toFixed(4);
            } else if (attrName === 'width' || attrName === 'height') {
                parent.setAttribute(attrName, value.toFixed(2));
            }
        }

        // Remove the SMIL element so the browser doesn't re-run it.
        // Safe because we parsed a FRESH DOM from svgString — this doesn't
        // affect the next frame.
        anim.remove();
    });

    // ── 5. Kill all remaining CSS animations/transitions in the serialized output ──
    // This ensures the final HTML has no dynamic behavior that could cause
    // non-determinism during Remotion's headless Chrome screenshot.
    svgElement.querySelectorAll('*').forEach(el => {
        if (el.style) {
            el.style.animation = 'none';
            el.style.transition = 'none';
        }
    });

    // ── 6. Serialize baked DOM back to HTML string ───────────────────────────
    const serializer = new XMLSerializer();
    const processedSvg = serializer.serializeToString(svgElement);

    return (
        <div 
            style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            dangerouslySetInnerHTML={{ __html: processedSvg }} 
        />
    );
};
