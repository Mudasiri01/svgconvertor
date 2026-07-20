import { useState, useCallback } from 'react';

export const useSvgParser = () => {
  const [parsedData, setParsedData] = useState(null);

  const parseSvg = useCallback(async (svgString) => {
    return new Promise((resolve, reject) => {
      try {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
        const svgElement = svgDoc.documentElement;
        
        // Extract dimensions
        const width = svgElement.getAttribute('width') || '800';
        const height = svgElement.getAttribute('height') || '600';
        const viewBox = svgElement.getAttribute('viewBox') || `0 0 ${width} ${height}`;
        
        // Temporarily attach clone to body to get computed styles
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '-9999px';
        tempContainer.style.visibility = 'hidden';
        tempContainer.style.width = width + 'px';
        tempContainer.style.height = height + 'px';
        
        const attachedSvg = svgElement.cloneNode(true);
        tempContainer.appendChild(attachedSvg);
        document.body.appendChild(tempContainer);
        
        const allElements = svgElement.querySelectorAll('*');
        const allAttachedElements = attachedSvg.querySelectorAll('*');
        const animatedElements = [];
        
        allElements.forEach((element, index) => {
          const attachedElement = allAttachedElements[index];
          let styles = null;
          let animationName = '';
          
          if (attachedElement && window.getComputedStyle) {
            styles = window.getComputedStyle(attachedElement);
            animationName = styles.animationName || styles.getPropertyValue('animation-name') || '';
          }
          
          const hasAnimation = element.hasAttribute('animate') || 
                             element.tagName.toLowerCase().includes('animate') ||
                             (animationName && animationName !== 'none');
          
          if (hasAnimation) {
            animatedElements.push({
              element,
              tagName: element.tagName,
              attributes: element.attributes,
              styles: styles,
              animation: element.getAttribute('animate') || animationName || 'none'
            });
          }
        });
        
        document.body.removeChild(tempContainer);

        const result = {
          svgElement,
          width: parseInt(width),
          height: parseInt(height),
          viewBox,
          animatedElements,
          totalElements: allElements.length
        };

        setParsedData(result);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }, []);

  const getAnimationData = useCallback((data) => {
    if (!data) return null;
    
    const animations = data.animatedElements.map(item => ({
      element: item.element,
      type: item.animation || 'transform',
      duration: parseFloat(item.element.getAttribute('dur')) || 1,
      repeatCount: item.element.getAttribute('repeatCount') || 'indefinite'
    }));

    return {
      animations,
      totalAnimations: animations.length,
      duration: Math.max(...animations.map(a => a.duration), 1)
    };
  }, []);

  return { parseSvg, getAnimationData, parsedData };
};