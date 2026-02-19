import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Search, Filter, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchActivities();
        fetchProducts();

        const timer = setInterval(() => {
            setNow(new Date());
        }, 30000); // Atualiza a cada 30 segundos para maior precisão visual

        return () => clearInterval(timer);
    }, []);

    const calculateLiveMinutes = (act) => {
        if (act.status !== 'Aguardando' || act.is_paused || !act.last_resume_time) {
            return act.total_minutes || 0;
        }
        const lastResume = new Date(act.last_resume_time);

        // Limita o cálculo às 18:00 do dia atual se já passou desse horário
        let effectiveNow = now;
        const eighteenToday = new Date(now);
        eighteenToday.setHours(18, 0, 0, 0);

        if (now > eighteenToday && lastResume < eighteenToday) {
            effectiveNow = eighteenToday;
        }

        const diffMs = effectiveNow - lastResume;
        const diffMin = Math.max(0, Math.floor(diffMs / 1000 / 60));
        return (act.total_minutes || 0) + diffMin;
    };

    // Auto-pause às 18:00
    useEffect(() => {
        const checkAutoPause = async () => {
            const h = now.getHours();
            if (h >= 18) {
                const eighteenToday = new Date(now);
                eighteenToday.setHours(18, 0, 0, 0);

                const activitiesToPause = activities.filter(act =>
                    act.status === 'Aguardando' &&
                    !act.is_paused &&
                    act.last_resume_time &&
                    new Date(act.last_resume_time) < eighteenToday
                );

                if (activitiesToPause.length > 0) {
                    for (const act of activitiesToPause) {
                        const lastResume = new Date(act.last_resume_time);
                        const diffMs = eighteenToday - lastResume;
                        const diffMin = Math.max(0, Math.floor(diffMs / 1000 / 60));
                        const newTotal = (act.total_minutes || 0) + diffMin;

                        await supabase
                            .from('activities')
                            .update({
                                is_paused: true,
                                total_minutes: newTotal
                            })
                            .eq('id', act.id);
                    }
                    fetchActivities();
                }
            }
        };

        checkAutoPause();
    }, [now, activities]);

    // Form fields
    const [formData, setFormData] = useState({
        category: '',
        description: '',
        status: 'Aguardando',
        reworks: '',
        graphic_release: '',
        final_delivery: '',
        complexity: '1',
        product_id: '',
        manual_minutes: '',
        start_date: '',
        end_date: '',
        observations: '',
        approval_send_date: '',
        approval_return_date: '',
        licensor: ''
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
                status: 'Aguardando',
                start_time: new Date().toISOString(),
                last_resume_time: new Date().toISOString(),
                is_paused: false
            })
            .eq('id', activity.id);

        if (!error) fetchActivities();
    };

    const handlePause = async (activity) => {
        const nowTime = new Date();
        const startTime = activity.last_resume_time || activity.start_time;
        const diffMs = nowTime - new Date(startTime);
        const diffMin = Math.max(0, Math.floor(diffMs / 1000 / 60));

        const newTotal = (activity.total_minutes || 0) + diffMin;

        const { error } = await supabase
            .from('activities')
            .update({
                is_paused: true,
                total_minutes: newTotal
            })
            .eq('id', activity.id);

        if (!error) fetchActivities();
    };

    const handleResume = async (activity) => {
        const { error } = await supabase
            .from('activities')
            .update({
                is_paused: false,
                last_resume_time: new Date().toISOString()
            })
            .eq('id', activity.id);

        if (!error) fetchActivities();
    };

    const handleFinish = async (activity) => {
        let finalTotal = activity.total_minutes || 0;

        if (!activity.is_paused && activity.last_resume_time) {
            const nowTime = new Date();
            const startTime = activity.last_resume_time;
            const diffMs = nowTime - new Date(startTime);
            finalTotal += Math.max(0, Math.floor(diffMs / 1000 / 60));
        }

        const { error } = await supabase
            .from('activities')
            .update({
                status: 'Aprovado',
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
                manual_minutes: activity.total_minutes || '',
                start_date: activity.start_time ? activity.start_time.split('T')[0] : '',
                end_date: activity.end_time ? activity.end_time.split('T')[0] : '',
                observations: activity.observations || '',
                approval_send_date: activity.approval_send_date || '',
                approval_return_date: activity.approval_return_date || '',
                licensor: activity.licensor || ''
            });
        } else {
            setEditingActivity(null);
            setFormData({
                category: '',
                description: '',
                status: 'Aguardando',
                reworks: '',
                graphic_release: '',
                final_delivery: '',
                complexity: '1',
                product_id: '',
                manual_minutes: '',
                start_date: '',
                end_date: '',
                observations: '',
                approval_send_date: '',
                approval_return_date: '',
                licensor: ''
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();

        const payload = {
            category: formData.category,
            description: formData.description,
            status: formData.status,
            reworks: formData.reworks,
            graphic_release: formData.graphic_release,
            final_delivery: formData.final_delivery,
            complexity: formData.complexity,
            product_id: formData.product_id,
            total_minutes: parseInt(formData.manual_minutes || 0),
            observations: formData.observations,
            approval_send_date: formData.category === 'Licenciados' ? formData.approval_send_date : null,
            approval_return_date: formData.category === 'Licenciados' ? formData.approval_return_date : null,
            licensor: formData.category === 'Licenciados' ? formData.licensor : null,
            user_id: user.id,
            start_time: formData.start_date ? new Date(formData.start_date + 'T00:00:00').toISOString() : (editingActivity ? editingActivity.start_time : new Date().toISOString()),
            end_time: formData.end_date ? new Date(formData.end_date + 'T23:59:59').toISOString() : ((formData.status === 'Aprovado' || formData.status === 'Cancelado' || formData.status === 'Reprovado') ? new Date().toISOString() : (editingActivity?.end_time || null))
        };

        let { error } = editingActivity
            ? await supabase.from('activities').update(payload).eq('id', editingActivity.id)
            : await supabase.from('activities').insert([payload]);

        if (!error) {
            setShowModal(false);
            fetchActivities();
        } else {
            alert('Erro ao salvar: ' + error.message);
        }
    };

    const filteredActivities = activities.filter(act => {
        const search = searchTerm.toLowerCase();
        return act.description?.toLowerCase().includes(search) ||
            act.products?.name?.toLowerCase().includes(search) ||
            act.category?.toLowerCase().includes(search);
    });

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
                            <input
                                placeholder="Pesquisar por descrição..."
                                style={{ paddingLeft: '32px', width: '250px', height: '36px', fontSize: '14px' }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <button className="btn" style={{ background: '#f3f4f6', fontSize: '14px' }}>
                        <Filter size={16} /> Filtrar
                    </button>
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Início/Fim</th>
                            <th>Produto / Descrição</th>
                            <th>Liberação/Entrega</th>
                            <th>Status</th>
                            <th>Comp.</th>
                            <th>Retr.</th>
                            <th>Tempo</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Carregando...</td></tr>
                        ) : filteredActivities.length === 0 ? (
                            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Nenhuma atividade encontrada.</td></tr>
                        ) : filteredActivities.map((act) => (
                            <tr key={act.id}>
                                <td style={{ fontSize: '12px' }}>
                                    <div style={{ fontWeight: 600 }}>{format(new Date(act.start_time), "dd/MM/yyyy HH:mm")}</div>
                                    <div style={{ color: 'var(--text-muted)' }}>
                                        {act.end_time ? format(new Date(act.end_time), "dd/MM/yyyy HH:mm") : '-'}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ fontWeight: 600 }}>
                                        {act.products?.name || 'Sem produto'} - {act.description?.split(' ')[0]}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                                        {act.category}
                                    </div>
                                </td>
                                <td style={{ fontSize: '11px' }}>
                                    <div>Lib: {act.graphic_release ? format(new Date(act.graphic_release + 'T12:00:00'), "dd/MM/yyyy") : '-'}</div>
                                    <div style={{ color: 'var(--text-muted)' }}>Ent: {act.final_delivery ? format(new Date(act.final_delivery + 'T12:00:00'), "dd/MM/yyyy") : '-'}</div>
                                </td>
                                <td>
                                    <span
                                        className={`status-badge`}
                                        style={{
                                            background:
                                                act.status === 'Aprovado' ? '#dcfce7' :
                                                    act.status === 'Aguardando' ? '#fef9c3' :
                                                        act.status === 'Cancelado' || act.status === 'Reprovado' ? '#fee2e2' : '',
                                            color:
                                                act.status === 'Aprovado' ? '#166534' :
                                                    act.status === 'Aguardando' ? '#854d0e' :
                                                        act.status === 'Cancelado' || act.status === 'Reprovado' ? '#b91c1c' : ''
                                        }}
                                    >
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
                                        {act.status === 'Aguardando' && (
                                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                {!act.last_resume_time && (
                                                    <button
                                                        onClick={() => handleStart(act)}
                                                        className="btn"
                                                        style={{ padding: '4px 8px', background: '#dcfce7', color: '#166534', border: 'none', fontSize: '12px' }}
                                                    >
                                                        ▶️ Iniciar
                                                    </button>
                                                )}

                                                {act.last_resume_time && !act.is_paused && (
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

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Início (opcional)</label>
                                    <input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Finalização (opcional)</label>
                                    <input
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Tempo em minutos (opcional)</label>
                                <input
                                    type="number"
                                    placeholder="Deixe vazio para cálculo automático"
                                    value={formData.manual_minutes}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const newStatus = (val !== '' && parseInt(val) > 0) ? 'Aprovado' : formData.status;
                                        setFormData({ ...formData, manual_minutes: val, status: newStatus });
                                    }}
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
                                        <option value="Aguardando">Aguardando</option>
                                        <option value="Aprovado">Aprovado</option>
                                        <option value="Reprovado">Reprovado</option>
                                        <option value="Cancelado">Cancelado</option>
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
                                <label>Observação</label>
                                <textarea
                                    rows="2"
                                    value={formData.observations}
                                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                                    placeholder="Informações adicionais..."
                                />
                            </div>

                            {formData.category === 'Licenciados' && (
                                <>
                                    <div className="form-group">
                                        <label>Licenciador</label>
                                        <select
                                            value={formData.licensor}
                                            onChange={(e) => setFormData({ ...formData, licensor: e.target.value })}
                                        >
                                            <option value="">Selecione um licenciador...</option>
                                            <option value="Disney">Disney</option>
                                            <option value="Universal">Universal</option>
                                            <option value="Warner">Warner</option>
                                            <option value="Sanrio">Sanrio</option>
                                            <option value="Redibra">Redibra</option>
                                            <option value="Turma da Monica">Turma da Mônica</option>
                                            <option value="Hasbro">Hasbro</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label>Envio Aprovação</label>
                                            <input
                                                type="date"
                                                value={formData.approval_send_date}
                                                onChange={(e) => setFormData({ ...formData, approval_send_date: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label>Retorno Aprovação</label>
                                            <input
                                                type="date"
                                                value={formData.approval_return_date}
                                                onChange={(e) => setFormData({ ...formData, approval_return_date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

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
