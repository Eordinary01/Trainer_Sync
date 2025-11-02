export const validateEmail = (email) => {
  const regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return regex.test(email);
};

export const validatePassword = (password) => {
  return {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*]/.test(password),
  };
};

// Additional validation utilities you might find useful
export const validateUsername = (username) => {
  return {
    minLength: username.length >= 3,
    maxLength: username.length <= 50,
    hasValidChars: /^[a-zA-Z0-9_-]+$/.test(username),
  };
};

export const validatePhone = (phone) => {
  const regex = /^\+?[\d\s-()]{10,}$/;
  return regex.test(phone);
};