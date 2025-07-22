import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('Accessibility Setup Verification', () => {
  it('should have no accessibility violations in a simple component', async () => {
    const { container } = render(
      <div>
        <h1>Test Heading</h1>
        <button>Click me</button>
        <nav>
          <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#about">About</a></li>
          </ul>
        </nav>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should detect accessibility violations', async () => {
    const { container } = render(
      <div>
        {/* Image without alt text - should fail */}
        {/* eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element */}
        <img src="/test.jpg" />
      </div>
    );

    const results = await axe(container);
    // This test should detect violations
    expect(results.violations.length).toBeGreaterThan(0);
    expect(results.violations[0]?.id).toBe('image-alt');
  });
});