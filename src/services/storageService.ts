import { Farmer, Product, Order, Review, OrderStatus, CustomerRequest, LocalDemandItem, FarmerOffer } from '../types';
import {
  INITIAL_FARMERS,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_REVIEWS,
  INITIAL_CUSTOMER_REQUESTS,
  INITIAL_LOCAL_DEMAND,
} from '../data/mockData';

const STORAGE_KEYS = {
  FARMERS: 'farmtrust_farmers_v2',
  PRODUCTS: 'farmtrust_products_v2',
  ORDERS: 'farmtrust_orders_v2',
  REVIEWS: 'farmtrust_reviews_v2',
  REQUESTS: 'farmtrust_requests_v2',
  DEMAND: 'farmtrust_demand_v2',
  ROLE: 'farmtrust_active_role_v2',
  LANG: 'farmtrust_lang_v2',
};

// Safe memory store for headless environments, private mode, and crash-proof persistence
const memoryStore = new Map<string, string>();

function safeGet(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = localStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch (e) {}
  return memoryStore.get(key) || null;
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, value);
    }
  } catch (e) {}
  memoryStore.set(key, value);
}

function safeRemove(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
    }
  } catch (e) {}
  memoryStore.delete(key);
}

export class StorageService {
  static getFarmers(): Farmer[] {
    try {
      const data = safeGet(STORAGE_KEYS.FARMERS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error(e);
    }
    this.saveFarmers(INITIAL_FARMERS);
    return INITIAL_FARMERS;
  }

  static saveFarmers(farmers: Farmer[]): void {
    safeSet(STORAGE_KEYS.FARMERS, JSON.stringify(farmers));
  }

  static addFarmer(farmer: Farmer): Farmer {
    const farmers = this.getFarmers();
    const existingIndex = farmers.findIndex((f) => f.id === farmer.id);
    let updated: Farmer[];
    if (existingIndex >= 0) {
      updated = [...farmers];
      updated[existingIndex] = farmer;
    } else {
      updated = [farmer, ...farmers];
    }
    this.saveFarmers(updated);
    return farmer;
  }

  static getFarmerById(id: string): Farmer | undefined {
    return this.getFarmers().find(f => f.id === id);
  }
  static getProducts(): Product[] {
    try {
      const data = safeGet(STORAGE_KEYS.PRODUCTS);
      if (data) {
        const parsed: Product[] = JSON.parse(data);
        const fixed = parsed.map((p) => {
          if (p.id === 'prod-7') {
            return {
              ...p,
              image: '/products/okra.svg',
            };
          }
          return p;
        });
        this.saveProducts(fixed);
        return fixed;
      }
    } catch (e) {
      console.error(e);
    }
    this.saveProducts(INITIAL_PRODUCTS);
    return INITIAL_PRODUCTS;
  }

  static saveProducts(products: Product[]): void {
    safeSet(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }

  static addProduct(product: Product): Product {
    const products = this.getProducts();
    const updated = [product, ...products];
    this.saveProducts(updated);
    return product;
  }

  static updateProductPrice(productId: string, newPrice: number): Product | null {
    const products = this.getProducts();
    let updatedProduct: Product | null = null;
    const updated = products.map((p) => {
      if (p.id === productId) {
        updatedProduct = { ...p, price: newPrice };
        return updatedProduct;
      }
      return p;
    });
    this.saveProducts(updated);
    return updatedProduct;
  }

  static updateProductStock(productId: string, quantity: number, mode: 'set' | 'add' = 'set'): Product | null {
    const products = this.getProducts();
    let updatedProduct: Product | null = null;
    const updated = products.map((p) => {
      if (p.id === productId) {
        const finalQty = mode === 'add' ? Math.max(0, p.availableQuantity + quantity) : Math.max(0, quantity);
        updatedProduct = { ...p, availableQuantity: finalQty };
        return updatedProduct;
      }
      return p;
    });
    this.saveProducts(updated);
    return updatedProduct;
  }

  static deleteProduct(productId: string): void {
    const products = this.getProducts().filter(p => p.id !== productId);
    this.saveProducts(products);
  }

  static getOrders(): Order[] {
    try {
      const data = safeGet(STORAGE_KEYS.ORDERS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error(e);
    }
    this.saveOrders(INITIAL_ORDERS);
    return INITIAL_ORDERS;
  }

  static saveOrders(orders: Order[]): void {
    safeSet(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }

  static addOrder(order: Order): Order {
    const orders = this.getOrders();
    const updated = [order, ...orders];
    this.saveOrders(updated);

    // Also deduct product stock
    const products = this.getProducts().map(p => {
      if (p.id === order.productId) {
        return {
          ...p,
          availableQuantity: Math.max(0, p.availableQuantity - order.quantity),
        };
      }
      return p;
    });
    this.saveProducts(products);

    return order;
  }

  static updateOrderStatus(orderId: string, status: OrderStatus, note?: string): Order | null {
    const orders = this.getOrders();
    let updatedOrder: Order | null = null;

    const updated = orders.map(ord => {
      if (ord.id === orderId) {
        const historyEntry = {
          status,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          note,
        };
        updatedOrder = {
          ...ord,
          status,
          statusHistory: [...ord.statusHistory, historyEntry],
        };
        return updatedOrder;
      }
      return ord;
    });

    this.saveOrders(updated);
    return updatedOrder;
  }

  static markOrderRated(orderId: string): void {
    const orders = this.getOrders().map(o => (o.id === orderId ? { ...o, rated: true } : o));
    this.saveOrders(orders);
  }

  static getReviews(): Review[] {
    try {
      const data = safeGet(STORAGE_KEYS.REVIEWS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error(e);
    }
    this.saveReviews(INITIAL_REVIEWS);
    return INITIAL_REVIEWS;
  }

  static saveReviews(reviews: Review[]): void {
    safeSet(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
  }

  static addReview(review: Review): Review {
    const reviews = this.getReviews();
    const updated = [review, ...reviews];
    this.saveReviews(updated);

    // Recalculate farmer rating
    const farmerReviews = updated.filter(r => r.farmerId === review.farmerId);
    const avg = farmerReviews.reduce((sum, r) => sum + r.rating, 0) / farmerReviews.length;
    const rounded = Math.round(avg * 10) / 10;

    const farmers = this.getFarmers().map(f => {
      if (f.id === review.farmerId) {
        return {
          ...f,
          rating: rounded,
          reviewCount: farmerReviews.length,
        };
      }
      return f;
    });
    this.saveFarmers(farmers);

    // Update product cards farmer rating
    const products = this.getProducts().map(p => {
      if (p.farmerId === review.farmerId) {
        return { ...p, farmerRating: rounded };
      }
      return p;
    });
    this.saveProducts(products);

    if (review.orderId) {
      this.markOrderRated(review.orderId);
    }

    return review;
  }

  // Customer Requests (Feature 5)
  static getCustomerRequests(): CustomerRequest[] {
    try {
      const data = safeGet(STORAGE_KEYS.REQUESTS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error(e);
    }
    this.saveCustomerRequests(INITIAL_CUSTOMER_REQUESTS as CustomerRequest[]);
    return INITIAL_CUSTOMER_REQUESTS as CustomerRequest[];
  }

  static saveCustomerRequests(requests: CustomerRequest[]): void {
    safeSet(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));
  }

  static addCustomerRequest(request: CustomerRequest): CustomerRequest {
    const current = this.getCustomerRequests();
    const updated = [request, ...current];
    this.saveCustomerRequests(updated);

    // Update local demand counts
    this.recordCustomerRequestInDemand(request);
    return request;
  }

  static updateCustomerRequestStatus(requestId: string, status: 'OPEN' | 'OFFERED' | 'FULFILLED', farmerId?: string, farmerName?: string): void {
    const requests = this.getCustomerRequests().map((r) => {
      if (r.id === requestId) {
        return {
          ...r,
          status,
          offeredByFarmerId: farmerId || r.offeredByFarmerId,
          offeredByFarmerName: farmerName || r.offeredByFarmerName,
        };
      }
      return r;
    });
    this.saveCustomerRequests(requests);
  }

  static submitFarmerOffer(requestId: string, offer: FarmerOffer): CustomerRequest | null {
    const requests = this.getCustomerRequests();
    let updatedReq: CustomerRequest | null = null;
    const updated = requests.map((r) => {
      if (r.id === requestId) {
        const existingOffers = r.offers || [];
        updatedReq = {
          ...r,
          status: 'OFFERED',
          offeredByFarmerId: offer.farmerId,
          offeredByFarmerName: offer.farmerName,
          offers: [offer, ...existingOffers.filter(o => o.id !== offer.id)],
        };
        return updatedReq;
      }
      return r;
    });
    this.saveCustomerRequests(updated);
    return updatedReq;
  }

  static acceptFarmerOffer(requestId: string, offerId: string): Order | null {
    const requests = this.getCustomerRequests();
    const req = requests.find((r) => r.id === requestId);
    if (!req || !req.offers) return null;

    const offer = req.offers.find((o) => o.id === offerId);
    if (!offer) return null;

    // Deduct stock if matching product exists
    if (offer.productId) {
      this.updateProductStock(offer.productId, offer.offeredQuantity, 'set');
    }

    // Create Order
    const newOrder: Order = {
      id: `FT-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: req.customerId,
      customerName: req.customerName,
      customerPhone: req.customerPhone || '+91 98499 77881',
      deliveryAddress: req.location,
      farmerId: offer.farmerId,
      farmerName: offer.farmerName,
      farmerLocation: offer.farmerLocation,
      productId: offer.productId || 'prod-1',
      productName: offer.productName,
      productTeluguName: offer.productTeluguName || offer.productName,
      productImage: '/products/tomatoes.svg',
      quantity: offer.offeredQuantity,
      unit: offer.unit,
      unitPrice: offer.unitPrice,
      totalPrice: offer.totalPrice,
      paymentMethod: 'UPI',
      paymentStatus: 'Paid (Simulated)',
      status: 'Accepted by Farmer',
      statusHistory: [
        { status: 'Order Placed', timestamp: 'Just now', note: `Created from 1-Click Offer on Request #${req.id}` },
        { status: 'Accepted by Farmer', timestamp: 'Just now', note: 'Farmer accepted offer.' },
      ],
      createdAt: new Date().toISOString(),
      deliveryOtp: Math.floor(1000 + Math.random() * 9000).toString(),
      deliveryOption: 'express',
      deliveryFee: 0,
      rated: false,
    };

    this.addOrder(newOrder);

    // Mark Request Fulfilled
    const updatedRequests = requests.map((r) => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'FULFILLED' as const,
          offers: (r.offers || []).map((o) => (o.id === offerId ? { ...o, status: 'ACCEPTED' as const } : o)),
        };
      }
      return r;
    });
    this.saveCustomerRequests(updatedRequests);

    return newOrder;
  }

  // Local Demand Insights (Feature 6)
  static getLocalDemand(): LocalDemandItem[] {
    try {
      const data = safeGet(STORAGE_KEYS.DEMAND);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error(e);
    }
    this.saveLocalDemand(INITIAL_LOCAL_DEMAND as LocalDemandItem[]);
    return INITIAL_LOCAL_DEMAND as LocalDemandItem[];
  }

  static saveLocalDemand(items: LocalDemandItem[]): void {
    safeSet(STORAGE_KEYS.DEMAND, JSON.stringify(items));
  }

  static recordCustomerSearch(searchTerm: string): void {
    const term = searchTerm.toLowerCase();
    const demand = this.getLocalDemand();
    let found = false;

    const updated = demand.map((d) => {
      if (d.product.toLowerCase().includes(term) || term.includes(d.product.toLowerCase().split(' ')[0])) {
        found = true;
        return {
          ...d,
          searchCount: d.searchCount + 1,
          urgency: (d.searchCount + 1 > 8 ? 'High interest' : 'Growing interest') as any,
          recentRequestNote: `${d.searchCount + 1} families searched recently for this produce.`,
        };
      }
      return d;
    });

    if (!found && searchTerm.length > 2) {
      updated.push({
        id: `dem-${Date.now()}`,
        product: searchTerm,
        productTelugu: searchTerm,
        searchCount: 1,
        activeRequests: 0,
        urgency: 'Growing interest',
        urgencyTelugu: 'కొత్త డిమాండ్',
        recentRequestNote: '1 new family search recorded today.',
        recentRequestNoteTelugu: 'ఈ రోజు నమోదైన కొత్త శోధన.',
      });
    }

    this.saveLocalDemand(updated);
  }

  private static recordCustomerRequestInDemand(req: CustomerRequest): void {
    const demand = this.getLocalDemand();
    const prodName = req.product.toLowerCase();
    let matched = false;

    const updated = demand.map((d) => {
      if (d.product.toLowerCase().includes(prodName) || prodName.includes(d.product.toLowerCase().split(' ')[0])) {
        matched = true;
        return {
          ...d,
          activeRequests: d.activeRequests + 1,
          urgency: 'High interest' as const,
          recentRequestNote: `${d.searchCount} searches · ${d.activeRequests + 1} active requests in Visakhapatnam area.`,
        };
      }
      return d;
    });

    if (!matched) {
      updated.unshift({
        id: `dem-${Date.now()}`,
        product: req.product,
        productTelugu: req.productTelugu || req.product,
        searchCount: 3,
        activeRequests: 1,
        urgency: 'Active demand',
        urgencyTelugu: 'కొత్త రిక్వెస్ట్',
        recentRequestNote: `1 active customer request for ${req.quantity} ${req.unit} (${req.neededBy}).`,
      });
    }

    this.saveLocalDemand(updated);
  }

  static resetDemo(): void {
    safeRemove(STORAGE_KEYS.FARMERS);
    safeRemove(STORAGE_KEYS.PRODUCTS);
    safeRemove(STORAGE_KEYS.ORDERS);
    safeRemove(STORAGE_KEYS.REVIEWS);
    safeRemove(STORAGE_KEYS.REQUESTS);
    safeRemove(STORAGE_KEYS.DEMAND);
    this.saveFarmers(INITIAL_FARMERS);
    this.saveProducts(INITIAL_PRODUCTS);
    this.saveOrders(INITIAL_ORDERS);
    this.saveReviews(INITIAL_REVIEWS);
    this.saveCustomerRequests(INITIAL_CUSTOMER_REQUESTS as CustomerRequest[]);
    this.saveLocalDemand(INITIAL_LOCAL_DEMAND as LocalDemandItem[]);
  }
}

