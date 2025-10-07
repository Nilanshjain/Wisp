import { useState, useEffect, useMemo } from 'react';
import { FcGoogle } from 'react-icons/fc';
import axios from 'axios';

const OAuthButtons = () => {
  const BACKEND_URL = useMemo(() => import.meta.env.VITE_API_URL || 'http://localhost:5001', []);
  const [authMethods, setAuthMethods] = useState({ oauth: { google: false } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAuthMethods = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/auth/methods`, {
          timeout: 5000 // 5 second timeout
        });
        if (isMounted) {
          setAuthMethods(response.data);
          setError(false);
        }
      } catch (error) {
        console.error('Failed to check auth methods:', error);
        if (isMounted) {
          setError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuthMethods();

    return () => {
      isMounted = false;
    };
  }, [BACKEND_URL]);

  const handleGoogleLogin = () => {
    window.location.href = `${BACKEND_URL}/api/auth/oauth/google`;
  };

  // Don't show OAuth buttons if loading, error, or not available
  if (loading || error || !authMethods.oauth?.google) {
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
