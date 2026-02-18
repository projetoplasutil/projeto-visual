import React from 'react';
import { LayoutDashboard, FileText, Settings, LogOut, Users, Box } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const Sidebar = ({ userRole, onLogout }) => {
    return (
        <aside className="sidebar">
            <div className="logo" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%', gap: '0.5rem' }}>
                <img src="/logo.png" alt="Logo" style={{ width: '80px', height: 'auto', marginBottom: '0.5rem' }} />
                <span>Projeto Visual</span>
            </div>

            <nav className="nav-links">
                <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <LayoutDashboard size={20} />
                    Trabalhos
                </NavLink>

                <NavLink to="/products" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Box size={20} />
                    Produtos
                </NavLink>

                {userRole === 'master' && (
                    <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <FileText size={20} />
                        Relatórios
                    </NavLink>
                )}

                {/* Adicione mais itens se necessário */}
            </nav>

            <div style={{ marginTop: 'auto' }}>
                <button onClick={onLogout} className="nav-item" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}>
                    <LogOut size={20} />
                    Sair
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
