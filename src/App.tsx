/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  UserRole,
  Product,
  Farmer,
  Order,
  Review,
  OrderStatus,
  CustomerVoiceSearchIntent,
  CustomerRequest,
  LocalDemandItem,
  FarmerOffer,
} from './types';
import { Language, translations } from './data/translations';
import { StorageService } from './services/storageService';
import { Header } from './components/Header';
import { LandingHero } from './components/LandingHero';
import { FarmerDashboard } from './components/FarmerDashboard';
import { CustomerMarketplace } from './components/CustomerMarketplace';
import { VoiceProductModal } from './components/VoiceProductModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { FarmerProfileModal } from './components/FarmerProfileModal';
import { OrderModal } from './components/OrderModal';
import { CustomerOrdersView } from './components/CustomerOrdersView';
import { CustomerVoiceSearchModal } from './components/CustomerVoiceSearchModal';
import { FarmerAssistantModal } from './components/FarmerAssistantModal';
import { FarmerOnboardingModal } from './components/FarmerOnboardingModal';
import { CustomerRequestModal } from './components/CustomerRequestModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { OnboardingModal } from './components/OnboardingModal';
import { CheckCircle2, Sparkles, Mic, RotateCcw } from 'lucide-react';

export default function App() {
  // App-level state (defaults to FARMER in Telugu; supports URL param and localStorage)
  const [role, setRole] = useState<UserRole>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('role');
      if (p?.toUpperCase() === 'CUSTOMER') return 'CUSTOMER';
      if (p?.toUpperCase() === 'FARMER') return 'FARMER';
      const stored = localStorage.getItem('ft_role');
      if (stored === 'CUSTOMER' || stored === 'FARMER') return stored as UserRole;
    }
    return 'FARMER';
  });

  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const l = new URLSearchParams(window.location.search).get('lang');
      if (l === 'en') return 'en';
      if (l === 'te') return 'te';
      const stored = localStorage.getItem('ft_lang');
      if (stored === 'en' || stored === 'te') return stored as Language;
    }
    return 'te';
  });

  const [showHero, setShowHero] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const hero = new URLSearchParams(window.location.search).get('hero');
      if (hero === 'true') return true;
      if (hero === 'false') return false;
      const r = new URLSearchParams(window.location.search).get('role');
      if (r?.toUpperCase() === 'CUSTOMER') return true;
      if (r?.toUpperCase() === 'FARMER') return false;
    }
    return false;
  });

  const [farmerTab, setFarmerTab] = useState<'home' | 'orders' | 'products' | 'demand' | 'profile'>(() => {
    if (typeof window !== 'undefined') {
      const tab = new URLSearchParams(window.location.search).get('tab');
      if (tab === 'orders' || tab === 'products' || tab === 'demand' || tab === 'profile') return tab;
    }
    return 'home';
  });

  // Entities state (initialized synchronously to avoid empty flash)
  const [farmers, setFarmers] = useState<Farmer[]>(() => StorageService.getFarmers());
  const [products, setProducts] = useState<Product[]>(() => StorageService.getProducts());
  const [orders, setOrders] = useState<Order[]>(() => StorageService.getOrders());
  const [reviews, setReviews] = useState<Review[]>(() => StorageService.getReviews());
  const [customerRequests, setCustomerRequests] = useState<CustomerRequest[]>(() => StorageService.getCustomerRequests());
  const [localDemand, setLocalDemand] = useState<LocalDemandItem[]>(() => StorageService.getLocalDemand());

  // Active Farmer for Farmer role
  const [activeFarmerId, setActiveFarmerId] = useState<string>('farmer-1');
  const activeFarmer = (farmers && farmers.length > 0 ? farmers : StorageService.getFarmers()).find((f) => f.id === activeFarmerId) || (farmers && farmers[0]) || StorageService.getFarmers()[0];

  // Modals & Drawers
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isCustomerVoiceSearchOpen, setIsCustomerVoiceSearchOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('voicesearch') === 'true';
    }
    return false;
  });
  const [isFarmerAssistantOpen, setIsFarmerAssistantOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('assistant') === 'true';
    }
    return false;
  });
  const [isFarmerOnboardingOpen, setIsFarmerOnboardingOpen] = useState(false);
  const [isCustomerRequestOpen, setIsCustomerRequestOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const ob = new URLSearchParams(window.location.search).get('onboarding');
      if (ob === 'true') return true;
      if (ob === 'false') return false;
      const hasRoleParam = new URLSearchParams(window.location.search).has('role');
      const hasLangParam = new URLSearchParams(window.location.search).has('lang');
      if (!hasRoleParam && !hasLangParam && localStorage.getItem('ft_onboarded') !== 'true') {
        return true;
      }
    }
    return false;
  });

  const [activeVoiceIntent, setActiveVoiceIntent] = useState<CustomerVoiceSearchIntent | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [orderModalQty, setOrderModalQty] = useState<number>(2);
  const [orderModalProduct, setOrderModalProduct] = useState<Product | null>(() => {
    if (typeof window !== 'undefined') {
      const orderParam = new URLSearchParams(window.location.search).get('checkout');
      if (orderParam) {
        const prods = StorageService.getProducts();
        return prods.find((p) => p.id === orderParam) || prods[0];
      }
    }
    return null;
  });
  const [isCustomerOrdersOpen, setIsCustomerOrdersOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('orders') === 'true';
    }
    return false;
  });

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Load from persistent storage
  useEffect(() => {
    loadAllData();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('role');
      if (r?.toUpperCase() === 'FARMER') {
        setRole('FARMER');
        setShowHero(false);
      }
      const l = params.get('lang');
      if (l === 'te') setLanguage('te');
      const h = params.get('hero');
      if (h === 'false') setShowHero(false);
      if (params.get('assistant') === 'true') {
        setIsFarmerAssistantOpen(true);
      }
      const chk = params.get('checkout');
      if (chk) {
        const prods = StorageService.getProducts();
        const found = prods.find((p) => p.id === chk) || prods[0];
        if (found) setOrderModalProduct(found);
      }
    }
  }, []);

  const loadAllData = () => {
    setFarmers(StorageService.getFarmers());
    setProducts(StorageService.getProducts());
    setOrders(StorageService.getOrders());
    setReviews(StorageService.getReviews());
    setCustomerRequests(StorageService.getCustomerRequests());
    setLocalDemand(StorageService.getLocalDemand());
  };

  const handleResetDemo = () => {
    StorageService.resetDemo();
    setActiveVoiceIntent(null);
    setActiveFarmerId('farmer-1');
    loadAllData();
    showToast(
      language === 'te'
        ? 'డెమో డేటా విజయవంతంగా రీసెట్ చేయబడింది.'
        : 'Demo data reset to initial showcase state.'
    );
  };

  // Handlers
  const handleFarmerRegistered = (newFarmer: Farmer) => {
    StorageService.addFarmer(newFarmer);
    loadAllData();
    setActiveFarmerId(newFarmer.id);
    setRole('FARMER');
    showToast(
      language === 'te'
        ? `${newFarmer.teluguName} గారు, మీ ప్రొఫైల్ విజయవంతంగా నమోదైంది!`
        : `Welcome ${newFarmer.name}! Your farm stall is now live.`
    );
  };

  const handleProductCreated = (newProduct: Product) => {
    StorageService.addProduct(newProduct);
    loadAllData();
    showToast(
      language === 'te'
        ? `“${newProduct.name}” మార్కెట్‌లో విజయవంతంగా జోడించబడింది!`
        : `"${newProduct.name}" is now live in the marketplace!`
    );
  };

  const handleDeleteProduct = (productId: string) => {
    StorageService.deleteProduct(productId);
    loadAllData();
    showToast('Product removed.');
  };

  const handleUpdateProductPrice = (productId: string, newPrice: number) => {
    StorageService.updateProductPrice(productId, newPrice);
    loadAllData();
    showToast(
      language === 'te'
        ? `ధర ₹${newPrice}గా మార్చబడింది!`
        : `Price updated to ₹${newPrice}. Change is live across the marketplace!`
    );
  };

  const handleUpdateProductStock = (productId: string, quantity: number, mode: 'set' | 'add') => {
    StorageService.updateProductStock(productId, quantity, mode);
    loadAllData();
    showToast(
      language === 'te'
        ? 'పంట నిల్వ విజయవంతంగా నవీకరించబడింది.'
        : 'Stock quantity updated successfully.'
    );
  };

  const handleUpdateOrderStatus = (orderId: string, nextStatus: OrderStatus) => {
    StorageService.updateOrderStatus(orderId, nextStatus);
    loadAllData();
    showToast(
      language === 'te'
        ? `ఆర్డర్ #${orderId} స్థితి నవీకరించబడింది: ${nextStatus}`
        : `Order #${orderId} updated to: ${nextStatus}`
    );
  };

  const handleSubmitFarmerOffer = (requestId: string, offer: FarmerOffer) => {
    StorageService.submitFarmerOffer(requestId, offer);
    loadAllData();
    showToast(
      language === 'te'
        ? 'కస్టమర్‌కు మీ పంట ఆఫర్ విజయవంతంగా పంపబడింది!'
        : 'Your produce offer was sent to the customer!'
    );
  };

  const handleAcceptFarmerOffer = (requestId: string, offerId: string) => {
    const createdOrder = StorageService.acceptFarmerOffer(requestId, offerId);
    if (createdOrder) {
      loadAllData();
      showToast(
        language === 'te'
          ? 'రైతు ఆఫర్ అంగీకరించబడింది! ఆర్డర్ ఖరారైంది.'
          : 'Offer accepted! Order placed direct with the farmer.'
      );
    }
  };

  const handleOrderPlaced = (order: Order) => {
    StorageService.addOrder(order);
    loadAllData();
    showToast(`Order #${order.id} placed! Farmer has been notified.`);
  };

  const handleAddReview = (review: Review) => {
    StorageService.addReview(review);
    loadAllData();
    showToast('Thank you! Your verified review has been posted.');
  };

  const handleCustomerVoiceSearchApply = (intent: CustomerVoiceSearchIntent) => {
    setActiveVoiceIntent(intent);
    StorageService.recordCustomerSearch(intent.product);
    setLocalDemand(StorageService.getLocalDemand());
    showToast(
      language === 'te'
        ? `శోధన ఫిల్టర్: ${intent.productTelugu || intent.product}`
        : `Showing marketplace results for: ${intent.product}`
    );
  };

  const handleClearVoiceIntent = () => {
    setActiveVoiceIntent(null);
    showToast('Voice filter cleared. Showing all produce.');
  };

  const handlePostCustomerRequest = (request: CustomerRequest) => {
    StorageService.addCustomerRequest(request);
    loadAllData();
    showToast(
      language === 'te'
        ? `మీ రిక్వెస్ట్ స్థానిక రైతులకు ప్రసారం చేయబడింది!`
        : `Local demand posted! Nearby farmers have been notified.`
    );
  };

  const handleQuickOrder = (product: Product) => {
    setOrderModalProduct(product);
    setOrderModalQty(1);
  };

  const handleDetailOrderNow = (product: Product, quantity: number) => {
    setSelectedProduct(null);
    setOrderModalProduct(product);
    setOrderModalQty(quantity);
  };

  const activeCustomerOrdersCount = orders.filter(
    (o) => o.customerId === 'cust-1' && o.status !== 'Completed' && o.status !== 'Rejected'
  ).length;

  const farmerPendingOrdersCount = orders.filter(
    (o) => o.farmerId === activeFarmer?.id && o.status === 'Order Placed'
  ).length;

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 flex flex-col font-sans">
      
      {/* Global Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1b3d27] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-700/60 animate-in fade-in slide-in-from-top-4 duration-200 max-w-md w-[92%] sm:w-auto">
          <CheckCircle2 className="w-5 h-5 text-amber-300 shrink-0" />
          <span className="text-sm sm:text-base font-semibold tracking-wide telugu-text">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Header
        role={role}
        setRole={(newRole) => {
          setRole(newRole);
          if (typeof window !== 'undefined') localStorage.setItem('ft_role', newRole);
          if (newRole === 'FARMER') setShowHero(false);
        }}
        language={language}
        setLanguage={(newLang) => {
          setLanguage(newLang);
          if (typeof window !== 'undefined') localStorage.setItem('ft_lang', newLang);
        }}
        onResetDemo={handleResetDemo}
        activeOrdersCount={activeCustomerOrdersCount}
        farmerPendingOrdersCount={farmerPendingOrdersCount}
        onOpenOrders={() => setIsCustomerOrdersOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 pb-24 sm:pb-12">
        {showHero && role === 'CUSTOMER' && (
          <LandingHero
            language={language}
            onFarmerStart={() => {
              setRole('FARMER');
              setShowHero(false);
            }}
            onExploreProducts={() => {
              setShowHero(false);
              setRole('CUSTOMER');
            }}
          />
        )}

        {role === 'FARMER' ? (
          activeFarmer && (
            <FarmerDashboard
              farmer={activeFarmer}
              products={products}
              orders={orders}
              localDemand={localDemand}
              customerRequests={customerRequests}
              language={language}
              onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
              onOpenAssistant={() => setIsFarmerAssistantOpen(true)}
              onOpenOnboarding={() => setIsFarmerOnboardingOpen(true)}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onUpdateProductPrice={handleUpdateProductPrice}
              onUpdateProductStock={handleUpdateProductStock}
              onDeleteProduct={handleDeleteProduct}
              onSubmitFarmerOffer={handleSubmitFarmerOffer}
              activeTab={farmerTab}
              onTabChange={setFarmerTab}
            />
          )
        ) : (
          <CustomerMarketplace
            products={products}
            farmers={farmers}
            language={language}
            activeVoiceIntent={activeVoiceIntent}
            onOpenVoiceSearch={() => setIsCustomerVoiceSearchOpen(true)}
            onOpenCustomerRequest={() => setIsCustomerRequestOpen(true)}
            onClearVoiceIntent={handleClearVoiceIntent}
            onSelectProduct={(p) => setSelectedProduct(p)}
            onSelectFarmer={(f) => setSelectedFarmer(f)}
            onQuickOrder={handleQuickOrder}
            customerRequests={customerRequests}
            onAcceptFarmerOffer={handleAcceptFarmerOffer}
          />
        )}
      </main>

      {/* Mobile-First Bottom Navigation Bar */}
      <MobileBottomNav
        role={role}
        language={language}
        activeOrdersCount={activeCustomerOrdersCount}
        farmerPendingOrdersCount={farmerPendingOrdersCount}
        onOpenVoiceAction={() => {
          if (role === 'FARMER') {
            setIsVoiceModalOpen(true);
          } else {
            setIsCustomerVoiceSearchOpen(true);
          }
        }}
        onOpenOrders={() => setIsCustomerOrdersOpen(true)}
        onOpenRequestModal={() => setIsCustomerRequestOpen(true)}
        onOpenBasket={() => setIsCustomerOrdersOpen(true)}
        farmerTab={farmerTab}
        setFarmerTab={setFarmerTab}
      />

      {/* Floating Farmer AI Assistant button on Farmer view */}
      {role === 'FARMER' && (
        <button
          type="button"
          onClick={() => setIsFarmerAssistantOpen(true)}
          className="fixed right-4 bottom-24 z-30 w-14 h-14 rounded-full bg-[#1B3D27] text-[#F5B800] border-2 border-[#F5B800] shadow-[0_6px_20px_rgba(27,61,39,0.35)] flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all group"
          aria-label={language === 'te' ? 'రైతు AI సహాయకుడు' : 'Farmer AI Assistant'}
          title={language === 'te' ? 'రైతు AI సహాయకుడు' : 'Farmer AI Assistant'}
        >
          <Mic className="w-6 h-6 stroke-[2.5] group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-300 text-sm py-8 border-t border-stone-800 pb-24 sm:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-stone-200">
            <span className="font-bold text-base text-white">Farm Trust</span>
            <span>·</span>
            <span>Farm to Family, in Every Language</span>
          </div>
          <div className="flex items-center gap-4 text-stone-300">
            <span>Visakhapatnam, Andhra Pradesh</span>
            <span>·</span>
            <button
              type="button"
              onClick={() => setIsOnboardingOpen(true)}
              className="text-[#F5B800] hover:underline cursor-pointer font-bold inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === 'te' ? 'డెమో రీసెట్ / రోల్ మార్చు' : 'Demo Switcher'}</span>
            </button>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      {/* 1. Farmer Voice Product Listing Modal */}
      {activeFarmer && (
        <VoiceProductModal
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          onProductCreated={handleProductCreated}
          language={language}
          farmerId={activeFarmer.id}
          farmerName={activeFarmer.name}
          farmerLocation={activeFarmer.location}
          farmerRating={activeFarmer.rating}
          farmerAvatar={activeFarmer.avatar}
          farmerVerified={activeFarmer.identityVerified}
        />
      )}

      {/* 2. Customer Voice Search Modal */}
      <CustomerVoiceSearchModal
        isOpen={isCustomerVoiceSearchOpen}
        onClose={() => setIsCustomerVoiceSearchOpen(false)}
        onApplyIntent={handleCustomerVoiceSearchApply}
        language={language}
      />

      {/* 3. Farmer AI Assistant Modal (with Vernacular TTS & 11 Actions) */}
      {activeFarmer && (
        <FarmerAssistantModal
          isOpen={isFarmerAssistantOpen}
          onClose={() => setIsFarmerAssistantOpen(false)}
          farmer={activeFarmer}
          products={products.filter((p) => p.farmerId === activeFarmer.id)}
          orders={orders.filter((o) => o.farmerId === activeFarmer.id)}
          customerRequests={customerRequests}
          language={language}
          onUpdateProductPrice={handleUpdateProductPrice}
          onUpdateProductStock={handleUpdateProductStock}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onSubmitFarmerOffer={handleSubmitFarmerOffer}
          onOpenPendingOrders={() => {
            setFarmerTab('orders');
          }}
          onOpenDemandBoard={() => {
            setFarmerTab('demand');
          }}
        />
      )}

      {/* 4. Farmer Voice Onboarding Modal */}
      <FarmerOnboardingModal
        isOpen={isFarmerOnboardingOpen}
        onClose={() => setIsFarmerOnboardingOpen(false)}
        onFarmerRegistered={handleFarmerRegistered}
        language={language}
      />

      {/* 5. Customer Request Produce Modal */}
      <CustomerRequestModal
        isOpen={isCustomerRequestOpen}
        onClose={() => setIsCustomerRequestOpen(false)}
        onPostRequest={handlePostCustomerRequest}
        language={language}
      />

      {/* 6. Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        farmer={farmers.find((f) => f.id === selectedProduct?.farmerId) || null}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        onOrderNow={handleDetailOrderNow}
        onOpenFarmerProfile={(f) => {
          setSelectedProduct(null);
          setSelectedFarmer(f);
        }}
        language={language}
      />

      {/* 7. Farmer Trust Passport Modal */}
      <FarmerProfileModal
        farmer={selectedFarmer}
        products={products}
        reviews={reviews}
        isOpen={Boolean(selectedFarmer)}
        onClose={() => setSelectedFarmer(null)}
        onSelectProduct={(p) => {
          setSelectedFarmer(null);
          setSelectedProduct(p);
        }}
        language={language}
      />

      {/* 8. Checkout / Order Modal */}
      <OrderModal
        product={orderModalProduct}
        initialQuantity={orderModalQty}
        isOpen={Boolean(orderModalProduct)}
        onClose={() => setOrderModalProduct(null)}
        onOrderPlaced={handleOrderPlaced}
        language={language}
      />

      {/* 9. Customer Orders Tracking & Rating Drawer */}
      <CustomerOrdersView
        orders={orders.filter((o) => o.customerId === 'cust-1')}
        isOpen={isCustomerOrdersOpen}
        onClose={() => setIsCustomerOrdersOpen(false)}
        onAddReview={handleAddReview}
        onConfirmDelivery={(orderId) => handleUpdateOrderStatus(orderId, 'Completed')}
        language={language}
      />

      {/* 10. First-Time & Demo Onboarding Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        currentRole={role}
        currentLanguage={language}
        onComplete={(newRole, newLang) => {
          setRole(newRole);
          setLanguage(newLang);
          setIsOnboardingOpen(false);
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('role', newRole);
            url.searchParams.set('lang', newLang);
            url.searchParams.delete('onboarding');
            window.history.replaceState({}, '', url.toString());
          }
        }}
        onClose={() => setIsOnboardingOpen(false)}
      />
    </div>
  );
}
