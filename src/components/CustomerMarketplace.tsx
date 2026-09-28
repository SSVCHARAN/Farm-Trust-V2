import React, { useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  Star,
  ShieldCheck,
  MapPin,
  Leaf,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Mic,
  X,
  Check,
  Plus,
  Minus,
  Truck
} from 'lucide-react';
import { Product, Farmer, ProductCategory, CustomerVoiceSearchIntent, CustomerRequest } from '../types';
import { Language, translations } from '../data/translations';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { BottomSheet } from './ui/BottomSheet';

interface CustomerMarketplaceProps {
  products: Product[];
  farmers: Farmer[];
  language: Language;
  activeVoiceIntent: CustomerVoiceSearchIntent | null;
  onOpenVoiceSearch: () => void;
  onOpenCustomerRequest: () => void;
  onClearVoiceIntent: () => void;
  onSelectProduct: (product: Product) => void;
  onSelectFarmer: (farmer: Farmer) => void;
  onQuickOrder: (product: Product) => void;
  customerRequests?: CustomerRequest[];
  onAcceptFarmerOffer?: (requestId: string, offerId: string) => void;
}

export const CustomerMarketplace: React.FC<CustomerMarketplaceProps> = ({
  products,
  farmers,
  language,
  activeVoiceIntent,
  onOpenVoiceSearch,
  onOpenCustomerRequest,
  onClearVoiceIntent,
  onSelectProduct,
  onSelectFarmer,
  onQuickOrder,
  customerRequests = [],
  onAcceptFarmerOffer,
}) => {
  const t = translations[language];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'recommended' | 'price-asc' | 'price-desc' | 'rating'>('recommended');
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);

  // Basket quantities tracked per product ID
  const [basket, setBasket] = useState<Record<string, number>>({
    'prod-1': 2, // initial demo basket item (2 kg tomatoes)
  });

  const categories = [
    { id: 'All', label: language === 'te' ? 'అన్ని పంటలు' : 'All', icon: '🌾' },
    { id: 'Vegetables', label: language === 'te' ? 'కూరగాయలు' : 'Vegetables', icon: '🥬' },
    { id: 'Fruits', label: language === 'te' ? 'పండ్లు' : 'Fruits', icon: '🥭' },
    { id: 'Grains', label: language === 'te' ? 'ధాన్యాలు' : 'Grains', icon: '🌾' },
    { id: 'Dairy', label: language === 'te' ? 'పాల ఉత్పత్తులు' : 'Dairy', icon: '🥛' },
    { id: 'Organic', label: language === 'te' ? 'సేంద్రీయ' : 'Organic', icon: '🌿' },
  ];

  // Requests that have received farmer offers
  const requestsWithOffers = customerRequests.filter(
    (r) => r.offers && r.offers.length > 0 && r.status !== 'FULFILLED'
  );

  // Filter & Search Logic
  const filteredProducts = products.filter((p) => {
    // 1. Voice Intent Filter if active
    if (activeVoiceIntent) {
      const intentProd = activeVoiceIntent.product.toLowerCase();
      const matchesIntentProd =
        p.name.toLowerCase().includes(intentProd) ||
        p.teluguName.toLowerCase().includes(intentProd) ||
        intentProd.includes(p.name.toLowerCase().split(' ')[0]);

      if (!matchesIntentProd) return false;

      if (activeVoiceIntent.maxPrice && p.price > activeVoiceIntent.maxPrice) {
        return false;
      }

      if (activeVoiceIntent.organicOnly && !p.organicClaim) {
        return false;
      }
    }

    // 2. Category Filter
    const matchesCategory =
      selectedCategory === 'All' ||
      p.category === selectedCategory ||
      (selectedCategory === 'Organic' && p.organicClaim);

    if (!matchesCategory) return false;

    // 3. Text Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        p.name.toLowerCase().includes(query) ||
        p.teluguName.toLowerCase().includes(query) ||
        p.farmerName.toLowerCase().includes(query) ||
        p.farmerLocation.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query);

      if (!matchesQuery) return false;
    }

    return true;
  });

  // Sort Logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'rating') return b.farmerRating - a.farmerRating;
    return b.createdAt - a.createdAt;
  });

  // Stepper Handlers for Basket
  const handleAddToBasket = (productId: string) => {
    setBasket((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  };

  const handleUpdateBasketQty = (productId: string, delta: number) => {
    setBasket((prev) => {
      const current = prev[productId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  // Calculate Basket Totals
  const totalBasketItems = Object.values(basket).reduce((sum, qty) => sum + qty, 0);
  const totalBasketPrice = Object.entries(basket).reduce((sum, [pid, qty]) => {
    const prod = products.find((p) => p.id === pid);
    return sum + (prod ? prod.price * qty : 0);
  }, 0);

  // Sort label helper
  const getSortLabel = () => {
    switch (sortBy) {
      case 'price-asc': return language === 'te' ? 'తక్కువ ధర' : 'Price: Low';
      case 'price-desc': return language === 'te' ? 'ఎక్కువ ధర' : 'Price: High';
      case 'rating': return language === 'te' ? 'ఉత్తమ రేటింగ్' : 'Top Rated';
      default: return language === 'te' ? 'తాజా పంటలు' : 'Featured';
    }
  };

  return (
    <div className="max-w-md md:max-w-2xl mx-auto px-4 py-3 pb-36 space-y-4 select-none">
      
      {/* ─── 1. FULL-WIDTH SEARCH BAR WITH MIC INSIDE ─── */}
      <div className="space-y-3">
        <div className="relative w-full">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B5B5B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === 'te'
                ? 'పంటలను శోధించండి'
                : 'Search produce'
            }
            aria-label="Search produce"
            className="w-full pl-11 pr-10 min-h-[52px] bg-white border border-[#E2DDCF] rounded-2xl text-[16px] text-[#1A1A1A] placeholder:text-[#5B5B5B] focus:outline-none focus:ring-2 focus:ring-[#1B3D27] shadow-xs"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full text-[#5B5B5B] hover:text-[#1A1A1A] flex items-center justify-center cursor-pointer text-sm"
              aria-label={language === 'te' ? 'శోధన ఖాళీ చేయండి' : 'Clear search'}
            >
              ✕
            </button>
          )}
        </div>

        {/* ─── 2. CATEGORY CHIPS WITH EDGE FADE ─── */}
        <div className="relative">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none scroll-smooth">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl text-[14px] font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#1B3D27] text-white shadow-xs'
                      : 'bg-white text-[#1A1A1A] border border-[#E2DDCF] hover:bg-stone-50'
                  }`}
                >
                  <span className="text-[15px]">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── 3. SUB-ROW: SORT TRIGGER & ACTIVE COUNT ─── */}
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[13px] font-bold text-[#5B5B5B]">
            {sortedProducts.length} {language === 'te' ? 'పంటలు అందుబాటులో ఉన్నాయి' : 'crops direct from farms'}
          </span>

          <button
            type="button"
            onClick={() => setIsSortSheetOpen(true)}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white border border-[#E2DDCF] text-[13px] font-bold text-[#1A1A1A] flex items-center gap-1.5 shadow-2xs hover:bg-stone-50 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#1B3D27]" />
            <span>{getSortLabel()}</span>
          </button>
        </div>

        {/* Active Voice Filter Banner */}
        {activeVoiceIntent && (
          <div className="bg-[#E6F2EA] border border-[#1B3D27]/20 rounded-2xl p-3 flex items-center justify-between gap-2 text-[13px] animate-in fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1B3D27] animate-ping shrink-0" />
              <span className="font-black text-[#1B3D27] shrink-0">
                {language === 'te' ? 'వాయిస్ ఫిల్టర్:' : 'Voice Filter:'}
              </span>
              <span className="font-bold text-[#1A1A1A] bg-white px-2 py-0.5 rounded-lg border border-[#1B3D27]/20 truncate">
                {language === 'te' && activeVoiceIntent.interpretationTelugu
                  ? activeVoiceIntent.interpretationTelugu
                  : activeVoiceIntent.interpretation}
              </span>
            </div>

            <button
              type="button"
              onClick={onClearVoiceIntent}
              className="px-2.5 py-1 bg-white hover:bg-stone-100 text-[#1A1A1A] font-bold rounded-lg border border-[#E2DDCF] flex items-center gap-1 cursor-pointer shrink-0 text-[12px]"
            >
              <X className="w-3.5 h-3.5" />
              <span>{language === 'te' ? 'తొలగించు' : 'Clear'}</span>
            </button>
          </div>
        )}
      </div>

      {/* ─── 4. OFFERS RECEIVED FROM FARMERS ─── */}
      {requestsWithOffers.length > 0 && (
        <div className="bg-[#FFF4D6] border-2 border-[#F5B800] rounded-2xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-[#F5B800] text-[#1A1A1A] flex items-center justify-center font-black text-sm">
              🌾
            </span>
            <div>
              <h3 className="text-[15px] font-black text-[#1A1A1A]">
                {language === 'te' ? 'రైతుల నుండి ఆఫర్లు వచ్చాయి' : 'Offers Received'} ({requestsWithOffers.length})
              </h3>
              <p className="text-[12px] text-[#5C4300] font-medium">
                {language === 'te'
                  ? 'మీ పంట కోరికకు రైతులు ప్రత్యక్ష ధరతో స్పందించారు!'
                  : 'Local farmers responded to your broadcast request with direct prices!'}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {requestsWithOffers.map((req) => (
              <Card key={req.id} variant="default" padding="sm" className="space-y-2.5 bg-white">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge variant="amber">
                      {language === 'te' ? 'రైతు ఆఫర్ వచ్చింది' : 'Direct Farmer Offer'}
                    </Badge>
                    <h4 className="text-[15px] font-black text-[#1A1A1A] mt-1">
                      {req.quantity} {req.unit} {language === 'te' ? (req.productTelugu || req.product) : req.product}
                    </h4>
                  </div>
                  <span className="text-[12px] font-bold text-[#5B5B5B]">{req.neededBy}</span>
                </div>

                {req.offers && req.offers.map((offer, idx) => (
                  <div key={idx} className="p-3 bg-[#E6F2EA]/60 rounded-xl space-y-2 border border-[#1B3D27]/15">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={offer.farmerAvatar}
                          alt={offer.farmerName}
                          className="w-8 h-8 rounded-full object-cover border border-[#F5B800]"
                        />
                        <div>
                          <p className="text-[14px] font-black text-[#1A1A1A] flex items-center gap-1">
                            <span>{language === 'te' ? (offer.farmerTeluguName || offer.farmerName) : offer.farmerName}</span>
                            <ShieldCheck className="w-3.5 h-3.5 text-[#1E7B3F]" />
                          </p>
                          <p className="text-[11px] text-[#5B5B5B]">{offer.farmerLocation}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[18px] font-black text-[#1B3D27] block leading-tight">
                          ₹{offer.unitPrice}/{req.unit}
                        </span>
                        <span className="text-[11px] font-bold text-[#5B5B5B]">
                          ₹{offer.totalPrice || offer.offeredQuantity * offer.unitPrice} {language === 'te' ? 'మొత్తం' : 'total'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#1B3D27] bg-white px-2 py-0.5 rounded-md border border-[#1B3D27]/15">
                        🚚 {offer.deliveryPromise || (language === 'te' ? '24 గంటల్లో డెలివరీ' : 'Within 24 hours')}
                      </span>
                      <Button
                        variant="primary"
                        onClick={() => onAcceptFarmerOffer?.(req.id, offer.id)}
                        className="min-h-[44px] px-3.5 text-[13px]"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        <span>{language === 'te' ? 'ఆఫర్ అంగీకరించండి' : 'Accept Offer'}</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ─── 5. VERIFIED LOCAL FARMERS STRIP ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-black text-[#1A1A1A] tracking-tight">
              {language === 'te' ? 'సమీపంలోని చిన్న రైతులు' : 'Local Family Farmers'}
            </h2>
            <p className="text-[13px] text-[#5B5B5B]">
              {language === 'te'
                ? 'మీ ప్రాంతంలో ధృవీకరించబడిన చిన్న రైతులు · దళారీ లేని అమ్మకం'
                : 'Verified local farmers in your district · 100% direct fair trade'}
            </p>
          </div>
        </div>

        {/* Horizontal scroll cards */}
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          {farmers.map((farmer) => (
            <div
              key={farmer.id}
              onClick={() => onSelectFarmer(farmer)}
              className="w-[230px] shrink-0 bg-white rounded-2xl border border-[#E2DDCF] p-3 hover:border-[#1B3D27] transition-all cursor-pointer shadow-2xs flex items-center gap-3"
            >
              <img
                src={farmer.avatar}
                alt={farmer.name}
                className="w-12 h-12 rounded-xl object-cover border border-[#E2DDCF] shrink-0 bg-stone-50"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-[14px] font-black text-[#1A1A1A] leading-tight truncate">
                    {language === 'te' ? farmer.teluguName : farmer.name}
                  </p>
                  {farmer.identityVerified && (
                    <ShieldCheck className="w-3.5 h-3.5 text-[#1E7B3F] shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-[#5B5B5B] truncate mt-0.5">{farmer.district}</p>
                <div className="flex items-center gap-1 text-[11px] font-bold text-[#5B5B5B] mt-1">
                  <Star className="w-3 h-3 fill-[#F5B800] text-[#F5B800]" />
                  <span>{farmer.rating}</span>
                  <span>•</span>
                  <span>{farmer.experienceYears}y {language === 'te' ? 'అనుభవం' : 'exp'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 6. PRODUCT CARDS GRID (FIXED 4:3 IMAGE & ACTIVE LANGUAGE) ─── */}
      <div className="space-y-3">
        <h2 className="text-[18px] font-black text-[#1A1A1A] tracking-tight">
          {language === 'te' ? 'తాజా పంటల మార్కెట్' : 'Fresh Farm Marketplace'}
        </h2>

        {sortedProducts.length === 0 ? (
          <Card variant="default" padding="lg" className="text-center space-y-3 py-10">
            <ShoppingBag className="w-10 h-10 mx-auto text-[#5B5B5B]" />
            <p className="text-[16px] font-black text-[#1A1A1A]">
              {language === 'te' ? 'మీ శోధనకు తగిన పంటలు దొరకలేదు.' : 'No produce matched your search.'}
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                onClearVoiceIntent();
              }}
              className="min-h-[48px] mx-auto text-[14px]"
            >
              <span>{language === 'te' ? 'ఫిల్టర్లు తొలగించండి' : 'Reset Filters'}</span>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {sortedProducts.map((product) => {
              const qtyInBasket = basket[product.id] || 0;

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-[#E2DDCF] overflow-hidden shadow-2xs hover:border-[#1B3D27]/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Fixed 4:3 Image */}
                    <div
                      className="relative aspect-4/3 bg-stone-100 overflow-hidden cursor-pointer"
                      onClick={() => onSelectProduct(product)}
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        onError={(e) => {
                          e.currentTarget.src = '/products/tomatoes.svg';
                        }}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />

                      {/* Organic Badge - ONLY when true */}
                      {product.organicClaim && (
                        <div className="absolute top-2 left-2 bg-[#1B3D27] text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-2xs flex items-center gap-1">
                          <Leaf className="w-2.5 h-2.5 text-[#F5B800]" />
                          <span>{language === 'te' ? 'సేంద్రీయ' : 'Organic'}</span>
                        </div>
                      )}

                      {/* Stock Tag */}
                      <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-xs text-[#1A1A1A] text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-2xs">
                        {product.availableQuantity} {product.unit} {language === 'te' ? 'మిగిలింది' : 'left'}
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div className="p-3 space-y-1.5">
                      <p className="text-[11px] font-bold text-[#5B5B5B]">
                        {language === 'te' ? 'నేడు కోసినది · 12 కి.మీ' : 'Harvested today · 12 km'}
                      </p>

                      {/* Name up to 2 lines in ACTIVE language only (never truncate Telugu) */}
                      <h3
                        onClick={() => onSelectProduct(product)}
                        className="text-[16px] font-black text-[#1A1A1A] leading-snug line-clamp-2 cursor-pointer hover:text-[#1B3D27] transition-colors"
                        title={product.name}
                      >
                        {language === 'te' ? product.teluguName : product.name}
                      </h3>

                      {/* Farmer Name with verified check and rating on a separate line */}
                      <div className="flex items-center gap-1 text-[12px] text-[#5B5B5B] font-bold">
                        <span className="truncate max-w-[90px]">{product.farmerName}</span>
                        {product.farmerVerified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-[#1E7B3F] shrink-0" />
                        )}
                        <span>•</span>
                        <div className="flex items-center gap-0.5 text-[#1A1A1A]">
                          <Star className="w-3 h-3 fill-[#F5B800] text-[#F5B800]" />
                          <span>{product.farmerRating}</span>
                        </div>
                      </div>

                      {/* Large Price (22px+) */}
                      <div className="pt-1 flex items-baseline gap-1">
                        <span className="text-[22px] font-black text-[#1B3D27] leading-none">
                          ₹{product.price}
                        </span>
                        <span className="text-[13px] font-bold text-[#5B5B5B]">
                          /{product.priceUnit}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action: + Add or +/- Stepper */}
                  <div className="p-2.5 pt-0">
                    {qtyInBasket === 0 ? (
                      <button
                        type="button"
                        onClick={() => handleAddToBasket(product.id)}
                        className="w-full min-h-[48px] bg-[#1B3D27] hover:bg-[#14321D] text-white font-black rounded-xl text-[14px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{language === 'te' ? 'చేర్చండి' : 'Add'}</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-between min-h-[48px] bg-[#E6F2EA] border border-[#1B3D27]/30 rounded-xl px-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateBasketQty(product.id, -1)}
                          className="w-9 h-9 rounded-lg bg-white text-[#1B3D27] font-black flex items-center justify-center shadow-2xs hover:bg-stone-100 cursor-pointer text-lg"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-[16px] font-black text-[#1B3D27]">
                          {qtyInBasket} {product.unit}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateBasketQty(product.id, 1)}
                          className="w-9 h-9 rounded-lg bg-[#1B3D27] text-white font-black flex items-center justify-center shadow-2xs hover:bg-[#14321D] cursor-pointer text-lg"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 7. STICKY BASKET BAR WITH COMMUNITY-DROP PROGRESS BAR ─── */}
      {totalBasketItems > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-md bg-[#1B3D27] text-white p-3.5 rounded-2xl shadow-2xl space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-full bg-[#F5B800] text-[#1A1A1A] flex items-center justify-center font-black text-sm">
                {totalBasketItems}
              </span>
              <div>
                <span className="text-[16px] font-black text-white block leading-tight">
                  ₹{totalBasketPrice}
                </span>
                <span className="text-[11px] text-[#E6F2EA]/80 font-bold">
                  {totalBasketItems} {language === 'te' ? 'రకాలు బుట్టలో ఉన్నాయి' : 'items in basket'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const firstProd = products.find((p) => basket[p.id]);
                if (firstProd) onQuickOrder(firstProd);
              }}
              className="px-4 py-2 rounded-xl bg-[#F5B800] hover:bg-amber-400 text-[#1A1A1A] text-[13px] font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <span>{language === 'te' ? 'బుట్ట చూడండి' : 'View Basket'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Community-drop progress bar toward ₹150 minimum */}
          <div className="pt-1 border-t border-white/15 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-[#E6F2EA]/90 flex items-center gap-1">
                <Truck className="w-3 h-3 text-[#F5B800]" />
                <span>
                  {totalBasketPrice >= 150
                    ? (language === 'te' ? '₹20 కమ్యూనిటీ డ్రాప్ వర్తిస్తుంది ✓' : '₹20 Community Drop unlocked! ✓')
                    : (language === 'te'
                        ? `ఇంకా ₹${150 - totalBasketPrice} చేర్చండి: ₹20 కమ్యూనిటీ డ్రాప్ కోసం`
                        : `Add ₹${150 - totalBasketPrice} more for ₹20 community drop`)}
                </span>
              </span>
              <span className="text-[#F5B800]">
                {Math.min(100, Math.round((totalBasketPrice / 150) * 100))}%
              </span>
            </div>

            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#F5B800] transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(100, (totalBasketPrice / 150) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── 8. SORT BOTTOM SHEET (NO NATIVE DROPDOWN) ─── */}
      <BottomSheet
        isOpen={isSortSheetOpen}
        onClose={() => setIsSortSheetOpen(false)}
        title={language === 'te' ? 'క్రమబద్ధీకరించండి' : 'Sort Produce'}
        subtitle={language === 'te' ? 'మీ ప్రాధాన్యత ప్రకారం పంటలను క్రమపరచండి' : 'Select sorting preference'}
      >
        <div className="space-y-2 pt-1">
          {[
            { id: 'recommended', label: language === 'te' ? 'తాజా పంటలు (సిఫార్సు చేయబడింది)' : 'Featured & Fresh Harvest' },
            { id: 'rating', label: language === 'te' ? 'ఉత్తమ రైతు రేటింగ్' : 'Top Farmer Rating' },
            { id: 'price-asc', label: language === 'te' ? 'ధర: తక్కువ నుండి ఎక్కువ' : 'Price: Low to High' },
            { id: 'price-desc', label: language === 'te' ? 'ధర: ఎక్కువ నుండి తక్కువ' : 'Price: High to Low' },
          ].map((opt) => {
            const isSelected = sortBy === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setSortBy(opt.id as any);
                  setIsSortSheetOpen(false);
                }}
                className={`w-full min-h-[52px] px-4 rounded-xl text-left font-bold text-[15px] flex items-center justify-between border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#E6F2EA] text-[#1B3D27] border-[#1B3D27]'
                    : 'bg-white text-[#1A1A1A] border-[#E2DDCF] hover:bg-stone-50'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-5 h-5 text-[#1B3D27]" />}
              </button>
            );
          })}
        </div>
      </BottomSheet>

    </div>
  );
};
