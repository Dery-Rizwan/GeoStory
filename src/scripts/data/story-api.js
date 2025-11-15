const BASE_URL = 'https://story-api.dicoding.dev/v1';

class StoryAPI {
  static async register(name, email, password) {
    try {
      const response = await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      return data;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async login(email, password) {
    try {
      const response = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log('Login response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Save token to localStorage
      if (data.loginResult && data.loginResult.token) {
        const { token, userId, name } = data.loginResult;
        
        localStorage.setItem('token', token);
        localStorage.setItem('userId', userId);
        localStorage.setItem('userName', name);
        
        console.log('Token saved:', token.substring(0, 20) + '...');
        console.log('User ID:', userId);
        console.log('User Name:', name);
      } else {
        throw new Error('Invalid response from server');
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(error.message);
    }
  }

  static logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
  }

  static isLoggedIn() {
    return !!localStorage.getItem('token');
  }

  static getToken() {
    return localStorage.getItem('token');
  }

  static getUserName() {
    return localStorage.getItem('userName');
  }

  static async getAllStories() {
    try {
      const token = this.getToken();
      
      if (!token) {
        console.error('No token found');
        throw new Error('Please login first');
      }

      console.log('Fetching stories with token:', token.substring(0, 20) + '...');

      const response = await fetch(`${BASE_URL}/stories`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('Response data:', data);
      
      if (!response.ok) {
        // If token invalid, clear and redirect to login
        if (response.status === 401) {
          this.logout();
          window.location.hash = '#/login';
          throw new Error('Session expired. Please login again.');
        }
        throw new Error(data.message || 'Failed to fetch stories');
      }

      return data.listStory || [];
    } catch (error) {
      console.error('Error fetching stories:', error);
      throw new Error(error.message);
    }
  }

  static async addStory(description, photo, lat, lon) {
    try {
      const token = this.getToken();
      
      if (!token) {
        throw new Error('Please login first');
      }

      const formData = new FormData();
      formData.append('description', description);
      formData.append('photo', photo);
      formData.append('lat', lat);
      formData.append('lon', lon);

      const response = await fetch(`${BASE_URL}/stories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add story');
      }

      return data;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async getStoryDetail(id) {
    try {
      const token = this.getToken();
      
      if (!token) {
        throw new Error('Please login first');
      }

      const response = await fetch(`${BASE_URL}/stories/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch story detail');
      }

      return data.story;
    } catch (error) {
      throw new Error(error.message);
    }
  }
}

export default StoryAPI;