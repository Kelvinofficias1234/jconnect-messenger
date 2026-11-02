import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, ArrowLeft, Package } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import ProductCard from '@/components/marketplace/ProductCard';
import AddProductModal from '@/components/marketplace/AddProductModal';
import useCurrentProfile from '@/hooks/useCurrentProfile';
import AppLogo from '@/components/AppLogo';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'electronics', label: 'Electronics' },
  { key: 'fashion', label: 'Fashion' },
  { key: 'home', label: 'Home' },
  { key: 'beauty', label: 'Beauty' },
  { key: 'sports', label: 'Sports' },
  { key: 'toys', label: 'Toys' },
  { key: 'food', label: 'Food' },
  { key: 'other', label: 'Other' },
];

export default function Marketplace({ onBack }) {
  const { profile, user } = useCurrentProfile();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [showAdd, setShowAdd] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const prods = await base44.entities.Product.filter({ status: 'active' }, '-created_date', 200);
      // ── Strict deduplication: one card per unique product ID ──
      // Prevents duplicate rows from overlapping pagination chunks or
      // duplicate database entries from ever reaching the UI.
      const seen = new Map();
      for (const p of prods) {
        if (p?.id && !seen.has(p.id)) seen.set(p.id, p);
      }
      setProducts([...seen.values()]);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProducts();
    const unsub = base44.entities.Product.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update' || event.type === 'delete') loadProducts();
    });
    return () => unsub();
  }, [loadProducts]);

  const filtered = products.filter(p => {
    if (category !== 'all' && p.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.title?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q);
    }
    return true;
  });

  // ── Render safety: purge any duplicate IDs that slipped through ──
  const uniqueFiltered = [];
  const _seenIds = new Set();
  for (const p of filtered) {
    if (p?.id && !_seenIds.has(p.id)) { _seenIds.add(p.id); uniqueFiltered.push(p); }
  }

  const myProducts = products.filter(p => p.seller_id === user?.id);
  // When "Your Listings" is shown, exclude those from the main grid to prevent
  // the same product appearing in both sections (true deduplication across sections)
  const showingMyListings = myProducts.length > 0 && category === 'all' && !search;
  const myProductIds = new Set(myProducts.map(p => p.id));
  const mainGridProducts = showingMyListings
    ? uniqueFiltered.filter(p => !myProductIds.has(p.id))
    : uniqueFiltered;

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: '#0d0b1e' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0 border-b border-white/5" style={{ backgroundColor: '#0f1025' }}>
        <Link to="/" className="flex items-center gap-2 pl-2.5 pr-3 py-2 -ml-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors shrink-0">
          <ArrowLeft size={26} />
          <span className="text-sm font-semibold hidden sm:inline">Home</span>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-white text-lg flex items-center">
            <AppLogo size="sm" name="J-Connect Market" textClassName="text-lg" />
          </h1>
          <p className="text-xs text-white/40">Buy and sell within your community</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
          <Plus size={16} /> Sell
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 shrink-0" style={{ backgroundColor: '#0f1025' }}>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full pl-9 pr-4 py-2.5 rounded-full text-sm text-white placeholder:text-white/30 focus:outline-none border border-white/10"
            style={{ backgroundColor: '#1e2140' }} />
        </div>
      </div>

      {/* Category chips */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide shrink-0" style={{ backgroundColor: '#0f1025' }}>
        {CATEGORIES.map(c => (
          <button key={c.key} onClick={() => setCategory(c.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              category === c.key ? 'text-white' : 'text-white/50 border border-white/10'
            }`}
            style={category === c.key ? { background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' } : { backgroundColor: 'rgba(255,255,255,0.03)' }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Products grid */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package size={48} className="text-white/15 mb-4" />
            <p className="text-white/60 font-medium mb-1">{search ? 'No products found' : 'No products yet'}</p>
            <p className="text-white/30 text-sm">{search ? 'Try a different search' : 'Be the first to list an item'}</p>
          </div>
        ) : (
          <>
            {myProducts.length > 0 && category === 'all' && !search && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Your Listings</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {myProducts.slice(0, 4).map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {mainGridProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </>
        )}
      </div>

      {showAdd && profile && user && (
        <AddProductModal
          userId={user.id}
          sellerName={profile.display_name}
          onClose={() => setShowAdd(false)}
          onDone={() => { setShowAdd(false); loadProducts(); }}
        />
      )}
    </div>
  );
}