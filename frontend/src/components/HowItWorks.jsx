
import React from 'react';

const HowItWorks = () => {
  const steps = [
    {
      number: '01',
      title: 'CSS3 keyframes animations',
      description: 'Captured via animation-delay offset per frame'
    },
    {
      number: '02',
      title: 'SMIL animations',
      description: 'Frozen per-frame with begin offset injection'
    }
  ];

  return (
    <div className="step-card">
      <div className="step-header">
        <span className="step-number">ℹ️</span>
        <h3>HOW IT WORKS</h3>
      </div>
      <div className="how-it-works">
        {steps.map((step) => (
          <div key={step.number} className="how-step">
            <div className="how-step-number">{step.number}</div>
            <div className="how-step-content">
              <h4>{step.title}</h4>
              <p>{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HowItWorks;
