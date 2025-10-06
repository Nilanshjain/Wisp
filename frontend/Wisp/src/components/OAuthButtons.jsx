import { useState, useEffect } from 'react';
import { FcGoogle } from 'react-icons/fc';
import axios from 'axios';

const OAuthButtons = () => {
  const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
  const [authMethods, setAuthMethods] = useState({ oauth: { google: false } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthMethods = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/auth/methods`);
        setAuthMethods(response.data);
      } catch (error) {
        console.error('Failed to check auth methods:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuthMethods();
  }, [BACKEND_URL]);

  const handleGoogleLogin = () => {
    window.location.href = `${BACKEND_URL}/api/auth/oauth/google`;
  };

  // Don't show OAuth buttons if not available
  if (loading || !authMethods.oauth?.google) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Divider */}
      <div className="divider text-sm text-base-content/60">OR</div>

      {/* Google OAuth Button */}
      <button
        onClick={handleGoogleLogin}
        className="btn btn-outline w-full gap-2"
        type="button"
      >
        <FcGoogle className="size-5" />
        Continue with Google
      </button>
    </div>
  );
};

export default OAuthButtons;
