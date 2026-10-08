export const IRAQI_MOBILE_PATTERN = '07[578][0-9]{8}';
export const SUPPORT_PHONE_PATTERN = '(?:07[0-9]{9}|[0-9]{3,6}|[0-9]{7,11})';

const iraqiMobileRegex = new RegExp(`^${IRAQI_MOBILE_PATTERN}$`);
const supportPhoneRegex = new RegExp(`^${SUPPORT_PHONE_PATTERN}$`);

export function isValidIraqiMobile(phone: string): boolean {
  return iraqiMobileRegex.test(phone);
}

export function isValidSupportPhone(phone: string): boolean {
  return supportPhoneRegex.test(phone);
}
