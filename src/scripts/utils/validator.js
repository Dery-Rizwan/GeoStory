class Validator {
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) {
      return { isValid: false, message: 'Email is required' };
    }
    
    if (!emailRegex.test(email)) {
      return { isValid: false, message: 'Please enter a valid email address' };
    }
    
    return { isValid: true, message: '' };
  }

  static validatePassword(password) {
    if (!password) {
      return { isValid: false, message: 'Password is required' };
    }
    
    if (password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters' };
    }
    
    return { isValid: true, message: '' };
  }

  static validateName(name) {
    if (!name) {
      return { isValid: false, message: 'Name is required' };
    }
    
    if (name.length < 3) {
      return { isValid: false, message: 'Name must be at least 3 characters' };
    }
    
    return { isValid: true, message: '' };
  }

  static validateDescription(description) {
    if (!description) {
      return { isValid: false, message: 'Description is required' };
    }
    
    return { isValid: true, message: '' };
  }

  static validateFile(file, maxSizeMB = 5) {
    if (!file) {
      return { isValid: false, message: 'Photo is required' };
    }
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      return { isValid: false, message: 'Only JPG, JPEG, and PNG files are allowed' };
    }
    
    const maxSize = maxSizeMB * 1024 * 1024; // Convert to bytes
    if (file.size > maxSize) {
      return { isValid: false, message: `File size must be less than ${maxSizeMB}MB` };
    }
    
    return { isValid: true, message: '' };
  }

  static validateCoordinates(lat, lon) {
    if (lat === null || lon === null || lat === undefined || lon === undefined) {
      return { isValid: false, message: 'Please select a location on the map' };
    }
    
    if (lat < -90 || lat > 90) {
      return { isValid: false, message: 'Invalid latitude value' };
    }
    
    if (lon < -180 || lon > 180) {
      return { isValid: false, message: 'Invalid longitude value' };
    }
    
    return { isValid: true, message: '' };
  }

  static showError(inputElement, message) {
    inputElement.classList.add('error');
    
    let errorElement = inputElement.parentElement.querySelector('.error-message');
    
    if (!errorElement) {
      errorElement = document.createElement('p');
      errorElement.className = 'error-message';
      errorElement.setAttribute('role', 'alert');
      inputElement.parentElement.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
  }

  static clearError(inputElement) {
    inputElement.classList.remove('error');
    
    const errorElement = inputElement.parentElement.querySelector('.error-message');
    if (errorElement) {
      errorElement.remove();
    }
  }

  static showSuccess(inputElement, message = '') {
    this.clearError(inputElement);
    
    if (message) {
      let successElement = inputElement.parentElement.querySelector('.success-message');
      
      if (!successElement) {
        successElement = document.createElement('p');
        successElement.className = 'success-message';
        successElement.setAttribute('role', 'status');
        inputElement.parentElement.appendChild(successElement);
      }
      
      successElement.textContent = message;
    }
  }
}

export default Validator;