import React from 'react';
import { render, screen } from '../../test-utils';
import { Progress } from '@/components/ui/progress';

// Mock Radix UI Progress
jest.mock('@radix-ui/react-progress', () => ({
  Root: React.forwardRef<HTMLDivElement, any>(({ children, className, ...props }, ref) => (
    <div ref={ref} className={className} role="progressbar" {...props}>
      {children}
    </div>
  )),
  Indicator: React.forwardRef<HTMLDivElement, any>(({ className, style, ...props }, ref) => (
    <div ref={ref} className={className} style={style} data-testid="progress-indicator" {...props} />
  )),
}));

describe('Progress Component', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Progress />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    it('renders with specific value', () => {
      render(<Progress value={50} />);
      const indicator = screen.getByTestId('progress-indicator');
      expect(indicator).toHaveStyle({ transform: 'translateX(-50%)' });
    });

    it('renders with 0 value', () => {
      render(<Progress value={0} />);
      const indicator = screen.getByTestId('progress-indicator');
      expect(indicator).toHaveStyle({ transform: 'translateX(-100%)' });
    });

    it('renders with 100 value', () => {
      render(<Progress value={100} />);
      const indicator = screen.getByTestId('progress-indicator');
      expect(indicator).toHaveStyle({ transform: 'translateX(-0%)' });
    });

    it('applies custom className to root', () => {
      render(<Progress className="custom-progress" value={50} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('custom-progress');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Progress ref={ref} value={75} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toHaveAttribute('role', 'progressbar');
    });
  });

  describe('Styling', () => {
    it('applies base styles to root element', () => {
      render(<Progress value={50} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar.className).toContain('relative');
      expect(progressBar.className).toContain('h-2');
      expect(progressBar.className).toContain('w-full');
      expect(progressBar.className).toContain('overflow-hidden');
      expect(progressBar.className).toContain('rounded-full');
      expect(progressBar.className).toContain('bg-secondary');
    });

    it('applies base styles to indicator element', () => {
      render(<Progress value={50} />);
      const indicator = screen.getByTestId('progress-indicator');
      expect(indicator.className).toContain('h-full');
      expect(indicator.className).toContain('w-full');
      expect(indicator.className).toContain('flex-1');
      expect(indicator.className).toContain('bg-primary');
      expect(indicator.className).toContain('transition-all');
    });

    it('can override height with custom className', () => {
      render(<Progress className="h-4" value={50} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('h-4');
      // Note: h-4 will override the base h-2 class
    });

    it('can override colors with custom className', () => {
      render(<Progress className="bg-gray-200" value={50} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('bg-gray-200');
      // Note: bg-gray-200 will override the base bg-secondary class
    });
  });

  describe('Value Handling', () => {
    it('handles null/undefined value as 0', () => {
      render(<Progress value={undefined} />);
      const indicator = screen.getByTestId('progress-indicator');
      expect(indicator).toHaveStyle({ transform: 'translateX(-100%)' });
    });

    it('handles negative values', () => {
      render(<Progress value={-10} />);
      const indicator = screen.getByTestId('progress-indicator');
      // The component doesn't clamp negative values, it will calculate transform based on the value
      expect(indicator).toHaveStyle({ transform: 'translateX(-110%)' });
    });

    it('handles values over 100', () => {
      render(<Progress value={150} />);
      const indicator = screen.getByTestId('progress-indicator');
      // The component doesn't clamp values over 100, it will calculate transform based on the value
      expect(indicator).toHaveStyle({ transform: `translateX(-${100 - 150}%)` });
    });

    it('handles decimal values correctly', () => {
      render(<Progress value={33.33} />);
      const indicator = screen.getByTestId('progress-indicator');
      expect(indicator).toHaveStyle({ transform: 'translateX(-66.67%)' });
    });

    it('updates when value changes', () => {
      const { rerender } = render(<Progress value={25} />);
      const indicator = screen.getByTestId('progress-indicator');
      
      expect(indicator).toHaveStyle({ transform: 'translateX(-75%)' });
      
      rerender(<Progress value={75} />);
      expect(indicator).toHaveStyle({ transform: 'translateX(-25%)' });
    });
  });

  describe('Accessibility', () => {
    it('has progressbar role', () => {
      render(<Progress value={50} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    it('can have aria-label', () => {
      render(<Progress value={50} aria-label="Loading progress" />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', 'Loading progress');
    });

    it('can have aria-valuemin and aria-valuemax', () => {
      render(<Progress value={50} aria-valuemin={0} aria-valuemax={100} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('can have aria-valuenow', () => {
      render(<Progress value={50} aria-valuenow={50} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });

    it('can have aria-valuetext', () => {
      render(<Progress value={50} aria-valuetext="50 percent" />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuetext', '50 percent');
    });
  });

  describe('Integration Scenarios', () => {
    it('works in a loading state component', () => {
      const LoadingState = ({ progress }: { progress: number }) => (
        <div>
          <p>Uploading file...</p>
          <Progress value={progress} aria-label="Upload progress" />
          <span>{progress}% complete</span>
        </div>
      );

      render(<LoadingState progress={75} />);
      expect(screen.getByText('Uploading file...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText('75% complete')).toBeInTheDocument();
    });

    it('can be used with animation', () => {
      const AnimatedProgress = () => {
        const [value, setValue] = React.useState(0);
        
        React.useEffect(() => {
          const timer = setTimeout(() => setValue(100), 100);
          return () => clearTimeout(timer);
        }, []);

        return <Progress value={value} />;
      };

      const { rerender } = render(<AnimatedProgress />);
      const indicator = screen.getByTestId('progress-indicator');
      
      expect(indicator).toHaveStyle({ transform: 'translateX(-100%)' });
      expect(indicator.className).toContain('transition-all');
    });

    it('works with multiple progress bars', () => {
      render(
        <div>
          <Progress value={25} aria-label="Task 1" />
          <Progress value={50} aria-label="Task 2" />
          <Progress value={75} aria-label="Task 3" />
        </div>
      );

      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars).toHaveLength(3);
      expect(progressBars[0]).toHaveAttribute('aria-label', 'Task 1');
      expect(progressBars[1]).toHaveAttribute('aria-label', 'Task 2');
      expect(progressBars[2]).toHaveAttribute('aria-label', 'Task 3');
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid value changes', () => {
      const { rerender } = render(<Progress value={0} />);
      const indicator = screen.getByTestId('progress-indicator');

      for (let i = 0; i <= 100; i += 10) {
        rerender(<Progress value={i} />);
        expect(indicator).toHaveStyle({ transform: `translateX(-${100 - i}%)` });
      }
    });

    it('maintains transition during updates', () => {
      const { rerender } = render(<Progress value={0} />);
      const indicator = screen.getByTestId('progress-indicator');
      
      expect(indicator.className).toContain('transition-all');
      
      rerender(<Progress value={50} />);
      expect(indicator.className).toContain('transition-all');
      
      rerender(<Progress value={100} />);
      expect(indicator.className).toContain('transition-all');
    });

    it('works with custom data attributes', () => {
      render(
        <Progress 
          value={50} 
          data-testid="custom-progress"
          data-state="loading"
        />
      );
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('data-testid', 'custom-progress');
      expect(progressBar).toHaveAttribute('data-state', 'loading');
    });

    it('handles style prop alongside className', () => {
      render(
        <Progress 
          value={50} 
          className="custom-class"
          style={{ marginTop: '10px' }}
        />
      );
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('custom-class');
      expect(progressBar).toHaveStyle({ marginTop: '10px' });
    });
  });

  describe('Display Name', () => {
    it('component exists and can be rendered', () => {
      const { container } = render(<Progress value={50} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});