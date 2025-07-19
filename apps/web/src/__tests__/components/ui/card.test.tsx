import React from 'react';
import { render, screen } from '../../test-utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from '@/components/ui/card';

describe('Card Component', () => {
  describe('Card Container', () => {
    it('renders card with default styles', () => {
      render(<Card>Card Content</Card>);
      const card = screen.getByText('Card Content');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('data-slot', 'card');
      expect(card.className).toContain('bg-card');
      expect(card.className).toContain('text-card-foreground');
      expect(card.className).toContain('rounded-xl');
      expect(card.className).toContain('border');
      expect(card.className).toContain('shadow-sm');
    });

    it('applies custom className', () => {
      render(<Card className="custom-card-class">Content</Card>);
      const card = screen.getByText('Content');
      expect(card).toHaveClass('custom-card-class');
    });

    it('forwards props to the div element', () => {
      render(
        <Card data-testid="test-card" role="article">
          Card
        </Card>
      );
      const card = screen.getByTestId('test-card');
      expect(card).toHaveAttribute('role', 'article');
    });

    it('renders children correctly', () => {
      render(
        <Card>
          <div>Child 1</div>
          <div>Child 2</div>
        </Card>
      );
      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
    });
  });

  describe('CardHeader', () => {
    it('renders with default styles', () => {
      render(<CardHeader>Header Content</CardHeader>);
      const header = screen.getByText('Header Content');
      expect(header).toHaveAttribute('data-slot', 'card-header');
      expect(header.className).toContain('grid');
      expect(header.className).toContain('px-6');
    });

    it('applies grid layout when CardAction is present', () => {
      render(<CardHeader>Header</CardHeader>);
      const header = screen.getByText('Header');
      expect(header.className).toContain('has-data-[slot=card-action]:grid-cols-[1fr_auto]');
    });

    it('applies custom className', () => {
      render(<CardHeader className="custom-header">Header</CardHeader>);
      const header = screen.getByText('Header');
      expect(header).toHaveClass('custom-header');
    });
  });

  describe('CardTitle', () => {
    it('renders with default styles', () => {
      render(<CardTitle>Card Title</CardTitle>);
      const title = screen.getByText('Card Title');
      expect(title).toHaveAttribute('data-slot', 'card-title');
      expect(title.className).toContain('font-semibold');
      expect(title.className).toContain('leading-none');
    });

    it('renders different content types', () => {
      render(
        <>
          <CardTitle>Text Title</CardTitle>
          <CardTitle>
            <span>Nested Element Title</span>
          </CardTitle>
        </>
      );
      expect(screen.getByText('Text Title')).toBeInTheDocument();
      expect(screen.getByText('Nested Element Title')).toBeInTheDocument();
    });

    it('forwards props correctly', () => {
      render(<CardTitle id="card-title-1">Title</CardTitle>);
      const title = screen.getByText('Title');
      expect(title).toHaveAttribute('id', 'card-title-1');
    });
  });

  describe('CardDescription', () => {
    it('renders with default styles', () => {
      render(<CardDescription>Card Description</CardDescription>);
      const description = screen.getByText('Card Description');
      expect(description).toHaveAttribute('data-slot', 'card-description');
      expect(description.className).toContain('text-muted-foreground');
      expect(description.className).toContain('text-sm');
    });

    it('applies custom styles', () => {
      render(
        <CardDescription className="text-lg text-primary">
          Custom Description
        </CardDescription>
      );
      const description = screen.getByText('Custom Description');
      expect(description).toHaveClass('text-lg');
      expect(description).toHaveClass('text-primary');
    });
  });

  describe('CardAction', () => {
    it('renders with correct positioning styles', () => {
      render(<CardAction>Action Button</CardAction>);
      const action = screen.getByText('Action Button');
      expect(action).toHaveAttribute('data-slot', 'card-action');
      expect(action.className).toContain('col-start-2');
      expect(action.className).toContain('row-span-2');
      expect(action.className).toContain('self-start');
      expect(action.className).toContain('justify-self-end');
    });

    it('positions correctly in grid layout', () => {
      render(
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardAction>
            <button>Action</button>
          </CardAction>
        </CardHeader>
      );
      const action = screen.getByRole('button', { name: 'Action' });
      expect(action.parentElement).toHaveAttribute('data-slot', 'card-action');
    });
  });

  describe('CardContent', () => {
    it('renders with default styles', () => {
      render(<CardContent>Content Area</CardContent>);
      const content = screen.getByText('Content Area');
      expect(content).toHaveAttribute('data-slot', 'card-content');
      expect(content.className).toContain('px-6');
    });

    it('can contain complex content', () => {
      render(
        <CardContent>
          <p>Paragraph 1</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </CardContent>
      );
      expect(screen.getByText('Paragraph 1')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });

  describe('CardFooter', () => {
    it('renders with default styles', () => {
      render(<CardFooter>Footer Content</CardFooter>);
      const footer = screen.getByText('Footer Content');
      expect(footer).toHaveAttribute('data-slot', 'card-footer');
      expect(footer.className).toContain('flex');
      expect(footer.className).toContain('items-center');
      expect(footer.className).toContain('px-6');
    });

    it('applies border-top spacing conditionally', () => {
      render(<CardFooter>Footer</CardFooter>);
      const footer = screen.getByText('Footer');
      expect(footer.className).toContain('[.border-t]:pt-6');
    });

    it('renders multiple footer items', () => {
      render(
        <CardFooter>
          <button>Cancel</button>
          <button>Save</button>
        </CardFooter>
      );
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });
  });

  describe('Complete Card Composition', () => {
    it('renders a complete card with all components', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Complete Card</CardTitle>
            <CardDescription>This is a complete card example</CardDescription>
            <CardAction>
              <button>Options</button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p>Main content goes here</p>
          </CardContent>
          <CardFooter>
            <button>Footer Action</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByText('Complete Card')).toBeInTheDocument();
      expect(screen.getByText('This is a complete card example')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Options' })).toBeInTheDocument();
      expect(screen.getByText('Main content goes here')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Footer Action' })).toBeInTheDocument();
    });

    it('maintains proper spacing between sections', () => {
      render(
        <Card>
          <CardHeader>Header</CardHeader>
          <CardContent>Content</CardContent>
          <CardFooter>Footer</CardFooter>
        </Card>
      );

      const card = screen.getByText('Header').closest('[data-slot="card"]');
      expect(card?.className).toContain('gap-6');
    });

    it('allows flexible composition order', () => {
      render(
        <Card>
          <CardContent>Content First</CardContent>
          <CardHeader>Header Second</CardHeader>
          <CardFooter>Footer Last</CardFooter>
        </Card>
      );

      expect(screen.getByText('Content First')).toBeInTheDocument();
      expect(screen.getByText('Header Second')).toBeInTheDocument();
      expect(screen.getByText('Footer Last')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('supports ARIA attributes', () => {
      render(
        <Card role="article" aria-label="Product Card">
          <CardHeader>
            <CardTitle id="card-title">Product Name</CardTitle>
            <CardDescription id="card-desc">Product description</CardDescription>
          </CardHeader>
          <CardContent aria-describedby="card-desc">
            Content
          </CardContent>
        </Card>
      );

      const card = screen.getByRole('article', { name: 'Product Card' });
      expect(card).toBeInTheDocument();
      
      const content = screen.getByText('Content');
      expect(content).toHaveAttribute('aria-describedby', 'card-desc');
    });

    it('maintains semantic HTML structure', () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Paragraph content</p>
          </CardContent>
        </Card>
      );

      const divElements = container.querySelectorAll('div');
      expect(divElements.length).toBeGreaterThan(0);
      
      const paragraph = container.querySelector('p');
      expect(paragraph).toHaveTextContent('Paragraph content');
    });
  });

  describe('Edge Cases', () => {
    it('renders empty card', () => {
      render(<Card />);
      const card = document.querySelector('[data-slot="card"]');
      expect(card).toBeInTheDocument();
      expect(card).toBeEmptyDOMElement();
    });

    it('handles very long content', () => {
      const longText = 'A'.repeat(1000);
      render(
        <Card>
          <CardContent>{longText}</CardContent>
        </Card>
      );
      const content = screen.getByText(longText);
      expect(content).toBeInTheDocument();
    });

    it('handles null and undefined children gracefully', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>{null}</CardTitle>
            <CardDescription>{undefined}</CardDescription>
          </CardHeader>
        </Card>
      );
      
      const header = document.querySelector('[data-slot="card-header"]');
      expect(header).toBeInTheDocument();
    });
  });
});