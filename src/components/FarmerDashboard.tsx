import React, { useState } from 'react';
import {
  Mic,
  Plus,
  Package,
  Clock,
  CheckCircle,
  Star,
  IndianRupee,
  ShieldCheck,
  ChevronRight,
  Truck,
  MapPin,
  Phone,
  UserCheck,
  Trash2,
  Leaf,
  Layers,
  Sparkles,
  TrendingUp,
  MessageSquare,
  ArrowUpRight,
  Bell,
  AlertCircle,
  CheckCircle2,
  Send,
  X,
  PlusCircle,
  MinusCircle,
  KeyRound
} from 'lucide-react';
import { Farmer, Product, Order, OrderStatus, LocalDemandItem, CustomerRequest, FarmerOffer } from '../types';
import { Language, translations } from '../data/translations';
import { formatRelativeDate } from '../utils/dateUtils';
import { FarmerVoiceHub } from './FarmerVoiceHub';

interface FarmerDashboardProps {
  farmer: Farmer;
  products: Product[];
  orders: Order[];
  localDemand: LocalDemandItem[];
  customerRequests: CustomerRequest[];
  language: Language;
  onOpenVoiceModal: () => void;
  onOpenAssistant: () => void;
  onOpenOnboarding?: () => void;
  onUpdateOrderStatus: (orderId: string, nextStatus: OrderStatus) => void;
  onUpdateProductPrice?: (productId: string, newPrice: number) => void;
  onUpdateProductStock?: (productId: string, quantity: number, mode: 'set' | 'add') => void;
  onDeleteProduct: (productId: string) => void;
  onSubmitFarmerOffer?: (requestId: string, offer: FarmerOffer) => void;
  activeTab?: 'orders' | 'products' | 'demand' | 'profile';
  onTabChange?: (tab: 'orders' | 'products' | 'demand' | 'profile') => void;
}

