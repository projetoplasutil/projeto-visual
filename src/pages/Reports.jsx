import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Download, Users, Filter, X } from 'lucide-react';
import { format, differenceInMinutes, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'];

const Reports = () => {
    const [reportData, setReportData] = useState([]);
    const [users, setUsers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        userId: '',
        productId: '',
        complexity: ''
    });

    useEffect(() => {
        fetchAllActivities();
        fetchUsers();
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        const { data, error } = await supabase
            .from('products')
            .select('id, name')
            .order('name');

        if (!error) setProducts(data);
    };

    const fetchUsers = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name')
            .order('full_name');

        if (!error) setUsers(data);
    };

    const fetchAllActivities = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('activities')
            .select(`
    *,
    profiles: user_id(full_name),
        products(name)
            `)
            .order('created_at', { ascending: false });

        if (!error) setReportData(data);
        setLoading(false);
    };

    const handleResetFilters = () => {
        setFilters({
            startDate: '',
            endDate: '',
            userId: '',
            productId: '',
            complexity: ''
        });
    };

    const filteredData = reportData.filter(act => {
        const matchesUser = !filters.userId || act.user_id === filters.userId;
        const matchesProduct = !filters.productId || act.product_id === filters.productId;
        const matchesComplexity = !filters.complexity || String(act.complexity) === filters.complexity;

        let matchesDate = true;
        if (filters.startDate || filters.endDate) {
            const actDate = new Date(act.start_time);
            const start = filters.startDate ? startOfDay(new Date(filters.startDate + 'T00:00:00')) : new Date(0);
            const end = filters.endDate ? endOfDay(new Date(filters.endDate + 'T23:59:59')) : new Date(8640000000000000);
            matchesDate = actDate >= start && actDate <= end;
        }

        return matchesUser && matchesProduct && matchesComplexity && matchesDate;
    });

    const calculateStats = () => {
        const totalActivities = filteredData.length;
        const totalReworks = filteredData.reduce((acc, curr) => acc + (parseInt(curr.reworks) || 0), 0);

        let releaseDaysSum = 0;
        let releaseCount = 0;
        let deliveryDaysSum = 0;
        let deliveryCount = 0;

        filteredData.forEach(act => {
            const start = startOfDay(new Date(act.start_time));

            if (act.graphic_release) {
                const release = startOfDay(new Date(act.graphic_release + 'T12:00:00'));
                const diff = Math.ceil((release - start) / (1000 * 60 * 60 * 24));
                releaseDaysSum += diff;
                releaseCount++;
            }

            if (act.final_delivery) {
                const delivery = startOfDay(new Date(act.final_delivery + 'T12:00:00'));
                const diff = Math.ceil((delivery - start) / (1000 * 60 * 60 * 24));
                deliveryDaysSum += diff;
                deliveryCount++;
            }
        });

        return {
            totalActivities,
            totalReworks,
            avgRelease: releaseCount > 0 ? (releaseDaysSum / releaseCount).toFixed(1) : 0,
            avgDelivery: deliveryCount > 0 ? (deliveryDaysSum / deliveryCount).toFixed(1) : 0
        };
    };

    const getChartData = () => {
        const counts = {};
        filteredData.forEach(act => {
            counts[act.category] = (counts[act.category] || 0) + 1;
        });
        return Object.keys(counts).map(cat => ({
            name: cat,
            quantidade: counts[cat]
        })).sort((a, b) => b.quantidade - a.quantidade);
    };

    const getComplexityData = () => {
        const counts = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 };
        filteredData.forEach(act => {
            if (act.complexity) counts[act.complexity]++;
        });
        return Object.keys(counts).map(key => ({
            name: `Nível ${key} `,
            quantidade: counts[key]
        }));
    };

    const getStatusData = () => {
        const counts = {};
        filteredData.forEach(act => {
            counts[act.status] = (counts[act.status] || 0) + 1;
        });
        return Object.keys(counts).map(status => ({
            name: status,
            quantidade: counts[status]
        }));
    };

    const getWorkloadData = () => {
        const counts = {};
        filteredData.forEach(act => {
            const userName = act.profiles?.full_name || 'Designer';
            counts[userName] = (counts[userName] || 0) + 1;
        });
        return Object.keys(counts).map(user => ({
            name: user,
            trabalhos: counts[user]
        })).sort((a, b) => b.trabalhos - a.trabalhos);
    };

    const getEfficiencyData = () => {
        const counts = {};
        filteredData.forEach(act => {
            const userName = act.profiles?.full_name || 'Designer';
            counts[userName] = (counts[userName] || 0) + (act.total_minutes || 0);
        });
        return Object.keys(counts).map(user => ({
            name: user,
            minutos: counts[user]
        })).sort((a, b) => b.minutos - a.minutos);
    };

    const getTopProducts = () => {
        const counts = {};
        filteredData.forEach(act => {
            if (act.products?.name) {
                counts[act.products.name] = (counts[act.products.name] || 0) + 1;
            }
        });
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    };

    const stats = calculateStats();
    const chartData = getChartData();
    const complexityData = getComplexityData();
    const statusData = getStatusData();
    const workloadData = getWorkloadData();
    const efficiencyData = getEfficiencyData();
    const topProducts = getTopProducts();

    return (
        <div className="main-content">
            <header>
                <div>
                    <h1>Relatórios Gerais</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Visão geral de produtividade da equipe</p>
                </div>
                <button className="btn btn-primary" onClick={() => window.print()}>
                    <Download size={20} />
                    Exportar PDF
                </button>
            </header>

            {/* Seção de Filtros */}
            <div className="card no-print" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>
                    <Filter size={18} />
                    <h3 style={{ margin: 0 }}>Filtros</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 1fr) minmax(130px, 1fr) 1.5fr 1.5fr minmax(130px, 1fr) auto', gap: '1rem', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '13px', fontWeight: 600 }}>De:</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            style={{ height: '42px', fontSize: '13px', padding: '0 8px' }}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '13px', fontWeight: 600 }}>Até:</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            style={{ height: '42px', fontSize: '13px', padding: '0 8px' }}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '13px', fontWeight: 600 }}>Designer:</label>
                        <select
                            value={filters.userId}
                            onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                            style={{ height: '42px', fontSize: '13px', padding: '0 8px' }}
                        >
                            <option value="">Todos os designers</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>{user.full_name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '13px', fontWeight: 600 }}>Produto:</label>
                        <select
                            value={filters.productId}
                            onChange={(e) => setFilters({ ...filters, productId: e.target.value })}
                            style={{ height: '42px', fontSize: '13px', padding: '0 8px' }}
                        >
                            <option value="">Todos os produtos</option>
                            {products.map(prod => (
                                <option key={prod.id} value={prod.id}>{prod.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '13px', fontWeight: 600 }}>Complexidade:</label>
                        <select
                            value={filters.complexity}
                            onChange={(e) => setFilters({ ...filters, complexity: e.target.value })}
                            style={{ height: '42px', fontSize: '13px', padding: '0 8px' }}
                        >
                            <option value="">Todas</option>
                            <option value="1">Nível 1</option>
                            <option value="2">Nível 2</option>
                            <option value="3">Nível 3</option>
                            <option value="4">Nível 4</option>
                            <option value="5">Nível 5</option>
                            <option value="6">Nível 6</option>
                        </select>
                    </div>
                    <button
                        className="btn"
                        onClick={handleResetFilters}
                        style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', height: '42px', fontSize: '13px', padding: '0 15px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <X size={16} /> Limpar
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card">
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total de Trabalhos</p>
                    <h2 style={{ fontSize: '1.8rem' }}>{stats.totalActivities}</h2>
                </div>
                <div className="card">
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Retrabalhos</p>
                    <h2 style={{ fontSize: '1.8rem', color: '#ef4444' }}>{stats.totalReworks}</h2>
                </div>
                <div className="card">
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Média Entrega Projeto (Lib.)</p>
                    <h2 style={{ fontSize: '1.8rem' }}>{stats.avgRelease} <span style={{ fontSize: '14px' }}>dias</span></h2>
                </div>
                <div className="card">
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Média Entrega Gráfica (Final)</p>
                    <h2 style={{ fontSize: '1.8rem' }}>{stats.avgDelivery} <span style={{ fontSize: '14px' }}>dias</span></h2>
                </div>
            </div>

            <div className="card" style={{ padding: '1rem', marginBottom: '1rem', textAlign: 'right' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tempo Total Acumulado: </span>
                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                    {filteredData.reduce((acc, curr) => acc + (curr.total_minutes || 0), 0)} min
                </span>
            </div>

            <div className="card" style={{ marginBottom: '2rem', height: '350px' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '16px' }}>Trabalhos por Categoria</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="name"
                            interval={0}
                            fontSize={11}
                        />
                        <YAxis hide />
                        <Tooltip />
                        <Bar dataKey="quantidade" fill="var(--primary)" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 12, fill: 'var(--text-main)', fontWeight: 600 }}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell - ${index} `} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                <div className="card" style={{ height: '300px' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '15px' }}>Distribuição de Complexidade</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={complexityData} margin={{ top: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" fontSize={11} />
                            <YAxis hide />
                            <Tooltip />
                            <Bar dataKey="quantidade" fill="#818cf8" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 11, fontWeight: 600 }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="card" style={{ height: '300px' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '15px' }}>Status das Atividades</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statusData} margin={{ top: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" fontSize={11} />
                            <YAxis hide />
                            <Tooltip />
                            <Bar dataKey="quantidade" fill="#34d399" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 11, fontWeight: 600 }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                <div className="card" style={{ height: '350px' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '15px' }}>Trabalhos por Designer (Volume)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={workloadData} margin={{ top: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="name"
                                fontSize={10}
                                interval={0}
                            />
                            <YAxis hide />
                            <Tooltip />
                            <Bar dataKey="trabalhos" fill="#6366f1" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 11, fontWeight: 600 }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="card" style={{ height: '350px' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '15px' }}>Trabalho por Designer (Minutos Totais)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={efficiencyData} margin={{ top: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="name"
                                fontSize={10}
                                interval={0}
                            />
                            <YAxis hide />
                            <Tooltip />
                            <Bar dataKey="minutos" fill="#f59e0b" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 11, fontWeight: 600 }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Top 10 Produtos Mais Trabalhados
                </h3>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: '50px' }}>#</th>
                            <th>Nome do Produto</th>
                            <th style={{ textAlign: 'center' }}>Qtd. de Trabalhos</th>
                        </tr>
                    </thead>
                    <tbody>
                        {topProducts.length === 0 ? (
                            <tr><td colSpan="3" style={{ textAlign: 'center', padding: '1rem' }}>Sem dados de produtos no período.</td></tr>
                        ) : topProducts.map((prod, index) => (
                            <tr key={prod.name}>
                                <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{index + 1}º</td>
                                <td style={{ fontWeight: 600 }}>{prod.name}</td>
                                <td style={{ textAlign: 'center' }}>
                                    <span className="status-badge" style={{ background: '#e0e7ff', color: '#4338ca', fontWeight: 700 }}>
                                        {prod.count}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="card no-print" style={{ padding: 0 }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>Listagem Detalhada de Atividades</h3>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Designer</th>
                            <th>Início/Fim</th>
                            <th>Produto / Descrição</th>
                            <th>Liberação</th>
                            <th>Entrega</th>
                            <th>Retr.</th>
                            <th>Duração</th>
                            <th>Status</th>
                            <th>C.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>Carregando...</td></tr>
                        ) : filteredData.length === 0 ? (
                            <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>Nenhum registro encontrado para estes filtros.</td></tr>
                        ) : filteredData.map((act) => (
                            <tr key={act.id}>
                                <td style={{ fontWeight: 600 }}>{act.profiles?.full_name || 'Designer'}</td>
                                <td style={{ fontSize: '11px' }}>
                                    <div style={{ fontWeight: 600 }}>{format(new Date(act.start_time), "dd/MM/yyyy")}</div>
                                    <div style={{ color: 'var(--text-muted)' }}>{act.end_time ? format(new Date(act.end_time), "dd/MM/yyyy") : '-'}</div>
                                </td>
                                <td>
                                    <div style={{ fontSize: '12px', fontWeight: 600 }}>
                                        {act.products?.name} - {act.description?.split(' ')[0]}
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>{act.category}</div>
                                </td>
                                <td style={{ fontSize: '11px' }}>{act.graphic_release ? format(new Date(act.graphic_release + 'T12:00:00'), "dd/MM/yyyy") : '-'}</td>
                                <td style={{ fontSize: '11px' }}>{act.final_delivery ? format(new Date(act.final_delivery + 'T12:00:00'), "dd/MM/yyyy") : '-'}</td>
                                <td style={{ fontSize: '12px' }}>{act.reworks || '-'}</td>
                                <td>
                                    <span style={{ fontWeight: 600 }}>
                                        {act.total_minutes || 0} min
                                    </span>
                                </td>
                                <td>
                                    <span className={`status - badge ${act.status === 'Concluído' ? 'status-done' : (act.status === 'Pausado' ? 'status-pending' : '')} `} style={{ background: act.status === 'Pausado' ? '#fef9c3' : '', color: act.status === 'Pausado' ? '#854d0e' : '' }}>
                                        {act.status}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>{act.complexity}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Reports;
