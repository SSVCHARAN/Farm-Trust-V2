/**
 * Helper utility to speak order details aloud in Telugu or English
 * Designed for low-literacy farmers.
 */

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
) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  window.speechSynthesis.cancel(); // Cancel any ongoing speech

  let text = '';
  if (language === 'te') {
    const prod = order.productTeluguName || order.productName;
    text = `${order.customerName} నుండి ఆర్డర్. ${order.quantity} ${order.unit === 'kg' ? 'కిలోల' : order.unit} ${prod}. మీకు అందే మొత్తం ${order.totalPrice} రూపాయలు.`;
  } else {
    text = `Order from ${order.customerName}. ${order.quantity} ${order.unit} of ${order.productName}. You receive ${order.totalPrice} rupees.`;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === 'te' ? 'te-IN' : 'en-IN';
  utterance.rate = 0.9; // Slightly slower, calm cadence for easy comprehension

  // Attempt to select an Indian English/Telugu voice if available
  const voices = window.speechSynthesis.getVoices();
  const targetVoice = voices.find(
    (v) => (language === 'te' && v.lang.includes('te')) || (language === 'en' && v.lang.includes('IN'))
  );
  if (targetVoice) utterance.voice = targetVoice;

  window.speechSynthesis.speak(utterance);
}
