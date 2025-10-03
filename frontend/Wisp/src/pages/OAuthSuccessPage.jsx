import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const OAuthSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuthUser } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      toast.error('Authentication failed. Please try again.');
      navigate('/login');
      return;
    }

    if (token) {
      // Token is set as a cookie by the backend
      // Fetch user data
      fetch(`${import.meta.env.VITE_API_URL}/api/auth/check`, {
        credentials: 'include'
      })
        .then(res => res.json())
        .then(data => {
          if (data._id) {
            setAuthUser(data);
            toast.success('Logged in successfully!');
            navigate('/');
          } else {
            throw new Error('Failed to fetch user data');
          }
        })
        .catch(err => {
          console.error('Error fetching user:', err);
          toast.error('Authentication failed. Please try again.');
          navigate('/login');
        });
    } else {
      toast.error('Authentication failed. Please try again.');
      navigate('/login');
    }
  }, [searchParams, navigate, setAuthUser]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader className="size-10 animate-spin mx-auto mb-4" />
        <p className="text-lg">Completing sign in...</p>
      </div>
    </div>
  );
};

export default OAuthSuccessPage;
