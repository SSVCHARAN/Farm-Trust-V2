/**
 * Helper utility to speak order details aloud in Telugu or English
 * Designed for low-literacy farmers.
 * Delegates to TTSService for natural voice selection, asynchronous voices loading,
 * and conversational cadence.
 */

import { TTSService } from '../services/ttsService';

export function speakOrderAloud(
  order: {
    customerName: string;
    productName: string;
    productTeluguName?: string;
    quantity: number;
    unit: string;
    totalPrice: number;
  },
  language: 'te' | 'en'
): void {
  let text = '';
  if (language === 'te') {
    const prod = order.productTeluguName || order.productName;
    text = `${order.customerName} నుండి ఆర్డర్. ${order.quantity} ${order.unit === 'kg' ? 'కిలోల' : order.unit} ${prod}. మీకు అందే మొత్తం ${order.totalPrice} రూపాయలు.`;
  } else {
    text = `Order from ${order.customerName}. ${order.quantity} ${order.unit} of ${order.productName}. You receive ${order.totalPrice} rupees.`;
  }

  TTSService.speak(text, language === 'te' ? 'te-IN' : 'en-IN');
}
