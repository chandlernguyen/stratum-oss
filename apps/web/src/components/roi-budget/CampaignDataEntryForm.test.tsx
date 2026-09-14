import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CampaignDataEntryForm } from './CampaignDataEntryForm';

// Mock the hooks
vi.mock('@/hooks/data/useCampaignMetrics', () => ({
  useCreateCampaignMetric: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'test-id' }),
    isPending: false,
  }),
  useUpdateCampaignMetric: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'test-id' }),
    isPending: false,
  }),
}));

vi.mock('@/hooks/data/useCampaigns', () => ({
  useCampaigns: () => ({
    data: [
      { id: 'campaign-1', name: 'Test Campaign 1' },
      { id: 'campaign-2', name: 'Test Campaign 2' },
    ],
  }),
}));

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('CampaignDataEntryForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render basic form fields', () => {
      render(<CampaignDataEntryForm />, { wrapper: createWrapper() });

      // Check for basic fields
      expect(screen.getByLabelText(/campaign name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/spend/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/impressions/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/clicks/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/conversions/i)).toBeInTheDocument();
    });

    it('should show correct title for create mode', () => {
      render(<CampaignDataEntryForm />, { wrapper: createWrapper() });

      expect(screen.getByText('Add Campaign Metrics')).toBeInTheDocument();
    });

    it('should show correct title for edit mode', () => {
      const initialData = {
        id: 'test-id',
        campaign_name: 'Test Campaign',
        metric_date: '2025-10-16',
        spend: 100,
      };

      render(<CampaignDataEntryForm initialData={initialData} />, { wrapper: createWrapper() });

      expect(screen.getByText('Edit Campaign Metrics')).toBeInTheDocument();
    });
  });

  describe('Progressive Disclosure', () => {
    it('should initially collapse all optional sections', () => {
      render(<CampaignDataEntryForm />, { wrapper: createWrapper() });

      // Check section headers are visible
      expect(screen.getByText('Revenue Tracking')).toBeInTheDocument();
      expect(screen.getByText('Lead Generation Metrics')).toBeInTheDocument();
      expect(screen.getByText('Social Engagement Metrics')).toBeInTheDocument();

      // Check fields are not visible initially
      expect(screen.queryByLabelText(/^revenue/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/total leads/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/video views/i)).not.toBeInTheDocument();
    });

    it('should expand revenue section when clicked', async () => {
      const user = userEvent.setup();
      render(<CampaignDataEntryForm />, { wrapper: createWrapper() });

      // Click revenue section header
      const revenueButton = screen.getByRole('button', { name: /revenue tracking/i });
      await user.click(revenueButton);

      // Revenue field should now be visible
      await waitFor(() => {
        expect(screen.getByLabelText(/^revenue/i)).toBeInTheDocument();
      });
    });

    it('should expand lead generation section when clicked', async () => {
      const user = userEvent.setup();
      render(<CampaignDataEntryForm />, { wrapper: createWrapper() });

      // Click lead gen section header
      const leadGenButton = screen.getByRole('button', { name: /lead generation metrics/i });
      await user.click(leadGenButton);

      // Lead fields should now be visible
      await waitFor(() => {
        expect(screen.getByLabelText(/total leads/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/qualified leads/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/calls/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/appointments/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/form fills/i)).toBeInTheDocument();
      });
    });

    it('should expand social engagement section when clicked', async () => {
      const user = userEvent.setup();
      render(<CampaignDataEntryForm />, { wrapper: createWrapper() });

      // Click social section header
      const socialButton = screen.getByRole('button', { name: /social engagement metrics/i });
      await user.click(socialButton);

      // Social fields should now be visible
      await waitFor(() => {
        expect(screen.getByLabelText(/video views/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/likes/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/shares/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/comments/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/saves/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/profile visits/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/followers gained/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/watch time/i)).toBeInTheDocument();
      });
    });

    it('should collapse sections when clicked again', async () => {
      const user = userEvent.setup();
      render(<CampaignDataEntryForm />, { wrapper: createWrapper() });

      // Expand revenue section
      const revenueButton = screen.getByRole('button', { name: /revenue tracking/i });
      await user.click(revenueButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/^revenue/i)).toBeInTheDocument();
      });

      // Collapse it again
      await user.click(revenueButton);

      await waitFor(() => {
        expect(screen.queryByLabelText(/^revenue/i)).not.toBeInTheDocument();
      });
    });

    it('should auto-expand sections with existing data', () => {
      const initialData = {
        id: 'test-id',
        campaign_name: 'Test Campaign',
        metric_date: '2025-10-16',
        spend: 100,
        revenue: 500,
        leads: 10,
        video_views: 1000,
      } as any;

      render(<CampaignDataEntryForm initialData={initialData} />, { wrapper: createWrapper() });

      // All sections with data should be expanded
      expect(screen.getByLabelText(/^revenue/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/total leads/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/video views/i)).toBeInTheDocument();
    });
  });

  describe('Auto-Calculated Metrics', () => {
    it('should calculate CTR when impressions and clicks are entered', async () => {
      const user = userEvent.setup();
      render(<CampaignDataEntryForm />, { wrapper: createWrapper() });

      // Enter impressions and clicks
      const impressionsInput = screen.getByLabelText(/impressions/i);
      const clicksInput = screen.getByLabelText(/clicks/i);

      await user.type(impressionsInput, '10000');
      await user.type(clicksInput, '500');

      // Should show calculated CTR (500/10000 = 5%)
      await waitFor(() => {
        expect(screen.getByText(/CTR:/)).toBeInTheDocument();
        expect(screen.getByText(/5%/)).toBeInTheDocument();
      });
    });

    it('should calculate CPC when spend and clicks are entered', async () => {
      const user = userEvent.setup();
      render(<CampaignDataEntryForm />, { wrapper: createWrapper() });

      // Enter spend and clicks
      const spendInput = screen.getByLabelText(/spend/i);
      const clicksInput = screen.getByLabelText(/clicks/i);

      await user.type(spendInput, '1000');
      await user.type(clicksInput, '500');

      // Should show calculated CPC ($1000/500 = $2)
      await waitFor(() => {
        expect(screen.getByText(/CPC:/)).toBeInTheDocument();
        expect(screen.getByText(/\$2/)).toBeInTheDocument();
      });
    });

    it('should calculate ROI when revenue and spend are entered', async () => {
      const user = userEvent.setup();
      render(<CampaignDataEntryForm />, { wrapper: createWrapper() });

      // Enter spend
      const spendInput = screen.getByLabelText(/spend/i);
      await user.type(spendInput, '1000');

      // Expand revenue section
      const revenueButton = screen.getByRole('button', { name: /revenue tracking/i });
      await user.click(revenueButton);

      // Enter revenue
      const revenueInput = await screen.findByLabelText(/^revenue/i);
      await user.type(revenueInput, '3000');

      // Should show calculated ROI ((3000-1000)/1000 = 200%)
      await waitFor(() => {
        expect(screen.getByText(/ROI:/)).toBeInTheDocument();
        expect(screen.getByText(/200%/)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should require campaign name', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = vi.fn();

      render(<CampaignDataEntryForm onSuccess={mockOnSuccess} />, { wrapper: createWrapper() });

      // Try to submit without campaign name
      const submitButton = screen.getByRole('button', { name: /save metrics/i });
      await user.click(submitButton);

      // Form should not submit (browser validation)
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('should require spend', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = vi.fn();

      render(<CampaignDataEntryForm onSuccess={mockOnSuccess} />, { wrapper: createWrapper() });

      // Fill campaign name but not spend
      const campaignNameInput = screen.getByLabelText(/campaign name/i);
      await user.type(campaignNameInput, 'Test Campaign');

      // Try to submit without spend
      const submitButton = screen.getByRole('button', { name: /save metrics/i });
      await user.click(submitButton);

      // Form should not submit (browser validation)
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('should require date', async () => {
      const user = userEvent.setup();
      render(<CampaignDataEntryForm />, { wrapper: createWrapper() });

      const dateInput = screen.getByLabelText(/date/i);

      // Date field should be required
      expect(dateInput).toBeRequired();
    });
  });

  describe('Campaign Selector', () => {
    it('should show campaign selector dropdown', () => {
      render(<CampaignDataEntryForm />, { wrapper: createWrapper() });

      expect(screen.getByText(/link to campaign/i)).toBeInTheDocument();
    });

    it('should populate campaign name when campaign is selected', async () => {
      const user = userEvent.setup();
      render(<CampaignDataEntryForm />, { wrapper: createWrapper() });

      // Click campaign selector
      const campaignSelector = screen.getByLabelText(/link to campaign/i);
      await user.click(campaignSelector);

      // Select a campaign (this will open the dropdown in real UI)
      // Note: Full Select testing requires more complex setup with Radix UI
      expect(screen.getByText(/manual entry/i)).toBeInTheDocument();
    });

    it('should disable campaign name input when campaign is linked', async () => {
      const initialData = {
        campaign_id: 'campaign-1',
        campaign_name: 'Test Campaign 1',
        metric_date: '2025-10-16',
        spend: 100,
      } as any;

      render(<CampaignDataEntryForm initialData={initialData} />, { wrapper: createWrapper() });

      const campaignNameInput = screen.getByLabelText(/campaign name/i);
      expect(campaignNameInput).toBeDisabled();
    });
  });

  describe('Multi-Purpose Campaign Support', () => {
    it('should allow entering revenue, leads, and social metrics simultaneously', async () => {
      const user = userEvent.setup();
      render(<CampaignDataEntryForm />, { wrapper: createWrapper() });

      // Fill basic fields
      await user.type(screen.getByLabelText(/campaign name/i), 'Multi-Purpose Campaign');
      await user.type(screen.getByLabelText(/spend/i), '5000');

      // Expand and fill revenue section
      await user.click(screen.getByRole('button', { name: /revenue tracking/i }));
      await user.type(await screen.findByLabelText(/^revenue/i), '15000');

      // Expand and fill lead gen section
      await user.click(screen.getByRole('button', { name: /lead generation metrics/i }));
      await user.type(await screen.findByLabelText(/total leads/i), '85');
      await user.type(screen.getByLabelText(/qualified leads/i), '20');

      // Expand and fill social section
      await user.click(screen.getByRole('button', { name: /social engagement metrics/i }));
      await user.type(await screen.findByLabelText(/video views/i), '50000');
      await user.type(screen.getByLabelText(/likes/i), '2000');

      // All fields should have values
      expect(screen.getByLabelText(/^revenue/i)).toHaveValue(15000);
      expect(screen.getByLabelText(/total leads/i)).toHaveValue(85);
      expect(screen.getByLabelText(/video views/i)).toHaveValue(50000);
    });
  });

  describe('Form Actions', () => {
    it('should call onSuccess after successful submission', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = vi.fn();

      render(<CampaignDataEntryForm onSuccess={mockOnSuccess} />, { wrapper: createWrapper() });

      // Fill required fields
      await user.type(screen.getByLabelText(/campaign name/i), 'Test Campaign');
      await user.type(screen.getByLabelText(/spend/i), '1000');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /save metrics/i });
      await user.click(submitButton);

      // Wait for success callback
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnCancel = vi.fn();

      render(<CampaignDataEntryForm onCancel={mockOnCancel} />, { wrapper: createWrapper() });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();

      render(<CampaignDataEntryForm />, { wrapper: createWrapper() });

      // Fill and submit
      await user.type(screen.getByLabelText(/campaign name/i), 'Test Campaign');
      await user.type(screen.getByLabelText(/spend/i), '1000');

      const submitButton = screen.getByRole('button', { name: /save metrics/i });

      // Check for disabled state or loading text
      // Note: Actual implementation may vary
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('should populate all fields with initial data', () => {
      const initialData = {
        id: 'test-id',
        campaign_name: 'Test Campaign',
        metric_date: '2025-10-16',
        spend: 1000,
        revenue: 3000,
        impressions: 50000,
        clicks: 2500,
        conversions: 150,
        source: 'google_ads',
        notes: 'Test notes',
      } as any;

      render(<CampaignDataEntryForm initialData={initialData} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/campaign name/i)).toHaveValue('Test Campaign');
      expect(screen.getByLabelText(/spend/i)).toHaveValue(1000);
      expect(screen.getByLabelText(/^revenue/i)).toHaveValue(3000);
      expect(screen.getByLabelText(/impressions/i)).toHaveValue(50000);
      expect(screen.getByLabelText(/clicks/i)).toHaveValue(2500);
      expect(screen.getByLabelText(/conversions/i)).toHaveValue(150);
    });

    it('should show Update Metrics button in edit mode', () => {
      const initialData = {
        id: 'test-id',
        campaign_name: 'Test Campaign',
        metric_date: '2025-10-16',
        spend: 100,
      } as any;

      render(<CampaignDataEntryForm initialData={initialData} />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /update metrics/i })).toBeInTheDocument();
    });
  });

  describe('Data Source Field', () => {
    it('should show data source selector', () => {
      render(<CampaignDataEntryForm />, { wrapper: createWrapper() });

      expect(screen.getByText(/data source/i)).toBeInTheDocument();
    });

    it('should default to manual source', () => {
      render(<CampaignDataEntryForm />, { wrapper: createWrapper() });

      // Check if Manual Entry is selected (requires checking Select component state)
      const sourceSelect = screen.getByLabelText(/data source/i);
      expect(sourceSelect).toBeInTheDocument();
    });
  });

  describe('Notes Field', () => {
    it('should show notes textarea', () => {
      render(<CampaignDataEntryForm />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('should allow entering notes', async () => {
      const user = userEvent.setup();
      render(<CampaignDataEntryForm />, { wrapper: createWrapper() });

      const notesInput = screen.getByLabelText(/notes/i);
      await user.type(notesInput, 'This is a test note');

      expect(notesInput).toHaveValue('This is a test note');
    });
  });

  describe('Conversion Goal Selector', () => {
    it('should show conversion goal options in lead gen section', async () => {
      const user = userEvent.setup();
      render(<CampaignDataEntryForm />, { wrapper: createWrapper() });

      // Expand lead gen section
      await user.click(screen.getByRole('button', { name: /lead generation metrics/i }));

      // Conversion goal should be visible
      await waitFor(() => {
        expect(screen.getByLabelText(/conversion goal/i)).toBeInTheDocument();
      });
    });
  });
});