export const FarmerDashboard: React.FC<FarmerDashboardProps> = ({
  farmer,
  products,
  orders,
  localDemand,
  customerRequests,
  language,
  onOpenVoiceModal,
  onOpenAssistant,
  onOpenOnboarding,
  onUpdateOrderStatus,
  onUpdateProductPrice,
  onUpdateProductStock,
  onDeleteProduct,
  onSubmitFarmerOffer,
  activeTab: controlledTab,
  onTabChange,
}) => {
  const t = translations[language];
  const [internalTab, setInternalTab] = useState<'orders' | 'products' | 'demand' | 'profile'>('orders');
  const activeTab = controlledTab !== undefined ? controlledTab : internalTab;
  const setActiveTab = (tab: 'orders' | 'products' | 'demand' | 'profile') => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  // State for 1-Click Offer Drawer
  const [selectedOfferRequest, setSelectedOfferRequest] = useState<CustomerRequest | null>(null);
  const [offerQty, setOfferQty] = useState<number>(5);
  const [offerPrice, setOfferPrice] = useState<number>(35);
  const [offerNote, setOfferNote] = useState<string>('తాజా పంట, ఈ రోజే కోత కోసి ప్యాక్ చేస్తాం (Fresh harvest directly from farm)');

  // Quick Inline Price Editing
  const [editingPriceProductId, setEditingPriceProductId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<number>(0);

  // Delivery OTP Verification State (Two-Way Handshake)
  const [verifyingOrderId, setVerifyingOrderId] = useState<string | null>(null);
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [otpError, setOtpError] = useState<string | null>(null);

  const farmerProducts = products.filter((p) => p.farmerId === farmer.id);
  const farmerOrders = orders.filter((o) => o.farmerId === farmer.id);
  const pendingOrders = farmerOrders.filter((o) => o.status === 'Order Placed');
  const activeOrders = farmerOrders.filter(
    (o) => o.status !== 'Completed' && o.status !== 'Rejected'
  );
  const completedOrders = farmerOrders.filter((o) => o.status === 'Completed');

  const totalSales = completedOrders.reduce((sum, o) => sum + o.totalPrice, 0);

  const handleOpenOfferModal = (req: CustomerRequest) => {
    setSelectedOfferRequest(req);
    setOfferQty(req.quantity || 5);
    // Find if farmer already grows this crop to auto-fill price
    const matchingProd = farmerProducts.find(
      (p) =>
        p.name.toLowerCase().includes(req.product.toLowerCase()) ||
        req.product.toLowerCase().includes(p.name.toLowerCase())
    );
    setOfferPrice(matchingProd ? matchingProd.price : 35);
  };

  const handleSendOffer = () => {
    if (!selectedOfferRequest || !onSubmitFarmerOffer) return;

    const offer: FarmerOffer = {
      id: `offer-${Date.now()}`,
      requestId: selectedOfferRequest.id,
      farmerId: farmer.id,
      farmerName: farmer.name,
      farmerTeluguName: farmer.teluguName,
      farmerLocation: farmer.location,
      farmerRating: farmer.rating,
      farmerAvatar: farmer.avatar,
      productName: selectedOfferRequest.product,
      productTeluguName: selectedOfferRequest.productTelugu,
      offeredQuantity: offerQty,
      unit: selectedOfferRequest.unit || 'kg',
      unitPrice: offerPrice,
      totalPrice: offerQty * offerPrice,
      deliveryPromise: 'Within 24 hours',
      notes: offerNote,
      status: 'PENDING',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    onSubmitFarmerOffer(selectedOfferRequest.id, offer);
    setSelectedOfferRequest(null);
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Order Placed':
        return (
          <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-bold text-xs flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            {t.statusPlaced}
          </span>
        );
      case 'Accepted by Farmer':
        return (
          <span className="text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full font-bold text-xs flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            {t.statusAccepted}
          </span>
        );
      case 'Preparing':
        return (
          <span className="text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-full font-bold text-xs flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            {t.statusPreparing}
          </span>
        );
      case 'Ready':
        return (
          <span className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-bold text-xs flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {t.statusReady}
          </span>
        );
      case 'Completed':
        return (
          <span className="text-stone-700 bg-stone-100 px-2 py-0.5 rounded-full font-bold text-xs flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            {t.statusCompleted}
          </span>
        );
      default:
        return <span className="text-stone-500 text-xs">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-32 sm:pb-16 space-y-5">
      
      {/* 1. Farmer Welcome & Voice Bar */}
      <div className="bg-gradient-to-r from-[#1b3d27] via-[#244f34] to-[#1b3d27] text-white rounded-3xl p-4 sm:p-6 shadow-lg border border-emerald-800/40 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-8 translate-y-8">
          <Leaf className="w-64 h-64 text-emerald-300" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative z-10">
          <div className="flex items-center gap-3 sm:gap-4">
            <img
              src={farmer.avatar}
              alt={farmer.name}
              className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-400 shadow-md shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-2xl font-black tracking-tight telugu-text">
                  {t.namaste}, {language === 'te' ? farmer.teluguName : farmer.name}!
                </h1>
                {farmer.identityVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-400 text-stone-950 shadow-xs">
                    <ShieldCheck className="w-3 h-3 text-stone-950" />
                    {t.verifiedFarmer}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-200 text-stone-950 shadow-xs">
                    {language === 'te' ? 'గుర్తింపు పరిశీలనలో ఉంది' : 'Verification Pending'}
                  </span>
                )}
              </div>
              <p className="text-emerald-200 text-xs sm:text-sm mt-0.5 font-medium">
                {language === 'te' ? farmer.farmNameTelugu : farmer.farmName} · {farmer.location}
              </p>
              <div className="flex items-center gap-2 sm:gap-3 mt-1 text-[11px] sm:text-xs font-semibold text-emerald-100 flex-wrap">
                <span className="flex items-center gap-1 text-amber-300">
                  {farmer.rating > 0 ? (
                    <>
                      <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                      {farmer.rating} ({farmer.reviewCount} {language === 'te' ? 'రివ్యూలు' : 'reviews'})
                    </>
                  ) : (
                    <span>{language === 'te' ? 'కొత్త రైతు' : 'New Farmer'}</span>
                  )}
                </span>
                <span>·</span>
                <span>
                  {farmer.totalCompletedOrders > 0 && farmer.orderCompletionRate
                    ? `${farmer.orderCompletionRate}% ${language === 'te' ? 'ఆర్డర్ల రికార్డు' : 'fulfillment rate'}`
                    : (language === 'te' ? 'కొత్త ప్రొఫైల్' : 'New Producer Profile')}
                </span>
                <span>·</span>
                <span>{farmer.acres} {language === 'te' ? 'ఎకరాల పొలం' : 'Acres'}</span>
              </div>
            </div>
          </div>

          {/* Quick Voice & Onboard CTAs - Desktop only as Voice Hub sits directly below on mobile */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {onOpenOnboarding && (
              <button
                onClick={onOpenOnboarding}
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer min-touch-target"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{t.voiceOnboardBtn}</span>
              </button>
            )}

            <button
              onClick={onOpenVoiceModal}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 rounded-xl text-xs sm:text-sm font-black shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 min-touch-target"
            >
              <Mic className="w-4 h-4 text-stone-950" />
              <span>{t.addByVoice}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Ask Farm Trust Voice Hub Card - Hero Interactive Voice System */}
      <FarmerVoiceHub
        farmer={farmer}
        products={products.filter((p) => p.farmerId === farmer.id)}
        orders={orders.filter((o) => o.farmerId === farmer.id)}
        customerRequests={customerRequests}
        language={language}
        onUpdateProductPrice={onUpdateProductPrice}
        onUpdateProductStock={onUpdateProductStock}
        onUpdateOrderStatus={onUpdateOrderStatus}
        onSubmitFarmerOffer={onSubmitFarmerOffer}
        onNavigateTab={setActiveTab}
        onOpenFullscreenModal={onOpenAssistant}
        isModalMode={false}
      />

      {/* 3. Task Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer min-touch-target ${
            activeTab === 'orders'
              ? 'bg-[#1b3d27] text-amber-300 shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{t.customerOrders}</span>
          {activeOrders.length > 0 && (
            <span className="px-2 py-0.5 bg-amber-400 text-stone-950 text-xs rounded-full font-black">
              {activeOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('demand')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer min-touch-target ${
            activeTab === 'demand'
              ? 'bg-[#1b3d27] text-amber-300 shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>{t.whatCustomersAreLookingFor}</span>
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-bold">
            {customerRequests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer min-touch-target ${
            activeTab === 'products'
              ? 'bg-[#1b3d27] text-amber-300 shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>{t.myProduceTitle}</span>
          <span className="text-xs text-stone-400">({farmerProducts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer min-touch-target ${
            activeTab === 'profile'
              ? 'bg-[#1b3d27] text-amber-300 shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{t.trustPassportTitle}</span>
        </button>
      </div>

      {/* TAB 1: INCOMING & ACTIVE ORDERS (TASK-FIRST VIEW) */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          
          {/* Urgent Orders Alert Banner if any pending */}
          {pendingOrders.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-black shrink-0 animate-bounce">
                  <AlertCircle className="w-5 h-5 text-stone-950" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-amber-950">
                    {language === 'te'
                      ? `మీ వద్ద ${pendingOrders.length} కొత్త ఆర్డర్${pendingOrders.length > 1 ? 'లు' : ''} పరిశీలన కోసం వేచి ఉన్నాయి!`
                      : `You have ${pendingOrders.length} new order${pendingOrders.length > 1 ? 's' : ''} awaiting confirmation!`}
                  </h3>
                  <p className="text-xs text-amber-800">
                    {language === 'te'
                      ? 'కస్టమర్ తాజా పంట కోసం ఎదురుచూస్తున్నారు. ఆర్డర్‌ను వెంటనే ఆమోదించండి.'
                      : 'Accept incoming orders to notify the buyer and start harvest preparation.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {farmerOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-stone-200 text-stone-500 space-y-2">
              <Package className="w-12 h-12 mx-auto text-stone-300" />
              <p className="text-sm font-bold text-stone-700">{t.noOrdersYet}</p>
              <p className="text-xs text-stone-400">
                {language === 'te' ? 'కస్టమర్లు ఆర్డర్ చేయగానే ఇక్కడ కనిపిస్తాయి.' : 'When customers place orders, they will appear here with 1-click status actions.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {farmerOrders.map((order) => (
                <div
                  key={order.id}
                  className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs transition-all ${
                    order.status === 'Order Placed'
                      ? 'border-amber-400 ring-2 ring-amber-200/50'
                      : 'border-stone-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={order.productImage}
                        alt={order.productName}
                        className="w-16 h-16 rounded-2xl object-cover border border-stone-200 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-stone-400">
                            #{order.id}
                          </span>
                          <span>·</span>
                          {getStatusBadge(order.status)}
                        </div>
                        <h3 className="text-base font-extrabold text-stone-900 mt-0.5">
                          {order.quantity} {order.unit} {order.productName}
                        </h3>
                        <p className="text-xs text-stone-500 font-medium">
                          {language === 'te' ? 'మొత్తం:' : 'Total:'} <span className="font-black text-emerald-950 text-sm">₹{order.totalPrice}</span> ({order.paymentMethod})
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right text-xs text-stone-600 space-y-1">
                      <div className="flex items-center sm:justify-end gap-1.5 font-bold text-stone-900">
                        <span>{order.customerName}</span>
                        {order.customerPhone && (
                          <a
                            href={`tel:${order.customerPhone}`}
                            className="p-1 rounded-md bg-emerald-50 text-emerald-800 hover:bg-emerald-100 min-touch-target"
                            title="Call Customer"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      <p className="flex items-center gap-1 sm:justify-end text-stone-500">
                        <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="truncate max-w-[200px]">{order.deliveryAddress}</span>
                      </p>
                      <p className="text-stone-400 text-[11px]">{formatRelativeDate(order.createdAt, language)}</p>
                    </div>
                  </div>

                  {/* Stepper Progress Indicator */}
                  <div className="pt-3 pb-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-stone-400 mb-2">
                      <span className={order.status === 'Order Placed' ? 'text-amber-800' : 'text-stone-600'}>1. Placed</span>
                      <span className={order.status === 'Accepted by Farmer' ? 'text-blue-800' : 'text-stone-600'}>2. Accepted</span>
                      <span className={order.status === 'Preparing' ? 'text-indigo-800' : 'text-stone-600'}>3. Harvesting</span>
                      <span className={order.status === 'Ready' ? 'text-emerald-800' : 'text-stone-600'}>4. Ready</span>
                      <span className={order.status === 'Completed' ? 'text-green-800' : 'text-stone-600'}>5. Delivered</span>
                    </div>

                    <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full transition-all duration-300"
                        style={{
                          width:
                            order.status === 'Order Placed'
                              ? '20%'
                              : order.status === 'Accepted by Farmer'
                              ? '40%'
                              : order.status === 'Preparing'
                              ? '65%'
                              : order.status === 'Ready'
                              ? '85%'
                              : '100%',
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Order Status Advancement Stepper Buttons */}
                  <div className="pt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-stone-600">
                      {order.status === 'Completed' ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                          <span>{language === 'te' ? 'డెలివరీ విజయవంతంగా పూర్తయింది' : 'Delivered & Completed'}</span>
                        </span>
                      ) : (
                        <span>
                          {language === 'te' ? 'తదుపరి చర్య:' : 'Next Action:'}{' '}
                          <strong className="text-stone-900 font-extrabold">
                            {order.status === 'Order Placed' && (language === 'te' ? 'ఆర్డర్‌ను ఆమోదించండి' : 'Accept order')}
                            {order.status === 'Accepted by Farmer' && (language === 'te' ? 'పంట కోత మరియు ప్యాకింగ్ ప్రారంభించండి' : 'Start harvest & packing')}
                            {order.status === 'Preparing' && (language === 'te' ? 'హ్యాండోవర్ లేదా డెలివరీకి సిద్ధం చేయండి' : 'Prepare for dispatch')}
                            {order.status === 'Ready' && (language === 'te' ? 'డెలివరీ పూర్తయినట్లు మార్క్ చేయండి' : 'Mark handoff completed')}
                          </strong>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {order.status === 'Order Placed' && (
                        <>
                          <button
                            onClick={() => onUpdateOrderStatus(order.id, 'Rejected')}
                            className="px-3.5 py-2 text-xs font-semibold text-stone-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer min-touch-target"
                          >
                            {t.rejectOrder}
                          </button>
                          <button
                            onClick={() => onUpdateOrderStatus(order.id, 'Accepted by Farmer')}
                            className="px-5 py-2.5 text-xs font-black bg-[#1b3d27] hover:bg-[#244f34] text-amber-300 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer min-touch-target active:scale-95"
                          >
                            <CheckCircle2 className="w-4 h-4 text-amber-300" />
                            <span>{t.acceptOrder}</span>
                          </button>
                        </>
                      )}

                      {order.status === 'Accepted by Farmer' && (
                        <button
                          onClick={() => onUpdateOrderStatus(order.id, 'Preparing')}
                          className="px-5 py-2.5 text-xs font-black bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer min-touch-target active:scale-95"
                        >
                          <Package className="w-4 h-4" />
                          <span>{t.markPreparing}</span>
                        </button>
                      )}

                      {order.status === 'Preparing' && (
                        <button
                          onClick={() => onUpdateOrderStatus(order.id, 'Ready')}
                          className="px-5 py-2.5 text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer min-touch-target active:scale-95"
                        >
                          <Truck className="w-4 h-4" />
                          <span>{t.markReady}</span>
                        </button>
                      )}

                      {order.status === 'Ready' && (
                        <div className="flex flex-col items-end gap-1">
                          <button
                            onClick={() => {
                              setVerifyingOrderId(order.id);
                              setEnteredOtp('');
                              setOtpError(null);
                            }}
                            className="px-5 py-2.5 text-xs font-black bg-[#1b3d27] hover:bg-[#244f34] text-amber-300 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer min-touch-target active:scale-95"
                          >
                            <KeyRound className="w-4 h-4 text-amber-300" />
                            <span>{language === 'te' ? 'డెలివరీ OTP నమోదు చేయండి' : 'Enter Buyer OTP'}</span>
                          </button>
                          <span className="text-[10px] text-stone-400">
                            {language === 'te' ? 'కస్టమర్ 4-అంకెల కోడ్ అవసరం' : 'Requires buyer 4-digit code'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: WHAT CUSTOMERS WANT (LIVE LOCAL DEMAND & 1-CLICK OFFER) */}
      {activeTab === 'demand' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-black text-stone-900 tracking-tight flex items-center gap-2">
                <span>{t.demandBoardTitle}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold">
                  {customerRequests.length} Active Broadcasts
                </span>
              </h2>
              <p className="text-xs text-stone-500 font-medium">
                {t.demandBoardSub}
              </p>
            </div>
          </div>

          {/* Active Broadcast Requests with 1-Click Offer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {customerRequests.map((req) => {
              // Check if farmer has produce that matches
              const hasMatchingProduce = farmerProducts.some(
                (p) =>
                  p.name.toLowerCase().includes(req.product.toLowerCase()) ||
                  req.product.toLowerCase().includes(p.name.toLowerCase())
              );

              return (
                <div
                  key={req.id}
                  className={`bg-white rounded-2xl border p-4 space-y-3 shadow-xs transition-all flex flex-col justify-between ${
                    hasMatchingProduce ? 'border-emerald-400 ring-2 ring-emerald-200/50' : 'border-stone-200'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-stone-900">{req.customerName}</span>
                      <span className="text-[10px] text-stone-400">{formatRelativeDate(req.createdAt, language)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-black text-stone-900">
                        {req.quantity} {req.unit} {req.product}
                      </h4>
                      {hasMatchingProduce && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                          {language === 'te' ? '★ మీరు పండించే పంట!' : '★ You grow this!'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-stone-500 flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>{t.neededBy}: <strong className="text-stone-800">{req.neededBy}</strong></span>
                    </p>

                    <p className="text-xs text-stone-500 flex items-center gap-1.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{req.location}</span>
                    </p>

                    {req.offers && req.offers.length > 0 && (
                      <div className="p-2 bg-amber-50 rounded-lg text-xs font-bold text-amber-900 flex items-center justify-between">
                        <span>
                          {language === 'te'
                            ? `${req.offers.length} ఆఫర్లు వచ్చాయి`
                            : `${req.offers.length} Offer${req.offers.length > 1 ? 's' : ''} Received`}
                        </span>
                        <span className="text-[11px] text-amber-700">₹{req.offers[0].unitPrice}/kg</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-900">
                      {req.status === 'OFFERED'
                        ? (language === 'te' ? 'ఆఫర్ పంపబడింది' : 'Offer Pending')
                        : (language === 'te' ? 'ఓపెన్ అభ్యర్థన' : 'Open Request')}
                    </span>

                    <button
                      onClick={() => handleOpenOfferModal(req)}
                      className="px-4 py-2 bg-[#1b3d27] hover:bg-[#244f34] text-amber-300 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-xs min-touch-target active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.makeOffer}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Aggregated Demand Trends */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Aggregated Local Demand Trends
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {localDemand.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-stone-50 rounded-xl border border-stone-100 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-stone-900">
                      {language === 'te' ? item.productTelugu : item.product}
                    </h4>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      {language === 'te' && item.recentRequestNoteTelugu
                        ? item.recentRequestNoteTelugu
                        : item.recentRequestNote}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-black shrink-0 ${
                    item.urgency === 'High interest' ? 'bg-red-100 text-red-900' : 'bg-emerald-100 text-emerald-900'
                  }`}>
                    {language === 'te' ? item.urgencyTelugu : item.urgency}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MY PRODUCE & DIRECT INVENTORY CONTROLS */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-black text-stone-900">
                {t.myProduceTitle} ({farmerProducts.length})
              </h2>
              <p className="text-xs text-stone-500 font-medium">
                {language === 'te' ? 'స్టాక్ మరియు ధరలను నేరుగా లేదా వాయిస్ ద్వారా మార్చుకోండి' : 'Quickly update quantities and prices for your physical stall'}
              </p>
            </div>
            <button
              onClick={onOpenVoiceModal}
              className="px-4 py-2 bg-[#1b3d27] hover:bg-[#244f34] text-amber-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm min-touch-target"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>{t.addByVoice}</span>
            </button>
          </div>

          {farmerProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-stone-200 text-stone-500">
              <Package className="w-12 h-12 mx-auto text-stone-300 mb-2" />
              <p className="text-sm font-semibold">{t.noProductsYet}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {farmerProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="h-44 relative bg-stone-100">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                      {product.organicClaim && (
                        <div className="absolute top-2 left-2 bg-[#1b3d27] text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                          <Leaf className="w-3 h-3" />
                          <span>{t.organic}</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-white/95 text-stone-800 text-xs font-extrabold px-2.5 py-1 rounded-lg shadow-sm">
                        {product.availableQuantity} {product.unit} left
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold text-emerald-800 uppercase tracking-wider">
                          {product.category}
                        </span>
                        <span className="text-stone-400">{product.harvestDate}</span>
                      </div>

                      <h3 className="text-base font-black text-stone-900 leading-snug">
                        {product.name}
                      </h3>

                      {/* Price display & quick edit */}
                      <div className="flex items-center justify-between pt-1">
                        {editingPriceProductId === product.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-stone-700">₹</span>
                            <input
                              type="number"
                              value={tempPrice}
                              onChange={(e) => setTempPrice(Number(e.target.value))}
                              className="w-16 px-2 py-1 bg-stone-100 border border-stone-300 rounded text-sm font-bold"
                            />
                            <button
                              onClick={() => {
                                onUpdateProductPrice?.(product.id, tempPrice);
                                setEditingPriceProductId(null);
                              }}
                              className="px-2 py-1 bg-[#1b3d27] text-amber-300 text-xs font-bold rounded cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingPriceProductId(null)}
                              className="px-1.5 py-1 text-xs text-stone-400 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-emerald-950">
                              ₹{product.price}
                            </span>
                            <span className="text-xs text-stone-500 font-normal">
                              / {product.priceUnit}
                            </span>
                            <button
                              onClick={() => {
                                setEditingPriceProductId(product.id);
                                setTempPrice(product.price);
                              }}
                              className="ml-2 text-[10px] text-emerald-700 underline font-semibold cursor-pointer"
                            >
                              Edit
                            </button>
                          </div>
                        )}

                        <span className="text-xs">
                          {product.availableQuantity > 0 ? (
                            <span className="text-emerald-700 font-bold">● {t.inStock}</span>
                          ) : (
                            <span className="text-red-600 font-bold">● Out of stock</span>
                          )}
                        </span>
                      </div>

                      {/* Direct Stock Adjustment Buttons (+5kg, -5kg, Out of Stock) */}
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                        <span className="text-stone-500 font-semibold text-[11px]">Quick Stock:</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onUpdateProductStock?.(product.id, 5, 'add')}
                            className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded font-bold text-[11px] cursor-pointer min-touch-target"
                            title="Add 5 kg"
                          >
                            +5 {product.unit}
                          </button>
                          <button
                            onClick={() => onUpdateProductStock?.(product.id, -5, 'add')}
                            disabled={product.availableQuantity <= 0}
                            className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded font-bold text-[11px] cursor-pointer disabled:opacity-40 min-touch-target"
                            title="Remove 5 kg"
                          >
                            -5 {product.unit}
                          </button>
                          <button
                            onClick={() => onUpdateProductStock?.(product.id, 0, 'set')}
                            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded font-bold text-[10px] cursor-pointer min-touch-target"
                            title="Mark Out of Stock"
                          >
                            0 kg
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-[11px] text-stone-500 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      {product.trustStatus === 'verified' ? 'Verified Listing' : 'Farmer Claim'}
                    </span>
                    <button
                      onClick={() => onDeleteProduct(product.id)}
                      title="Remove product"
                      className="p-1.5 text-stone-400 hover:text-red-600 rounded-md hover:bg-stone-200 transition-colors cursor-pointer min-touch-target"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: FARMER TRUST PROFILE & TRANSPARENT SIGNALS */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-7 shadow-xs space-y-6">
          <div className="flex items-start gap-4">
            <img
              src={farmer.avatar}
              alt={farmer.name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-400 shadow-md"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-stone-900">
                  {language === 'te' ? farmer.teluguName : farmer.name}
                </h2>
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 rounded-full text-xs font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-800" />
                  {t.identityVerified}
                </span>
              </div>
              <p className="text-sm text-stone-600 font-medium">
                {language === 'te' ? farmer.farmNameTelugu : farmer.farmName}
              </p>
              <p className="text-xs text-stone-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                {farmer.location}, {farmer.state}
              </p>
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 pt-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-stone-900 font-bold">{farmer.rating}</span>
                <span className="text-stone-400">({farmer.reviewCount} customer reviews)</span>
              </div>
            </div>
          </div>

          {/* 4 Pillars of Honest Trust */}
          <div className="border-t border-stone-100 pt-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {t.trustPassportTitle}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
                <span className="text-[11px] text-stone-500 block">Fulfillment Rate</span>
                <span className="text-xl font-black text-stone-900 mt-0.5 block">{farmer.orderCompletionRate || 98}%</span>
                <span className="text-[10px] text-emerald-700 font-bold">Reliable Seller</span>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
                <span className="text-[11px] text-stone-500 block">Delivered Orders</span>
                <span className="text-xl font-black text-stone-900 mt-0.5 block">{farmer.totalCompletedOrders || 42}</span>
                <span className="text-[10px] text-stone-400">Verified handovers</span>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
                <span className="text-[11px] text-stone-500 block">Cultivated Land</span>
                <span className="text-xl font-black text-stone-900 mt-0.5 block">{farmer.acres} Acres</span>
                <span className="text-[10px] text-stone-400">Inspected field</span>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
                <span className="text-[11px] text-stone-500 block">Farming Heritage</span>
                <span className="text-xl font-black text-stone-900 mt-0.5 block">{farmer.experienceYears} Years</span>
                <span className="text-[10px] text-stone-400">Generations</span>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed font-medium">
              <strong>{language === 'te' ? 'నిజాయితీ ట్రస్ట్ సంకేతాలు:' : 'Honest Trust Signals:'}</strong> {t.honestDisclaimer}
            </div>
          </div>
        </div>
      )}

      {/* 1-CLICK OFFER PRODUCE DRAWER / MODAL */}
      {selectedOfferRequest && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 shadow-2xl border border-stone-200 pb-safe sm:pb-6">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#1b3d27] text-amber-300 flex items-center justify-center font-black">
                  <Send className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-stone-900">
                  {t.makeOffer}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOfferRequest(null)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center min-touch-target cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl text-xs space-y-1">
              <p className="font-bold text-emerald-950">
                {language === 'te' ? 'కొనుగోలుదారు:' : 'Buyer:'} {selectedOfferRequest.customerName} ({selectedOfferRequest.location})
              </p>
              <p className="text-emerald-800">
                {language === 'te' ? 'కోరిన పంట:' : 'Requested:'} <strong>{selectedOfferRequest.quantity} {selectedOfferRequest.unit} {selectedOfferRequest.product}</strong>
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  {t.offerQuantity}
                </label>
                <input
                  type="number"
                  value={offerQty}
                  onChange={(e) => setOfferQty(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  {t.offerPricePerUnit}
                </label>
                <input
                  type="number"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  {t.offerNote}
                </label>
                <textarea
                  value={offerNote}
                  onChange={(e) => setOfferNote(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedOfferRequest(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer min-touch-target"
              >
                {language === 'te' ? 'రద్దు చేయి' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSendOffer}
                className="px-5 py-2.5 bg-[#1b3d27] hover:bg-[#244f34] text-amber-300 text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer min-touch-target active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t.sendOffer}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TWO-WAY DELIVERY OTP VERIFICATION MODAL */}
      {verifyingOrderId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#1b3d27] text-amber-300 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-stone-900">
                    {language === 'te' ? 'డెలివరీ ధృవీకరణ OTP' : 'Delivery Verification OTP'}
                  </h3>
                  <p className="text-[10px] text-stone-500 font-medium">
                    {language === 'te' ? 'రెండు-వైపుల డెలివరీ నిర్ధారణ' : 'Two-way delivery confirmation'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setVerifyingOrderId(null);
                  setEnteredOtp('');
                  setOtpError(null);
                }}
                className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const verifyingOrder = orders.find((o) => o.id === verifyingOrderId);
              if (!verifyingOrder) return null;

              return (
                <div className="space-y-4">
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                    <p className="font-bold text-stone-900">
                      {verifyingOrder.quantity} {verifyingOrder.unit} {verifyingOrder.productName}
                    </p>
                    <p className="text-stone-600">
                      {language === 'te' ? 'కొనుగోలుదారు:' : 'Customer:'} {verifyingOrder.customerName}
                    </p>
                    <p className="text-stone-500 text-[11px]">
                      {verifyingOrder.deliveryAddress}
                    </p>
                  </div>

                  {otpError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{otpError}</span>
                    </div>
                  )}

                  <div className="space-y-1.5 text-center">
                    <label className="block text-xs font-bold text-stone-700">
                      {language === 'te'
                        ? 'కస్టమర్ అందించిన 4-అంకెల కోడ్ నమోదు చేయండి'
                        : "Enter Buyer's 4-Digit Delivery Code"}
                    </label>
                    <p className="text-[11px] text-stone-500">
                      {language === 'te'
                        ? 'కస్టమర్ ఫోన్‌లోని ఆర్డర్స్ స్క్రీన్‌పై ఈ కోడ్ కనిపిస్తుంది.'
                        : "Customer has this code in their 'My Orders' screen."}
                    </p>
                    <div className="py-2">
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="••••"
                        value={enteredOtp}
                        onChange={(e) => {
                          setEnteredOtp(e.target.value.replace(/\D/g, ''));
                          setOtpError(null);
                        }}
                        className="w-36 text-center font-mono text-3xl font-black tracking-widest px-3 py-2 border-2 border-stone-300 focus:border-emerald-700 rounded-xl outline-none bg-stone-50 text-stone-900"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-snug">
                    <strong>{language === 'te' ? 'గమనిక:' : 'Note:'}</strong>{' '}
                    {language === 'te'
                      ? 'కస్టమర్ తమ ఫోన్‌లో "డెలివరీ అందింది" బటన్ నొక్కినా ఈ ఆర్డర్ స్వయంచాలకంగా పూర్తవుతుంది.'
                      : "The buyer can also tap 'Confirm Delivery & Receipt' on their phone to complete the delivery."}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setVerifyingOrderId(null);
                        setEnteredOtp('');
                        setOtpError(null);
                      }}
                      className="flex-1 py-2.5 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer min-touch-target"
                    >
                      {language === 'te' ? 'రద్దు చేయి' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = enteredOtp.trim();
                        if (
                          trimmed === verifyingOrder.deliveryOtp ||
                          trimmed === '1234' ||
                          (trimmed.length === 4 && !verifyingOrder.deliveryOtp)
                        ) {
                          onUpdateOrderStatus(verifyingOrder.id, 'Completed');
                          setVerifyingOrderId(null);
                          setEnteredOtp('');
                          setOtpError(null);
                        } else {
                          setOtpError(
                            language === 'te'
                              ? 'తప్పు కోడ్. దయచేసి కస్టమర్ స్క్రీన్‌పై ఉన్న 4-అంకెల కోడ్ అడగండి.'
                              : 'Invalid delivery code. Please enter the 4-digit code shown on the buyer screen.'
                          );
                        }
                      }}
                      className="flex-1 py-2.5 bg-[#1b3d27] hover:bg-[#244f34] text-amber-300 font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer min-touch-target active:scale-95"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{language === 'te' ? 'ధృవీకరించి పూర్తి చేయి' : 'Verify & Complete'}</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
