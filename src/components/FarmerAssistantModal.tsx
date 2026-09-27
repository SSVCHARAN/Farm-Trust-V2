import React from 'react';
import {
  Farmer,
  Product,
  Order,
  OrderStatus,
  CustomerRequest,
  FarmerOffer
} from '../types';
import { Language } from '../data/translations';
import { FarmerVoiceHub } from './FarmerVoiceHub';

interface FarmerAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmer: Farmer;
  products: Product[];
  orders: Order[];
  customerRequests?: CustomerRequest[];
  language: Language;
  onUpdateProductPrice: (productId: string, newPrice: number) => void;
  onUpdateProductStock?: (productId: string, quantity: number, mode: 'set' | 'add') => void;
  onUpdateOrderStatus?: (orderId: string, status: OrderStatus) => void;
  onSubmitFarmerOffer?: (requestId: string, offer: FarmerOffer) => void;
  onOpenPendingOrders: () => void;
  onOpenDemandBoard?: () => void;
}

export const FarmerAssistantModal: React.FC<FarmerAssistantModalProps> = ({
  isOpen,
  onClose,
  farmer,
  products,
  orders,
  customerRequests = [],
  language,
  onUpdateProductPrice,
  onUpdateProductStock,
  onUpdateOrderStatus,
  onSubmitFarmerOffer,
  onOpenPendingOrders,
  onOpenDemandBoard,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative bg-gradient-to-br from-[#12281a] via-[#183622] to-[#0c1a11] rounded-t-3xl sm:rounded-3xl max-w-2xl w-full shadow-2xl border-2 border-emerald-600/40 overflow-hidden animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[92vh] sm:max-h-[90vh] flex flex-col pb-safe sm:pb-0 text-white">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        {/* Mobile handle indicator */}
        <div className="sm:hidden pt-2.5 pb-1 bg-[#12281a] flex justify-center">
          <div className="w-12 h-1 bg-white/30 rounded-full"></div>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6 flex-1 relative z-10">
          <FarmerVoiceHub
            farmer={farmer}
            products={products}
            orders={orders}
            customerRequests={customerRequests}
            language={language}
            onUpdateProductPrice={onUpdateProductPrice}
            onUpdateProductStock={onUpdateProductStock}
            onUpdateOrderStatus={onUpdateOrderStatus}
            onSubmitFarmerOffer={onSubmitFarmerOffer}
            onNavigateTab={(tab) => {
              if (tab === 'orders') onOpenPendingOrders();
              else if (tab === 'demand') onOpenDemandBoard?.();
              onClose();
            }}
            isModalMode={true}
            onCloseModal={onClose}
          />
        </div>
      </div>
    </div>
  );
};
