// src/string.ts
function generateHandle(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim().replace(/^-+|-+$/g, "");
}
var slugify = generateHandle;
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
function capitalizeWords(str) {
  return str.split(" ").map(capitalize).join(" ");
}
function truncate(str, length, suffix = "...") {
  if (str.length <= length) return str;
  return str.slice(0, length - suffix.length) + suffix;
}
function cleanWhitespace(str) {
  return str.trim().replace(/\s+/g, " ");
}
function isBlank(str) {
  return !str || str.trim().length === 0;
}
function randomString(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
function toCamelCase(str) {
  return str.replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase()).replace(/^[A-Z]/, (chr) => chr.toLowerCase());
}
function toPascalCase(str) {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

// src/formatting.ts
function formatCurrency(amount, currency = "USD", locale = "en-US") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency
  }).format(amount);
}
function formatNumber(num, locale = "en-US", options) {
  return new Intl.NumberFormat(locale, options).format(num);
}
function formatDate(date, locale = "en-US", options) {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(d);
}
function formatRelativeTime(date) {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  const now = /* @__PURE__ */ new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1e3);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 30) {
    return formatDate(d, "en-US", { month: "short", day: "numeric", year: "numeric" });
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  } else if (diffMins > 0) {
    return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  } else {
    return "just now";
  }
}
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
function formatPercentage(value, decimals = 0, includeSign = true) {
  const formatted = (value * 100).toFixed(decimals);
  return includeSign ? `${formatted}%` : formatted;
}
function formatPhoneNumber(phone) {
  const cleaned = phone.replace(/\D/g, "");
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return "(" + match[1] + ") " + match[2] + "-" + match[3];
  }
  return phone;
}
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1e3);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// src/index.ts
function debounce(func, wait) {
  let timeout = null;
  return function debounced(...args) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
function throttle(func, limit) {
  let inThrottle = false;
  return function throttled(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map((item) => deepClone(item));
  if (obj instanceof Object) {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
}
function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a === "object") {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
}
function groupBy(array, key) {
  return array.reduce((groups, item) => {
    const groupKey = typeof key === "function" ? key(item) : String(item[key]);
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(item);
    return groups;
  }, {});
}
function unique(array, key) {
  if (!key) {
    return [...new Set(array)];
  }
  const seen = /* @__PURE__ */ new Set();
  return array.filter((item) => {
    const k = typeof key === "function" ? key(item) : item[key];
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function retry(fn, options = {}) {
  const {
    attempts = 3,
    delay = 1e3,
    maxDelay = 3e4,
    factor = 2,
    onError
  } = options;
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (onError) onError(lastError, i + 1);
      if (i < attempts - 1) {
        const waitTime = Math.min(delay * Math.pow(factor, i), maxDelay);
        await sleep(waitTime);
      }
    }
  }
  throw lastError;
}
export {
  capitalize,
  capitalizeWords,
  cleanWhitespace,
  debounce,
  deepClone,
  deepEqual,
  formatBytes,
  formatCurrency,
  formatDate,
  formatDuration,
  formatNumber,
  formatPercentage,
  formatPhoneNumber,
  formatRelativeTime,
  generateHandle,
  groupBy,
  isBlank,
  randomString,
  retry,
  sleep,
  slugify,
  throttle,
  toCamelCase,
  toPascalCase,
  truncate,
  unique
};
