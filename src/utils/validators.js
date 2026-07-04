export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone) {
  return /^[+]?[\d\s()-]{7,20}$/.test(phone);
}

export function validatePrice(price) {
  const num = Number(price);
  return !Number.isNaN(num) && num > 0 && num < 9999999;
}

export function validateRating(rating) {
  const num = Number(rating);
  return Number.isInteger(num) && num >= 1 && num <= 5;
}
