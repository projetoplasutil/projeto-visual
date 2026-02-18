import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [newProductName, setNewProductName] = useState('');
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

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

    const handleAddProduct = async (e) => {
        e.preventDefault();
        if (!newProductName.trim()) return;

        const { error } = await supabase
            .from('products')
            .insert([{ name: newProductName.toUpperCase() }]);

        if (!error) {
            setNewProductName('');
            fetchProducts();
        } else {
            alert('Erro ao adicionar produto: ' + error.message);
        }
    };

    const startEditing = (product) => {
        setEditingId(product.id);
        setEditName(product.name);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditName('');
    };

    const handleUpdateProduct = async (id) => {
        if (!editName.trim()) return;

        const { error } = await supabase
            .from('products')
            .update({ name: editName.toUpperCase() })
            .eq('id', id);

        if (!error) {
            setEditingId(null);
            fetchProducts();
        } else {
            alert('Erro ao atualizar produto: ' + error.message);
        }
    };

    const handleDeleteProduct = async (id) => {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;

        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (!error) {
            fetchProducts();
        } else {
            alert('Erro ao excluir produto. Ele pode estar sendo usado em alguma atividade.');
        }
    };

    return (
        <div className="main-content">
            <header>
                <div>
                    <h1>Produtos</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Gerencie os produtos disponíveis para o sistema</p>
                </div>
            </header>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3>Cadastrar Novo Produto</h3>
                <form onSubmit={handleAddProduct} style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <input
                            type="text"
                            placeholder="Nome do Produto"
                            value={newProductName}
                            onChange={(e) => setNewProductName(e.target.value)}
                            style={{ textTransform: 'uppercase' }}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary">
                        <Plus size={20} />
                        Adicionar
                    </button>
                </form>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Nome do Produto</th>
                            <th>Data de Cadastro</th>
                            <th style={{ textAlign: 'right' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>Carregando...</td></tr>
                        ) : products.length === 0 ? (
                            <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>Nenhum produto cadastrado.</td></tr>
                        ) : products.map((product) => (
                            <tr key={product.id}>
                                <td style={{ fontWeight: 600 }}>
                                    {editingId === product.id ? (
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            style={{ height: '32px', padding: '4px 8px', textTransform: 'uppercase' }}
                                        />
                                    ) : (
                                        product.name
                                    )}
                                </td>
                                <td style={{ fontSize: '14px' }}>
                                    {new Date(product.created_at).toLocaleDateString('pt-BR')}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    {editingId === product.id ? (
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => handleUpdateProduct(product.id)}
                                                style={{ border: 'none', background: 'none', color: '#166534' }}
                                                title="Salvar"
                                            >
                                                <Check size={20} />
                                            </button>
                                            <button
                                                onClick={cancelEditing}
                                                style={{ border: 'none', background: 'none', color: '#ef4444' }}
                                                title="Cancelar"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => startEditing(product)}
                                                style={{ border: 'none', background: 'none', color: 'var(--primary)' }}
                                                title="Editar"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteProduct(product.id)}
                                                style={{ border: 'none', background: 'none', color: '#ef4444' }}
                                                title="Excluir"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Products;
