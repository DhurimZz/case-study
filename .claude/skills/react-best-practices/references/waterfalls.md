# Async Waterfall Patterns - Deep Dive

This document provides advanced patterns for eliminating async waterfalls in Next.js applications.

## Table of Contents

1. [Server Component Composition](#server-component-composition)
2. [Middleware and Route Handlers](#middleware-and-route-handlers)
3. [Nested Component Data Loading](#nested-component-data-loading)
4. [API Route Optimization](#api-route-optimization)
5. [Common Anti-Patterns](#common-anti-patterns)

---

## Server Component Composition

### Pattern: Parallel Component Fetching

When composing Server Components, fetch data in parallel at the highest level possible.

❌ **Waterfall: Parent waits for child**
```typescript
// src/app/product/[code]/page.tsx
export default async function ProductPage({ params }: { params: { code: string } }) {
  const product = await fetchProduct(params.code);

  return (
    <div>
      <ProductDetails product={product} />
      <ProductReviews code={params.code} /> {/* Fetches after page loads */}
      <RelatedProducts code={params.code} /> {/* Fetches after reviews */}
    </div>
  );
}

// ProductReviews component
async function ProductReviews({ code }: { code: string }) {
  const reviews = await fetchReviews(code); // Waterfall!
  return <div>{/* reviews */}</div>;
}
```

✅ **Parallel: All components fetch simultaneously**
```typescript
// src/app/product/[code]/page.tsx
export default async function ProductPage({ params }: { params: { code: string } }) {
  // Fetch everything in parallel
  const [product, reviews, related] = await Promise.all([
    fetchProduct(params.code),
    fetchReviews(params.code),
    fetchRelatedProducts(params.code),
  ]);

  return (
    <div>
      <ProductDetails product={product} />
      <ProductReviews reviews={reviews} />
      <RelatedProducts products={related} />
    </div>
  );
}
```

### Pattern: Streaming with Suspense

For non-critical data, use Suspense boundaries to stream content:

```typescript
import { Suspense } from 'react';

export default async function ProductPage({ params }: { params: { code: string } }) {
  // Critical data - fetch immediately
  const product = await fetchProduct(params.code);

  return (
    <div>
      <ProductDetails product={product} />

      {/* Non-critical data - stream in */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <ProductReviews code={params.code} />
      </Suspense>

      <Suspense fallback={<RelatedSkeleton />}>
        <RelatedProducts code={params.code} />
      </Suspense>
    </div>
  );
}
```

**When to use Suspense vs Promise.all:**
- **Promise.all**: All data is critical, page shouldn't render without it
- **Suspense**: Some data is secondary, better UX to show partial content

---

## Middleware and Route Handlers

### Pattern: Early Exit in Middleware

❌ **Expensive auth check always runs**
```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  const session = await getSession(request); // Always fetches

  if (request.nextUrl.pathname.startsWith('/public')) {
    return NextResponse.next(); // Too late - already fetched session
  }

  if (!session) {
    return NextResponse.redirect('/login');
  }
}
```

✅ **Check public routes first**
```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  // Early exit for public routes
  if (request.nextUrl.pathname.startsWith('/public')) {
    return NextResponse.next(); // No auth check needed
  }

  // Only check session for protected routes
  const session = await getSession(request);

  if (!session) {
    return NextResponse.redirect('/login');
  }
}
```

### Pattern: Parallel Validation in API Routes

❌ **Sequential validation**
```typescript
// src/app/api/cart/add/route.ts
export async function POST(request: Request) {
  const body = await request.json();

  const validProduct = await validateProduct(body.productCode); // First
  if (!validProduct) return NextResponse.json({ error: 'Invalid product' }, { status: 400 });

  const validStock = await checkStock(body.productCode); // Second - waits
  if (!validStock) return NextResponse.json({ error: 'Out of stock' }, { status: 400 });

  const validUser = await validateUser(body.userId); // Third - waits
  if (!validUser) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });

  return addToCart(body);
}
```

✅ **Parallel validation**
```typescript
// src/app/api/cart/add/route.ts
export async function POST(request: Request) {
  const body = await request.json();

  // All validations run in parallel
  const [validProduct, validStock, validUser] = await Promise.all([
    validateProduct(body.productCode),
    checkStock(body.productCode),
    validateUser(body.userId),
  ]);

  // Check results
  if (!validProduct) return NextResponse.json({ error: 'Invalid product' }, { status: 400 });
  if (!validStock) return NextResponse.json({ error: 'Out of stock' }, { status: 400 });
  if (!validUser) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });

  return addToCart(body);
}
```

**Alternative: Fail-fast validation**
```typescript
// If order matters (e.g., auth before business logic)
const validUser = await validateUser(body.userId);
if (!validUser) return NextResponse.json({ error: 'Invalid user' }, { status: 401 });

// Only check product/stock for authenticated users
const [validProduct, validStock] = await Promise.all([
  validateProduct(body.productCode),
  checkStock(body.productCode),
]);
```

---

## Nested Component Data Loading

### Pattern: Hoist Data Fetching

❌ **Deeply nested fetches create waterfalls**
```typescript
// Page → Layout → Header → UserMenu → fetch user
async function UserMenu() {
  const user = await fetchCurrentUser(); // Waits for all parent components
  return <div>{user.name}</div>;
}
```

✅ **Fetch at page level, pass down**
```typescript
// src/app/layout.tsx
export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await fetchCurrentUser(); // Fetch once at top level

  return (
    <div>
      <Header user={user} />
      {children}
    </div>
  );
}

// Now synchronous - no waterfall
function UserMenu({ user }: { user: User }) {
  return <div>{user.name}</div>;
}
```

### Pattern: React Cache for Deduplication

When hoisting isn't possible, use React's `cache` to deduplicate requests:

```typescript
import { cache } from 'react';

// Deduplicate calls across component tree
export const getCurrentUser = cache(async () => {
  const response = await fetch(`${API_URL}/user/current`);
  return response.json();
});

// Multiple components can call this - only fetches once
async function UserMenu() {
  const user = await getCurrentUser();
  return <div>{user.name}</div>;
}

async function UserProfile() {
  const user = await getCurrentUser(); // Same request - uses cache
  return <div>{user.email}</div>;
}
```

---

## API Route Optimization

### Pattern: Aggregate Requests

❌ **Multiple API calls from client**
```typescript
'use client';

function ProductPage({ code }: { code: string }) {
  const { data: product } = useSWR(`/api/product/${code}`);
  const { data: price } = useSWR(`/api/price/${code}`); // Separate call
  const { data: stock } = useSWR(`/api/stock/${code}`); // Separate call
  const { data: reviews } = useSWR(`/api/reviews/${code}`); // Separate call
}
```

✅ **Single aggregated endpoint**
```typescript
// src/app/api/product/[code]/aggregate/route.ts
export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  const [product, price, stock, reviews] = await Promise.all([
    fetchProduct(params.code),
    fetchPrice(params.code),
    fetchStock(params.code),
    fetchReviews(params.code),
  ]);

  return NextResponse.json({
    product,
    price,
    stock,
    reviews,
  });
}

// Client makes single call
'use client';
function ProductPage({ code }: { code: string }) {
  const { data } = useSWR(`/api/product/${code}/aggregate`);
}
```

---

## Common Anti-Patterns

### Anti-Pattern 1: Conditional Fetch After Await

❌ **Fetch before checking condition**
```typescript
async function getProductDetails(code?: string) {
  const details = await fetchProductDetails(code); // Fetches even if code is undefined

  if (!code) {
    return null;
  }

  return details;
}
```

✅ **Check condition first**
```typescript
async function getProductDetails(code?: string) {
  if (!code) {
    return null;
  }

  const details = await fetchProductDetails(code);
  return details;
}
```

### Anti-Pattern 2: Sequential Dependent Fetches That Aren't Actually Dependent

❌ **Looks dependent but isn't**
```typescript
async function loadDashboard(userId: string) {
  const user = await fetchUser(userId);
  const orders = await fetchOrders(userId); // Uses userId, not user

  return { user, orders };
}
```

✅ **Truly independent - parallelize**
```typescript
async function loadDashboard(userId: string) {
  const [user, orders] = await Promise.all([
    fetchUser(userId),
    fetchOrders(userId), // Both need userId, not each other
  ]);

  return { user, orders };
}
```

### Anti-Pattern 3: Awaiting Inside Loops

❌ **Sequential loop processing**
```typescript
async function processProducts(codes: string[]) {
  const products = [];

  for (const code of codes) {
    const product = await fetchProduct(code); // Waits for each
    products.push(product);
  }

  return products;
}
```

✅ **Parallel processing**
```typescript
async function processProducts(codes: string[]) {
  const products = await Promise.all(
    codes.map(code => fetchProduct(code))
  );

  return products;
}
```

---

## Debugging Waterfalls

### Use React DevTools Profiler

1. Open React DevTools
2. Go to Profiler tab
3. Start recording
4. Perform action
5. Look for sequential timing in flamegraph

### Use Network Tab

1. Open Chrome DevTools Network tab
2. Look for "Waterfall" column
3. Identify requests that start after others finish
4. Check if they could be parallelized

### Server Component Timing

Add timing logs to identify bottlenecks:

```typescript
export default async function ProductPage({ params }: { params: { code: string } }) {
  console.time('product-page');

  console.time('fetch-product');
  const product = await fetchProduct(params.code);
  console.timeEnd('fetch-product');

  console.time('fetch-reviews');
  const reviews = await fetchReviews(params.code);
  console.timeEnd('fetch-reviews');

  console.timeEnd('product-page');

  return <div>{/* ... */}</div>;
}
```

If `product-page` time ≈ sum of individual fetches → waterfall exists!
