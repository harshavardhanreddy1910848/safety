/**
 * Device Native SMS and WhatsApp Dispatch Utilities
 * 100% Free - Triggers the phone's native Messaging / SMS application via URI
 */

export interface EmergencyMessageParams {
  userName?: string;
  alertType?: string;
  lat?: number | null;
  lng?: number | null;
  alertId?: string;
  customTemplate?: string;
}

/**
 * Builds the emergency distress message text
 */
export function buildNativeEmergencyText(params: EmergencyMessageParams): string {
  const name = params.userName || 'Someone';
  const type = params.alertType || 'Emergency';
  const time = new Date().toLocaleTimeString();
  
  let mapsLink = '';
  if (params.lat && params.lng) {
    mapsLink = `https://maps.google.com/?q=${params.lat},${params.lng}`;
  }

  let broadcastLink = '';
  if (params.alertId && typeof window !== 'undefined') {
    broadcastLink = `${window.location.origin}/receiver/${params.alertId}`;
  }

  return `🚨 EMERGENCY SOS ALERT — SilentSOS 🚨\nFrom: ${name}\nAlert Type: ${type} Warning\nTime: ${time}\n\n📍 Live GPS Location:\n${mapsLink || 'Location unavailable'}\n\n🔗 Live Responder Dashboard:\n${broadcastLink || 'https://maps.google.com'}\n\n⚠️ Please respond immediately or dispatch emergency services!`;
}

/**
 * Returns native device SMS URI compatible with Android, iOS, and Web
 */
export function getNativeSmsUri(phoneNumbers: string | string[], message: string): string {
  const encodedBody = encodeURIComponent(message);
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  const numbers = Array.isArray(phoneNumbers) ? phoneNumbers.filter(Boolean) : [phoneNumbers].filter(Boolean);
  const cleanNumbers = numbers.map(n => n.replace(/\s+/g, ''));
  
  if (cleanNumbers.length === 0) {
    return isIOS ? `sms:&body=${encodedBody}` : `sms:?body=${encodedBody}`;
  }

  if (cleanNumbers.length === 1) {
    return `sms:${cleanNumbers[0]}${isIOS ? '&' : '?'}body=${encodedBody}`;
  }

  // Multi-recipient SMS
  // iOS uses comma separator and '&body='
  // Android uses semicolon separator and '?body='
  if (isIOS) {
    return `sms:${cleanNumbers.join(',')}&body=${encodedBody}`;
  }
  return `sms:${cleanNumbers.join(';')}?body=${encodedBody}`;
}

/**
 * Returns WhatsApp direct message link
 */
export function getWhatsAppDirectUri(phoneNumber: string, message: string): string {
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  const encodedBody = encodeURIComponent(message);
  if (!cleanNumber) {
    return `https://api.whatsapp.com/send?text=${encodedBody}`;
  }
  return `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${encodedBody}`;
}
