import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService, requestService, serviceService } from '../services/api';
import './Dashboard.css';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [requests, setRequests] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'Service' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadUsers(),
                loadRequests(),
                loadStats()
            ]);
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        try {
            const usersData = await authService.getUsers();
            setUsers(usersData);
        } catch (err) {
            console.error('Error loading users:', err);
            // Fallback: extract users from requests
            try {
                const requestsData = await requestService.getAllRequests();
                const uniqueUsers = new Map();
                requestsData.forEach(req => {
                    if (req.requestedByUser) {
                        uniqueUsers.set(req.requestedByUser.id, req.requestedByUser);
                    }
                });
                setUsers(Array.from(uniqueUsers.values()));
            } catch (fallbackErr) {
                console.error('Fallback also failed:', fallbackErr);
            }
        }
    };

    const loadRequests = async () => {
        try {
            const data = await requestService.getAllRequests();
            setRequests(data);
        } catch (err) {
            console.error('Error loading requests:', err);
        }
    };

    const loadStats = async () => {
        try {
            const productStats = await requestService.getProductStatistics();
            const processingStats = await requestService.getProcessingTimeStatistics();
            
            setStats({
                productStats,
                processingStats,
                totalRequests: requests.length,
                byStatus: {
                    pending: requests.filter(r => r.status === 'Pending' || r.status === '0').length,
                    validated: requests.filter(r => r.status === 'Approved' || r.status === '7').length,
                    finalized: requests.filter(r => r.status === 'Finalized' || r.status === '9').length,
                    rejected: requests.filter(r => r.status === 'Rejected' || r.status === '8').length
                }
            });
        } catch (err) {
            console.error('Error loading stats:', err);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await authService.register(
                newUser.username,
                newUser.email,
                newUser.password,
                newUser.password,
                newUser.role
            );
            alert('Utilisateur créé avec succès!');
            setShowUserModal(false);
            setNewUser({ username: '', email: '', password: '', role: 'Service' });
            loadUsers();
        } catch (err) {
            alert('Erreur: ' + (err.response?.data?.message || 'Erreur lors de la création'));
        }
    };

    const getStatusBadge = (status) => {
        const statusStr = String(status);
        const statusMap = {
            '0': { class: 'status-pending', label: 'En attente' },
            'Pending': { class: 'status-pending', label: 'En attente' },
            '1': { class: 'status-info', label: 'Validé Contrôle' },
            'ControlValidated': { class: 'status-info', label: 'Validé Contrôle' },
            '7': { class: 'status-approved', label: 'Approuvé' },
            'Approved': { class: 'status-approved', label: 'Approuvé' },
            '9': { class: 'status-approved', label: 'Finalisé' },
            'Finalized': { class: 'status-approved', label: 'Finalisé' },
            '8': { class: 'status-rejected', label: 'Rejeté' },
            'Rejected': { class: 'status-rejected', label: 'Rejeté' }
        };
        const info = statusMap[statusStr] || { class: '', label: statusStr };
        return <span className={`status-badge ${info.class}`}>{info.label}</span>;
    };

    if (loading) return <div className="loading">Chargement...</div>;

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <h1>⚙️ Tableau de Bord Admin</h1>
                <div className="user-info">
                    <span className="role-badge role-admin">{user?.username}</span>
                    <button onClick={() => { localStorage.clear(); window.location.hash = '#/login'; }} className="btn-logout">
                        Déconnexion
                    </button>
                </div>
            </header>

            <div className="dashboard-content">
                {/* Admin Tabs */}
                <div className="admin-tabs">
                    <button 
                        className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        👥 Gestion Utilisateurs
                    </button>
                    <button 
                        className={`admin-tab ${activeTab === 'requests' ? 'active' : ''}`}
                        onClick={() => setActiveTab('requests')}
                    >
                        📋 Suivi Demandes
                    </button>
                    <button 
                        className={`admin-tab ${activeTab === 'stats' ? 'active' : ''}`}
                        onClick={() => setActiveTab('stats')}
                    >
                        📊 Statistiques
                    </button>
                </div>

                {/* Users Section */}
                {activeTab === 'users' && (
                    <div className="admin-section">
                        <div className="section-header">
                            <h2>👥 Gestion des Utilisateurs</h2>
                            <button onClick={() => setShowUserModal(true)} className="btn-primary">
                                ➕ Ajouter Utilisateur
                            </button>
                        </div>
                        
                        {users.length === 0 ? (
                            <p className="no-data">Aucun utilisateur trouvé</p>
                        ) : (
                            <div className="requests-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Nom d'utilisateur</th>
                                            <th>Service</th>
                                            <th>Rôle</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(u => (
                                            <tr key={u.id}>
                                                <td>#{u.id}</td>
                                                <td>{u.username}</td>
                                                <td>{u.serviceName || '-'}</td>
                                                <td>
                                                    <span className={`role-badge role-${u.role?.toLowerCase() || 'service'}`}>
                                                        {u.role || 'Service'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button 
                                                        onClick={() => { setEditingUser(u); setShowUserModal(true); }}
                                                        className="btn-details"
                                                    >
                                                        ✏️ Modifier
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Requests Section */}
                {activeTab === 'requests' && (
                    <div className="admin-section">
                        <div className="section-header">
                            <h2>📋 Suivi des Demandes</h2>
                        </div>
                        
                        {requests.length === 0 ? (
                            <p className="no-data">Aucune demande trouvée</p>
                        ) : (
                            <div className="requests-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Service</th>
                                            <th>Date</th>
                                            <th>Statut</th>
                                            <th>Articles</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {requests.map(req => (
                                            <tr key={req.id}>
                                                <td>#{req.id}</td>
                                                <td>{req.serviceName}</td>
                                                <td>{new Date(req.requestDate).toLocaleDateString()}</td>
                                                <td>{getStatusBadge(req.status)}</td>
                                                <td>{req.items?.length || 0}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Stats Section */}
                {activeTab === 'stats' && (
                    <div className="admin-section">
                        <div className="section-header">
                            <h2>📊 Statistiques Globales</h2>
                        </div>
                        
                        {/* Summary Cards */}
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-value">{requests.length}</div>
                                <div className="stat-label">Total Demandes</div>
                            </div>
                            <div className="stat-card stat-active">
                                <div className="stat-value">
                                    {requests.filter(r => r.status === 'Pending' || r.status === '0').length}
                                </div>
                                <div className="stat-label">En Attente</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">
                                    {requests.filter(r => r.status === 'Approved' || r.status === '7').length}
                                </div>
                                <div className="stat-label">Approuvées</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">
                                    {requests.filter(r => r.status === 'Finalized' || r.status === '9').length}
                                </div>
                                <div className="stat-label">Finalisées</div>
                            </div>
                        </div>

                        {/* Product Stats */}
                        {stats?.productStats && stats.productStats.length > 0 && (
                            <div className="stats-detail-card">
                                <h3>📦 Top Produits Demandés</h3>
                                <div className="bar-chart">
                                    {stats.productStats.slice(0, 5).map((stat, index) => {
                                        const maxCount = Math.max(...stats.productStats.map(s => s.requestCount));
                                        const percentage = (stat.requestCount / maxCount) * 100;
                                        const colors = ['#667eea', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];
                                        return (
                                            <div key={stat.productId} className="bar-item">
                                                <div className="bar-label">
                                                    <span>{stat.code_Produit}</span>
                                                    <span>{stat.requestCount} demandes</span>
                                                </div>
                                                <div className="bar-container">
                                                    <div 
                                                        className="bar-fill"
                                                        style={{ 
                                                            width: `${percentage}%`,
                                                            background: colors[index % colors.length]
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Processing Time Stats */}
                        {stats?.processingStats && stats.processingStats.totalRequests > 0 && (
                            <div className="stats-detail-card">
                                <h3>⏱️ Temps de Traitement</h3>
                                <div className="processing-grid">
                                    <div className="processing-stat">
                                        <div className="proc-value">{stats.processingStats.totalRequests}</div>
                                        <div className="proc-label">Total Finalisées</div>
                                    </div>
                                    <div className="processing-stat">
                                        <div className="proc-value">{stats.processingStats.averageHours}h</div>
                                        <div className="proc-label">Moyenne</div>
                                    </div>
                                    <div className="processing-stat">
                                        <div className="proc-value">{stats.processingStats.minHours}h</div>
                                        <div className="proc-label">Min</div>
                                    </div>
                                    <div className="processing-stat">
                                        <div className="proc-value">{stats.processingStats.maxHours}h</div>
                                        <div className="proc-label">Max</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create User Modal */}
            {showUserModal && (
                <div className="modal" onClick={() => { setShowUserModal(false); setEditingUser(null); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingUser ? '✏️ Modifier Utilisateur' : '➕ Ajouter Utilisateur'}</h3>
                            <button className="modal-close" onClick={() => { setShowUserModal(false); setEditingUser(null); }}>✕</button>
                        </div>
                        <form onSubmit={handleCreateUser}>
                            <div className="form-group">
                                <label>Nom d'utilisateur</label>
                                <input
                                    type="text"
                                    placeholder="Entrez le nom d'utilisateur"
                                    value={editingUser ? editingUser.username : newUser.username}
                                    onChange={(e) => editingUser ? setEditingUser({ ...editingUser, username: e.target.value }) : setNewUser({ ...newUser, username: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    placeholder="Entrez l'email"
                                    value={editingUser ? editingUser.email : newUser.email}
                                    onChange={(e) => editingUser ? setEditingUser({ ...editingUser, email: e.target.value }) : setNewUser({ ...newUser, email: e.target.value })}
                                    required
                                />
                            </div>
                            {!editingUser && (
                                <div className="form-group">
                                    <label>Mot de passe</label>
                                    <input
                                        type="password"
                                        placeholder="Entrez le mot de passe"
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        required
                                    />
                                </div>
                            )}
                            <div className="form-group">
                                <label>Rôle</label>
                                <select
                                    value={editingUser ? editingUser.role : newUser.role}
                                    onChange={(e) => editingUser ? setEditingUser({ ...editingUser, role: e.target.value }) : setNewUser({ ...newUser, role: e.target.value })}
                                >
                                    <option value="Service">Service</option>
                                    <option value="Control">Contrôle</option>
                                    <option value="Director">Directeur</option>
                                    <option value="Economat">Économat</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => { setShowUserModal(false); setEditingUser(null); }} className="btn-cancel">
                                    Annuler
                                </button>
                                <button type="submit" className="btn-submit">
                                    ✓ {editingUser ? 'Modifier' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;