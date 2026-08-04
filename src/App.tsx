import { Navigate, Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { ArticlePage } from './pages/ArticlePage';
import { HomePage } from './pages/HomePage';
import { NewsPage } from './pages/NewsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ResearchPage } from './pages/ResearchPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/research" element={<ResearchPage />} />
        <Route path="/knowledge" element={<Navigate to="/research" replace />} />
        <Route path="/articles/:slug" element={<ArticlePage />} />
        <Route path="/category/ai-news" element={<Navigate to="/news" replace />} />
        <Route path="/category/:categoryId" element={<Navigate to="/research" replace />} />
        <Route path="/about" element={<Navigate to="/" replace />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
