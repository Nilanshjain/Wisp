import { FcGoogle } from 'react-icons/fc';
import { FaApple } from 'react-icons/fa';

const OAuthButtons = () => {
  const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  const handleGoogleLogin = () => {
    window.location.href = `${BACKEND_URL}/api/auth/oauth/google`;
  };

  const handleAppleLogin = () => {
    window.location.href = `${BACKEND_URL}/api/auth/oauth/apple`;
  };

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

      {/* Apple OAuth Button */}
      <button
        onClick={handleAppleLogin}
        className="btn btn-outline w-full gap-2"
        type="button"
      >
        <FaApple className="size-5" />
        Continue with Apple
      </button>
    </div>
  );
};

export default OAuthButtons;
