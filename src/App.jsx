import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import OverviewPage from './pages/OverviewPage';
import PipelinePage from './pages/PipelinePage';
import VendedoresPage from './pages/VendedoresPage';
import ProdutosPage from './pages/ProdutosPage';
import MarketingPage from './pages/MarketingPage';
import PodiumPage from './pages/PodiumPage';
import TrafegoPage from './pages/TrafegoPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/pipelines" element={<PipelinePage />} />
          <Route path="/vendedores" element={<VendedoresPage />} />
          <Route path="/podium" element={<PodiumPage />} />
          <Route path="/produtos" element={<ProdutosPage />} />
          <Route path="/marketing" element={<MarketingPage />} />
          <Route path="/trafego" element={<TrafegoPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
