# Outlet Cards UI - React Application

A high-performance React application for displaying thousands of outlet cards with lazy loading, infinite scroll, and responsive design.

## Features

### 🚀 Performance Optimized
- **Lazy Loading**: Images load only when visible in viewport using native `loading="lazy"`
- **Infinite Scroll**: Efficient pagination with React Query's `useInfiniteQuery`
- **Intersection Observer**: Smart scroll detection with 100px preload buffer
- **Debounced Search**: 300ms debounce to reduce API calls
- **React Query Caching**: 5-minute stale time for optimal data reuse

### 📱 Responsive Design
- **CSS Grid Layout**: Automatically adjusts columns based on screen size
- **Mobile-First**: Optimized for all device sizes
- **Breakpoints**:
  - Desktop: 4-5 columns (280px min width)
  - Tablet: 2-3 columns (240px min width)
  - Mobile: 1 column

### 🎨 Modern UI/UX
- **Card Hover Effects**: Smooth elevation transitions
- **Loading Skeletons**: Animated placeholders for images
- **Dark Mode Support**: Respects system preferences
- **Search Functionality**: Real-time filtering by outlet code or name
- **Error Handling**: User-friendly error states

## Tech Stack

- **React 18.2** - UI library with concurrent features
- **TanStack Query (React Query) 5.x** - Server state management
- **Axios** - HTTP client with interceptors
- **Vite 5.x** - Fast build tool and dev server
- **CSS3** - Modern styling with Grid and Flexbox

## Project Structure

```
react-app/
├── src/
│   ├── components/
│   │   ├── OutletCard.jsx      # Single outlet card component
│   │   ├── OutletGrid.jsx      # Grid with infinite scroll
│   │   └── SearchBar.jsx       # Debounced search input
│   ├── hooks/
│   │   └── useOutlets.js       # React Query hooks for API
│   ├── services/
│   │   └── api.js              # Axios client and API methods
│   ├── styles/
│   │   ├── App.css
│   │   ├── OutletCard.css
│   │   ├── OutletGrid.css
│   │   └── SearchBar.css
│   ├── App.jsx                 # Main app component
│   └── main.jsx                # React entry point
├── index.html                   # HTML template
├── vite.config.js              # Vite configuration
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20+ (LTS recommended)
- npm or yarn
- Backend API running on `http://localhost:3001`

### Installation

1. **Install dependencies:**

```bash
cd react-app
npm install
```

2. **Set up backend (if not already running):**

```bash
# In the backend directory
cd ../backend
npm install

# Set up database
npm run setup-db

# Seed with sample data (includes 100 outlets)
npm run seed-db

# Start backend server
npm start
```

3. **Start development server:**

```bash
cd ../react-app
npm run dev
```

The app will be available at `http://localhost:5174`

### Environment Configuration

The Vite dev server is configured to proxy API requests to the backend:

```javascript
// vite.config.js
server: {
  port: 5174,
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true
    }
  }
}
```

For production, you'll need to configure the API base URL in `src/services/api.js`.

## Authentication

The app uses JWT bearer token authentication stored in `localStorage`.

**Default credentials** (from seeded database):
- **Admin**: `admin` / `Admin123!`
- **Analyst**: `analyst` / `Analyst123!`
- **Viewer**: `viewer` / `Viewer123!`

### Login Flow

1. Call `authApi.login(username, password)` to authenticate
2. Token is automatically stored in `localStorage`
3. All API requests include the token via Axios interceptor
4. On 401 errors, users should be redirected to login

**Example:**

```javascript
import { authApi } from './services/api';

// Login
const { token, user } = await authApi.login('admin', 'Admin123!');

// Token is automatically included in subsequent requests
// Logout
await authApi.logout();
```

## API Endpoints

### Outlets API

**GET** `/api/outlets`
- Query params: `limit`, `offset`, `search`
- Response: `{ outlets: [], total: number, hasMore: boolean }`

