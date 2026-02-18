import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Search, Filter, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const categories = [
    'Baby', 'Bazar', 'Comercial', 'Diversos', 'Exportação',
    'Gravação', 'Licenciados', 'Montagem', 'Pesquisa',
    'Porta a Porta', 'Televendas', 'UD'
];

const Dashboard = () => {
    const [activities, setActivities] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingActivity, setEditingActivity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        fetchActivities();
        fetchProducts();

        const timer = setInterval(() => {
            setNow(new Date());
        }, 30000); // Atualiza a cada 30 segundos para maior precisão visual

        return () => clearInterval(timer);
    }, []);

    const calculateLiveMinutes = (act) => {
        if (act.status !== 'Em Andamento' || act.is_paused) {
            return act.total_minutes || 0;
        }
        const lastResume = new Date(act.last_resume_time || act.start_time);
        const diffMs = now - lastResume;
        const diffMin = Math.max(0, Math.floor(diffMs / 1000 / 60));
        return (act.total_minutes || 0) + diffMin;
    };

    // Form fields
    const [formData, setFormData] = useState({
        category: '',
        description: '',
        status: 'Pendente',
        reworks: '',
        graphic_release: '',
        final_delivery: '',
        complexity: '1',
        product_id: '',
        manual_minutes: ''
    });



    const fetchProducts = async () => {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('name', { ascending: true });

        if (!error) setProducts(data);
    };

    const fetchActivities = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('activities')
            .select('*, products(name)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (!error) setActivities(data);
        setLoading(false);
    };

    const handleStart = async (activity) => {
        const { error } = await supabase
            .from('activities')
            .update({
                status: 'Em Andamento',
                is_paused: false,
                last_resume_time: new Date().toISOString()
            })
            .eq('id', activity.id);

        if (!error) fetchActivities();
    };

    const handlePause = async (activity) => {
        const nowTime = new Date();
        // Fallback para start_time se last_resume_time nunca foi definido
        const startTime = activity.last_resume_time || activity.start_time;
        const diffMs = nowTime - new Date(startTime);
        const diffMin = Math.max(0, Math.floor(diffMs / 1000 / 60));

        const newTotal = (activity.total_minutes || 0) + diffMin;

        const { error } = await supabase
            .from('activities')
            .update({
                is_paused: true,
                total_minutes: newTotal,
                status: 'Pausado'
            })
            .eq('id', activity.id);

        if (!error) fetchActivities();
    };

    const handleResume = async (activity) => {
        const { error } = await supabase
            .from('activities')
            .update({
                is_paused: false,
                last_resume_time: new Date().toISOString(),
                status: 'Em Andamento'
            })
            .eq('id', activity.id);

        if (!error) fetchActivities();
    };

    const handleFinish = async (activity) => {
        let finalTotal = activity.total_minutes || 0;

        if (!activity.is_paused && activity.status === 'Em Andamento') {
            const nowTime = new Date();
            const startTime = activity.last_resume_time || activity.start_time;
            const diffMs = nowTime - new Date(startTime);
            finalTotal += Math.max(0, Math.floor(diffMs / 1000 / 60));
        }

        const { error } = await supabase
            .from('activities')
            .update({
                status: 'Concluído',
                total_minutes: finalTotal,
                end_time: new Date().toISOString(),
                is_paused: false
            })
            .eq('id', activity.id);

        if (!error) fetchActivities();
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir esta atividade? Esta ação não pode ser desfeita.')) {
            const { error } = await supabase
                .from('activities')
                .delete()
                .eq('id', id);

            if (!error) {
                fetchActivities();
            } else {
                alert('Erro ao excluir: ' + error.message);
            }
        }
    };

    const handleOpenModal = (activity = null) => {
        if (activity) {
            setEditingActivity(activity);
            setFormData({
                category: activity.category,
                description: activity.description,
                status: activity.status,
                reworks: activity.reworks,
                graphic_release: activity.graphic_release,
                final_delivery: activity.final_delivery,
                complexity: activity.complexity,
                product_id: activity.product_id || '',
                manual_minutes: activity.total_minutes || ''
            });
        } else {
            setEditingActivity(null);
            setFormData({
                category: '',
                description: '',
                status: 'Pendente',
                reworks: '',
                graphic_release: '',
                final_delivery: '',
                complexity: '1',
                product_id: '',
                manual_minutes: ''
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();

        const isManual = formData.manual_minutes !== '';

        const payload = {
            category: formData.category,
            description: formData.description,
            status: isManual ? 'Concluído' : formData.status,
            reworks: formData.reworks,
            graphic_release: formData.graphic_release,
            final_delivery: formData.final_delivery,
            complexity: formData.complexity,
            product_id: formData.product_id,
            total_minutes: isManual ? parseInt(formData.manual_minutes) : (editingActivity?.total_minutes || 0),
            user_id: user.id,
            start_time: editingActivity ? editingActivity.start_time : new Date().toISOString(),
            last_resume_time: (formData.status === 'Em Andamento' && !editingActivity) ? new Date().toISOString() : (editingActivity?.last_resume_time || null),
            end_time: isManual ? new Date().toISOString() : (editingActivity?.end_time || null)
        };

        let error;
        if (editingActivity) {
            const { error: err } = await supabase
                .from('activities')
                .update(payload)
                .eq('id', editingActivity.id);
            error = err;
        } else {
            const { error: err } = await supabase
                .from('activities')
                .insert([payload]);
            error = err;
        }

        if (!error) {
            setShowModal(false);
            fetchActivities();
        } else {
            alert('Erro ao salvar: ' + error.message);
        }
    };

    return (
        <div className="main-content">
            <header>
                <div>
                    <h1>Trabalhos</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Gerencie suas atividades e acompanhe seu tempo</p>
                </div>
                <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                    <Plus size={20} />
                    Nova Atividade
                </button>
            </header>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input placeholder="Pesquisar..." style={{ paddingLeft: '32px', width: '200px', height: '36px', fontSize: '14px' }} />
                        </div>
                    </div>
                    <button className="btn" style={{ background: '#f3f4f6', fontSize: '14px' }}>
                        <Filter size={16} /> Filtrar
                    </button>
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Início</th>
                            <th>Categoria</th>
                            <th>Liberação/Entrega</th>
                            <th>Status</th>
                            <th>Complexidade</th>
                            <th>Retrabalho</th>
                            <th>Tempo Total</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Carregando...</td></tr>
                        ) : activities.length === 0 ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Nenhuma atividade registrada.</td></tr>
                        ) : activities.map((act) => (
                            <tr key={act.id}>
                                <td style={{ fontSize: '14px' }}>
                                    {format(new Date(act.start_time), 'dd/MM/yyyy HH:mm')}
                                </td>
                                <td>
                                    <div style={{ fontWeight: 600 }}>{act.category}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 500 }}>
                                        {act.products?.name || 'Sem produto'}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        Lib: {act.graphic_release ? format(new Date(act.graphic_release + 'T12:00:00'), 'dd/MM/yyyy') : '-'}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        Ent: {act.final_delivery ? format(new Date(act.final_delivery + 'T12:00:00'), 'dd/MM/yyyy') : '-'}
                                    </div>
                                </td>
                                <td>
                                    <span className={`status-badge ${act.status === 'Concluído' ? 'status-done' : (act.status === 'Pausado' ? 'status-pending' : '')}`} style={{ background: act.status === 'Pausado' ? '#fef9c3' : '', color: act.status === 'Pausado' ? '#854d0e' : '' }}>
                                        {act.status}
                                    </span>
                                </td>
                                <td>
                                    <span style={{ fontSize: '14px', fontWeight: 600 }}>{act.complexity}</span>
                                </td>
                                <td>
                                    <span style={{ fontSize: '13px' }}>{act.reworks || '-'}</span>
                                </td>
                                <td>
                                    <span style={{ fontSize: '14px', fontWeight: 600 }}>
                                        {calculateLiveMinutes(act)} min
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        {act.status !== 'Concluído' && (
                                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                {act.status === 'Pendente' && (
                                                    <button
                                                        onClick={() => handleStart(act)}
                                                        className="btn"
                                                        style={{ padding: '4px 8px', background: '#dcfce7', color: '#166534', border: 'none', fontSize: '12px' }}
                                                    >
                                                        ▶️ Iniciar
                                                    </button>
                                                )}

                                                {act.status === 'Em Andamento' && !act.is_paused && (
                                                    <button
                                                        onClick={() => handlePause(act)}
                                                        className="btn"
                                                        style={{ padding: '4px 8px', background: '#fef9c3', color: '#854d0e', border: 'none', fontSize: '12px' }}
                                                    >
                                                        ⏸️ Pausar
                                                    </button>
                                                )}

                                                {act.is_paused && (
                                                    <button
                                                        onClick={() => handleResume(act)}
                                                        className="btn"
                                                        style={{ padding: '4px 8px', background: '#dcfce7', color: '#166534', border: 'none', fontSize: '12px' }}
                                                    >
                                                        ▶️ Retomar
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleFinish(act)}
                                                    className="btn"
                                                    style={{ padding: '4px 8px', background: '#e0e7ff', color: '#3730a3', border: 'none', fontSize: '12px' }}
                                                >
                                                    ✅ Finalizar
                                                </button>
                                            </div>
                                        )}
                                        <button onClick={() => handleOpenModal(act)} style={{ border: 'none', background: 'none', color: 'var(--primary)' }} title="Editar">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(act.id)} style={{ border: 'none', background: 'none', color: '#ef4444' }} title="Excluir">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal / Form */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2>{editingActivity ? 'Editar Atividade' : 'Nova Atividade'}</h2>
                        <p style={{ marginBottom: '1.5rem', fontSize: '14px', color: 'var(--text-muted)' }}>
                            Preencha os dados abaixo. Se informar o tempo manualmente, o sistema não calculará automaticamente.
                        </p>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Categoria</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    required
                                >
                                    <option value="">Selecione uma categoria...</option>
                                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Produto</label>
                                <select
                                    value={formData.product_id}
                                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                                    required
                                >
                                    <option value="">Selecione um produto...</option>
                                    {products.map(prod => <option key={prod.id} value={prod.id}>{prod.name}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Tempo (minutos) - *Opcional*</label>
                                <input
                                    type="number"
                                    placeholder="Deixe vazio para cálculo automático"
                                    value={formData.manual_minutes}
                                    onChange={(e) => setFormData({ ...formData, manual_minutes: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Descrição</label>
                                <textarea
                                    rows="3"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    required
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>Status</label>
                                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                                        <option value="Pendente">Pendente</option>
                                        <option value="Em Andamento">Em Andamento</option>
                                        <option value="Concluído">Concluído</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Complexidade</label>
                                    <select value={formData.complexity} onChange={(e) => setFormData({ ...formData, complexity: e.target.value })}>
                                        {[1, 2, 3, 4, 5, 6].map(num => (
                                            <option key={num} value={num}>{num}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Retrabalhos</label>
                                <input value={formData.reworks} onChange={(e) => setFormData({ ...formData, reworks: e.target.value })} />
                            </div>

                            <div className="form-group">
                                <label>Liberação Gráfica</label>
                                <input type="date" value={formData.graphic_release} onChange={(e) => setFormData({ ...formData, graphic_release: e.target.value })} />
                            </div>

                            <div className="form-group">
                                <label>Entrega Final</label>
                                <input type="date" value={formData.final_delivery} onChange={(e) => setFormData({ ...formData, final_delivery: e.target.value })} />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button type="button" className="btn" style={{ background: '#f3f4f6', flex: 1 }} onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
