import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import About from './pages/About';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Checkout from './pages/Checkout';
import EmailVerify from './pages/EmailVerify';
import Profile from './pages/Profile';
import OrderHistory from './pages/OrderHistory';
import OrderDetails from './pages/OrderDetails';
import AdminDashboard from './pages/AdminDashboard';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import AdminRoute from './components/AdminRoute';
import UserRoute from './components/UserRoute';
import ProtectedRoute from './components/ProtectedRoute';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import './index.css';

// Simple ScrollToTop component to reset scroll on route change
const ScrollToTopWrapper = () => <ScrollToTop />;

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <ScrollToTop />
          <div className="app">
            <Header />
            <main>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/verify-email" element={<EmailVerify />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />

                {/* User-only routes (customers only, admins redirected to /admin) */}
                <Route path="/menu" element={<UserRoute requireAuth={false}><Menu /></UserRoute>} />
                <Route path="/cart" element={<UserRoute requireAuth={false}><Cart /></UserRoute>} />
                <Route path="/checkout" element={<UserRoute requireAuth={true}><Checkout /></UserRoute>} />
                <Route path="/orders" element={<UserRoute requireAuth={true}><OrderHistory /></UserRoute>} />
                <Route path="/orders/:id" element={<UserRoute requireAuth={true}><OrderDetails /></UserRoute>} />
                
                {/* Profile - accessible by both users and admins */}
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

                {/* Admin-only routes (customers redirected to home) */}
                <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
