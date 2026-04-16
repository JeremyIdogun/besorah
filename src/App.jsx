import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Navbar from './components/public/Navbar';
import Footer from './components/public/Footer';
import Home from './pages/public/Home';
import Pillar from './pages/public/Pillar';
import Search from './pages/public/Search';
import SermonDetail from './pages/public/SermonDetail';
import About from './pages/public/About';
import Dashboard from './pages/admin/Dashboard';
import AdminLogin from './pages/admin/Login';
import Shows from './pages/admin/Shows';
import ReviewQueue from './pages/admin/ReviewQueue';
import SermonEdit from './pages/admin/SermonEdit';
import ApprovedSermons from './pages/admin/ApprovedSermons';
import Themes from './pages/admin/Themes';
import AdminGate from './components/admin/AdminGate';
import PostHogAdminIdentity from './components/admin/PostHogAdminIdentity';
import NotFound from './pages/NotFound';
import ScrollToTop from './components/ScrollToTop';

function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <PostHogAdminIdentity />
      <Routes>
        {/* Public routes */}
        <Route
          path="/"
          element={
            <PublicLayout>
              <Home />
            </PublicLayout>
          }
        />
        <Route
          path="/pillar/:slug"
          element={
            <PublicLayout>
              <Pillar />
            </PublicLayout>
          }
        />
        <Route
          path="/search"
          element={
            <PublicLayout>
              <Search />
            </PublicLayout>
          }
        />
        <Route
          path="/sermon/:id"
          element={
            <PublicLayout>
              <SermonDetail />
            </PublicLayout>
          }
        />
        <Route
          path="/about"
          element={
            <PublicLayout>
              <About />
            </PublicLayout>
          }
        />

        {/* Admin routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <AdminGate>
              <Dashboard />
            </AdminGate>
          }
        />
        <Route
          path="/admin/shows"
          element={
            <AdminGate>
              <Shows />
            </AdminGate>
          }
        />
        <Route
          path="/admin/review"
          element={
            <AdminGate>
              <ReviewQueue />
            </AdminGate>
          }
        />
        <Route
          path="/admin/approved"
          element={
            <AdminGate>
              <ApprovedSermons />
            </AdminGate>
          }
        />
        <Route
          path="/admin/themes"
          element={
            <AdminGate>
              <Themes />
            </AdminGate>
          }
        />
        <Route
          path="/admin/sermons/:id"
          element={
            <AdminGate>
              <SermonEdit />
            </AdminGate>
          }
        />
        <Route
          path="*"
          element={
            <PublicLayout>
              <NotFound />
            </PublicLayout>
          }
        />
      </Routes>
      <Analytics />
    </BrowserRouter>
  );
}
