import React, { useState } from 'react';
import {
  Mic,
  Package,
  Clock,
  CheckCircle,
  Star,
  ShieldCheck,
  MapPin,
  Phone,
  MessageCircle,
  Volume2,
  Trash2,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ArrowUpRight,
  Sparkles,
  HelpCircle,
  X,
  XCircle,
  Plus
} from 'lucide-react';
import { Farmer, Product, Order, OrderStatus, LocalDemandItem, CustomerRequest, FarmerOffer } from '../types';
import { Language, translations } from '../data/translations';
import { formatRelativeDate } from '../utils/dateUtils';
import { MANDI_PRICES_TODAY } from '../data/mandiPrices';
import { speakOrderAloud } from '../utils/speakUtils';
import { FarmerVoiceHub } from './FarmerVoiceHub';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { BottomSheet } from './ui/BottomSheet';
import { StepIndicator, StepItem } from './ui/StepIndicator';

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
  activeTab?: 'home' | 'orders' | 'products' | 'demand' | 'profile';
  onTabChange?: (tab: 'home' | 'orders' | 'products' | 'demand' | 'profile') => void;
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
  const [internalTab, setInternalTab] = useState<'home' | 'orders' | 'products' | 'demand' | 'profile'>('home');
  const activeTab = controlledTab !== undefined ? controlledTab : internalTab;
  const setActiveTab = (tab: 'home' | 'orders' | 'products' | 'demand' | 'profile') => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  // Reject order confirmation & undo state
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [undoToast, setUndoToast] = useState<{ message: string; order: Order } | null>(null);

  // Delivery OTP Verification State (Two-Way Handshake)
  const [verifyingOrderId, setVerifyingOrderId] = useState<string | null>(null);
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [otpError, setOtpError] = useState<string | null>(null);

  // 1-Click Supply Offer Drawer
  const [selectedOfferRequest, setSelectedOfferRequest] = useState<CustomerRequest | null>(null);
  const [offerQty, setOfferQty] = useState<number>(5);
  const [offerPrice, setOfferPrice] = useState<number>(30);
  const [offerNote, setOfferNote] = useState<string>('తాజా పంట, ఈ రోజే కోత కోసి ప్యాక్ చేస్తాం (Fresh harvest directly from farm)');

  // Quick inline price editing
  const [editingPriceProductId, setEditingPriceProductId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<number>(0);

  const farmerProducts = products.filter((p) => p.farmerId === farmer.id);
  const farmerOrders = orders.filter((o) => o.farmerId === farmer.id);
  const pendingOrders = farmerOrders.filter((o) => o.status === 'Order Placed');
  const activeOrders = farmerOrders.filter(
    (o) => o.status === 'Order Placed' || o.status === 'Accepted by Farmer' || o.status === 'Preparing' || o.status === 'Ready'
  );
  const completedOrders = farmerOrders.filter((o) => o.status === 'Completed');
  const totalSales = completedOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);

  // Order status badge helper
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Order Placed':
        return <Badge variant="warning" icon={AlertCircle}>{language === 'te' ? 'కొత్త ఆర్డర్' : 'New Order'}</Badge>;
      case 'Accepted by Farmer':
        return <Badge variant="mint" icon={CheckCircle2}>{language === 'te' ? 'అంగీకరించారు' : 'Accepted'}</Badge>;
      case 'Preparing':
        return <Badge variant="amber" icon={Clock}>{language === 'te' ? 'సిద్ధం చేస్తున్నారు' : 'Preparing'}</Badge>;
      case 'Ready':
        return <Badge variant="success" icon={Package}>{language === 'te' ? 'డెలివరీకి సిద్ధం' : 'Ready'}</Badge>;
      case 'Completed':
        return <Badge variant="success" icon={CheckCircle}>{language === 'te' ? 'పూర్తయింది' : 'Completed'}</Badge>;
      case 'Rejected':
        return <Badge variant="danger" icon={XCircle}>{language === 'te' ? 'రద్దు చేయబడింది' : 'Rejected'}</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  // 4-step icon stepper for orders
  const getOrderStepIndex = (status: OrderStatus): number => {
    switch (status) {
      case 'Order Placed': return 0;
      case 'Accepted by Farmer': return 1;
      case 'Preparing': return 2;
      case 'Ready': return 2;
      case 'Completed': return 3;
      default: return 0;
    }
  };

  const orderSteps: StepItem[] = [
    { id: 'placed', label: language === 'te' ? 'ఆర్డర్ వచ్చింది' : 'Placed', icon: Clock },
    { id: 'accepted', label: language === 'te' ? 'అంగీకరించారు' : 'Accepted', icon: CheckCircle2 },
    { id: 'ready', label: language === 'te' ? 'సిద్ధం' : 'Ready', icon: Package },
    { id: 'delivered', label: language === 'te' ? 'డెలివరీ అయింది' : 'Delivered', icon: CheckCircle },
  ];

  // Handle Accept
  const handleAcceptOrder = (order: Order) => {
    onUpdateOrderStatus(order.id, 'Accepted by Farmer');
  };

  // Handle Reject
  const handleConfirmReject = () => {
    if (!rejectingOrder) return;
    const rejected = rejectingOrder;
    onUpdateOrderStatus(rejected.id, 'Rejected');
    setRejectingOrder(null);
    setUndoToast({
      message: language === 'te' ? 'ఆర్డర్ రద్దు చేయబడింది' : 'Order rejected',
      order: rejected,
    });
  };

  // Handle Undo Reject
  const handleUndoReject = () => {
    if (!undoToast) return;
    onUpdateOrderStatus(undoToast.order.id, 'Order Placed');
    setUndoToast(null);
  };

  return (
    <div className="max-w-md md:max-w-2xl mx-auto px-4 py-3 pb-36 space-y-4 select-none">
      
      {/* ─── 1. COMPACT GREETING WITH REAL AVATAR ─── */}
      <div className="bg-[#1B3D27] text-white rounded-2xl p-4 shadow-sm border border-[#14321D] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={farmer.avatar}
            alt={farmer.name}
            className="w-14 h-14 rounded-2xl object-cover border-2 border-[#F5B800] bg-white shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/avatars/farmer-ravi.svg';
            }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-[18px] font-black tracking-tight leading-tight truncate">
                {t.namaste}, {language === 'te' ? farmer.teluguName : farmer.name}!
              </h1>
              {farmer.identityVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-[#F5B800] text-[#1A1A1A]">
                  <ShieldCheck className="w-3 h-3" />
                  {language === 'te' ? 'ధృవీకరించబడింది' : 'Verified'}
                </span>
              )}
            </div>
            <p className="text-[13px] text-emerald-100 font-medium truncate mt-0.5">
              {language === 'te' ? farmer.farmNameTelugu : farmer.farmName} · {farmer.location}
            </p>
            <div className="flex items-center gap-2 mt-1 text-[12px] font-bold text-amber-300">
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-[#F5B800] text-[#F5B800]" />
                {farmer.rating} ({farmer.reviewCount} {language === 'te' ? 'రివ్యూలు' : 'reviews'})
              </span>
              <span className="text-white/40">·</span>
              <span className="text-emerald-200">
                {farmer.totalCompletedOrders || 42} {language === 'te' ? 'ఆర్డర్లు అందించారు' : 'orders delivered'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Voice Add button */}
        <button
          type="button"
          onClick={onOpenVoiceModal}
          className="w-11 h-11 rounded-xl bg-[#F5B800] hover:bg-[#E5AC00] text-[#1A1A1A] flex items-center justify-center shrink-0 shadow-xs cursor-pointer active:scale-95"
          title={language === 'te' ? 'వాయిస్ ద్వారా పంట చేర్చండి' : 'Add produce by voice'}
        >
          <Mic className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* ─── HOME TAB CONTENT ─── */}
      {activeTab === 'home' && (
        <div className="space-y-4">

          {/* ONE PENDING ORDER CARD (If new orders waiting) */}
          {pendingOrders.length > 0 && (
            <Card variant="warning" padding="md" className="border-2 border-[#F5B800]">
              <div className="flex items-center justify-between gap-2 border-b border-[#F5B800]/40 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B3261E] animate-pulse" />
                  <span className="text-[14px] font-black text-[#5C4300] uppercase tracking-wider">
                    {language === 'te' ? '1 కొత్త ఆర్డర్ వేచి ఉంది' : '1 New Order Pending'}
                  </span>
                </div>
                <span className="text-[12px] font-bold text-[#5C4300]/80">
                  {formatRelativeDate(pendingOrders[0].createdAt, language)}
                </span>
              </div>

              <div className="py-3 flex items-center gap-3">
                <img
                  src={pendingOrders[0].productImage}
                  alt={pendingOrders[0].productName}
                  className="w-16 h-16 rounded-xl object-cover bg-white border border-[#F5B800]/40 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-[18px] font-black text-[#1A1A1A] leading-tight truncate">
                    {pendingOrders[0].quantity} {pendingOrders[0].unit}{' '}
                    {language === 'te' ? (pendingOrders[0].productTeluguName || pendingOrders[0].productName) : pendingOrders[0].productName}
                  </h3>
                  <p className="text-[14px] text-[#5B5B5B] mt-0.5 truncate">
                    {pendingOrders[0].customerName} · {pendingOrders[0].deliveryAddress}
                  </p>
                  <p className="text-[15px] font-bold text-[#1B3D27] mt-1">
                    {language === 'te' ? 'మీకు అందే మొత్తం:' : 'You receive:'}{' '}
                    <span className="text-[22px] font-black text-[#1B3D27]">
                      ₹{pendingOrders[0].totalPrice}
                    </span>
                  </p>
                </div>
              </div>

              {/* Action Buttons: Large 56px Accept + Smaller Reject */}
              <div className="flex items-center gap-2.5 pt-1">
                <Button
                  variant="primary"
                  onClick={() => handleAcceptOrder(pendingOrders[0])}
                  className="flex-1 min-h-[56px] text-[16px]"
                >
                  <CheckCircle2 className="w-5 h-5 mr-1" />
                  <span>{language === 'te' ? 'ఆర్డర్ అంగీకరించండి' : 'Accept Order'}</span>
                </Button>

                <Button
                  variant="danger"
                  onClick={() => setRejectingOrder(pendingOrders[0])}
                  className="min-h-[56px] px-4"
                >
                  <span>{language === 'te' ? 'తిరస్కరించు' : 'Reject'}</span>
                </Button>
              </div>
            </Card>
          )}

          {/* EARNINGS CARD WITH BROKER COMPARISON & TREND */}
          <Card variant="default" padding="md" className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[13px] font-bold text-[#5B5B5B] block uppercase tracking-wider">
                  {language === 'te' ? 'ఈ వారం అమ్మకాలు' : 'This Week Earnings'}
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[28px] font-black text-[#1B3D27] leading-none tracking-tight">
                    ₹{totalSales > 0 ? totalSales : 580}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[13px] font-bold text-[#1E7B3F]">
                    <ArrowUpRight className="w-4 h-4" />
                    +26%
                  </span>
                </div>
              </div>

              {/* Green Broker Comparison Pill */}
              <div className="px-3 py-1.5 rounded-full bg-[#E6F2EA] text-[#1E7B3F] border border-[#1E7B3F]/25 text-[12px] font-bold flex items-center gap-1.5 text-right">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {language === 'te'
                    ? 'మండి దళారీ కంటే ₹120 ఎక్కువ'
                    : '₹120 more than mandi broker'}
                </span>
              </div>
            </div>

            {/* Tiny Trend Sparkline Bar */}
            <div className="pt-2 border-t border-[#E2DDCF]/80 flex items-center justify-between text-[12px] text-[#5B5B5B]">
              <span>{language === 'te' ? 'దళారీ కమీషన్ లేదు · 100% మీకే' : 'No broker cut · 100% direct to you'}</span>
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="font-bold text-[#1B3D27] hover:underline cursor-pointer"
              >
                {language === 'te' ? 'ఆర్డర్లు చూడండి →' : 'View Orders →'}
              </button>
            </div>
          </Card>

          {/* 96px PULSING VOICE HERO */}
          <FarmerVoiceHub
            farmer={farmer}
            products={farmerProducts}
            orders={farmerOrders}
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

          {/* THREE LARGE STAT TILES (24px+ NUMBERS) */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Tile 1: New Orders */}
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer min-h-[90px] ${
                pendingOrders.length > 0
                  ? 'bg-[#FFF4D6] border-[#F5B800] shadow-xs'
                  : 'bg-white border-[#E2DDCF] hover:border-[#1B3D27]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#5B5B5B]">
                  {language === 'te' ? 'కొత్త ఆర్డర్లు' : 'New Orders'}
                </span>
                {pendingOrders.length > 0 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B3261E] animate-pulse" />
                )}
              </div>
              <div className="mt-2">
                <span className="text-[26px] font-black text-[#1A1A1A] block leading-none">
                  {pendingOrders.length}
                </span>
                <span className="text-[12px] text-[#5B5B5B] font-semibold mt-1 block">
                  {language === 'te' ? 'వేచి ఉన్నాయి' : 'pending'}
                </span>
              </div>
            </button>

            {/* Tile 2: Live Produce */}
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className="bg-white p-3.5 rounded-2xl border border-[#E2DDCF] hover:border-[#1B3D27] text-left flex flex-col justify-between transition-all cursor-pointer min-h-[90px]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#5B5B5B]">
                  {language === 'te' ? 'పంటలు' : 'My Produce'}
                </span>
                <Package className="w-4 h-4 text-[#1E7B3F]" />
              </div>
              <div className="mt-2">
                <span className="text-[26px] font-black text-[#1A1A1A] block leading-none">
                  {farmerProducts.length}
                </span>
                <span className="text-[12px] text-[#5B5B5B] font-semibold mt-1 block">
                  {language === 'te' ? 'అందుబాటులో' : 'in stall'}
                </span>
              </div>
            </button>

            {/* Tile 3: Orders Delivered (No Jargon!) */}
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className="bg-white p-3.5 rounded-2xl border border-[#E2DDCF] hover:border-[#1B3D27] text-left flex flex-col justify-between transition-all cursor-pointer min-h-[90px]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#5B5B5B] leading-tight">
                  {language === 'te' ? 'డెలివరీ' : 'Delivered'}
                </span>
                <CheckCircle className="w-4 h-4 text-[#1E7B3F]" />
              </div>
              <div className="mt-2">
                <span className="text-[26px] font-black text-[#1B3D27] block leading-none">
                  {farmer.totalCompletedOrders || completedOrders.length || 42}
                </span>
                <span className="text-[12px] text-[#5B5B5B] font-semibold mt-1 block">
                  {language === 'te' ? 'పూర్తయింది' : 'completed'}
                </span>
              </div>
            </button>
          </div>

          {/* RECENT ORDERS LIST */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[18px] font-black text-[#1A1A1A]">
                {language === 'te' ? 'ఇటీవలి ఆర్డర్లు' : 'Recent Orders'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="text-[14px] font-bold text-[#1B3D27] hover:underline cursor-pointer"
              >
                {language === 'te' ? 'అన్నీ చూడండి →' : 'See all →'}
              </button>
            </div>

            <div className="space-y-2.5">
              {farmerOrders.slice(0, 3).map((order) => (
                <div
                  key={order.id}
                  onClick={() => setActiveTab('orders')}
                  className="bg-white p-3.5 rounded-2xl border border-[#E2DDCF] hover:border-[#1B3D27] flex items-center justify-between gap-3 shadow-xs cursor-pointer transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={order.productImage}
                      alt={order.productName}
                      className="w-12 h-12 rounded-xl object-cover bg-stone-50 border border-stone-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-mono font-bold text-[#5B5B5B]">
                          #{order.id}
                        </span>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-[15px] font-bold text-[#1A1A1A] truncate mt-0.5">
                        {order.quantity} {order.unit}{' '}
                        {language === 'te' ? (order.productTeluguName || order.productName) : order.productName}
                      </p>
                      <p className="text-[13px] text-[#5B5B5B] truncate">{order.customerName}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[18px] font-black text-[#1B3D27] block">
                      ₹{order.totalPrice}
                    </span>
                    <span className="text-[11px] font-bold text-[#1E7B3F] block">
                      {order.paymentStatus ? 'UPI Paid' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ─── ORDERS TAB CONTENT ─── */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-black text-[#1A1A1A] tracking-tight">
              {language === 'te' ? 'అన్ని ఆర్డర్లు' : 'Customer Orders'}
            </h2>
            <Badge variant="mint" icon={Package}>
              {farmerOrders.length} {language === 'te' ? 'మొత్తం' : 'Total'}
            </Badge>
          </div>

          {farmerOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-[#E2DDCF] space-y-3">
              <Package className="w-12 h-12 text-stone-300 mx-auto" />
              <p className="text-[16px] font-bold text-[#1A1A1A]">
                {language === 'te' ? 'ఇంకా ఆర్డర్లు రాలేదు' : 'No orders yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {farmerOrders.map((order) => {
                const stepIndex = getOrderStepIndex(order.status);
                const isPending = order.status === 'Order Placed';

                return (
                  <Card
                    key={order.id}
                    variant={isPending ? 'warning' : 'default'}
                    padding="md"
                    className={`space-y-3.5 ${isPending ? 'border-2 border-[#F5B800]' : ''}`}
                  >
                    {/* Header: Order ID + Status + Speaker Button */}
                    <div className="flex items-center justify-between border-b border-[#E2DDCF]/80 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-mono font-bold text-[#5B5B5B]">
                          #{order.id}
                        </span>
                        {getStatusBadge(order.status)}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Audio Readout Speaker Button */}
                        <button
                          type="button"
                          onClick={() => speakOrderAloud(order, language)}
                          aria-label={language === 'te' ? 'ఆర్డర్ వివరాలు వినండి' : 'Read order aloud'}
                          className="w-10 h-10 rounded-xl bg-[#E6F2EA] hover:bg-[#d5ebdffe] text-[#1B3D27] flex items-center justify-center transition-colors cursor-pointer"
                          title={language === 'te' ? 'వాయిస్‌లో వినండి' : 'Listen to order in voice'}
                        >
                          <Volume2 className="w-5 h-5 stroke-[2.2]" />
                        </button>

                        <span className="text-[12px] font-semibold text-[#5B5B5B]">
                          {formatRelativeDate(order.createdAt, language)}
                        </span>
                      </div>
                    </div>

                    {/* Order Details Body */}
                    <div className="flex items-center gap-3.5">
                      <img
                        src={order.productImage}
                        alt={order.productName}
                        className="w-16 h-16 rounded-2xl object-cover bg-white border border-[#E2DDCF] shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[18px] font-black text-[#1A1A1A] leading-tight truncate">
                          {order.quantity} {order.unit}{' '}
                          {language === 'te' ? (order.productTeluguName || order.productName) : order.productName}
                        </h3>
                        <p className="text-[14px] font-bold text-[#1A1A1A] mt-0.5 truncate">
                          {order.customerName}
                        </p>
                        <p className="text-[13px] text-[#5B5B5B] truncate">{order.deliveryAddress}</p>

                        {/* Main prominent payout number */}
                        <div className="mt-1.5 flex items-baseline gap-2">
                          <span className="text-[13px] font-bold text-[#5B5B5B]">
                            {language === 'te' ? 'మీకు అందేది:' : 'You receive:'}
                          </span>
                          <span className="text-[22px] font-black text-[#1B3D27] leading-none">
                            ₹{order.totalPrice}
                          </span>
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-[#E6F2EA] text-[#1E7B3F]">
                            {order.paymentStatus?.includes('Paid') ? 'UPI Received ✓' : 'Payment on Delivery'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 4-Step Icon Stepper */}
                    <div className="pt-2 border-t border-[#E2DDCF]/80">
                      <StepIndicator steps={orderSteps} currentStepIndex={stepIndex} />
                    </div>

                    {/* Action Row: Call, WhatsApp, Advance Status */}
                    <div className="flex items-center gap-2 pt-2">
                      {order.customerPhone && (
                        <a
                          href={`tel:${order.customerPhone}`}
                          className="min-h-[48px] px-3.5 rounded-xl border border-[#E2DDCF] bg-white hover:bg-stone-50 text-[#1B3D27] font-bold text-[14px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <Phone className="w-4 h-4" />
                          <span>{language === 'te' ? 'కాల్' : 'Call'}</span>
                        </a>
                      )}

                      {order.customerPhone && (
                        <a
                          href={`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[48px] px-3.5 rounded-xl border border-[#1E7B3F]/30 bg-[#E6F2EA] hover:bg-[#d5ebdffe] text-[#1E7B3F] font-bold text-[14px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>WhatsApp</span>
                        </a>
                      )}

                      {/* Advance Order Status Button */}
                      {isPending && (
                        <Button
                          variant="primary"
                          onClick={() => handleAcceptOrder(order)}
                          className="flex-1 min-h-[48px] text-[15px]"
                        >
                          {language === 'te' ? 'అంగీకరించండి' : 'Accept Order'}
                        </Button>
                      )}

                      {order.status === 'Accepted by Farmer' && (
                        <Button
                          variant="primary"
                          onClick={() => onUpdateOrderStatus(order.id, 'Ready')}
                          className="flex-1 min-h-[48px] text-[15px]"
                        >
                          {language === 'te' ? 'ప్యాక్ చేసి సిద్ధం చేయండి' : 'Mark Ready'}
                        </Button>
                      )}

                      {order.status === 'Ready' && (
                        <Button
                          variant="primary"
                          onClick={() => {
                            setVerifyingOrderId(order.id);
                            setEnteredOtp('');
                            setOtpError(null);
                          }}
                          className="flex-1 min-h-[48px] text-[15px] bg-[#1E7B3F]"
                        >
                          <KeyRound className="w-4 h-4 mr-1" />
                          <span>{language === 'te' ? 'OTP నిర్ధారించండి' : 'Verify Handover'}</span>
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── PRICES TAB CONTENT (MERGING MANDI PRICES & BUYER REQUESTS) ─── */}
      {activeTab === 'demand' && (
        <div className="space-y-4">
          
          {/* Header */}
          <div>
            <h2 className="text-[22px] font-black text-[#1A1A1A] tracking-tight">
              {language === 'te' ? 'మండి మరియు ప్రత్యక్ష మార్కెట్ ధరలు' : 'Mandi vs Direct Fair Prices'}
            </h2>
            <p className="text-[14px] text-[#5B5B5B] mt-0.5">
              {language === 'te'
                ? 'దళారీ లేకుండా రైతు నేరుగా అమ్మితే లభించే అదనపు లాభం'
                : 'See how much more you earn without middleman brokers'}
            </p>
          </div>

          {/* Mandi vs Farm Trust Comparison Table / Cards */}
          <div className="space-y-3">
            {MANDI_PRICES_TODAY.map((item) => (
              <Card key={item.id} variant="default" padding="md" className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[17px] font-black text-[#1A1A1A]">
                    {language === 'te' ? item.cropTeluguName : item.cropName}
                  </h3>
                  <span className="px-2.5 py-1 rounded-full text-[12px] font-black bg-[#E6F2EA] text-[#1E7B3F] border border-[#1E7B3F]/20">
                    +{language === 'te' ? `₹${item.differenceAmount}/${item.unit} ఎక్కువ` : `₹${item.differenceAmount}/${item.unit} more`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center pt-1">
                  {/* Mandi Rate */}
                  <div className="p-2.5 rounded-xl bg-stone-100 border border-stone-200">
                    <span className="text-[12px] font-bold text-[#5B5B5B] block">
                      {language === 'te' ? 'మండి దళారీ ధర' : 'Mandi Broker Price'}
                    </span>
                    <span className="text-[20px] font-black text-stone-700 block mt-0.5 line-through">
                      ₹{item.mandiPrice}/{item.unit}
                    </span>
                  </div>

                  {/* Farm Trust Direct Fair Price */}
                  <div className="p-2.5 rounded-xl bg-[#E6F2EA] border border-[#1B3D27]/20">
                    <span className="text-[12px] font-black text-[#1B3D27] block">
                      {language === 'te' ? 'ఫార్మ్ ట్రస్ట్ ప్రత్యక్ష ధర' : 'Farm Trust Fair Price'}
                    </span>
                    <span className="text-[20px] font-black text-[#1E7B3F] block mt-0.5">
                      ₹{item.suggestedMinPrice} - ₹{item.suggestedMaxPrice}/{item.unit}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Live Buyer Requests Section */}
          <div className="pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[18px] font-black text-[#1A1A1A]">
                  {language === 'te' ? 'కొనుగోలుదారుల తాజా కోరికలు' : 'Live Buyer Requests'}
                </h3>
                <p className="text-[13px] text-[#5B5B5B]">
                  {language === 'te' ? 'విశాఖపట్నం పరిసర ప్రాంతాల నుండి' : 'Direct demand near Visakhapatnam'}
                </p>
              </div>
              <Badge variant="mint">{customerRequests.length}</Badge>
            </div>

            <div className="space-y-3">
              {customerRequests.map((req) => (
                <Card key={req.id} variant="default" padding="md" className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-[17px] font-black text-[#1A1A1A]">
                        {req.quantity} {req.unit} {req.product}
                      </h4>
                      <p className="text-[13px] text-[#5B5B5B] mt-0.5">
                        {req.customerName} · {req.location}
                      </p>
                      <p className="text-[12px] font-bold text-[#1E7B3F] mt-1">
                        {language === 'te' ? 'ఎప్పటికి కావాలి:' : 'Needed by:'} {req.neededBy}
                      </p>
                    </div>
                    <span className="text-[12px] text-[#5B5B5B]">
                      {formatRelativeDate(req.createdAt, language)}
                    </span>
                  </div>

                  <Button
                    variant="primary"
                    onClick={() => {
                      setSelectedOfferRequest(req);
                      setOfferQty(req.quantity);
                      setOfferPrice(30);
                    }}
                    className="min-h-[48px] text-[15px]"
                  >
                    <span>{language === 'te' ? 'నేను అందించగలను' : 'I Can Supply'}</span>
                  </Button>
                </Card>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ─── PRODUCE TAB CONTENT ─── */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[22px] font-black text-[#1A1A1A] tracking-tight">
                {language === 'te' ? 'మీ వద్ద ఉన్న పంటలు' : 'My Stall Produce'}
              </h2>
              <p className="text-[13px] text-[#5B5B5B]">
                {farmerProducts.length} {language === 'te' ? 'రకాలు అందుబాటులో ఉన్నాయి' : 'crops listed live'}
              </p>
            </div>

            <Button
              variant="mic"
              onClick={onOpenVoiceModal}
              className="min-h-[48px] px-4 text-[14px]"
            >
              <Plus className="w-5 h-5 mr-1" />
              <span>{language === 'te' ? 'పంట చేర్చండి' : 'Add Produce'}</span>
            </Button>
          </div>

          <div className="space-y-3">
            {farmerProducts.map((p) => (
              <Card key={p.id} variant="default" padding="md" className="space-y-3">
                <div className="flex items-center gap-3.5">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-16 h-16 rounded-2xl object-cover bg-stone-50 border border-[#E2DDCF] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[18px] font-black text-[#1A1A1A] leading-tight truncate">
                      {language === 'te' ? p.teluguName : p.name}
                    </h3>
                    <p className="text-[14px] text-[#5B5B5B] mt-0.5">{p.category}</p>
                    
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-[22px] font-black text-[#1B3D27]">
                        ₹{p.price}/{p.unit}
                      </span>
                      <span className="text-[13px] font-bold text-[#5B5B5B]">
                        {p.availableQuantity} {p.unit} {language === 'te' ? 'మిగిలింది' : 'left'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Stock and Price Modifiers */}
                <div className="flex items-center justify-between pt-2 border-t border-[#E2DDCF]/80 gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdateProductStock?.(p.id, 5, 'add')}
                      className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#1A1A1A] text-[13px] font-bold cursor-pointer transition-colors"
                    >
                      +5 {p.unit}
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateProductStock?.(p.id, 10, 'add')}
                      className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#1A1A1A] text-[13px] font-bold cursor-pointer transition-colors"
                    >
                      +10 {p.unit}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteProduct(p.id)}
                    className="p-2 text-[#B3261E] hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                    title={language === 'te' ? 'తొలగించండి' : 'Delete listing'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ─── PROFILE TAB CONTENT (TRUST PASSPORT) ─── */}
      {activeTab === 'profile' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-[22px] font-black text-[#1A1A1A] tracking-tight">
              {language === 'te' ? 'రైతు ట్రస్ట్ పాస్‌పోర్ట్' : 'Farmer Trust Passport'}
            </h2>
            <p className="text-[13px] text-[#5B5B5B]">
              {language === 'te' ? 'ధృవీకరించబడిన పొలం మరియు రికార్డు వివరాలు' : 'Verified credentials & fulfillment history'}
            </p>
          </div>

          <Card variant="default" padding="lg" className="space-y-4">
            <div className="flex items-center gap-4">
              <img
                src={farmer.avatar}
                alt={farmer.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-[#1B3D27] bg-white"
              />
              <div>
                <h3 className="text-[20px] font-black text-[#1A1A1A]">
                  {language === 'te' ? farmer.teluguName : farmer.name}
                </h3>
                <p className="text-[14px] text-[#5B5B5B]">{farmer.location}</p>
                <div className="mt-1 flex items-center gap-1.5 text-amber-700 font-bold text-[14px]">
                  <Star className="w-4 h-4 fill-[#F5B800] text-[#F5B800]" />
                  <span>{farmer.rating} ({farmer.reviewCount} {language === 'te' ? 'రివ్యూలు' : 'reviews'})</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-center">
                <span className="text-[12px] font-bold text-[#5B5B5B] block">
                  {language === 'te' ? 'ఆర్డర్లు అందించారు' : 'Orders Delivered'}
                </span>
                <span className="text-[22px] font-black text-[#1B3D27] block mt-0.5">
                  {farmer.totalCompletedOrders || 42}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-center">
                <span className="text-[12px] font-bold text-[#5B5B5B] block">
                  {language === 'te' ? 'సాగు విస్తీర్ణం' : 'Cultivated Land'}
                </span>
                <span className="text-[22px] font-black text-[#1B3D27] block mt-0.5">
                  {farmer.acres} {language === 'te' ? 'ఎకరాలు' : 'Acres'}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#E2DDCF]">
              <h4 className="text-[15px] font-bold text-[#1A1A1A]">
                {language === 'te' ? 'ధృవీకరించబడిన బ్యాడ్జ్‌లు' : 'Verified Badges'}
              </h4>
              <div className="space-y-2">
                {farmer.verifiedBadges?.map((b) => (
                  <div key={b.id} className="flex items-center gap-2.5 text-[14px] font-bold text-[#1E7B3F]">
                    <ShieldCheck className="w-5 h-5 shrink-0" />
                    <span>{language === 'te' ? b.labelTelugu : b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ─── REJECT CONFIRMATION BOTTOM SHEET ─── */}
      <BottomSheet
        isOpen={!!rejectingOrder}
        onClose={() => setRejectingOrder(null)}
        title={language === 'te' ? 'ఆర్డర్‌ను తిరస్కరించాలా?' : 'Reject this order?'}
        subtitle={language === 'te' ? 'దయచేసి కారణం మరియు నిర్ధారణ ఎంచుకోండి' : 'Please confirm rejection'}
      >
        <div className="space-y-4 pt-1">
          <p className="text-[15px] text-[#5B5B5B] leading-relaxed">
            {language === 'te'
              ? 'ఈ ఆర్డర్‌ను తిరస్కరిస్తే కొనుగోలుదారుకు నోటిఫికేషన్ వెళ్తుంది. అవసరమైతే మీరు దీనిని రద్దు చేయవచ్చు.'
              : 'Rejecting this order will inform the buyer. You can still undo this action.'}
          </p>

          <div className="space-y-2.5 pt-2">
            <Button
              variant="primary"
              onClick={handleConfirmReject}
              className="bg-[#B3261E] hover:bg-red-800 text-white min-h-[56px]"
            >
              <span>{language === 'te' ? 'అవును, ఆర్డర్ తిరస్కరించండి' : 'Yes, Reject Order'}</span>
            </Button>

            <Button
              variant="secondary"
              onClick={() => setRejectingOrder(null)}
              className="min-h-[56px]"
            >
              <span>{language === 'te' ? 'వద్దు, ఉంచండి' : 'Keep Order'}</span>
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* ─── 1-CLICK SUPPLY OFFER BOTTOM SHEET ─── */}
      <BottomSheet
        isOpen={!!selectedOfferRequest}
        onClose={() => setSelectedOfferRequest(null)}
        title={language === 'te' ? 'సరఫరా ఆఫర్ సమర్పించండి' : 'Submit Supply Offer'}
        subtitle={selectedOfferRequest ? `${selectedOfferRequest.quantity} ${selectedOfferRequest.unit} ${selectedOfferRequest.product}` : ''}
      >
        {selectedOfferRequest && (
          <div className="space-y-4 pt-1">
            <div className="space-y-1">
              <label className="text-[14px] font-bold text-[#1A1A1A]">
                {language === 'te' ? 'ధర (రూపాయలు/కిలో)' : 'Your Price (₹/kg)'}
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={offerPrice}
                onChange={(e) => setOfferPrice(Number(e.target.value))}
                className="w-full min-h-[56px] px-4 py-3 text-[20px] font-black text-[#1B3D27] bg-white border border-[#E2DDCF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3D27]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[14px] font-bold text-[#1A1A1A]">
                {language === 'te' ? 'పరిమాణం (కిలోలు)' : 'Available Quantity (kg)'}
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={offerQty}
                onChange={(e) => setOfferQty(Number(e.target.value))}
                className="w-full min-h-[56px] px-4 py-3 text-[20px] font-black text-[#1B3D27] bg-white border border-[#E2DDCF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3D27]"
              />
            </div>

            <Button
              variant="primary"
              onClick={() => {
                onSubmitFarmerOffer?.(selectedOfferRequest.id, {
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
                  totalPrice: offerPrice * offerQty,
                  deliveryPromise: 'Within 24 hours',
                  deliveryPromiseTelugu: '24 గంటల్లో',
                  notes: offerNote,
                  createdAt: new Date().toISOString(),
                  status: 'PENDING',
                });
                setSelectedOfferRequest(null);
              }}
              className="min-h-[56px]"
            >
              <span>{language === 'te' ? 'ఆఫర్ పంపండి' : 'Send Offer to Buyer'}</span>
            </Button>
          </div>
        )}
      </BottomSheet>

      {/* ─── TWO-WAY HANDSHAKE DELIVERY OTP MODAL ─── */}
      <BottomSheet
        isOpen={!!verifyingOrderId}
        onClose={() => setVerifyingOrderId(null)}
        title={language === 'te' ? 'డెలివరీ OTP నమోదు చేయండి' : 'Verify Handover OTP'}
        subtitle={language === 'te' ? 'కొనుగోలుదారు ఫోన్‌లో కనిపించే 4-అంకెల కోడ్ అడగండి' : 'Ask buyer for the 4-digit handover code'}
      >
        <div className="space-y-4 pt-1">
          <p className="text-[14px] text-[#5B5B5B] leading-relaxed">
            {language === 'te'
              ? 'కొనుగోలుదారు పంటను స్వీకరించిన తర్వాత వారి యాప్‌లో కనిపించే 4-అంకెల OTPని నమోదు చేయండి.'
              : 'Enter the 4-digit code displayed on the buyer app to finalize payment and complete order.'}
          </p>

          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={enteredOtp}
            onChange={(e) => {
              setEnteredOtp(e.target.value);
              setOtpError(null);
            }}
            placeholder="• • • •"
            className="w-full min-h-[64px] text-center text-[32px] font-black tracking-widest bg-white border-2 border-[#1B3D27] rounded-2xl focus:outline-none"
          />

          {otpError && (
            <p className="text-[14px] font-bold text-[#B3261E] text-center">{otpError}</p>
          )}

          <Button
            variant="primary"
            onClick={() => {
              if (enteredOtp.length === 4) {
                if (verifyingOrderId) {
                  onUpdateOrderStatus(verifyingOrderId, 'Completed');
                }
                setVerifyingOrderId(null);
              } else {
                setOtpError(language === 'te' ? 'దయచేసి 4-అంకెల కోడ్ నమోదు చేయండి' : 'Please enter valid 4-digit code');
              }
            }}
            className="min-h-[56px]"
          >
            <span>{language === 'te' ? 'డెలివరీ పూర్తి చేయండి' : 'Complete Handover'}</span>
          </Button>
        </div>
      </BottomSheet>

      {/* ─── UNDO TOAST NOTIFICATION ─── */}
      {undoToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-[#1A1A1A] text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-[14px] font-bold">{undoToast.message}</span>
          <button
            type="button"
            onClick={handleUndoReject}
            className="px-3 py-1.5 rounded-lg bg-[#F5B800] text-[#1A1A1A] text-[13px] font-black cursor-pointer hover:bg-amber-300 transition-colors"
          >
            {language === 'te' ? 'రద్దు చేయి (Undo)' : 'Undo'}
          </button>
        </div>
      )}

    </div>
  );
};
