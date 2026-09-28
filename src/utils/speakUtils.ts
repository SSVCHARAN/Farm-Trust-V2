/**
 * Helper utility to speak order details aloud in Telugu or English
 * Designed for low-literacy farmers.
 * Delegates to TTSService for natural voice selection, asynchronous voices loading,
 * and conversational cadence.
 */

import { TTSService } from '../services/ttsService';

const TELUGU_CUSTOMER_NAMES: Record<string, string> = {
  'Ananya Sharma': 'అనన్య శర్మ',
  'K. Suresh Reddy': 'సురేష్ రెడ్డి',
  'Suresh Reddy': 'సురేష్ రెడ్డి',
  'Suresh Varma': 'సురేష్ వర్మ',
  'Deepa Varma': 'దీపా వర్మ',
  'Venkatesh Babu': 'వెంకటేష్ బాబు',
  'Sravani P.': 'శ్రావణి పి',
};

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
  TTSService.unlockAudio();
  let text = '';
  if (language === 'te') {
    const customer = TELUGU_CUSTOMER_NAMES[order.customerName] || order.customerName;
    const prod = order.productTeluguName || order.productName;
    text = `${customer} నుండి ఆర్డర్. ${order.quantity} ${order.unit === 'kg' ? 'కిలోల' : order.unit} ${prod}. మీకు అందే మొత్తం ${order.totalPrice} రూపాయలు.`;
  } else {
    text = `Order from ${order.customerName}. ${order.quantity} ${order.unit} of ${order.productName}. You receive ${order.totalPrice} rupees.`;
  }

  TTSService.speak(text, language === 'te' ? 'te-IN' : 'en-IN');
}
