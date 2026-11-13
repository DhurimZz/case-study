# Re-render Optimization - Deep Dive

Unnecessary re-renders waste CPU cycles and degrade user experience. This guide covers memoization strategies, React optimization patterns, and performance profiling.

## Table of Contents

1. [Lazy State Initialization](#lazy-state-initialization)
2. [Memoization with useMemo](#memoization-with-usememo)
3. [Callback Memoization with useCallback](#callback-memoization-with-usecallback)
4. [Component Memoization with memo](#component-memoization-with-memo)
5. [Loop Optimization](#loop-optimization)
6. [Context Optimization](#context-optimization)

---

## Lazy State Initialization

### Pattern: Expensive Initial State

When initial state requires expensive computation, use lazy initialization to run it only once.

❌ **Runs on every render**
```typescript
function ProductFilters({ filterString }: { filterString: string }) {
  // JSON.parse runs EVERY time component re-renders
  const [filters, setFilters] = useState(JSON.parse(filterString));

  // Parent re-renders → component re-renders → JSON.parse runs again
  return <div>{/* filters UI */}</div>;
}
```

✅ **Runs only on mount**
```typescript
function ProductFilters({ filterString }: { filterString: string }) {
  // Function only executes once during initial render
  const [filters, setFilters] = useState(() => JSON.parse(filterString));

  return <div>{/* filters UI */}</div>;
}
```

### When to Use Lazy Initialization

Use when initial state involves:
- JSON parsing
- Complex calculations
- Array transformations
- Object mapping
- LocalStorage reads
- Heavy computations

```typescript
// ✅ Good candidates for lazy initialization
const [data, setData] = useState(() => JSON.parse(localStorage.getItem('key') || '{}'));
const [sorted, setSorted] = useState(() => heavySort(largeArray));
const [mapped, setMapped] = useState(() => items.map(transform));
const [config, setConfig] = useState(() => parseComplexConfig(rawConfig));

// ❌ Don't need lazy initialization
const [count, setCount] = useState(0); // Simple primitive
const [user, setUser] = useState(userData); // Already computed
const [open, setOpen] = useState(false); // Simple boolean
```

---

## Memoization with useMemo

### Pattern: Expensive Computations

Use `useMemo` to cache expensive calculations between re-renders.

❌ **Recalculates on every render**
```typescript
function ProductList({ products }: { products: Product[] }) {
  // Runs every time component re-renders (parent state change, etc.)
  const sortedProducts = products
    .filter(p => p.inStock)
    .sort((a, b) => b.price - a.price)
    .slice(0, 10);

  return <div>{sortedProducts.map(p => <ProductCard key={p.id} product={p} />)}</div>;
}
```

✅ **Recalculates only when products change**
```typescript
function ProductList({ products }: { products: Product[] }) {
  // Only recalculates if products array changes
  const sortedProducts = useMemo(
    () => products
      .filter(p => p.inStock)
      .sort((a, b) => b.price - a.price)
      .slice(0, 10),
    [products]
  );

  return <div>{sortedProducts.map(p => <ProductCard key={p.id} product={p} />)}</div>;
}
```

### When to Use useMemo

✅ **Use when:**
- Computation is expensive (filtering, sorting large arrays)
- Result is used in rendering
- Computation depends on props/state that change infrequently
- Passing computed value to child components

❌ **Don't use for:**
- Simple calculations (addition, string concatenation)
- Values that change on every render anyway
- Premature optimization

### Pattern: Derived State

```typescript
function Cart({ items }: { items: CartItem[] }) {
  // Expensive calculations - only recompute when items change
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const itemCount = useMemo(
    () => items.reduce((count, item) => count + item.quantity, 0),
    [items]
  );

  const hasDigitalItems = useMemo(
    () => items.some(item => item.type === 'digital'),
    [items]
  );

  return (
    <div>
      <p>Total: {formatPrice(total)}</p>
      <p>Items: {itemCount}</p>
      {hasDigitalItems && <DigitalItemsNotice />}
    </div>
  );
}
```

---

## Callback Memoization with useCallback

### Pattern: Prevent Child Re-renders

Use `useCallback` to prevent child components from re-rendering when parent re-renders.

❌ **Creates new function on every render**
```typescript
function ProductPage() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // New function reference on EVERY render
  const handleSelect = (product: Product) => {
    setSelectedProduct(product);
  };

  // ProductList re-renders even when nothing changed
  return <ProductList onSelect={handleSelect} />;
}
```

✅ **Stable function reference**
```typescript
function ProductPage() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Same function reference across renders
  const handleSelect = useCallback((product: Product) => {
    setSelectedProduct(product);
  }, []); // No dependencies - function never changes

  // ProductList only re-renders when props actually change
  return <ProductList onSelect={handleSelect} />;
}
```

### When to Use useCallback

✅ **Use when:**
- Passing callbacks to memoized child components
- Callback is a dependency of useEffect/useMemo
- Callback is used in comparison (e.g., array.includes(callback))

❌ **Don't use for:**
- Event handlers that aren't passed to children
- Callbacks that change frequently anyway
- Non-memoized child components

### Pattern: Event Handlers with Dependencies

```typescript
function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);

  // Debounced search - only recreate if dependencies change
  const handleSearch = useCallback(
    debounce((searchQuery: string) => {
      fetchProducts(searchQuery).then(setResults);
    }, 300),
    [] // debounce function is stable
  );

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    handleSearch(value);
  }, [handleSearch]);

  return <input value={query} onChange={handleChange} />;
}
```

---

## Component Memoization with memo

### Pattern: Prevent Re-renders of Pure Components

Use `React.memo` to skip re-rendering when props haven't changed.

❌ **Re-renders even when props are the same**
```typescript
function ProductCard({ product }: { product: Product }) {
  console.log('ProductCard rendered');
  return <div>{product.name}</div>;
}

function ProductList({ products }: { products: Product[] }) {
  const [count, setCount] = useState(0); // Unrelated state

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Click: {count}</button>
      {/* All ProductCards re-render when count changes */}
      {products.map(p => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}
```

✅ **Only re-renders when product changes**
```typescript
const ProductCard = memo(function ProductCard({ product }: { product: Product }) {
  console.log('ProductCard rendered');
  return <div>{product.name}</div>;
});

function ProductList({ products }: { products: Product[] }) {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Click: {count}</button>
      {/* ProductCards only re-render if their product changes */}
      {products.map(p => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}
```

### Pattern: Custom Comparison

```typescript
interface ProductCardProps {
  product: Product;
  onSelect: (id: string) => void;
}

const ProductCard = memo(
  function ProductCard({ product, onSelect }: ProductCardProps) {
    return (
      <div onClick={() => onSelect(product.id)}>
        {product.name} - {product.price}
      </div>
    );
  },
  // Custom comparison - only re-render if product ID or price changes
  (prevProps, nextProps) => {
    return (
      prevProps.product.id === nextProps.product.id &&
      prevProps.product.price === nextProps.product.price
    );
  }
);
```

### When to Use memo

✅ **Use when:**
- Component renders often with same props
- Component is expensive to render
- Parent re-renders frequently for unrelated reasons
- Props are stable (primitives, memoized objects/arrays)

❌ **Don't use for:**
- Components that always get new props
- Cheap components (simple div/span)
- Premature optimization

---

## Loop Optimization

### Pattern: Consolidate Multiple Iterations

Reduce multiple passes over the same data into a single iteration.

❌ **Multiple iterations over same array**
```typescript
function ProductStats({ products }: { products: Product[] }) {
  const total = products.reduce((sum, p) => sum + p.price, 0);
  const inStock = products.filter(p => p.inStock).length;
  const categories = products.map(p => p.category);
  const hasDigital = products.some(p => p.type === 'digital');

  // 4 iterations over products array
}
```

✅ **Single iteration**
```typescript
function ProductStats({ products }: { products: Product[] }) {
  const stats = products.reduce((acc, p) => ({
    total: acc.total + p.price,
    inStock: acc.inStock + (p.inStock ? 1 : 0),
    categories: [...acc.categories, p.category],
    hasDigital: acc.hasDigital || p.type === 'digital',
  }), {
    total: 0,
    inStock: 0,
    categories: [] as string[],
    hasDigital: false,
  });

  // Only 1 iteration
}
```

### Pattern: Early Termination

```typescript
// ❌ Processes all items even after finding match
function hasOutOfStock(products: Product[]): boolean {
  const outOfStock = products.filter(p => !p.inStock);
  return outOfStock.length > 0;
}

// ✅ Stops at first match
function hasOutOfStock(products: Product[]): boolean {
  return products.some(p => !p.inStock);
}
```

### Pattern: Avoid Nested Loops

❌ **O(n²) complexity**
```typescript
function findDuplicates(products: Product[]): Product[] {
  const duplicates: Product[] = [];

  for (const product of products) {
    for (const other of products) {
      if (product.id === other.id && product !== other) {
        duplicates.push(product);
      }
    }
  }

  return duplicates;
}
```

✅ **O(n) with Set**
```typescript
function findDuplicates(products: Product[]): Product[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const product of products) {
    if (seen.has(product.id)) {
      duplicates.add(product.id);
    }
    seen.add(product.id);
  }

  return products.filter(p => duplicates.has(p.id));
}
```

---

## Context Optimization

### Pattern: Split Contexts by Update Frequency

❌ **Single context causes re-renders for all consumers**
```typescript
interface AppContextValue {
  user: User;
  theme: Theme;
  cart: Cart; // Changes frequently
}

const AppContext = createContext<AppContextValue | null>(null);

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<Theme>('light');
  const [cart, setCart] = useState<Cart>({ items: [] });

  // Every cart update re-renders all consumers (user, theme, cart)
  return (
    <AppContext.Provider value={{ user, theme, cart }}>
      {children}
    </AppContext.Provider>
  );
}
```

✅ **Separate contexts**
```typescript
const UserContext = createContext<User | null>(null);
const ThemeContext = createContext<Theme>('light');
const CartContext = createContext<Cart>({ items: [] });

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<Theme>('light');
  const [cart, setCart] = useState<Cart>({ items: [] });

  // Cart updates only re-render CartContext consumers
  return (
    <UserContext.Provider value={user}>
      <ThemeContext.Provider value={theme}>
        <CartContext.Provider value={cart}>
          {children}
        </CartContext.Provider>
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}
```

### Pattern: Context Selector Pattern

```typescript
// Context with stable value and update function
const CartContext = createContext<{
  cart: Cart;
  updateCart: (cart: Cart) => void;
} | null>(null);

function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({ items: [] });

  // Memoize to prevent re-renders
  const value = useMemo(() => ({
    cart,
    updateCart: setCart,
  }), [cart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// Hook that only subscribes to specific cart property
function useCartItemCount() {
  const context = useContext(CartContext);
  return useMemo(
    () => context?.cart.items.reduce((count, item) => count + item.quantity, 0) ?? 0,
    [context?.cart.items]
  );
}
```

---

## Performance Profiling

### Using React DevTools Profiler

1. Install React DevTools browser extension
2. Open DevTools → Profiler tab
3. Click record button
4. Perform action (click, type, etc.)
5. Stop recording
6. Analyze flamegraph

**What to look for:**
- Components that render frequently
- Long render times (yellow/red in flamegraph)
- Cascading re-renders (many components re-rendering together)

### Using Performance API

```typescript
function expensiveOperation() {
  performance.mark('operation-start');

  // ... expensive work ...

  performance.mark('operation-end');
  performance.measure('operation', 'operation-start', 'operation-end');

  const measure = performance.getEntriesByName('operation')[0];
  console.log(`Operation took ${measure.duration}ms`);
}
```

### Component Render Tracking

```typescript
function useRenderCount(componentName: string) {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current += 1;
    console.log(`${componentName} rendered ${renderCount.current} times`);
  });
}

function ProductCard({ product }: { product: Product }) {
  useRenderCount('ProductCard');
  return <div>{product.name}</div>;
}
```

---

## Quick Reference Checklist

Before committing, check:

- [ ] Expensive useState initial values use lazy initialization
- [ ] Expensive calculations use useMemo
- [ ] Callbacks passed to children use useCallback
- [ ] Frequently re-rendering components use memo
- [ ] Multiple array iterations consolidated into one
- [ ] Early loop termination (some/every) instead of filter + length
- [ ] Context split by update frequency
- [ ] No premature optimization (profile first!)

**Warning signs of re-render issues:**
- UI feels sluggish during interactions
- Typing in inputs has lag
- Scroll performance is poor
- DevTools shows many components re-rendering
- High CPU usage in browser
