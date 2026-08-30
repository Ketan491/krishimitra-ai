export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

export function isValidMobile(value: string): boolean {
  return typeof value === 'string' && INDIAN_MOBILE_REGEX.test(value.trim());
}

export function isValidPassword(value: string): boolean {
  return typeof value === 'string' && value.length >= 4 && value.length <= 72;
}

export function isValidRating(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

export function isPositiveNumber(value: string | number): boolean {
  const n = Number(value);
  return typeof value !== 'undefined' && value !== '' && !Number.isNaN(n) && n > 0;
}

export interface ValidationResult {
  valid: boolean;
  field?: string;
  message?: string;
}

export interface CustomerForm {
  name: string;
  mobile: string;
  password: string;
  address?: string;
  pincode?: string;
}

export interface FarmerForm extends CustomerForm {
  location?: string;
  soilType?: string;
  landSize?: string;
  irrigationType?: string;
}

export function validateCustomerForm(form: CustomerForm): ValidationResult {
  if (form.name.trim().length < 2) {
    return { valid: false, field: 'name', message: 'Please enter your full name (at least 2 letters).' };
  }
  if (!isValidMobile(form.mobile)) {
    return { valid: false, field: 'mobile', message: 'Enter a valid 10-digit mobile number starting with 6–9.' };
  }
  if (!isValidPassword(form.password)) {
    return { valid: false, field: 'password', message: 'Password must be between 4 and 72 characters.' };
  }
  return { valid: true };
}

export function validateFarmerForm(form: FarmerForm): ValidationResult {
  const base = validateCustomerForm(form);
  if (!base.valid) return base;
  if (form.landSize !== undefined && form.landSize !== '' && !isPositiveNumber(form.landSize)) {
    return { valid: false, field: 'landSize', message: 'Land size must be a positive number.' };
  }
  return { valid: true };
}

export function validateAddressForm(form: { fullAddress: string; pincode?: string; label?: string }): ValidationResult {
  if (form.fullAddress.trim().length < 5) {
    return { valid: false, field: 'fullAddress', message: 'Enter a valid full address (at least 5 characters).' };
  }
  if (form.pincode && !/^\d{6}$/.test(form.pincode.trim())) {
    return { valid: false, field: 'pincode', message: 'Enter a valid 6-digit pincode.' };
  }
  return { valid: true };
}

export function validateProductForm(form: {
  cropName: string;
  price: string;
  quantity: string;
  unit?: string;
  compareToPrice?: string;
}): ValidationResult {
  if (form.cropName.trim().length < 2) {
    return { valid: false, field: 'cropName', message: 'Enter a valid crop name.' };
  }
  if (!isPositiveNumber(form.price)) {
    return { valid: false, field: 'price', message: 'Price must be a positive number.' };
  }
  if (!isPositiveNumber(form.quantity)) {
    return { valid: false, field: 'quantity', message: 'Quantity must be a positive number.' };
  }
  const mrp = (form.compareToPrice || '').trim();
  if (mrp !== '') {
    if (!isPositiveNumber(mrp)) {
      return { valid: false, field: 'compareToPrice', message: 'MRP must be a positive number.' };
    }
    if (Number(mrp) <= Number(form.price)) {
      return { valid: false, field: 'compareToPrice', message: 'MRP must be higher than the selling price.' };
    }
  }
  return { valid: true };
}
