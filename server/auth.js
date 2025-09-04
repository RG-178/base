const VALID_KEYS = ["XwGs1uLqusYK45g989geB41DsxW0HYUg"];
const PUBLIC_KEYS = ["n01M15WW5qvzDVumZn0XUDpogiWcF0Rn"];

function isValidKey(key) {
  return VALID_KEYS.includes(key);
}

function isValidPublicKey(key) {
    return PUBLIC_KEYS.includes(key);
}

module.exports = { isValidKey, isValidPublicKey };