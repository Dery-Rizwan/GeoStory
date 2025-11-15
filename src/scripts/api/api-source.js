import AuthHelper from '../utils/auth-helper.js';

class ApiSource {
  constructor() {
    this._baseUrl = 'https://story-api.dicoding.dev/v1';
    this._authHelper = new AuthHelper();
  }

  async register(name, email, password) {
    try {
      const response = await fetch(`${this._baseUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { error: true, message: 'Network error' };
    }
  }

  async login(email, password) {
    try {
      const response = await fetch(`${this._baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { error: true, message: 'Network error' };
    }
  }

  async getStories() {
    try {
      const token = this._authHelper.getToken();
      const response = await fetch(`${this._baseUrl}/stories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { error: true, message: 'Failed to fetch stories' };
    }
  }

  async addStory(formData) {
    try {
      const token = this._authHelper.getToken();
      const response = await fetch(`${this._baseUrl}/stories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { error: true, message: 'Failed to add story' };
    }
  }
}

export default ApiSource;