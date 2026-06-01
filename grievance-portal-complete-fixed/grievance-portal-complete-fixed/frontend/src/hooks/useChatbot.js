import { useState } from 'react';
import { Loader, AlertCircle } from 'lucide-react';

/**
 * Hook for interacting with the Gemini Chatbot API
 */
const useChatbot = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/api/chatbot` 
    : 'http://127.0.0.1:8000/api/chatbot';

  const sendMessage = async (message, userId = null) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') && {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          }),
        },
        body: JSON.stringify({
          message,
          userId: userId || localStorage.getItem('userId') || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }

      const data = await response.json();
      return data.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getHistory = async (userId = null) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = new URL(`${API_BASE_URL}/history`);
      if (userId) url.searchParams.append('userId', userId);

      const response = await fetch(url, {
        headers: {
          ...(localStorage.getItem('token') && {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const data = await response.json();
      return data.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async (userId = null) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/history`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') && {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          }),
        },
        body: JSON.stringify({
          userId: userId || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to clear history');
      }

      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getSuggestions = async (description) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') && {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          }),
        },
        body: JSON.stringify({ description }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate suggestions');
      }

      const data = await response.json();
      return data.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/status`);
      if (!response.ok) {
        throw new Error('Failed to get chatbot status');
      }
      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    sendMessage,
    getHistory,
    clearHistory,
    getSuggestions,
    getStatus,
    isLoading,
    error,
    setError,
  };
};

export default useChatbot;
