export type UserRole = 'FARMER' | 'CUSTOMER';

export type ProductCategory = 'Vegetables' | 'Fruits' | 'Grains' | 'Dairy' | 'Organic';

export type OrderStatus =
  | 'Order Placed'
  | 'Accepted by Farmer'
  | 'Preparing'
  | 'Ready'
  | 'Completed'
  | 'Rejected';

export interface Farmer {
  id: string;
  name: string;
  teluguName: string;
  farmName: string;
  farmNameTelugu: string;
  location: string;
  district: string;
  state: string;
  avatar: string;
  phone: string;
  rating: number;
  reviewCount: number;
  identityVerified: boolean;
  communityRated: boolean;
  organicCertified: boolean;
  bio: string;
  bioTelugu: string;
  experienceYears: number;
  acres: number;
  joinedYear: string;
  orderCompletionRate?: number; // e.g. 98%
  totalCompletedOrders: number;
  verifiedBadges: {
    id: string;
    label: string;
    labelTelugu: string;
    description: string;
    verified: boolean;
  }[];
}

export interface Product {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerLocation: string;
  farmerRating: number;
  farmerAvatar: string;
  farmerVerified: boolean;
  name: string;
  teluguName: string;
  category: ProductCategory;
  price: number; // In INR
  unit: string; // e.g. "kg", "liters", "bunches"
  priceUnit: string; // e.g. "kg", "liter"
  availableQuantity: number;
  image: string;
  description: string;
  descriptionTelugu?: string;
  harvestDate: string;
  organicClaim: boolean;
  organicDetails?: string;
  trustStatus: 'verified' | 'review_recommended' | 'standard' | 'potentially_exaggerated';
  claimClassification?: 'NORMAL CLAIM' | 'REVIEW RECOMMENDED' | 'POTENTIALLY EXAGGERATED';
  trustNote: string;
  createdAt: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productTeluguName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string; // e.g. "FT-1024"
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  farmerId: string;
  farmerName: string;
  farmerLocation: string;
  productId: string;
  productName: string;
  productTeluguName: string;
  productImage: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  paymentMethod: 'UPI' | 'Card' | 'Cash on Delivery';
  paymentStatus: 'Paid (Simulated)' | 'Pending Cash on Delivery';
  status: OrderStatus;
  statusHistory: {
    status: OrderStatus;
    timestamp: string;
    note?: string;
  }[];
  createdAt: string;
  deliveryOption?: 'cluster' | 'express';
  deliveryFee?: number;
  deliveryOtp?: string;
  rated?: boolean;
}

export interface Review {
  id: string;
  orderId: string;
  farmerId: string;
  productId?: string;
  productName?: string;
  customerName: string;
  rating: number; // 1-5
  comment: string;
  date: string;
  verifiedPurchase: boolean;
}

export interface VoiceExtractionResult {
  productName: string;
  productNameTelugu?: string;
  category: ProductCategory;
  quantity: number | null;
  unit: string;
  price: number | null;
  priceUnit: string;
  description: string;
  organicClaim: boolean;
  organicDetails?: string;
  missingFields: string[];
  trustScreening: {
    status: 'verified' | 'flagged' | 'standard';
    claimClassification?: 'NORMAL CLAIM' | 'REVIEW RECOMMENDED' | 'POTENTIALLY EXAGGERATED';
    note: string;
  };
}

export interface CustomerVoiceSearchIntent {
  product: string;
  productTelugu?: string;
  quantity: number | null;
  unit: string;
  maxPrice: number | null;
  category?: ProductCategory | 'All';
  organicOnly?: boolean;
  interpretation: string;
  interpretationTelugu: string;
  rawQuery: string;
}

export type FarmerActionType =
  | 'NONE'
  | 'VOICE_ONBOARDING'
  | 'SET_STOCK'
  | 'ADD_STOCK'
  | 'MARK_OUT_OF_STOCK'
  | 'UPDATE_PRICE'
  | 'VIEW_PENDING_ORDERS'
  | 'VIEW_SPECIFIC_ORDER'
  | 'UPDATE_ORDER_STATUS'
  | 'VIEW_INVENTORY_SUMMARY'
  | 'VIEW_EARNINGS_SUMMARY'
  | 'MAKE_REQUEST_OFFER';

export interface FarmerOnboardingData {
  farmerName: string;
  farmerTeluguName: string;
  location: string;
  district: string;
  state: string;
  acres: number;
  crops: string[];
  cropsTelugu: string[];
  farmName: string;
  farmNameTelugu: string;
  phone?: string;
  experienceYears?: number;
}

export interface FarmerAssistantAction {
  actionType: FarmerActionType;
  message: string;
  messageTelugu?: string;
  confirmationRequired: boolean;
  payload?: {
    // Inventory & Price
    productId?: string;
    productName?: string;
    productTeluguName?: string;
    oldPrice?: number;
    newPrice?: number;
    quantity?: number;
    deltaQuantity?: number;
    unit?: string;
    // Orders
    orderId?: string;
    customerName?: string;
    currentStatus?: OrderStatus;
    targetStatus?: OrderStatus;
    statusNote?: string;
    // Onboarding
    onboarding?: FarmerOnboardingData;
    // Request & Offers
    requestId?: string;
    offerUnitPrice?: number;
    offerQuantity?: number;
    offerTotalPrice?: number;
    deliveryPromise?: string;
    deliveryPromiseTelugu?: string;
    // Confirmation & Spoken Execution feedback
    executedMessage?: string;
    executedMessageTelugu?: string;
  };
}

export interface FarmerOffer {
  id: string;
  requestId: string;
  farmerId: string;
  farmerName: string;
  farmerTeluguName?: string;
  farmerLocation: string;
  farmerRating: number;
  farmerAvatar: string;
  productId?: string;
  productName: string;
  productTeluguName?: string;
  offeredQuantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  deliveryPromise: string;
  deliveryPromiseTelugu?: string;
  notes?: string;
  notesTelugu?: string;
  createdAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
}

export interface CustomerRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  product: string;
  productTelugu?: string;
  quantity: number;
  unit: string;
  neededBy: string; // e.g. "Tomorrow", "ఈ రోజు సాయంత్రం"
  neededByTelugu?: string;
  maxBudget?: number;
  location: string;
  notes?: string;
  notesTelugu?: string;
  status: 'OPEN' | 'OFFERED' | 'FULFILLED';
  createdAt: string;
  offers?: FarmerOffer[];
  matchedFarmerIds?: string[];
  offeredByFarmerId?: string;
  offeredByFarmerName?: string;
}

export interface TTSAudioState {
  isPlaying: boolean;
  isPaused: boolean;
  currentText: string;
  currentLanguage: 'te-IN' | 'en-IN';
  supported: boolean;
}

export interface LocalDemandItem {
  id: string;
  product: string;
  productTelugu: string;
  searchCount: number;
  activeRequests: number;
  urgency: 'High interest' | 'Growing interest' | 'Active demand';
  urgencyTelugu: string;
  recentRequestNote?: string;
  recentRequestNoteTelugu?: string;
}


