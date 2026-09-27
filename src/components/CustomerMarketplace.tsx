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
  Filter,
  Sparkles,
  CheckCircle2,
  Clock,
  Mic,
  Calendar,
  X,
  AlertTriangle,
  Send,
  Check
} from 'lucide-react';
import { Product, Farmer, ProductCategory, CustomerVoiceSearchIntent, CustomerRequest } from '../types';
import { Language, translations } from '../data/translations';
import { formatRelativeDate } from '../utils/dateUtils';

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
  const [sortBy, setSortBy] = useState<'recommended' | 'price-asc' | 'rating'>('recommended');

  const categories = [
    { id: 'All', label: t.allCategories },
    { id: 'Vegetables', label: t.vegetables },
    { id: 'Fruits', label: t.fruits },
    { id: 'Grains', label: t.grains },
    { id: 'Dairy', label: t.dairy },
    { id: 'Organic', label: t.organic },
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

    // 3. Search text query
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCategory;

    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.teluguName?.toLowerCase().includes(q) ||
      p.farmerName.toLowerCase().includes(q) ||
      p.farmerLocation.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q);

    return matchesCategory && matchesSearch;
  });

  // Sorting Logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'rating') return b.farmerRating - a.farmerRating;
    return b.createdAt - a.createdAt; // recommended / newest
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 sm:space-y-8">
      
      {/* Search & Hero Filter Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-11 pr-12 py-3 bg-white border border-stone-200 rounded-2xl text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1b3d27] shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600 cursor-pointer min-touch-target"
              >
                Clear
              </button>
            )}
          </div>

          {/* Action: Voice Search Big Button */}
          <button
            onClick={onOpenVoiceSearch}
            className="px-4 py-3 bg-[#1b3d27] hover:bg-[#244f34] text-amber-300 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer min-touch-target active:scale-95"
          >
            <Mic className="w-4 h-4 text-amber-300" />
            <span>{t.voiceSearchBtn}</span>
          </button>

          {/* Action: Request Produce Button */}
          <button
            onClick={onOpenCustomerRequest}
            className="px-4 py-3 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer min-touch-target"
          >
            <Calendar className="w-4 h-4 text-emerald-800" />
            <span>{t.requestProductBtn}</span>
          </button>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-stone-500 hidden sm:block" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-3 bg-white border border-stone-200 rounded-2xl text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#1b3d27] shadow-xs cursor-pointer"
            >
              <option value="recommended">Featured / Fresh</option>
              <option value="rating">Highest Rated Farmers</option>
              <option value="price-asc">Price: Low to High</option>
            </select>
          </div>
        </div>

        {/* ACTIVE VOICE FILTER BANNER */}
        {activeVoiceIntent && (
          <div className="bg-gradient-to-r from-emerald-100 to-amber-100/70 border border-emerald-300/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 animate-pulse"></span>
              <span className="font-bold text-emerald-950">
                {language === 'te' ? 'వాయిస్ ఫిల్టర్ వర్తించబడింది:' : 'Active Voice Search Filter:'}
              </span>
              <span className="font-extrabold text-stone-900 bg-white px-2.5 py-1 rounded-lg shadow-2xs">
                {language === 'te' && activeVoiceIntent.interpretationTelugu
                  ? activeVoiceIntent.interpretationTelugu
                  : activeVoiceIntent.interpretation}
              </span>
            </div>

            <button
              onClick={onClearVoiceIntent}
              className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 font-bold rounded-xl border border-stone-200 flex items-center gap-1 transition-colors cursor-pointer min-touch-target"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t.clearVoiceFilter}</span>
            </button>
          </div>
        )}

        {/* Category Horizontal Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all cursor-pointer min-touch-target ${
                selectedCategory === cat.id
                  ? 'bg-[#1b3d27] text-amber-300 shadow-xs'
                  : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* OFFERS RECEIVED FROM FARMERS (1-Click Customer Acceptance) */}
      {requestsWithOffers.length > 0 && (
        <div className="bg-amber-50/90 border-2 border-amber-300 rounded-3xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-black">
                🌾
              </span>
              <div>
                <h3 className="text-sm font-black text-amber-950">
                  {t.offersReceived} ({requestsWithOffers.length})
                </h3>
                <p className="text-xs text-amber-800">
                  {language === 'te'
                    ? 'మీ పంట రిక్వెస్ట్ చూసి రైతులు నేరుగా ధరను ఆఫర్ చేశారు!'
                    : 'Local farmers responded to your produce broadcast with direct offers!'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {requestsWithOffers.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      {language === 'te' ? 'రైతు ఆఫర్ వచ్చింది' : 'Offer Received'}
                    </span>
                    <h4 className="text-sm font-extrabold text-stone-900 mt-1">
                      {req.quantity} {req.unit} {req.product}
                    </h4>
                  </div>
                  <span className="text-xs text-stone-400">{req.neededBy}</span>
                </div>

                {req.offers && req.offers.map((offer, idx) => (
                  <div key={idx} className="p-3.5 bg-gradient-to-br from-emerald-50/80 to-stone-50 rounded-xl space-y-2.5 border border-emerald-200/80 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {offer.farmerAvatar && (
                          <img
                            src={offer.farmerAvatar}
                            alt={offer.farmerName}
                            className="w-7 h-7 rounded-full object-cover border border-amber-400"
                          />
                        )}
                        <div>
                          <span className="font-extrabold text-stone-900 flex items-center gap-1">
                            <span>{language === 'te' ? (offer.farmerTeluguName || offer.farmerName) : offer.farmerName}</span>
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                          </span>
                          <span className="text-[10px] text-stone-500">{offer.farmerLocation}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-emerald-950 text-sm block">
                          ₹{offer.unitPrice} / {req.unit}
                        </span>
                        <span className="text-[10px] text-stone-500">
                          {language === 'te' ? `మొత్తం: ₹${offer.totalPrice || offer.offeredQuantity * offer.unitPrice}` : `Total: ₹${offer.totalPrice || offer.offeredQuantity * offer.unitPrice}`}
                        </span>
                      </div>
                    </div>

                    {offer.notes && (
                      <p className="text-[11px] text-stone-700 bg-white/70 p-2 rounded-lg border border-emerald-100">
                        "{offer.notes}"
                      </p>
                    )}

                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                        🚚 {offer.deliveryPromise || (language === 'te' ? '24 గంటల్లో డెలివరీ' : 'Within 24 hours')}
                      </span>
                      <button
                        onClick={() => onAcceptFarmerOffer?.(req.id, offer.id)}
                        className="px-4 py-2 bg-[#1b3d27] hover:bg-[#244f34] text-amber-300 font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs min-touch-target active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{t.acceptOffer}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 1: VERIFIED LOCAL FARMERS STRIP (With Trust Passport Preview) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
              {t.nearbyFarmers}
            </h2>
            <p className="text-xs text-stone-500 font-medium">
              {language === 'te'
                ? 'మీ సమీపంలో ఉన్న చిన్న కుటుంబ రైతులు · ప్రత్యక్ష మార్కెట్'
                : 'Direct from family farms near you · Fresh harvest & verified local trust'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {farmers.map((farmer) => (
            <div
              key={farmer.id}
              onClick={() => onSelectFarmer(farmer)}
              className="bg-white rounded-2xl border border-stone-200 p-4 hover:border-emerald-600 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between gap-3 min-touch-target"
            >
              <div className="flex items-center gap-3">
                <img
                  src={farmer.avatar}
                  alt={farmer.name}
                  className="w-13 h-13 rounded-2xl object-cover border-2 border-amber-400 group-hover:scale-105 transition-transform"
                />
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-sm font-extrabold text-stone-900 group-hover:text-emerald-950 transition-colors">
                      {language === 'te' ? farmer.teluguName : farmer.name}
                    </h3>
                    {farmer.identityVerified ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    ) : (
                      <span className="text-[9px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                        {language === 'te' ? 'పరిశీలనలో ఉంది' : 'Verification Pending'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 font-medium">
                    {language === 'te' ? farmer.farmNameTelugu : farmer.farmName}
                  </p>
                  <p className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-emerald-700" />
                    <span>{farmer.location}</span>
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 justify-end font-bold text-amber-600 text-xs">
                  {farmer.rating > 0 ? (
                    <>
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{farmer.rating}</span>
                    </>
                  ) : (
                    <span className="text-[11px] text-stone-500 font-medium">
                      {language === 'te' ? 'కొత్త రైతు' : 'New Farmer'}
                    </span>
                  )}
                </div>
                {farmer.totalCompletedOrders > 0 && farmer.orderCompletionRate ? (
                  <span className="text-[10px] text-emerald-800 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full mt-1 inline-block">
                    {farmer.orderCompletionRate}% Fulfilled
                  </span>
                ) : (
                  <span className="text-[10px] text-stone-600 font-semibold bg-stone-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                    {language === 'te' ? 'సమీక్షలు లేవు' : 'No reviews yet'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: PRODUCE FEED */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
              {t.popularProduce}
            </h2>
            <p className="text-xs text-stone-500 font-medium">
              {sortedProducts.length} {language === 'te' ? 'తాజా పంటలు అందుబాటులో ఉన్నాయి' : 'fresh produce items available'}
            </p>
          </div>
        </div>

        {sortedProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-stone-200 text-stone-500 space-y-3">
            <ShoppingBag className="w-12 h-12 mx-auto text-stone-300" />
            <p className="text-sm font-bold text-stone-800">
              {language === 'te' ? 'మీ శోధనకు తగిన పంటలు దొరకలేదు.' : 'No produce items matched your search criteria.'}
            </p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  onClearVoiceIntent();
                }}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs min-touch-target cursor-pointer"
              >
                Reset Filters
              </button>
              <button
                onClick={onOpenCustomerRequest}
                className="px-4 py-2 bg-[#1b3d27] hover:bg-[#244f34] text-amber-300 font-bold rounded-xl text-xs flex items-center gap-1 min-touch-target cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{t.requestProductBtn}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sortedProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Product Image */}
                  <div className="h-44 relative bg-stone-100 overflow-hidden cursor-pointer" onClick={() => onSelectProduct(product)}>
                    <img
                      src={product.image}
                      alt=""
                      aria-hidden="true"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 text-transparent"
                    />
                    
                    {/* Clear distinction: Farmer Declared Organic vs Verified */}
                    {product.organicClaim && (
                      <div className="absolute top-2.5 left-2.5 bg-[#1b3d27] text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                        <Leaf className="w-3 h-3" />
                        <span>{t.farmerDeclared}</span>
                      </div>
                    )}

                    <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-xs text-stone-800 text-[10px] font-extrabold px-2 py-0.5 rounded-lg shadow-xs">
                      {product.availableQuantity} {product.unit} left
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-extrabold text-emerald-800 uppercase tracking-wider">
                        {product.category}
                      </span>
                      <span className="text-stone-400 font-medium">{product.harvestDate}</span>
                    </div>

                    {/* Bilingual Crop Title */}
                    <h3
                      onClick={() => onSelectProduct(product)}
                      className="text-base font-black text-stone-900 group-hover:text-emerald-950 transition-colors cursor-pointer leading-snug"
                    >
                      {language === 'te' && product.teluguName ? (
                        <span>
                          {product.teluguName}{' '}
                          <span className="text-stone-400 font-normal text-xs">
                            ({product.name.replace(/\s*\([^)]*\)/g, '').trim()})
                          </span>
                        </span>
                      ) : (
                        <span>
                          {product.name.replace(/\s*\([^)]*\)/g, '').trim()}{' '}
                          {product.teluguName && (
                            <span className="text-emerald-800 font-medium text-xs font-serif">· {product.teluguName}</span>
                          )}
                        </span>
                      )}
                    </h3>

                    {/* Price */}
                    <div className="flex items-baseline gap-1.5 pt-0.5">
                      <span className="text-xl font-black text-emerald-950">
                        ₹{product.price}
                      </span>
                      <span className="text-xs text-stone-500 font-medium">
                        / {product.priceUnit}
                      </span>
                    </div>

                    {/* Farmer Trust Mini Bar */}
                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <img
                          src={product.farmerAvatar}
                          alt={product.farmerName}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        <span className="text-stone-700 font-semibold truncate max-w-[110px]">
                          {product.farmerName}
                        </span>
                        {product.farmerVerified ? (
                          <span title="Identity Verified Farmer">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          </span>
                        ) : (
                          <span className="text-[9px] bg-amber-100 text-amber-900 font-bold px-1 rounded shrink-0">
                            {language === 'te' ? 'కొత్త' : 'New'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 font-bold text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{product.farmerRating}</span>
                      </div>
                    </div>

                    {/* Location */}
                    <p className="text-[11px] text-stone-400 flex items-center gap-1 truncate font-medium">
                      <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                      <span className="truncate">{product.farmerLocation}</span>
                    </p>
                  </div>
                </div>

                {/* Card Button */}
                <div className="p-3 bg-stone-50/70 border-t border-stone-100 flex items-center gap-2">
                  <button
                    onClick={() => onSelectProduct(product)}
                    className="flex-1 py-2.5 text-xs font-bold text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-100 rounded-xl border border-stone-200 transition-colors cursor-pointer min-touch-target"
                  >
                    {language === 'te' ? 'వివరాలు' : 'Details'}
                  </button>
                  <button
                    onClick={() => onQuickOrder(product)}
                    className="flex-1 py-2.5 text-xs font-black bg-[#1b3d27] hover:bg-[#244f34] text-amber-300 rounded-xl transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer active:scale-95 min-touch-target"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{language === 'te' ? 'ఆర్డర్ చేయండి' : 'Order Now'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
