import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PdfPage from './components/PdfPage';
import MembersPage from './components/MembersPage';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="pdf" element={<PdfPage />} />
          <Route path="membros" element={<MembersPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
