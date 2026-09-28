import React, { useState } from 'react';
import {
  X,
  CreditCard,
  QrCode,
  Banknote,
  CheckCircle2,
  Clock,
  ShieldCheck,
  MapPin,
  Truck,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Info,
  Plus,
  KeyRound,
  Check
} from 'lucide-react';
import { Product, Order, OrderStatus } from '../types';
import { DEMO_CUSTOMER } from '../data/mockData';
import { Language, translations } from '../data/translations';

// Configurable Pilot Delivery Rules (Easily modifiable)
export const PILOT_DELIVERY_RULES = {
  minOrderValue: 150, // ₹150 minimum order value
  minOrderQuantity: 3, // 3 kg / units minimum
  clusterDropFee: 20, // Consolidated cluster drop to community/gate point
  expressDeliveryFee: 60, // Direct farm express to doorstep
};

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

  const [quantity, setQuantity] = useState<number>(initialQuantity);
  const [deliveryOption, setDeliveryOption] = useState<'cluster' | 'express'>('cluster');
  const [deliveryAddress, setDeliveryAddress] = useState(DEMO_CUSTOMER.address);
  const [customerPhone, setCustomerPhone] = useState(DEMO_CUSTOMER.phone);
  const [customerName, setCustomerName] = useState(DEMO_CUSTOMER.name);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Card' | 'Cash on Delivery'>('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const subtotal = product.price * quantity;
  const deliveryFee =
    deliveryOption === 'cluster'
      ? PILOT_DELIVERY_RULES.clusterDropFee
      : PILOT_DELIVERY_RULES.expressDeliveryFee;
  const total = subtotal + deliveryFee;

  const isBelowMov =
    subtotal < PILOT_DELIVERY_RULES.minOrderValue &&
    quantity < PILOT_DELIVERY_RULES.minOrderQuantity;

  const handlePlaceOrder = () => {
    // Validation checks
    if (!customerName.trim()) {
      setValidationError(language === 'te' ? 'దయచేసి మీ పేరు నమోదు చేయండి' : 'Please enter your name');
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 8) {
      setValidationError(language === 'te' ? 'దయచేసి సరైన ఫోన్ నంబర్ నమోదు చేయండి' : 'Please enter a valid phone number');
      return;
    }
    if (!deliveryAddress.trim()) {
      setValidationError(language === 'te' ? 'దయచేసి డెలివరీ చిరునామా నమోదు చేయండి' : 'Please enter delivery address');
      return;
    }
    if (quantity <= 0 || quantity > product.availableQuantity) {
      setValidationError(
        language === 'te'
          ? `పరిమాణం 1 నుండి ${product.availableQuantity} లోపు ఉండాలి`
          : `Quantity must be between 1 and ${product.availableQuantity}`
      );
      return;
    }

    setValidationError(null);
    setIsProcessing(true);

    setTimeout(() => {
      const orderId = `FT-${Math.floor(1000 + Math.random() * 9000)}`;
      const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

      const newOrder: Order = {
        id: orderId,
        customerId: DEMO_CUSTOMER.id,
        customerName: customerName.trim() || DEMO_CUSTOMER.name,
        customerPhone: customerPhone.trim() || DEMO_CUSTOMER.phone,
        deliveryAddress: deliveryAddress.trim() || DEMO_CUSTOMER.address,
        farmerId: product.farmerId,
        farmerName: product.farmerName,
        farmerLocation: product.farmerLocation,
        productId: product.id,
        productName: product.name,
        productTeluguName: product.teluguName || product.name,
        productImage: product.image,
        quantity,
        unit: product.unit,
        unitPrice: product.price,
        totalPrice: total,
        paymentMethod,
        paymentStatus: paymentMethod === 'Cash on Delivery' ? 'Pending Cash on Delivery' : 'Paid (Simulated)',
        status: 'Order Placed',
        deliveryOption,
        deliveryFee,
        deliveryOtp,
        statusHistory: [
          {
            status: 'Order Placed',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            note: `${paymentMethod} confirmed (${deliveryOption === 'cluster' ? 'Cluster Drop ₹20' : 'Direct Express ₹60'}). Delivery OTP generated.`,
          },
        ],
        createdAt: new Date().toISOString(),
        rated: false,
      };

      setIsProcessing(false);
      setPlacedOrder(newOrder);
      onOrderPlaced(newOrder);
    }, 1200);
  };

  const handleClose = () => {
    setPlacedOrder(null);
    setIsProcessing(false);
    setValidationError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[92vh] sm:max-h-[90vh] flex flex-col pb-safe sm:pb-0">
        
        {/* Mobile handle indicator */}
        <div className="sm:hidden pt-2.5 pb-1 bg-[#1e3a24] flex justify-center">
          <div className="w-12 h-1 bg-white/30 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="bg-[#1e3a24] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight">
              {placedOrder ? (language === 'te' ? 'ఆర్డర్ ఖరారైంది!' : 'Order Placed Directly!') : (language === 'te' ? 'రైతు నుంచి నేరుగా కొనుగోలు' : 'Direct Farm Checkout')}
            </h2>
            <p className="text-sm text-emerald-100 font-medium">
              {product.farmerName} · {product.farmerLocation}
            </p>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PROCESSING SCREEN */}
        {isProcessing && (
          <div className="p-10 text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto">
              <div className="w-16 h-16 rounded-full border-4 border-emerald-100 border-t-emerald-800 animate-spin"></div>
              <Sparkles className="w-6 h-6 text-amber-500 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">{t.processingOrder}</h3>
              <p className="text-xs text-stone-500 mt-1">
                {language === 'te'
                  ? 'సిమ్యులేటెడ్ చెల్లింపు మరియు డెలివరీ OTP ధృవీకరించబడుతున్నాయి...'
                  : 'Verifying simulated payment and notifying the farmer directly...'}
              </p>
            </div>
          </div>
        )}

        {/* ORDER SUCCESS SCREEN WITH DELIVERY OTP */}
        {!isProcessing && placedOrder && (
          <div className="p-6 space-y-5 text-center overflow-y-auto">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-sm font-bold text-emerald-800 uppercase tracking-wider block">
                {language === 'te' ? 'ఆర్డర్ విజయవంతంగా నమోదైంది' : 'Order Confirmed · Direct with Farmer'}
              </span>
              <h3 className="text-2xl font-black text-stone-900 mt-1">
                #{placedOrder.id}
              </h3>
              <p className="text-sm text-stone-600 mt-1.5 max-w-sm mx-auto">
                {language === 'te'
                  ? `${placedOrder.farmerName} కు సమాచారం పంపబడింది. పంటను సిద్ధం చేస్తున్నారు.`
                  : `Notification sent to ${placedOrder.farmerName}. Farmer will harvest and pack fresh.`}
              </p>
            </div>

            {/* TWO-WAY DELIVERY CONFIRMATION OTP BOX */}
            <div className="bg-gradient-to-br from-amber-50 via-emerald-50/40 to-amber-50 rounded-2xl p-4 border-2 border-dashed border-amber-300 shadow-xs space-y-2 text-center">
              <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-amber-900 uppercase tracking-wider">
                <KeyRound className="w-4 h-4 text-amber-700" />
                <span>{language === 'te' ? 'డెలివరీ వెరిఫికేషన్ కోడ్' : 'Your Delivery Verification Code'}</span>
              </div>
              <div className="py-2">
                <span className="font-mono text-3xl font-black tracking-widest text-[#1b3d27] bg-white px-5 py-1.5 rounded-xl border border-amber-200 shadow-inner inline-block">
                  {placedOrder.deliveryOtp}
                </span>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed max-w-xs mx-auto">
                {language === 'te'
                  ? 'ఆర్డర్ అందుకున్నప్పుడు ఈ 4-అంకెల కోడ్‌ను రైతుకు చెప్పండి, లేదా మీ "ఆర్డర్లు" ట్యాబ్‌లో నేరుగా కన్ఫర్మ్ చేయండి.'
                  : 'Share this 4-digit code with the farmer upon delivery, OR tap "Confirm Receipt" in your Orders tab to complete.'}
              </p>
            </div>

            {/* Summary card */}
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200/80 text-left text-sm space-y-2">
              <div className="flex justify-between font-semibold text-stone-800">
                <span>{placedOrder.quantity} {placedOrder.unit} {placedOrder.productName}</span>
                <span className="font-bold text-emerald-950">₹{placedOrder.totalPrice}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Farmer:</span>
                <span className="font-medium text-stone-800">{placedOrder.farmerName}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Delivery Mode:</span>
                <span className="font-medium text-stone-800">
                  {placedOrder.deliveryOption === 'cluster'
                    ? 'Consolidated Cluster Drop (₹20)'
                    : 'Direct Farm Express (₹60)'}
                </span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Payment:</span>
                <span className="font-medium text-stone-800">{placedOrder.paymentMethod} ({placedOrder.paymentStatus})</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Address:</span>
                <span className="font-medium text-stone-800 truncate max-w-[200px]">{placedOrder.deliveryAddress}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleClose}
                className="w-full py-3 min-h-[48px] bg-[#1e3a24] hover:bg-emerald-950 text-amber-300 font-extrabold text-sm sm:text-base rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t.trackOrder}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ORDER FORM */}
        {!isProcessing && !placedOrder && (
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
            {/* Selected Product Summary */}
            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
              <img
                src={product.image}
                alt={product.name}
                className="w-14 h-14 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-stone-900 truncate">{product.name}</h4>
                <p className="text-sm text-stone-600">
                  ₹{product.price} / {product.priceUnit} · Direct from {product.farmerName}
                </p>
                <div className="flex items-center gap-2 mt-1 text-sm">
                  <span className="text-stone-600 font-medium">Qty: {quantity} {product.unit}</span>
                  <span>·</span>
                  <span className="font-black text-emerald-950">Subtotal: ₹{subtotal}</span>
                </div>
              </div>
            </div>

            {/* Validation Error Alert */}
            {validationError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Minimum Order Value (MOV) Pilot Advisory */}
            {isBelowMov && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm space-y-2">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-amber-950">
                      {language === 'te' ? 'పైలట్ డెలివరీ సూచన' : 'Pilot Delivery Advisory'}
                    </p>
                    <p className="text-sm text-amber-800 mt-0.5 leading-relaxed">
                      {language === 'te'
                        ? `తోట నుంచి నేరుగా రవాణా చేయడానికి కనీసం ₹150 లేదా 3 ${product.unit} ఆర్డర్ సిఫార్సు చేయబడింది (ప్రస్తుతం: ₹${subtotal} / ${quantity} ${product.unit}). క్లస్టర్ డ్రాప్‌ను ఎంచుకోవడం ద్వారా రవాణా భారం తగ్గుతుంది.`
                        : `To keep single-farm direct logistics viable, minimum ₹150 or 3 ${product.unit} is recommended (current: ₹${subtotal} / ${quantity} ${product.unit}). Consolidated Cluster Drop is recommended.`}
                    </p>
                  </div>
                </div>
                {quantity < product.availableQuantity && (
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.availableQuantity, q + 1))}
                    className="w-full py-1.5 min-h-[44px] bg-amber-200/70 hover:bg-amber-200 text-amber-950 rounded-lg text-sm font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {language === 'te' ? `+1 ${product.unit} జోడించండి (సిఫార్సు చేయబడింది)` : `+ Add 1 ${product.unit} to meet pilot minimum`}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* PILOT DELIVERY MODEL SELECTOR */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-600">
                  {language === 'te' ? 'డెలివరీ విధానం (పైలట్ మోడల్)' : 'Delivery Mode (Pilot Model)'}
                </h3>
                <span className="text-xs text-stone-600 bg-stone-100 px-2 py-0.5 rounded font-medium">
                  Direct Farm Logistics
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryOption('cluster')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                    deliveryOption === 'cluster'
                      ? 'border-emerald-700 bg-emerald-50/70 ring-1 ring-emerald-700 shadow-xs'
                      : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-emerald-800" />
                      {language === 'te' ? 'క్లస్టర్ డ్రాప్' : 'Cluster Drop'}
                    </span>
                    <span className="text-sm font-black text-emerald-900">
                      ₹{PILOT_DELIVERY_RULES.clusterDropFee}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1 leading-snug">
                    {language === 'te'
                      ? 'అపార్ట్‌మెంట్ గేట్ / స్థానిక డ్రాప్ పాయింట్ వద్ద కలెక్టివ్ డెలివరీ.'
                      : 'Consolidated drop at apartment gate / community hub.'}
                  </p>
                  {deliveryOption === 'cluster' && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-600"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryOption('express')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                    deliveryOption === 'express'
                      ? 'border-emerald-700 bg-emerald-50/70 ring-1 ring-emerald-700 shadow-xs'
                      : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      {language === 'te' ? 'డైరెక్ట్ ఎక్స్‌ప్రెస్' : 'Direct Express'}
                    </span>
                    <span className="text-sm font-black text-stone-900">
                      ₹{PILOT_DELIVERY_RULES.expressDeliveryFee}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1 leading-snug">
                    {language === 'te'
                      ? 'తోట నుంచి నేరుగా మీ ఇంటి ముందుకు డెలివరీ.'
                      : 'Dedicated runner straight from farm to your door.'}
                  </p>
                  {deliveryOption === 'express' && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-600"></span>
                  )}
                </button>
              </div>
            </div>

            {/* Delivery Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-600">
                {language === 'te' ? 'డెలివరీ సమాచారం' : 'Delivery Details'}
              </h3>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-0.5">
                    {language === 'te' ? 'మీ పేరు' : 'Your Name'}
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 text-base min-h-[48px] border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-0.5">
                    {language === 'te' ? 'ఫోన్ నంబర్' : 'Phone'}
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 text-base min-h-[48px] border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-600 mb-0.5">
                  {t.deliveryAddress}
                </label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-3 py-2 text-base min-h-[48px] border border-stone-300 rounded-lg focus:ring-1 focus:ring-emerald-700"
                />
              </div>
            </div>

            {/* Payment Method Selector (Simulated) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-600">
                  {t.paymentMethod}
                </h3>
                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold border border-amber-200">
                  Pilot Simulation Mode
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer min-h-[44px] ${
                    paymentMethod === 'UPI'
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-bold shadow-xs'
                      : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <QrCode className="w-5 h-5 mx-auto mb-1 text-emerald-800" />
                  <span className="text-sm block">UPI / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('Card')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer min-h-[44px] ${
                    paymentMethod === 'Card'
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-bold shadow-xs'
                      : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <CreditCard className="w-5 h-5 mx-auto mb-1 text-emerald-800" />
                  <span className="text-sm block">Debit / Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('Cash on Delivery')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer min-h-[44px] ${
                    paymentMethod === 'Cash on Delivery'
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-bold shadow-xs'
                      : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <Banknote className="w-5 h-5 mx-auto mb-1 text-emerald-800" />
                  <span className="text-sm block">Cash on Delivery</span>
                </button>
              </div>

              {/* REALISTIC SIMULATED PAYMENT PREVIEW (Phase 3 Task 10) */}
              {paymentMethod === 'UPI' && (
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2 text-sm">
                  <div className="flex items-center gap-3">
                    {/* Stylized QR Visual */}
                    <div className="w-14 h-14 bg-white p-1 rounded-lg border border-stone-300 flex items-center justify-center shadow-2xs shrink-0">
                      <div className="w-full h-full bg-stone-900 rounded p-1 flex flex-col justify-between">
                        <div className="flex justify-between">
                          <div className="w-2.5 h-2.5 bg-white rounded-xs"></div>
                          <div className="w-2.5 h-2.5 bg-white rounded-xs"></div>
                        </div>
                        <div className="flex justify-center">
                          <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                        </div>
                        <div className="flex justify-between">
                          <div className="w-2.5 h-2.5 bg-white rounded-xs"></div>
                          <div className="w-1.5 h-1.5 bg-white"></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 font-bold text-stone-900">
                        <span>UPI Direct VPA</span>
                        <span className="text-xs text-emerald-700 bg-emerald-100 px-1 rounded">Live Demo</span>
                      </div>
                      <p className="text-sm font-mono text-stone-600 truncate">
                        farmtrust.{product.farmerId || 'direct'}@upi
                      </p>
                      <p className="text-xs text-stone-600 mt-0.5">
                        Payee: {product.farmerName} Direct
                      </p>
                    </div>
                  </div>
                  <div className="p-2 bg-amber-50 rounded-lg text-xs text-amber-900 border border-amber-200 leading-snug">
                    <strong>Simulated Pilot UPI:</strong> No actual bank account is debited. Clicking place order will simulate instant UPI confirmation and notify the farmer directly.
                  </div>
                </div>
              )}

              {paymentMethod === 'Card' && (
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-sm space-y-1">
                  <p className="font-mono text-stone-700 font-semibold">•••• •••• •••• 4242</p>
                  <p className="text-xs text-stone-600">Simulated Test Visa Card · Exp: 12/28</p>
                </div>
              )}

              {paymentMethod === 'Cash on Delivery' && (
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-sm space-y-1">
                  <p className="font-semibold text-stone-800">
                    {language === 'te' ? `డెలివరీ సమయంలో ₹${total} చెల్లించండి` : `Pay ₹${total} in Cash/UPI upon delivery`}
                  </p>
                  <p className="text-xs text-stone-600">
                    {language === 'te'
                      ? 'డెలివరీ వెరిఫికేషన్ కోడ్ సరిచూసిన తర్వాత నేరుగా రైతుకు చెల్లించండి.'
                      : 'Pay the farmer directly after exchanging the 4-digit verification code.'}
                  </p>
                </div>
              )}
            </div>

            {/* Price breakdown */}
            <div className="pt-2 border-t border-stone-200 space-y-1.5 text-sm">
              <div className="flex justify-between text-stone-600">
                <span>Produce ({quantity} {product.unit}):</span>
                <span className="font-medium text-stone-800">₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>
                  {deliveryOption === 'cluster'
                    ? 'Consolidated Cluster Drop:'
                    : 'Direct Farm Express:'}
                </span>
                <span className="font-semibold text-stone-800">₹{deliveryFee}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-stone-900 pt-1 border-t border-stone-100">
                <span>{t.totalAmount}:</span>
                <span className="text-emerald-950 font-black">₹{total}</span>
              </div>
            </div>

            {/* Pay Button */}
            <button
              type="button"
              onClick={handlePlaceOrder}
              className="w-full py-3.5 min-h-[52px] bg-[#1e3a24] hover:bg-emerald-950 text-amber-300 font-extrabold text-base rounded-xl shadow-md transition-all cursor-pointer active:scale-98 min-touch-target flex items-center justify-center gap-2"
            >
              <span>
                {paymentMethod === 'Cash on Delivery'
                  ? (language === 'te' ? `క్యాష్ ఆన్ డెలివరీ ఆర్డర్ (₹${total})` : `Confirm Cash on Delivery (₹${total})`)
                  : (language === 'te' ? `చెల్లించి ఆర్డర్ చేయండి (₹${total})` : `Pay & Place Order (₹${total})`)}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
