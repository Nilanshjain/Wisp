import { FcGoogle } from 'react-icons/fc';

const OAuthButtons = () => {
  const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  const handleGoogleLogin = () => {
    window.location.href = `${BACKEND_URL}/api/auth/oauth/google`;
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
    </div>
  );
};

export default OAuthButtons;
