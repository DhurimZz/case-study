# Bundle Size Optimization - Deep Dive

Reducing bundle size improves Time to Interactive (TTI), First Contentful Paint (FCP), and overall user experience. Every kilobyte matters.

## Table of Contents

1. [Dynamic Imports](#dynamic-imports)
2. [Tree Shaking](#tree-shaking)
3. [Bundle Analysis](#bundle-analysis)
4. [Code Splitting Strategies](#code-splitting-strategies)
5. [Third-Party Libraries](#third-party-libraries)

---

## Dynamic Imports

### Pattern: Route-Based Code Splitting

Next.js automatically code-splits by route, but you can optimize further with dynamic imports.

❌ **All modals in main bundle**
```typescript
import { LoginModal } from '@/features/auth/components/login-modal';
import { CheckoutModal } from '@/features/checkout/components/checkout-modal';
import { FilterModal } from '@/features/product/components/filter-modal';

export function App() {
  return (
    <div>
      {showLogin && <LoginModal />}
      {showCheckout && <CheckoutModal />}
      {showFilters && <FilterModal />}
    </div>
  );
}
```

✅ **Lazy load modals**
```typescript
import dynamic from 'next/dynamic';

const LoginModal = dynamic(() =>
  import('@/features/auth/components/login-modal').then(mod => mod.LoginModal)
);

const CheckoutModal = dynamic(() =>
  import('@/features/checkout/components/checkout-modal').then(mod => mod.CheckoutModal)
);

const FilterModal = dynamic(() =>
  import('@/features/product/components/filter-modal').then(mod => mod.FilterModal)
);

export function App() {
  return (
    <div>
      {showLogin && <LoginModal />}
      {showCheckout && <CheckoutModal />}
      {showFilters && <FilterModal />}
    </div>
  );
}
```

### Pattern: Feature Flags and Conditional Features

❌ **A/B test code in every bundle**
```typescript
import { ExperimentalCheckout } from '@/features/checkout/experimental';
import { StandardCheckout } from '@/features/checkout/standard';

export function CheckoutPage({ isExperiment }: { isExperiment: boolean }) {
  return isExperiment ? <ExperimentalCheckout /> : <StandardCheckout />;
}
```

✅ **Load only needed variant**
```typescript
import dynamic from 'next/dynamic';

const ExperimentalCheckout = dynamic(() =>
  import('@/features/checkout/experimental').then(mod => mod.ExperimentalCheckout)
);

const StandardCheckout = dynamic(() =>
  import('@/features/checkout/standard').then(mod => mod.StandardCheckout)
);

export function CheckoutPage({ isExperiment }: { isExperiment: boolean }) {
  return isExperiment ? <ExperimentalCheckout /> : <StandardCheckout />;
}
```

### Pattern: Heavy Libraries (Charts, Rich Text Editors)

❌ **Chart library in initial bundle**
```typescript
import { Chart } from 'chart.js';
import { Line } from 'react-chartjs-2';

export function Analytics({ data }: { data: ChartData }) {
  return <Line data={data} />;
}
```

✅ **Load chart library on demand**
```typescript
import dynamic from 'next/dynamic';

const Line = dynamic(
  () => import('react-chartjs-2').then(mod => mod.Line),
  {
    loading: () => <div className="h-64 animate-pulse bg-gray-200" />,
    ssr: false, // Chart.js requires window
  }
);

export function Analytics({ data }: { data: ChartData }) {
  return <Line data={data} />;
}
```

### Pattern: Dynamic Import with Loading State

```typescript
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const ProductComparison = dynamic(
  () => import('@/features/product/components/product-comparison'),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    ),
  }
);

export function ProductPage() {
  const [showComparison, setShowComparison] = useState(false);

  return (
    <div>
      <button onClick={() => setShowComparison(true)}>
        Compare Products
      </button>

      {showComparison && <ProductComparison />}
    </div>
  );
}
```

---

## Tree Shaking

Tree shaking removes unused code from your bundle. Ensure your imports are tree-shakeable.

### Pattern: Named Imports vs Default Imports

❌ **Import entire library**
```typescript
import _ from 'lodash'; // Entire lodash (~70KB)

const sorted = _.sortBy(items, 'name');
const grouped = _.groupBy(items, 'category');
```

✅ **Import specific functions**
```typescript
import sortBy from 'lodash/sortBy'; // Only sortBy (~2KB)
import groupBy from 'lodash/groupBy'; // Only groupBy (~3KB)

const sorted = sortBy(items, 'name');
const grouped = groupBy(items, 'category');
```

**Even better: Use native alternatives**
```typescript
// No lodash needed
const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));

const grouped = items.reduce((acc, item) => {
  const key = item.category;
  if (!acc[key]) acc[key] = [];
  acc[key].push(item);
  return acc;
}, {} as Record<string, typeof items>);
```

### Pattern: Icon Libraries

❌ **Import all icons**
```typescript
import * as Icons from 'react-icons/md'; // Entire Material Design icon set

export function IconButton() {
  return <Icons.MdShoppingCart />;
}
```

✅ **Import specific icons**
```typescript
import { MdShoppingCart } from 'react-icons/md'; // Only shopping cart icon

export function IconButton() {
  return <MdShoppingCart />;
}
```

**Best: Use SVG sprite or icon component system**
```typescript
// src/components/icon/icon.tsx
import { icons } from './icons';

interface IconProps {
  name: keyof typeof icons;
  className?: string;
}

export function Icon({ name, className }: IconProps) {
  const IconComponent = icons[name];
  return <IconComponent className={className} />;
}
```

### Pattern: Utility Functions

Create tree-shakeable utility modules:

✅ **Well-structured utils**
```typescript
// src/utils/format/format-price.ts
export function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency,
  }).format(value);
}

// src/utils/format/format-date.ts
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('de-CH').format(date);
}

// src/utils/format/index.ts - Only exports, no code
export { formatPrice } from './format-price';
export { formatDate } from './format-date';

// Usage - only imports what's needed
import { formatPrice } from '@/utils/format';
```

❌ **Barrel file with side effects**
```typescript
// src/utils/index.ts
export * from './format';
export * from './validation';
export * from './tracking'; // Heavy analytics vendor SDK
export * from './analytics'; // More heavy code

// Imports everything, even if you only need formatPrice
import { formatPrice } from '@/utils';
```

---

## Bundle Analysis

### Using Next.js Bundle Analyzer

```bash
# Install
npm install -D @next/bundle-analyzer

# Add to next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // your config
});

# Run analysis
ANALYZE=true npm run build
```

### Interpreting Results

Look for:
1. **Large chunks** (>200KB) - candidates for code splitting
2. **Duplicate dependencies** - same library in multiple chunks
3. **Unused exports** - tree-shaking opportunities
4. **Third-party libraries** - can you replace or eliminate?

### Target Bundle Sizes

- **First Load JS**: <100KB (target), <200KB (acceptable)
- **Route-specific chunks**: <50KB each
- **Shared chunks**: <150KB

From your project's bundle analysis:
```
Route (app)                              Size     First Load JS
┌ ○ /                                    147 B          96.6 kB
├ ○ /product/[code]             245 B          125 kB  ⚠️
```

If a route exceeds targets:
1. Identify heavy dependencies
2. Move to dynamic imports
3. Check for unused code
4. Consider route-based code splitting

---

## Code Splitting Strategies

### Strategy 1: Route-Based (Automatic)

Next.js App Router automatically splits by route:

```
src/app/
├── (routes)
│   ├── page.tsx              → / chunk
│   ├── product/
│   │   └── [code]/
│   │       └── page.tsx      → /product/[code] chunk
│   └── checkout/
│       └── page.tsx          → /checkout chunk
```

Each route gets its own chunk automatically.

### Strategy 2: Component-Based (Manual)

Split large components or feature modules:

```typescript
// Heavy feature that's not always needed
const ProductComparison = dynamic(() =>
  import('@/features/product/components/product-comparison')
);

const MapView = dynamic(() =>
  import('@/features/map/components/map-view')
);

const AdvancedFilters = dynamic(() =>
  import('@/features/product/components/advanced-filters')
);
```

### Strategy 3: Vendor Chunk Optimization

Split third-party dependencies into separate chunks:

```typescript
// next.config.js
module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // React/Next.js in separate chunk
          framework: {
            name: 'framework',
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            priority: 40,
          },
          // Large libraries in separate chunks
          liveblocks: {
            name: 'liveblocks',
            test: /[\\/]node_modules[\\/]@liveblocks[\\/]/,
            priority: 30,
          },
          // Common libraries
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
          },
        },
      };
    }
    return config;
  },
};
```

---

## Third-Party Libraries

### Pattern: Evaluate Before Adding

Before adding a dependency, ask:
1. **Can I implement this myself?** (Small utilities)
2. **Is there a lighter alternative?** (date-fns vs moment.js)
3. **Can I lazy load it?** (Heavy components)
4. **Is it tree-shakeable?** (ESM vs CommonJS)

### Common Heavy Dependencies to Watch

| Library | Size | Lighter Alternative |
|---------|------|---------------------|
| moment.js | ~230KB | date-fns (17KB) or native Intl |
| lodash | ~70KB | lodash-es (tree-shakeable) or native |
| chart.js | ~200KB | recharts (smaller) or lazy load |
| react-icons | ~2MB (all) | Import specific icons only |
| @material-ui | ~300KB+ | Tailwind CSS or custom components |

### Pattern: Replace with Native APIs

❌ **Heavy date library**
```typescript
import moment from 'moment';

const formatted = moment(date).format('DD.MM.YYYY');
const relative = moment(date).fromNow();
```

✅ **Native Intl API**
```typescript
// Formatting
const formatted = new Intl.DateTimeFormat('de-CH', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}).format(date);

// Relative time (newer browsers)
const relative = new Intl.RelativeTimeFormat('de-CH').format(-3, 'days');
```

### Pattern: Polyfill Only When Needed

```typescript
// Only load polyfill if needed
async function formatRelativeTime(value: number, unit: string) {
  if (!Intl.RelativeTimeFormat) {
    await import('@formatjs/intl-relativetimeformat/polyfill');
  }

  return new Intl.RelativeTimeFormat('de-CH').format(value, unit);
}
```

---

## Monitoring Bundle Size

### Set Budget in lighthouse.rc.js

```javascript
module.exports = {
  ci: {
    collect: {
      settings: {
        budgets: [
          {
            path: '/*',
            resourceSizes: [
              { resourceType: 'script', budget: 200 }, // 200KB max
              { resourceType: 'total', budget: 500 },  // 500KB max
            ],
          },
        ],
      },
    },
  },
};
```

### GitHub Actions Check

```yaml
- name: Check bundle size
  run: |
    npm run build
    npm run analyze
    node scripts/check-bundle-size.js # Fail if over budget
```

### Real User Monitoring

Track bundle impact with a real user monitoring tool:
- Time to Interactive (TTI)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)

---

## Quick Wins Checklist

Before optimizing, check these common issues:

- [ ] No full lodash imports (`import _ from 'lodash'`)
- [ ] Icons imported individually, not as `import * as Icons`
- [ ] Heavy features (charts, editors) are dynamically imported
- [ ] A/B test variants loaded conditionally
- [ ] Modal/drawer components lazy loaded
- [ ] No duplicate dependencies in bundle analysis
- [ ] Third-party libraries are tree-shakeable (ESM)
- [ ] Moment.js replaced with date-fns or native Intl
- [ ] Bundle size monitored in CI/CD
- [ ] Performance budgets set in Lighthouse CI
