# Unit Testing Setup

This directory contains unit test configuration and setup files for the web app.

## Testing Stack

- **Test Runner**: Vitest (fast Vite-native test runner)
- **Environment**: jsdom (a DOM implementation in Node)
- **Testing Library**: React Testing Library (user-centric component testing)
- **Assertions**: Jest-DOM matchers
- **Coverage**: V8 coverage provider

## Installation

Nothing to install by hand. Every package above is a `devDependency` in
`apps/web/package.json`, so a normal install is all you need:

```bash
npm install     # from the repository root
```

`devDependencies` are installed by default, are not part of the production
bundle, and are not needed to build or run the app — only to run its tests.
Declaring them is what keeps the test layer working for everyone; an earlier
version of this file asked each developer to install the list manually, and the
result was that jsdom was configured in `vitest.config.ts` but present in no
one's `node_modules`, so no unit test could run at all.

If you would rather not use jsdom, Vitest accepts alternatives such as
`happy-dom`; swap the `environment` in `vitest.config.ts` and this file's
dependency. That is a deliberate change to make, not a per-developer one.

## Running Tests

Run these from `apps/web`, or use `npm run <script> --prefix apps/web` from the
repository root. TESTING.md lists every test command in one place.

```bash
npm test                    # unit tests, once (the fastest check)
npm run test:unit:watch     # unit tests in watch mode while developing
npm run test:unit:ui        # Vitest UI in a browser
npm run test:coverage       # unit tests plus a coverage report

npm run test:smoke          # E2E: login smoke path, quick and reliable
npm run test:e2e            # E2E: every spec, all configured browsers
npm run test:e2e:ui         # E2E: Playwright UI mode
npm run test:e2e:headed     # E2E: watch a real browser
npm run test:a11y           # E2E: accessibility specs
```

The E2E scripts need the app running against its local Supabase stack, and
Playwright starts Vite for you. See TESTING.md for that setup.

Run a single file or filter by name:

```bash
npx vitest run src/lib/pkce.test.ts
npx vitest run -t "progressive disclosure"
```

## File Structure

```
apps/web/src/
├── test/
│   ├── setup.ts          # Global test setup (matchers, mocks)
│   └── README.md         # This file
├── components/
│   └── roi-budget/
│       ├── CampaignDataEntryForm.tsx
│       └── CampaignDataEntryForm.test.tsx  # Unit tests
└── ...
```

## Writing Unit Tests

### Test File Naming Convention

- Place test files next to the component: `ComponentName.test.tsx`
- Or in a `__tests__` directory: `__tests__/ComponentName.test.tsx`

### Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MyComponent } from './MyComponent';

// Mock dependencies
vi.mock('@/hooks/data/useMyHook', () => ({
  useMyHook: () => ({ data: [], isLoading: false }),
}));

// Create wrapper with providers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render correctly', () => {
    render(<MyComponent />, { wrapper: createWrapper() });
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    render(<MyComponent />, { wrapper: createWrapper() });

    const button = screen.getByRole('button', { name: /click me/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
    });
  });
});
```

## Testing Best Practices

### 1. User-Centric Testing
Test from the user's perspective, not implementation details:

```typescript
// ✅ GOOD: Test what users see and do
expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
await user.click(screen.getByRole('button', { name: /save/i }));

// ❌ BAD: Test implementation details
expect(wrapper.find('.save-button')).toHaveLength(1);
```

### 2. Async Testing
Always use `waitFor` for async operations:

```typescript
// ✅ GOOD: Wait for async state changes
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// ❌ BAD: Arbitrary timeouts
await new Promise(resolve => setTimeout(resolve, 1000));
```

### 3. Query Priorities
Use semantic queries in this order:

1. **getByRole**: Most accessible (buttons, links, inputs with roles)
2. **getByLabelText**: Form fields with labels
3. **getByPlaceholderText**: Inputs with placeholders
4. **getByText**: Visible text content
5. **getByTestId**: Last resort (requires adding test IDs)

### 4. User Events
Use `userEvent` over `fireEvent` for realistic user interactions:

```typescript
// ✅ GOOD: userEvent simulates real user behavior
const user = userEvent.setup();
await user.type(input, 'Hello');
await user.click(button);

// ❌ BAD: fireEvent is too low-level
fireEvent.change(input, { target: { value: 'Hello' } });
fireEvent.click(button);
```

### 5. Mocking
Mock external dependencies, not internal implementation:

```typescript
// ✅ GOOD: Mock API hooks
vi.mock('@/hooks/data/useCampaignMetrics', () => ({
  useCreateCampaignMetric: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'test' }),
    isPending: false,
  }),
}));

// ❌ BAD: Mock internal component functions
vi.spyOn(MyComponent.prototype, 'handleClick');
```

## Coverage Guidelines

Target coverage thresholds:
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

Focus on critical paths and user interactions, not arbitrary coverage numbers.

## Common Issues & Solutions

### Issue: "Cannot find module '@/components/...'"
**Solution**: Ensure `vitest.config.ts` has path alias configured:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

### Issue: "window.matchMedia is not a function"
**Solution**: Already mocked in `setup.ts`

### Issue: "ResizeObserver is not defined"
**Solution**: Already mocked in `setup.ts`

### Issue: "IntersectionObserver is not a constructor"
**Solution**: Already mocked in `setup.ts`

### Issue: Radix UI Select/Dialog not working in tests
**Solution**: Test the visible parts (trigger buttons, labels) rather than internal Radix mechanics. For dropdowns, test that clicking the trigger shows/hides content.

## CI

The web unit tests already run in CI — see `.github/workflows/ci.yml`. That job
names the four currently-passing files rather than running all of `src`, because
`CampaignDataEntryForm.test.tsx` has 8 genuine assertion failures. Fix those and
the job can drop its explicit file list for a bare `vitest run`.

## Resources

- [Vitest Documentation](https://vitest.dev)
- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro)
- [Common Testing Patterns](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Test files**: 5, covering the auth store, PKCE handling, locale normalisation,
the auth callback and the ROI budget form. Run `npm run test:coverage` for the
current report.
