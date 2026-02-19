import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Layers, Search, Check, Plus, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const categories = [
    'Baby', 'Bazar', 'Comercial', 'Diversos', 'Exportação',
    'Gravação', 'Licenciados', 'Montagem', 'Pesquisa',
    'Porta a Porta', 'Televendas', 'UD'
];

const CreateLine = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        category: '',
        description: '',
        observations: '',
        licensor: ''
    });

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('name', { ascending: true });

        if (!error) setProducts(data);
        setLoading(false);
    };

    const toggleProduct = (productId) => {
        setSelectedProducts(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    const handleCreateLine = async (e) => {
        e.preventDefault();
        if (selectedProducts.length === 0) {
            alert('Selecione pelo menos um produto.');
            return;
        }
        if (!formData.category) {
            alert('Selecione uma categoria.');
            return;
        }

        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();

        const activities = selectedProducts.map(productId => ({
            user_id: user.id,
            product_id: productId,
            category: formData.category,
            description: formData.description,
            observations: formData.observations,
            licensor: formData.category === 'Licenciados' ? formData.licensor : null,
            status: 'Aguardando',
            is_paused: true, // Começa pausado conforme solicitado
            total_minutes: 0,
            start_time: new Date().toISOString()
        }));

        const { error } = await supabase
            .from('activities')
            .insert(activities);

        if (!error) {
            alert('Linha criada com sucesso! Os trabalhos foram adicionados à aba Trabalhos.');
            navigate('/dashboard');
        } else {
            alert('Erro ao criar linha: ' + error.message);
        }
        setSaving(false);
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="main-content">
            <header>
                <div>
                    <h1>Criar Linha</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Crie múltiplos trabalhos de uma vez selecionando os produtos</p>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                {/* Seleção de Produtos */}
                <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                placeholder="Buscar produto..."
                                style={{ paddingLeft: '32px', width: '100%', height: '38px' }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
                            {selectedProducts.length} selecionados
                        </div>
                    </div>

                    <div style={{ maxHeight: '500px', overflowY: 'auto', padding: '0.5rem' }}>
                        {loading ? (
                            <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando produtos...</div>
                        ) : filteredProducts.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum produto encontrado.</div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
                                {filteredProducts.map(prod => (
                                    <div
                                        key={prod.id}
                                        onClick={() => toggleProduct(prod.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '0.75rem 1rem',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            background: selectedProducts.includes(prod.id) ? '#eff6ff' : 'transparent',
                                            border: selectedProducts.includes(prod.id) ? '1px solid #bfdbfe' : '1px solid transparent',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '4px',
                                            border: '2px solid',
                                            borderColor: selectedProducts.includes(prod.id) ? 'var(--primary)' : '#d1d5db',
                                            background: selectedProducts.includes(prod.id) ? 'var(--primary)' : 'white',
                                            marginRight: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white'
                                        }}>
                                            {selectedProducts.includes(prod.id) && <Check size={14} strokeWidth={3} />}
                                        </div>
                                        <span style={{ fontWeight: 500, fontSize: '14px' }}>{prod.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Formulário de Criação */}
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Dados da Linha</h3>
                    <form onSubmit={handleCreateLine}>
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
                            <label>Descrição (Geral)</label>
                            <textarea
                                rows="3"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Esta descrição será aplicada a todos os produtos selecionados"
                                required
                            />
                        </div>

                        {formData.category === 'Licenciados' && (
                            <div className="form-group">
                                <label>Licenciador</label>
                                <select
                                    value={formData.licensor}
                                    onChange={(e) => setFormData({ ...formData, licensor: e.target.value })}
                                    required
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
                        )}

                        <div className="form-group">
                            <label>Observação</label>
                            <textarea
                                rows="3"
                                value={formData.observations}
                                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                                placeholder="Observações adicionais para os trabalhos"
                            />
                        </div>

                        <div style={{
                            background: '#fff7ed',
                            border: '1px solid #ffedd5',
                            padding: '1rem',
                            borderRadius: '8px',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            gap: '0.75rem',
                            alignItems: 'start'
                        }}>
                            <AlertCircle size={20} style={{ color: '#ea580c', flexShrink: 0 }} />
                            <p style={{ fontSize: '13px', color: '#9a3412', margin: 0 }}>
                                Serão criados <strong>{selectedProducts.length}</strong> trabalhos individuais. Todos serão iniciados com status "Aguardando" e estarão pausados.
                            </p>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%', height: '48px', fontSize: '16px' }}
                            disabled={saving || selectedProducts.length === 0}
                        >
                            {saving ? 'Criando Trabalhos...' : (
                                <>
                                    <Plus size={20} style={{ marginRight: '8px' }} />
                                    Criar Linha
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateLine;
