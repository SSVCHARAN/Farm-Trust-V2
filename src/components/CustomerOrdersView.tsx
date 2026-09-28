import React, { useState } from 'react';
import {
  ShoppingBag,
  Star,
  Clock,
  CheckCircle,
  Truck,
  MapPin,
  X,
  Package,
  ArrowRight,
  ShieldCheck,
  MessageSquare,
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import { Order, OrderStatus, Review } from '../types';
import { Language, translations } from '../data/translations';
import { formatRelativeDate } from '../utils/dateUtils';

interface CustomerOrdersViewProps {
  orders: Order[];
  isOpen: boolean;
  onClose: () => void;
  onAddReview: (review: Review) => void;
  onConfirmDelivery?: (orderId: string) => void;
  language: Language;
}

export const CustomerOrdersView: React.FC<CustomerOrdersViewProps> = ({
  orders,
  isOpen,
  onClose,
  onAddReview,
  onConfirmDelivery,
  language,
}) => {
  if (!isOpen) return null;

  const t = translations[language];

  // Rating Modal state
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [selectedStars, setSelectedStars] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [ratingSubmitted, setRatingSubmitted] = useState<boolean>(false);

  const steps: OrderStatus[] = [
    'Order Placed',
    'Accepted by Farmer',
    'Preparing',
    'Ready',
    'Completed',
  ];

  const getStepIndex = (status: OrderStatus): number => {
    return steps.indexOf(status);
  };

  const handleOpenRating = (order: Order) => {
    setRatingOrder(order);
    setSelectedStars(5);
    setReviewComment('');
    setRatingSubmitted(false);
  };

  const handleSubmitReview = () => {
    if (!ratingOrder) return;

    const newReview: Review = {
      id: `rev-${Date.now()}`,
      orderId: ratingOrder.id,
      farmerId: ratingOrder.farmerId,
      productId: ratingOrder.productId,
      productName: ratingOrder.productName,
      customerName: ratingOrder.customerName,
      rating: selectedStars,
      comment:
        reviewComment.trim() ||
        (language === 'te'
          ? 'చాలా తాజా నాణ్యమైన పంట! రైతుకు ధన్యవాదాలు.'
          : 'Extremely fresh produce straight from the farm! Highly recommend this farmer.'),
      date: 'Just now',
      verifiedPurchase: true,
    };

    onAddReview(newReview);
    setRatingSubmitted(true);
    setTimeout(() => {
      setRatingOrder(null);
      setRatingSubmitted(false);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[92vh] sm:max-h-[90vh] flex flex-col pb-safe sm:pb-0">
        
        {/* Mobile handle indicator */}
        <div className="sm:hidden pt-2.5 pb-1 bg-[#1e3a24] flex justify-center">
          <div className="w-12 h-1 bg-white/30 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="bg-[#1e3a24] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">{t.myOrders}</h2>
              <p className="text-sm text-emerald-100 font-medium">
                {orders.length} {language === 'te' ? 'ఆర్డర్లు నమోదయ్యాయి' : 'orders placed'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Orders list container */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {orders.length === 0 ? (
            <div className="py-12 text-center text-stone-500">
              <ShoppingBag className="w-12 h-12 mx-auto text-stone-300 mb-2" />
              <p className="text-sm font-bold">
                {language === 'te' ? 'ఇంకా ఎలాంటి ఆర్డర్లు లేవు' : 'No orders placed yet.'}
              </p>
              <p className="text-xs text-stone-600 mt-1">
                {language === 'te'
                  ? 'మార్కెట్‌ను పరిశీలించి మన స్థానిక రైతులకు మద్దతు ఇవ్వండి!'
                  : 'Explore the marketplace and support our local farmers!'}
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const currentStepIdx = getStepIndex(order.status);

              return (
                <div
                  key={order.id}
                  className="bg-stone-50/70 border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs hover:border-emerald-300 transition-all"
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/70 pb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={order.productImage}
                        alt={order.productName}
                        className="w-12 h-12 rounded-xl object-cover border border-stone-200"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-bold text-stone-600">
                            #{order.id}
                          </span>
                          <span>·</span>
                          <span className="text-sm font-bold text-emerald-900">
                            {order.farmerName}
                          </span>
                          <span>·</span>
                          <span className="text-xs text-stone-600">
                            {formatRelativeDate(order.createdAt, language)}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-stone-900">
                          {order.quantity} {order.unit} {order.productName}
                        </h4>
                        {order.deliveryOption && (
                          <span className="inline-block mt-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                            {order.deliveryOption === 'cluster'
                              ? (language === 'te' ? 'క్లస్టర్ డ్రాప్ (₹20)' : 'Cluster Drop (₹20)')
                              : (language === 'te' ? 'డైరెక్ట్ ఎక్స్‌ప్రెస్ (₹60)' : 'Direct Express (₹60)')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <span className="text-base font-black text-emerald-950">
                        ₹{order.totalPrice}
                      </span>
                      <p className="text-[11px] text-stone-500">
                        {order.paymentMethod} ({order.paymentStatus})
                      </p>
                    </div>
                  </div>

                  {/* Visual Status Stepper */}
                  <div className="py-2">
                    <div className="relative flex items-center justify-between">
                      {steps.map((step, idx) => {
                        const isCompleted = idx <= currentStepIdx;
                        const isCurrent = idx === currentStepIdx;

                        return (
                          <div
                            key={step}
                            className="flex flex-col items-center flex-1 relative z-10"
                          >
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                isCompleted
                                  ? 'bg-[#1e3a24] text-amber-300 ring-2 ring-emerald-200'
                                  : 'bg-stone-200 text-stone-700'
                              } ${isCurrent ? 'scale-110 shadow-sm ring-4 ring-emerald-100' : ''}`}
                            >
                              {isCompleted ? '✓' : idx + 1}
                            </div>
                            <span
                              className={`text-[11px] sm:text-[11px] mt-1 text-center font-medium leading-tight max-w-[72px] truncate ${
                                isCurrent
                                  ? 'text-emerald-950 font-bold'
                                  : isCompleted
                                  ? 'text-stone-700'
                                  : 'text-stone-600'
                              }`}
                            >
                              {step === 'Order Placed' && (language === 'te' ? 'నమోదైంది' : 'Placed')}
                              {step === 'Accepted by Farmer' && (language === 'te' ? 'అంగీకారం' : 'Accepted')}
                              {step === 'Preparing' && (language === 'te' ? 'కోత/ప్యాకింగ్' : 'Packing')}
                              {step === 'Ready' && (language === 'te' ? 'సిద్ధమైంది' : 'Ready')}
                              {step === 'Completed' && (language === 'te' ? 'అందజేత' : 'Delivered')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* TWO-WAY DELIVERY CONFIRMATION (READY STATE) */}
                  {order.status === 'Ready' && (
                    <div className="bg-gradient-to-r from-amber-50 to-emerald-50 p-3.5 rounded-xl border border-amber-300 text-xs space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 font-bold text-amber-950">
                          <KeyRound className="w-4 h-4 text-amber-700" />
                          <span>{language === 'te' ? 'డెలివరీ వెరిఫికేషన్ కోడ్ (OTP)' : 'Delivery Verification Code (OTP)'}</span>
                        </div>
                        <span className="font-mono text-base font-black px-3 py-0.5 bg-white rounded-lg border border-amber-300 text-[#1b3d27] tracking-widest shadow-2xs">
                          {order.deliveryOtp || '4829'}
                        </span>
                      </div>
                      <p className="text-sm text-stone-600 leading-relaxed">
                        {language === 'te'
                          ? 'మీ ఆర్డర్ సిద్ధమైంది! ఈ కోడ్‌ను డెలివరీ సమయంలో రైతుకు చెప్పండి, లేదా కింద బటన్ నొక్కి డెలివరీ అందినట్లు ధృవీకరించండి.'
                          : 'Produce ready for delivery! Share this 4-digit code with the farmer upon delivery, OR tap below to confirm receipt directly.'}
                      </p>
                      {onConfirmDelivery && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => onConfirmDelivery(order.id)}
                            className="w-full px-5 py-3 bg-[#1e3a24] hover:bg-emerald-950 text-amber-300 font-extrabold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all min-h-[48px]"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{language === 'te' ? 'డెలివరీ అందింది - రసీదు నిర్ధారించండి' : 'Confirm Delivery & Receipt'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Order Footer / Rating Prompt */}
                  <div className="pt-2 border-t border-stone-200/70 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div className="text-stone-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-stone-600" />
                      <span className="truncate max-w-[240px]">{order.deliveryAddress}</span>
                    </div>

                    {order.status === 'Completed' && (
                      <div>
                        {order.rated ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            {language === 'te' ? 'రేటింగ్ సమర్పించబడింది' : 'Rated & Reviewed ✓'}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenRating(order)}
                            className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-extrabold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95 min-h-[44px]"
                          >
                            <Star className="w-3.5 h-3.5 fill-stone-950 text-stone-950" />
                            <span>{t.rateFarmer}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RATING & REVIEW SUB-MODAL */}
      {ratingOrder && (
        <div className="fixed inset-0 z-60 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 text-center space-y-4 animate-in fade-in zoom-in-95">
            {ratingSubmitted ? (
              <div className="py-6 space-y-3">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-stone-900">{t.thankYouRating}</h3>
                <p className="text-xs text-stone-500">
                  {language === 'te'
                    ? 'మీ రేటింగ్ రైతు ప్రొఫైల్ మరియు మార్కెట్లో అప్‌డేట్ చేయబడింది.'
                    : 'Your review was published to the farmer profile and product rating.'}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <h3 className="text-sm font-bold text-stone-800">
                    {t.leaveReview} {ratingOrder.farmerName}
                  </h3>
                  <button
                    onClick={() => setRatingOrder(null)}
                    className="text-stone-600 hover:text-stone-900 cursor-pointer w-11 h-11 flex items-center justify-center rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-stone-600">{t.ratePrompt}</p>

                {/* 5-Star Selector */}
                <div className="flex items-center justify-center gap-2 py-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSelectedStars(star)}
                      className="p-2 hover:scale-125 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= selectedStars
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-stone-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {/* Review Text Area */}
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={t.reviewPlaceholder}
                  rows={3}
                  className="w-full p-3 text-xs border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700 text-stone-900 placeholder:text-stone-600"
                ></textarea>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setRatingOrder(null)}
                    className="flex-1 py-3 min-h-[48px] text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
                  >
                    {language === 'te' ? 'రద్దు చేయి' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleSubmitReview}
                    className="flex-1 py-3 min-h-[48px] text-xs font-bold bg-[#1e3a24] hover:bg-emerald-950 text-amber-300 rounded-xl shadow-md cursor-pointer"
                  >
                    {t.submitRating}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
