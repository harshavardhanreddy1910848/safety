/**
 * Device Native SMS and WhatsApp Emergency Dispatch Utility
 * 100% Free - Requires No External Paid API Keys
 */

export interface EmergencyMessageParams {
  userName?: string;
  alertType?: string;
  lat?: number | null;
  lng?: number | null;
  alertId?: string;
  customTemplate?: string;
}

export function buildEmergencyText(params: EmergencyMessageParams): string {
  const name = params.userName || 'Someone';
  const type = params.alertType || 'Emergency';
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const lat = params.lat;
  const lng = params.lng;

  const mapsLink =
    lat !== null && lat !== undefined && lng !== null && lng !== undefined
      ? `https://maps.google.com/?q=${lat},${lng}`
      : 'Location tracking active';

  return `🚨 EMERGENCY ALERT — SilentSOS
From: ${name}
Type: ${type} Warning
Time: ${time}

📍 Live Google Maps Location:
${mapsLink}

⚠️ Please respond immediately or dispatch emergency assistance!`;
}

/**
 * Generates an OS-compatible SMS URI
 * Handles iOS (&body=) vs Android (?body=)
 */
export function getSmsUrl(phoneNumbers: string | string[], message: string): string {
  const isIOS =
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent || '');

  const phones = Array.isArray(phoneNumbers) ? phoneNumbers : [phoneNumbers];
  const cleanedPhones = phones
    .map((p) => p.replace(/[^\d+]/g, ''))
    .filter((p) => p.length > 0);

  const separator = isIOS ? '&' : '?';
  const phoneParam = cleanedPhones.join(isIOS ? ',' : ';');
  const encodedBody = encodeURIComponent(message);

  if (cleanedPhones.length === 0) {
    return `sms:${separator}body=${encodedBody}`;
  }

  return `sms:${phoneParam}${separator}body=${encodedBody}`;
}

/**
 * Generates a direct WhatsApp broadcast / chat URL
 */
export function getWhatsAppUrl(phone: string, message: string): string {
  const cleaned = phone.replace(/[^\d]/g, '');
  const encodedBody = encodeURIComponent(message);
  if (cleaned) {
    return `https://api.whatsapp.com/send?phone=${cleaned}&text=${encodedBody}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedBody}`;
}

/**
 * Triggers native SMS app on device
 */
export function launchNativeSms(phoneNumbers: string | string[], message: string) {
  const url = getSmsUrl(phoneNumbers, message);
  if (typeof window !== 'undefined') {
    window.location.href = url;
  }
}
