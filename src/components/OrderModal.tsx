import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Banknote,
  CheckCircle2,
  Clock,
  ShieldCheck,
  MapPin,
  Truck,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Plus,
  Minus,
  KeyRound,
  Check,
  Share2,
  Phone,
  MessageCircle,
  QrCode
} from 'lucide-react';
import { Product, Order, OrderStatus } from '../types';
import { DEMO_CUSTOMER } from '../data/mockData';
import { Language, translations } from '../data/translations';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { StepIndicator, StepItem } from './ui/StepIndicator';

interface OrderModalProps {
  product: Product | null;
  initialQuantity?: number;
  isOpen: boolean;
  onClose: () => void;
  onOrderPlaced: (order: Order) => void;
  language: Language;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  product,
  initialQuantity = 2,
  isOpen,
  onClose,
  onOrderPlaced,
  language,
}) => {
  if (!isOpen || !product) return null;

  const t = translations[language];

  // 4 Steps: 1: Basket -> 2: Delivery -> 3: Address -> 4: Payment & Review
  const [checkoutStep, setCheckoutStep] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const s = new URLSearchParams(window.location.search).get('step');
      if (s && ['1', '2', '3', '4'].includes(s)) return parseInt(s, 10);
    }
    return 1;
  });

  const [quantity, setQuantity] = useState<number>(initialQuantity);
  const [deliveryOption, setDeliveryOption] = useState<'cluster' | 'express'>('cluster');
  const [deliveryAddress, setDeliveryAddress] = useState(DEMO_CUSTOMER.address);
  const [customerPhone, setCustomerPhone] = useState(DEMO_CUSTOMER.phone);
  const [customerName, setCustomerName] = useState(DEMO_CUSTOMER.name);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Card' | 'Cash on Delivery'>('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('step') === 'success') {
      return {
        id: 'FT-1048',
        customerId: DEMO_CUSTOMER.id,
        customerName: DEMO_CUSTOMER.name,
        customerPhone: DEMO_CUSTOMER.phone,
        deliveryAddress: DEMO_CUSTOMER.address,
        farmerId: product.farmerId,
        farmerName: product.farmerName,
        farmerLocation: product.farmerLocation,
        productId: product.id,
        productName: product.name,
        productTeluguName: product.teluguName,
        productImage: product.image,
        quantity: 2,
        unit: product.unit,
        unitPrice: product.price,
        totalPrice: product.price * 2 + 20,
        paymentMethod: 'UPI',
        paymentStatus: 'Paid (Simulated)',
        status: 'Order Placed',
        statusHistory: [
          {
            status: 'Order Placed',
            timestamp: 'Just now',
            note: 'Order placed directly with farmer. Awaiting confirmation.',
          },
        ],
        createdAt: 'Just now',
        deliveryOption: 'cluster',
        deliveryFee: 20,
        deliveryOtp: '7492',
      };
    }
    return null;
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showDemoBanner, setShowDemoBanner] = useState<boolean>(true);

  // Delivery Fees: Community Drop = ₹20, Home Delivery = ₹60
  const deliveryFee = deliveryOption === 'cluster' ? 20 : 60;
  const subtotal = product.price * quantity;
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = () => {
    // Validation
    if (!customerName.trim()) {
      setValidationError(language === 'te' ? 'దయచేసి మీ పేరు నమోదు చేయండి' : 'Please enter your name');
      setCheckoutStep(3);
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 8) {
      setValidationError(language === 'te' ? 'దయచేసి సరైన ఫోన్ నంబర్ నమోదు చేయండి' : 'Please enter valid phone number');
      setCheckoutStep(3);
      return;
    }
    if (!deliveryAddress.trim()) {
      setValidationError(language === 'te' ? 'దయచేసి డెలివరీ చిరునామా నమోదు చేయండి' : 'Please enter delivery address');
      setCheckoutStep(3);
      return;
    }

    setValidationError(null);
    setIsProcessing(true);

    // Haptic feedback if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([40, 60, 40]); } catch (e) {}
    }

    setTimeout(() => {
      const newOrder: Order = {
        id: `FT-${Math.floor(1000 + Math.random() * 9000)}`,
        customerId: DEMO_CUSTOMER.id,
        customerName,
        customerPhone,
        deliveryAddress,
        farmerId: product.farmerId,
        farmerName: product.farmerName,
        farmerLocation: product.farmerLocation,
        productId: product.id,
        productName: product.name,
        productTeluguName: product.teluguName,
        productImage: product.image,
        quantity,
        unit: product.unit,
        unitPrice: product.price,
        totalPrice: total,
        paymentMethod,
        paymentStatus: paymentMethod === 'Cash on Delivery' ? 'Pending Cash on Delivery' : 'Paid (Simulated)',
        status: 'Order Placed',
        statusHistory: [
          {
            status: 'Order Placed',
            timestamp: 'Just now',
            note: 'Order placed directly with farmer. Awaiting confirmation.',
          },
        ],
        createdAt: 'Just now',
        deliveryOption,
        deliveryFee,
        deliveryOtp: String(Math.floor(1000 + Math.random() * 9000)),
      };

      setIsProcessing(false);
      setPlacedOrder(newOrder);
      onOrderPlaced(newOrder);
    }, 700);
  };

  const handleShareWhatsApp = (order: Order) => {
    const text = encodeURIComponent(
      `Order #${order.id} for ${order.quantity} ${order.unit} ${order.productName} from ${order.farmerName} placed on Farm Trust! Total: ₹${order.totalPrice}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const stepsList: StepItem[] = [
    { id: 'basket', label: language === 'te' ? 'బుట్ట' : 'Basket' },
    { id: 'delivery', label: language === 'te' ? 'డెలివరీ' : 'Delivery' },
    { id: 'address', label: language === 'te' ? 'చిరునామా' : 'Address' },
    { id: 'pay', label: language === 'te' ? 'చెల్లింపు' : 'Payment' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="relative bg-[#FBF8F1] rounded-t-3xl sm:rounded-2xl max-w-lg w-full shadow-2xl border border-[#E2DDCF] overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] pb-safe sm:pb-0 animate-in fade-in slide-in-from-bottom-6 duration-200">
        
        {/* Header */}
        <div className="bg-[#1B3D27] text-white px-4 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-8 h-8 rounded-full bg-[#E6F2EA]/20 flex items-center justify-center text-[#F5B800] font-black text-sm">
              {placedOrder ? '✓' : `${checkoutStep}/4`}
            </span>
            <div className="min-w-0">
              <h2 className="text-[17px] font-black leading-tight truncate">
                {placedOrder
                  ? (language === 'te' ? 'ఆర్డర్ ఖరారైంది!' : 'Order Placed Successfully!')
                  : (language === 'te' ? 'నేరుగా చెక్అవుట్' : 'Direct Farm Checkout')}
              </h2>
              <p className="text-[12px] text-[#E6F2EA]/80 font-bold">
                {placedOrder
                  ? `#${placedOrder.id}`
                  : (language === 'te' ? `దశ ${checkoutStep} / 4` : `Step ${checkoutStep} of 4`)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator (when not placed) */}
        {!placedOrder && (
          <div className="px-4 py-2 bg-white border-b border-[#E2DDCF] shrink-0">
            <StepIndicator steps={stepsList} currentStepIndex={checkoutStep - 1} />
          </div>
        )}

        {/* Single Dismissible Demo Banner */}
        {showDemoBanner && !placedOrder && (
          <div className="bg-[#FFF4D6] border-b border-[#F5B800]/40 px-4 py-2 flex items-center justify-between gap-2 shrink-0">
            <span className="text-[12px] text-[#5C4300] font-bold">
              {language === 'te'
                ? 'డెమో: చెల్లింపులు సురక్షితంగా అనుకరించబడతాయి (Simulated).'
                : 'Demo mode: payments and payouts are simulated safely.'}
            </span>
            <button
              type="button"
              onClick={() => setShowDemoBanner(false)}
              className="text-[#5C4300] hover:text-black font-black text-xs cursor-pointer p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Validation Error Banner */}
        {validationError && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 text-red-800 text-[13px] font-bold shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Scrollable Modal Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">

          {/* ═════════════════════════════════════════════════ */}
          {/* SUCCESS SCREEN */}
          {/* ═════════════════════════════════════════════════ */}
          {placedOrder && (
            <div className="py-2 space-y-4 text-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-[#E6F2EA] text-[#1E7B3F] rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-[13px] font-black text-[#1E7B3F] uppercase tracking-wider block">
                  {language === 'te' ? 'రైతుకు ఆర్డర్ అందింది' : 'Order Confirmed · 100% Direct'}
                </span>
                <h3 className="text-[26px] font-black text-[#1A1A1A] mt-0.5">
                  #{placedOrder.id}
                </h3>
                <p className="text-[14px] text-[#5B5B5B] mt-1 max-w-sm mx-auto">
                  {language === 'te'
                    ? `${placedOrder.farmerName} గారికి సమాచారం చేరింది. పొలం నుంచి నేరుగా సిద్ధం చేస్తారు.`
                    : `${placedOrder.farmerName} has been notified and will harvest fresh from the field.`}
                </p>
              </div>

              {/* Handover OTP Box */}
              <div className="p-4 bg-[#FFF4D6] rounded-2xl border-2 border-dashed border-[#F5B800] space-y-1.5">
                <div className="flex items-center justify-center gap-1.5 text-[13px] font-black text-[#5C4300]">
                  <KeyRound className="w-4 h-4" />
                  <span>{language === 'te' ? 'డెలివరీ నిర్ధారణ కోడ్ (OTP)' : 'Delivery Handover OTP'}</span>
                </div>
                <div className="py-1">
                  <span className="font-mono text-[32px] font-black tracking-widest text-[#1B3D27] bg-white px-5 py-1 rounded-xl border border-[#F5B800] inline-block shadow-inner">
                    {placedOrder.deliveryOtp}
                  </span>
                </div>
                <p className="text-[12px] text-[#5C4300] leading-relaxed">
                  {language === 'te'
                    ? 'పంట అందినప్పుడు ఈ 4-అంకెల కోడ్‌ను రైతుకు చెప్పండి.'
                    : 'Share this 4-digit code with the farmer upon delivery to confirm.'}
                </p>
              </div>

              {/* Order Summary Details */}
              <Card variant="default" padding="md" className="text-left space-y-2.5 bg-white">
                <div className="flex justify-between font-black text-[#1A1A1A] text-[15px]">
                  <span>{placedOrder.quantity} {placedOrder.unit} {placedOrder.productName}</span>
                  <span className="text-[#1B3D27]">₹{placedOrder.totalPrice}</span>
                </div>
                <div className="flex justify-between text-[13px] text-[#5B5B5B]">
                  <span>{language === 'te' ? 'రైతు:' : 'Farmer:'}</span>
                  <span className="font-bold text-[#1A1A1A]">{placedOrder.farmerName}</span>
                </div>
                <div className="flex justify-between text-[13px] text-[#5B5B5B]">
                  <span>{language === 'te' ? 'డెలివరీ విధానం:' : 'Delivery mode:'}</span>
                  <span className="font-bold text-[#1A1A1A]">
                    {placedOrder.deliveryOption === 'cluster'
                      ? (language === 'te' ? 'కమ్యూనిటీ డ్రాప్ (₹20)' : 'Community drop (₹20)')
                      : (language === 'te' ? 'హోమ్ డెలివరీ (₹60)' : 'Home delivery (₹60)')}
                  </span>
                </div>
                <div className="flex justify-between text-[13px] text-[#5B5B5B]">
                  <span>{language === 'te' ? 'చిరునామా:' : 'Address:'}</span>
                  <span className="font-bold text-[#1A1A1A] truncate max-w-[200px]">{placedOrder.deliveryAddress}</span>
                </div>
              </Card>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Button
                  variant="primary"
                  onClick={() => handleShareWhatsApp(placedOrder)}
                  className="w-full min-h-[52px] text-[15px] bg-[#25D366] hover:bg-[#1ebd59] text-white border-none"
                >
                  <MessageCircle className="w-5 h-5 mr-1.5" />
                  <span>{language === 'te' ? 'WhatsApp లో పంచుకోండి' : 'Share on WhatsApp'}</span>
                </Button>

                <Button
                  variant="secondary"
                  onClick={onClose}
                  className="w-full min-h-[52px] text-[15px]"
                >
                  <span>{language === 'te' ? 'ఆర్డర్ల పేజీకి వెళ్ళండి' : 'Track Order in My Orders'}</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════ */}
          {/* STEP 1: BASKET & QUANTITY */}
          {/* ═════════════════════════════════════════════════ */}
          {!placedOrder && checkoutStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="text-[18px] font-black text-[#1A1A1A]">
                  {language === 'te' ? 'పంట పరిమాణాన్ని సరిచూడండి' : 'Review Quantity in Basket'}
                </h3>
                <p className="text-[14px] text-[#5B5B5B] mt-0.5">
                  {language === 'te' ? 'నేరుగా తోట నుంచి తాజా కోత' : 'Harvested fresh directly for your order'}
                </p>
              </div>

              {/* Product Info Card */}
              <Card variant="default" padding="md" className="bg-white flex items-center gap-3.5">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-16 h-16 rounded-2xl object-cover bg-stone-50 border border-[#E2DDCF] shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-[17px] font-black text-[#1A1A1A] leading-tight truncate">
                    {language === 'te' ? product.teluguName : product.name}
                  </h4>
                  <p className="text-[13px] text-[#5B5B5B] mt-0.5">
                    ₹{product.price} / {product.priceUnit} • {product.farmerName}
                  </p>
                  <p className="text-[12px] font-bold text-[#1E7B3F] mt-1">
                    {product.availableQuantity} {product.unit} {language === 'te' ? 'అందుబాటులో ఉంది' : 'in stock'}
                  </p>
                </div>
              </Card>

              {/* Big Stepper */}
              <Card variant="default" padding="lg" className="text-center space-y-4 bg-white">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[44px] font-black text-[#1B3D27] tracking-tight">
                    {quantity}
                  </span>
                  <span className="text-[20px] font-black text-[#5B5B5B]">
                    {product.unit}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 5))}
                    className="min-h-[48px] bg-stone-100 hover:bg-stone-200 text-[#1A1A1A] font-black rounded-xl text-[16px] cursor-pointer"
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="min-h-[48px] bg-stone-100 hover:bg-stone-200 text-[#1A1A1A] font-black rounded-xl text-[16px] cursor-pointer"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.availableQuantity, q + 1))}
                    className="min-h-[48px] bg-[#E6F2EA] hover:bg-emerald-200 text-[#1B3D27] font-black rounded-xl text-[16px] cursor-pointer"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.availableQuantity, q + 5))}
                    className="min-h-[48px] bg-[#E6F2EA] hover:bg-emerald-200 text-[#1B3D27] font-black rounded-xl text-[16px] cursor-pointer"
                  >
                    +5
                  </button>
                </div>
              </Card>

              {/* Price Calculation Pill */}
              <div className="p-3 bg-[#E6F2EA] rounded-xl flex items-center justify-between text-[14px] font-black text-[#1B3D27]">
                <span>{language === 'te' ? 'పంట మొత్తం:' : 'Produce Subtotal:'}</span>
                <span className="text-[18px]">₹{subtotal}</span>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════ */}
          {/* STEP 2: DELIVERY MODE RADIO CARDS */}
          {/* ═════════════════════════════════════════════════ */}
          {!placedOrder && checkoutStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="text-[18px] font-black text-[#1A1A1A]">
                  {language === 'te' ? 'డెలివరీ విధానాన్ని ఎంచుకోండి' : 'Choose Delivery Mode'}
                </h3>
                <p className="text-[14px] text-[#5B5B5B] mt-0.5">
                  {language === 'te' ? 'కమ్యూనిటీ డ్రాప్ లేదా ఇంటి వద్దకు డెలివరీ' : 'Community drop or home doorstep delivery'}
                </p>
              </div>

              {/* Radio Card 1: Community Drop */}
              <button
                type="button"
                onClick={() => setDeliveryOption('cluster')}
                className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  deliveryOption === 'cluster'
                    ? 'bg-[#E6F2EA] border-2 border-[#1B3D27] shadow-sm'
                    : 'bg-white border-[#E2DDCF] hover:border-[#1B3D27]/40'
                }`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  deliveryOption === 'cluster'
                    ? 'border-[#1B3D27] bg-[#1B3D27] text-white'
                    : 'border-[#5B5B5B] bg-white'
                }`}>
                  {deliveryOption === 'cluster' && <Check className="w-3.5 h-3.5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[16px] font-black text-[#1A1A1A]">
                      {language === 'te' ? 'కమ్యూనిటీ డ్రాప్' : 'Community drop'}
                    </span>
                    <span className="text-[18px] font-black text-[#1B3D27]">
                      ₹20
                    </span>
                  </div>
                  <p className="text-[13px] text-[#5B5B5B] mt-1 leading-relaxed">
                    {language === 'te'
                      ? 'మీ అపార్ట్‌మెంట్ / కాలనీ మెయిన్ గేట్ వద్దకు బల్క్ డెలివరీ. తక్కువ రవాణా ఖర్చు.'
                      : 'Delivered to your apartment gate or local community drop point. Eco-friendly & low fee.'}
                  </p>
                </div>
              </button>

              {/* Radio Card 2: Home Delivery */}
              <button
                type="button"
                onClick={() => setDeliveryOption('express')}
                className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  deliveryOption === 'express'
                    ? 'bg-[#E6F2EA] border-2 border-[#1B3D27] shadow-sm'
                    : 'bg-white border-[#E2DDCF] hover:border-[#1B3D27]/40'
                }`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  deliveryOption === 'express'
                    ? 'border-[#1B3D27] bg-[#1B3D27] text-white'
                    : 'border-[#5B5B5B] bg-white'
                }`}>
                  {deliveryOption === 'express' && <Check className="w-3.5 h-3.5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[16px] font-black text-[#1A1A1A]">
                      {language === 'te' ? 'హోమ్ డెలివరీ' : 'Home delivery'}
                    </span>
                    <span className="text-[18px] font-black text-[#1B3D27]">
                      ₹60
                    </span>
                  </div>
                  <p className="text-[13px] text-[#5B5B5B] mt-1 leading-relaxed">
                    {language === 'te'
                      ? 'నేరుగా తోట నుంచి మీ ఇంటి తలుపు ముందుకు ఎక్స్‌ప్రెస్ రవాణా.'
                      : 'Direct farm transport straight to your doorstep.'}
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* ═════════════════════════════════════════════════ */}
          {/* STEP 3: ADDRESS & CONTACT */}
          {/* ═════════════════════════════════════════════════ */}
          {!placedOrder && checkoutStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="text-[18px] font-black text-[#1A1A1A]">
                  {language === 'te' ? 'డెలివరీ చిరునామా' : 'Delivery Address'}
                </h3>
                <p className="text-[14px] text-[#5B5B5B] mt-0.5">
                  {language === 'te' ? 'రైతు మీతో సంప్రదించడానికి వివరాలు' : 'Contact details for farmer handover'}
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[14px] font-bold text-[#1A1A1A]">
                    {language === 'te' ? 'మీ పేరు:' : 'Full Name:'}
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 bg-white border border-[#E2DDCF] rounded-xl text-[16px] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1B3D27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[14px] font-bold text-[#1A1A1A]">
                    {language === 'te' ? 'ఫోన్ నంబర్:' : 'Phone Number:'}
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 bg-white border border-[#E2DDCF] rounded-xl text-[16px] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1B3D27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[14px] font-bold text-[#1A1A1A]">
                    {language === 'te' ? 'డెలివరీ చిరునామా:' : 'Street Address / Colony:'}
                  </label>
                  <textarea
                    rows={3}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full p-3.5 bg-white border border-[#E2DDCF] rounded-xl text-[16px] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1B3D27]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════ */}
          {/* STEP 4: PAYMENT & TRANSPARENT SUMMARY */}
          {/* ═════════════════════════════════════════════════ */}
          {!placedOrder && checkoutStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="text-[18px] font-black text-[#1A1A1A]">
                  {language === 'te' ? 'చెల్లింపు విధానం & బిల్లు' : 'Payment & Direct Payout'}
                </h3>
                <p className="text-[14px] text-[#5B5B5B] mt-0.5">
                  {language === 'te' ? '100% పారదర్శక విభజన' : '100% transparent fee breakdown'}
                </p>
              </div>

              {/* Compact Segmented Payment Row (UPI / Card / Cash) */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'UPI', label: 'UPI', icon: QrCode },
                  { id: 'Card', label: language === 'te' ? 'కార్డు' : 'Card', icon: CreditCard },
                  { id: 'Cash on Delivery', label: language === 'te' ? 'నగదు' : 'Cash', icon: Banknote },
                ].map((pm) => {
                  const isSelected = paymentMethod === pm.id;
                  const Icon = pm.icon;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id as any)}
                      className={`min-h-[48px] rounded-xl border font-black text-[14px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#1B3D27] text-white border-[#1B3D27] shadow-xs'
                          : 'bg-white text-[#1A1A1A] border-[#E2DDCF] hover:bg-stone-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{pm.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Transparent Direct Value Breakdown */}
              <Card variant="mint" padding="md" className="space-y-2 bg-[#E6F2EA]">
                <div className="flex justify-between text-[14px] text-[#1A1A1A]">
                  <span>{language === 'te' ? 'రైతుకు అందే మొత్తం (100%):' : 'Farmer receives (100%):'}</span>
                  <span className="font-black text-[#1B3D27]">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-[14px] text-[#5B5B5B]">
                  <span>{language === 'te' ? 'ప్లాట్‌ఫారమ్ రుసుము:' : 'Platform fee:'}</span>
                  <span className="font-bold text-[#1E7B3F]">₹0 (Free)</span>
                </div>
                <div className="flex justify-between text-[14px] text-[#5B5B5B]">
                  <span>
                    {deliveryOption === 'cluster'
                      ? (language === 'te' ? 'కమ్యూనిటీ డ్రాప్ డెలివరీ:' : 'Community drop delivery:')
                      : (language === 'te' ? 'హోమ్ డెలివరీ:' : 'Home delivery:')}
                  </span>
                  <span className="font-bold text-[#1A1A1A]">₹{deliveryFee}</span>
                </div>
                <div className="pt-2 border-t border-[#1B3D27]/20 flex justify-between text-[18px] font-black text-[#1B3D27]">
                  <span>{language === 'te' ? 'మొత్తం చెల్లించాల్సింది:' : 'Total Payable:'}</span>
                  <span>₹{total}</span>
                </div>
              </Card>

              {/* Clean UPI One-Click Button */}
              {paymentMethod === 'UPI' && (
                <div className="p-3 bg-white rounded-xl border border-[#E2DDCF] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center font-bold text-[12px] text-[#1B3D27]">
                      UPI
                    </span>
                    <span className="text-[13px] font-bold text-[#1A1A1A]">
                      {DEMO_CUSTOMER.phone}@upi (Instant)
                    </span>
                  </div>
                  <Badge variant="mint">Active</Badge>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Sticky Footer CTA "Pay Rs X" */}
        {!placedOrder && (
          <div className="p-4 bg-white border-t border-[#E2DDCF] flex items-center justify-between gap-3 shrink-0">
            {checkoutStep > 1 && (
              <Button
                variant="secondary"
                onClick={() => setCheckoutStep((s) => s - 1)}
                className="min-h-[52px] px-4 text-[15px]"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                <span>{language === 'te' ? 'వెనుకకు' : 'Back'}</span>
              </Button>
            )}

            {checkoutStep < 4 ? (
              <Button
                variant="primary"
                onClick={() => setCheckoutStep((s) => s + 1)}
                className="flex-1 min-h-[52px] text-[16px]"
              >
                <span>{language === 'te' ? 'తరువాత' : 'Continue'}</span>
                <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handlePlaceOrder}
                disabled={isProcessing}
                isLoading={isProcessing}
                className="flex-1 min-h-[52px] text-[17px] font-black bg-[#1B3D27] hover:bg-[#14321D]"
              >
                <span>
                  {language === 'te' ? `₹${total} చెల్లించండి` : `Pay ₹${total}`}
                </span>
                <ArrowRight className="w-5 h-5 ml-1.5" />
              </Button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