**GET** `/api/outlets/:id`
- Response: Single outlet object

**POST** `/api/outlets` (Admin only)
- Body: `{ code, name, image }`

**PUT** `/api/outlets/:id` (Admin only)
- Body: `{ code?, name?, image? }`

**DELETE** `/api/outlets/:id` (Admin only)

## React Query Hooks

### `useInfiniteOutlets({ limit, search })`

Infinite scroll query for outlets list.

```javascript
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading
} = useInfiniteOutlets({ limit: 20, search: '' });

// Access all outlets from all pages
const outlets = data?.pages?.flatMap(page => page.outlets) || [];
```

### `useOutlets({ limit, offset, search })`

Standard paginated query.

```javascript
const { data, isLoading, error } = useOutlets({
  limit: 20,
  offset: 0,
  search: 'downtown'
});
```

### `useCreateOutlet()`, `useUpdateOutlet()`, `useDeleteOutlet()`

Mutation hooks with automatic cache invalidation.

```javascript
const createOutlet = useCreateOutlet();

createOutlet.mutate({
  code: 'OUT0999',
  name: 'New Outlet',
  image: 'https://example.com/image.jpg'
});
```

## Performance Optimizations

### 1. Lazy Image Loading

```jsx
<img
  src={outlet.image}
  loading="lazy"  // Native browser lazy loading
  onLoad={handleImageLoad}
/>
```

### 2. Intersection Observer

Loads next page 100px before reaching the bottom:

```javascript
const option = {
  root: null,
  rootMargin: '100px',  // Preload buffer
  threshold: 0
};
```

### 3. Debounced Search

Reduces API calls during typing:

```javascript
const handleChange = (e) => {
  // Wait 300ms after user stops typing
  setTimeout(() => onSearch(value), 300);
};
```

### 4. React Query Caching

```javascript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});
```

### 5. CSS Grid Auto-Fill

Responsive columns without media queries:

```css
.outlet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}
```

## Building for Production

```bash
npm run build
```

The optimized build will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Required Features:**
- CSS Grid
- Intersection Observer API
- Native lazy loading (`loading="lazy"`)
- ES2020 JavaScript

## Customization

### Change Items Per Page

In `src/hooks/useOutlets.js`:

```javascript
export function useInfiniteOutlets({ limit = 20, search = '' } = {}) {
  // Change limit default value
}
```

### Adjust Preload Buffer

In `src/components/OutletGrid.jsx`:

```javascript
const option = {
  rootMargin: '200px',  // Load earlier
  threshold: 0
};
```

### Modify Card Styles

Edit `src/styles/OutletCard.css`:

```css
.outlet-card {
  border-radius: 12px;  /* More rounded */
  /* Add custom styles */
}
```

## Troubleshooting

### Cards not loading?

1. Check backend is running: `http://localhost:3001/health`
2. Verify database has outlets: Check seed script ran successfully
3. Check browser console for API errors
4. Verify authentication token in localStorage

### Infinite scroll not working?

1. Check browser supports Intersection Observer
2. Verify `hasNextPage` is true
3. Check network tab for API calls
4. Ensure observer ref is attached to DOM element

### Images not loading?

1. Check image URLs are valid
2. Verify CORS settings on image host
3. Check browser network tab for 404s
4. Fallback to placeholder if image fails

## Future Enhancements

- [ ] Virtual scrolling for 10,000+ cards (@tanstack/react-virtual)
- [ ] Image optimization with WebP format
- [ ] Progressive Web App (PWA) support
- [ ] Advanced filters (location, status, etc.)
- [ ] Sorting options (name, code, date)
- [ ] Card detail modal/page
- [ ] Export functionality (CSV, PDF)
- [ ] Bulk operations for admins
- [ ] Real-time updates with WebSocket

## License

This project is part of the SQL Browser application.

## Support

For issues or questions, refer to the main project documentation.
