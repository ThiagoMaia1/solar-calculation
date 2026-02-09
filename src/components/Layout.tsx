import { Link, Outlet, useLocation } from 'react-router-dom';

interface NavItem {
  path: string;
  label: string;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Painel Financeiro' },
  { path: '/membros', label: 'Membros' },
  { path: '/pdf', label: 'Gerar Fatura' },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <nav className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
        <div className="max-w-[1600px] mx-auto px-4">
          <div className="flex items-center h-16">
            <span className="text-xl font-bold mr-8 flex items-center gap-2">
              <span className="text-2xl">☀️</span> Solar Credits
            </span>
            <div className="flex space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-white/20 text-white'
                      : 'text-amber-100 hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1 min-h-0 max-w-[1600px] w-full mx-auto px-4 py-4 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
