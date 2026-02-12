import { AnimatePresence, motion } from 'framer-motion';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { EnginePage } from './pages/EnginePage';
import { LandingPage } from './pages/LandingPage';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <motion.div
              className="route-shell"
              initial={{ opacity: 0, y: 24, scale: 0.995, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -22, scale: 1.005, filter: 'blur(8px)' }}
              transition={{ duration: 0.48 }}
            >
              <LandingPage />
            </motion.div>
          }
        />
        <Route
          path="/engine"
          element={
            <motion.div
              className="route-shell"
              initial={{ opacity: 0, y: 24, scale: 0.995, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -22, scale: 1.005, filter: 'blur(8px)' }}
              transition={{ duration: 0.48 }}
            >
              <EnginePage />
            </motion.div>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
