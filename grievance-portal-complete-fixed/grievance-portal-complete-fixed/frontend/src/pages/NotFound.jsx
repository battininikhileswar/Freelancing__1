import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="flex items-center justify-center min-h-[calc(100vh-66px)] px-4">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="text-8xl font-bold text-brand-200 dark:text-brand-900 font-display mb-2">404</div>
          <div className="text-5xl mb-5">🏛️</div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display mb-2">Page Not Found</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">
            The page you're looking for doesn't exist or may have been moved.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/" className="btn-primary">← Go Home</Link>
            <Link to="/track" className="btn-secondary">Track Complaint</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
