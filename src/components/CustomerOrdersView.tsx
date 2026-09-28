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
  Phone,
  MessageCircle,
  KeyRound,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Order, OrderStatus, Review } from '../types';
import { Language, translations } from '../data/translations';
import { formatRelativeDate } from '../utils/dateUtils';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { StepIndicator, StepItem } from './ui/StepIndicator';

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

  // 4-step icon stepper matching Farmer side
  const orderSteps: StepItem[] = [
    { id: 'placed', label: language === 'te' ? 'ఆర్డర్ అయింది' : 'Placed', icon: Clock },
    { id: 'accepted', label: language === 'te' ? 'రైతు అంగీకారం' : 'Accepted', icon: CheckCircle2 },
    { id: 'ready', label: language === 'te' ? 'సిద్ధమైంది' : 'Ready', icon: Package },
    { id: 'completed', label: language === 'te' ? 'చేరింది' : 'Delivered', icon: CheckCircle },
  ];

  const getStepIndex = (status: OrderStatus): number => {
    switch (status) {
      case 'Order Placed': return 0;
      case 'Accepted by Farmer': return 1;
      case 'Preparing': return 2;
      case 'Ready': return 2;
      case 'Completed': return 3;
      default: return 0;
    }
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="relative bg-[#FBF8F1] rounded-t-3xl sm:rounded-2xl max-w-xl w-full shadow-2xl border border-[#E2DDCF] overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] pb-safe sm:pb-0 animate-in fade-in slide-in-from-bottom-6 duration-200">
        
        {/* Header */}
        <div className="bg-[#1B3D27] text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#F5B800] text-[#1A1A1A] flex items-center justify-center font-black shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[17px] font-black leading-tight">
                {language === 'te' ? 'నా ఆర్డర్లు మరియు ట్రాకింగ్' : 'My Orders & Live Tracking'}
              </h2>
              <p className="text-[12px] text-[#E6F2EA]/80 font-bold">
                {orders.length} {language === 'te' ? 'ఆర్డర్లు నమోదయ్యాయి' : 'orders placed direct'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Orders list container */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {orders.length === 0 ? (
            <Card variant="default" padding="lg" className="py-12 text-center text-[#5B5B5B] space-y-3">
              <ShoppingBag className="w-12 h-12 mx-auto text-[#5B5B5B] opacity-50" />
              <p className="text-[16px] font-black text-[#1A1A1A]">
                {language === 'te' ? 'ఇంకా ఎలాంటి ఆర్డర్లు లేవు' : 'No orders placed yet'}
              </p>
              <p className="text-[13px] text-[#5B5B5B]">
                {language === 'te'
                  ? 'మార్కెట్‌ను పరిశీలించి మన స్థానిక చిన్న రైతులకు మద్దతు ఇవ్వండి!'
                  : 'Explore fresh farm produce and support local growers directly!'}
              </p>
            </Card>
          ) : (
            orders.map((order) => {
              const currentStepIdx = getStepIndex(order.status);

              return (
                <Card
                  key={order.id}
                  variant="default"
                  padding="md"
                  className="space-y-3.5 bg-white border border-[#E2DDCF]"
                >
                  {/* Order Top Bar */}
                  <div className="flex items-start justify-between gap-3 border-b border-[#E2DDCF] pb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={order.productImage}
                        alt={order.productName}
                        onError={(e) => {
                          e.currentTarget.src = '/products/tomatoes.svg';
                        }}
                        className="w-14 h-14 rounded-xl object-cover border border-[#E2DDCF] shrink-0 bg-stone-50"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[12px] font-mono font-bold text-[#5B5B5B]">
                            #{order.id}
                          </span>
                          <span>•</span>
                          <span className="text-[12px] font-bold text-[#5B5B5B]">
                            {formatRelativeDate(order.createdAt, language)}
                          </span>
                        </div>
                        <h4 className="text-[16px] font-black text-[#1A1A1A] leading-tight mt-0.5 truncate">
                          {order.quantity} {order.unit} {language === 'te' ? order.productTeluguName : order.productName}
                        </h4>
                        <p className="text-[13px] font-bold text-[#1B3D27] mt-0.5">
                          {order.farmerName} • {order.farmerLocation}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[20px] font-black text-[#1B3D27] block leading-none">
                        ₹{order.totalPrice}
                      </span>
                      <span className="text-[11px] font-bold text-[#1E7B3F] bg-[#E6F2EA] px-2 py-0.5 rounded-md inline-block mt-1">
                        {order.paymentMethod}
                      </span>
                    </div>
                  </div>

                  {/* Delivery Mode Banner */}
                  <div className="flex items-center justify-between text-[12px] font-bold">
                    <span className="text-[#5B5B5B] flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-[#1B3D27]" />
                      <span>
                        {order.deliveryOption === 'cluster'
                          ? (language === 'te' ? 'కమ్యూనిటీ డ్రాప్ (₹20)' : 'Community drop (₹20)')
                          : (language === 'te' ? 'హోమ్ డెలివరీ (₹60)' : 'Home delivery (₹60)')}
                      </span>
                    </span>
                    <span className="text-[#1B3D27]">
                      {language === 'te' ? '24 గంటల్లో చేరుతుంది' : 'Expected: within 24h'}
                    </span>
                  </div>

                  {/* 4-Step Icon Stepper */}
                  <div className="py-1">
                    <StepIndicator
                      steps={orderSteps}
                      currentStepIndex={currentStepIdx}
                    />
                  </div>

                  {/* Two-Way Handshake OTP (Ready State) */}
                  {order.status === 'Ready' && (
                    <div className="p-3.5 bg-[#FFF4D6] rounded-xl border border-[#F5B800] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-black text-[#1A1A1A] text-[13px]">
                          <KeyRound className="w-4 h-4 text-[#5C4300]" />
                          <span>{language === 'te' ? 'డెలివరీ నిర్ధారణ కోడ్ (OTP):' : 'Delivery Handover OTP:'}</span>
                        </div>
                        <span className="font-mono text-[18px] font-black px-3 py-0.5 bg-white rounded-lg border border-[#F5B800] text-[#1B3D27] tracking-widest shadow-2xs">
                          {order.deliveryOtp || '4829'}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#5C4300] leading-relaxed">
                        {language === 'te'
                          ? 'పంట మీకు అందినప్పుడు ఈ 4-అంకెల కోడ్‌ను రైతుకు చెప్పండి, లేదా కింద బటన్ నొక్కి నిర్ధారించండి.'
                          : 'Share this 4-digit code with the farmer upon delivery, or tap below to confirm receipt.'}
                      </p>

                      {onConfirmDelivery && (
                        <Button
                          variant="primary"
                          onClick={() => onConfirmDelivery(order.id)}
                          className="w-full min-h-[48px] text-[14px]"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1.5" />
                          <span>{language === 'te' ? 'పంట అందింది - డెలివరీ నిర్ధారించండి' : 'Confirm Delivery Received'}</span>
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Farmer Direct Contact Buttons */}
                  <div className="pt-2 border-t border-[#E2DDCF] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <a
                        href="tel:+919876543210"
                        className="min-h-[44px] px-3.5 rounded-xl border border-[#E2DDCF] bg-stone-50 hover:bg-stone-100 text-[#1A1A1A] text-[13px] font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#1B3D27]" />
                        <span>{language === 'te' ? 'రైతుకు కాల్' : 'Call Farmer'}</span>
                      </a>
                      <a
                        href="https://wa.me/919876543210"
                        target="_blank"
                        rel="noreferrer"
                        className="min-h-[44px] px-3.5 rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] text-[13px] font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    </div>

                    {order.status === 'Completed' && (
                      <div>
                        {order.rated ? (
                          <span className="text-[12px] font-black text-[#1E7B3F] flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            <span>{language === 'te' ? 'రేటింగ్ ఇచ్చారు ✓' : 'Rated ✓'}</span>
                          </span>
                        ) : (
                          <Button
                            variant="mic"
                            onClick={() => handleOpenRating(order)}
                            className="min-h-[44px] px-3.5 text-[13px]"
                          >
                            <Star className="w-3.5 h-3.5 mr-1" />
                            <span>{language === 'te' ? 'రేటింగ్ ఇవ్వండి' : 'Rate Farmer'}</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* RATING & REVIEW SUB-MODAL */}
      {ratingOrder && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#E2DDCF] text-center space-y-4 animate-in fade-in zoom-in-95">
            {ratingSubmitted ? (
              <div className="py-6 space-y-3">
                <div className="w-14 h-14 bg-[#E6F2EA] text-[#1E7B3F] rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-[18px] font-black text-[#1A1A1A]">
                  {language === 'te' ? 'మీ సమీక్షకు ధన్యవాదాలు!' : 'Thank you for your rating!'}
                </h3>
                <p className="text-[13px] text-[#5B5B5B]">
                  {language === 'te'
                    ? 'మీ సమీక్ష రైతు ప్రొఫైల్ మరియు మార్కెట్‌లో ప్రచురించబడింది.'
                    : 'Your review was published to the farmer passport.'}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between pb-2 border-b border-[#E2DDCF]">
                  <h3 className="text-[15px] font-black text-[#1A1A1A]">
                    {language === 'te' ? `${ratingOrder.farmerName} గారికి రేటింగ్:` : `Rate ${ratingOrder.farmerName}`}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setRatingOrder(null)}
                    className="text-[#5B5B5B] hover:text-[#1A1A1A] cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-[13px] text-[#5B5B5B]">
                  {language === 'te'
                    ? 'పంట నాణ్యత మరియు డెలివరీ ఎలా ఉంది?'
                    : 'How was produce freshness and farmer service?'}
                </p>

                {/* 5-Star Selector */}
                <div className="flex items-center justify-center gap-2 py-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSelectedStars(star)}
                      className="p-1.5 hover:scale-125 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= selectedStars
                            ? 'fill-[#F5B800] text-[#F5B800]'
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
                  placeholder={
                    language === 'te'
                      ? 'పంట తాజాదనం గురించి మీ అనుభవాన్ని రాయండి...'
                      : 'Write a note about produce quality & taste...'
                  }
                  rows={3}
                  className="w-full p-3 text-[14px] border border-[#E2DDCF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3D27] text-[#1A1A1A]"
                />

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="secondary"
                    onClick={() => setRatingOrder(null)}
                    className="flex-1 min-h-[48px] text-[14px]"
                  >
                    <span>{language === 'te' ? 'రద్దు' : 'Cancel'}</span>
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSubmitReview}
                    className="flex-1 min-h-[48px] text-[14px]"
                  >
                    <span>{language === 'te' ? 'సమర్పించండి' : 'Submit Review'}</span>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
